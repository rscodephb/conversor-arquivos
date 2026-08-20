# Development and packaging

## Prerequisites

- Node.js 20+
- `npm run setup` (Rust, Android targets, optional MSVC via winget)
- [Android Studio](https://developer.android.com/studio) only if you need an APK

`npm install` does not install Rust or the C++ toolchain.

## Corrupt Windows SDK (LNK1123)

Windows SDK `10.0.26100` can ship an invalid `kernel32.lib`. `npm run tauri:dev` and `npm run tauri:build` force SDK `10.0.22621`. Do not run `tauri` or `cargo` in a bare terminal without that environment.

If `link.exe` is missing, install the Visual Studio C++ workload and open a new terminal.

## Android

```bash
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set NDK_HOME=%ANDROID_HOME%\ndk\27.2.12479018
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

In Android Studio: SDK Manager → SDK Tools → NDK (Side by side) and Android SDK Command-line Tools.

The APK is written to `src-tauri/gen/android/app/build/outputs/apk/`. On the phone, allow unknown sources, copy the file, and install. Updates: build a new APK and install over the previous one.

## Optional: publish an APK to your Google Drive

Official binaries for this repository go to [GitHub Releases](https://github.com/rscodephb/conversor-arquivos/releases).

1. Install [rclone](https://rclone.org/) and run `rclone config` with a `gdrive` remote on **your** account.
2. Share only the APK file.
3. Always upload to the same path and name so the link stays stable.

```bash
npm run android:publish -- -DriveDest "gdrive:MyFolder/Conversor de Arquivos Offline.apk"
```

Or:

```bash
setx DRIVE_APK_DEST "gdrive:MyFolder/Conversor de Arquivos Offline.apk"
npm run android:publish
```
