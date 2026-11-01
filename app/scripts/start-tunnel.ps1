param([switch]$Usb, [switch]$Build, [string]$DeviceId, [int]$AdbPort = 0)
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
Set-Location $appRoot
$previewTemp = Join-Path $appRoot '.tmp'
New-Item -ItemType Directory -Path $previewTemp -Force | Out-Null
$env:TEMP = $previewTemp
$env:TMP = $previewTemp
$env:npm_config_cache = Join-Path $appRoot '.npm-cache'

$health = Invoke-RestMethod 'http://localhost:8080/actuator/health' -TimeoutSec 10
if ($health.status -ne 'UP') { throw 'Start the local DDAS backend before opening the mobile app.' }

$proxyMode = if ($Usb) { 'false' } else { 'true' }
$envText = "API_BASE_URL=http://localhost:8080/api/v1`nAPI_USE_EXPO_PROXY=$proxyMode`nAPI_TIMEOUT=20000`nVIEWER_EMAIL=`nVIEWER_PASSWORD=`nTEST_TOKEN=`n"
[System.IO.File]::WriteAllText((Join-Path $appRoot '.env.local'), $envText, [System.Text.UTF8Encoding]::new($false))
# A blank base token also prevents an old .env test token overriding demo auth.
$baseEnv = Join-Path $appRoot '.env'
if (Test-Path $baseEnv) {
    $original = [System.IO.File]::ReadAllText($baseEnv)
    $original = [regex]::Replace($original, '(?m)^\s*TEST_TOKEN\s*=.*$', 'TEST_TOKEN=')
    [System.IO.File]::WriteAllText($baseEnv, $original, [System.Text.UTF8Encoding]::new($false))
}
if ($Usb) {
    $localAdbPort = Join-Path $appRoot '.expo/adb-port'
    if (!$AdbPort -and (Test-Path $localAdbPort)) { $AdbPort = [int](Get-Content $localAdbPort -Raw).Trim() }
    if ($AdbPort) {
        if ($AdbPort -lt 1024 -or $AdbPort -gt 65535) { throw 'Invalid local ADB server port.' }
        $env:ADB_SERVER_SOCKET = "tcp:localhost:$AdbPort"
    }
    if (!$DeviceId) {
        $connected = @(& adb devices | Select-String '^([^\s]+)\s+device$' | ForEach-Object { $_.Matches[0].Groups[1].Value })
        if ($connected.Count -ne 1) { throw 'Connect one authorized Android phone, or pass -DeviceId.' }
        $DeviceId = $connected[0]
    }
    & adb -s $DeviceId reverse tcp:8080 tcp:8080
    if ($LASTEXITCODE -ne 0) { throw 'Could not connect the phone to the API over USB.' }
    & adb -s $DeviceId reverse tcp:8082 tcp:8082
    if ($LASTEXITCODE -ne 0) { throw 'Could not connect the phone to Metro over USB.' }
    Write-Host 'USB development: local API on 8080, Metro on 8082. Keep the cable connected.'
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1'
    if ($Build) {
        # Keep native builds within memory limits on this development machine.
        $gradleProperties = Join-Path $appRoot 'android/gradle.properties'
        & npx.cmd expo prebuild --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw 'Android native project generation failed.' }
        if (Test-Path $gradleProperties) {
            $gradleText = [System.IO.File]::ReadAllText($gradleProperties)
            $gradleText = $gradleText -replace '(?m)^org.gradle.jvmargs=.*$', 'org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=512m -XX:ActiveProcessorCount=2'
            $gradleText = $gradleText -replace '(?m)^org.gradle.parallel=.*$', 'org.gradle.parallel=false'
            foreach ($setting in @('org.gradle.workers.max=1', 'kotlin.compiler.execution.strategy=in-process')) {
                $settingKey = [regex]::Escape($setting.Split('=')[0])
                $gradleText = $gradleText -replace "(?m)^$settingKey=.*\r?\n?", ''
                $gradleText = $gradleText.TrimEnd() + "`n$setting`n"
            }
            [System.IO.File]::WriteAllText($gradleProperties, $gradleText, [System.Text.UTF8Encoding]::new($false))
        }
        $env:CMAKE_BUILD_PARALLEL_LEVEL = '1'
        $deviceName = (& adb -s $DeviceId shell getprop ro.product.model).Trim()
        & npx.cmd expo run:android --device $deviceName --port 8082
    } else {
        # --localhost can bind only ::1 on Windows; USB reverse needs IPv4.
        & npx.cmd expo start --dev-client --lan --port 8082 --android --clear
    }
    if ($LASTEXITCODE -ne 0) { throw 'Android development startup failed.' }
    return
}
Write-Host 'Backend connected through the Expo tunnel API proxy.'
Write-Host 'Open Expo Go on your phone and scan the QR code below. Keep this terminal and Docker running.'
npm.cmd run start:tunnel
