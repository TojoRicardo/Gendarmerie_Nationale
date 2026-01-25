/**
 * Service de gestion du refresh token
 * Gère le renouvellement automatique du token d'authentification
 */

import { getAuthToken, getRefreshToken, saveAuthToken, saveRefreshToken, clearAuthData } from '../utils/sessionStorage'
import API_CONFIG from '../config/api'

let isRefreshing = false
let refreshSubscribers = []

/**
 * Ajouter un abonné au refresh token
 */
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback)
}

/**
 * Notifier tous les abonnés que le token a été rafraîchi
 */
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken))
  refreshSubscribers = []
}

/**
 * Rafraîchir le token d'authentification
 * @returns {Promise<string>} Nouveau token
 */
export const refreshAuthToken = async () => {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    throw new Error('Aucun refresh token disponible')
  }

  if (isRefreshing) {
    // Si un refresh est déjà en cours, attendre qu'il se termine
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        resolve(newToken)
      })
    })
  }

  isRefreshing = true

  try {
    // Appeler l'endpoint de refresh token
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error('Impossible de rafraîchir le token')
    }

    const data = await response.json()
    const { access, refresh } = data

    // Sauvegarder les nouveaux tokens
    saveAuthToken(access)
    if (refresh) {
      saveRefreshToken(refresh)
    }

    // Notifier tous les abonnés
    onTokenRefreshed(access)

    return access
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error)
    // En cas d'erreur, déconnecter l'utilisateur
    clearAuthData()
    throw error
  } finally {
    isRefreshing = false
  }
}

/**
 * Vérifier si le token doit être rafraîchi
 * @returns {boolean} true si le token doit être rafraîchi
 */
export const shouldRefreshToken = () => {
  const token = getAuthToken()
  
  if (!token) {
    return false
  }

  // En mode mock, les tokens ne sont pas des vrais JWT et n'expirent pas
  if (token.startsWith('mock_token_')) {
    return false
  }

  try {
    // Décoder le JWT pour obtenir la date d'expiration
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000 // Convertir en millisecondes
    const now = Date.now()
    
    // Rafraîchir si le token expire dans moins de 10 minutes
    const timeUntilExpiry = exp - now
    return timeUntilExpiry < 10 * 60 * 1000
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error)
    return false
  }
}

/**
 * Vérifier et rafraîchir le token si nécessaire
 */
export const checkAndRefreshToken = async () => {
  if (shouldRefreshToken()) {
    try {
      await refreshAuthToken()
      console.log(' Token rafraîchi avec succès')
    } catch (error) {
      console.error(' Échec du rafraîchissement du token:', error)
    }
  }
}

export default {
  refreshAuthToken,
  shouldRefreshToken,
  checkAndRefreshToken,
}

