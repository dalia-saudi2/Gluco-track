# Run once after installing Android Studio SDK (Tools → SDK Manager).
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\setup-android-env.ps1

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $sdk)) {
    Write-Host "Android SDK not found at: $sdk"
    Write-Host "Open Android Studio → More Actions → SDK Manager → install Android SDK + Platform-Tools."
    exit 1
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$androidHome = [Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")
$toAdd = @(
    $sdk,
    "$sdk\platform-tools",
    "$sdk\emulator"
)

if ($androidHome -ne $sdk) {
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
    Write-Host "Set ANDROID_HOME=$sdk"
}

foreach ($p in $toAdd) {
    if ($userPath -notlike "*$p*") {
        $userPath = if ($userPath) { "$userPath;$p" } else { $p }
    }
}
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")
Write-Host "Android SDK paths added to user PATH. Restart the terminal, then run: npm run android:device"
