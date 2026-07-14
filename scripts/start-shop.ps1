# Starts the PC PLUG server + tunnel. Run this, or double-click start-shop.bat.
$ErrorActionPreference = "Stop"

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    try {
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    } catch {
        Write-Host "Elevation was cancelled or failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "The shop was NOT started. Try again and click 'Yes' on the UAC prompt." -ForegroundColor Yellow
        Read-Host "Press Enter to close"
    }
    exit
}

try {
    Start-Service PCPlugServer
    Start-Service CloudflaredTunnel
    Write-Host "Shop is ON - vivapcplug.dpdns.org is live." -ForegroundColor Green
} catch {
    Write-Host "Failed to start: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Press Enter to close"
