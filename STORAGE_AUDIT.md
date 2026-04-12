# Mathtrainer Storage & Performance Audit

> Audited: 2026-04-13

---

## Tables Overview (at time of audit)

| Table | Rows | Size |
|-------|------|------|
| `ai_mode_logs` | 10,000 | 3,376 kB |
| `progress_logs` | 2,259 | 776 kB |
| `mixed_trainer_preferences` | 1 | 32 kB |
| `user_preferences` | 2 | 64 kB |

---

## How AI Mode Actually Works

"AI Mode" is **not an LLM** — it is an automated player that solves math trainer problems locally using `mathjs`. No API calls are made. It simulates a perfect user completing a round programmatically.

Flow:
```
Trainer generates problem
  → formatTrainerProblem() → "347 × 82"   (pretty display string)
  → formatTrainerProblem() → "347 * 82"   (ASCII for computation)
  → solveAiExpression("347 * 82")
      → mathjs parses and evaluates locally
      → returns { normalizedExpression, kind, exactText, decimalText }
  → submits correct answer programmatically
  → logs result to ai_mode_logs
```

`response_ms` is local `mathjs` evaluation time, not network latency.

---

## Findings

### P0 — Critical

---

#### 1. `ai_mode_logs.prompt_text` is fully redundant
**File:** `utils/aiTrainer.js:45`, `utils/aiModeLogs.js:7`

`prompt_text` is `formatTrainerProblem(problem, { pretty: true })` — the display version of the expression with Unicode symbols (`×`, `÷`). `normalized_expression` already stores the ASCII equivalent (`*`, `/`). They are the same data.

| Column | Example |
|--------|---------|
| `normalized_expression` | `347 * 82` |
| `prompt_text` | `347 × 82` |

**Impact:** ~30–50 bytes per row × 10,000 rows = significant chunk of the 3.3 MB total.

**Fix:** Drop `prompt_text` column via migration. Reconstruct the display string client-side when needed.

---

#### 2. RPC `get_progress_dashboard_data` — full-table scan with no date filter
**File:** `supabase/migrations/20260412020000_add_progress_dashboard_rpc.sql:9-88`

Both `manual_logs` and `ai_logs` CTEs scan **every row** for the user with no date filter. The `combined_logs` UNION then runs grouping and aggregation over the entire unbounded history. The `overview` CTE computes lifetime `count(*)`, `avg(response_ms)`, `sum(response_ms)` across all time.

**Impact:** Query time is O(n) and degrades linearly as data grows. DB CPU spikes on every dashboard load.

**Fix:** Add a date filter to both inner CTEs:
```sql
-- In manual_logs CTE
where p.user_id = auth.uid()
  and p.created_at > now() - interval '90 days'  -- add this

-- In ai_logs CTE
where a.user_id = auth.uid()
  and a.created_at > now() - interval '90 days'  -- add this
```
Or expose it as a parameter: `get_progress_dashboard_data(session_limit, attempt_limit, since_days default 90)`.

---

#### 3. mathjs imports entire library (`all`) — 15 MB on disk
**File:** `utils/aiMath.js:1`

```js
import { all, create } from 'mathjs';
```

`all` pulls every mathjs factory (units, matrices, statistics, algebra, complex numbers, etc.). Only a tiny subset is actually used: `parse`, `evaluate`, `format`, `typeOf`, and basic arithmetic. The library is 15 MB on disk and contributes ~150–200 KB gzipped to the client bundle.

**Impact:** Bloated JS bundle. Slower parse/execution time on first load.

**Fix:** Replace `all` with selective factory imports:
```js
import {
  create,
  fractionDependencies,
  evaluateDependencies,
  parseDependencies,
  formatDependencies,
  typeOfDependencies,
  addDependencies,
  subtractDependencies,
  multiplyDependencies,
  divideDependencies,
  powDependencies,
  // ... only what aiMath.js actually uses
} from 'mathjs';
```
Expected bundle reduction: **~80–90%** of the mathjs contribution.

---

### P1 — High

---

#### 4. No retention policy on `progress_logs` or `ai_mode_logs`
**File:** `supabase/migrations/20260313_create_progress_logs.sql`, `supabase/migrations/20260412010000_create_ai_mode_logs.sql`

Both tables grow indefinitely. No TTL, no archival, no scheduled cleanup.

**Growth estimate:**
- `progress_logs`: ~3,650 rows/year per active user
- `ai_mode_logs`: ~1,825 rows/year per admin user (admin-only inserts)

**Fix:** Add a Supabase scheduled function or pg_cron job to delete rows older than 90–180 days:
```sql
delete from public.progress_logs
where created_at < now() - interval '180 days';

delete from public.ai_mode_logs
where created_at < now() - interval '180 days';
```

---

#### 5. `progress_logs` — oversized column types
**File:** `supabase/migrations/20260313_create_progress_logs.sql`

| Column | Current type | Problem | Better type |
|--------|-------------|---------|-------------|
| `correct_answer` | `TEXT` | Stores integers | `BIGINT` (saves ~10–20 bytes/row) |
| `submitted_answer` | `TEXT` | Stores integers | `BIGINT` |
| `operation` | `TEXT` | Only 5–6 distinct values | `SMALLINT` or PostgreSQL `ENUM` |

**Impact:** ~40–50 bytes wasted per row × growing row count.

---

#### 6. `progress_logs.digits_left` / `digits_right` are derivable
**File:** `supabase/migrations/20260313_create_progress_logs.sql`

These store digit counts of operands. They are computable from `left_operand` and `right_operand` at query time: `length(left_operand::text)`. Storing them is redundant.

**Impact:** ~8 bytes per row wasted. The RPC already computes `digit_label` via string concatenation anyway.

**Fix:** Drop both columns. Compute digit labels in the RPC or client.

---

#### 7. Unbounded `aiCycleBlueprints` state array
**File:** `pages/index.js:151`

```js
const [aiCycleBlueprints, setAiCycleBlueprints] = useState([]);
```

Used as a circular buffer (accessed via `% aiCycleBlueprintsRef.current.length`) but never truncated. Blueprints pushed during long AI cycle sessions accumulate indefinitely in memory.

**Impact:** Memory leak in long sessions.

**Fix:** Cap the array, or convert to a plain ref since it is already accessed exclusively via `aiCycleBlueprintsRef` and does not need to trigger re-renders.

---

#### 8. `ai_mode_logs` dead tuple bloat from upserts
**File:** `utils/aiModeLogs.js:113`

The insert pattern uses `upsert` with `onConflict`. PostgreSQL marks old row versions as dead but does not reclaim space automatically. With 10,000 rows that have been upserted across multiple AI cycles, dead tuples accumulate.

**Fix:** Run immediately:
```sql
VACUUM FULL public.ai_mode_logs;
VACUUM FULL public.progress_logs;
```

---

### P2 — Medium

---

#### 9. No date filter on `overview` aggregation in RPC
**File:** `supabase/migrations/20260412020000_add_progress_dashboard_rpc.sql:71-88`

The `overview` CTE (total attempts, accuracy, average response time, fastest) aggregates all-time data. As history grows, these numbers become less meaningful and the computation slower.

**Fix:** Scope overview stats to the same date window used by the other CTEs, or compute them from a pre-aggregated summary table.

---

#### 10. Low-cardinality index `progress_logs_user_operation_idx`
**File:** `supabase/migrations/20260313_create_progress_logs.sql`

An index on `(user_id, operation)` where `operation` has only 5–6 distinct values. Low-cardinality indexes on text columns have poor selectivity — the query planner often ignores them and they add overhead to every insert.

**Fix:**
```sql
DROP INDEX IF EXISTS progress_logs_user_operation_idx;
```
Keep only `progress_logs_user_created_idx` and `progress_logs_user_session_idx`.

---

#### 11. No caching headers in `next.config.js`
**File:** `next.config.js`

Bare config with only SVG loader. No `headers()`, no image optimization config. Static JS chunks, icons, and assets are re-downloaded without proper `Cache-Control`.

**Fix:**
```js
async headers() {
  return [
    {
      source: '/_next/static/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
    }
  ];
}
```

---

### P3 — Low

---

#### 12. `mixed_trainer_preferences` — difficulty columns as TEXT
**File:** `supabase/migrations/20260331000000_create_mixed_trainer_preferences.sql`

5 difficulty columns stored as `TEXT` (e.g. `'warmup'`, `'easy'`, `'medium'`) where a `SMALLINT` or PostgreSQL `ENUM` type would use 2 bytes vs 10–15 bytes per column.

**Impact:** ~40–50 bytes wasted per row. Negligible at 1 row/user but semantically wrong.

**Fix:** Create an ENUM type:
```sql
CREATE TYPE difficulty_level AS ENUM ('off', 'warmup', 'easy', 'medium', 'hard', 'expert');
```

---

#### 13. `browserStorage.js` — no change detection before write
**File:** `utils/browserStorage.js:27-38`

`writeStorageJson` always serializes and calls `localStorage.setItem` without checking if the value has changed. Low impact today (2 callers, low write frequency), but unnecessary I/O.

**Fix:**
```js
export function writeStorageJson(key, value, storage = null) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    const serialized = JSON.stringify(value);
    if (target.getItem(key) === serialized) return true; // no-op
    target.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}
```

---

#### 14. RPC reconstructs `prompt_text` via string concat on every call
**File:** `supabase/migrations/20260412020000_add_progress_dashboard_rpc.sql:17-29`

The `manual_logs` CTE builds `prompt_text` from `left_operand || ' ' || operator_symbol || ' ' || right_operand` on every query execution. Minor but avoidable work.

**Fix:** Accept raw operands in the response and format the display string client-side, consistent with the manual trainer's existing display logic.

---

## Priority Summary

| # | Issue | File | Priority | Impact |
|---|-------|------|----------|--------|
| 1 | `ai_mode_logs.prompt_text` redundant | `utils/aiTrainer.js:45` | P0 | ~30–50 bytes/row |
| 2 | RPC full-table scan, no date filter | RPC migration:9-88 | P0 | Query time O(n) |
| 3 | mathjs imports `all` (15 MB) | `utils/aiMath.js:1` | P0 | ~150 KB gzipped bundle |
| 4 | No retention policy on log tables | Both log migrations | P1 | Unbounded growth |
| 5 | `progress_logs` TEXT answers/operation | progress migration | P1 | ~40–50 bytes/row |
| 6 | `digits_left`/`digits_right` derivable | progress migration | P1 | ~8 bytes/row |
| 7 | Unbounded `aiCycleBlueprints` | `pages/index.js:151` | P1 | Memory leak |
| 8 | Dead tuple bloat from upserts | Both log tables | P1 | Run VACUUM FULL now |
| 9 | Overview aggregates all-time data | RPC migration:71-88 | P2 | Slow aggregate queries |
| 10 | Low-cardinality `user_operation_idx` | progress migration | P2 | Wasted write overhead |
| 11 | No cache headers in Next.js config | `next.config.js` | P2 | Redundant asset fetches |
| 12 | Difficulty columns as TEXT | mixed_trainer migration | P3 | ~40–50 bytes/row |
| 13 | localStorage no change detection | `utils/browserStorage.js:27` | P3 | Minor redundant writes |
| 14 | RPC string concat for prompt_text | RPC migration:17-29 | P3 | Minor CPU per query |

## Immediate Actions (no migration required)

```sql
-- 1. Reclaim dead tuple space now
VACUUM FULL public.ai_mode_logs;
VACUUM FULL public.progress_logs;

-- 2. Drop low-value index
DROP INDEX IF EXISTS progress_logs_user_operation_idx;
```
