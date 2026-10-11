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

# Use a regular local demo user; do not embed the administrator account.
$stateDir = Join-Path $appRoot '.expo'
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
$authFile = Join-Path $stateDir 'mobile-demo-auth.json'
if (Test-Path $authFile) {
    $demoAuth = Get-Content $authFile -Raw | ConvertFrom-Json
} else {
    $demoAuth = @{email='mobile-demo@example.invalid'; password=('Demo!' + [guid]::NewGuid().ToString('N'))}
    $registerBody = @{fullName='Mobile Demo Viewer'; email=$demoAuth.email; password=$demoAuth.password; languagePreference='en'} | ConvertTo-Json
    $null = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/v1/auth/register' -ContentType 'application/json' -Body $registerBody
    $demoAuth | ConvertTo-Json | Set-Content $authFile -Encoding UTF8
}
$loginBody = @{email=$demoAuth.email; password=$demoAuth.password} | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/v1/auth/login' -ContentType 'application/json' -Body $loginBody
if (-not $login.data.token) { throw 'Local mobile demo login failed.' }

$envText = "API_BASE_URL=http://localhost:8080/api/v1`nAPI_USE_EXPO_PROXY=true`nAPI_TIMEOUT=20000`nVIEWER_EMAIL=$($demoAuth.email)`nVIEWER_PASSWORD=$($demoAuth.password)`nTEST_TOKEN=`n"
[System.IO.File]::WriteAllText((Join-Path $appRoot '.env.local'), $envText, [System.Text.UTF8Encoding]::new($false))
# A blank base token also prevents an old .env test token overriding demo auth.
$baseEnv = Join-Path $appRoot '.env'
if (Test-Path $baseEnv) {
    $original = [System.IO.File]::ReadAllText($baseEnv)
    $original = [regex]::Replace($original, '(?m)^\s*TEST_TOKEN\s*=.*$', 'TEST_TOKEN=')
    [System.IO.File]::WriteAllText($baseEnv, $original, [System.Text.UTF8Encoding]::new($false))
}
Write-Host 'Backend connected through the Expo tunnel API proxy.'
Write-Host 'Open Expo Go on your phone and scan the QR code below. Keep this terminal and Docker running.'
npm.cmd run start:tunnel
