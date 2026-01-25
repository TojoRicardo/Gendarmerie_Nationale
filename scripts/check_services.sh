#!/bin/bash

###############################################################################
# Script de Vérification des Services
# Système Gendarmerie Nationale
###############################################################################

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓${NC} $service est actif"
        return 0
    else
        echo -e "${RED}✗${NC} $service n'est pas actif"
        return 1
    fi
}

check_port() {
    local port=$1
    local service=$2
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port ($service) est ouvert"
        return 0
    else
        echo -e "${RED}✗${NC} Port $port ($service) n'est pas ouvert"
        return 1
    fi
}

echo "=========================================="
echo "Vérification des Services"
echo "=========================================="
echo ""

# Vérification des services systemd
echo "Services Systemd:"
check_service "gn-backend"
check_service "gn-celery-worker"
check_service "gn-celery-beat"
check_service "nginx"
check_service "postgresql"
check_service "redis"
echo ""

# Vérification des ports
echo "Ports:"
check_port 8000 "Django/Gunicorn"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"
check_port 80 "Nginx HTTP"
check_port 443 "Nginx HTTPS"
echo ""

# Vérification de la base de données
echo "Base de données:"
if sudo -u postgres psql -d Gendarmerie_Nationale_db -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Connexion à PostgreSQL réussie"
else
    echo -e "${RED}✗${NC} Connexion à PostgreSQL échouée"
fi
echo ""

# Vérification de Redis
echo "Redis:"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Connexion à Redis réussie"
else
    echo -e "${RED}✗${NC} Connexion à Redis échouée"
fi
echo ""

# Vérification de l'espace disque
echo "Espace disque:"
df -h /opt/gn_app | tail -1 | awk '{print "Utilisation: " $5 " (" $3 " / " $2 ")"}'
echo ""

# Vérification de la mémoire
echo "Mémoire:"
free -h | grep Mem | awk '{print "Utilisation: " $3 " / " $2 " (" int($3/$2*100) "%)"}'
echo ""

# Vérification des logs récents
echo "Erreurs récentes dans les logs (dernières 5 lignes):"
if [ -f "/opt/gn_app/logs/django.log" ]; then
    echo "Django:"
    tail -5 /opt/gn_app/logs/django.log | grep -i error || echo "  Aucune erreur récente"
fi
echo ""

echo "=========================================="
echo "Vérification terminée"
echo "=========================================="

