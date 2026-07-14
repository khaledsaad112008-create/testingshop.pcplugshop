# Stops the PC PLUG server + tunnel (e.g. before gaming). Run this, or double-click stop-shop.bat.
# The site goes fully offline for everyone until start-shop.ps1 is run again.
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    try {
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    } catch {
        Write-Host "Elevation was cancelled or failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "The shop was NOT stopped. Try again and click 'Yes' on the UAC prompt." -ForegroundColor Yellow
        Read-Host "Press Enter to close"
    }
    exit
}

try {
    Stop-Service CloudflaredTunnel -ErrorAction SilentlyContinue
    Stop-Service PCPlugServer -ErrorAction SilentlyContinue
    Write-Host "Shop is OFF." -ForegroundColor Yellow
} catch {
    Write-Host "Failed to stop: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Press Enter to close"
