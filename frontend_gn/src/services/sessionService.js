/**
 * Service pour gérer les sessions actives et les utilisateurs connectés
 */
import api from './api'

/**
 * Récupère tous les utilisateurs actuellement connectés
 */
export const getActiveUsers = async () => {
  try {
    const response = await api.get('/utilisateurs/actifs/')
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs actifs:', error)
    throw error
  }
}

/**
 * Récupère spécifiquement les Enquêteurs Principaux connectés
 */
export const getActiveInvestigators = async () => {
  try {
    const response = await api.get('/utilisateurs/actifs/enqueteurs-principaux/')
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des enquêteurs actifs:', error)
    throw error
  }
}

/**
 * Récupère les utilisateurs actifs par rôle
 * @param {string} role - Nom du rôle (optionnel)
 */
export const getActiveUsersByRole = async (role = null) => {
  try {
    const url = role
      ? `/utilisateurs/actifs/par-role/?role=${encodeURIComponent(role)}`
      : '/utilisateurs/actifs/par-role/'
    const response = await api.get(url)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs actifs par rôle:', error)
    throw error
  }
}

/**
 * Récupère la liste des permissions et rôles disponibles
 */
export const getPermissionsAndRoles = async () => {
  try {
    const response = await api.get('/permissions/')
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error)
    throw error
  }
}

