/**
 * Service de gestion des investigations
 * Gère toutes les opérations CRUD sur les investigations
 */

import { get, post, put, patch, del } from './apiGlobal'

/**
 * Récupérer la liste de toutes les investigations
 * @param {object} params - Paramètres de filtrage/pagination {page, search, status, priority, etc.}
 * @returns {Promise<object>} Liste paginée des investigations
 */
export const getInvestigations = async (params = {}) => {
  try {
    const response = await get('/criminel/fiches-criminelles/', { params })
    return response.data
  } catch (error) {
    console.error('Erreur récupération investigations:', error)
    throw error
  }
}

/**
 * Récupérer une investigation par son UUID
 * @param {string} uuid - UUID de l'investigation
 * @returns {Promise<object>} Données de l'investigation
 */
export const getInvestigationById = async (uuid) => {
  try {
    const response = await get(`/criminel/fiches-criminelles/${uuid}/`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération investigation:', error)
    throw error
  }
}

/**
 * Créer une nouvelle investigation
 * @param {object} investigationData - Données de l'investigation
 * @returns {Promise<object>} Investigation créée
 */
export const createInvestigation = async (investigationData) => {
  try {
    const response = await post('/criminel/fiches-criminelles/', investigationData)
    console.log(`New case created successfully (Case ID: ${response.data.numero_fiche}) by Investigator`)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur création investigation:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la création de l\'investigation',
      errors: error.response?.data,
    }
  }
}

/**
 * Mettre à jour une investigation
 * @param {string} uuid - UUID de l'investigation
 * @param {object} investigationData - Nouvelles données
 * @returns {Promise<object>} Investigation mise à jour
 */
export const updateInvestigation = async (uuid, investigationData) => {
  try {
    const response = await put(`/criminel/fiches-criminelles/${uuid}/`, investigationData)
    console.log(` Case ${response.data.numero_fiche} status updated`)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur mise à jour investigation:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur de mise à jour',
      errors: error.response?.data,
    }
  }
}

/**
 * Clôturer une investigation
 * @param {string} uuid - UUID de l'investigation
 * @returns {Promise<object>} Résultat
 */
export const closeInvestigation = async (uuid) => {
  try {
    // Mettre à jour le statut à "cloture"
    const response = await patch(`/criminel/fiches-criminelles/${uuid}/`, { 
      statut_fiche: 'cloture' 
    })
    console.log(` Case ${response.data.numero_fiche} has been officially closed.`)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur clôture investigation:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la clôture',
    }
  }
}

/**
 * Archiver une investigation
 * @param {string} uuid - UUID de l'investigation
 * @returns {Promise<object>} Résultat
 */
export const deleteInvestigation = async (uuid) => {
  try {
    const response = await del(`/criminel/fiches-criminelles/${uuid}/`)
    return { success: true, message: 'Investigation archivée avec succès', data: response.data }
  } catch (error) {
    console.error('Erreur archivage investigation:', error)
    
    // Gérer spécifiquement les erreurs 401 (non autorisé)
    if (error.response?.status === 401) {
      throw {
        success: false,
        message: 'Vous n\'êtes pas autorisé à archiver cette investigation. Veuillez vous reconnecter.',
        status: 401,
      }
    }
    
    // Extraire le message d'erreur depuis la réponse
    let errorMessage = 'Erreur lors de l\'archivage de l\'investigation'
    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data
      }
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data,
      status: error.response?.status,
    }
  }
}

/**
 * Rechercher des investigations
 * @param {string} query - Terme de recherche
 * @param {object} filters - Filtres supplémentaires
 * @returns {Promise<object>} Résultats de recherche
 */
export const searchInvestigations = async (query, filters = {}) => {
  try {
    const response = await get('/criminel/fiches-criminelles/', {
      params: { search: query, ...filters }
    })
    return response.data
  } catch (error) {
    console.error('Erreur recherche investigations:', error)
    throw error
  }
}

/**
 * Récupérer les statistiques des investigations
 * @returns {Promise<object>} Statistiques
 */
export const getInvestigationStats = async () => {
  try {
    // Utiliser l'endpoint des fiches criminelles pour les statistiques
    const response = await get('/criminel/fiches-criminelles/')
    
    // Calculer les statistiques depuis les fiches
    const fiches = response.data.results || response.data || []
    const stats = {
      total: fiches.length,
      en_cours: fiches.filter(f => f.statut_fiche?.code === 'en_cours').length,
      cloture: fiches.filter(f => f.statut_fiche?.code === 'cloture').length,
      en_attente: fiches.filter(f => f.statut_fiche?.code === 'en_attente').length,
      critiques: fiches.filter(f => f.niveau_danger >= 4).length,
    }
    
    console.log("Statistical data successfully fetched and calculated.")
    return stats
  } catch (error) {
    console.error('Erreur récupération statistiques:', error)
    // Retourner des statistiques par défaut en cas d'erreur
    return {
      total: 0,
      en_cours: 0,
      cloture: 0,
      en_attente: 0,
      critiques: 0,
    }
  }
}

/**
 * Récupérer les investigations d'un enquêteur
 * @param {number} investigatorId - ID de l'enquêteur
 * @returns {Promise<object>} Investigations de l'enquêteur
 */
export const getInvestigationsByInvestigator = async (investigatorId) => {
  try {
    const response = await get('/criminel/fiches-criminelles/', {
      params: { assigned_investigator: investigatorId }
    })
    return response.data
  } catch (error) {
    console.error('Erreur récupération investigations enquêteur:', error)
    throw error
  }
}

/**
 * Récupérer les investigations par statut
 * @param {string} status - Statut des investigations
 * @returns {Promise<object>} Investigations filtrées
 */
export const getInvestigationsByStatus = async (status) => {
  try {
    const response = await get('/criminel/fiches-criminelles/', {
      params: { statut: status }
    })
    return response.data
  } catch (error) {
    console.error('Erreur récupération investigations par statut:', error)
    throw error
  }
}

export default {
  getInvestigations,
  getInvestigationById,
  createInvestigation,
  updateInvestigation,
  closeInvestigation,
  deleteInvestigation,
  searchInvestigations,
  getInvestigationStats,
  getInvestigationsByInvestigator,
  getInvestigationsByStatus,
}
