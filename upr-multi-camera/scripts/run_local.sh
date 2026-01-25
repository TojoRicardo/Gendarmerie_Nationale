#!/bin/bash

# Script pour lancer le système en développement local

set -e

echo "🚀 Démarrage du système multi-caméras en développement..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé, copie depuis env.example..."
    cp env.example .env
    echo "📝 Veuillez configurer le fichier .env avant de continuer"
    exit 1
fi

# Construire les images
echo "🔨 Construction des images Docker..."
docker-compose build

# Démarrer les services
echo "▶️  Démarrage des services..."
docker-compose up -d db redis

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
sleep 5

# Appliquer les migrations Django
echo "📦 Application des migrations..."
docker-compose run --rm backend python manage.py migrate

# Collecter les fichiers statiques
echo "📁 Collecte des fichiers statiques..."
docker-compose run --rm backend python manage.py collectstatic --noinput

# Démarrer tous les services
echo "🚀 Démarrage de tous les services..."
docker-compose up -d

echo ""
echo "✅ Système démarré!"
echo ""
echo "📊 Services disponibles:"
echo "  - Backend API: http://localhost:8000/api"
echo "  - Frontend: http://localhost:3002"
echo "  - Health Check: http://localhost:8000/api/health/cameras/"
echo ""
echo "📝 Logs:"
echo "  docker-compose logs -f"
echo ""
echo "🛑 Arrêt:"
echo "  docker-compose down"

