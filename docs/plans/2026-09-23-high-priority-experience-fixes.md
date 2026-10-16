# High-priority experience fixes: proposed implementation plan

Status: implemented locally on 2026-09-23; release verification remains for configured Supabase recovery/import and cross-browser/device checks.

Implementation notes: the selected routes now use compact introductions and shared 404 recovery; Trainer and Mixed have guarded End round confirmation; guest attempts and session metadata are stored in IndexedDB; Progress shows device history and explicit account import; and password recovery routes are in place. Account progress rows are also checkpointed to an owner-scoped device retry queue. The local test suite, lint, production build, guest browser flow, responsive Mixed portrait/landscape check, and production HTTP 404 check passed. This is not a production auth or mobile-device sign-off: a configured Supabase test account/email service, Firefox/Safari, and real iOS/Android devices were not available in this environment.

Baseline: `main`, commit `10edfc1afa974ce0f02adcee22150c64c361bf89`, inspected on 2026-09-23.

## Scope and approach

This plan covers the five items under **High-priority experience fixes** in the website audit:

1. Explicitly ending a round and handling navigation during practice.
2. A usable active Mixed layout on mobile portrait and landscape screens.
3. Moving the primary task ahead of oversized introductory content.
4. Guest history, accurate account availability states, and password recovery.
5. A useful 404 recovery page.

Use incremental changes to the current Next.js Pages Router, React components, semantic theme tokens, and Supabase integration. Extract shared behavior only where these fixes need it.

A visual-only pass would not resolve round termination or missing guest history. A complete application/state-management rewrite would add unnecessary migration risk. The recommended approach is to introduce a small progress-storage boundary, reuse the existing round engines, and deliver the interface changes in separate reviewable increments.

The separate audit findings about missing mobile navigation, auto-submission, correctness feedback, shortcut remapping, advanced analytics, and bundle optimization remain separate work. In particular, restoring mobile navigation is a prerequisite to calling the overall mobile experience complete. Preserve the approved Command Desk: appearance controls, theme search, palette preview, collapsed shortcuts, automatic preference persistence, and no favorites, recent themes, navigation, or account section.

## Verified constraints and corrections to the audit

- Signed-in attempts are queued after each accepted answer. The buffer flushes at 20 rows or after a 2-second inactivity delay; saving is not deferred until the round ends. Consequently, **Discard round** cannot honestly mean discarding an unsaved draft. It would need a separate deletion workflow. This plan uses **Keep training** and **End round**, retaining submitted attempts. See [progressLogs.js](C:/Users/camar/Documents/Coding/mental-math-trainer/utils/progressLogs.js:1).
- The current termination functions already exclude the unanswered current question and avoid creating a record for zero attempts. Mixed also accounts for an accepted answer waiting in its feedback transition. Preserve these semantics. See [Trainer termination](C:/Users/camar/Documents/Coding/mental-math-trainer/pages/index.js:415) and [Mixed termination](C:/Users/camar/Documents/Coding/mental-math-trainer/pages/mixed.js:317).
- The account-unavailable screens observed during the audit were from the local environment. That is not evidence of a production outage. The code equates missing public configuration with unavailable account services; neither configuration presence nor `navigator.onLine` proves that sync succeeded. See [supabaseClient.js](C:/Users/camar/Documents/Coding/mental-math-trainer/utils/supabaseClient.js:12).
- Standard rounds support up to 10,000 questions. Attempt values include exact integers and decimal strings. A guest-history implementation must avoid repeated serialization of a growing round into localStorage, raw JSON serialization of BigInt, and conversion of exact answers to JavaScript Number.
- The current dashboard RPC filters data to the last 90 days. The migration also performs a one-time deletion of older rows; it does not establish a recurring purge job. Describe the dashboard as a 90-day view. Do not claim automatic server retention or lifetime totals. See [dashboard migration](C:/Users/camar/Documents/Coding/mental-math-trainer/supabase/migrations/20260418010000_enforce_exponent_cutover_and_90_day_retention.sql:56).
- Existing cloud records contain attempts, not a dedicated round record with target length or completion status. This plan does not require a new cloud rounds table. A local summary can say **Ended early**, but cloud session rows must not claim to know completion status from attempt counts alone.
- Existing progress-row builders omit `created_at`. Importing old guest attempts without addressing that would assign upload-time timestamps and distort the dashboard.

## 1. Explicit End round and navigation behavior

### User experience

- Display a labeled **End round** control in active manual Trainer and Mixed sessions. Keep existing admin auto-cycle Stop behavior intact.
- Open one confirmation dialog: **End this round?** Explain how many submitted answers will be kept and that the current unsubmitted answer is not counted.
- Provide **Keep training** as the initial focus target and **End round** as the confirming action. Escape cancels and restores answer-entry focus and text.
- Temporarily suspend answer entry and question advancement while this dialog is open. Pause the current question clock for that interval and restore its elapsed value on cancellation. This is dialog behavior, not a new general pause/resume feature.
- With zero accepted answers, confirmation returns to setup without creating a history entry. Otherwise, it opens the existing round summary with **Ended early**, the actual submitted count, and an accurate save state.
- A save failure must leave the summary and unsaved data available with a retry action. Report **Saved on this device** only after a local transaction succeeds and **Saved to your account** only after an acknowledged cloud write.

### Implementation sequence

1. Extend `ActiveSessionProvider` with explicit active-session state and a coordinated exit request. Keep the page-owned termination callback as the finalization entry point.
2. Introduce a focused confirmation component. Reuse the established theme and focus conventions; prevent simultaneous interaction with the underlying page and Command Desk.
3. Serialize submission, feedback, and termination around one authoritative session snapshot. Update refs/state together at the accepted-answer boundary. Repeated clicks, route events, or final-answer completion must not run finalization twice.
4. Preserve `getTerminationAttempts()` behavior in Mixed. If ending is requested during its 400 ms feedback interval, retain that submitted attempt exactly once, suspend the pending advance, and either finalize or resume it when the dialog resolves.
5. Send ordinary same-tab header links, brand navigation when it actually leaves the route, global navigation shortcuts, and sign-out through the same exit request. Perform the destination action only after confirmation and the required persistence checkpoint. Modifier-clicks and opening another tab should retain normal link behavior.
6. Handle browser Back/Forward separately. Validate a Pages Router history adapter with explicit cancel/confirm behavior and restoration of both the URL and displayed page. Do not treat `routeChangeStart` as a cancellable event or throw synthetic router errors as a cancellation mechanism. `beforePopState` returning false transfers handling responsibility to the application, including history restoration; this must be proven by a browser test. See [Next.js router documentation](https://nextjs.org/docs/pages/api-reference/functions/use-router#routerbeforepopstate).
7. Keep `pagehide` as a best-effort flush/checkpoint fallback. Register native unload confirmation only while a round is active. Browser shutdown and mobile process termination cannot guarantee a dialog or completion of an asynchronous request; per-answer checkpoints are the recovery mechanism.
8. Associate every asynchronous save result with its session and owner so an older save cannot mark a newly started round as saved.

Likely existing files: `pages/index.js`, `pages/mixed.js`, `utils/activeSessionContext.js`, `components/SiteLayout.js`, `components/RoundSummaryPanel.js`, and the progress persistence utilities. Proposed additions: `components/EndRoundDialog.js` and a focused exit/navigation helper.

### Acceptance criteria

- End before answering, mid-round, immediately after submission, during Mixed feedback, and on the final answer all produce the correct count without duplicates.
- Cancellation preserves the current question, typed answer, elapsed timer, and focus.
- An unsubmitted answer never becomes an incorrect attempt just because the user exits.
- Cancelled navigation changes neither the visible route nor the address bar; confirmed navigation occurs once.
- Pending writes retain their original session/user identity during sign-out, account changes, and retries.
- Zero-attempt exits produce no misleading 0% result or empty saved session.
- No End round action deletes previously persisted answers.

## 2. Mobile Mixed practice layout

### Layout rules

- Portrait: compact round header, progress, problem/answer display, then keypad. Remove excess panel padding and repeated title/kicker space from this active state.
- Short landscape: problem and answer display on the left; keypad and Submit on the right. Keep progress and End round in a compact top row.
- Keep every keypad hit target at least 44 by 44 CSS pixels. Reduce decorative spacing before reducing readable text or control size.
- Account for dynamic viewport height and safe-area insets. A sticky control must not cover another control or focused element.
- Avoid a blanket `overflow: hidden` solution. At unusually small heights or enlarged text, allow usable scrolling rather than clipping or disabling zoom.
- Preserve right-to-left digit entry, timer visibility, hardware keyboard support, and the current input-selection behavior. Width alone currently does not choose desktop input: it also requires hover and a fine pointer. See [mixed.js](C:/Users/camar/Documents/Coding/mental-math-trainer/pages/mixed.js:49).

### Implementation sequence

1. Restructure only the active Mixed panel into named header, problem, and keypad regions.
2. Add height-aware landscape styles after the compact page-header and End round dimensions are established.
3. Make problem sizing accommodate the longest supported operands and exponentiation answers without horizontal overflow.
4. Verify rotation/resizing preserves the session, answer, focus target, feedback state, and timer.
5. Keep the footer outside the active practice viewport where possible, without removing site recovery/navigation controls.

Likely existing files: `pages/mixed.js`, `components/mixed/StackedProblem.js`, `components/mixed/Keypad.js`, `components/mixed/QuestionTimer.js`, and scoped rules in `styles/redesign.css`.

### Acceptance criteria

- At 375x812 and 390x844 portrait, the problem, entered answer, all keypad actions, Submit, and End round are visible together at default zoom.
- At 667x375 and 812x375 landscape, the same controls are visible in the two-column arrangement.
- At 320x568 and 200% zoom, content remains reachable and readable, even when scrolling is necessary.
- No horizontal page overflow, obscured focus ring, or control underneath a sticky surface.
- Orientation changes and repeated keypad taps neither reset nor duplicate answers.

## 3. Put the primary task first

### Route-specific design

| Route/state | First content below the persistent header |
| --- | --- |
| Trainer setup `/` | Compact title, Start action, and essential round settings |
| Mixed setup `/mixed` | Compact title, Start action, and operation settings |
| Progress `/stats` | Title, history scope/status, and metrics or a useful empty state |
| Login `/login` | Title and login form, including password recovery |
| Signup `/signup` | Title and signup form with the existing necessary password guidance |
| Verify `/verify` | Actual verification status and the applicable next action |
| Active rounds | The practice interface with a valid page heading |
| Round completion | Summary and next-round actions with a valid page heading |

### Implementation sequence

1. Introduce a small shared page-introduction component: one `h1` and an optional supporting sentence. Use the existing typography and theme tokens.
2. Replace repeated hero checklists, secondary marketing headings, and decorative sidebar cards on these utility routes.
3. Move Start to the setup panel's top action row so saved settings can be launched immediately. Keep it attached to the same form and existing validation; do not create a second independent submit path. On narrow screens, make the single action row sticky only if necessary and ensure it does not cover fields.
4. Preserve every operation, precision, question-count, and mixed difficulty control. Maintain their loading/disabled states and Enter behavior.
5. Center the auth form in a sensible single column; eliminate the current wide hero above a left-aligned narrow form.
6. Remove duplicate account warnings in favor of the state model in section 4. Preserve actual verification loading/success/error content and existing valid verification redirects.
7. Retain an appropriate `h1` when the setup introduction disappears during a round or summary. Scope CSS changes to the new introductions and relevant panels to avoid affecting Command Desk or theme styling elsewhere.

Likely existing files: all six route files above, `utils/trainerPresentation.js`, and `styles/redesign.css`. Proposed addition: `components/PageIntro.js`.

### Acceptance criteria

- At 1280x720, default Trainer and Mixed setup expose Start and essential settings without scrolling past promotional content.
- At 375x812, the first editable setup control and Start action appear in the initial viewport. Showing every advanced setting in that viewport is not required.
- Login inputs and its primary action are visible at common desktop/mobile sizes. Signup begins with the form; necessary validation guidance may extend below the fold.
- Progress begins with useful data or one actionable empty state, not stacked unavailable/login panels.
- Each setup, active, completion, and verification state has one clear page heading.

## 4. Guest history and account experience

This is the largest workstream. Implement storage, display, import, and recovery as separate increments with explicit data contracts.

### 4A. Guest history storage

Use IndexedDB for versioned session and attempt records. Keep existing localStorage-based appearance/trainer preferences on their current path. IndexedDB avoids rewriting a full 10,000-question session after every answer and supports transactionally updating attempts and session metadata.

Proposed contract:

- A session has a stable UUID, owner scope (`guest` or a specific account ID), trainer kind, settings snapshot, requested question count, start/end timestamps, and state (`active`, `completed`, `ended`, or `interrupted`).
- Each attempt has a stable `(owner, sessionId, questionIndex)` key and retains operation/mode metadata, operand text, submitted/correct answer text, response duration, and its original timestamp. Convert BigInt to canonical strings at the storage boundary.
- Write each accepted attempt promptly and idempotently; finalization updates session metadata rather than replacing the full history. Update the UI immediately, but only advertise durable saving after transaction completion.
- On reload, show committed attempts from a stale active session as interrupted history. Do not claim to resume the unsaved current question. Distinguish a session active in another tab from an abandoned session before marking it interrupted.
- Proposed guest retention: the most recent 90 days, bounded by 100 inactive sessions or 10,000 retained attempts in inactive sessions, whichever limit is reached first. Prune whole oldest inactive sessions. Active sessions are temporarily exempt; apply the limits when they end or are recovered as interrupted. Apply age filtering consistently to metrics. Display the retention scope in Progress and explain that clearing browser data removes device history.
- Storage denial, quota failure, or corrupt records must not prevent practice. Fall back to in-memory results and show **History could not be saved on this device**. Do not label that state saved.
- Place the active checkpoint/retry owner above route pages, so navigating away does not dispose of the only copy of pending progress. Account-owned retry data must remain separate from guest data and only sync when its original account is authenticated. Store the account ID and attempt payload, not authentication tokens, in this history/queue. A durable signed-in retry queue is limited to preserving these pending writes, not a general offline-sync feature.

Proposed additions: `utils/progressStorage.js`, `utils/progressContext.js`, and a pure attempt serialization/validation helper. Integration points: `pages/_app.js`, both trainer submission/finalization paths, and existing progress buffers.

### 4B. Useful guest Progress and accurate status

- Adapt local entries into the current dashboard shape and reuse `buildProgressOverview`, `buildOperationBreakdown`, `buildRecentSessions`, and the display-label helpers. Explicitly sort attempts and add derived session labels; the raw session helper returns Sets rather than the final RPC payload.
- For guests, show device history, the normal metrics/recent sessions, and a single **Saved on this device** note after successful storage. With no history, offer **Start a round**.
- For signed-in users, show the existing account dashboard. Never silently mix unimported guest data or another account's cached records into account totals.
- Distinguish these states: checking account, guest with accounts available, guest with accounts unavailable, signed-in, and an actual save/load failure. Keep transient errors close to the relevant operation.
- Replace **Sync offline** with **Guest mode** for guests. On auth routes, explicitly say **Accounts are unavailable right now** when configuration is absent and offer guest practice.
- Disable all account-entry fields and submission controls while unavailable or submitting, consistently across Login, Signup, and password recovery. Keep navigation and recovery links operable when applicable.
- Add **Clear device history** to the guest Progress surface with a scoped confirmation. The action must not clear theme/trainer preferences or delete cloud records. Existing account progress reset stays clearly separate. Coordinate that existing reset with account-owned pending/in-flight writes and imported-history metadata so a queued retry cannot repopulate progress immediately after the user deletes it.
- Protect dashboard loading against account-switch races so a late response for account A cannot appear under account B.

Likely existing files: `pages/stats.js`, `utils/progressDashboard.js`, `components/SiteLayout.js`, auth pages, and trainer summary save-status helpers. Extract shared dashboard presentation only as needed to support both data sources.

### 4C. Optional import after signing in

- Offer **Save this device's guest history to [current account]** after successful authentication, with the session/attempt count and an explicit Import action. **Not now** retains the local history. Never import simply because someone signed in on a shared browser.
- Select only eligible guest sessions, bind the import to that account ID, and preserve session IDs and question indexes. Reuse the existing duplicate-safe `(user_id, session_id, question_index)` upsert contract and 500-row batches.
- Supply original `created_at` values. Update the shared row builders/legacy conversion as necessary so timestamps cannot be silently dropped during import. Preserve exact operand/answer text and decimal metadata. Keep data locally and report an actionable failure if the deployed schema cannot represent it.
- Checkpoint acknowledged batches. A retry, page reload, two tabs, or partial failure must not produce duplicate rows. Do not clear local source records before successful acknowledgement. After an acknowledged import, retire those records from guest history while retaining sufficient owner/import metadata to prevent unintended import into another account.
- Pause import if the authenticated account changes; it must never continue under a different user ID or token. Capture and validate the owner at every write boundary.
- Refresh the current account dashboard after completion. Use the existing 90-day reporting window; importing history must not make old activity look newly performed.

Existing schema already has the necessary uniqueness constraint. No migration is expected for basic import against the latest schema; verify the actual staging schema before release. Original completion/target metadata remains device-local unless a later feature adds cloud session metadata.

### 4D. Password recovery

- Add **Forgot password?** beside the Login password field.
- Add `/forgot-password` for requesting an email and `/reset-password` for entering and confirming a new password after session recovery.
- Reuse the existing password-validation functions and accessible form styling. Handle submitting, success, invalid/expired link, unavailable service, rate limit, and retry states. Announce status and errors and keep the first invalid field identifiable.
- Use Supabase's current `resetPasswordForEmail(..., { redirectTo })` flow and `updateUser({ password })` for the authenticated password update. Configure the allowed reset URL for local, staging, and production environments. The request response must not reveal whether an email is registered. See [Supabase password recovery documentation](https://supabase.com/docs/guides/auth/passwords#resetting-a-password).
- Preserve a distinct recovery state in the auth context: it currently discards the auth event type. Ensure a recovery link does not get redirected to Trainer by ordinary authenticated-page behavior before the password form completes. Handle initial callback processing and page reload, not only an event received after mounting.
- Accept only a valid authenticated session for password update; a query parameter by itself is not authorization. On an invalid/expired recovery link, offer a new reset request. After a successful update, show confirmation and an explicit **Continue to Trainer** action; clear password fields and transient recovery state.
- Verify delivery and callback behavior using a staging/test account and configured email service. Do not describe the flow as production-ready based only on mocked requests.

Likely existing files: `pages/login.js`, `pages/signup.js`, `utils/supabaseAuthContext.js`, `utils/passwordValidation.js`, and shared auth styles. Proposed additions: `pages/forgot-password.js`, `pages/reset-password.js`, and focused recovery helpers.

### Acceptance criteria for the account/guest workstream

- Guest completed and ended rounds from both trainers survive reload with exact answers, correct counts, and original timestamps.
- Decimal values and large exponentiation answers round-trip without precision loss; a 10,000-question session does not require rewriting all attempts on every submission.
- Retention, unavailable storage, multiple tabs, and clearing device history behave according to the contract.
- Theme, display mode, and trainer preferences remain intact after history operations and account changes.
- Importing the same session twice records each question once; partial retries retain timestamps and cannot target another account. Account progress reset is not undone by a delayed write or automatic retry.
- Guest, unavailable-account, loading, signed-in, and failed-request states are mutually understandable and do not stack contradictory panels.
- Recovery request, valid link, expired link, reload, password update, and return to training work end to end in a configured test environment.

## 5. 404 recovery page

### Implementation sequence

1. Change title and heading to **Page not found**.
2. Render the page within `SiteLayout` by removing its opt-out. Replace the nested `main` with a section so the normal layout remains the only main landmark.
3. Remove the duplicate page-level theme/document styling effect when the shared layout takes ownership. Preserve selected theme and Light/Dark/Adaptive appearance.
4. Keep a restrained decorative 404 and one explanatory sentence.
5. Add **Open Trainer** (`/`) and **Open Mixed** (`/mixed`) links. Home and Trainer are the same route, so a third duplicate Home action is unnecessary. Do not rely on browser Back, which may lead outside the site or to the same broken URL.
6. Preserve the actual HTTP 404 status and add appropriate noindex metadata.

Likely existing files: `pages/404.js` and its scoped rules in `styles/redesign.css`.

### Acceptance criteria

- Direct requests and client navigation to a missing route return/show the intended 404 experience, with working recovery links.
- The production server returns status 404, not a misleading 200.
- Shared navigation, one main landmark, one page heading, selected appearance, focus indicators, and mobile reflow work correctly.

## Delivery sequence and dependencies

| Step | Deliverable | Dependency |
| --- | --- | --- |
| 1 | Compact route introductions and 404 recovery | Independent; establishes final top-of-page dimensions |
| 2 | Guest storage, per-answer checkpoints, save states, and guest Progress | Agreed record/retention contract; no live account service required |
| 3 | End round dialog, single finalization path, and guarded exits | Step 2 for durable progress and accurate status |
| 4 | Active Mixed portrait/landscape layout | Steps 1 and 3 so header and End round space are known |
| 5 | Account availability cleanup and password recovery | Shared compact auth presentation; configured test auth/email service for validation |
| 6 | Explicit guest-to-account import | Step 2 plus authenticated owner handling from step 5 |
| 7 | Cross-route/browser verification and release review | All selected workstreams integrated |

Keep these increments separately reviewable. No broad CSS rewrite, router migration, password-policy change, cloud data deletion, or additional analytics feature is required for this plan.

## Verification and completion criteria

Use behavior tests for session finalization, persistence, precision, ownership, retry/import idempotency, and recovery state. Use browser interaction checks for layout, modal focus, navigation/history cancellation, and auth callbacks. Avoid source-text tests that merely assert a component contains particular strings.

Required combinations:

- Trainer positive, decimal, and exponentiation; Mixed single-operation and multi-operation settings.
- Guest, signed-in test user, unavailable accounts, and save/load failure.
- Setup, active question, pending feedback, end confirmation, completion, summary, and interrupted reload.
- Light, Dark, and Adaptive mode; representative contrasting themes; preserved Command Desk interactions.
- Desktop 1280x720 and 1440x900; mobile 375x812 and 390x844; landscape 667x375 and 812x375; 320px width and 200% zoom for reachability.
- Chromium, Firefox, and Safari/WebKit where available; real iOS/Android checks for keyboard, viewport, and safe-area behavior when release hardware is available.

Run the existing test suite, lint, and production build after implementation. Validate HTTP 404 on the production build, not only the development server. Use isolated test accounts for import and password recovery.

The previous audit baseline passed 141 tests, lint, and production build. That verifies the current baseline only; new behavior and real account workflows still need their own verification. Record any environment-dependent checks that could not be completed instead of treating them as passed.

Completion requires all five scoped experiences to satisfy their acceptance criteria and no regressions in math generation, exact answer handling, preferences, existing account progress, admin auto-cycle, or the approved Command Desk. The separate critical audit findings still require their own fixes before a whole-site readiness claim.
