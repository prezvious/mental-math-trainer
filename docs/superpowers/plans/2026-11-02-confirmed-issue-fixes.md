# Confirmed issue fixes

Goal: resolve all seven findings from the codebase review, preserving existing work.
Starting revision: `68842739ed939dfa0aa58e911b51f4a490cf79b1` (working tree already modified).

## Plan

1. Isolate preference save queues by account and request generation in
   `utils/mixedTrainerContext.js` and `utils/accountPreferencesContext.js`.
   Verify delayed success/failure cannot consume or overwrite a new account's queue.
2. Share progress reset generations across tabs in `utils/progressWriteCoordinator.js`,
   checking them inside the write lock. Verify buffered AI writes, keepalive requests,
   and writes already waiting for the lock cannot restore deleted progress.
3. Catch session-storage getter failures in `utils/authLoginHandoff.js`; parse complete
   numeric round-size drafts in `utils/mathEngine.js`; normalize scientific literals
   for exact evaluation in `utils/aiMath.js`. Add focused regression cases.
4. Introduce a database-generated monotonic preference revision with a new SQL
   migration. Update preference serialization, acknowledgements, and realtime ordering
   so local optimistic edits survive pending saves and client clocks are irrelevant.
   Execute the migration against a disposable database and verify revision ordering.
5. Correct the README's summary statistics and document the migration requirement.
   Run the complete test suite, lint, production build, and a separate self-review.

## Verification ledger

- Baseline: existing tests and 16,640 exact arithmetic cases passed during the review.
- Baseline copies of affected files are retained in a task-specific temporary directory.
- All seven findings are implemented. The account queue fix also protects the
  standard preference provider, which shared the same asynchronous queue pattern.
- Regression tests first reproduced account-switch corruption, cross-tab reset
  resurrection, denied session storage, clock-dependent ordering, scientific
  expression failures, and truncated scientific round-size drafts.
- `npm test -- --test-reporter=spec`: 181 tests passed, zero failed or skipped.
- The database test executes the migration in disposable PostgreSQL (PGlite),
  covering legacy rows, inserts, updates, upserts, forged revisions/timestamps,
  repeated migration execution, and authenticated ownership policies.
- `npm run lint`: passed.
- `npm run build`: passed; Browserslist emitted a nonblocking stale-data notice.
- The production server returned HTTP 200 for `/`, `/mixed`, `/stats`, `/login`,
  `/signup`, `/forgot-password`, `/reset-password`, and `/verify`.
- `git diff --check`: passed. A separate self-review checked the final source,
  migration, account scope boundaries, reset lock ordering, and test coverage.
  The review was not independent; no subagents were dispatched.
- Deployment requirement: apply
  `20261102055520_add_user_preferences_revision.sql` before deploying the frontend.
  No live database or deployment was changed by this codebase task.
