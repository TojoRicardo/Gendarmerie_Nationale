#!/bin/bash

# Script pour simuler un flux RTSP local avec ffmpeg
# Utile pour tester le système sans caméra IP réelle

set -e

RTSP_PORT=${RTSP_PORT:-8554}
RTSP_PATH=${RTSP_PATH:-/test}
VIDEO_FILE=${VIDEO_FILE:-test_video.mp4}

# Vérifier que ffmpeg est installé
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg n'est pas installé"
    echo "Installation: sudo apt install ffmpeg"
    exit 1
fi

# Créer une vidéo de test si elle n'existe pas
if [ ! -f "$VIDEO_FILE" ]; then
    echo "📹 Création d'une vidéo de test..."
    ffmpeg -f lavfi -i testsrc=duration=60:size=640x480:rate=30 \
           -f lavfi -i sine=frequency=1000:duration=60 \
           -c:v libx264 -preset ultrafast -tune zerolatency \
           -c:a aac "$VIDEO_FILE" -y
fi

echo "🎥 Démarrage du serveur RTSP simulé..."
echo "   URL: rtsp://localhost:${RTSP_PORT}${RTSP_PATH}"
echo ""
echo "   Pour tester:"
echo "   ffplay rtsp://localhost:${RTSP_PORT}${RTSP_PATH}"
echo ""
echo "   Pour arrêter: Ctrl+C"
echo ""

# Lancer le serveur RTSP
ffmpeg -re -stream_loop -1 -i "$VIDEO_FILE" \
       -c copy \
       -f rtsp \
       rtsp://localhost:${RTSP_PORT}${RTSP_PATH}

