/**
 * Service API pour la gestion des enquêtes améliorées
 */
import { get, post, patch, del } from './apiGlobal'

const BASE = '/enquete'

// Configuration pour les uploads multipart
const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
}

/**
 * Construit un FormData à partir d'un objet
 */
const buildFormData = (payload) => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Pour les ManyToMany fields
        value.forEach(item => formData.append(key, item))
      } else if (value instanceof File || value instanceof Blob) {
        formData.append(key, value)
      } else {
        formData.append(key, value)
      }
    }
  })
  return formData
}

// ============================================================================
// ENQUÊTES
// ============================================================================

/**
 * Récupère la liste des enquêtes avec filtres
 */
export const fetchEnquetes = async (params = {}) => {
  const queryParams = new URLSearchParams()
  
  // Filtres
  if (params.statut) queryParams.append('statut', params.statut)
  if (params.type_enquete) queryParams.append('type_enquete', params.type_enquete)
  if (params.niveau_priorite) queryParams.append('niveau_priorite', params.niveau_priorite)
  if (params.enqueteur) queryParams.append('enqueteur', params.enqueteur)
  if (params.date_debut) queryParams.append('date_debut', params.date_debut)
  if (params.date_fin) queryParams.append('date_fin', params.date_fin)
  if (params.search) queryParams.append('search', params.search)
  if (params.ordering) queryParams.append('ordering', params.ordering)
  if (params.page) queryParams.append('page', params.page)
  if (params.page_size) queryParams.append('page_size', params.page_size)
  
  const url = `${BASE}/list/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await get(url)
  return response.data
}

/**
 * Récupère les détails d'une enquête
 */
export const fetchEnqueteDetail = async (enqueteId) => {
  const response = await get(`${BASE}/${enqueteId}/`)
  return response.data
}

/**
 * Crée une nouvelle enquête
 */
export const createEnquete = async (payload) => {
  const response = await post(`${BASE}/create/`, payload)
  return response.data
}

/**
 * Met à jour une enquête
 */
export const updateEnquete = async (enqueteId, payload) => {
  const response = await patch(`${BASE}/${enqueteId}/`, payload)
  return response.data
}

/**
 * Supprime une enquête
 */
export const deleteEnquete = async (enqueteId) => {
  const response = await del(`${BASE}/${enqueteId}/`)
  return response.data
}

/**
 * Clôture une enquête
 */
export const cloturerEnquete = async (enqueteId) => {
  const response = await post(`${BASE}/${enqueteId}/cloturer/`)
  return response.data
}

/**
 * Récupère les pièces d'une enquête
 */
export const fetchPiecesEnquete = async (enqueteId) => {
  const response = await get(`${BASE}/${enqueteId}/pieces/`)
  return response.data
}

// ============================================================================
// PIÈCES D'ENQUÊTE
// ============================================================================

/**
 * Récupère la liste des pièces d'enquête
 */
export const fetchPieces = async (params = {}) => {
  const queryParams = new URLSearchParams()
  
  if (params.enquete) queryParams.append('enquete', params.enquete)
  if (params.type_piece) queryParams.append('type_piece', params.type_piece)
  if (params.est_confidentiel !== undefined) queryParams.append('est_confidentiel', params.est_confidentiel)
  if (params.search) queryParams.append('search', params.search)
  if (params.ordering) queryParams.append('ordering', params.ordering)
  
  const url = `${BASE}/preuves/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await get(url)
  return response.data
}

/**
 * Récupère les détails d'une pièce
 */
export const fetchPieceDetail = async (pieceId) => {
  const response = await get(`${BASE}/preuves/item/${pieceId}/`)
  return response.data
}

/**
 * Crée une nouvelle pièce d'enquête (avec upload de fichier)
 */
export const createPiece = async (payload) => {
  const formData = buildFormData(payload)
  const response = await post(`${BASE}/preuves/create/`, formData, multipartConfig)
  return response.data
}

/**
 * Met à jour une pièce d'enquête
 */
export const updatePiece = async (pieceId, payload) => {
  const formData = buildFormData(payload)
  const response = await patch(`${BASE}/preuves/item/${pieceId}/`, formData, multipartConfig)
  return response.data
}

/**
 * Supprime une pièce d'enquête
 */
export const deletePiece = async (pieceId) => {
  const response = await del(`${BASE}/preuves/item/${pieceId}/`)
  return response.data
}

/**
 * Télécharge une pièce d'enquête
 */
export const downloadPiece = async (pieceId) => {
  const response = await get(`${BASE}/preuves/item/${pieceId}/download/`, {
    responseType: 'blob',
  })
  return response.data
}

export default {
  // Enquêtes
  fetchEnquetes,
  fetchEnqueteDetail,
  createEnquete,
  updateEnquete,
  deleteEnquete,
  cloturerEnquete,
  fetchPiecesEnquete,
  // Pièces
  fetchPieces,
  fetchPieceDetail,
  createPiece,
  updatePiece,
  deletePiece,
  downloadPiece,
}

