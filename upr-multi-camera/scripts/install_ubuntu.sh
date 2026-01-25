#!/bin/bash

# Script d'installation pour Ubuntu 22.04 LTS
# Installe toutes les dépendances nécessaires pour le système multi-caméras

set -e

echo "🚀 Installation des dépendances pour Ubuntu 22.04..."

# Mise à jour
sudo apt update
sudo apt upgrade -y

# Dépendances système de base
echo "📦 Installation des dépendances système..."
sudo apt install -y \
    python3.10 \
    python3.10-venv \
    python3-pip \
    python3-dev \
    build-essential \
    cmake \
    git \
    curl \
    wget

# OpenCV et dépendances
echo "📹 Installation d'OpenCV..."
sudo apt install -y \
    libopencv-dev \
    python3-opencv \
    libopencv-contrib-dev \
    libopencv-python

# FFmpeg pour flux RTSP
echo "🎥 Installation de FFmpeg..."
sudo apt install -y \
    ffmpeg \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev

# Bibliothèques graphiques
echo "🖼️  Installation des bibliothèques graphiques..."
sudo apt install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1

# Outils pour caméras USB
echo "📷 Installation des outils caméras..."
sudo apt install -y \
    v4l-utils \
    uvcdynctrl

# Vérifier les caméras USB
echo "🔍 Vérification des caméras USB..."
v4l2-ctl --list-devices || echo "⚠️  Aucune caméra USB détectée (normal si pas de caméra connectée)"

# Créer l'environnement virtuel Python
echo "🐍 Création de l'environnement virtuel..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

# Installer les dépendances Python
echo "📚 Installation des dépendances Python..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Installation terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Copier env.example vers .env et configurer"
echo "  2. Activer l'environnement: source venv/bin/activate"
echo "  3. Tester: python multi_camera_service/main.py"
echo ""

