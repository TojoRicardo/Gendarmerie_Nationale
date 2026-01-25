# Système Multi-Caméras avec Reconnaissance Faciale Temps Réel - Module UPR

## Vue d'ensemble

Ce module permet la détection automatique de visages sur plusieurs caméras (USB et IP/RTSP) en temps réel, avec comparaison contre la base de données UPR (Unidentified Person Registry) et alertes en cas de correspondance.

## Architecture

```
┌─────────────────┐
│  Caméras USB/IP │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ multi_camera_service     │
│ - InsightFace Detection  │
│ - Embedding Calculation  │
│ - UPR Comparison        │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Django Backend API      │
│ - Alert Detection       │
│ - Camera Management     │
│ - WebSocket/SSE         │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────┐
│ React Frontend          │
│ - Multi-Camera Dashboard│
│ - Real-time Alerts      │
│ - Match Confirmation    │
└─────────────────────────┘
```

## Prérequis

### Système
- Ubuntu 22.04 LTS (recommandé)
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose (pour déploiement conteneurisé)

### Dépendances système
```bash
sudo apt update
sudo apt install -y \
    python3.10 python3.10-venv python3-pip \
    libopencv-dev python3-opencv \
    ffmpeg libavcodec-dev libavformat-dev libavutil-dev \
    libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
    v4l-utils \
    build-essential cmake
```

## Installation

### 1. Configuration de l'environnement

Copiez `.env.example` vers `.env` et configurez :

```bash
cp .env.example .env
```

Variables essentielles :
- `CAMERAS_USB_MAX=6` : Nombre maximum de caméras USB à scanner
- `CAMERAS_IPS="rtsp://192.168.1.100:554/stream,http://192.168.1.101:8080/video"` : Liste des caméras IP (CSV)
- `UPR_API_URL=http://localhost:8000/api` : URL du backend Django
- `UPR_API_KEY=your-secret-key` : Clé API pour authentification
- `SIMILARITY_THRESHOLD=0.55` : Seuil de correspondance (0.0-1.0)
- `WARN_THRESHOLD=0.45` : Seuil d'alerte probable
- `USE_GPU=false` : Utiliser GPU si disponible (true/false)
- `RETRY_BACKOFF=5` : Délai de reconnexion (secondes)

### 2. Installation des dépendances Python

```bash
cd upr-multi-camera
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuration Django

```bash
cd backend_gn
python manage.py migrate
python manage.py collectstatic
```

### 4. Démarrage en développement

#### Option A : Docker Compose (recommandé)

```bash
docker-compose up --build
```

#### Option B : Manuel

Terminal 1 - Backend Django :
```bash
cd backend_gn
python manage.py runserver 0.0.0.0:8000
```

Terminal 2 - Multi-Camera Service :
```bash
cd upr-multi-camera
source venv/bin/activate
python multi_camera_service/main.py
```

Terminal 3 - Frontend :
```bash
cd frontend_gn
npm install
npm run dev
```

## Utilisation

### Scanner les caméras disponibles

```bash
curl -X POST http://localhost:8000/api/cameras/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Démarrer la surveillance

Le service multi-caméras démarre automatiquement au lancement. Il :
1. Scanne les caméras USB (index 0 à CAMERAS_USB_MAX-1)
2. Se connecte aux caméras IP configurées
3. Détecte les visages en temps réel
4. Compare avec la base UPR
5. Envoie des alertes en cas de correspondance

### Interface Web

Accédez à `http://localhost:3002/cameras` pour :
- Voir les flux vidéo en direct
- Gérer les caméras (start/stop)
- Recevoir les alertes en temps réel
- Confirmer/rejeter les correspondances

## Configuration avancée

### Ajouter une caméra IP

1. Ajoutez l'URL dans `.env` :
   ```
   CAMERAS_IPS="rtsp://user:pass@192.168.1.100:554/stream,http://192.168.1.101:8080/video"
   ```

2. Redémarrez le service :
   ```bash
   docker-compose restart multi_camera_service
   ```

### Ajuster les seuils de détection

Dans `.env` :
- `SIMILARITY_THRESHOLD=0.55` : Correspondance certaine (alerte immédiate)
- `WARN_THRESHOLD=0.45` : Correspondance probable (notification discrète)

### Performance

- **CPU** : ~15-20% par flux vidéo (720p)
- **RAM** : ~500MB par flux
- **GPU** : Optionnel mais recommandé pour >2 caméras simultanées

Limites recommandées :
- 4-6 caméras USB simultanées
- 8-10 caméras IP (selon bande passante)

## Tests

### Tests unitaires

```bash
cd upr-multi-camera
pytest tests/unit/ -v
```

### Tests d'intégration

```bash
pytest tests/integration/ -v
```

### Simuler un flux RTSP

```bash
./scripts/simulate_rtsp.sh
```

## Déploiement Production

### Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Systemd

```bash
sudo cp systemd/multi-camera.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable multi-camera.service
sudo systemctl start multi-camera.service
```

Vérifier le statut :
```bash
sudo systemctl status multi-camera.service
sudo journalctl -u multi-camera.service -f
```

## Monitoring

### Health Check

```bash
curl http://localhost:8000/api/health/cameras
```

Réponse :
```json
{
  "status": "healthy",
  "active_streams": 3,
  "total_cameras": 5,
  "last_detection": "2025-12-08T10:30:00Z"
}
```

### Logs

Logs du service :
```bash
tail -f logs/multi_camera_service.log
```

Logs Django :
```bash
tail -f backend_gn/logs/django.log
```

## Sécurité

- ✅ Communication HTTPS uniquement en production
- ✅ Images stockées avec signed URLs (TTL court)
- ✅ Rate limiting sur endpoints d'alerte
- ✅ Validation des permissions utilisateur
- ✅ Journalisation de toutes les actions

## Dépannage

### Caméra USB non détectée

```bash
# Vérifier les périphériques
v4l2-ctl --list-devices

# Tester manuellement
ffplay /dev/video0
```

### Flux RTSP ne se connecte pas

```bash
# Tester la connexion
ffplay rtsp://user:pass@192.168.1.100:554/stream
```

### Erreur InsightFace

Vérifiez que le modèle est téléchargé :
```bash
python -c "import insightface; app = insightface.app.FaceAnalysis(); app.prepare(ctx_id=-1)"
```

## Support

Pour toute question ou problème :
1. Consultez les logs
2. Vérifiez la configuration `.env`
3. Testez avec `simulate_rtsp.sh`
4. Ouvrez une issue avec les détails

## Licence

Propriété de la Gendarmerie Nationale - Usage interne uniquement

