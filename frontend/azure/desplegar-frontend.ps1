# =============================================================================
# desplegar-frontend.ps1 - Publica el frontend Angular en Azure App Service
#
# Uso (PowerShell en tu PC, desde la raiz del repositorio):
#   powershell -ExecutionPolicy Bypass -File frontend\azure\desplegar-frontend.ps1
#
# Requisitos: Node.js 20+, npm y Azure CLI (https://aka.ms/installazurecliwindows)
#
# Hace:
#   1. npm install + npm run build:azure  (crea frontend\deploy-azure.zip)
#   2. Busca tu Web App por su dominio y configura:
#        API_URL = http://18.222.83.229:5000   (backend en AWS)
#        Comando de inicio = node server/server.mjs
#   3. Sube el zip y prueba la URL publica.
# =============================================================================
param(
    [string]$AzureHost = "front-empleados-abe7enfzauaadqem.brazilsouth-01.azurewebsites.net",
    [string]$ApiUrl    = "http://18.222.83.229:5000",
    [switch]$SoloCompilar
)

$ErrorActionPreference = "Stop"
$Frontend = Split-Path -Parent $PSScriptRoot      # ...\empleado\frontend
$Zip      = Join-Path $Frontend "deploy-azure.zip"

function Paso($texto) { Write-Host ""; Write-Host "====== $texto ======" -ForegroundColor Cyan }
function Ejecutar([string]$comando, [string[]]$argumentos) {
    & $comando @argumentos
    if ($LASTEXITCODE -ne 0) { throw "Fallo: $comando $($argumentos -join ' ') (codigo $LASTEXITCODE)" }
}

# ---------------------------------------------------------------------------
Paso "1/5 Verificando herramientas"
foreach ($cmd in @("node", "npm")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "No se encontro '$cmd'. Instala Node.js 20 o superior." }
}
Write-Host "node $(node -v) | npm $(npm -v)"

# ---------------------------------------------------------------------------
Paso "2/5 Compilando Angular para Azure"
Push-Location $Frontend
try {
    Ejecutar "npm" @("install", "--no-audit", "--no-fund")
    Ejecutar "npm" @("run", "build:azure")
} finally { Pop-Location }
if (-not (Test-Path $Zip)) { throw "No se genero $Zip" }

if ($SoloCompilar) {
    Write-Host ""
    Write-Host "Listo: $Zip" -ForegroundColor Green
    Write-Host "Subelo en: https://$($AzureHost -replace '^([^.]+)\.', '$1.scm.')/ZipDeployUI (arrastra el zip)"
    exit 0
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "No se encontro Azure CLI ('az'). Instalalo o usa -SoloCompilar y publica con VS Code."
}

# ---------------------------------------------------------------------------
Paso "3/5 Iniciando sesion en Azure y localizando la Web App"
az account show --output none 2>$null
if ($LASTEXITCODE -ne 0) { Ejecutar "az" @("login", "--output", "none") }

$app = az webapp list --query "[?defaultHostName=='$AzureHost'] | [0].{name:name, rg:resourceGroup, linux:reserved}" --output json | ConvertFrom-Json
if (-not $app) {
    throw "No se encontro una Web App con dominio $AzureHost en tu suscripcion. Revisa 'az account set --subscription ...'"
}
Write-Host "Web App: $($app.name) | Grupo de recursos: $($app.rg) | Linux: $($app.linux)"
if (-not $app.linux) {
    Write-Warning "La Web App es Windows. Este despliegue esta pensado para Linux + Node. Recreala como Linux / Node 22 LTS."
}

# ---------------------------------------------------------------------------
Paso "4/5 Configurando la Web App"
Ejecutar "az" @("webapp", "config", "appsettings", "set", "--resource-group", $app.rg, "--name", $app.name,
    "--settings", "API_URL=$ApiUrl", "SCM_DO_BUILD_DURING_DEPLOYMENT=false", "--output", "none")
Ejecutar "az" @("webapp", "config", "set", "--resource-group", $app.rg, "--name", $app.name,
    "--startup-file", "node server/server.mjs", "--output", "none")
Write-Host "API_URL=$ApiUrl | Comando de inicio: node server/server.mjs"

# ---------------------------------------------------------------------------
Paso "5/5 Subiendo deploy-azure.zip"
Ejecutar "az" @("webapp", "deploy", "--resource-group", $app.rg, "--name", $app.name,
    "--src-path", $Zip, "--type", "zip", "--clean", "true", "--restart", "true", "--output", "none")

Write-Host ""
Write-Host "Probando https://$AzureHost/api/v1/auth ..."
$ok = $false
for ($i = 0; $i -lt 12; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "https://$AzureHost/api/v1/auth" -UseBasicParsing -TimeoutSec 20
        Write-Host $r.Content
        $ok = $true
        break
    } catch { Start-Sleep -Seconds 10 }
}
Write-Host ""
if ($ok) {
    Write-Host "Frontend publicado: https://$AzureHost" -ForegroundColor Green
} else {
    Write-Warning "La app aun no responde. Revisa: Portal de Azure > tu Web App > Secuencia de registro (Log stream)."
    Write-Warning "Y que el backend responda en $ApiUrl/api/v1/auth"
}
