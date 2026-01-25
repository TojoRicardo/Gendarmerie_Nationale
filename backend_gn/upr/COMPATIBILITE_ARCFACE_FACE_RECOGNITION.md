# Compatibilité ArcFace et face_recognition

## 📊 Vue d'ensemble

Le système UPR utilise **deux systèmes de reconnaissance faciale complémentaires** :

| Système | Dimensions | Bibliothèque | Usage Principal |
|---------|-----------|--------------|-----------------|
| **ArcFace** | 512D | InsightFace (buffalo_l) | Reconnaissance haute précision, analyse approfondie |
| **face_recognition** | 128D | face_recognition (dlib) | Scan rapide depuis caméra USB, reconnaissance rapide |

## 🔄 Coexistence des deux systèmes

### Modèle UnidentifiedPerson

Le modèle stocke **les deux types d'encodings** :

```python
class UnidentifiedPerson(models.Model):
    # ArcFace (512D) - Haute précision
    face_embedding = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Embedding ArcFace 512D",
        help_text="Vecteur d'embedding ArcFace de 512 dimensions"
    )
    
    # face_recognition (128D) - Rapide
    face_encoding = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Encoding face_recognition 128D",
        help_text="Vecteur d'encoding face_recognition de 128 dimensions"
    )
```

### Quand utiliser chaque système ?

#### ArcFace (face_embedding) - 512D
✅ **Utilisez ArcFace pour** :
- Upload d'images depuis le frontend (`POST /api/upr/`)
- Analyse approfondie et comparaison avec la base criminelle
- Extraction de landmarks 106 points
- Estimation d'âge et genre
- Correspondances strictes (distance < 0.90)

**Service** : `upr/services/face_processing.py`
- Fonction : `extract_face_data()`
- Utilise : `biometrie.arcface_service.ArcFaceService`

#### face_recognition (face_encoding) - 128D
✅ **Utilisez face_recognition pour** :
- Scan rapide depuis caméra USB (`POST /api/upr/scan/`)
- Détection rapide de correspondances
- Système de surveillance en temps réel
- Reconnaissance rapide avec seuil configurable

**Service** : `upr/services/face_recognition_service.py`
- Fonction : `extract_face_encoding()`
- Utilise : Bibliothèque `face_recognition` (dlib)

## 🔀 Flux de travail recommandé

### Scénario 1 : Upload d'image depuis le frontend

```
1. POST /api/upr/ (avec fichier image)
   ↓
2. face_processing.extract_face_data()
   ↓
3. ArcFace extrait :
   - landmarks_106 (106 points)
   - face_embedding (512D)
   ↓
4. UPR créé avec face_embedding
   ↓
5. Comparaison avec UPR/criminels (ArcFace)
```

### Scénario 2 : Scan depuis caméra USB

```
1. POST /api/upr/scan/
   ↓
2. face_recognition_service.capture_face_from_camera()
   ↓
3. face_recognition_service.extract_face_encoding()
   ↓
4. face_recognition_service.compare_with_existing_faces()
   ↓
5a. Si correspondance trouvée → Retourner UPR existant
5b. Si nouvelle personne → Créer UPR avec face_encoding
```

### Scénario 3 : Double extraction (recommandé pour précision maximale)

Pour une UPR créée via scan caméra, vous pouvez ensuite :

```
1. UPR créée avec face_encoding (128D) depuis caméra
   ↓
2. Upload de la même image via POST /api/upr/<id>/
   ↓
3. Extraction ArcFace (512D) en plus
   ↓
4. UPR a maintenant les deux encodings :
   - face_encoding (128D) pour recherche rapide
   - face_embedding (512D) pour précision maximale
```

## 📈 Comparaison des performances

| Critère | ArcFace (512D) | face_recognition (128D) |
|---------|---------------|------------------------|
| **Précision** | ⭐⭐⭐⭐⭐ Très élevée | ⭐⭐⭐⭐ Élevée |
| **Vitesse** | ⭐⭐⭐ Modérée | ⭐⭐⭐⭐⭐ Très rapide |
| **Ressources** | ⭐⭐⭐ Modérées (ONNX) | ⭐⭐⭐⭐ Faibles (dlib) |
| **Landmarks** | ✅ 106 points | ❌ Non |
| **Age/Gender** | ✅ Oui | ❌ Non (peut être ajouté) |
| **Caméra USB** | ⚠️ Possible mais plus lent | ✅ Optimisé |
| **Base criminelle** | ✅ Compatible | ⚠️ Nécessite conversion |

## 🔧 Configuration

### ArcFace (déjà configuré)

```python
# backend_gn/biometrie/arcface_service.py
# Modèle : buffalo_l (InsightFace)
# Dimensions : 512
# Seuils de correspondance :
#   - Strict : distance < 0.90
#   - Faible : distance < 1.20
```

### face_recognition (nouveau)

```python
# backend_gn/backend_gn/settings.py
UPR_FACE_RECOGNITION_THRESHOLD = 0.6  # Distance euclidienne
UPR_CAMERA_INDEX = 0  # Index caméra USB

# Variables d'environnement :
# UPR_FACE_RECOGNITION_THRESHOLD=0.6
# UPR_CAMERA_INDEX=0
```

## 🎯 Recommandations d'utilisation

### Pour les enquêteurs

1. **Scan rapide** : Utilisez `POST /api/upr/scan/` (face_recognition)
   - Rapide, idéal pour les contrôles d'identité
   - Crée automatiquement une UPR si nouvelle personne

2. **Analyse approfondie** : Utilisez `POST /api/upr/` (ArcFace)
   - Plus précis, extrait landmarks et métadonnées
   - Meilleur pour la comparaison avec la base criminelle

3. **Meilleure approche** : Combiner les deux
   - Scan rapide pour détection initiale
   - Upload d'image pour analyse approfondie

### Pour les développeurs

```python
# Exemple : Extraire les deux encodings
from upr.services.face_processing import extract_face_data  # ArcFace
from upr.services.face_recognition_service import extract_face_encoding  # face_recognition

# Image depuis upload
arcface_result = extract_face_data(uploaded_image)
face_embedding = arcface_result.get('embedding')  # 512D

# Image depuis caméra
image = capture_face_from_camera()
face_encoding = extract_face_encoding(image)  # 128D

# Stocker les deux dans l'UPR
upr.face_embedding = face_embedding  # ArcFace
upr.face_encoding = face_encoding    # face_recognition
```

## ⚠️ Notes importantes

1. **Pas de conversion directe** : Les encodings ArcFace (512D) et face_recognition (128D) ne sont pas directement comparables. Ils utilisent des algorithmes différents.

2. **Recherche séparée** : 
   - Recherche avec ArcFace : Compare `face_embedding` avec autres `face_embedding`
   - Recherche avec face_recognition : Compare `face_encoding` avec autres `face_encoding`

3. **Migration des données** : Les UPR existants avec seulement `face_embedding` peuvent avoir `face_encoding` ajouté ultérieurement via scan caméra.

4. **Performance** : 
   - face_recognition est plus rapide pour la recherche (128D vs 512D)
   - ArcFace est plus précis mais plus lent

## 🔍 Vérification de la compatibilité

Le système vérifie automatiquement la disponibilité :

```python
# ArcFace
from biometrie.arcface_service import ArcFaceService
arcface = ArcFaceService()
if arcface.available:
    # ArcFace disponible

# face_recognition
from upr.services.face_recognition_service import get_face_recognition_available
if get_face_recognition_available():
    # face_recognition disponible
```

## 📚 Références

- **ArcFace** : `backend_gn/biometrie/arcface_service.py`
- **face_recognition** : `backend_gn/upr/services/face_recognition_service.py`
- **Documentation ArcFace** : InsightFace (buffalo_l model)
- **Documentation face_recognition** : `backend_gn/upr/README_FACE_RECOGNITION.md`

