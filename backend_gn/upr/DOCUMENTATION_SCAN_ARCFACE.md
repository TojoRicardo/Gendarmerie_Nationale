# Documentation : Comment ArcFace scanne l'image dans "Ajouter un UPR"

## 🔍 Vue d'ensemble du processus

Quand vous scannez une photo dans "Ajouter un UPR", voici ce qui se passe :

### 1. **Frontend** (`AjouterPhotoCriminelle.jsx`)
- L'utilisateur upload une photo
- Clic sur "Scanner la photo"
- Appel à `searchUPRByPhoto(photoFile, 0.35, 5)`
- Envoie une requête POST à `/api/upr/search-by-photo/`

### 2. **Backend** (`upr/views.py` → `search_by_photo`)
- Reçoit le fichier image
- Appelle `search_by_photo()` dans `upr/services/photo_verification.py`

### 3. **Extraction de l'embedding ArcFace** (`photo_verification.py`)
```python
# Méthode 1: extract_face_data (recommandé)
face_data = extract_face_data(uploaded_image)
query_embedding = np.array(face_data.get("embedding"), dtype=np.float32)  # 512 dimensions

# Méthode 2: encode_faces (fallback)
faces = arcface_service.encode_faces(image=uploaded_image, limit=1)
query_embedding = faces[0].embedding  # 512 dimensions
```

### 4. **Recherche dans la base de données**

Le système cherche dans **3 sources** :

#### a) **UPR** (`UnidentifiedPerson.face_embedding`)
- Compare avec tous les UPR existants qui ont un `face_embedding`

#### b) **BiometriePhoto** (`BiometriePhoto.embedding_512`)
- Compare avec toutes les photos biométriques actives qui ont un `embedding_512`
- **C'est ici que vos fiches criminelles devraient être trouvées !**

#### c) **IAFaceEmbedding** (`IAFaceEmbedding.embedding_vector`)
- Compare avec les embeddings IA générés pour les fiches criminelles

### 5. **Comparaison vectorielle**
```python
# Normalisation des embeddings
query_norm = query_embedding / ||query_embedding||
stored_norm = stored_embedding / ||stored_embedding||

# Calcul de similarité cosinus
similarity = dot(query_norm, stored_norm)  # Valeur entre -1 et 1

# Filtrage par seuil
if similarity >= threshold:  # threshold = 0.35 par défaut
    # Correspondance trouvée !
```

## ⚠️ Pourquoi votre fiche criminelle n'est pas trouvée ?

### Problème 1 : **Pas d'embedding généré**
Si la photo de la fiche criminelle n'a pas d'`embedding_512` dans `BiometriePhoto`, elle ne sera **jamais** trouvée.

**Solution** : Vérifier que la photo a bien un embedding :
```python
from biometrie.models import BiometriePhoto

# Vérifier si votre fiche criminelle a des photos avec embedding
photos = BiometriePhoto.objects.filter(
    criminel_id=VOTRE_CRIMINEL_ID,
    est_active=True,
    embedding_512__isnull=False
).exclude(embedding_512=None)

if photos.count() == 0:
    print("❌ Aucune photo avec embedding trouvée !")
    print("   → Il faut régénérer l'embedding pour cette photo")
```

### Problème 2 : **Seuil trop élevé**
Le seuil par défaut est `0.35` (35% de similarité). Si les embeddings sont trop différents, la correspondance ne sera pas détectée.

**Solution** : Réduire le seuil ou vérifier les scores :
```python
# Dans search_by_photo, les logs affichent maintenant :
# - Les meilleures similarités même si sous le seuil
# - Le nombre de photos avec/sans embedding
```

### Problème 3 : **Photo inactive**
Si `est_active=False` sur la `BiometriePhoto`, elle ne sera pas recherchée.

**Solution** : Vérifier que la photo est active :
```python
photo = BiometriePhoto.objects.get(id=PHOTO_ID)
if not photo.est_active:
    photo.est_active = True
    photo.save()
```

### Problème 4 : **Dimension d'embedding différente**
Si l'embedding stocké n'a pas 512 dimensions, il sera ignoré.

**Solution** : Vérifier la dimension :
```python
photo = BiometriePhoto.objects.get(id=PHOTO_ID)
if photo.embedding_512:
    print(f"Dimension: {len(photo.embedding_512)}")
    if len(photo.embedding_512) != 512:
        print("❌ Dimension incorrecte !")
```

## 🔧 Comment diagnostiquer le problème ?

### Étape 1 : Vérifier les logs du serveur Django
Après avoir scanné une photo, vérifiez les logs pour voir :
```
🔵 [search_by_photo] Diagnostic BiometriePhoto:
   - Total photos actives: X
   - Photos avec embedding_512: Y
   - Photos sans embedding: Z
```

### Étape 2 : Utiliser la commande de diagnostic
```bash
python manage.py diagnostic_recherche_visage
```

Cette commande affiche :
- Le nombre total de fiches criminelles
- Le nombre de photos avec/sans embedding
- Le nombre d'embeddings IA actifs

### Étape 3 : Vérifier une fiche criminelle spécifique
```python
from biometrie.models import BiometriePhoto
from criminel.models import CriminalFicheCriminelle

# Trouver votre fiche criminelle
criminel = CriminalFicheCriminelle.objects.get(numero_fiche="VOTRE_NUMERO")

# Vérifier les photos biométriques
photos = BiometriePhoto.objects.filter(criminel=criminel, est_active=True)
print(f"Photos actives: {photos.count()}")

photos_avec_embedding = photos.filter(embedding_512__isnull=False).exclude(embedding_512=None)
print(f"Photos avec embedding: {photos_avec_embedding.count()}")

for photo in photos_avec_embedding:
    print(f"  Photo #{photo.id}: embedding_512={len(photo.embedding_512) if photo.embedding_512 else 0} dimensions")
```

## 🛠️ Solutions

### Solution 1 : Régénérer l'embedding pour une photo existante
```python
from biometrie.models import BiometriePhoto
from biometrie.pipeline import enrollement_pipeline
from biometrie.pipeline import save_enrollement_to_biometrie_photo

# Trouver la photo
photo = BiometriePhoto.objects.get(id=PHOTO_ID)

# Régénérer l'embedding
pipeline_result = enrollement_pipeline(photo.image)
if pipeline_result.get("success"):
    save_enrollement_to_biometrie_photo(photo, pipeline_result)
    print("✅ Embedding régénéré avec succès !")
```

### Solution 2 : Régénérer tous les embeddings manquants
```bash
# Commande à créer ou utiliser une existante
python manage.py generer_embeddings --all
```

### Solution 3 : Réduire le seuil de recherche
Dans le frontend, vous pouvez réduire le seuil :
```javascript
// Dans AjouterPhotoCriminelle.jsx
const results = await searchUPRByPhoto(photoFace.file, 0.25, 5);  // Seuil réduit à 0.25
```

## 📊 Logs ajoutés pour diagnostic

Les logs suivants ont été ajoutés pour vous aider à diagnostiquer :

1. **Extraction de l'embedding** :
   - Dimension de l'embedding extrait
   - Confidence score

2. **Recherche dans BiometriePhoto** :
   - Nombre total de photos actives
   - Nombre de photos avec embedding
   - Nombre de photos sans embedding

3. **Comparaison** :
   - Nombre de photos comparées
   - Min/Max/Mean des similarités
   - Top 5 meilleures similarités même si sous le seuil

4. **Résultats** :
   - Nombre de correspondances trouvées
   - Si aucune correspondance : affichage des meilleures similarités

## 🎯 Prochaines étapes

1. **Générer un scan** et vérifier les logs du serveur Django
2. **Vérifier** si votre fiche criminelle a une `BiometriePhoto` avec `embedding_512`
3. **Si pas d'embedding** : régénérer l'embedding pour cette photo
4. **Si embedding existe** : vérifier les scores de similarité dans les logs
