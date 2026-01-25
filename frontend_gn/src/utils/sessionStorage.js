/**
 * Utilitaires pour la gestion du stockage sessionStorage
 * Isolé par onglet pour éviter les conflits entre sessions
 */

import ENV from '../config/environment'

/**
 * Générer un identifiant unique pour cette session/onglet
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

/**
 * Sauvegarder le token d'authentification dans sessionStorage (isolé par onglet)
 * @param {string} token - Token d'authentification
 */
export const saveAuthToken = (token) => {
  try {
    sessionStorage.setItem(ENV.STORAGE_KEYS.AUTH_TOKEN, token)
    // Sauvegarder aussi l'ID utilisateur associé au token pour validation
    const sessionId = getSessionId()
    sessionStorage.setItem(`${ENV.STORAGE_KEYS.AUTH_TOKEN}_session`, sessionId)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token:', error)
  }
}

/**
 * Récupérer le token d'authentification depuis sessionStorage
 * @returns {string|null} Token ou null
 */
export const getAuthToken = () => {
  try {
    return sessionStorage.getItem(ENV.STORAGE_KEYS.AUTH_TOKEN)
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error)
    return null
  }
}

/**
 * Sauvegarder les données de l'utilisateur avec protection par session
 * @param {object} userData - Données de l'utilisateur
 */
export const saveUserData = (userData) => {
  try {
    const sessionId = getSessionId()
    const dataWithSession = {
      ...userData,
      _sessionId: sessionId,
      _timestamp: Date.now()
    }
    // Sauvegarder dans localStorage avec l'ID de session
    // Chaque onglet a son propre sessionId, donc les données sont isolées
    localStorage.setItem(`${ENV.STORAGE_KEYS.USER_DATA}_${sessionId}`, JSON.stringify(dataWithSession))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données utilisateur:', error)
  }
}

/**
 * Récupérer les données de l'utilisateur pour la session actuelle
 * @returns {object|null} Données utilisateur ou null
 */
export const getUserData = () => {
  try {
    const sessionId = getSessionId()
    const data = localStorage.getItem(`${ENV.STORAGE_KEYS.USER_DATA}_${sessionId}`)
    if (data) {
      const userData = JSON.parse(data)
      // Vérifier que c'est bien pour cette session
      if (userData._sessionId === sessionId) {
        // Retirer les métadonnées de session avant de retourner
        const { _sessionId, _timestamp, ...cleanData } = userData
        return cleanData
      }
    }
    return null
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur:', error)
    return null
  }
}

/**
 * Sauvegarder le refresh token dans sessionStorage
 * @param {string} refreshToken - Refresh token
 */
export const saveRefreshToken = (refreshToken) => {
  try {
    sessionStorage.setItem(ENV.STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du refresh token:', error)
  }
}

/**
 * Récupérer le refresh token depuis sessionStorage
 * @returns {string|null} Refresh token ou null
 */
export const getRefreshToken = () => {
  try {
    return sessionStorage.getItem(ENV.STORAGE_KEYS.REFRESH_TOKEN)
  } catch (error) {
    console.error('Erreur lors de la récupération du refresh token:', error)
    return null
  }
}

/**
 * Effacer toutes les données d'authentification pour cette session
 */
export const clearAuthData = () => {
  try {
    const sessionId = getSessionId()
    sessionStorage.removeItem(ENV.STORAGE_KEYS.AUTH_TOKEN)
    sessionStorage.removeItem(ENV.STORAGE_KEYS.REFRESH_TOKEN)
    sessionStorage.removeItem(`${ENV.STORAGE_KEYS.AUTH_TOKEN}_session`)
    localStorage.removeItem(`${ENV.STORAGE_KEYS.USER_DATA}_${sessionId}`)
    // Ne pas supprimer session_id pour garder la trace
  } catch (error) {
    console.error('Erreur lors de l\'effacement des données:', error)
  }
}

/**
 * Vérifier si l'utilisateur est authentifié pour cette session
 * @returns {boolean} true si authentifié
 */
export const isAuthenticated = () => {
  const token = getAuthToken()
  const userData = getUserData()
  return !!(token && userData)
}

/**
 * Obtenir l'ID de session actuel
 * @returns {string} ID de session
 */
export const getCurrentSessionId = () => {
  return getSessionId()
}

