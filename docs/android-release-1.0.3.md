# Android 1.0.3 release

## Status

Version name **1.0.3**, version code **4**, package `com.prezvious.mentalmathtrainer`.

**Published, now superseded by 1.0.4:** [android-v1.0.3](https://github.com/prezvious/mental-math-trainer/releases/tag/android-v1.0.3). The original release assets are unchanged.

**Known Android 10 updater bug:** 1.0.2/1.0.3 can falsely reject a correctly signed APK because Android 10's archive parser requires an additional certificate-collection flag. Use the [corrected signed 1.0.4 APK](https://github.com/prezvious/mental-math-trainer/releases/download/android-v1.0.4/Mental-Math-Trainer-1.0.4.apk) and install it manually over the existing app once, without uninstalling. See [the confirmed cause and recovery instructions](android-update-compatibility.md).

The original Android signing key was recovered and preserved outside the project. Its private-key certificate exactly matches the published 1.0.2 APK. See [the signing guide](android-signing-guide.md) for the verified key location and alias.

The published APK, `android-update.json`, checksums, source archive, installation guide, and verification notes are staged locally in the ignored directory `android-release/1.0.3-publish/`. The earlier signed preparation remains unchanged in `android-release/1.0.3-signed/`. `apksigner` verified APK Signature Schemes v2 and v3 with the original certificate; alignment and all 511 original APK entry contents were checked. The manifest records the actual signed APK's size and SHA-256. Application source was not changed during signing or publication.

The original unsigned build and source archive remain unchanged in `android-release/1.0.3/` as the pre-signing preparation. Their notes describe that earlier state. Do not install the explicitly unsigned APK. A physical-device in-place update test remains outstanding. Do not uninstall the existing app: uninstalling removes device history.

At publication, all eight assets were downloaded without authentication and matched their local sizes and SHA-256 hashes; GitHub's latest-release endpoint then returned `android-v1.0.3`. The JavaScript updater's manifest validation accepted installed versionCode 3, rejected a redundant update for versionCode 4, and deferred its simulated offer until the active round ended. These checks did not exercise Android 10's native archive parser; that gap was addressed by the 1.0.4 emulator regressions. The historical receipt is `android-release/1.0.3-publication-verification.json`.

## Included fixes

- Patched Next.js 15.5.28 and production dependency updates.
- Exact terminating decimal AI answers, including results beyond 15 decimal places, and supported unary plus.
- Safe guest startup when browser storage access is denied.
- Guest rounds end under their original ownership when an account signs in.
- Mixed feedback callbacks are canceled and invalidated when accounts change.
- Account reset coordinates ordinary saves, keepalive requests, replay, and import; browser Web Locks also coordinate supported same-origin tabs.
- Interrupted guest history becomes eligible for explicit account import.
- Imported answer payloads are removed while bounded ownership metadata prevents unintended reimport.
- A touch-accessible mobile Menu exposes training, progress, and account routes without changing Utility's appearance controls.

The Android packaging workspace is based on the source archive attached to `android-v1.0.2`. It retains native Back handling, bundled offline fonts, and the native GitHub updater, and includes the website's current interface assets and fixes. The website repository is not replaced by that older Android snapshot.

## Automatic updates

Installed 1.0.2 apps already check stable GitHub Android releases on launch/resume, at most once every six hours. Manual checking remains in **Utility → App updates**. Update offers wait until a practice round finishes. Downloads verify size, SHA-256, package, version, Android compatibility, and signing identity before opening Android's installer.

Android requires the user to approve installation; this is not silent installation. The signed 1.0.3 APK and update manifest are now public, so installed 1.0.2 apps can discover this release through their existing checker. Use the manual check to bypass the six-hour automatic-check interval.

## Verification and remaining checks

Required signing certificate SHA-256:

```text
9cd87c07fca2116cc58d2c9f83820d2c50572a84ea5dd1ed4e35589c1dc96b8e
```

Completed locally: verified the unsigned build's recorded SHA-256, aligned and signed that build with the recovered original key, verified its certificate, and ran the source archive's guarded `prepare-android-release.cjs` script. The script accepted the original signer and generated the manifest/checksum for **1.0.3 / versionCode 4**. Temporary password variables were removed.

The user authorized publication. A draft was uploaded, all eight GitHub asset digests were checked, and the release was published as stable/latest. Public downloads and updater compatibility were then verified. No website deployment or source commit was made.

Still outstanding: test an in-place update over 1.0.2 on a physical device, including history preservation and the permission/installer flow. Use the published signed APK without uninstalling first.

The attached `Mental-Math-Trainer-Android-Source.zip` is the Android packaging source. GitHub's automatically generated tag source archives are the web repository baseline, not the full Android project. Documentation inside the attached archive records its pre-publication signing state.

To rebuild later, extract the prepared Android source archive and follow its `ANDROID.md` instructions with Node.js 22+, Java 21, and the Android SDK. Build/sync the web assets, run `gradlew assembleRelease`, and sign with the recovered original key. Then run `npm run android:prepare-release -- <signed-apk> <release-directory>` from the Android source workspace; this website checkout does not define that npm script. The preparation script rejects certificates that differ from 1.0.2.

See the published `Verification.md` or local `android-release/1.0.3-publish/Verification.md` for release checks, `android-release/1.0.3-signed/Verification.md` for the earlier signing checks, and `android-release/1.0.3/Verification.md` for build checks. Application tests were not rerun for this signing/publication-only operation. No live Supabase account or physical Android installation is claimed by the local JavaScript/browser tests.
