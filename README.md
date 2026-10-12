# Bullion Forex Mobile

Android application. Current version: 1.0.5.

## Layout

- `versions/v103`, `versions/v104`, `versions/v105`: preserved version source, resources, build scripts and signed APKs. Latest source is `versions/v105`.
- `previews/`: widget renders and screenshots grouped by version.

## Build

Requires Android SDK platform 36, build-tools 36.0.0 and a compatible JDK. Set `JAVA_HOME` locally. Signing configuration comes from environment variables: `SIGNING_KEYSTORE`, `SIGNING_ALIAS`, `SIGNING_STORE_PASSWORD` and `SIGNING_KEY_PASSWORD`. Use the original signing key for compatible updates. Keys and credentials are excluded from the repository. Run:

```powershell
./versions/v105/build.ps1
```

## Application identity

Existing versions retain `com.bullionforex.app`. The intended identifier for a future migration is `app.adc.bullionforex`; changing to it creates a separate installed app and is not an in-place upgrade. No identifier migration is performed here.

Original APKs are preserved unchanged. No new GitHub release is created by this source publication. Third-party font and data-provider notices remain with the source.
