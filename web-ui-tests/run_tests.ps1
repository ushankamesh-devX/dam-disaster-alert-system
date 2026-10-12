# Run Dam Disaster Alert System Selenium UI Tests
# Usage: from inside web-ui-tests directory, activate venv first.

param(
    [string]$Marker = "",
    [int]$Workers = 1,
    [string]$TestFile = "",
    [switch]$Headless
)

# Set environment
if ($Headless) { $env:HEADLESS = "1" } else { $env:HEADLESS = "0" }

# Build pytest command
$args_list = @("-v", "-rs")

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

Write-Host "Running: pytest $($args_list -join ' ')" -ForegroundColor Cyan
pytest @args_list
