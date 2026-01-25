"""
Configuration Django - Gendarmerie Nationale
Settings pour développement et production
"""

# Forcer l'encodage UTF-8 pour éviter les erreurs d'encodage avec PostgreSQL
import sys
import io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from pathlib import Path
from datetime import timedelta
import os
import logging
import base64

# Charger les variables d'environnement depuis .env si disponible
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv n'est pas installé, continuer sans
    pass

logger = logging.getLogger(__name__)

def safe_encode(value):
    """Encode une valeur en UTF-8 de manière sécurisée pour la connexion PostgreSQL"""
    if value is None:
        return None
    if isinstance(value, bytes):
        try:
            return value.decode('utf-8')
        except UnicodeDecodeError:
            # Si le décodage échoue, essayer avec latin-1 puis encoder en UTF-8
            return value.decode('latin-1').encode('utf-8').decode('utf-8')
    if isinstance(value, str):
        # S'assurer que la chaîne est en UTF-8
        try:
            value.encode('utf-8')
            return value
        except UnicodeEncodeError:
            # Si l'encodage échoue, utiliser errors='replace'
            return value.encode('utf-8', errors='replace').decode('utf-8')
    return str(value)

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-+*4w13i#%qov3xdry-=-(se_9s+atoawj^3y#q$!gko2m!qfc#'
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '172.29.131.157', '*']
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True  # Permet à Django de lire le port depuis X-Forwarded-Port
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# NOTE: Pour que les adresses IP réelles soient capturées correctement en production,
# Voir la documentation dans backend_gn/audit/CONFIGURATION_IP.md

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'haystack',  # Recherche avancée avec Whoosh

    # Local apps
    'utilisateur',
    'criminel',
    'notifications',
    'biometrie',
    'reports',
    'rapports',  # Module de génération de rapports professionnels
    'intelligence_artificielle',
    'ai_analysis',  # Module d'analyse IA des données criminelles
    'face_recognition',  # Module de reconnaissance faciale avec ArcFace
    'audit',  # Module de journal d'audit avec IA locale
    'enquete',
    'sgic_statistics',
    'upr',  # Module UPR - Unidentified Person Registry
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'audit.middleware_session.UserSessionMiddleware',  # Gestion des sessions utilisateur (après AuthenticationMiddleware)
    'audit.middleware.CurrentUserMiddleware',  # Middleware pour capturer l'utilisateur courant (pour signals)
    'utilisateur.middleware_session.SessionIsolationMiddleware',  # Isolation des sessions par requête
    'audit.middleware.AuditMiddleware',  # Middleware pour l'audit (doit être après AuthenticationMiddleware)
    'utilisateur.middleware.UserStatusMiddleware',  # Gestion du statut actif/inactif
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend_gn.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend_gn.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# Encoder les paramètres de connexion pour éviter les erreurs d'encodage UTF-8
_db_name = safe_encode(os.environ.get('DB_NAME', 'Gendarmerie_Nationale_db'))
_db_user = safe_encode(os.environ.get('DB_USER', 'postgres'))
_db_password = safe_encode(os.environ.get('DB_PASSWORD', '    '))
_db_host = safe_encode(os.environ.get('DB_HOST', 'localhost'))
_db_port = os.environ.get('DB_PORT', '5432')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': _db_name,
        'USER': _db_user,
        'PASSWORD': _db_password,
        'HOST': _db_host,
        'PORT': _db_port,
        'OPTIONS': {
            'client_encoding': 'UTF8',
            'connect_timeout': 10,
        },
        'CONN_MAX_AGE': 600,
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Algiers'  # Fuseau horaire de l'Algérie
USE_I18N = True
USE_TZ = True

# https://docs.djangoproject.com/en/5.2/howto/static-files/
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'utilisateur.UtilisateurModel'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
}

# Configuration JWT - Tokens avec durée de vie prolongée
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    
    'JTI_CLAIM': 'jti',
    
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(hours=8),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=7),
}

# CORS Configuration - Permissif en développement
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_EXPOSE_HEADERS = [
    'Content-Disposition',
    'Content-Type',
    'Content-Length',
    'content-disposition',
    'content-type',
    'content-length',
]
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'https://localhost:3002',
    'https://127.0.0.1:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3003',
    'http://172.29.131.157:3002',
    'https://localhost:3002',
    'https://127.0.0.1:3002',
    'https://localhost:3003',
    'https://127.0.0.1:3003',
    'https://172.29.131.157:3002',
]

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLED = os.environ.get('CELERY_ENABLED', 'True') == 'True'

# Celery Beat Schedule - Planification automatique des rapports
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    # Vérifier toutes les heures les planifications de rapports
    'check-automatic-reports': {
        'task': 'rapports.tasks.generate_automatic_reports',
        'schedule': crontab(minute='0'),  # Toutes les heures à :00
    },
    # Rapport statistique quotidien (tous les jours à 08:00)
    'daily-statistics-report': {
        'task': 'rapports.tasks.generate_daily_statistics_report',
        'schedule': crontab(hour='8', minute='0'),  # 08:00 chaque jour
    },
    # Rapport statistique hebdomadaire (tous les lundis à 08:00)
    'weekly-statistics-report': {
        'task': 'rapports.tasks.generate_weekly_statistics_report',
        'schedule': crontab(hour='8', minute='0', day_of_week='1'),  # Lundi 08:00
    },
    # Rapport statistique mensuel (1er de chaque mois à 08:00)
    'monthly-statistics-report': {
        'task': 'rapports.tasks.generate_monthly_statistics_report',
        'schedule': crontab(hour='8', minute='0', day_of_month='1'),  # 1er du mois à 08:00
    },
    # Rapport statistique annuel (1er janvier à 08:00)
    'yearly-statistics-report': {
        'task': 'rapports.tasks.generate_yearly_statistics_report',
        'schedule': crontab(hour='8', minute='0', day_of_month='1', month_of_year='1'),  # 1er janvier à 08:00
    },
    # Rapport d'audit quotidien (tous les jours à 09:00)
    'daily-audit-report': {
        'task': 'rapports.tasks.generate_daily_audit_report',
        'schedule': crontab(hour='9', minute='0'),  # 09:00 chaque jour
    },
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'utilisateur': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'criminel': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'biometrie': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'insightface': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'onnxruntime': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# En mode développement, utiliser le backend console pour afficher les emails dans la console
# En production, configurer un vrai serveur SMTP
# 
# POUR ENVOYER DES EMAILS RÉELS, DÉCOMMENTEZ ET CONFIGUREZ LES VARIABLES CI-DESSOUS :
# 1. Créez un mot de passe d'application Gmail : https://myaccount.google.com/apppasswords
# 2. Remplacez 'votre_email@gmail.com' par votre email Gmail
# 3. Remplacez 'votre_mot_de_passe_application' par le mot de passe de 16 caractères généré

# Configuration email désactivée - le système n'utilise pas l'envoi d'email
# Les champs email dans les modèles sont conservés pour stockage mais aucun envoi n'est effectué

# ============================================================================
# CONFIGURATION UPR - RECONNAISSANCE FACIALE
# ============================================================================
# Seuil de reconnaissance faciale pour face_recognition (distance euclidienne)
# Plus petit = plus strict (0.4 = très strict, 0.6 = modéré, 0.7 = permissif)
# Valeur par défaut : 0.6 (recommandé pour un bon équilibre précision/recall)
UPR_FACE_RECOGNITION_THRESHOLD = float(os.environ.get('UPR_FACE_RECOGNITION_THRESHOLD', '0.6'))

# Index de caméra USB par défaut pour la capture UPR
UPR_CAMERA_INDEX = int(os.environ.get('UPR_CAMERA_INDEX', '0'))

# ============================================================================
# CONFIGURATION HAYSTACK - RECHERCHE AVANCÉE
# ============================================================================
HAYSTACK_CONNECTIONS = {
    'default': {
        'ENGINE': 'haystack.backends.whoosh_backend.WhooshEngine',
        'PATH': os.path.join(BASE_DIR, 'whoosh_index'),
    },
}

# Configuration de l'indexation automatique
HAYSTACK_SIGNAL_PROCESSOR = 'haystack.signals.RealtimeSignalProcessor'

# Nombre de résultats par défaut
HAYSTACK_SEARCH_RESULTS_PER_PAGE = 20

