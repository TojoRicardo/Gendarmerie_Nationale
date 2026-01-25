/**
 * Service de gestion des fiches criminelles
 * Gère toutes les opérations CRUD sur les fiches criminelles
 */

import { get, post, put, patch, del } from './apiGlobal'

/**
 * Récupérer la liste de toutes les fiches criminelles
 * @param {object} params - Paramètres de filtrage/pagination {page, search, statut, etc.}
 * @returns {Promise<object>} Liste paginée des fiches
 */
export const getCriminalFiles = async (params = {}) => {
  try {
    const response = await get('/criminel/fiches-criminelles/', { params })
    return response.data
  } catch (error) {
    console.error('Erreur récupération fiches criminelles:', error)
    throw error
  }
}

/**
 * Récupérer toutes les fiches archivées
 * @returns {Promise<Array>} Liste des fiches archivées
 */
export const getArchivedFiles = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/archives/')
    return response.data
  } catch (error) {
    console.error('Erreur récupération archives:', error)
    throw error
  }
}

/**
 * Récupérer une fiche criminelle par son ID
 * @param {number} fileId - ID de la fiche
 * @returns {Promise<object>} Données de la fiche
 */
export const getCriminalFileById = async (fileId) => {
  try {
    const response = await get(`/criminel/fiches-criminelles/${fileId}/`)
    return response.data
  } catch (error) {
    // Ne pas logger les erreurs de connexion refusée (serveur non démarré)
    const isConnectionError = 
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('CONNECTION_REFUSED') ||
      error.message?.includes('Pas de réponse du serveur')
    
    if (!isConnectionError) {
      console.error('Erreur récupération fiche:', error)
    }
    throw error
  }
}

/**
 * Créer une nouvelle fiche criminelle
 * @param {object} fileData - Données de la fiche
 * @returns {Promise<object>} Fiche créée
 */
export const createCriminalFile = async (fileData) => {
  try {
    const response = await post('/criminel/fiches-criminelles/', fileData)
    return response.data
  } catch (error) {
    console.error('Erreur création fiche:', error)
    throw error
  }
}

/**
 * Mettre à jour une fiche criminelle
 * @param {number} fileId - ID de la fiche
 * @param {object} fileData - Nouvelles données (mise à jour partielle)
 * @returns {Promise<object>} Fiche mise à jour
 */
export const updateCriminalFile = async (fileId, fileData) => {
  try {
    const response = await patch(`/criminel/fiches-criminelles/${fileId}/`, fileData)
    return response.data
  } catch (error) {
    console.error('Erreur mise à jour fiche:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Archiver une fiche criminelle
 * @param {number} fileId - ID de la fiche
 * @returns {Promise<object>} Résultat
 */
export const deleteCriminalFile = async (fileId) => {
  try {
    const response = await del(`/criminel/fiches-criminelles/${fileId}/`)
    
    // Utiliser le message du backend s'il existe
    const message = response.data?.message || 'Fiche archivée avec succès'
    
    return {
      success: true,
      message: message,
      data: response.data,
      numero_fiche: response.data?.numero_fiche,
      nom_complet: response.data?.nom_complet
    }
  } catch (error) {
    // Ignorer silencieusement les erreurs réseau si le serveur n'est pas disponible
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || !error.response) {
      // Ne pas logger ces erreurs, c'est normal si le serveur n'est pas démarré
      throw {
        success: false,
        message: 'Impossible de se connecter au serveur. Vérifiez que le serveur est démarré.',
        errors: undefined,
        status: 500,
      }
    }
    
    // Extraire le message d'erreur depuis la réponse
    let errorMessage = 'Erreur lors de l\'archivage de la fiche'
    const isAlreadyArchived = error.response?.data?.message?.includes('déjà archivée') || 
                              error.response?.data?.error?.includes('déjà archivée') ||
                              error.response?.data?.message?.includes('already archived')
    
    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data
      } else if (error.response.status === 400) {
        errorMessage = 'Requête invalide. La fiche est peut-être déjà archivée ou les données sont incorrectes.'
      } else if (error.response.status === 403) {
        errorMessage = 'Vous n\'avez pas la permission d\'archiver cette fiche. Seuls les administrateurs peuvent effectuer cette action.'
      } else if (error.response.status === 404) {
        errorMessage = 'Fiche non trouvée. Elle a peut-être été supprimée ou n\'existe plus.'
      }
    } else if (!error.response) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
    }
    
    // Ne logger que les erreurs non-attendues (pas les erreurs "déjà archivée" ou 404)
    if (error.response?.status !== 401 && 
        error.response?.status !== 404 && 
        !isAlreadyArchived) {
      console.error('Erreur suppression fiche:', error)
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data,
      status: error.response?.status || 500,
    }
  }
}

/**
 * Désarchiver une fiche criminelle
 * @param {number} fileId - ID de la fiche
 * @returns {Promise<object>} Résultat du désarchivage
 */
export const unarchiveCriminalFile = async (fileId) => {
  try {
    const response = await post(`/criminel/fiches-criminelles/${fileId}/unarchive/`)
    
    // Utiliser le message du backend s'il existe
    const message = response.data?.message || 'Fiche désarchivée avec succès'
    
    return {
      success: true,
      message: message,
      data: response.data,
      numero_fiche: response.data?.numero_fiche,
      nom_complet: response.data?.nom_complet
    }
  } catch (error) {
    // Ignorer silencieusement les erreurs réseau si le serveur n'est pas disponible
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || !error.response) {
      throw {
        success: false,
        message: 'Impossible de se connecter au serveur. Vérifiez que le serveur est démarré.',
        errors: undefined,
        status: 500,
      }
    }
    
    // Extraire le message d'erreur depuis la réponse
    let errorMessage = 'Erreur lors du désarchivage de la fiche'
    const isNotArchived = error.response?.data?.message?.includes('n\'est pas archivée') || 
                          error.response?.data?.error?.includes('non archivée') ||
                          error.response?.data?.message?.includes('not archived')
    
    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data
      } else if (error.response.status === 400) {
        errorMessage = 'Requête invalide. La fiche n\'est peut-être pas archivée.'
      } else if (error.response.status === 403) {
        errorMessage = 'Vous n\'avez pas la permission de désarchiver cette fiche. Seuls les administrateurs peuvent effectuer cette action.'
      } else if (error.response.status === 404) {
        errorMessage = 'Fiche non trouvée. Elle a peut-être été supprimée ou n\'existe plus.'
      }
    } else if (!error.response) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
    }
    
    // Ne logger que les erreurs non-attendues
    if (error.response?.status !== 401 && 
        error.response?.status !== 404 && 
        !isNotArchived) {
      console.error('Erreur désarchivage fiche:', error)
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data,
      status: error.response?.status || 500,
    }
  }
}

/**
 * Rechercher des fiches criminelles
 * @param {string} query - Terme de recherche
 * @param {object} filters - Filtres supplémentaires
 * @returns {Promise<object>} Résultats de recherche
 */
export const searchCriminalFiles = async (query, filters = {}) => {
  try {
    const response = await get('/criminel/fiches-criminelles/', {
      params: { search: query, ...filters }
    })
    return response.data
  } catch (error) {
    console.error('Erreur recherche fiches:', error)
    throw error
  }
}

/**
 * Récupérer les statistiques des fiches criminelles
 * @returns {Promise<object>} Statistiques
 */
export const getCriminalFilesStats = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/stats/')
    return response.data
  } catch (error) {
    console.error('Erreur récupération statistiques:', error)
    throw error
  }
}

/**
 * Récupérer l'historique d'une fiche
 * @param {number} fileId - ID de la fiche
 * @returns {Promise<Array>} Historique
 */
export const getCriminalFileHistory = async (fileId) => {
  try {
    const response = await get(`/criminel/fiches-criminelles/${fileId}/history/`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération historique:', error)
    throw error
  }
}

/**
 * Exporter des fiches criminelles
 * @param {object} params - Paramètres d'export {format, filters}
 * @returns {Promise<Blob>} Fichier d'export
 */
export const exportCriminalFiles = async (params = {}) => {
  try {
    const response = await get('/criminel/fiches-criminelles/export/', {
      params,
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('Erreur export fiches:', error)
    throw error
  }
}

/**
 * Récupérer la liste des nationalités
 */
export const getNationalities = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/nationalities/')
    return response.data
  } catch (error) {
    console.error('Erreur récupération nationalités:', error)
    // Retourner une liste par défaut en cas d'erreur
    return [
      'Malagasy',
      'Française',
      'Algérienne',
      'Marocaine',
      'Tunisienne',
      'Sénégalaise',
      'Ivoirienne',
      'Autre'
    ]
  }
}

/**
 * Récupérer la liste des pays
 */
export const getCountries = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/countries/')
    return response.data
  } catch (error) {
    console.error('Erreur récupération pays:', error)
    // Retourner une liste par défaut en cas d'erreur
    return [
      'Madagascar',
      'France',
      'Algérie',
      'Maroc',
      'Tunisie',
      'Sénégal',
      'Côte d\'Ivoire',
      'Autre'
    ]
  }
}

export default {
  getCriminalFiles,
  getArchivedFiles,
  getCriminalFileById,
  createCriminalFile,
  updateCriminalFile,
  deleteCriminalFile,
  searchCriminalFiles,
  getCriminalFilesStats,
  getCriminalFileHistory,
  exportCriminalFiles,
  getNationalities,
  getCountries,
}

