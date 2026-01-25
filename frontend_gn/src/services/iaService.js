/**
 * Service pour les appels API du module Intelligence Artificielle
 */
import api from './api'

/**
 * Récupérer les statistiques générales IA
 * @param {number} jours - Nombre de jours (défaut: 30)
 * @returns {Promise}
 */
export const getIAStatistiques = async (jours = 30) => {
  try {
    const response = await api.get(`/api/ia/dashboard/statistiques/`, {
      params: { jours }
    })
    return response.data
  } catch (error) {
    console.error('Erreur récupération statistiques IA:', error)
    throw error
  }
}

/**
 * Récupérer l'évolution des détections IA
 * @param {string} periode - Période ('7j', '30j', '3m', '1a')
 * @returns {Promise}
 */
export const getIAEvolution = async (periode = '30j') => {
  try {
    const response = await api.get(`/api/ia/dashboard/evolution/`, {
      params: { periode }
    })
    return response.data
  } catch (error) {
    console.error('Erreur récupération évolution IA:', error)
    throw error
  }
}

/**
 * Récupérer les localisations des détections IA
 * @returns {Promise}
 */
export const getIALocalisations = async () => {
  try {
    const response = await api.get(`/api/ia/dashboard/localisations/`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération localisations IA:', error)
    throw error
  }
}

/**
 * Récupérer les données en temps réel
 * @returns {Promise}
 */
export const getIATempsReel = async () => {
  try {
    const response = await api.get(`/api/ia/dashboard/temps-reel/`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération temps réel IA:', error)
    throw error
  }
}

