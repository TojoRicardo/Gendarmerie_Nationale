/**
 * Configuration de l'environnement de l'application
 * Centralise toutes les variables d'environnement
 */

const ENV = {
  // URL de base de l'API Django (les routes sont maintenant sous /api/)
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  
  // Informations de l'application
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SGIC Gendarmerie Nationale',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Clés de stockage localStorage
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    REFRESH_TOKEN: 'refresh_token',
  },
  
  // Configuration de sécurité
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 heures en millisecondes
  TOKEN_REFRESH_INTERVAL: 2 * 60 * 1000, // Rafraîchir toutes les 2 minutes
  INACTIVITY_TIMEOUT: 20 * 60 * 1000, // Déconnexion après 20 minutes d'inactivité
  INACTIVITY_WARNING_TIME: 2 * 60 * 1000, // Avertir 2 minutes avant la déconnexion
  
  // Configuration des fichiers
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  
  // Timeouts
  API_TIMEOUT: 30000, // 30 secondes
  
  // Mode de développement
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
}

export default ENV

