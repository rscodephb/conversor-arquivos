$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$preferredSdk = "10.0.22621.0"
$corruptSdk = "10.0.26100.0"

function Find-VcVars64 {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat",
    "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) { return $path }
  }
  $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
  if (Test-Path $vswhere) {
    $installPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($installPath) {
      $vcvars = Join-Path $installPath "VC\Auxiliary\Build\vcvars64.bat"
      if (Test-Path $vcvars) { return $vcvars }
    }
  }
  throw "vcvars64.bat not found. Run npm run setup and open a new terminal."
}

function Get-WindowsSdkVersion {
  $libRoot = "${env:ProgramFiles(x86)}\Windows Kits\10\lib"
  $preferredLib = Join-Path $libRoot "$preferredSdk\um\x64\kernel32.lib"
  if (Test-Path $preferredLib) { return $preferredSdk }
  if (-not (Test-Path $libRoot)) { return $preferredSdk }
  $versions = Get-ChildItem $libRoot -Directory | Sort-Object Name -Descending
  foreach ($dir in $versions) {
    $lib = Join-Path $dir.FullName "um\x64\kernel32.lib"
    if ((Test-Path $lib) -and $dir.Name -ne $corruptSdk) { return $dir.Name }
  }
  return $preferredSdk
}

function ConvertTo-CmdArgument([string]$value) {
  $escaped = $value.Replace('"', '\"')
  return "`"$escaped`""
}

$vcvars = Find-VcVars64
$sdk = Get-WindowsSdkVersion
$tauriCmd = Join-Path $projectRoot "node_modules\.bin\tauri.cmd"
if (-not (Test-Path $tauriCmd)) {
  throw "Tauri CLI not found. Run npm install first."
}
$tauriArgs = @($args)
if ($tauriArgs.Count -eq 0) { $tauriArgs = @("--help") }
$joinedArgs = ($tauriArgs | ForEach-Object { ConvertTo-CmdArgument $_ }) -join " "
Write-Host "Using Windows SDK $sdk"
$command = "call `"$vcvars`" $sdk && call `"$tauriCmd`" $joinedArgs"
cmd.exe /c $command
exit $LASTEXITCODE
