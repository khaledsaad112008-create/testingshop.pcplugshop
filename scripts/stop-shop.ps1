# Stops the PC PLUG server + tunnel (e.g. before gaming). Run this, or double-click stop-shop.bat.
# The site goes fully offline for everyone until start-shop.ps1 is run again.
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Stop-Service CloudflaredTunnel -ErrorAction SilentlyContinue
Stop-Service PCPlugServer -ErrorAction SilentlyContinue
Write-Host "Shop is OFF." -ForegroundColor Yellow
Start-Sleep 4
