# Module de Reconnaissance Faciale UPR - face_recognition

## 📋 Vue d'ensemble

Ce module intégre la bibliothèque **face_recognition** (basée sur dlib) pour la reconnaissance faciale des Unités de Personnes Non Identifiées (UPR). Il permet :

- ✅ Capture automatique depuis une caméra USB
- ✅ Extraction d'encodings faciaux (128 dimensions)
- ✅ Comparaison avec les UPR existants
- ✅ Création automatique d'une nouvelle UPR si aucune correspondance n'est trouvée
- ✅ Stockage des encodings en base PostgreSQL
- ✅ Journalisation complète (audit)

## 🔧 Installation

### 1. Installer les dépendances

```bash
pip install face_recognition>=1.3.0 dlib>=19.24.0
```

**Note importante** : `dlib` nécessite généralement des outils de compilation (Visual Studio sur Windows, build-essential sur Linux).

**Alternative Windows (sans compilation)** :
```bash
pip install dlib-binary  # Version précompilée
```

**Linux** :
```bash
sudo apt-get install build-essential cmake
sudo apt-get install libopenblas-dev liblapack-dev
pip install dlib face_recognition
```

### 2. Appliquer les migrations

```bash
cd backend_gn
python manage.py makemigrations upr
python manage.py migrate
```

## ⚙️ Configuration

### Seuil de reconnaissance (settings.py)

Le seuil de reconnaissance est configurable dans `backend_gn/backend_gn/settings.py` :

```python
# Seuil de reconnaissance faciale (distance euclidienne)
# Plus petit = plus strict (0.4 = très strict, 0.6 = modéré, 0.7 = permissif)
UPR_FACE_RECOGNITION_THRESHOLD = 0.6  # Valeur par défaut
```

**Variables d'environnement** :
```bash
# Windows PowerShell
$env:UPR_FACE_RECOGNITION_THRESHOLD = "0.6"
$env:UPR_CAMERA_INDEX = "0"

# Linux/Mac
export UPR_FACE_RECOGNITION_THRESHOLD=0.6
export UPR_CAMERA_INDEX=0
```

### Index de caméra USB

Par défaut, la caméra index 0 est utilisée. Pour changer :

```python
UPR_CAMERA_INDEX = 0  # 0 = première caméra, 1 = deuxième, etc.
```

## 🚀 Utilisation

### API Endpoint : POST /api/upr/scan/

Capture une image depuis la caméra USB, extrait l'encoding facial, compare avec les UPR existants et crée une nouvelle UPR si nécessaire.

#### Requête

```http
POST /api/upr/scan/
Authorization: Bearer <token>
Content-Type: application/json

{
    "camera_index": 0,  // Optionnel (défaut: 0)
    "lieu_detection": "Poste de Gendarmerie",  // Optionnel
    "threshold": 0.6  // Optionnel (défaut: configuré dans settings)
}
```

#### Réponse si correspondance trouvée (200 OK)

```json
{
    "message": "Personne déjà connue",
    "upr_id": "550e8400-e29b-41d4-a716-446655440000",
    "statut": "IDENTIFIE",
    "code_upr": "UPR-0001",
    "nom_temporaire": "Individu Non Identifié #0001",
    "distance": 0.4523,
    "threshold": 0.6,
    "existing_upr_id": "550e8400-e29b-41d4-a716-446655440000",
    "profil_face_url": "/media/upr/photos/upr_0001_face.jpg"
}
```

#### Réponse si nouvelle UPR créée (201 Created)

```json
{
    "message": "Nouvelle UPR créée",
    "upr_id": "550e8400-e29b-41d4-a716-446655440000",
    "statut": "NON_IDENTIFIE",
    "code_upr": "UPR-0002",
    "nom_temporaire": "Individu Non Identifié #0002",
    "profil_face_url": "/media/upr_faces/upr_capture_20250108_143022_abc123.jpg",
    "date_detection": "2025-01-08T14:30:22Z",
    "lieu_detection": "Poste de Gendarmerie"
}
```

#### Réponses d'erreur

**400 Bad Request** - Aucun visage détecté :
```json
{
    "error": "Aucun visage détecté dans l'image capturée. Assurez-vous que le visage est bien visible et éclairé."
}
```

**503 Service Unavailable** - Caméra non accessible :
```json
{
    "error": "Impossible d'accéder à la caméra USB",
    "details": "Impossible d'ouvrir la caméra USB index 0"
}
```

**503 Service Unavailable** - face_recognition non disponible :
```json
{
    "error": "Service de reconnaissance faciale non disponible. Vérifiez que face_recognition et dlib sont installés."
}
```

## 📁 Structure du Code

```
backend_gn/upr/
├── models.py                          # Modèle UnidentifiedPerson (avec champ face_encoding)
├── serializers.py                     # Serializers (face_encoding ajouté)
├── views.py                           # ScanUPRView (nouvelle vue API)
├── urls.py                            # Route /api/upr/scan/
└── services/
    └── face_recognition_service.py    # Service de reconnaissance faciale
        ├── capture_face_from_camera()     # Capture depuis USB
        ├── extract_face_encoding()        # Extraction encoding 128D
        ├── compare_with_existing_faces()  # Comparaison avec UPR
        └── save_image_to_storage()        # Sauvegarde image
```

## 🔍 Différence entre face_encoding et face_embedding

Le modèle `UnidentifiedPerson` stocke **deux types d'encodings** :

| Champ | Dimensions | Bibliothèque | Usage |
|-------|------------|--------------|-------|
| `face_encoding` | 128D | face_recognition (dlib) | Reconnaissance rapide, scan caméra USB |
| `face_embedding` | 512D | ArcFace (InsightFace) | Reconnaissance haute précision, analyse avancée |

**Recommandation** : Utiliser `face_encoding` pour le scan rapide depuis caméra USB, et `face_embedding` pour les analyses approfondies et la comparaison avec la base criminelle.

## 🧪 Test du Module

### Test avec curl

```bash
curl -X POST http://localhost:8000/api/upr/scan/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "camera_index": 0,
    "lieu_detection": "Poste de Gendarmerie",
    "threshold": 0.6
  }'
```

### Test avec Python

```python
import requests

url = "http://localhost:8000/api/upr/scan/"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}
data = {
    "camera_index": 0,
    "lieu_detection": "Poste de Gendarmerie",
    "threshold": 0.6
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

## 📊 Audit et Logs

Toutes les actions sont journalisées via le module `audit` :

- `UPR_SCAN_MATCH` : Correspondance trouvée avec un UPR existant
- `UPR_SCAN_CREATE` : Nouvelle UPR créée
- `UPR_SCAN_ERROR` : Erreur lors du scan

Les logs sont accessibles via l'endpoint `/api/audit/`.

## 🔐 Sécurité

- ✅ Authentification JWT requise (`IsAuthenticated`)
- ✅ Validation des paramètres d'entrée
- ✅ Gestion des erreurs avec messages appropriés
- ✅ Journalisation complète des actions (audit)
- ✅ Transactions atomiques pour éviter les incohérences

## ⚠️ Limitations et Notes

1. **Installation de dlib** : Peut être complexe sur certains systèmes. Utiliser `dlib-binary` sur Windows si nécessaire.

2. **Performance** : La comparaison avec tous les UPR peut être lente si la base contient beaucoup d'UPR (>1000). Considérer l'indexation ou le cache.

3. **Qualité de l'image** : Une bonne éclairage et un visage bien cadré améliorent la précision.

4. **Seuil** : Un seuil trop strict (0.4) peut manquer des correspondances, trop permissif (0.8) peut générer des faux positifs.

## 🛠️ Dépannage

### Erreur : "face_recognition non disponible"

```bash
# Vérifier l'installation
python -c "import face_recognition; print('OK')"

# Réinstaller si nécessaire
pip uninstall face_recognition dlib
pip install face_recognition dlib
```

### Erreur : "Impossible d'accéder à la caméra"

1. Vérifier que la caméra USB est branchée
2. Tester avec un autre index (camera_index: 1, 2, etc.)
3. Vérifier les permissions système (Linux : ajouter l'utilisateur au groupe video)

### Erreur : "Aucun visage détecté"

1. Vérifier l'éclairage
2. S'assurer que le visage est bien visible
3. Tester avec une autre image ou caméra

## 📚 Références

- [face_recognition Documentation](https://github.com/ageitgey/face_recognition)
- [dlib Documentation](http://dlib.net/)
- [Django REST Framework](https://www.django-rest-framework.org/)

