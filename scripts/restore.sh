#!/bin/bash

###############################################################################
# Script de Restauration
# Système Gendarmerie Nationale
###############################################################################

set -e

BACKUP_DIR="/opt/gn_app/backups"

if [ -z "$1" ]; then
    echo "Usage: $0 <date_backup>"
    echo "Exemple: $0 20240115_143022"
    echo ""
    echo "Sauvegardes disponibles:"
    ls -lh "$BACKUP_DIR" | grep -E "db_|media_|static_|config_" | awk '{print $9}' | sed 's/.*_\([0-9]\{8\}_[0-9]\{6\}\)\..*/\1/' | sort -u
    exit 1
fi

BACKUP_DATE=$1

echo "Restauration depuis la sauvegarde du $BACKUP_DATE"
read -p "Êtes-vous sûr de vouloir continuer? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restauration annulée"
    exit 0
fi

# Restauration de la base de données
if [ -f "$BACKUP_DIR/db_$BACKUP_DATE.sql.gz" ]; then
    echo "Restauration de la base de données..."
    gunzip -c "$BACKUP_DIR/db_$BACKUP_DATE.sql.gz" | sudo -u postgres psql Gendarmerie_Nationale_db
    echo "✓ Base de données restaurée"
else
    echo "✗ Fichier de sauvegarde de la base de données non trouvé"
fi

# Restauration des fichiers media
if [ -f "$BACKUP_DIR/media_$BACKUP_DATE.tar.gz" ]; then
    echo "Restauration des fichiers media..."
    tar -xzf "$BACKUP_DIR/media_$BACKUP_DATE.tar.gz" -C /opt/gn_app/backend_gn/
    chown -R gn_app:gn_app /opt/gn_app/backend_gn/media
    echo "✓ Fichiers media restaurés"
else
    echo "✗ Fichier de sauvegarde des media non trouvé"
fi

# Restauration des fichiers statiques
if [ -f "$BACKUP_DIR/static_$BACKUP_DATE.tar.gz" ]; then
    echo "Restauration des fichiers statiques..."
    tar -xzf "$BACKUP_DIR/static_$BACKUP_DATE.tar.gz" -C /opt/gn_app/backend_gn/
    chown -R gn_app:gn_app /opt/gn_app/backend_gn/staticfiles
    echo "✓ Fichiers statiques restaurés"
else
    echo "✗ Fichier de sauvegarde des statiques non trouvé"
fi

# Restauration de la configuration
if [ -f "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" ]; then
    echo "Restauration de la configuration..."
    tar -xzf "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" -C /
    echo "✓ Configuration restaurée"
    echo "⚠️  Redémarrez les services après la restauration de la configuration"
else
    echo "✗ Fichier de sauvegarde de la configuration non trouvé"
fi

echo ""
echo "Restauration terminée"
echo "Pensez à redémarrer les services:"
echo "  sudo systemctl restart gn-backend"
echo "  sudo systemctl restart gn-celery-worker"
echo "  sudo systemctl restart gn-celery-beat"
echo "  sudo systemctl restart nginx"

