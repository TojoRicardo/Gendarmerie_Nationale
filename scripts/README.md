# Scripts de Déploiement et Maintenance

Ce répertoire contient les scripts d'automatisation pour le déploiement et la maintenance du système Gendarmerie Nationale.

## Scripts Disponibles

### 1. `deploy.sh` - Script de Déploiement Automatique

Script principal pour automatiser l'installation et la configuration initiale du système.

**Usage** :
```bash
sudo ./scripts/deploy.sh
```

**Fonctionnalités** :
- Installation des dépendances système (Python, Node.js, PostgreSQL, Redis, Nginx)
- Création de l'utilisateur application
- Configuration de l'environnement Python
- Installation des dépendances Python et Node.js

**Note** : Ce script automatise les étapes de base. Les configurations spécifiques (base de données, services systemd, Nginx) doivent être faites manuellement selon le PLAN_DEPLOIEMENT.md.

### 2. `backup.sh` - Script de Sauvegarde

Script pour créer des sauvegardes automatiques de la base de données, des fichiers media, et de la configuration.

**Usage** :
```bash
sudo ./scripts/backup.sh
```

**Fonctionnalités** :
- Sauvegarde de la base de données PostgreSQL (format .sql.gz)
- Sauvegarde des fichiers media
- Sauvegarde des fichiers statiques
- Sauvegarde de la configuration
- Nettoyage automatique des sauvegardes anciennes (> 30 jours)

**Configuration automatique** :
Pour activer les sauvegardes quotidiennes à 2h du matin :
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/gn_app/scripts/backup.sh") | crontab -
```

### 3. `restore.sh` - Script de Restauration

Script pour restaurer le système depuis une sauvegarde.

**Usage** :
```bash
sudo ./scripts/restore.sh <date_backup>
```

**Exemple** :
```bash
sudo ./scripts/restore.sh 20240115_143022
```

**Fonctionnalités** :
- Restauration de la base de données
- Restauration des fichiers media
- Restauration des fichiers statiques
- Restauration de la configuration

**Important** : Le script demande confirmation avant de restaurer.

### 4. `check_services.sh` - Script de Vérification

Script pour vérifier l'état de tous les services et composants du système.

**Usage** :
```bash
sudo ./scripts/check_services.sh
```

**Vérifications effectuées** :
- État des services systemd (gn-backend, gn-celery-worker, gn-celery-beat, nginx, postgresql, redis)
- Ouverture des ports (8000, 5432, 6379, 80, 443)
- Connexion à PostgreSQL
- Connexion à Redis
- Espace disque disponible
- Utilisation de la mémoire
- Erreurs récentes dans les logs

## Permissions

Tous les scripts doivent être exécutables. Sur Linux, utilisez :
```bash
chmod +x scripts/*.sh
```

## Emplacement des Sauvegardes

Les sauvegardes sont stockées dans : `/opt/gn_app/backups/`

Structure :
```
backups/
├── db_20240115_143022.sql.gz          # Sauvegarde base de données
├── media_20240115_143022.tar.gz     # Sauvegarde fichiers media
├── static_20240115_143022.tar.gz     # Sauvegarde fichiers statiques
└── config_20240115_143022.tar.gz     # Sauvegarde configuration
```

## Logs

Les scripts génèrent des logs dans :
- `/opt/gn_app/logs/` pour les logs applicatifs
- `/var/log/` pour les logs système

## Dépannage

### Script ne s'exécute pas
```bash
# Vérifier les permissions
ls -l scripts/*.sh

# Rendre exécutable
chmod +x scripts/script_name.sh
```

### Erreur de permissions
```bash
# Vérifier que vous êtes root ou utilisez sudo
sudo ./scripts/script_name.sh
```

### Erreur de chemin
```bash
# Exécuter depuis le répertoire racine du projet
cd /opt/gn_app
./scripts/script_name.sh
```

## Maintenance Régulière

### Sauvegardes Quotidiennes
Les sauvegardes sont configurées pour s'exécuter automatiquement chaque jour à 2h du matin.

### Vérification Hebdomadaire
Exécutez `check_services.sh` chaque semaine pour vérifier l'état du système :
```bash
sudo ./scripts/check_services.sh
```

### Nettoyage des Logs
Les logs sont automatiquement nettoyés par logrotate (configuré dans `/etc/logrotate.d/gn_app`).

## Support

Pour toute question ou problème, consultez :
- `PLAN_DEPLOIEMENT.md` pour les instructions détaillées
- Les logs dans `/opt/gn_app/logs/`
- Les logs système : `sudo journalctl -u gn-backend`

