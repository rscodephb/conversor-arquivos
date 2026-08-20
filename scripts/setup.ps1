$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$androidTargets = @(
  "aarch64-linux-android",
  "armv7-linux-androideabi",
  "i686-linux-android",
  "x86_64-linux-android"
)
$ndkVersion = "27.2.12479018"
$missing = New-Object System.Collections.Generic.List[string]

function Write-Step([string]$message) {
  Write-Host ""
  Write-Host "==> $message"
}

function Test-Command([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Add-UserPath([string]$directory) {
  if (-not (Test-Path $directory)) { return }
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($current -notlike "*$directory*") {
    [Environment]::SetEnvironmentVariable("Path", "$directory;$current", "User")
  }
  if ($env:Path -notlike "*$directory*") {
    $env:Path = "$directory;$env:Path"
  }
}

function Install-NodeDependencies {
  Write-Step "Installing npm packages"
  if (-not (Test-Command "npm")) {
    $missing.Add("Node.js 20+ (https://nodejs.org/)")
    return
  }
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

function Install-Rust {
  Write-Step "Checking Rust"
  Add-UserPath "$env:USERPROFILE\.cargo\bin"
  if (-not (Test-Command "rustup")) {
    Write-Host "Downloading rustup..."
    $installer = Join-Path $env:TEMP "rustup-init.exe"
    Invoke-WebRequest -Uri "https://win.rustup.rs/" -OutFile $installer
    & $installer -y --default-toolchain stable --profile minimal
    Add-UserPath "$env:USERPROFILE\.cargo\bin"
  }
  if (-not (Test-Command "rustc")) {
    $missing.Add("Rust (rustup install failed or PATH needs a new terminal)")
    return
  }
  rustup default stable
  rustup target add x86_64-pc-windows-msvc | Out-Null
  foreach ($target in $androidTargets) {
    rustup target add $target | Out-Null
  }
  Write-Host "Rust $(rustc --version)"
}

function Test-MsvcLinker {
  $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
  if (Test-Path $vswhere) {
    $path = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($path) { return $true }
  }
  return [bool](Get-ChildItem "C:\Program Files*\Microsoft Visual Studio\*\*\VC\Tools\MSVC\*\bin\Hostx64\x64\link.exe" -ErrorAction SilentlyContinue)
}

function Install-MsvcIfMissing {
  Write-Step "Checking Visual Studio C++ Build Tools"
  if (Test-MsvcLinker) {
    Write-Host "MSVC linker found"
    return
  }
  if (-not (Test-Command "winget")) {
    $missing.Add("Visual Studio 2022 Build Tools with C++ workload")
    return
  }
  Write-Host "Installing VS Build Tools (UAC may appear, several minutes)..."
  $override = "--wait --quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --add Microsoft.VisualStudio.Component.Windows11SDK.22621"
  winget install --id Microsoft.VisualStudio.2022.BuildTools --accept-package-agreements --accept-source-agreements --override $override
  if (Test-MsvcLinker) {
    Write-Host "MSVC linker found"
    return
  }
  $missing.Add("Visual Studio 2022 Build Tools (install finished, but link.exe was not found yet; open a new terminal)")
}

function Set-AndroidEnvironment {
  $sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
  $ndk = Join-Path $sdk "ndk\$ndkVersion"
  $studioJbr = "C:\Program Files\Android\Android Studio\jbr"
  if (Test-Path $sdk) {
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
    [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdk, "User")
    $env:ANDROID_HOME = $sdk
    $env:ANDROID_SDK_ROOT = $sdk
  }
  if (Test-Path $ndk) {
    [Environment]::SetEnvironmentVariable("NDK_HOME", $ndk, "User")
    [Environment]::SetEnvironmentVariable("ANDROID_NDK_HOME", $ndk, "User")
    $env:NDK_HOME = $ndk
    $env:ANDROID_NDK_HOME = $ndk
  }
  if (Test-Path $studioJbr) {
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $studioJbr, "User")
    $env:JAVA_HOME = $studioJbr
    Add-UserPath (Join-Path $studioJbr "bin")
  }
  return @{ Sdk = $sdk; Ndk = $ndk; Java = $studioJbr }
}

function Accept-AndroidLicenses([string]$sdk) {
  $sdkmanager = Join-Path $sdk "cmdline-tools\latest\bin\sdkmanager.bat"
  if (-not (Test-Path $sdkmanager)) { return }
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $sdkmanager
  $psi.Arguments = "--sdk_root=`"$sdk`" --licenses"
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  [void]$process.Start()
  1..40 | ForEach-Object { $process.StandardInput.WriteLine("y") }
  $process.StandardInput.Close()
  [void]$process.StandardOutput.ReadToEnd()
  [void]$process.StandardError.ReadToEnd()
  $process.WaitForExit()
}

function Install-AndroidNdkIfPossible {
  Write-Step "Checking Android SDK / NDK"
  $paths = Set-AndroidEnvironment
  if (-not (Test-Path $paths.Sdk)) {
    $missing.Add("Android Studio / SDK (https://developer.android.com/studio)")
    return
  }
  Write-Host "ANDROID_HOME=$($paths.Sdk)"
  if (Test-Path $paths.Java) {
    Write-Host "JAVA_HOME=$($paths.Java)"
  } else {
    $missing.Add("JDK 17+ (Android Studio JBR at $($paths.Java))")
  }
  if (Test-Path $paths.Ndk) {
    Write-Host "NDK $($ndkVersion) found"
    return
  }
  $sdkmanager = Join-Path $paths.Sdk "cmdline-tools\latest\bin\sdkmanager.bat"
  if (-not (Test-Path $sdkmanager)) {
    $missing.Add("Android cmdline-tools + NDK $ndkVersion")
    return
  }
  Write-Host "Installing NDK $ndkVersion..."
  Accept-AndroidLicenses $paths.Sdk
  & $sdkmanager --sdk_root="$($paths.Sdk)" "ndk;$ndkVersion" "platform-tools"
  Set-AndroidEnvironment | Out-Null
  if (Test-Path $paths.Ndk) {
    Write-Host "NDK $($ndkVersion) found"
    return
  }
  $missing.Add("Android NDK $ndkVersion")
}

Install-NodeDependencies
Install-Rust
Install-MsvcIfMissing
Install-AndroidNdkIfPossible

Write-Host ""
if ($missing.Count -eq 0) {
  Write-Host "Setup complete. Next:"
  Write-Host "  npm run dev          # browser UI"
  Write-Host "  npm run tauri:dev    # Windows app"
  Write-Host "  npm run android:build"
  exit 0
}
Write-Host "Setup finished with missing items:"
$missing | ForEach-Object { Write-Host "  - $_" }
Write-Host "Install those, open a new terminal, then run npm run setup again."
exit 1
