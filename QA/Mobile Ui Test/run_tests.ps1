# Run Dam Disaster Alert System Mobile UI Tests (Appium + Pytest)
# Usage: from inside Mobile UI Test directory, with python venv activated.

param(
    [string]$Marker = "",
    [int]$Workers = 1,
    [string]$TestFile = "",
    [string]$ReportPath = "reports/report.html"
)

# Build pytest argument list
$args_list = @("-v", "-ra")

if ($TestFile) {
    $args_list += "tests/$TestFile"
} elseif ($Marker) {
    $args_list += "-m"
    $args_list += $Marker
}

if ($Workers -gt 1) {
    $args_list += "-n"
    $args_list += $Workers.ToString()
}

$args_list += "--html=$ReportPath"
$args_list += "--self-contained-html"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Dam Disaster Alert System - Mobile Tests " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Executing: pytest $($args_list -join ' ')" -ForegroundColor Yellow
Write-Host ""

pytest @args_list

Write-Host ""
Write-Host "Test execution finished. HTML report saved to $ReportPath" -ForegroundColor Green
