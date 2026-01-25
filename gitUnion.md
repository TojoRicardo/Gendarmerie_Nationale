# GitUnion - Modules Installés - Gendarmerie Nationale

Ce fichier regroupe tous les modules installés dans le frontend et le backend du système de gestion criminelle.

---

## 📦 Frontend - Modules Node.js

### Dépendances Principales (dependencies)

| Module | Version | Description |
|--------|---------|-------------|
| axios | ^1.7.7 | Client HTTP pour les requêtes API |
| dompurify | ^3.1.7 | Sanitisation HTML pour la sécurité |
| framer-motion | ^11.5.5 | Bibliothèque d'animation React |
| jspdf | ^3.0.4 | Génération de PDFs |
| jwt-decode | ^4.0.0 | Décodage de tokens JWT |
| lucide-react | ^0.468.0 | Icônes React |
| react | ^18.3.1 | Framework React |
| react-dom | ^18.3.1 | DOM renderer pour React |
| react-quill | ^2.0.0 | Éditeur de texte riche |
| react-router-dom | ^6.28.0 | Routage pour React |
| recharts | ^2.13.3 | Bibliothèque de graphiques React |

### Dépendances de Développement (devDependencies)

| Module | Version | Description |
|--------|---------|-------------|
| @types/react | ^18.3.12 | Types TypeScript pour React |
| @types/react-dom | ^18.3.1 | Types TypeScript pour React DOM |
| @vitejs/plugin-react | ^4.3.3 | Plugin Vite pour React |
| autoprefixer | ^10.4.21 | PostCSS plugin pour préfixes CSS |
| eslint | ^9.15.0 | Linter JavaScript |
| eslint-plugin-react | ^7.37.2 | Règles ESLint pour React |
| eslint-plugin-react-hooks | ^5.0.0 | Règles ESLint pour React Hooks |
| eslint-plugin-react-refresh | ^0.4.14 | Règles ESLint pour React Refresh |
| postcss | ^8.5.6 | Outil de transformation CSS |
| prettier | ^3.3.3 | Formateur de code |
| stylelint | ^16.25.0 | Linter CSS |
| stylelint-config-standard | ^39.0.1 | Configuration standard pour Stylelint |
| stylelint-config-tailwindcss | ^1.0.0 | Configuration Tailwind pour Stylelint |
| tailwindcss | ^3.4.18 | Framework CSS utility-first |
| vite | ^6.0.1 | Build tool et dev server |

### Versions Requises

- **Node.js**: >=18.0.0
- **npm**: >=9.0.0

---

## 🐍 Backend - Modules Python

### Framework Django

| Module | Version | Description |
|--------|---------|-------------|
| Django | 4.2.7 | Framework web Python |
| djangorestframework | 3.14.0 | Framework REST pour Django |
| djangorestframework-simplejwt | 5.3.0 | Support JWT pour DRF |
| django-cors-headers | 4.3.1 | Gestion des en-têtes CORS |
| django-filter | 23.5 | Filtrage avancé pour Django |
| drf-spectacular | 0.28.0 | Documentation OpenAPI pour DRF |
| drf-yasg | 1.21.7 | Documentation Swagger pour DRF |
| psycopg2-binary | 2.9.9 | Adaptateur PostgreSQL |

### Intelligence Artificielle - Reconnaissance Faciale

| Module | Version | Description |
|--------|---------|-------------|
| torch | >=2.0.0 | Framework de deep learning PyTorch |
| torchvision | >=0.15.0 | Vision pour PyTorch |
| facenet-pytorch | >=2.5.3 | FaceNet pour PyTorch |
| insightface | 0.7.3 | ArcFace (reconnaissance faciale haute précision) |
| onnxruntime | 1.16.3 | Runtime pour InsightFace/ArcFace |
| onnx | 1.16.1 | Format ONNX |
| scikit-image | 0.24.0 | Traitement d'images |
| face_recognition | >=1.3.0 | Bibliothèque de reconnaissance faciale |
| dlib | >=19.24.0 | Dépendance requise pour face_recognition |

### Traitement d'Images

| Module | Version | Description |
|--------|---------|-------------|
| opencv-python-headless | 4.10.0.84 | Bibliothèque de vision par ordinateur |
| pillow | 10.4.0 | Bibliothèque de traitement d'images |
| numpy | 1.26.4 | Calcul numérique |
| albumentations | 1.4.8 | Augmentation d'images |

### Analyse de Données

| Module | Version | Description |
|--------|---------|-------------|
| pandas | >=2.3.0 | Manipulation et analyse de données |
| scikit-learn | >=1.7.0 | Machine learning |
| scipy | >=1.16.0 | Calcul scientifique |
| matplotlib | 3.8.4 | Visualisation de données |
| seaborn | >=0.13.0 | Visualisation statistique |
| tqdm | 4.66.2 | Barres de progression |

### Sécurité

| Module | Version | Description |
|--------|---------|-------------|
| bcrypt | 4.3.0 | Hachage de mots de passe |
| cryptography | >=46.0.0 | Cryptographie |
| PyJWT | 2.10.1 | Tokens JWT |
| pyotp | 2.9.0 | Authentification à deux facteurs |
| qrcode | 7.4.2 | Génération de QR codes |

### Celery (Tâches Asynchrones)

| Module | Version | Description |
|--------|---------|-------------|
| celery | 5.3.4 | Tâches asynchrones |
| django-celery-beat | 2.8.1 | Planification de tâches périodiques |
| django-celery-results | 2.6.0 | Stockage des résultats Celery |
| redis | 5.0.1 | Broker de messages pour Celery |

### Utilitaires

| Module | Version | Description |
|--------|---------|-------------|
| python-decouple | 3.8 | Gestion des variables d'environnement |
| python-dotenv | 1.1.1 | Chargement de fichiers .env |
| python-dateutil | 2.8.2 | Manipulation de dates |
| pytz | 2023.3 | Fuseaux horaires |
| click | 8.3.0 | Interface en ligne de commande |
| colorama | 0.4.6 | Couleurs dans le terminal |
| six | 1.17.0 | Compatibilité Python 2/3 |
| requests | 2.31.0 | Client HTTP |

### Génération de Documents

| Module | Version | Description |
|--------|---------|-------------|
| reportlab | 4.0.7 | Génération de PDFs |
| python-docx | 1.2.0 | Manipulation de documents Word |
| weasyprint | 60.1 | Génération de PDFs depuis HTML |
| openpyxl | 3.1.2 | Manipulation de fichiers Excel |

### Recherche Avancée

| Module | Version | Description |
|--------|---------|-------------|
| django-haystack | 3.2.1 | Recherche full-text |
| Whoosh | 2.7.4 | Moteur de recherche |

### Autres

| Module | Version | Description |
|--------|---------|-------------|
| gunicorn | 21.2.0 | Serveur WSGI HTTP |
| whitenoise | 6.6.0 | Service de fichiers statiques |
| django-storages | 1.14.6 | Stockage de fichiers |
| Faker | 20.1.0 | Génération de données de test |

---

## 📋 Fichiers de Dépendances

### Frontend
- `frontend_gn/package.json` - Configuration npm et dépendances
- `frontend_gn/package-lock.json` - Verrouillage des versions exactes

### Backend
- `backend_gn/requirements.txt` - Liste des packages Python

---

## 🔄 Mise à Jour

Pour mettre à jour ce fichier après l'installation de nouveaux modules :

1. **Frontend** : Vérifier `frontend_gn/package.json`
2. **Backend** : Vérifier `backend_gn/requirements.txt`
3. Mettre à jour ce fichier `gitUnion.md` en conséquence

---

*Dernière mise à jour : 25 janvier 2026*
