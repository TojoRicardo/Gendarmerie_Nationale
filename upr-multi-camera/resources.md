# Ressources et Recommandations - Système Multi-Caméras UPR

## Spécifications Matérielles Recommandées

### Configuration Minimale

- **CPU**: 4 cœurs (Intel i5 ou équivalent AMD)
- **RAM**: 8 GB
- **Stockage**: 50 GB SSD
- **Réseau**: 100 Mbps
- **GPU**: Optionnel (CPU suffisant pour 1-2 caméras)

### Configuration Recommandée (Production)

- **CPU**: 8+ cœurs (Intel i7/i9 ou AMD Ryzen 7/9)
- **RAM**: 16-32 GB
- **Stockage**: 200+ GB SSD (pour stockage des détections)
- **Réseau**: 1 Gbps
- **GPU**: NVIDIA GPU avec CUDA (optionnel mais recommandé pour >3 caméras)

### Configuration Haute Performance

- **CPU**: 16+ cœurs
- **RAM**: 64 GB
- **Stockage**: 500+ GB NVMe SSD
- **Réseau**: 10 Gbps
- **GPU**: NVIDIA RTX 3060+ ou équivalent (recommandé pour >5 caméras)

## Consommation Ressources par Caméra

### CPU
- **720p @ 10 FPS**: ~15-20% par caméra
- **1080p @ 10 FPS**: ~25-30% par caméra
- **Avec GPU**: ~5-10% par caméra (CPU réduit)

### RAM
- **Par flux vidéo**: ~300-500 MB
- **InsightFace modèle**: ~1-2 GB (chargé une fois)
- **Base de données embeddings**: Variable selon taille

### Stockage
- **Frames de détection**: ~50-200 KB par frame
- **Estimation**: ~100-500 MB/jour par caméra (selon nombre de détections)

### Réseau
- **Flux RTSP 720p**: ~2-5 Mbps par caméra
- **Flux RTSP 1080p**: ~5-10 Mbps par caméra
- **Alertes API**: Négligeable (<1 Mbps total)

## Limites Recommandées

### Nombre de Caméras

| Configuration | USB Max | IP Max | Total Max |
|--------------|---------|--------|-----------|
| Minimale | 2 | 2 | 4 |
| Recommandée | 4 | 6 | 10 |
| Haute Performance | 6 | 10+ | 16+ |

### FPS par Caméra

- **Minimum**: 5 FPS (acceptable pour surveillance)
- **Recommandé**: 10 FPS (bon compromis performance/qualité)
- **Maximum**: 30 FPS (nécessite GPU pour plusieurs caméras)

## Optimisations Performance

### 1. Utilisation GPU

```bash
# Dans .env
USE_GPU=true
INSIGHTFACE_PROVIDER=CUDAExecutionProvider
```

**Gain**: 3-5x plus rapide pour la détection faciale

### 2. Réduction Résolution

```bash
# Dans multi_camera_service/main.py
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)  # Au lieu de 1280
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)  # Au lieu de 720
```

**Gain**: ~40% moins de CPU

### 3. Réduction FPS

```bash
# Dans .env
TARGET_FPS=5  # Au lieu de 10
```

**Gain**: ~50% moins de CPU

### 4. Batch Processing

Traiter plusieurs visages en une seule passe (à implémenter)

**Gain**: ~20-30% plus rapide pour multi-visages

## Monitoring

### Métriques à Surveiller

1. **CPU Usage**: <80% recommandé
2. **RAM Usage**: <90% recommandé
3. **FPS réel**: Vérifier que TARGET_FPS est atteint
4. **Latence détection**: <500ms recommandé
5. **Taux d'erreur**: <1% recommandé

### Commandes de Monitoring

```bash
# CPU et RAM
htop

# FPS par caméra (dans les logs)
grep "FPS" logs/multi_camera_service.log

# Détections par heure
grep "MATCH DÉTECTÉ" logs/multi_camera_service.log | wc -l

# Erreurs
grep "ERROR" logs/multi_camera_service.log
```

## Dépannage Performance

### Problème: CPU à 100%

**Solutions**:
1. Réduire TARGET_FPS
2. Réduire résolution vidéo
3. Utiliser GPU si disponible
4. Réduire nombre de caméras

### Problème: RAM insuffisante

**Solutions**:
1. Réduire nombre de caméras simultanées
2. Augmenter RAM système
3. Désactiver stockage frames (STORE_DETECTION_FRAMES=false)

### Problème: Latence élevée

**Solutions**:
1. Utiliser GPU
2. Réduire TOP_K_MATCHES
3. Optimiser requêtes base de données
4. Utiliser cache Redis pour embeddings

## Sécurité

### Recommandations

1. **HTTPS uniquement** en production
2. **API Key forte** (32+ caractères aléatoires)
3. **Rate limiting** activé
4. **Logs chiffrés** pour données sensibles
5. **Accès réseau restreint** aux caméras IP

### Chiffrement

- **Images stockées**: Chiffrer avec AES-256
- **Communications**: TLS 1.3 minimum
- **Base de données**: Connexions SSL

## Sauvegarde

### Données Critiques

1. **Base de données embeddings**: Sauvegarde quotidienne
2. **Logs de détection**: Conservation 90 jours minimum
3. **Frames de détection**: Conservation 30 jours (optionnel)

### Script de Sauvegarde

```bash
# Sauvegarder embeddings
pg_dump -t sgic_*embedding* > backup_embeddings.sql

# Sauvegarder logs
tar -czf backup_logs_$(date +%Y%m%d).tar.gz logs/
```

## Support

Pour toute question sur les ressources ou l'optimisation:
1. Consulter les logs
2. Vérifier les métriques système
3. Ajuster la configuration selon les recommandations ci-dessus

