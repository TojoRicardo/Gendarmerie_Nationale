/**
 * Service pour gérer le journal d'audit narratif
 * Envoie les événements narratifs au backend et récupère les journaux
 */

import { get } from './apiGlobal'
import { getAuthToken } from '../utils/sessionStorage'

const AUDIT_API_BASE = '/api/audit'

/**
 * Envoie un événement narratif au backend
 * @param {string} actionType - Type d'action ('navigation', 'creation', 'modification', 'suppression', 'telechargement', etc.)
 * @param {object} details - Détails de l'action (resource_type, resource_id, resource_name, etc.)
 * @returns {Promise<object|null>} Réponse du serveur ou null en cas d'erreur
 */
export const logNarrativeAction = async (actionType, details = {}) => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/log-action-narrative/`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_type: actionType,
        details: details,
      }),
    })
    
    if (!response.ok) {
      // Ne pas lever d'erreur pour ne pas perturber l'application
      console.debug('Erreur lors de l\'enregistrement de l\'action narrative:', await response.text())
      return null
    }
    
    return await response.json()
  } catch (error) {
    // Ne pas perturber l'application en cas d'erreur
    console.debug('Erreur réseau lors de l\'enregistrement de l\'action narrative:', error)
    return null
  }
}

/**
 * Enregistre une action de navigation dans le journal narratif
 * @param {string} route - Route React
 * @param {string} screenName - Nom de l'écran
 */
export const logNavigationNarrative = async (route, screenName = null) => {
  // La navigation est déjà gérée par logNavigation dans auditService.js
  // qui a été modifié pour enregistrer aussi dans le journal narratif
  // Cette fonction est un alias pour compatibilité
  return logNarrativeAction('navigation', {
    route: route,
    screen_name: screenName || route,
  })
}

/**
 * Enregistre une création dans le journal narratif
 * @param {string} resourceType - Type de ressource
 * @param {string|number} resourceId - ID de la ressource
 * @param {string} resourceName - Nom de la ressource (optionnel)
 */
export const logCreationNarrative = async (resourceType, resourceId, resourceName = null) => {
  return logNarrativeAction('creation', {
    resource_type: resourceType,
    resource_id: resourceId ? String(resourceId) : null,
    resource_name: resourceName,
  })
}

/**
 * Enregistre une modification dans le journal narratif
 * @param {string} resourceType - Type de ressource
 * @param {string|number} resourceId - ID de la ressource
 * @param {string} resourceName - Nom de la ressource (optionnel)
 */
export const logModificationNarrative = async (resourceType, resourceId, resourceName = null) => {
  return logNarrativeAction('modification', {
    resource_type: resourceType,
    resource_id: resourceId ? String(resourceId) : null,
    resource_name: resourceName,
  })
}

/**
 * Enregistre une suppression dans le journal narratif
 * @param {string} resourceType - Type de ressource
 * @param {string|number} resourceId - ID de la ressource
 * @param {string} resourceName - Nom de la ressource (optionnel)
 */
export const logSuppressionNarrative = async (resourceType, resourceId, resourceName = null) => {
  return logNarrativeAction('suppression', {
    resource_type: resourceType,
    resource_id: resourceId ? String(resourceId) : null,
    resource_name: resourceName,
  })
}

/**
 * Enregistre un téléchargement dans le journal narratif
 * @param {string} fileName - Nom du fichier
 * @param {string} fileType - Type de fichier (PDF, Excel, etc.)
 * @param {string} resourceType - Type de ressource (optionnel)
 */
export const logTelechargementNarrative = async (fileName, fileType = 'fichier', resourceType = null) => {
  return logNarrativeAction('telechargement', {
    file_name: fileName,
    file_type: fileType,
    resource_type: resourceType,
  })
}

/**
 * Enregistre un téléversement dans le journal narratif
 * @param {string} fileName - Nom du fichier
 * @param {string} resourceType - Type de ressource
 */
export const logTeleversementNarrative = async (fileName, resourceType = 'fichier') => {
  return logNarrativeAction('televersement', {
    file_name: fileName,
    resource_type: resourceType,
  })
}

/**
 * Enregistre une génération de rapport dans le journal narratif
 * @param {string} reportType - Type de rapport
 * @param {string} reportName - Nom du rapport (optionnel)
 */
export const logGenerationRapportNarrative = async (reportType, reportName = null) => {
  return logNarrativeAction('generation_rapport', {
    report_type: reportType,
    report_name: reportName,
  })
}

/**
 * Récupère la liste des journaux narratifs
 * @param {object} params - Paramètres de filtrage (utilisateur, est_cloture, date_debut_from, date_debut_to)
 * @returns {Promise<object>} Liste paginée des journaux
 */
export const getNarrativeJournals = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams()
    
    if (params.utilisateur) {
      queryParams.append('utilisateur', params.utilisateur)
    }
    if (params.est_cloture !== undefined) {
      queryParams.append('est_cloture', params.est_cloture.toString())
    }
    if (params.date_debut_from) {
      queryParams.append('date_debut_from', params.date_debut_from)
    }
    if (params.date_debut_to) {
      queryParams.append('date_debut_to', params.date_debut_to)
    }
    if (params.search) {
      queryParams.append('search', params.search)
    }
    if (params.page) {
      queryParams.append('page', params.page.toString())
    }
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString())
    }
    
    const url = `${AUDIT_API_BASE}/narratifs/${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await get(url)
    return response
  } catch (error) {
    console.error('Erreur lors de la récupération des journaux narratifs:', error)
    throw error
  }
}

/**
 * Récupère les journaux narratifs de l'utilisateur connecté
 * @param {object} params - Paramètres de pagination
 * @returns {Promise<object>} Liste paginée des journaux
 */
export const getMyNarrativeJournals = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams()
    
    if (params.page) {
      queryParams.append('page', params.page.toString())
    }
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString())
    }
    
    const url = `${AUDIT_API_BASE}/narratifs/mes-journaux/${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await get(url)
    return response
  } catch (error) {
    console.error('Erreur lors de la récupération de mes journaux narratifs:', error)
    throw error
  }
}

/**
 * Récupère un journal narratif par son ID
 * @param {number|string} journalId - ID du journal
 * @returns {Promise<object>} Journal narratif complet
 */
export const getNarrativeJournal = async (journalId) => {
  try {
    const response = await get(`${AUDIT_API_BASE}/narratifs/${journalId}/`)
    return response
  } catch (error) {
    console.error('Erreur lors de la récupération du journal narratif:', error)
    throw error
  }
}

/**
 * Récupère le détail complet d'un journal narratif
 * @param {number|string} journalId - ID du journal
 * @returns {Promise<object>} Journal narratif avec tous les détails
 */
export const getNarrativeJournalDetail = async (journalId) => {
  try {
    const response = await get(`${AUDIT_API_BASE}/narratifs/${journalId}/detail-complet/`)
    return response
  } catch (error) {
    console.error('Erreur lors de la récupération du détail du journal narratif:', error)
    throw error
  }
}

export default {
  logNarrativeAction,
  logNavigationNarrative,
  logCreationNarrative,
  logModificationNarrative,
  logSuppressionNarrative,
  logTelechargementNarrative,
  logTeleversementNarrative,
  logGenerationRapportNarrative,
  getNarrativeJournals,
  getMyNarrativeJournals,
  getNarrativeJournal,
  getNarrativeJournalDetail,
}

