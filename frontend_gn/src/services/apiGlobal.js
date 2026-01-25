/**
 * Service API global qui utilise la vraie API Django
 */

// Import de la vraie API
import * as api from './api'

// Réexporter toutes les fonctions
export const get = api.get
export const post = api.post
export const put = api.put
export const patch = api.patch
export const del = api.del
export const uploadFile = api.uploadFile
export const uploadMultipleFiles = api.uploadMultipleFiles
export const requestWithRetry = api.requestWithRetry

// Export par défaut
export default api.default
