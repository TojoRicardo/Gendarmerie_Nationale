/**
 * Service de gestion des statistiques
 * Récupère les données statistiques depuis le backend
 */

import { get } from './apiGlobal'

/**
 * Récupère les statistiques globales du système
 */
export const getGlobalStats = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/stats/')
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    throw error
  }
}


/**
 * Récupère les statistiques utilisateurs pour le dashboard admin
 * Utilise l'endpoint dédié /api/utilisateur/dashboard/stats/
 * qui retourne des données basées sur last_login (champ Django standard)
 * 
 * @returns {Promise<Object>} {
 *   total_utilisateurs: number,
 *   utilisateurs_actifs: number,
 *   utilisateurs_inactifs: number,
 *   roles_actifs: number,
 *   utilisateur_connecte: {id, username, email, role, nom, prenom} | null
 * }
 */
export const getDashboardUserStats = async () => {
  try {
    const response = await get('/utilisateur/dashboard/stats/')
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des stats dashboard utilisateurs:', error)
    // Retourner des données par défaut en cas d'erreur
    return {
      total_utilisateurs: 0,
      utilisateurs_actifs: 0,
      utilisateurs_inactifs: 0,
      roles_actifs: 0,
      utilisateur_connecte: null
    }
  }
}

/**
 * Récupère l'activité récente du système depuis le journal d'audit
 */
export const getRecentActivity = async (limit = 10) => {
  try {
    // Utiliser l'API d'audit pour récupérer les activités récentes
    const { getAuditEntries } = await import('./auditService')
    
    const response = await getAuditEntries({
      page_size: limit,
      ordering: '-date_action' // Trier par date décroissante (plus récent en premier)
    })
    
    // Formater les données pour correspondre au format attendu par les dashboards
    const activities = response.results || response || []
    
    return activities.map(entry => {
      // Déterminer le type d'activité depuis l'action ou la ressource
      let type = 'autre'
      const actionLower = (entry.action || '').toLowerCase()
      const ressourceLower = (entry.ressource || '').toLowerCase()
      const descriptionLower = (entry.description || '').toLowerCase()
      
      if (actionLower.includes('create') || actionLower.includes('créer') || descriptionLower.includes('créé') || descriptionLower.includes('nouvelle fiche')) {
        type = 'fiche'
      } else if (actionLower.includes('user') || actionLower.includes('utilisateur') || ressourceLower.includes('utilisateur')) {
        type = 'utilisateur'
      } else if (actionLower.includes('report') || actionLower.includes('rapport') || descriptionLower.includes('rapport')) {
        type = 'rapport'
      } else if (actionLower.includes('permission') || actionLower.includes('rôle') || ressourceLower.includes('role') || ressourceLower.includes('permission')) {
        type = 'permission'
      } else if (actionLower.includes('ia') || actionLower.includes('ai') || descriptionLower.includes('ia') || descriptionLower.includes('intelligence')) {
        type = 'ia'
      }
      
      // Formater le temps écoulé
      const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Récemment'
        
        try {
          const date = new Date(dateString)
          const now = new Date()
          const diffMs = now - date
          const diffMins = Math.floor(diffMs / 60000)
          const diffHours = Math.floor(diffMs / 3600000)
          const diffDays = Math.floor(diffMs / 86400000)
          
          if (diffMins < 1) return 'À l\'instant'
          if (diffMins < 60) return `${diffMins} min`
          if (diffHours < 24) return `${diffHours} h`
          if (diffDays < 7) return `${diffDays} j`
          return `${Math.floor(diffDays / 7)} sem`
        } catch {
          return 'Récemment'
        }
      }
      
      // Extraire le nom d'utilisateur
      const userName = entry.utilisateur_display || 
                      entry.utilisateur_info?.full_name || 
                      entry.utilisateur_info?.username || 
                      entry.utilisateur?.username || 
                      entry.utilisateur || 
                      'Système'
      
      return {
        id: entry.id,
        description: entry.description || entry.action || 'Action non spécifiée',
        user_name: userName,
        time_ago: formatTimeAgo(entry.date_action),
        type: type,
        date_action: entry.date_action,
        action: entry.action,
        ressource: entry.ressource,
        reussi: entry.reussi !== false // Par défaut true si non spécifié
      }
    })
  } catch (error) {
    // Ne logger que si ce n'est pas une erreur de timeout ou réseau normale
    if (
      error.code !== 'ERR_NETWORK' && 
      error.code !== 'ERR_CONNECTION_REFUSED' &&
      error.code !== 'ECONNABORTED' &&
      !error.message?.includes('timeout') &&
      !error.isNetworkError
    ) {
      console.error('Erreur lors de la récupération de l\'activité récente:', error)
    }
    // Retourner un tableau vide au lieu de lever l'erreur
    return []
  }
}

/**
 * Récupère les statistiques géographiques
 * Retourne un tableau vide en cas d'erreur pour ne pas bloquer l'interface
 */
export const getGeographicStats = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/geographic-stats/', {
      timeout: 60000, // 60 secondes pour les calculs complexes
    })
    
    // Vérifier que la réponse contient des données valides
    if (response && response.data) {
      // S'assurer que c'est un tableau
      if (Array.isArray(response.data)) {
        return response.data
      } else if (response.data && typeof response.data === 'object') {
        // Si c'est un objet, essayer de convertir en tableau
        return Array.isArray(response.data.results) ? response.data.results : [response.data]
      }
    }
    
    return []
  } catch (error) {
    // Ne logger que si ce n'est pas une erreur de timeout ou réseau normale
    if (
      error.code !== 'ERR_NETWORK' && 
      error.code !== 'ERR_CONNECTION_REFUSED' &&
      error.code !== 'ECONNABORTED' &&
      !error.message?.includes('timeout')
    ) {
      // Gérer les erreurs spécifiques
      if (error.response) {
        // Erreur HTTP (404, 415, 500, etc.)
        const status = error.response.status
        
        if (status === 404) {
          console.warn('Endpoint de stats géographiques non trouvé (404). Vérifiez que le backend est correctement configuré.')
        } else if (status === 415) {
          console.warn('Type MIME non supporté (415). Le backend doit retourner application/json.')
        } else if (status >= 500) {
          console.error('Erreur serveur lors de la récupération des stats géographiques:', status)
        } else {
          console.warn(`Erreur lors de la récupération des stats géographiques: ${status}`)
        }
      } else if (error.request) {
        // Requête effectuée mais pas de réponse
        console.warn('Pas de réponse du serveur pour les stats géographiques. Vérifiez que le serveur est démarré.')
      } else {
        // Autre erreur
        console.error('Erreur lors de la récupération des stats géographiques:', error.message)
      }
    }
    
    // Retourner un tableau vide pour ne pas bloquer l'interface
    return []
  }
}

/**
 * Récupère les statistiques par type de crime
 */
export const getCrimeTypeStats = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/crime-type-stats/')
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des stats par type:', error)
    // Retourner un tableau vide au lieu de lever l'erreur
    return []
  }
}

/**
 * Récupère les statistiques mensuelles
 */
export const getMonthlyStats = async (months = 12) => {
  try {
    // Ajouter un timestamp pour éviter le cache du navigateur
    const timestamp = Date.now()
    const response = await get(`/criminel/fiches-criminelles/monthly-stats/?months=${months}&_t=${timestamp}`, {
      timeout: 60000, // 60 secondes pour les calculs complexes
    })
    return response.data
  } catch (error) {
    // Ne logger que si ce n'est pas une erreur de timeout ou réseau normale
    if (
      error.code !== 'ERR_NETWORK' && 
      error.code !== 'ERR_CONNECTION_REFUSED' &&
      error.code !== 'ECONNABORTED' &&
      !error.message?.includes('timeout')
    ) {
      console.error('Erreur lors de la récupération des stats mensuelles:', error)
    }
    // Retourner un tableau vide au lieu de lever l'erreur
    return []
  }
}

/**
 * Récupère les statistiques d'évolution détaillée (total, résolus, en cours)
 */
export const getEvolutionStats = async (months = 12) => {
  try {
    // Ajouter un timestamp pour éviter le cache du navigateur
    const timestamp = Date.now()
    const response = await get(`/criminel/fiches-criminelles/evolution-stats/?months=${months}&_t=${timestamp}`, {
      timeout: 60000, // 60 secondes pour les calculs complexes
    })
    return response.data
  } catch (error) {
    // Ne logger que si ce n'est pas une erreur de timeout ou réseau normale
    if (
      error.code !== 'ERR_NETWORK' && 
      error.code !== 'ERR_CONNECTION_REFUSED' &&
      error.code !== 'ECONNABORTED' &&
      !error.message?.includes('timeout')
    ) {
      console.error('Erreur lors de la récupération des stats d\'évolution:', error)
    }
    // Retourner un tableau vide au lieu de lever l'erreur
    return []
  }
}

/**
 * Récupère les statistiques par heure de la journée (fiches criminelles)
 */
export const getHourlyStats = async () => {
  try {
    const response = await get('/criminel/fiches-criminelles/hourly-stats/', {
      timeout: 60000, // 60 secondes pour les calculs complexes
    })
    return response.data
  } catch (error) {
    // Ne logger que si ce n'est pas une erreur de timeout ou réseau normale
    if (
      error.code !== 'ERR_NETWORK' && 
      error.code !== 'ERR_CONNECTION_REFUSED' &&
      error.code !== 'ECONNABORTED' &&
      !error.message?.includes('timeout')
    ) {
      console.error('Erreur lors de la récupération des stats horaires:', error)
    }
    return []
  }
}

/**
 * Récupère les activités d'audit par heure de la journée (activités réelles de l'application)
 * Récupère TOUTES les activités de la journée en paginant si nécessaire
 */
export const getHourlyActivityStats = async () => {
  try {
    // Importer dynamiquement le service d'audit
    const { getAuditEntries } = await import('./auditService')
    
    // Récupérer les activités d'aujourd'hui pour avoir toutes les heures (00h à 23h)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // Récupérer TOUTES les activités d'aujourd'hui en paginant si nécessaire
    let allActivities = []
    let page = 1
    let hasMore = true
    const pageSize = 1000
    
    while (hasMore) {
      try {
        const response = await getAuditEntries({
          date_debut: todayStr,
          date_fin: todayStr,
          page: page,
          page_size: pageSize,
          ordering: '-date_action'
        })
        
        const results = response.results || response || []
        allActivities = allActivities.concat(results)
        
        // Vérifier s'il y a une page suivante
        hasMore = response.next && results.length === pageSize
        page++
        
        // Limite de sécurité : ne pas dépasser 10 pages (10 000 activités max)
        if (page > 10) {
          console.warn('Limite de pagination atteinte pour les activités horaires (10 000 activités max)')
          break
        }
      } catch (error) {
        // Si erreur sur une page, arrêter la pagination
        // Ignorer les erreurs réseau (serveur non disponible)
        if (error.isNetworkError || error.message?.includes('Serveur indisponible') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          hasMore = false
          break
        }
        // Logger seulement les erreurs non-réseau
        if (!error.isNetworkError) {
        console.warn('Erreur lors de la récupération d\'une page d\'activités:', error)
        }
        hasMore = false
      }
    }
    
    // Créer un dictionnaire pour compter les activités par heure (00h à 23h)
    const hourlyCount = {}
    for (let i = 0; i < 24; i++) {
      hourlyCount[i] = 0
    }
    
    // Compter les activités par heure
    allActivities.forEach(activity => {
      if (activity.date_action) {
        try {
          const date = new Date(activity.date_action)
          // Vérifier que la date est valide et correspond à aujourd'hui
          if (!isNaN(date.getTime())) {
            const activityDate = date.toISOString().split('T')[0]
            if (activityDate === todayStr) {
              const hour = date.getHours()
              if (hour >= 0 && hour < 24) {
                hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
              }
            }
          }
        } catch (error) {
          // Ignorer les dates invalides
        }
      }
    })
    
    // Formater les données pour le graphique (toutes les heures de 00h à 23h)
    const formattedData = []
    for (let i = 0; i < 24; i++) {
      formattedData.push({
        heure: `${String(i).padStart(2, '0')}h`,
        time: `${String(i).padStart(2, '0')}:00`,
        activite: hourlyCount[i] || 0,
        count: hourlyCount[i] || 0
      })
    }
    
    return formattedData
  } catch (error) {
    // Ne logger que si ce n'est pas une erreur de timeout ou réseau normale
    if (
      error.code !== 'ERR_NETWORK' && 
      error.code !== 'ERR_CONNECTION_REFUSED' &&
      error.code !== 'ECONNABORTED' &&
      !error.message?.includes('timeout') &&
      !error.isNetworkError
    ) {
      console.error('Erreur lors de la récupération des activités horaires:', error)
    }
    // Retourner un tableau avec des zéros si erreur (toutes les heures de 00h à 23h)
    const emptyData = []
    for (let i = 0; i < 24; i++) {
      emptyData.push({
        heure: `${String(i).padStart(2, '0')}h`,
        time: `${String(i).padStart(2, '0')}:00`,
        activite: 0,
        count: 0
      })
    }
    return emptyData
  }
}

/**
 * Récupère les statistiques de performance des équipes
 */
export const getTeamPerformanceStats = async () => {
  try {
    const response = await get('/utilisateur/utilisateurs/performance-stats/')
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des stats de performance:', error)
    return []
  }
}

/**
 * Récupère toutes les statistiques pour le dashboard
 */
export const getDashboardStats = async () => {
  try {
    // Récupérer toutes les stats en parallèle
    const [
      globalStats,
      userStats,
      recentActivity,
      geographicStats,
      crimeTypeStats,
      monthlyStats,
      evolutionStats,
      hourlyStats,
      performanceStats
    ] = await Promise.all([
      getGlobalStats().catch(() => null),
      getDashboardUserStats().catch(() => null),
      getRecentActivity().catch(() => []),
      getGeographicStats().catch(() => []),
      getCrimeTypeStats().catch(() => []),
      getMonthlyStats().catch(() => []),
      getEvolutionStats().catch(() => []),
      getHourlyStats().catch(() => []),
      getTeamPerformanceStats().catch(() => [])
    ])

    return {
      global: globalStats,
      users: userStats,
      recentActivity,
      geographic: geographicStats,
      crimeTypes: crimeTypeStats,
      monthly: monthlyStats,
      evolution: evolutionStats,
      hourly: hourlyStats,
      performance: performanceStats
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des stats du dashboard:', error)
    throw error
  }
}

export default {
  getGlobalStats,
  getDashboardUserStats,
  getRecentActivity,
  getGeographicStats,
  getCrimeTypeStats,
  getMonthlyStats,
  getEvolutionStats,
  getHourlyStats,
  getHourlyActivityStats,
  getTeamPerformanceStats,
  getDashboardStats
}

