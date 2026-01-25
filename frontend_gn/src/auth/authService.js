/**
 * Service d'authentification amélioré
 * Gestion normalisée des erreurs, protection CSRF, sécurité renforcée
 */

import { post } from '../services/api'
import {
  saveAuthToken,
  saveUserData,
  clearAuthData,
  saveRefreshToken,
  getUserData,
} from '../utils/sessionStorage'

/**
 * Format de réponse normalisé pour toutes les opérations d'authentification
 * @typedef {Object} AuthResponse
 * @property {boolean} success - Indique si l'opération a réussi
 * @property {string} message - Message descriptif
 * @property {Object} user - Données utilisateur (si succès)
 * @property {string} token - Token d'accès (si succès)
 * @property {string} refresh - Refresh token (si succès)
 * @property {Object} errors - Erreurs détaillées (si échec)
 */

/**
 * Extraction normalisée des messages d'erreur depuis la réponse backend
 * @param {Object} error - Erreur Axios
 * @returns {string} Message d'erreur formaté
 */
import { getErrorMessage, isNetworkError as checkNetworkError } from '../utils/errorHandler'

const extractErrorMessage = (error) => {
  const responseData = error.response?.data

  // Erreurs réseau - utiliser le gestionnaire centralisé
  if (checkNetworkError(error)) {
    const errorInfo = getErrorMessage(error)
    return errorInfo.message
  }

  if (!responseData) {
    return error.message || 'Une erreur inattendue s\'est produite.'
  }

  // Priorité 1: Erreurs non-field (compte suspendu, désactivé, etc.)
  if (responseData.non_field_errors) {
    const nonFieldMsg = Array.isArray(responseData.non_field_errors) 
      ? responseData.non_field_errors[0] 
      : responseData.non_field_errors
    
    if (typeof nonFieldMsg === 'object' && nonFieldMsg.toString) {
      return nonFieldMsg.toString()
    }
    return String(nonFieldMsg)
  }

  // Priorité 2: Erreur sur le champ email
  if (responseData.email) {
    return Array.isArray(responseData.email) ? responseData.email[0] : responseData.email
  }

  // Priorité 3: Erreur sur le champ username
  if (responseData.username) {
    return Array.isArray(responseData.username) ? responseData.username[0] : responseData.username
  }

  // Priorité 4: Erreur sur le champ password
  if (responseData.password) {
    return Array.isArray(responseData.password) ? responseData.password[0] : responseData.password
  }

  // Priorité 5: Message détaillé
  if (responseData.detail) {
    return responseData.detail
  }

  // Priorité 6: Message générique
  if (responseData.message) {
    return responseData.message
  }

  // Priorité 7: Formatage manuel si plusieurs erreurs
  const errorMessages = []
  if (responseData.email) {
    errorMessages.push(Array.isArray(responseData.email) ? responseData.email[0] : responseData.email)
  }
  if (responseData.username) {
    errorMessages.push(Array.isArray(responseData.username) ? responseData.username[0] : responseData.username)
  }
  if (responseData.password) {
    errorMessages.push(Array.isArray(responseData.password) ? responseData.password[0] : responseData.password)
  }

  return errorMessages.length > 0 ? errorMessages.join('. ') : 'Erreur de connexion'
}

/**
 * Connexion utilisateur avec gestion d'erreurs normalisée
 * @param {Object} credentials - {email/username, password}
 * @returns {Promise<AuthResponse>} Réponse normalisée
 */
export const login = async (credentials) => {
  try {
    // Protection contre les attaques bruteforce (rate limiting côté client)
    const loginAttempts = parseInt(sessionStorage.getItem('login_attempts') || '0')
    const lastAttemptTime = parseInt(sessionStorage.getItem('last_login_attempt') || '0')
    const now = Date.now()
    
    // Réinitialiser après 15 minutes
    if (now - lastAttemptTime > 15 * 60 * 1000) {
      sessionStorage.setItem('login_attempts', '0')
    }
    
    // Bloquer après 5 tentatives échouées
    if (loginAttempts >= 5) {
      throw {
        success: false,
        message: 'Trop de tentatives de connexion échouées. Veuillez patienter 15 minutes avant de réessayer.',
        errors: { rate_limit: true }
      }
    }

    // Requête API
    const response = await post('/utilisateur/login/', credentials)
    const loginData = response.data || response

    const { token, refresh, user, access } = loginData

    // Vérifier que le token est présent
    const authToken = access || token
    if (!authToken) {
      throw {
        success: false,
        message: 'Aucun token reçu du backend',
        errors: {}
      }
    }

    // Sauvegarder les tokens et données utilisateur
    saveAuthToken(authToken)
    saveUserData(user)
    
    if (refresh) {
      saveRefreshToken(refresh)
    }

    // Réinitialiser les tentatives de connexion
    sessionStorage.setItem('login_attempts', '0')
    sessionStorage.setItem('last_login_attempt', '0')
    sessionStorage.setItem('justLoggedIn', 'true')

    // Retourner une réponse normalisée compatible avec l'ancien format
    return {
      success: true,
      message: 'Connexion réussie',
      user: user,
      token: authToken,
      access: authToken, // Alias pour compatibilité
      refresh: refresh,
      data: loginData, // Données complètes pour compatibilité
    }

  } catch (error) {
    // Incrémenter les tentatives échouées
    const loginAttempts = parseInt(sessionStorage.getItem('login_attempts') || '0')
    sessionStorage.setItem('login_attempts', String(loginAttempts + 1))
    sessionStorage.setItem('last_login_attempt', String(Date.now()))

    // Extraire le message d'erreur
    const errorMessage = extractErrorMessage(error)

    // Ne logger que les erreurs non-réseau
    const isNetworkError = 
      error.code === 'ERR_NETWORK' || 
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('Network Error') ||
      !error.response

    if (!isNetworkError) {
      console.debug('Erreur de connexion:', {
        message: errorMessage,
        hasResponse: !!error.response,
        status: error.response?.status
      })
    }

    // Retourner une réponse normalisée d'erreur
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data || {},
    }
  }
}

/**
 * Déconnexion utilisateur
 * @returns {Promise<AuthResponse>} Réponse normalisée
 */
export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token')
    
    // Appeler l'API de déconnexion
    try {
      await post('/utilisateur/logout/', { refresh_token: refreshToken })
    } catch (apiError) {
      // Non bloquant - continuer même si l'API échoue
      console.warn('Erreur API lors de la déconnexion (non bloquant):', apiError)
    }
    
    // Nettoyer les données locales
    clearAuthData()
    sessionStorage.removeItem('login_attempts')
    sessionStorage.removeItem('last_login_attempt')
    sessionStorage.removeItem('justLoggedIn')

    return {
      success: true,
      message: 'Déconnexion réussie',
    }
  } catch (error) {
    // Même en cas d'erreur, nettoyer les données locales
    clearAuthData()
    sessionStorage.removeItem('login_attempts')
    sessionStorage.removeItem('last_login_attempt')
    
    return {
      success: true,
      message: 'Déconnexion effectuée (nettoyage local)',
    }
  }
}

/**
 * Vérifier si l'utilisateur est authentifié
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  const userData = getUserData()
  return !!(token && userData)
}

/**
 * Récupérer les données utilisateur actuelles
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  return getUserData()
}

export default {
  login,
  logout,
  isAuthenticated,
  getCurrentUser,
}

