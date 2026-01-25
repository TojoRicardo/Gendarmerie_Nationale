# Script de démarrage pour Windows PowerShell
# Système Multi-Caméras UPR

Write-Host "🚀 Démarrage du service multi-caméras UPR" -ForegroundColor Green
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📁 Répertoire: $(Get-Location)" -ForegroundColor Cyan

# Vérifier que le fichier main.py existe
if (-not (Test-Path "multi_camera_service\main.py")) {
    Write-Host "❌ Erreur: multi_camera_service\main.py non trouvé!" -ForegroundColor Red
    Write-Host "💡 Assurez-vous d'être dans le dossier upr-multi-camera" -ForegroundColor Yellow
    exit 1
}

# Vérifier l'environnement virtuel
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "⚠️  Environnement virtuel non trouvé" -ForegroundColor Yellow
    Write-Host "📦 Création de l'environnement virtuel..." -ForegroundColor Cyan
    
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la création de l'environnement virtuel" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Environnement virtuel créé" -ForegroundColor Green
}

# Activer l'environnement virtuel
Write-Host "🔧 Activation de l'environnement virtuel..." -ForegroundColor Cyan
& "venv\Scripts\Activate.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erreur d'activation. Tentative avec Set-ExecutionPolicy..." -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    & "venv\Scripts\Activate.ps1"
}

# Vérifier les dépendances
Write-Host "📚 Vérification des dépendances..." -ForegroundColor Cyan
$missing = @()

$modules = @("insightface", "cv2", "numpy", "requests")
foreach ($module in $modules) {
    $moduleName = if ($module -eq "cv2") { "opencv-python-headless" } else { $module }
    try {
        python -c "import $module" 2>$null
        if ($LASTEXITCODE -ne 0) {
            $missing += $moduleName
        } else {
            Write-Host "  ✅ $module" -ForegroundColor Green
        }
    } catch {
        $missing += $moduleName
    }
}

if ($missing.Count -gt 0) {
    Write-Host "⚠️  Dépendances manquantes: $($missing -join ', ')" -ForegroundColor Yellow
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
    pip install -r requirements.txt
}

# Vérifier le fichier .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Fichier .env non trouvé" -ForegroundColor Yellow
    if (Test-Path "env.example") {
        Write-Host "📋 Copie de env.example vers .env..." -ForegroundColor Cyan
        Copy-Item env.example .env
        Write-Host "✅ Fichier .env créé. Veuillez le configurer!" -ForegroundColor Yellow
        Write-Host "💡 Éditez .env et configurez au minimum UPR_API_KEY" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Appuyez sur Entrée pour continuer (ou Ctrl+C pour annuler)..."
        Read-Host
    } else {
        Write-Host "❌ env.example non trouvé!" -ForegroundColor Red
        exit 1
    }
}

# Vérifier que UPR_API_KEY est configuré
$envContent = Get-Content .env -Raw
if ($envContent -notmatch "UPR_API_KEY\s*=" -or $envContent -match "UPR_API_KEY\s*=\s*(change-me|your-api-key)") {
    Write-Host "⚠️  UPR_API_KEY n'est pas configuré dans .env" -ForegroundColor Yellow
    Write-Host "💡 Générer une clé: python -c \"import secrets; print(secrets.token_urlsafe(32))\"" -ForegroundColor Cyan
}

# Créer le dossier logs s'il n'existe pas
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "✅ Dossier logs créé" -ForegroundColor Green
}

# Démarrer le service
Write-Host ""
Write-Host "▶️  Démarrage du service multi-caméras..." -ForegroundColor Green
Write-Host ""

python multi_camera_service\main.py

# Si le script se termine
Write-Host ""
Write-Host "⏹️  Service arrêté" -ForegroundColor Yellow

