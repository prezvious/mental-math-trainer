# Android practice keypad implementation plan

**Goal:** Replace Android's soft keyboard for practice answers with an app-owned numeric keypad, device-persisted color presets/custom HEX, and a layout keeping the problem and answer visible. User authorized publishing the tested next APK.

**Scope:** Android packaging source currently at `C:\Users\camar\AppData\Local\Temp\opencode\mental-math-android-1.0.3\source\Mental-Math-Trainer-Android`, based on released 1.0.4. Website behavior, login/text keyboards, arithmetic generation, round ownership, timers, and updater checks stay intact. Ship signed 1.0.5/code 6 with the original certificate; do not overwrite prior releases or user review files.

## Direction contract — Operate / local extension

**Thesis:** The practice surface owns answer entry: problem, visible answer, and large calculator keys fit together instead of yielding the screen to Android's keyboard.

**Own-world:** Inherit existing interface geometry, fonts, focus/disabled states, and theme tokens. Only keypad fill is customizable; choose readable black/white key text automatically. Follow-theme is the default, alongside six named presets and custom HEX.

**Story:** Start a normal round, type with app keys, correct with backspace/clear, and submit. Correct-answer auto-submit and Mixed right-to-left entry remain unchanged. Configure color through Utility without changing the app's selected theme.

**First viewport:** Compact existing header during Android practice, progress and problem above a labeled read-only answer, and a three-column keypad below. Landscape places problem/answer beside the keypad. Keys remain at least 44 CSS px; short/large-text screens can scroll rather than clip controls.

**Form:** Narrow code-led extension of the established practice surface, not a new visual world. Conditional minus and decimal keys follow the current problem's supported answer syntax; do not add a new negative-question generator.

**Finish:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance. No new shipping raster is required; preserve the established DESIGN.md unless the implemented extension needs a small factual addition.

## Task 1 — Input and color behavior

- Add `utils/practiceKeypad.js` for key capabilities, digit/sign/decimal/backspace editing, HEX normalization, presets, and black/white contrast selection.
- Add `utils/practiceKeypadContext.js` for SSR-safe Android detection, shared color state, and safe device-local persistence using existing browser storage helpers. Denied storage must not break practice; report non-persistence in settings.
- Add failing unit cases for integer/decimal/negative syntax, RTL deletion, repeated decimal/minus, invalid HEX, contrast extremes, and persistence failures; implement and verify.

## Task 2 — Shared answer entry and keypad

- Add `components/PracticeKeypad.js` and `components/PracticeAnswerInput.js`, reusing existing button/icon conventions. Android practice inputs are read-only with `inputMode=none`, with explicit physical-keyboard/paste support.
- Integrate with Standard's existing change/auto-submit/submit functions and Mixed's existing digit/delete/clear/RTL/feedback functions. Browser Mixed keypad and normal browser answer inputs remain unchanged.
- Add component/integration regressions for all keys, conditional syntax, disabled feedback/dialog states, no keyboard request attributes, correct auto-submit, round transitions, and hardware typing.

## Task 3 — Color controls and responsive layout

- Add `components/KeypadColorSettings.js` in Android Utility, wire the provider in `pages/_app.js`, and expose an Android-only shell attribute in `components/SiteLayout.js`.
- Add `styles/practiceKeypad.css` after existing interface styles. Use scoped geometry and local custom-color tokens; custom fill must override each theme while borders/focus/disabled states remain accessible.
- Verify preset/custom selection, invalid-input recovery, persistence across restart, theme-follow reset, portrait/landscape/tablet/large-text layout, and unchanged login keyboard. Inspect in one batched screenshot round and one confirmation round at most.

## Task 4 — Android verification and delivery

- Run the Android JavaScript suite/lint, production export/sync, native build/unit/lint, and existing updater regression tests with fixtures regenerated above code 6.
- Check the actual packaged app on Android 10 and 16 emulators: IME hidden in practice, visible in normal text fields, keypad answers and colors work, no covered problem/answer, portrait/landscape, and preserved upgrade identity/data.
- Obtain the skill-requested fresh UI finish review and documentation pass with explicit read/write boundaries; resolve material findings within the review budget.
- Sign with the original key, prepare APK/update manifest/clean source/checksums/verification limits, upload a draft, verify assets, publish stable `android-v1.0.5`, and verify anonymous downloads and updater manifest compatibility.

## Review focus

- Rapid taps/auto-submit must not leak a previous answer into the next problem.
- Read-only practice input must preserve physical keyboard access without opening the Android IME.
- Utility HEX fields and login must still accept normal Android text input.
- Custom white/black/vivid HEX colors need legible labels in every interface; invalid saved data falls back safely.
- Layout must not cover controls at 320px, landscape, Android safe insets, or larger text; excessive content scrolls instead of clipping.

## Execution ledger

- Design and publication scope confirmed by the user. Implementation and verification pending.
- Implemented shared Android-only answer entry, compact four-column keypad, conditional syntax, device-local colors/presets/custom HEX, and portrait/landscape styling. 208 JavaScript tests and 8 native unit tests pass. Export/sync succeeds; release lint is 0 errors/33 inherited warnings; signed 1.0.5/code 6 candidate is prepared locally.
- Temporary workspace lost unchanged files; recovered the hash-verified complete published 1.0.4 source and preserved keypad edits in `C:\Users\camar\Documents\Coding\mental-math-android\Mental-Math-Trainer-Android` (now the primary workspace). Baseline source-path completeness was verified. Obsolete generated outputs from the old workspace were removed; source and releases were preserved.
- Browser layout/entry/persistence checks pass, including 320px/large-text/landscape/long decimals. Fresh UI reviewer found one new Utility foreground/typography defect; fixed in one batch, measured 14.65:1 light/15.44:1 dark, and reviewer scored the listed fix resolved (`ship` at fix-only scope). Documentation agent added the scoped extension note in DESIGN.md and rechecked it after the correction; no shared-token redesign.
- Actual signed candidate installed over 1.0.4 on Android 10: all 10 instrumentation tests pass. Android 16 updater/retention tests pass; UI checks remain blocked by SystemUI/keyboard startup ANRs, timeouts and input-injection failures. Native screenshot captures were not valid; helper now waits for WebView visual state and disables capture-time motion. No full native visual approval or Android 16 UI pass is claimed.
- C: fell to roughly 232 MB free with under 1 GB free host RAM. Stopped the owned frozen emulator; user explicitly chose moving only this task's emulator disks to D: (205 GB free) and retrying verification before publication. Move in progress to `D:\OpenCode-Test-Data\mental-math-keypad-emulators`. Do not publish until remaining gates are resolved or the user explicitly changes scope.
- Move completed: all 55 files / 13.249 GB copied and moved without mismatches/failures, freeing 9.6 GB on C:. AVD pointers now use D:. Android 16's SystemUI/phone/Google processes still ANR after relocation; the bounded final UI smoke retry failed its WebView callback timeout. Stopped only the owned emulator processes. Candidate is still unpublished; a healthy Android 16 runtime and valid native captures/review are required, or explicit user approval to change publication scope. Signed APK SHA-256: `027a0ae8fa38c84111f5b8938f54d8781385523b5d1407575f2ef93e30f85d84`.
- User subsequently asked to publish the APK after these limits were disclosed. Proceed with the original GitHub Android release flow, keeping the APK unchanged and the outstanding Android 16 UI/native visual checks prominent in release notes and verification documentation. Reverify signing identity, source hygiene, all asset hashes, draft contents, and anonymous downloads; do not represent publication as completion of the blocked checks.
- Published stable/latest `android-v1.0.5` (release ID `415614649`) at `2026-10-17T05:52:55Z`: https://github.com/prezvious/mental-math-trainer/releases/tag/android-v1.0.5. All 14 draft assets matched local size/SHA-256 before publication; all 14 anonymous public downloads subsequently matched. Original signer, API 29–36 APK signature verification, and 16 KB-aware alignment were rechecked. The actual updater module selects 1.0.5 from public release metadata and validates the code-6 offer from code 5 on SDK 29 and 36; an installed code 6 gets no duplicate offer. Public receipt: `C:\Users\camar\Documents\Coding\mental-math-android\public-release-verification-1.0.5.json`.
- APK bytes remain unchanged: SHA-256 `027a0ae8fa38c84111f5b8938f54d8781385523b5d1407575f2ef93e30f85d84`. Repacked complete source ZIP SHA-256 `e2187c0ab0131e01a89593bc8767f06b296394e272cca153296273d440cb5c12`; 284 entries with keys, fixture APKs, credentials, local SDK paths, dependencies and generated build outputs excluded. The prior unpublished source ZIP was preserved separately. Release notes and verification attachment prominently retain the Android 16 UI/native visual limitations. No website source push/deployment or private-key publication occurred. Publication is complete; the disclosed verification work is still outstanding.
