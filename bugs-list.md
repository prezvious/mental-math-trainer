# Bugs, Inaccuracies, and Inconsistencies - mathtrainer

## Bugs

### 1. Hardcoded Supabase credentials
**File:** `utils/supabaseClient.js:5-7`

The default Supabase URL and anon key are hardcoded in source code. If `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not set, the app silently falls back to these exposed credentials (line 13). This is a security risk.

### 2. Two disconnected auth systems
**Files:** `pages/api/auth/[...nextauth].js`, `utils/supabaseAuthContext.js`

The app has **NextAuth** (with Prisma adapter) and **Supabase Auth** running in parallel with no connection between them. All UI pages use Supabase auth (`useSupabaseAuth()`), making the NextAuth setup dead code. The `User` model in Prisma also lacks the `sessions` relation the NextAuth Prisma adapter expects.

### 3. Potential null dereference in NextAuth callback
**File:** `pages/api/auth/[...nextauth].js:43`

```js
user.email.slice(0, user.email.lastIndexOf('@'))
```

If `user.email` is `null` (possible with some OAuth providers), this crashes.

### 4. Stats dashboard misrepresents mixed trainer sessions
**File:** `pages/stats.js:104-139`

`recentSessions` groups by `session_id` and shows a single `operation`, `digitsLeft`, and `digitsRight` from the first log entry. For mixed trainer sessions, these values vary per question, so the displayed "Mode" and "Digits" columns are misleading.

### 5. SQUARES operation missing from `OPERATION_META`
**File:** `utils/mathEngine.js:5-10`

`OPERATION_META` only has ADDITION, SUBTRACTION, MULTIPLICATION, DIVISION. The SQUARES operation (from mixed trainer) is absent. In `pages/stats.js:286`, SQUARES entries fall through to `|| row.operation`, displaying the raw key instead of a friendly label.

### 6. Mixed trainer never records incorrect answers
**Files:** `pages/mixed.js:457-517`, `pages/mixed.js:765-797`, `utils/mixedTrainerRound.js:26-38`

The mixed trainer only calls `submitAnswer()` from `processInput()` after `shouldAutoSubmitAnswer()` returns a value. That helper only returns a value when the typed input exactly matches the correct answer. During an active mixed round, the UI renders a keypad and a hidden input, but there is no separate manual submit path for wrong answers. In practice, `processMixedRoundSubmission()` almost never runs for incorrect input, so wrong answers are not recorded in progress logs. That makes mixed-mode session summaries and dashboard accuracy look artificially perfect.

### 7. Mixed trainer adds the 400 ms success flash to the next answer time
**Files:** `pages/mixed.js:114`, `pages/mixed.js:488-498`, `utils/mixedTrainerRound.js:57-83`, `utils/mixedTrainerRound.js:104`

After a correct answer, the mixed trainer shows a success flash for `CORRECT_FLASH_MS` (400 ms) before advancing to the next problem. However, `processMixedRoundSubmission()` stamps the next round state with `questionStartedAt: submittedAt` immediately, before that flash delay finishes. The user does not see the next problem until the timeout completes, but the timer for the next response is already running. As a result, every mixed-mode answer after the first one is inflated by roughly 400 ms, which distorts per-question timings, average speed, and session totals.

### 8. Keepalive flush can miss rows when a normal flush is already in flight
**File:** `utils/progressLogs.js:157-189`

The keepalive path is meant to protect progress rows when the page is hidden or unloaded. But if `flush()` is called with `keepalive: true` while another flush is already in progress, the code only calls `fireKeepalive()` on `pendingRows.slice()`. At that point, the active flush has already moved its batch into a local `snapshot`, so those rows are no longer in `pendingRows`. If the tab closes before the normal upsert finishes, the keepalive request does not include the in-flight batch, and those rows can be lost.

### 9. Failed progress rows are cleared when a new round starts
**Files:** `utils/progressLogs.js:192`, `pages/index.js:294`, `pages/mixed.js:342`

When `persistProgressLogBatches()` fails, the buffer correctly restores the failed rows by prepending them back into `pendingRows`. That recovery is undone later because both trainers call `progressBufferRef.current?.clear()` at the start of a new round. A transient network or Supabase error can therefore leave valid unsaved rows in the buffer, show an error to the user, and then permanently discard those rows as soon as the user starts another round or restarts the trainer.

### 10. Standard trainer round-size input rewrites partial values while typing
**Files:** `pages/index.js:494`, `pages/index.js:621-626`, `utils/mathEngine.js:176-180`

The round-size field is fully controlled and sanitizes its value on every `onChange`. `updateSetting()` converts the input to a number immediately, and `sanitizeSettings()` clamps that number to the minimum round size of 3. Typing a partial value such as `1` is therefore rewritten to `3` before the user finishes entering the intended number. This makes larger values awkward to enter and creates a frustrating input experience.

### 11. Password checklist shows placeholder characters instead of pass/fail indicators
**File:** `pages/signup.js:204`

The password-rule checklist renders `isPassed ? '?' : '?'`, so both branches produce the same visible character. The text labels still describe the rules, but the intended visual pass/fail cue is missing. Users cannot quickly scan which password requirements are satisfied, which weakens the whole checklist.

---

## Inconsistencies

### 12. Multiplication symbol differs between trainers

- `utils/mathEngine.js:8` - `symbol: 'x'` (lowercase x)
- `utils/mixedDifficulty.js:49` - `symbol: '×'` (proper multiplication sign)

### 13. Missing `.js` extensions on imports

- `utils/utils.js:1` - `import { MAX_DIGITS } from 'utils/mathEngine';`
- `pages/index.js:28` - `import { DIGIT_OPTIONS } from 'utils/utils';`

All other imports use `.js` extensions.

### 14. Render-time side effects in `index.js` and `mixed.js`

- `pages/index.js:115-121` - `progressBufferRef.current` is created during render (guarded by `if`, but still a side effect in render).
- `pages/index.js:277` - `terminateSessionRef.current = terminateActiveRound` assigned during render.
- Same pattern in `pages/mixed.js:140-146` and line 329.

### 15. QuestionTimer double-effect race
**File:** `components/mixed/QuestionTimer.js`

The rAF loop effect (line 18) and the elapsed-reset effect (line 41) are separate. When `startedAt` changes, the rAF effect restarts with stale `elapsed` before the reset effect fires, causing a brief flash of the old value. The reset should happen inside the rAF effect.

### 16. `sanitizeSettings` ordering fragility
**File:** `utils/mathEngine.js:162-170`

`rightDigits` is clamped first (line 163-167), then the ordered-digits check runs (line 168). While technically correct, the ordering is fragile - if the clamp or the ordered check were ever reordered, the constraint would break.

### 17. `createSquaresProblem` infinite loop risk
**File:** `utils/mixedDifficulty.js:131-135`

If `DIFFICULTY_CONFIG.SQUARES['warmup']` were ever removed or renamed, `createSquaresProblem` would recurse infinitely. A defensive guard would be safer.

### 18. `parseIntegerInput` accepts negative numbers
**File:** `utils/mathEngine.js:146`

The regex `/^-?\d+$/` allows negative input, but the app never generates negative answers (subtraction is kept non-negative). Allowing negative input could confuse users since no problem would ever accept it.

---

## Test Coverage Gaps

- No tests for `mixedTrainerPreferences.js`
- No tests for `supabaseAuthContext.js`, `activeSessionContext.js`, or any React context providers
- No tests for `passwordValidation.js` edge cases (empty string, very long passwords)
- No tests for `themes.js` color utilities
