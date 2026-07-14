@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-shop.ps1"
if errorlevel 1 (
  echo.
  echo Something went wrong launching the script.
  pause
)
