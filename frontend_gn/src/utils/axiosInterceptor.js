/**
 * Intercepteur Axios pour gérer automatiquement le rafraîchissement des tokens
 * et les erreurs d'authentification
 */

import axios from 'axios'
import { getAuthToken, saveAuthToken, clearAuthData } from './sessionStorage'
import { refreshAuthToken } from '../services/tokenRefresh'

// File d'attente pour les requêtes en attente de refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

/**
 * Configurer les intercepteurs Axios
 */
export const setupAxiosInterceptors = () => {
  // Intercepteur de requête : ajouter le token à chaque requête
  axios.interceptors.request.use(
    (config) => {
      const token = getAuthToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Intercepteur de réponse : gérer les erreurs 401 (token expiré)
  axios.interceptors.response.use(
    (response) => {
      return response
    },
    async (error) => {
      // Ignorer les erreurs d'extensions de navigateur
      const errorMessage = (error?.message || error?.toString() || '').toLowerCase()
      if (
        errorMessage.includes('could not establish connection') ||
        errorMessage.includes('receiving end does not exist') ||
        errorMessage.includes('extension context invalidated') ||
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('moz-extension://')
      ) {
        // Retourner une erreur silencieuse pour ne pas perturber l'application
        return Promise.reject(new Error('Extension error (ignored)'))
      }
      
      const originalRequest = error.config

      // Si l'erreur n'est pas 401 ou si c'est une requête de refresh, rejeter directement
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error)
      }

      // Si l'erreur est sur l'endpoint de refresh, déconnecter l'utilisateur
      if (originalRequest.url?.includes('/auth/token/refresh/')) {
        clearAuthData()
        window.location.href = '/connexion'
        return Promise.reject(error)
      }

      // Si un refresh est déjà en cours, ajouter la requête à la file d'attente
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axios(originalRequest)
          })
          .catch(err => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Tenter de rafraîchir le token
        const newToken = await refreshAuthToken()
        
        // Sauvegarder le nouveau token
        saveAuthToken(newToken)
        
        // Mettre à jour le header de la requête originale
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        
        // Traiter les requêtes en attente
        processQueue(null, newToken)
        
        // Réessayer la requête originale
        return axios(originalRequest)
      } catch (refreshError) {
        // Si le refresh échoue, déconnecter l'utilisateur
        processQueue(refreshError, null)
        clearAuthData()
        window.location.href = '/connexion'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
  )
}

export default setupAxiosInterceptors

