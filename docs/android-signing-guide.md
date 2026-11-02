# Android signing key and password setup

To release Android 1.0.3 as a compatible update to 1.0.2, we need the original Android signing key. These details are not values you invent, and they are not your GitHub login credentials.

## Verified recovery — 17 October 2026

The original key was found in the relocated Codex build workspace:

```text
D:\C-Drive-Relocation\Documents\Codex\2026-10-14\d\work\android-toolchain\android-user\debug.keystore
```

A byte-for-byte verified copy is preserved outside the project and release folders:

```text
Keystore path: C:\Users\camar\Android Keys\mental-math-trainer-original.keystore
Key alias: androiddebugkey
Entry type: PrivateKeyEntry
Certificate SHA-256: 9cd87c07fca2116cc58d2c9f83820d2c50572a84ea5dd1ed4e35589c1dc96b8e
```

This certificate exactly matches the published 1.0.2 APK. The recovered key successfully signed the prepared 1.0.3 APK, and `apksigner` verified its signature. Temporary signing password variables were removed. No password setup is needed for the APK already prepared.

The signed APK, update manifest, checksum, and verification notes are in `android-release/1.0.3-signed/`. They are **local and unpublished**; a physical-device update test remains required. The original unsigned preparation is retained in `android-release/1.0.3/`.

Keep both private-key copies out of chat, GitHub, and release assets. The instructions below remain useful when checking another backup or signing again.

> Do not create a new keystore or uninstall the existing app as a workaround. A different signing key cannot update this installation through the current updater, and uninstalling removes local app data.

## What the details mean

| Detail | Meaning |
| --- | --- |
| **Keystore path** | Full location of the file containing the private signing key, usually a `.jks` or `.keystore` file. |
| **Key alias** | Name of the signing-key entry inside that keystore. |
| **Keystore password** | Password used to open the keystore. |
| **Key password** | Password protecting the private-key entry. It may be the same as the keystore password. |
| **Password variable names** | Temporary names we choose to hold the passwords locally, such as `MM_KEYSTORE_PASSWORD` and `MM_KEY_PASSWORD`. The names are safe to share; the password values are not. |

## 1. Find the original keystore

Check the computer, backup, or build environment used to create Android 1.0.2. Ask whoever created that release if you never received the key file.

In Windows File Explorer, right-click the file and choose **Copy as path**. On some Windows versions, hold **Shift** while right-clicking to reveal that option.

Example only—use the actual file location:

```text
C:\Users\camar\Documents\Android Keys\original-release.jks
```

During release preparation, the key at `C:\Users\camar\.android\debug.keystore` did **not** match the published APK. Do not use that file for this update; use the verified recovered copy above.

Keep the keystore outside the source repository and release-artifact folder. Do not upload it to chat or GitHub.

## 2. Find its alias and verify its certificate

Open PowerShell. The following command requires a Java JDK with `JAVA_HOME` pointing to its installation directory. Replace the example keystore path:

```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -list -v -keystore "C:\path\original-release.jks"
```

Enter the keystore password when prompted, rather than putting it directly in the command.

For the matching entry, look for:

```text
Alias name: ...
Entry type: PrivateKeyEntry
SHA256: ...
```

The entry must contain a **private key**. An entry containing only a public certificate cannot sign the APK.

The signing certificate's SHA-256 must match this value, ignoring capitalization and colon separators:

```text
9cd87c07fca2116cc58d2c9f83820d2c50572a84ea5dd1ed4e35589c1dc96b8e
```

You may share the path, alias, entry type, and certificate fingerprint. Do not share the passwords or keystore contents.

## 3. Prepare temporary password variables

**Do this only after confirming that the certificate matches.** The password setup can wait while we check the path and alias.

These commands work in Windows PowerShell 5.1 and PowerShell 7. They prompt without displaying the password or placing its value directly in command history:

```powershell
$password = Read-Host "Keystore password" -AsSecureString
$env:MM_KEYSTORE_PASSWORD = [System.Net.NetworkCredential]::new("", $password).Password

$password = Read-Host "Key password" -AsSecureString
$env:MM_KEY_PASSWORD = [System.Net.NetworkCredential]::new("", $password).Password

Remove-Variable password
```

If both passwords are the same, enter the same password at each prompt.

To check that the variables exist without printing their values:

```powershell
Test-Path Env:MM_KEYSTORE_PASSWORD
Test-Path Env:MM_KEY_PASSWORD
```

Both commands should return `True` after successful setup.

### Security and session scope

- These variables exist in that PowerShell process and are inherited by programs launched from it. A separate, already-running terminal or agent does not automatically receive them.
- Environment-variable values are plaintext in the process environment, not an encrypted secret store. Use a trusted local session and keep them temporary.
- Setting the variables does not sign or publish anything. A signing command must explicitly reference them.
- Do not put the passwords in chat, source files, committed configuration, or `NEXT_PUBLIC_` variables. Do not persist them with `setx` or Windows environment-variable settings.
- If the agent cannot access the variables, we can run the signing command in the same PowerShell window instead. You can then share the signed APK's path without sharing its passwords.

## 4. What to send back

Start with the actual path, alias, and fingerprint. Once the certificate is confirmed and password setup is arranged, provide the variable names—not their values:

```text
Keystore path: [actual full file path]
Key alias: [alias shown by keytool]
Entry type: PrivateKeyEntry
Certificate SHA-256: [fingerprint shown by keytool]
Keystore password variable: MM_KEYSTORE_PASSWORD
Key password variable: MM_KEY_PASSWORD
```

Also say whether the variables were set in a separate PowerShell window, so we do not assume the agent can read them.

## 5. Remove temporary variables after signing

Run this in the PowerShell window where you set them:

```powershell
Remove-Item Env:MM_KEYSTORE_PASSWORD, Env:MM_KEY_PASSWORD -ErrorAction SilentlyContinue
```

This removes the variables from that process. It does not erase copies already inherited by other running processes.

## If the original key is missing

The private key cannot be reconstructed from the APK's public signing certificate. The prepared source archive deliberately excludes keystores and signing credentials.

If no backup of the original key is available, stop before signing or publishing. We would need a separate release and migration decision; a newly signed APK would not be a compatible update to the existing installation through the current updater.

See [Android 1.0.3 preparation](android-release-1.0.3.md) for the release status and signing requirements.
