/**
 * Service pour la gestion du statut des utilisateurs (actif/inactif)
 */
import { get } from './api'

/**
 * Récupère tous les utilisateurs actifs
 * @returns {Promise<Object>} {success, count, users}
 */
export const getActiveUsers = async () => {
  try {
    const response = await get('/utilisateur/utilisateurs/actifs/')
    return {
      success: true,
      count: response.data.count || 0,
      users: response.data.users || []
    }
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs actifs:', error)
    throw {
      success: false,
      message: error.response?.data?.error || 'Erreur récupération utilisateurs actifs',
      errors: error.response?.data
    }
  }
}

/**
 * Récupère les enquêteurs principaux actifs
 * @returns {Promise<Object>} {success, count, investigators}
 */
export const getActiveInvestigators = async () => {
  try {
    const response = await get('/utilisateur/utilisateurs/actifs/enqueteurs-principaux/')
    return {
      success: true,
      count: response.data.count || 0,
      investigators: response.data.investigators || []
    }
  } catch (error) {
    console.error('❌ Erreur récupération enquêteurs actifs:', error)
    throw {
      success: false,
      message: error.response?.data?.error || 'Erreur récupération enquêteurs actifs',
      errors: error.response?.data
    }
  }
}

/**
 * Récupère les utilisateurs actifs groupés par rôle
 * @param {string|null} role - Rôle spécifique ou null pour tous les rôles
 * @returns {Promise<Object>} Utilisateurs actifs par rôle
 */
export const getActiveUsersByRole = async (role = null) => {
  try {
    const url = role 
      ? `/utilisateur/utilisateurs/actifs/par-role/?role=${encodeURIComponent(role)}`
      : '/utilisateur/utilisateurs/actifs/par-role/'
    
    const response = await get(url)
    
    if (role) {
      // Format: {role, count, users}
      return {
        success: true,
        role: response.data.role,
        count: response.data.count || 0,
        users: response.data.users || []
      }
    } else {
      // Format: {role1: {count, users}, role2: {count, users}, ...}
      return {
        success: true,
        data: response.data
      }
    }
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs par rôle:', error)
    throw {
      success: false,
      message: error.response?.data?.error || 'Erreur récupération utilisateurs par rôle',
      errors: error.response?.data
    }
  }
}

export default {
  getActiveUsers,
  getActiveInvestigators,
  getActiveUsersByRole
}

