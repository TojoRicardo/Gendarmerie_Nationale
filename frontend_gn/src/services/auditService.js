/**
 * Service pour l'API du Journal d'Audit
 */

import { API_BASE_URL } from '../config/api'
import { getAuthToken } from '../utils/sessionStorage'

const AUDIT_API_BASE = `${API_BASE_URL}/audit`

/**
 * Récupère la liste paginée des entrées d'audit
 * Par défaut, groupe les logs par session pour éviter la duplication
 */
export const getAuditEntries = async (params = {}) => {
  const token = getAuthToken()
  const queryParams = new URLSearchParams()
  
  // Par défaut, grouper par session pour éviter la duplication
  // Utiliser group_by_session=true pour regrouper toutes les actions d'une même session
  const groupBySession = params.group_by_session !== false // true par défaut
  if (groupBySession) {
    queryParams.append('group_by_session', 'true')
  }
  
  // Paramètres de pagination
  if (params.page) queryParams.append('page', params.page)
  if (params.page_size) queryParams.append('page_size', params.page_size)
  
  // Filtres
  if (params.utilisateur) queryParams.append('utilisateur', params.utilisateur)
  if (params.action) queryParams.append('action', params.action)
  if (params.ressource) queryParams.append('ressource', params.ressource)
  if (params.module) queryParams.append('module', params.module) // Alias pour ressource
  if (params.frontend_route) queryParams.append('frontend_route', params.frontend_route)
  if (params.screen_name) queryParams.append('screen_name', params.screen_name)
  if (params.date_debut) queryParams.append('date_debut', params.date_debut)
  if (params.date_fin) queryParams.append('date_fin', params.date_fin)
  if (params.periode) queryParams.append('periode', params.periode) // aujourdhui, 7_jours, 30_jours
  if (params.reussi !== undefined) queryParams.append('reussi', params.reussi)
  if (params.search) queryParams.append('search', params.search)
  if (params.ordering) queryParams.append('ordering', params.ordering)
  
  const url = `${AUDIT_API_BASE}/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors du chargement des entrées d\'audit' }))
      throw new Error(error.detail || 'Erreur lors du chargement des entrées d\'audit')
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau (serveur non disponible)
    if (error.message === 'Failed to fetch' || 
        error.message?.includes('ERR_CONNECTION_REFUSED') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      // Créer une erreur spéciale pour les erreurs réseau
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    // Ne logger que les erreurs non-réseau
    if (!error.isNetworkError) {
      console.error('Erreur auditService:', error)
    }
    throw error
  }
}

/**
 * Récupère les statistiques du Journal d'Audit
 */
export const getAuditStatistics = async () => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/statistiques/`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors du chargement des statistiques' }))
      throw new Error(error.detail || 'Erreur lors du chargement des statistiques')
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau (serveur non disponible)
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('NetworkError')) {
      // Créer une erreur spéciale pour les erreurs réseau
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

/**
 * Recherche dans le Journal d'Audit
 */
export const searchAudit = async (query, params = {}) => {
  const token = getAuthToken()
  const queryParams = new URLSearchParams()
  
  queryParams.append('q', query)
  
  if (params.page) queryParams.append('page', params.page)
  if (params.page_size) queryParams.append('page_size', params.page_size)
  
  const url = `${AUDIT_API_BASE}/recherche/?${queryParams.toString()}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la recherche' }))
      throw new Error(error.detail || 'Erreur lors de la recherche')
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau (serveur non disponible)
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('NetworkError')) {
      // Créer une erreur spéciale pour les erreurs réseau
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

/**
 * Crée une entrée d'audit (pour les actions manuelles)
 */
export const createAuditEntry = async (data) => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création de l\'entrée d\'audit' }))
    throw new Error(error.detail || 'Erreur lors de la création de l\'entrée d\'audit')
  }
  
  return response.json()
}

/**
 * Enregistre une navigation frontend (route React)
 */
export const logNavigation = async (route, screenName = null) => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/log-navigation/`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route,
        screen_name: screenName || route,
        action: 'NAVIGATION',
      }),
    })
    
    if (!response.ok) {
      // Ne pas lever d'erreur pour ne pas perturber la navigation
      console.debug('Erreur lors de l\'enregistrement de la navigation:', await response.text())
      return null
    }
    
    return response.json()
  } catch (error) {
    // Ne pas perturber la navigation en cas d'erreur
    console.debug('Erreur réseau lors de l\'enregistrement de la navigation:', error)
    return null
  }
}

/**
 * Récupère les détails d'une entrée d'audit
 */
export const getAuditEntry = async (id) => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/${id}/`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors du chargement de l\'entrée d\'audit' }))
    throw new Error(error.detail || 'Erreur lors du chargement de l\'entrée d\'audit')
  }
  
  return response.json()
}

/**
 * Récupère la date de dernière connexion d'un utilisateur
 */
export const getDerniereConnexion = async (userId) => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/derniere-connexion/?utilisateur=${userId}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la récupération de la dernière connexion' }))
      throw new Error(error.detail || 'Erreur lors de la récupération de la dernière connexion')
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau (serveur non disponible)
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('NetworkError')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

/**
 * Récupère le statut de la configuration IA (Ollama)
 */
export const getStatutIA = async () => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/statut_ia/`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      // Pour les erreurs 500, essayer de récupérer le message d'erreur
      let errorDetail = 'Erreur lors de la récupération du statut IA'
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorData.message || errorDetail
      } catch {
        // Si la réponse n'est pas du JSON, utiliser le message par défaut
        errorDetail = response.status === 500 
          ? 'Erreur serveur lors de la vérification du statut IA' 
          : 'Erreur lors de la récupération du statut IA'
      }
      const apiError = new Error(errorDetail)
      apiError.isNetworkError = false
      apiError.status = response.status
      throw apiError
    }
    
    return response.json()
  } catch (error) {
    // Détecter les erreurs réseau (serveur non disponible)
    if (error.message === 'Failed to fetch' || 
        error.message?.includes('ERR_CONNECTION_REFUSED') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    // Pour les autres erreurs, marquer comme non-réseau
    if (!error.isNetworkError) {
      error.isNetworkError = false
    }
    throw error
  }
}

/**
 * Liste les modèles Ollama disponibles
 */
export const getModelesDisponibles = async () => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/modeles_disponibles/`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la récupération des modèles' }))
      const apiError = new Error(error.detail || 'Erreur lors de la récupération des modèles')
      apiError.isNetworkError = false
      throw apiError
    }
    
    return response.json()
  } catch (error) {
    if (error.message === 'Failed to fetch' || 
        error.message?.includes('ERR_CONNECTION_REFUSED') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    if (!error.isNetworkError) {
      error.isNetworkError = false
    }
    throw error
  }
}

/**
 * Récupère les événements d'audit avec analyses IA LLaMA
 */
export const getAuditEvents = async (params = {}) => {
  const token = getAuthToken()
  const queryParams = new URLSearchParams()
  
  // Paramètres de pagination
  if (params.page) queryParams.append('page', params.page)
  if (params.page_size) queryParams.append('page_size', params.page_size)
  
  // Filtres
  if (params.utilisateur) queryParams.append('utilisateur', params.utilisateur)
  if (params.action) queryParams.append('action', params.action)
  if (params.risk_level) queryParams.append('risk_level', params.risk_level)
  
  const url = `${AUDIT_API_BASE}/events/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors du chargement des événements' }))
      throw new Error(error.detail || 'Erreur lors du chargement des événements')
    }
    
    return response.json()
  } catch (error) {
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('NetworkError')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

/**
 * Récupère les détails d'un événement d'audit avec analyse IA
 */
export const getAuditEventDetail = async (id) => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/${id}/event_detail/`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors du chargement de l\'événement' }))
      throw new Error(error.detail || 'Erreur lors du chargement de l\'événement')
    }
    
    return response.json()
  } catch (error) {
    if (error.message === 'Failed to fetch' || error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('NetworkError')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

/**
 * Teste Ollama avec un prompt
 */
export const testerOllama = async (prompt, model = null) => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/tester_ollama/`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors du test Ollama' }))
      const apiError = new Error(error.detail || 'Erreur lors du test Ollama')
      apiError.isNetworkError = false
      throw apiError
    }
    
    return response.json()
  } catch (error) {
    if (error.message === 'Failed to fetch' || 
        error.message?.includes('ERR_CONNECTION_REFUSED') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    if (!error.isNetworkError) {
      error.isNetworkError = false
    }
    throw error
  }
}

/**
 * Supprime toutes les entrées du journal d'audit
 * Réservé aux administrateurs système uniquement
 */
export const clearAllAuditLogs = async () => {
  const token = getAuthToken()
  const url = `${AUDIT_API_BASE}/clear-all/`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression des logs d\'audit' }))
      const apiError = new Error(error.detail || error.message || 'Erreur lors de la suppression des logs d\'audit')
      apiError.isNetworkError = false
      apiError.status = response.status
      throw apiError
    }
    
    return response.json()
  } catch (error) {
    if (error.message === 'Failed to fetch' || 
        error.message?.includes('ERR_CONNECTION_REFUSED') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      const networkError = new Error('Serveur indisponible')
      networkError.isNetworkError = true
      throw networkError
    }
    if (!error.isNetworkError) {
      error.isNetworkError = false
    }
    throw error
  }
}

