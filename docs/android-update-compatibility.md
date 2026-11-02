# Android updater compatibility: 1.0.2 to 1.0.4

**Fixed and published:** [Android 1.0.4 release](https://github.com/prezvious/mental-math-trainer/releases/tag/android-v1.0.4) · [Download the signed APK](https://github.com/prezvious/mental-math-trainer/releases/download/android-v1.0.4/Mental-Math-Trainer-1.0.4.apk).

If the old in-app updater shows the mismatch error, open the downloaded APK manually and install it **over** the existing app. **Do not uninstall or clear storage.**

## Confirmed cause

The published 1.0.2 updater requests `GET_SIGNING_CERTIFICATES` on Android 9 and later. Android 10's `PackageManager.getPackageArchiveInfo()` only collects an APK's certificates when the older `GET_SIGNATURES` flag is also present. Without it, the package and version parse successfully but the downloaded APK's signer set is empty. The updater then rejects the correctly signed APK with its combined package/version/compatibility/certificate error.

This was reproduced on an Android 10/API 29 emulator with the actual published 1.0.2 app and signed 1.0.3 APK. The installed signer was the expected certificate, the candidate package and version were correct, and the candidate signer set was empty. Both `update.part` and `update.apk` paths failed, so changing the file extension would not fix it.

The same installed 1.0.2 updater passed trusted-higher-version checks on Android 16/API 36. A later four-case regression suite fails its two trusted-update cases on Android 10 while correctly rejecting wrong-signature and mismatched-version candidates.

## Targeted fix

The corrected native updater always requests `GET_SIGNATURES` and also requests `GET_SIGNING_CERTIFICATES` on API 28 and later. It still prefers modern `SigningInfo` when comparing the actual APK signers. Package, increasing versionCode, expected version, minimum Android version, download size, SHA-256, and matching signer checks remain unchanged.

The legacy flag enables Android 10's certificate collection; it does **not** disable signature verification or accept an arbitrary certificate. Existing lower Android support remains unchanged. The requested compatibility range is Android 10–16/API 29–36.

## Updating affected installations

The faulty verifier is inside the installed 1.0.2/1.0.3 app. Publishing a different manifest cannot replace that installed native code. On affected devices, a one-time manual installation of the corrected signed APK is required. Install it **over** the existing app using Android's installer. **Do not uninstall or clear app storage.** Android checks signing compatibility independently of the app's updater.

The correction is **1.0.4 / versionCode 5**, rather than a silent replacement of the already published 1.0.3 APK. The signed APK and release materials are staged in `android-release/1.0.4/`.

The corrected release passed five instrumentation tests on Android 10 and five on Android 16: trusted higher-version files passed as `.part` and `.apk`, a different signer and mismatched expected version were rejected, and a controlled private app-data marker survived an in-place 1.0.2-to-1.0.4 installation. Native unit tests passed (8); release lint reported 0 errors and 33 warnings. Signature/alignment checks passed with the original certificate. All 76 bundled web/Capacitor configuration assets match 1.0.3; only native code/build outputs changed.

The release is stable/latest. All ten public assets were downloaded without authentication and matched their local hashes. Public manifest validation accepts installed versionCodes 3 and 4 across APIs 29–36 and correctly ignores versionCode 5. This is separate from the old installed Android 10 native verifier, which still requires the one-time manual installation. The local publication receipt is `android-release/1.0.4-publication-verification.json`.

The 1.0.3 release notes now include a recovery notice; its original APK and other assets were not replaced. No website deployment, source commit, or source push was made. Earlier source snapshots are preserved; the corrected native source and regression tooling are attached to the 1.0.4 release.

## Evidence and limits

- Root-cause framework source: [Android 10 PackageManager](https://github.com/aosp-mirror/platform_frameworks_base/blob/android-10.0.0_r47/core/java/android/content/pm/PackageManager.java), `getPackageArchiveInfo()`, where certificate collection is guarded only by `GET_SIGNATURES`.
- Android 11–16 framework implementations accept the legacy or modern flag for certificate collection; Android 12 implements this in `ApplicationPackageManager`.
- Reproduction uses real Android emulators, the real package parser, and the installed native updater—not a mocked `PackageManager`.
- Tests use signed, higher-version fixture APKs that are never installed or published as trainer releases. Negative cases retain signature and expected-version enforcement.
- No physical-device result is claimed. Runtime tests on Android 10 and 16 are not a claim that every intermediate Android version or manufacturer build was run.
