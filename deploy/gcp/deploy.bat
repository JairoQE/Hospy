@echo off
REM Evita el bloqueo de PowerShell "no esta firmado digitalmente"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
if errorlevel 1 pause
