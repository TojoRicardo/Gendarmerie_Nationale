# Module de Rapports Professionnels

Module complet de génération de rapports professionnels (PDF/CSV) pour le système SGIC.

## Installation

### 1. Dépendances

Ajoutez les dépendances suivantes à votre `requirements.txt` :

```txt
reportlab>=4.0.0
matplotlib>=3.7.0
celery>=5.3.0  # Optionnel, pour traitement asynchrone
```

Installez-les :

```bash
pip install reportlab matplotlib
# Optionnel pour Celery
pip install celery redis
```

### 2. Configuration Django

Le module est déjà ajouté dans `INSTALLED_APPS` :

```python
INSTALLED_APPS = [
    # ...
    'rapports',
    # ...
]
```

### 3. Configuration Celery (Optionnel)

Si vous souhaitez utiliser Celery pour le traitement asynchrone, ajoutez dans `settings.py` :

```python
# Celery Configuration
CELERY_ENABLED = True
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
```

Si Celery n'est pas configuré, les rapports seront générés de manière synchrone.

### 4. Migrations

Créez et appliquez les migrations :

```bash
python manage.py makemigrations rapports
python manage.py migrate
```

## Structure du Module

```
rapports/
├── models.py          # Modèle Report avec UUID
├── serializers.py     # Serializers DRF
├── views.py           # ViewSets et endpoints API
├── urls.py            # Configuration des URLs
├── permissions.py     # Permissions personnalisées
├── tasks.py           # Tâches Celery (avec fallback synchrone)
├── admin.py           # Interface d'administration Django
├── tests.py           # Tests unitaires
├── utils/
│   └── generator.py   # Générateur PDF/CSV
└── README.md          # Cette documentation
```

## Modèle Report

Le modèle `Report` utilise un UUID comme clé primaire et stocke les paramètres dans un JSONField (JSONB pour PostgreSQL).

### Champs principaux :

- `id` : UUIDField (clé primaire)
- `type` : Type de rapport (`criminel`, `enquete`, `statistique`, `audit`)
- `parameters` : JSONField avec les paramètres de génération
- `file` : FileField vers le fichier généré
- `generated_by` : ForeignKey vers l'utilisateur
- `date_generated` : DateTimeField (auto_now_add)
- `status` : Statut (`queued`, `processing`, `done`, `error`)
- `note` : TextField optionnel
- `duration_seconds` : Durée de génération
- `size_kb` : Taille du fichier en Ko
- `archived` : Boolean pour l'archivage

## Endpoints API

### 1. Générer un rapport

**POST** `/api/rapports/generer/`

**Headers :**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body :**
```json
{
  "type": "statistique",
  "parameters": {
    "from": "2025-11-01",
    "to": "2025-11-30",
    "region": "Antananarivo",
    "crime_type": "vol"
  },
  "note": "Rapport mensuel de novembre"
}
```

**Réponse (201 Created) :**
```json
{
  "id": "b6a8d2f4-1234-5678-9abc-def012345678",
  "type": "statistique",
  "status": "queued",
  "date_generated": null,
  "generated_by": "user01",
  "download_url": null
}
```

### 2. Lister les rapports

**GET** `/api/rapports/`

**Query Parameters :**
- `type` : Filtrer par type (`criminel`, `enquete`, `statistique`, `audit`)
- `status` : Filtrer par statut (`queued`, `processing`, `done`, `error`)
- `date_from` : Date de début (format: `YYYY-MM-DD`)
- `date_to` : Date de fin (format: `YYYY-MM-DD`)
- `generated_by` : ID de l'utilisateur
- `archived` : Boolean (true/false)
- `page` : Numéro de page
- `page_size` : Taille de page (max 100)

**Exemple :**
```
GET /api/rapports/?type=statistique&status=done&date_from=2025-11-01&page=1&page_size=20
```

**Réponse (200 OK) :**
```json
{
  "count": 45,
  "next": "http://localhost:8000/api/rapports/?page=2",
  "previous": null,
  "results": [
    {
      "id": "b6a8d2f4-...",
      "type": "statistique",
      "type_display": "Rapport Statistique",
      "status": "done",
      "status_display": "Terminé",
      "date_generated": "2025-11-15T10:30:00Z",
      "generated_by_username": "user01",
      "file_url": "http://localhost:8000/media/rapports/2025/11/statistique_xxx.pdf",
      "download_url": "http://localhost:8000/api/rapports/b6a8d2f4-.../download/",
      "size_kb": 1250,
      "duration_seconds": 3.45
    }
  ]
}
```

### 3. Télécharger un rapport

**GET** `/api/rapports/{id}/download/`

**Headers :**
```
Authorization: Bearer <token>
```

**Réponse :**
- **200 OK** : Fichier PDF/CSV avec headers appropriés
- **404 Not Found** : Rapport non trouvé
- **409 Conflict** : Rapport non prêt (status != 'done')

### 4. Supprimer un rapport

**DELETE** `/api/rapports/{id}/`

**Headers :**
```
Authorization: Bearer <token>
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Rapport supprimé avec succès"
}
```

**Permissions :** Seul l'administrateur ou le propriétaire peut supprimer un rapport.

## Types de Rapports

### 1. Rapport Statistique

**Type :** `statistique`

**Paramètres requis :**
- `from` : Date de début (format: `YYYY-MM-DD`)
- `to` : Date de fin (format: `YYYY-MM-DD`)

**Paramètres optionnels :**
- `region` : Nom de la région/province
- `crime_type` : Type de crime

**Exemple :**
```json
{
  "type": "statistique",
  "parameters": {
    "from": "2025-11-01",
    "to": "2025-11-30",
    "region": "Antananarivo",
    "crime_type": "vol"
  }
}
```

**Génère :**
- PDF avec graphiques (matplotlib) et tableaux
- CSV avec les données brutes

### 2. Rapport Criminel

**Type :** `criminel`

**Paramètres requis :**
- `criminel_id` : ID de la fiche criminelle
- OU `numero_fiche` : Numéro de fiche

**Exemple :**
```json
{
  "type": "criminel",
  "parameters": {
    "criminel_id": 123
  }
}
```

**Génère :**
- PDF avec en-tête officiel, photo, informations, infractions, timeline

### 3. Rapport d'Enquête

**Type :** `enquete`

**Paramètres requis :**
- `enquete_id` : ID de l'enquête

**Génère :**
- PDF avec résumé, preuves, agents, chronologie

### 4. Rapport d'Audit

**Type :** `audit`

**Paramètres optionnels :**
- `date_from` : Date de début
- `date_to` : Date de fin
- `user_id` : Filtrer par utilisateur
- `action_type` : Type d'action

**Génère :**
- PDF avec logs filtrés, tableaux, résumé

## Permissions

### CanAddReport
- Admin et superuser : ✅
- Enquêteur : ✅
- Autres : ❌

### CanViewReport
- Admin et superuser : ✅ (tous les rapports)
- Propriétaire : ✅ (ses propres rapports)
- Autres : ❌

### CanDeleteReport
- Admin et superuser : ✅ (tous les rapports)
- Propriétaire : ✅ (ses propres rapports)
- Autres : ❌

## Tests

Exécutez les tests :

```bash
python manage.py test rapports
```

Tests disponibles :
- `test_create_report_queue` : Création d'un rapport
- `test_generate_report_sync` : Génération synchrone
- `test_download_done_report` : Téléchargement
- `test_delete_report_permission` : Permissions de suppression

## Exemples d'utilisation avec curl

### 1. Créer un rapport statistique

```bash
curl -X POST http://localhost:8000/api/rapports/generer/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "statistique",
    "parameters": {
      "from": "2025-11-01",
      "to": "2025-11-30",
      "region": "Antananarivo"
    }
  }'
```

### 2. Vérifier le statut d'un rapport

```bash
curl -X GET http://localhost:8000/api/rapports/b6a8d2f4-1234-5678-9abc-def012345678/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Lister les rapports du mois

```bash
curl -X GET "http://localhost:8000/api/rapports/?date_from=2025-11-01&date_to=2025-11-30&type=statistique" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Télécharger un rapport

```bash
curl -X GET http://localhost:8000/api/rapports/b6a8d2f4-1234-5678-9abc-def012345678/download/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o rapport.pdf
```

### 5. Supprimer un rapport

```bash
curl -X DELETE http://localhost:8000/api/rapports/b6a8d2f4-1234-5678-9abc-def012345678/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Configuration des Variables d'Environnement

Aucune variable d'environnement spécifique n'est requise. Le module utilise :
- `MEDIA_ROOT` : Pour stocker les fichiers générés
- `CELERY_ENABLED` : Pour activer/désactiver Celery (optionnel)

## Dépannage

### Erreur : "ReportLab n'est pas installé"
```bash
pip install reportlab
```

### Erreur : "Matplotlib n'est pas disponible"
```bash
pip install matplotlib
```

### Les rapports ne se génèrent pas
1. Vérifiez que Celery est démarré (si `CELERY_ENABLED=True`)
2. Vérifiez les logs Django
3. Vérifiez que `MEDIA_ROOT` est accessible en écriture

### Les fichiers ne sont pas servis
Assurez-vous que dans `urls.py` principal :
```python
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## Support

Pour toute question ou problème, consultez les logs Django ou contactez l'équipe de développement.

