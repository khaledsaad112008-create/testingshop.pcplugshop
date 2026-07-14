# Starts the PC PLUG server + tunnel. Run this, or double-click start-shop.bat.
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Start-Service PCPlugServer
Start-Service CloudflaredTunnel
Write-Host "Shop is ON — vivapcplug.dpdns.org is live." -ForegroundColor Green
Start-Sleep 4
