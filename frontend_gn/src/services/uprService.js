/**
 * Service API pour la gestion des UPR (Unidentified Person Registry)
 */
import api from './api'

/**
 * Crée un nouvel UPR
 * @param {FormData} formData - FormData contenant profil_face (obligatoire), notes (optionnel), etc.
 * @returns {Promise} Réponse avec les données de l'UPR créé
 */
export const createUPR = async (formData) => {
  // Ne pas définir Content-Type : avec FormData, Axios envoie automatiquement
  // multipart/form-data avec le boundary correct
  const response = await api.post('/upr/', formData)
  return response.data
}

/**
 * Récupère un UPR par son ID
 * @param {number} id - ID de l'UPR
 * @returns {Promise} Données de l'UPR
 */
export const getUPR = async (id) => {
  const response = await api.get(`/upr/${id}/`)
  return response.data
}

/**
 * Liste tous les UPR
 * @returns {Promise} Liste des UPR
 */
export const listUPR = async () => {
  const response = await api.get('/upr/')
  return response.data
}

/**
 * Met à jour un UPR
 * @param {number} id - ID de l'UPR
 * @param {FormData} formData - FormData avec les champs à mettre à jour
 * @returns {Promise} Données de l'UPR mis à jour
 */
export const updateUPR = async (id, formData) => {
  const response = await api.put(`/upr/${id}/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

/**
 * Met à jour partiellement un UPR (PATCH)
 * @param {number} id - ID de l'UPR
 * @param {FormData|Object} data - Données à mettre à jour
 * @returns {Promise} Données de l'UPR mis à jour
 */
export const patchUPR = async (id, data) => {
  const response = await api.patch(`/upr/${id}/`, data, {
    headers: data instanceof FormData ? {
      'Content-Type': 'multipart/form-data'
    } : {}
  })
  return response.data
}

/**
 * Archive un UPR (suppression douce)
 * @param {number} id - ID de l'UPR
 * @returns {Promise} Message de confirmation
 */
export const deleteUPR = async (id) => {
  const response = await api.delete(`/upr/${id}/`)
  return response.data
}

/**
 * Restaure un UPR archivé
 * @param {number} id - ID de l'UPR
 * @returns {Promise} Données de l'UPR restauré
 */
export const restoreUPR = async (id) => {
  const response = await api.post(`/upr/${id}/restore/`)
  return response.data
}

/**
 * Recherche un UPR par photo (reconnaissance faciale)
 * @param {File} photoFile - Fichier image à rechercher
 * @param {number} threshold - Seuil de similarité (optionnel, défaut: 0.35)
 * @param {number} top_k - Nombre de résultats max (optionnel, défaut: 10)
 * @returns {Promise} Résultats de la recherche
 */
export const searchUPRByPhoto = async (photoFile, threshold = 0.35, top_k = 10) => {
  const formData = new FormData()
  formData.append('photo', photoFile)
  formData.append('threshold', threshold)
  formData.append('top_k', top_k)
  
  const response = await api.post('/upr/search-by-photo/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export default {
  createUPR,
  getUPR,
  listUPR,
  updateUPR,
  patchUPR,
  deleteUPR,
  restoreUPR,
  searchUPRByPhoto
}

