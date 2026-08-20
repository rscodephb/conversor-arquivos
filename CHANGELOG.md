# Changelog

## Unreleased

- Conversion tests for CSV ↔ XLSX round-trip and TXT → PDF.
- Load PDF.js, pdf-lib, and Office parsers only when a conversion needs them.
- Document Windows SmartScreen on unsigned installers.
- Allow opening converted files with the system app (opener path scope).
- Batch convert several files of the same type and zip the results.
- On Android, save converted files to Downloads instead of a hanging file picker.

## 0.1.1

- Native file drop on the Windows app (Tauri drag-and-drop, not HTML5-only).
- `tauri:dev` / `tauri:build` select Windows SDK 10.0.22621 when 10.0.26100 libraries are corrupt.
- Product README, GitHub Actions CI, and unit tests for format detection and conversion targets.

## 0.1.0

- First public Windows NSIS installer and Android APK.
- Offline conversions for images, PDF, Office-like documents, CSV/XLSX, and plain text.
