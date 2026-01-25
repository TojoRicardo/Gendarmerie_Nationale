/**
 * Service API pour le versement des dossiers d'enquête
 */
import { get, post, patch, del } from './apiGlobal'

const BASE = '/enquete/dossier'

/**
 * Verser un dossier d'enquête complet
 */
export const verserDossierEnquete = async (data) => {
  const response = await post(`${BASE}/versement/`, data)
  return response.data
}

/**
 * Récupérer un dossier d'enquête complet avec toutes les sections
 */
export const fetchDossierEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/${enqueteId}/`)
  return response.data
}

// ============================================================================
// PERSONNES
// ============================================================================

export const fetchPersonnesEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/personnes/?enquete=${enqueteId}`)
  return response.data
}

export const createPersonneEnquete = async (data) => {
  const response = await post(`${BASE}/personnes/`, data)
  return response.data
}

export const updatePersonneEnquete = async (id, data) => {
  const response = await patch(`${BASE}/personnes/${id}/`, data)
  return response.data
}

export const deletePersonneEnquete = async (id) => {
  const response = await del(`${BASE}/personnes/${id}/`)
  return response.data
}

// ============================================================================
// INFRACTIONS
// ============================================================================

export const fetchInfractionsEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/infractions/?enquete=${enqueteId}`)
  return response.data
}

export const createInfractionEnquete = async (data) => {
  const response = await post(`${BASE}/infractions/`, data)
  return response.data
}

export const updateInfractionEnquete = async (id, data) => {
  const response = await patch(`${BASE}/infractions/${id}/`, data)
  return response.data
}

export const deleteInfractionEnquete = async (id) => {
  const response = await del(`${BASE}/infractions/${id}/`)
  return response.data
}

// ============================================================================
// PREUVES
// ============================================================================

export const fetchPreuvesEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/preuves/?enquete=${enqueteId}`)
  return response.data
}

export const createPreuveEnquete = async (data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value)
      } else {
        formData.append(key, value)
      }
    }
  })
  const response = await post(`${BASE}/preuves/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const updatePreuveEnquete = async (id, data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value)
      } else {
        formData.append(key, value)
      }
    }
  })
  const response = await patch(`${BASE}/preuves/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const deletePreuveEnquete = async (id) => {
  const response = await del(`${BASE}/preuves/${id}/`)
  return response.data
}

// ============================================================================
// RAPPORTS
// ============================================================================

export const fetchRapportsTypes = async () => {
  const response = await get(`${BASE}/rapports-types/`)
  return response.data
}

export const fetchRapportsEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/rapports/?enquete=${enqueteId}`)
  return response.data
}

export const createRapportEnquete = async (data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value)
      } else {
        formData.append(key, value)
      }
    }
  })
  const response = await post(`${BASE}/rapports/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const updateRapportEnquete = async (id, data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value)
      } else {
        formData.append(key, value)
      }
    }
  })
  const response = await patch(`${BASE}/rapports/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const validerRapportEnquete = async (id) => {
  const response = await post(`${BASE}/rapports/${id}/valider/`)
  return response.data
}

export const deleteRapportEnquete = async (id) => {
  const response = await del(`${BASE}/rapports/${id}/`)
  return response.data
}

// ============================================================================
// DONNÉES BIOMÉTRIQUES
// ============================================================================

export const fetchBiometrieEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/biometrie/?enquete=${enqueteId}`)
  return response.data
}

export const createBiometrieEnquete = async (data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value)
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, value)
      }
    }
  })
  const response = await post(`${BASE}/biometrie/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const updateBiometrieEnquete = async (id, data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value)
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, value)
      }
    }
  })
  const response = await patch(`${BASE}/biometrie/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const deleteBiometrieEnquete = async (id) => {
  const response = await del(`${BASE}/biometrie/${id}/`)
  return response.data
}

// ============================================================================
// JOURNAL D'AUDIT
// ============================================================================

export const fetchAuditLogsEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/audit-logs/?enquete=${enqueteId}`)
  return response.data
}

// ============================================================================
// DÉCISION DE CLÔTURE
// ============================================================================

export const createDecisionCloture = async (data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value)
      } else {
        formData.append(key, value)
      }
    }
  })
  const response = await post(`${BASE}/decisions/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const fetchDecisionCloture = async (enqueteId) => {
  const response = await get(`${BASE}/decisions/?enquete=${enqueteId}`)
  return response.data
}

export default {
  verserDossierEnquete,
  fetchDossierEnquete,
  fetchPersonnesEnquete,
  createPersonneEnquete,
  updatePersonneEnquete,
  deletePersonneEnquete,
  fetchInfractionsEnquete,
  createInfractionEnquete,
  updateInfractionEnquete,
  deleteInfractionEnquete,
  fetchPreuvesEnquete,
  createPreuveEnquete,
  updatePreuveEnquete,
  deletePreuveEnquete,
  fetchRapportsTypes,
  fetchRapportsEnquete,
  createRapportEnquete,
  updateRapportEnquete,
  validerRapportEnquete,
  deleteRapportEnquete,
  fetchBiometrieEnquete,
  createBiometrieEnquete,
  updateBiometrieEnquete,
  deleteBiometrieEnquete,
  fetchAuditLogsEnquete,
  createDecisionCloture,
  fetchDecisionCloture,
}

