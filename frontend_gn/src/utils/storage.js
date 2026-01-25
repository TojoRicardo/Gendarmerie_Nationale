/**
 * Utilitaires pour la gestion du stockage localStorage
 * Centralise toutes les opérations de stockage pour l'authentification
 */

import ENV from '../config/environment'

/**
 * Sauvegarder le token d'authentification
 * @param {string} token - Token d'authentification
 */
export const saveAuthToken = (token) => {
  try {
    localStorage.setItem(ENV.STORAGE_KEYS.AUTH_TOKEN, token)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token:', error)
  }
}

/**
 * Récupérer le token d'authentification
 * @returns {string|null} Token ou null
 */
export const getAuthToken = () => {
  try {
    return localStorage.getItem(ENV.STORAGE_KEYS.AUTH_TOKEN)
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error)
    return null
  }
}

/**
 * Sauvegarder les données de l'utilisateur
 * @param {object} userData - Données de l'utilisateur
 */
export const saveUserData = (userData) => {
  try {
    localStorage.setItem(ENV.STORAGE_KEYS.USER_DATA, JSON.stringify(userData))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données utilisateur:', error)
  }
}

/**
 * Récupérer les données de l'utilisateur
 * @returns {object|null} Données utilisateur ou null
 */
export const getUserData = () => {
  try {
    const data = localStorage.getItem(ENV.STORAGE_KEYS.USER_DATA)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur:', error)
    return null
  }
}

/**
 * Sauvegarder le refresh token
 * @param {string} refreshToken - Refresh token
 */
export const saveRefreshToken = (refreshToken) => {
  try {
    localStorage.setItem(ENV.STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du refresh token:', error)
  }
}

/**
 * Récupérer le refresh token
 * @returns {string|null} Refresh token ou null
 */
export const getRefreshToken = () => {
  try {
    return localStorage.getItem(ENV.STORAGE_KEYS.REFRESH_TOKEN)
  } catch (error) {
    console.error('Erreur lors de la récupération du refresh token:', error)
    return null
  }
}

/**
 * Effacer toutes les données d'authentification
 */
export const clearAuthData = () => {
  try {
    localStorage.removeItem(ENV.STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(ENV.STORAGE_KEYS.USER_DATA)
    localStorage.removeItem(ENV.STORAGE_KEYS.REFRESH_TOKEN)
  } catch (error) {
    console.error('Erreur lors de l\'effacement des données:', error)
  }
}

/**
 * Vérifier si l'utilisateur est authentifié
 * @returns {boolean} true si authentifié
 */
export const isAuthenticated = () => {
  const token = getAuthToken()
  const userData = getUserData()
  return !!(token && userData)
}

