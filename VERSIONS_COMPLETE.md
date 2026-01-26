# 📋 Versions Complètes des Outils - Gendarmerie Nationale

Document récapitulatif de toutes les versions des outils et dépendances utilisés dans le projet.

---

## 🛠️ Outils Système

| Outil | Version Requise | Version Recommandée | Notes |
|-------|----------------|---------------------|-------|
| **Node.js** | >=18.0.0 | 20.x | Script de déploiement utilise Node.js 20 |
| **npm** | >=9.0.0 | 9.x ou supérieur | Gestionnaire de packages Node.js |
| **Python** | >=3.10 | 3.10+ ou 3.11 | Python 3.11 utilisé dans pyrightconfig.json |
| **PostgreSQL** | - | 15 | Image Docker: postgres:15 |
| **Redis** | - | 7 | Image Docker: redis:7-alpine |
| **Docker Compose** | - | 3.8 | Version utilisée dans docker-compose.yml |

---

## 📦 Frontend - Dépendances Node.js

### Dépendances Principales (Production)

| Package | Version | Type |
|---------|---------|------|
| axios | ^1.7.7 | HTTP Client |
| dompurify | ^3.1.7 | HTML Sanitization |
| framer-motion | ^11.5.5 | Animations |
| jspdf | ^3.0.4 | PDF Generation |
| jwt-decode | ^4.0.0 | JWT Decoding |
| lucide-react | ^0.468.0 | Icons |
| react | ^18.3.1 | Framework |
| react-dom | ^18.3.1 | React DOM |
| react-quill | ^2.0.0 | Rich Text Editor |
| react-router-dom | ^6.28.0 | Routing |
| recharts | ^2.13.3 | Charts |

### Dépendances de Développement

| Package | Version | Type |
|---------|---------|------|
| @types/react | ^18.3.12 | TypeScript Types |
| @types/react-dom | ^18.3.1 | TypeScript Types |
| @vitejs/plugin-react | ^4.3.3 | Vite Plugin |
| autoprefixer | ^10.4.21 | PostCSS Plugin |
| eslint | ^9.15.0 | Linter |
| eslint-plugin-react | ^7.37.2 | ESLint Plugin |
| eslint-plugin-react-hooks | ^5.0.0 | ESLint Plugin |
| eslint-plugin-react-refresh | ^0.4.14 | ESLint Plugin |
| postcss | ^8.5.6 | CSS Processor |
| prettier | ^3.3.3 | Code Formatter |
| stylelint | ^16.25.0 | CSS Linter |
| stylelint-config-standard | ^39.0.1 | Stylelint Config |
| stylelint-config-tailwindcss | ^1.0.0 | Stylelint Config |
| tailwindcss | ^3.4.18 | CSS Framework |
| vite | ^6.0.1 | Build Tool |

---

## 🐍 Backend - Dépendances Python

### Framework Django

| Package | Version | Type |
|---------|---------|------|
| Django | 4.2.7 | Web Framework |
| djangorestframework | 3.14.0 | REST Framework |
| djangorestframework-simplejwt | 5.3.0 | JWT Authentication |
| django-cors-headers | 4.3.1 | CORS Headers |
| django-filter | 23.5 | Filtering |
| drf-spectacular | 0.28.0 | OpenAPI Docs |
| drf-yasg | 1.21.7 | Swagger Docs |
| psycopg2-binary | 2.9.9 | PostgreSQL Adapter |

### Intelligence Artificielle - Reconnaissance Faciale

| Package | Version | Type |
|---------|---------|------|
| torch | >=2.0.0 | Deep Learning |
| torchvision | >=0.15.0 | Computer Vision |
| facenet-pytorch | >=2.5.3 | Face Recognition |
| insightface | 0.7.3 | ArcFace Model |
| onnxruntime | 1.16.3 | ONNX Runtime |
| onnx | 1.16.1 | ONNX Format |
| scikit-image | 0.24.0 | Image Processing |
| face_recognition | >=1.3.0 | Face Recognition |
| dlib | >=19.24.0 | C++ Library |

### Traitement d'Images

| Package | Version | Type |
|---------|---------|------|
| opencv-python-headless | 4.10.0.84 | Computer Vision |
| pillow | 10.4.0 | Image Processing |
| numpy | 1.26.4 | Numerical Computing |
| albumentations | 1.4.8 | Image Augmentation |

### Analyse de Données

| Package | Version | Type |
|---------|---------|------|
| pandas | >=2.3.0 | Data Analysis |
| scikit-learn | >=1.7.0 | Machine Learning |
| scipy | >=1.16.0 | Scientific Computing |
| matplotlib | 3.8.4 | Data Visualization |
| seaborn | >=0.13.0 | Statistical Visualization |
| tqdm | 4.66.2 | Progress Bars |

### Sécurité

| Package | Version | Type |
|---------|---------|------|
| bcrypt | 4.3.0 | Password Hashing |
| cryptography | >=46.0.0 | Cryptography |
| PyJWT | 2.10.1 | JWT Tokens |
| pyotp | 2.9.0 | 2FA |
| qrcode | 7.4.2 | QR Code Generation |

### Celery (Tâches Asynchrones)

| Package | Version | Type |
|---------|---------|------|
| celery | 5.3.4 | Task Queue |
| django-celery-beat | 2.8.1 | Periodic Tasks |
| django-celery-results | 2.6.0 | Result Backend |
| redis | 5.0.1 | Message Broker |

### Utilitaires

| Package | Version | Type |
|---------|---------|------|
| python-decouple | 3.8 | Environment Variables |
| python-dotenv | 1.1.1 | .env File Loading |
| python-dateutil | 2.8.2 | Date Utilities |
| pytz | 2023.3 | Timezone |
| click | 8.3.0 | CLI |
| colorama | 0.4.6 | Terminal Colors |
| six | 1.17.0 | Python 2/3 Compatibility |
| requests | 2.31.0 | HTTP Library |

### Génération de Documents

| Package | Version | Type |
|---------|---------|------|
| reportlab | 4.0.7 | PDF Generation |
| python-docx | 1.2.0 | Word Documents |
| weasyprint | 60.1 | HTML to PDF |
| openpyxl | 3.1.2 | Excel Files |

### Recherche Avancée

| Package | Version | Type |
|---------|---------|------|
| django-haystack | 3.2.1 | Full-text Search |
| Whoosh | 2.7.4 | Search Engine |

### Autres

| Package | Version | Type |
|---------|---------|------|
| gunicorn | 21.2.0 | WSGI Server |
| whitenoise | 6.6.0 | Static Files |
| django-storages | 1.14.6 | File Storage |
| Faker | 20.1.0 | Test Data |

---

## 🐳 Services Docker

| Service | Image | Version | Description |
|---------|-------|---------|-------------|
| PostgreSQL | postgres | 15 | Base de données |
| Redis | redis | 7-alpine | Cache et message broker |

---

## 📊 Résumé par Catégorie

### Frontend
- **Total dépendances production**: 11 packages
- **Total dépendances développement**: 15 packages
- **Build tool**: Vite 6.0.1
- **Framework**: React 18.3.1

### Backend
- **Total packages Python**: 50+ packages
- **Framework**: Django 4.2.7
- **REST Framework**: DRF 3.14.0
- **Serveur WSGI**: Gunicorn 21.2.0

### Intelligence Artificielle
- **Deep Learning**: PyTorch >=2.0.0
- **Reconnaissance Faciale**: InsightFace 0.7.3, face_recognition >=1.3.0
- **Vision par Ordinateur**: OpenCV 4.10.0.84

---

## 🔍 Versions avec Contraintes

### Versions Exactes (==)
- Django==4.2.7
- djangorestframework==3.14.0
- insightface==0.7.3
- onnxruntime==1.16.3
- onnx==1.16.1
- opencv-python-headless==4.10.0.84
- pillow==10.4.0
- numpy==1.26.4
- matplotlib==3.8.4
- Et 30+ autres packages avec versions exactes

### Versions Minimales (>=)
- torch>=2.0.0
- torchvision>=0.15.0
- facenet-pytorch>=2.5.3
- face_recognition>=1.3.0
- dlib>=19.24.0
- pandas>=2.3.0
- scikit-learn>=1.7.0
- scipy>=1.16.0
- seaborn>=0.13.0
- cryptography>=46.0.0

### Versions avec Caractère d'Insertion (^)
- Tous les packages npm utilisent ^ (ex: ^1.7.7)
- Permet les mises à jour mineures et correctives

---

## 📝 Notes Importantes

1. **Python**: Version 3.10+ requise (3.11 recommandée selon pyrightconfig.json)
2. **Node.js**: Version 18.0.0+ requise (20.x recommandée pour le déploiement)
3. **PostgreSQL**: Version 15 utilisée dans Docker
4. **Redis**: Version 7 utilisée dans Docker
5. **Docker Compose**: Version 3.8 utilisée

---

## 🔄 Commandes de Vérification

### Vérifier les versions installées

```bash
# Node.js et npm
node --version
npm --version

# Python
python --version
python3 --version

# Packages Python installés
pip list

# Packages npm installés
npm list --depth=0

# Versions dans package.json
cat frontend_gn/package.json | grep -A 50 '"dependencies"'

# Versions dans requirements.txt
cat backend_gn/requirements.txt
```

---

*Dernière mise à jour : 25 janvier 2026*
*Fichier généré automatiquement à partir de package.json et requirements.txt*
