param([switch]$DependenciesOnly, [switch]$SkipDocker)
$ErrorActionPreference = 'Stop'
$apiRoot = Split-Path $PSScriptRoot -Parent
Set-Location $apiRoot
if (!(Test-Path '.env')) { throw 'Create api/.env from .env.example first.' }

# Load simple dotenv KEY=value entries into the host process, without logging secrets.
foreach ($line in Get-Content '.env') {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
        $key = $matches[1]
        $value = $matches[2].Trim()
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($null -eq [Environment]::GetEnvironmentVariable($key, 'Process')) {
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/dam_disaster_db?useSSL=false&allowPublicKeyRetrieval=true'
$env:SPRING_DATASOURCE_USERNAME = $env:MYSQL_USER
$env:SPRING_DATASOURCE_PASSWORD = $env:MYSQL_PASSWORD
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = 'validate'
$env:MQTT_BROKER_HOST = 'localhost'
$env:DDAS_AI_BACKEND_URL = 'http://localhost:8000'

if (!$SkipDocker) {
    # Stop the old API to release 8080. Keep existing database containers and volumes.
    & docker compose stop api web
    if ($LASTEXITCODE -ne 0) { throw 'Could not stop the previous container API/web.' }
    & docker compose -f docker-compose.yml -f docker-compose.host.yml up -d --build mysql mosquitto phpmyadmin qdrant minio mlflow ai
    if ($LASTEXITCODE -ne 0) { throw 'Local dependency startup failed.' }
}
if ($DependenciesOnly) { return }
Write-Host 'Starting Spring Boot on http://localhost:8080 (database and AI remain in Docker).'
& .\mvnw.cmd spring-boot:run
if ($LASTEXITCODE -ne 0) { throw 'Spring Boot stopped with an error. Check schema validation and dependency logs.' }
