#!/bin/bash

###############################################################################
# Script de Sauvegarde Automatique
# Système Gendarmerie Nationale
###############################################################################

set -e

# Configuration
BACKUP_DIR="/opt/gn_app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p "$BACKUP_DIR"

echo "Début de la sauvegarde - $(date)"

# Sauvegarde de la base de données PostgreSQL
echo "Sauvegarde de la base de données..."
sudo -u postgres pg_dump Gendarmerie_Nationale_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
echo "✓ Base de données sauvegardée: db_$DATE.sql.gz"

# Sauvegarde des fichiers media
echo "Sauvegarde des fichiers media..."
if [ -d "/opt/gn_app/backend_gn/media" ]; then
    tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" -C /opt/gn_app/backend_gn media/
    echo "✓ Fichiers media sauvegardés: media_$DATE.tar.gz"
fi

# Sauvegarde des fichiers statiques (optionnel)
echo "Sauvegarde des fichiers statiques..."
if [ -d "/opt/gn_app/backend_gn/staticfiles" ]; then
    tar -czf "$BACKUP_DIR/static_$DATE.tar.gz" -C /opt/gn_app/backend_gn staticfiles/
    echo "✓ Fichiers statiques sauvegardés: static_$DATE.tar.gz"
fi

# Sauvegarde des fichiers de configuration
echo "Sauvegarde des fichiers de configuration..."
CONFIG_BACKUP="$BACKUP_DIR/config_$DATE.tar.gz"
tar -czf "$CONFIG_BACKUP" \
    /opt/gn_app/backend_gn/.env \
    /opt/gn_app/frontend_gn/.env.production \
    /etc/nginx/sites-available/gn_app \
    /etc/systemd/system/gn-*.service 2>/dev/null || true
echo "✓ Configuration sauvegardée: config_$DATE.tar.gz"

# Nettoyage des anciennes sauvegardes
echo "Nettoyage des sauvegardes de plus de $RETENTION_DAYS jours..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
echo "✓ Nettoyage terminé"

# Afficher l'espace utilisé
echo ""
echo "Espace utilisé par les sauvegardes:"
du -sh "$BACKUP_DIR"

echo ""
echo "Sauvegarde terminée avec succès - $(date)"

