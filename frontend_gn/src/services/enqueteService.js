import { get, post, patch, del } from './apiGlobal'

const BASE = '/enquete'

const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
}

const buildFormData = (payload) => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })
  return formData
}

export const fetchPreuves = async (dossierId) => {
  const response = await get(`${BASE}/preuves/${dossierId}/`)
  return response.data
}

export const createPreuve = async ({ dossier, type_preuve, description, fichier }) => {
  const formData = buildFormData({ dossier, type_preuve, description, fichier })
  const response = await post(`${BASE}/preuves/create/`, formData, multipartConfig)
  return response.data
}

export const fetchPreuveDetail = async (preuveId) => {
  const response = await get(`${BASE}/preuves/item/${preuveId}/`)
  return response.data
}

export const updatePreuve = async (preuveId, payload) => {
  const formData = buildFormData(payload)
  const response = await patch(`${BASE}/preuves/item/${preuveId}/`, formData, multipartConfig)
  return response.data
}

export const deletePreuve = async (preuveId) => {
  const response = await del(`${BASE}/preuves/item/${preuveId}/`)
  return response.data
}

export const fetchRapports = async (dossierId) => {
  const response = await get(`${BASE}/rapports/${dossierId}/`)
  return response.data
}

export const createRapport = async ({ dossier, titre, contenu, statut }) => {
  const response = await post(`${BASE}/rapports/create/`, {
    dossier,
    titre,
    contenu,
    statut,
  })
  return response.data
}

export const fetchRapportDetail = async (rapportId) => {
  const response = await get(`${BASE}/rapports/item/${rapportId}/`)
  return response.data
}

export const updateRapport = async (rapportId, payload) => {
  const response = await patch(`${BASE}/rapports/item/${rapportId}/`, payload)
  return response.data
}

export const deleteRapport = async (rapportId) => {
  const response = await del(`${BASE}/rapports/item/${rapportId}/`)
  return response.data
}

export const fetchObservations = async (dossierId) => {
  const response = await get(`${BASE}/observations/${dossierId}/`)
  return response.data
}

export const createObservation = async ({ dossier, texte }) => {
  const response = await post(`${BASE}/observations/create/`, {
    dossier,
    texte,
  })
  return response.data
}

export const fetchObservationDetail = async (observationId) => {
  const response = await get(`${BASE}/observations/item/${observationId}/`)
  return response.data
}

export const updateObservation = async (observationId, payload) => {
  const response = await patch(`${BASE}/observations/item/${observationId}/`, payload)
  return response.data
}

export const deleteObservation = async (observationId) => {
  const response = await del(`${BASE}/observations/item/${observationId}/`)
  return response.data
}

export const fetchAvancement = async (dossierId) => {
  const response = await get(`${BASE}/avancement/${dossierId}/`)
  return response.data
}

export const updateAvancement = async ({ dossier, pourcentage, commentaire }) => {
  const response = await post(`${BASE}/avancement/update/`, {
    dossier,
    pourcentage,
    commentaire,
  })
  return response.data
}

export const fetchAvancementDetail = async (avancementId) => {
  const response = await get(`${BASE}/avancement/item/${avancementId}/`)
  return response.data
}

export const editAvancementEntry = async (avancementId, payload) => {
  const response = await patch(`${BASE}/avancement/item/${avancementId}/`, payload)
  return response.data
}

export const deleteAvancementEntry = async (avancementId) => {
  const response = await del(`${BASE}/avancement/item/${avancementId}/`)
  return response.data
}

// ============================================================================
// GESTION DES ENQUÊTES
// ============================================================================

/**
 * Récupère la liste des enquêtes avec filtres optionnels
 * @param {Object} params - Paramètres de filtrage (statut, enqueteur, type_enquete, search, etc.)
 */
export const fetchEnquetes = async (params = {}) => {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value)
    }
  })
  const url = `${BASE}/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await get(url)
  return response.data
}

/**
 * Crée une nouvelle enquête
 * @param {Object} data - Données de l'enquête
 */
export const createEnquete = async (data) => {
  const response = await post(`${BASE}/create/`, data)
  return response.data
}

/**
 * Récupère les détails d'une enquête par son ID (UUID)
 * @param {string} enqueteId - UUID de l'enquête
 */
export const fetchEnqueteDetail = async (enqueteId) => {
  const response = await get(`${BASE}/${enqueteId}/`)
  return response.data
}

/**
 * Met à jour une enquête
 * @param {string} enqueteId - UUID de l'enquête
 * @param {Object} data - Données à mettre à jour
 */
export const updateEnquete = async (enqueteId, data) => {
  const response = await patch(`${BASE}/${enqueteId}/`, data)
  return response.data
}

/**
 * Supprime une enquête
 * @param {string} enqueteId - UUID de l'enquête
 */
export const deleteEnquete = async (enqueteId) => {
  const response = await del(`${BASE}/${enqueteId}/`)
  return response.data
}

/**
 * Met à jour le statut d'une enquête
 * @param {string} enqueteId - UUID de l'enquête
 * @param {string} statut - Nouveau statut (en_cours, suspendue, cloturee, classee)
 */
export const updateEnqueteStatut = async (enqueteId, statut) => {
  const response = await patch(`${BASE}/${enqueteId}/statut/`, { statut })
  return response.data
}

/**
 * Récupère la liste des rapports d'une enquête
 * @param {string} enqueteId - UUID de l'enquête
 */
export const fetchEnqueteRapports = async (enqueteId) => {
  const response = await get(`${BASE}/${enqueteId}/rapport/`)
  return response.data
}

/**
 * Récupère la liste des types d'enquête
 */
export const fetchTypesEnquete = async () => {
  const response = await get(`${BASE}/types/`)
  return response.data
}

// ============================================================================
// GESTION DES RELATIONS ENQUÊTE-CRIMINEL
// ============================================================================

/**
 * Récupère la liste des criminels liés à une enquête
 * @param {string} enqueteId - UUID de l'enquête
 */
export const fetchEnqueteCriminels = async (enqueteId) => {
  const response = await get(`${BASE}/${enqueteId}/criminels/`)
  return response.data
}

/**
 * Crée une relation Enquête-Criminel
 * @param {Object} data - { enquete, criminel, role?, notes? }
 */
export const createEnqueteCriminel = async (data) => {
  const response = await post(`${BASE}/criminels/create/`, data)
  return response.data
}

/**
 * Met à jour une relation Enquête-Criminel
 * @param {number} relationId - ID de la relation
 * @param {Object} data - Données à mettre à jour
 */
export const updateEnqueteCriminel = async (relationId, data) => {
  const response = await patch(`${BASE}/criminels/${relationId}/`, data)
  return response.data
}

/**
 * Supprime une relation Enquête-Criminel
 * @param {number} relationId - ID de la relation
 */
export const deleteEnqueteCriminel = async (relationId) => {
  const response = await del(`${BASE}/criminels/${relationId}/`)
  return response.data
}

// ============================================================================
// MÉTHODES ADAPTÉES POUR LES PREUVES ET RAPPORTS LIÉS À UNE ENQUÊTE
// ============================================================================

/**
 * Crée une preuve liée à une enquête
 * @param {Object} data - { enquete, type_preuve, description, fichier }
 */
export const createPreuveEnquete = async ({ enquete, type_preuve, description, fichier }) => {
  const formData = buildFormData({ enquete, type_preuve, description, fichier })
  const response = await post(`${BASE}/preuves/create/`, formData, multipartConfig)
  return response.data
}

/**
 * Crée un rapport lié à une enquête
 * @param {Object} data - { enquete, titre, contenu, statut }
 */
export const createRapportEnquete = async ({ enquete, titre, contenu, statut = 'brouillon' }) => {
  const response = await post(`${BASE}/rapports/create/`, {
    enquete,
    titre,
    contenu,
    statut,
  })
  return response.data
}

export default {
  fetchPreuves,
  createPreuve,
  createPreuveEnquete,
  fetchPreuveDetail,
  updatePreuve,
  deletePreuve,
  fetchRapports,
  createRapport,
  createRapportEnquete,
  fetchRapportDetail,
  updateRapport,
  deleteRapport,
  fetchObservations,
  createObservation,
  fetchObservationDetail,
  updateObservation,
  deleteObservation,
  fetchAvancement,
  updateAvancement,
  fetchAvancementDetail,
  editAvancementEntry,
  deleteAvancementEntry,
  // Nouvelles méthodes pour les enquêtes
  fetchEnquetes,
  createEnquete,
  fetchEnqueteDetail,
  updateEnquete,
  deleteEnquete,
  updateEnqueteStatut,
  fetchEnqueteRapports,
  fetchTypesEnquete,
  // Relations Enquête-Criminel
  fetchEnqueteCriminels,
  createEnqueteCriminel,
  updateEnqueteCriminel,
  deleteEnqueteCriminel,
}

