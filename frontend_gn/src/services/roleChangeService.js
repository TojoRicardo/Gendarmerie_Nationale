import api from './api'
import { getAuthToken } from '../utils/sessionStorage'

/**
 * Service pour gérer les notifications de changement de rôle/permission
 */
const roleChangeService = {
  /**
   * Notifier un utilisateur que son rôle/permissions ont changé
   * @param {string} userId - ID de l'utilisateur concerné
   * @param {object} changes - Détails des changements (oldRole, newRole, etc.)
   */
  notifyUserRoleChange: async (userId, changes) => {
    try {
      const response = await api.post(
        `/utilisateur/users/${userId}/notify-role-change`,
        changes
      )
      return response.data
    } catch (error) {
      console.error('Erreur lors de la notification de changement de rôle:', error)
      throw error
    }
  },

  /**
   * Vérifier si l'utilisateur actuel a des changements de rôle en attente
   * @returns {object} { hasChanges: boolean, lastUpdate: string }
   */
  checkForRoleChanges: async () => {
    try {
      // Vérifier si l'utilisateur est authentifié avant de faire la requête
      const token = getAuthToken()
      if (!token) {
        // Pas de token, ne pas faire la requête
        return { has_changes: false }
      }

      const response = await api.get('/utilisateur/check-role-changes/')
      return response.data
    } catch (error) {
      // Ignorer COMPLÈTEMENT toutes les erreurs réseau et d'authentification
      // Ne pas logger pour éviter le spam dans la console
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ERR_CONNECTION_REFUSED' || 
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Failed to fetch') ||
        !error.response
      
      const isAuthError = error.response?.status === 404 || error.response?.status === 401
      const isRefreshTokenError = 
        error.message?.includes('refresh token') || 
        error.message?.includes('Aucun refresh token')
      
      // Si c'est une erreur réseau, auth ou refresh token, ignorer silencieusement
      if (isNetworkError || isAuthError || isRefreshTokenError) {
        return { has_changes: false }
      }
      
      // Pour toutes les autres erreurs, retourner false silencieusement
      // Ne pas logger pour éviter le spam
      return { has_changes: false }
    }
  },

  /**
   * Marquer les changements de rôle comme vus par l'utilisateur
   */
  acknowledgeRoleChanges: async () => {
    try {
      const response = await api.post(
        '/utilisateur/users/acknowledge-role-changes',
        {}
      )
      return response.data
    } catch (error) {
      console.error('Erreur lors de l\'accusé de réception des changements:', error)
      throw error
    }
  }
}

export default roleChangeService

