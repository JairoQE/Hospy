# Ejecuta el seed contra la base de datos de producción (Render + Supabase).
# Render Free no tiene Shell; este script corre manage.py desde tu PC.
#
# Uso:
#   1. copy .env.production.local.example .env.production.local
#   2. Rellena .env.production.local con valores de Render → Environment
#   3. .\scripts\seed-produccion.ps1
#   4. .\scripts\seed-produccion.ps1 -Clear   # borrar seed anterior y regenerar

param(
    [switch]$Clear
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env.production.local"

if (-not (Test-Path $EnvFile)) {
    Write-Host "Falta $EnvFile" -ForegroundColor Red
    Write-Host "Copia .env.production.local.example y pega las variables de Render."
    exit 1
}

Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $name = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    Set-Item -Path "env:$name" -Value $value
}

$Python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    Write-Host "No se encontró .venv. Activa el entorno virtual o crea uno." -ForegroundColor Red
    exit 1
}

Push-Location $Root
try {
    $args = @("manage.py", "seed_bulk_stats")
    if ($Clear) { $args += "--clear" }
    Write-Host "Conectando a producción ($env:POSTGRES_HOST)..." -ForegroundColor Cyan
    & $Python @args
} finally {
    Pop-Location
}
