/**
 * Service API central
 * Configure Axios pour toutes les requêtes HTTP vers le backend Django
 */

import axios from 'axios'
import ENV from '../config/environment'
import API_CONFIG from '../config/api'
import { getAuthToken, clearAuthData, saveAuthToken } from '../utils/sessionStorage'
import { refreshAuthToken } from './tokenRefresh'
import { isNetworkError, getErrorMessage } from '../utils/errorHandler'

const OFFLINE_EVENT = 'api:offline'
const OFFLINE_COOLDOWN = 15000
let lastOfflineNotification = 0

const emitOfflineEvent = (detail = {}) => {
  if (typeof window === 'undefined') {
    return
  }
  const now = Date.now()
  if (now - lastOfflineNotification < OFFLINE_COOLDOWN) {
    return
  }
  lastOfflineNotification = now
  window.dispatchEvent(
    new CustomEvent(OFFLINE_EVENT, {
      detail: {
        message: detail.message || 'Connexion au serveur indisponible.',
        url: detail.url,
        method: detail.method,
      },
    })
  )
}

/**
 * Instance Axios configurée pour l'API
 */
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
})

/**
 * Intercepteur de requête
 * Ajoute automatiquement le token d'authentification à toutes les requêtes
 */
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Pour FormData, ne pas définir Content-Type manuellement
    // Axios le fera automatiquement avec le bon boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    return config
  },
  (error) => {
    // Ne pas logger les erreurs réseau (serveur non disponible)
    // Ces erreurs sont normales si le serveur n'est pas démarré
    if (error.code !== 'ERR_NETWORK' && error.code !== 'ERR_CONNECTION_REFUSED') {
      console.error('Erreur de requête:', error)
    }
    return Promise.reject(error)
  }
)

/**
 * Intercepteur de réponse
 * Gère les erreurs globales et le refresh automatique du token
 */
api.interceptors.response.use(
  (response) => {
    // Si on reçoit une réponse, le serveur est disponible
    // Réinitialiser le flag d'indisponibilité
    if (typeof window !== 'undefined' && sessionStorage) {
      sessionStorage.removeItem('server_unavailable')
    }
    return response
  },
  async (error) => {
    const { response, config } = error

    // Détecter les erreurs de connexion réseau
    const isNetworkError = 
      error.code === 'ERR_NETWORK' || 
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Pas de réponse du serveur') ||
      (!error.response && error.request)
    
    const isNonCriticalEndpoint = 
      config?.url?.includes('/check-role-changes/') ||
      config?.url?.includes('/statut_ia/') ||
      config?.url?.includes('/statistiques/') ||
      config?.url?.includes('/utilisateur/me/') || // Endpoint de récupération utilisateur actuel
      config?.url?.includes('/upr/') || // Endpoint UPR - peut être non disponible si serveur non démarré
      config?.url?.includes('/audit/') || // Endpoint audit - peut être non disponible si serveur non démarré
      config?.url?.includes('/rapports/') || // Endpoint rapports - peut être non disponible si serveur non démarré
      config?.url?.includes('/criminel/fiches-criminelles/geographic-stats/') || // Stats géographiques
      config?.url?.includes('/criminel/fiches-criminelles/monthly-stats/') || // Stats mensuelles
      config?.url?.includes('/criminel/fiches-criminelles/evolution-stats/') // Stats d'évolution
    
    // Si c'est une erreur réseau sur un endpoint non critique, ignorer silencieusement
    if (isNetworkError && isNonCriticalEndpoint) {
      // Ne pas logger - c'est normal si le serveur n'est pas démarré
      // Retourner une réponse vide plutôt que de rejeter pour les endpoints spécifiques
      if (config?.url?.includes('/check-role-changes/')) {
      return Promise.resolve({ data: { has_changes: false } })
      }
      // Pour /utilisateur/me/, rejeter silencieusement (sera géré par authService)
      return Promise.reject(error)
    }
    
    // Pour les erreurs de connexion sur les endpoints critiques, améliorer le message d'erreur
    if (isNetworkError) {
      // Améliorer le message d'erreur pour qu'il soit plus informatif
      // Utiliser le gestionnaire d'erreurs centralisé
      const errorInfo = getErrorMessage(error)
      error.userMessage = errorInfo.message
      error.title = errorInfo.title
      error.errorType = errorInfo.type
      // Ne pas logger ces erreurs de manière répétitive
      const errorKey = `network_error_${config?.url || 'unknown'}`
      const lastLogged = sessionStorage.getItem(errorKey)
      const now = Date.now()
      
      // Logger seulement toutes les 5 secondes pour éviter le spam
      // Ne pas logger pour les endpoints non-critiques si le serveur n'est pas disponible
      if (!isNonCriticalEndpoint) {
      if (!lastLogged || (now - parseInt(lastLogged)) > 5000) {
        console.warn('Serveur non accessible:', config?.url || 'URL inconnue')
        sessionStorage.setItem(errorKey, now.toString())
        }
      }
      
      return Promise.reject(error)
    }

    // Gestion des erreurs courantes
    if (response) {
      if (
        config?.method === 'delete' &&
        config?.url?.includes('/utilisateur/utilisateurs/')
      ) {
        console.error('Erreur suppression:', response.data || error.message)
      }
      switch (response.status) {
        case 401:
          // Non autorisé - Tenter de rafraîchir le token
          // SAUF pour les endpoints de login, register et refresh token
          const isAuthEndpoint = config.url?.includes('/auth/token/refresh/') || 
                                 config.url?.includes('/utilisateur/login/') ||
                                 config.url?.includes('/utilisateur/register/')
          
          const isUserManagementEndpoint = config.url?.includes('/utilisateur/utilisateurs/')
          
          // Ne pas rafraîchir pour les endpoints d'authentification
          if (isAuthEndpoint) {
            return Promise.reject(error)
          }
          
          // Pour les endpoints de gestion des utilisateurs, vérifier si c'est vraiment une expiration de token
          // ou juste un problème de permissions
          if (isUserManagementEndpoint && response.data?.detail?.includes('permission')) {
            // Problème de permissions, ne pas rafraîchir
            return Promise.reject(error)
          }

          // Vérifier si on a déjà tenté de rafraîchir (éviter les boucles infinies)
          if (config._retry) {
            clearAuthData()
            if (window.location.pathname !== '/connexion') {
              window.location.href = '/connexion'
            }
            return Promise.reject(error)
          }

          try {
            config._retry = true // Marquer qu'on a tenté de rafraîchir
            
            // Vérifier si un refresh token existe avant d'essayer de rafraîchir
            const { getRefreshToken } = await import('../utils/storage')
            const refreshToken = getRefreshToken()
            
            if (!refreshToken) {
              // Pas de refresh token, ne pas essayer de rafraîchir
              // Ne pas logger si c'est juste une déconnexion normale
              const isLogoutRequest = config.url?.includes('/logout/') || config.url?.includes('/disconnect/')
              if (!isLogoutRequest) {
              clearAuthData()
              if (window.location.pathname !== '/connexion') {
                window.location.href = '/connexion'
                }
              }
              return Promise.reject(new Error('Aucun refresh token disponible'))
            }
            
            const newToken = await refreshAuthToken()
            config.headers.Authorization = `Bearer ${newToken}`
            return api(config)
          } catch (refreshError) {
            // Ne pas logger l'erreur si c'est juste qu'il n'y a pas de refresh token
            // ou si c'est une requête de déconnexion
            const isLogoutRequest = config.url?.includes('/logout/') || config.url?.includes('/disconnect/')
            if (!refreshError.message?.includes('refresh token') && !isLogoutRequest) {
              console.error('Erreur lors du rafraîchissement du token:', refreshError)
            }
            // Ne pas rediriger si c'est une requête de déconnexion
            if (!isLogoutRequest) {
            clearAuthData()
            if (window.location.pathname !== '/connexion') {
              window.location.href = '/connexion'
              }
            }
            return Promise.reject(refreshError)
          }

        case 403:
        case 404:
          break
          
        case 500:
        case 503:
          // Ne logger les erreurs 500/503 que si ce n'est pas une erreur de statistiques (pour éviter les logs répétitifs)
          if (!config.url?.includes('/statistiques/') && !config.url?.includes('/stats/')) {
            console.error(`Erreur serveur ${response.status}:`, response.data)
          }
          if (response.status === 503) {
            emitOfflineEvent({ url: config?.url, method: config?.method, message: 'Le serveur est temporairement indisponible.' })
          }
          break

        default:
          console.error(`Erreur ${response.status}:`, response.data)
      }
    } else if (error.request) {
      // Harmoniser le message réseau pour le reste de l'application
      // Utiliser le gestionnaire d'erreurs centralisé
      const errorInfo = getErrorMessage(error)
      error.message = errorInfo.message
      error.userMessage = errorInfo.message
      error.title = errorInfo.title
      error.errorType = errorInfo.type
      
      // Vérifier si le serveur a déjà été marqué comme indisponible pour éviter les événements répétitifs
      const serverUnavailable = typeof window !== 'undefined' && sessionStorage 
        ? sessionStorage.getItem('server_unavailable') 
        : null
      
      // Émettre l'événement seulement si pas déjà marqué (pour éviter les notifications répétitives)
      if (!serverUnavailable) {
      emitOfflineEvent({ url: config?.url, method: config?.method, message: defaultNetworkMessage })
      }

      // Marquer le serveur comme indisponible pour éviter les requêtes répétées
      if (isNetworkError && typeof window !== 'undefined' && sessionStorage) {
        sessionStorage.setItem('server_unavailable', 'true')
      }

      // Ne pas logger les erreurs de connexion refusée - c'est normal si le serveur n'est pas démarré
      // Éviter le spam dans la console
      const shouldLogError = 
        error.code !== 'ERR_NETWORK' &&
        error.code !== 'ERR_CONNECTION_REFUSED' &&
        error.code !== 'ECONNABORTED' &&
        !error.message?.includes('ERR_CONNECTION_REFUSED') &&
        !error.message?.includes('Pas de réponse du serveur')
      
      if (shouldLogError && !isNonCriticalEndpoint) {
          console.debug('Aucune réponse du serveur', error.message || error.code)
      }
    } else {
      // Ne logger que si ce n'est pas une erreur réseau normale
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ERR_CONNECTION_REFUSED') {
        console.error('Erreur de configuration:', error.message)
      }
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
        emitOfflineEvent({ url: config?.url, method: config?.method })
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Helper pour les requêtes GET
 * @param {string} url - URL de l'endpoint
 * @param {object} config - Configuration Axios
 */
export const get = (url, config = {}) => api.get(url, config)

/**
 * Helper pour les requêtes POST
 * @param {string} url - URL de l'endpoint
 * @param {object} data - Données à envoyer
 * @param {object} config - Configuration Axios
 */
export const post = (url, data, config = {}) => api.post(url, data, config)

/**
 * Helper pour les requêtes PUT
 * @param {string} url - URL de l'endpoint
 * @param {object} data - Données à envoyer
 * @param {object} config - Configuration Axios
 */
export const put = (url, data, config = {}) => api.put(url, data, config)

/**
 * Helper pour les requêtes PATCH
 * @param {string} url - URL de l'endpoint
 * @param {object} data - Données à envoyer
 * @param {object} config - Configuration Axios
 */
export const patch = (url, data, config = {}) => api.patch(url, data, config)

/**
 * Helper pour les requêtes DELETE
 * @param {string} url - URL de l'endpoint
 * @param {object} config - Configuration Axios
 */
export const del = (url, config = {}) => api.delete(url, config)

/**
 * Upload de fichiers avec suivi de progression
 * @param {string} url - URL de l'endpoint
 * @param {File} file - Fichier à uploader
 * @param {Function} onProgress - Callback de progression (pourcentage)
 * @param {object} additionalData - Données supplémentaires à envoyer
 */
export const uploadFile = (url, file, onProgress = null, additionalData = {}) => {
  const formData = new FormData()
  formData.append('file', file)

  // Ajouter des données supplémentaires si fournies
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key])
  })

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }

  // Ajouter le callback de progression si fourni
  if (onProgress && typeof onProgress === 'function') {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      )
      onProgress(percentCompleted)
    }
  }

  return api.post(url, formData, config)
}

/**
 * Upload de plusieurs fichiers
 * @param {string} url - URL de l'endpoint
 * @param {FileList|Array} files - Fichiers à uploader
 * @param {Function} onProgress - Callback de progression
 * @param {object} additionalData - Données supplémentaires
 */
export const uploadMultipleFiles = (url, files, onProgress = null, additionalData = {}) => {
  const formData = new FormData()

  // Ajouter tous les fichiers
  Array.from(files).forEach((file, index) => {
    formData.append(`file_${index}`, file)
  })

  // Ajouter des données supplémentaires
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key])
  })

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }

  if (onProgress && typeof onProgress === 'function') {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      )
      onProgress(percentCompleted)
    }
  }

  return api.post(url, formData, config)
}

/**
 * Requête avec retry automatique
 * @param {Function} requestFn - Fonction de requête à exécuter
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @param {number} delay - Délai entre les tentatives (ms)
 */
export const requestWithRetry = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error
      console.warn(`Tentative ${i + 1}/${maxRetries} échouée, nouvelle tentative dans ${delay}ms...`)

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// Export de l'instance Axios par défaut
export default api

