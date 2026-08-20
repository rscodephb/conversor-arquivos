param(
  [string]$DriveDest = $env:DRIVE_APK_DEST
)
if (-not $DriveDest) {
  throw "Set DRIVE_APK_DEST or pass -DriveDest, e.g. gdrive:Apps/Conversor de Arquivos Offline.apk"
}

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$apkDir = Join-Path $projectRoot "src-tauri\gen\android\app\build\outputs\apk\universal\release"
$unsignedApk = Join-Path $apkDir "app-universal-release-unsigned.apk"
$signedApk = Join-Path $apkDir "app-universal-release-signed.apk"
$keystore = Join-Path $env:USERPROFILE ".android\debug.keystore"
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }

function Find-ApkSigner {
  $tools = Get-ChildItem (Join-Path $sdk "build-tools") -ErrorAction SilentlyContinue | Sort-Object Name -Descending
  foreach ($dir in $tools) {
    $bat = Join-Path $dir.FullName "apksigner.bat"
    if (Test-Path $bat) { return $bat }
  }
  throw "apksigner not found in $sdk\build-tools"
}

function Sign-ApkIfNeeded {
  if (-not (Test-Path $unsignedApk)) {
    throw "APK not found. Run npm run android:build first: $unsignedApk"
  }
  if (-not (Test-Path $keystore)) {
    throw "Debug keystore not found: $keystore"
  }
  $signer = Find-ApkSigner
  & $signer sign --ks $keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out $signedApk $unsignedApk
  if ($LASTEXITCODE -ne 0) { throw "apksigner failed with exit $LASTEXITCODE" }
}

function Publish-ApkToDrive {
  $rclone = Get-Command rclone -ErrorAction SilentlyContinue
  if (-not $rclone) { throw "rclone not found in PATH" }
  Write-Host "Uploading APK to $DriveDest (replaces the same Drive file / link)..."
  & rclone copyto $signedApk $DriveDest --progress --drive-chunk-size 64M
  if ($LASTEXITCODE -ne 0) { throw "rclone upload failed with exit $LASTEXITCODE" }
  $relative = $DriveDest -replace '^gdrive:', ''
  $separator = $relative.LastIndexOfAny(@('/', '\'))
  $folder = $relative.Substring(0, $separator)
  $name = $relative.Substring($separator + 1)
  $listing = & rclone lsjson "gdrive:$folder" --files-only | ConvertFrom-Json
  $remote = $listing | Where-Object { $_.Name -eq $name } | Select-Object -First 1
  if (-not $remote) { throw "Uploaded, but could not read the Drive file id for $name" }
  $viewUrl = "https://drive.google.com/file/d/$($remote.ID)/view?usp=sharing"
  $downloadUrl = "https://drive.google.com/uc?export=download&id=$($remote.ID)"
  Write-Host ""
  Write-Host "Drive file id: $($remote.ID)"
  Write-Host "Open / share:  $viewUrl"
  Write-Host "Direct download: $downloadUrl"
}

Sign-ApkIfNeeded
Publish-ApkToDrive
