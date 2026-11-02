# Confirmed fixes and Android 1.0.3

**Goal:** Fix the ten verified review findings in the website and ship the same fixes in the existing GitHub-distributed Android app, preserving its signing identity and updater.

**Starting revision:** `68842739ed939dfa0aa58e911b51f4a490cf79b1`. Existing untracked `review-*.cjs`/`review-*.mjs` files belong to the user and are preserved.

**Approach:** Keep the existing trainers, storage schema, visual themes, and native updater. Add focused regressions before changing behavior. Use the Android 1.0.2 release source as a separate packaging workspace; do not replace website source with its older snapshot. Android installation remains user-approved, as required by Android.

### Task 1: Arithmetic, browser storage, and supported dependencies
- Add failing cases for exact high-precision decimal solves, unary plus, and denied localStorage getters.
- Fix `utils/aiMath.js`, `utils/aiTrainer.js`, and `utils/browserStorage.js` without changing ordinary arithmetic behavior.
- Upgrade Next.js and matching ESLint configuration to a patched supported release; keep React 18 Pages Router compatibility.
- Verify focused tests, dependency audit applicability, and production compilation.

### Task 2: Durable progress and account transitions
- Add IndexedDB and trainer integration regressions for stale-session import, imported payload pruning, account changes during feedback, and guest-to-account transitions.
- Finalize guest ownership before clearing the active round; cancel timers and invalidate delayed callbacks on every account transition.
- Recover stale guest sessions before building import offers. Prune imported attempt payloads while retaining bounded owner metadata needed to prevent reimport.
- Coordinate resets with pending and in-flight writes, including replay/import/keepalive paths; delete only after preceding writes have settled.
- Verify targeted regressions and the complete trainer/storage suite.

### Task 3: Mobile navigation
- Keep Utility appearance-only. Restore touch-accessible Trainer, Mixed, Progress, and account actions at narrow widths using existing semantic tokens and navigation guards.
- Check mobile portrait/landscape and desktop behavior, keyboard focus, account states, and active-round exit confirmation.

### Task 4: Android release and automatic update delivery
- Inspect the 1.0.2 source archive and existing updater; retain package `com.prezvious.mentalmathtrainer`, signing certificate, and user-approved install flow.
- Merge the website fixes and current interface assets into the Android packaging workspace without losing native integrations.
- Increment to versionName `1.0.3`, versionCode `4`; build/export and run JavaScript, native unit, lint, and signing checks.
- Prepare APK, clean source archive, installation notes, and verification limits. **User decision: prepare only; do not publish.** The available local key differs from the required 1.0.2 signing identity. Build an explicitly unsigned artifact; do not generate a misleading installable update manifest.
- If the original signing key or build toolchain is unavailable, stop publication and report the exact blocker; never substitute a different signing identity.

## Verification and execution ledger
- Planning: GitHub release `android-v1.0.2` contains an existing native updater and source archive; repository main intentionally contains website source only.
- Baseline review: 153 website tests passed; all ten findings reproduced or checked against source/CSS/vendor advisories.
- Completed locally: all ten fixes, regression tests, website build, Android export/sync, native tests/lint, and unsigned release assembly. Signing, physical-device replacement, and publication are explicitly blocked/deferred by the user's preparation-only decision.
- Tasks 1–3: 166 website tests pass; lint reports no warnings/errors. Next.js is now 15.5.28. Production build and browser checks are in progress.
- Android signing: original certificate is `9cd87c07fca2116cc58d2c9f83820d2c50572a84ea5dd1ed4e35589c1dc96b8e`; local development certificate differs. User selected **Prepare release only**, so publication and in-place installation remain blocked, not silently replaced with another key.
- Final regression coverage: 169 website tests and 195 Android JavaScript tests pass. Eight native JUnit tests pass. JavaScript lint has no warnings/errors; native app lint has 0 errors and 33 warnings.
- Final security/install checks: production dependency audits report 0 vulnerabilities for both projects; standard `npm ci --dry-run --ignore-scripts --no-audit --no-fund` succeeds without legacy-peer flags. ESLint was aligned to 8.57.1 to keep the upgraded Next.js peer tree reproducible.
- Browser checks: touch navigation and guarded round exit work at 320px/390px and landscape; desktop navigation remains visible without duplicate mobile controls. Real Edge IndexedDB/Web Locks testing confirmed a two-tab reset cannot replay delayed or queued manual answers. The backend was simulated, not a live Supabase project.
- Retention self-review: added a regression ensuring retired import markers cannot evict unimported guest answers. Marker and guest-history quotas are bounded separately.
- Final builds: website production build and Android static export succeed for all 10 pages. Final unsigned APK metadata is package `com.prezvious.mentalmathtrainer`, version 1.0.3/code 4, minSdk 24/targetSdk 36. All 72 exported web assets match the APK byte for byte.
- Delivery: ignored `android-release/1.0.3/` contains the unsigned APK, clean source archive, checksums, verification notes, and an explicit signing blocker. No GitHub release/tag, website deployment, commit, or installable updater manifest was created. Existing user review scripts were preserved. Review was a structured self-review, not an independent review.

## Authorized publication follow-up

- The user subsequently requested publication. The recovered original key and a separately prepared signed APK were found; the existing signed artifacts were preserved without overwriting them.
- Reverified certificate continuity, versionCode 4, alignment, all 511 tested APK payload entries, source archive exclusions/continuity, manifest, and checksums.
- Published stable/latest release [`android-v1.0.3`](https://github.com/prezvious/mental-math-trainer/releases/tag/android-v1.0.3), release ID `415435503`, after validating eight draft uploads against GitHub's SHA-256 digests.
- Downloaded all eight public assets anonymously and matched their local bytes/hashes. The existing updater accepts the public release for version 1.0.2 and ignores a redundant update on 1.0.3; a simulated active round defers the offer.
- Published assets are staged in `android-release/1.0.3-publish/`; the post-publication receipt is `android-release/1.0.3-publication-verification.json`. Earlier unsigned/signed snapshots remain unchanged. No website deployment, source commit, or source push was made.
- Physical-device replacement, permission/installer behavior, and live Supabase flows remain untested and are disclosed in the release notes.

## Android updater regression follow-up

- User reported the 1.0.2-to-1.0.3 native compatibility/certificate error and requested Android 10–16 support.
- Reproduced against the actual published 1.0.2 app on an Android 10/API 29 emulator. Package, higher version, minSdk, and actual release certificate were correct; requesting only `GET_SIGNING_CERTIFICATES` left the archive signer set empty. Renaming `.part` to `.apk` did not fix it. Android 10 framework source confirms that only `GET_SIGNATURES` triggers archive certificate collection.
- Changed the native verifier to request legacy plus modern signing flags on API 28+, retaining all identity/hash/version requirements. Prepared 1.0.4/code 5 without overwriting 1.0.3 artifacts.
- Native runtime checks: 5 passed on Android 10 and 5 on Android 16, including actual 1.0.2-to-signed-1.0.4 replacement and controlled private-data retention. Higher trusted archives pass; wrong signer and expected version fail. Eight native unit tests pass; release lint has 0 errors and 33 warnings. All 76 bundled web/Capacitor assets match 1.0.3, so unchanged JavaScript/build evidence was reused rather than relabeled as a new run.
- Added native instrumentation regressions, local-only fixture-generation tooling, and compatibility/recovery documentation to the attached Android source. Fixture APKs and private signing material are excluded from distribution. Framework paths for Android 11–16 were inspected, but only 10 and 16 were executed on emulators.
- Published stable/latest [`android-v1.0.4`](https://github.com/prezvious/mental-math-trainer/releases/tag/android-v1.0.4), release ID `415451807`. All 10 anonymous public downloads match local hashes; the public manifest is compatible with installed codes 3/4 across APIs 29–36 and ignores current code 5. Receipt: `android-release/1.0.4-publication-verification.json`.
- Added a recovery notice to the 1.0.3 release body while preserving its prior notes and every asset. Affected old verifiers require a one-time manual installation over the existing app; no uninstall/clear-storage workaround is recommended.
- Owned emulators were shut down after testing. No physical-device result, actual trainer-history UI retention, installer-permission UI, live Supabase test, website deployment, source commit, or source push is claimed.
