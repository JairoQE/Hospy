# Despliega Hospy API en Google Cloud Run (prueba / demo).
# Requisitos: Google Cloud SDK (gcloud), Docker opcional si usas --source.
#
# Uso:
#   1. Copia .env.gcp.example → .env.gcp y completa secretos
#   2. cd deploy/gcp
#   3. .\deploy.ps1

$ErrorActionPreference = "Continue"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$EnvFile = Join-Path $Root ".env.gcp"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "Instala Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Write-Host "Crea $EnvFile copiando .env.gcp.example" -ForegroundColor Red
    exit 1
}

function Read-EnvFile($path) {
    $vars = @{}
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $i = $line.IndexOf("=")
        if ($i -lt 1) { return }
        $key = $line.Substring(0, $i).Trim()
        $val = $line.Substring($i + 1).Trim()
        $vars[$key] = $val
    }
    return $vars
}

$env = Read-EnvFile $EnvFile
$Project = $env["GCP_PROJECT_ID"]
$Region = if ($env["GCP_REGION"]) { $env["GCP_REGION"] } else { "southamerica-east1" }
$Service = if ($env["GCP_SERVICE_NAME"]) { $env["GCP_SERVICE_NAME"] } else { "hospy-api" }

if (-not $Project) {
    Write-Host "Define GCP_PROJECT_ID en .env.gcp" -ForegroundColor Red
    exit 1
}

Write-Host "Proyecto: $Project | Region: $Region | Servicio: $Service" -ForegroundColor Cyan

gcloud config set project $Project

Write-Host "Habilitando APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "No se pudieron habilitar las APIs. Revisa facturacion del proyecto." -ForegroundColor Red
    exit 1
}

$Repo = "hospy"
Write-Host "Repositorio Artifact Registry..." -ForegroundColor Yellow
cmd /c "gcloud artifacts repositories describe $Repo --location=$Region >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creando repositorio $Repo en $Region..." -ForegroundColor Yellow
    gcloud artifacts repositories create $Repo `
        --repository-format=docker `
        --location=$Region `
        --description="Hospy Docker images"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "No se pudo crear el repositorio Docker." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Repositorio $Repo ya existe." -ForegroundColor DarkGray
}

# Variables de entorno (sin GCP_* locales)
$skipKeys = @("GCP_PROJECT_ID", "GCP_REGION", "GCP_SERVICE_NAME")
$yamlLines = @()
foreach ($key in ($env.Keys | Sort-Object)) {
    if ($skipKeys -contains $key) { continue }
    $val = $env[$key]
    if (-not $val) { continue }
    $escaped = $val -replace '\\', '\\\\' -replace '"', '\"'
    # Cloud Run exige strings; sin comillas YAML convierte true/false en booleanos
    $yamlLines += "${key}: `"$escaped`""
}
$envYaml = Join-Path $env:TEMP "hospy-cloud-run-env.yaml"
$yamlLines | Set-Content -Path $envYaml -Encoding UTF8

Write-Host "Desplegando desde codigo (Cloud Build + Run)..." -ForegroundColor Yellow
Push-Location $Root
try {
    gcloud run deploy $Service `
        --source . `
        --region $Region `
        --platform managed `
        --allow-unauthenticated `
        --port 8080 `
        --min-instances 0 `
        --max-instances 3 `
        --memory 1Gi `
        --cpu 1 `
        --cpu-boost `
        --timeout 300 `
        --concurrency 40 `
        --quiet `
        --env-vars-file $envYaml
}
finally {
    Pop-Location
    Remove-Item $envYaml -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy fallo. Revisa logs en Cloud Console." -ForegroundColor Red
    exit 1
}

$url = gcloud run services describe $Service --region $Region --format="value(status.url)"
Write-Host ""
Write-Host "API desplegada:" -ForegroundColor Green
Write-Host "  $url"
Write-Host "  Health: $url/health/"
Write-Host "  API:    $url/api/v1/"
Write-Host ""
Write-Host "Frontend: VITE_API_URL=$url/api/v1" -ForegroundColor Cyan
Write-Host "Anade la URL del frontend en CORS_ALLOWED_ORIGINS y CSRF_TRUSTED_ORIGINS en .env.gcp y vuelve a ejecutar este script." -ForegroundColor Yellow
