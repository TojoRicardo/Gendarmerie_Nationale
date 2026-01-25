#!/bin/bash

###############################################################################
# Script de Déploiement Automatique
# Système Gendarmerie Nationale
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de configuration
APP_USER="gn_app"
APP_DIR="/opt/gn_app"
BACKEND_DIR="$APP_DIR/backend_gn"
FRONTEND_DIR="$APP_DIR/frontend_gn"
VENV_DIR="$BACKEND_DIR/venv"

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que le script est exécuté en tant que root
if [ "$EUID" -ne 0 ]; then 
    log_error "Veuillez exécuter ce script en tant que root (sudo)"
    exit 1
fi

log_info "Début du déploiement du système Gendarmerie Nationale"

# Phase 1: Préparation de l'environnement
log_info "Phase 1: Préparation de l'environnement"
apt update && apt upgrade -y
apt install -y build-essential git curl wget vim htop ufw fail2ban

# Phase 2: Installation des dépendances système
log_info "Phase 2: Installation des dépendances système"

# Python
if ! command -v python3 &> /dev/null; then
    log_info "Installation de Python 3.10"
    apt install -y python3.10 python3.10-venv python3.10-dev python3-pip
fi

# Node.js
if ! command -v node &> /dev/null; then
    log_info "Installation de Node.js"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    log_info "Installation de PostgreSQL"
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Redis
if ! systemctl is-active --quiet redis; then
    log_info "Installation de Redis"
    apt install -y redis-server
    sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
    systemctl restart redis
    systemctl enable redis
fi

# Nginx
if ! systemctl is-active --quiet nginx; then
    log_info "Installation de Nginx"
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Phase 3: Création de l'utilisateur application
log_info "Phase 3: Création de l'utilisateur application"
if ! id "$APP_USER" &>/dev/null; then
    adduser --system --group --home "$APP_DIR" "$APP_USER"
    mkdir -p "$APP_DIR"/{backend,frontend,logs,media,staticfiles,backups,scripts}
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

# Phase 4: Configuration de l'environnement Python
log_info "Phase 4: Configuration de l'environnement Python"
if [ ! -d "$VENV_DIR" ]; then
    log_info "Création de l'environnement virtuel Python"
    sudo -u "$APP_USER" python3 -m venv "$VENV_DIR"
fi

# Phase 5: Installation des dépendances Python
log_info "Phase 5: Installation des dépendances Python"
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    sudo -u "$APP_USER" "$VENV_DIR/bin/pip" install --upgrade pip setuptools wheel
    sudo -u "$APP_USER" "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
else
    log_warn "Fichier requirements.txt non trouvé. Assurez-vous que le code est présent."
fi

# Phase 6: Installation des dépendances Node.js
log_info "Phase 6: Installation des dépendances Node.js"
if [ -f "$FRONTEND_DIR/package.json" ]; then
    cd "$FRONTEND_DIR"
    sudo -u "$APP_USER" npm install
else
    log_warn "Fichier package.json non trouvé. Assurez-vous que le code est présent."
fi

# Phase 7: Configuration de la base de données
log_info "Phase 7: Configuration de la base de données"
log_warn "Veuillez configurer manuellement la base de données PostgreSQL"
log_warn "Voir la section Phase 3 du PLAN_DEPLOIEMENT.md"

# Phase 8: Configuration des services systemd
log_info "Phase 8: Configuration des services systemd"
log_warn "Veuillez configurer manuellement les services systemd"
log_warn "Voir les sections Phase 4 et Phase 7 du PLAN_DEPLOIEMENT.md"

log_info "Déploiement terminé!"
log_warn "Étapes restantes à effectuer manuellement:"
echo "  1. Configuration de la base de données PostgreSQL"
echo "  2. Création du fichier .env pour le backend"
echo "  3. Exécution des migrations Django"
echo "  4. Configuration des services systemd (Gunicorn, Celery)"
echo "  5. Configuration de Nginx"
echo "  6. Configuration SSL/TLS"
echo ""
log_info "Consultez PLAN_DEPLOIEMENT.md pour les détails complets"

