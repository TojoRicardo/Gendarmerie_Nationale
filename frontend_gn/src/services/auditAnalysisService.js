/**
 * Service pour l'analyse intelligente des journaux d'audit avec l'IA
 */

import { API_BASE_URL } from '../config/api'
import { getAuthToken } from '../utils/sessionStorage'

const AUDIT_API_BASE = `${API_BASE_URL}/audit`

/**
 * Analyse un journal d'audit avec l'IA
 * @param {string} logText - Texte du journal à analyser
 * @returns {Promise<object>} Résultat de l'analyse
 */
export const analyserJournal = async (logText) => {
  const token = getAuthToken()
  
  try {
    const response = await fetch(`${AUDIT_API_BASE}/analyser/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ log_text: logText }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'analyse' }))
      throw new Error(error.detail || 'Erreur lors de l\'analyse')
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

/**
 * Analyse plusieurs journaux d'audit avec l'IA
 * @param {string[]} logs - Liste de textes de journaux à analyser
 * @returns {Promise<object>} Résultats de l'analyse
 */
export const analyserJournaux = async (logs) => {
  const token = getAuthToken()
  
  try {
    const response = await fetch(`${AUDIT_API_BASE}/analyser/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'analyse' }))
      throw new Error(error.detail || 'Erreur lors de l\'analyse')
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

/**
 * Analyse les entrées d'audit existantes avec l'IA
 * @param {object} params - Paramètres de filtrage
 * @param {number} params.limit - Nombre d'entrées à analyser (défaut: 50)
 * @param {string} params.date_debut - Date de début (format ISO)
 * @param {string} params.date_fin - Date de fin (format ISO)
 * @param {number} params.utilisateur - ID de l'utilisateur
 * @returns {Promise<object>} Résultats de l'analyse avec IP suspectes et statistiques
 */
export const analyserEntrees = async (params = {}) => {
  const token = getAuthToken()
  const queryParams = new URLSearchParams()
  
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.date_debut) queryParams.append('date_debut', params.date_debut)
  if (params.date_fin) queryParams.append('date_fin', params.date_fin)
  if (params.utilisateur) queryParams.append('utilisateur', params.utilisateur)
  
  const url = `${AUDIT_API_BASE}/analyser_entrees/?${queryParams.toString()}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'analyse des entrées' }))
      throw new Error(error.detail || 'Erreur lors de l\'analyse des entrées')
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

export default {
  analyserJournal,
  analyserJournaux,
  analyserEntrees,
}

