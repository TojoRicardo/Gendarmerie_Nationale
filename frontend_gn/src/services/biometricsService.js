/**
 * Service de gestion des données biométriques
 * Gère les empreintes digitales, photos, et autres données biométriques
 * 
 * Conformité:
 * - ISO/IEC 19794-5:2011 (Format d'images faciales)
 * - ISO/IEC 39794-5:2019 (Templates biométriques)
 * - ISO/IEC 30137-1:2019 (Comparaison judiciaire)
 * - RGPD (Protection des données biométriques)
 */

import { get, post, put, del, uploadFile } from './apiGlobal'
import { 
  validateImageISO19794_5, 
  generateISO19794_5Metadata 
} from '../utils/imageStandardsValidator'
import { 
  createRecognitionLog,
  createSecurityMetadata 
} from '../utils/biometricMetadataService'

/**
 * Récupérer toutes les données biométriques d'une fiche
 * @param {number} criminalFileId - ID de la fiche criminelle
 * @returns {Promise<object>} Données biométriques
 */
export const getBiometrics = async (criminalFileId = null) => {
  try {
    const url = criminalFileId 
      ? `/biometrics/?criminal_file=${criminalFileId}`
      : '/biometrics/'
    const response = await get(url)
    return response.data
  } catch (error) {
    console.error('Erreur récupération biométrie:', error)
    throw error
  }
}

/**
 * Récupérer une donnée biométrique par son ID
 * @param {number} biometricId - ID de la donnée biométrique
 * @returns {Promise<object>} Donnée biométrique
 */
export const getBiometricById = async (biometricId) => {
  try {
    const response = await get(`/biometrics/${biometricId}/`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération donnée biométrique:', error)
    throw error
  }
}

/**
 * Ajouter une photo criminelle
 * @param {object} photoData - {criminal_file, type_photo, fichier}
 * @returns {Promise<object>} Photo créée
 */
export const addPhoto = async (photoData) => {
  try {
    const response = await post('/biometrics/photos/', photoData)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur ajout photo:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de l\'ajout de la photo',
      errors: error.response?.data,
    }
  }
}

/**
 * Upload d'une photo criminelle avec fichier (Conforme ISO/IEC 19794-5)
 * @param {File} file - Fichier photo
 * @param {object} data - {criminal_file, type_photo, description}
 * @param {Function} onProgress - Callback de progression
 * @param {Boolean} validateISO - Activer la validation ISO (défaut: true)
 * @returns {Promise<object>} Photo uploadée avec métadonnées ISO
 */
export const uploadPhoto = async (file, data, onProgress = null, validateISO = true) => {
  try {
    let isoMetadata = null
    let validationResult = null

    // Validation ISO/IEC 19794-5 (optionnelle mais recommandée)
    if (validateISO) {
      console.log(' Validation ISO/IEC 19794-5 en cours...')
      validationResult = await validateImageISO19794_5(file)
      
      if (!validationResult.isCompliant) {
        console.warn(' Image non conforme ISO/IEC 19794-5:', validationResult.errors)
        // On continue quand même mais on enregistre les erreurs
      }

      // Générer les métadonnées ISO
      isoMetadata = await generateISO19794_5Metadata(
        file, 
        data.type_photo === 'face' ? 'frontal' : 
        data.type_photo === 'profil_gauche' ? 'left_profile' : 
        data.type_photo === 'profil_droit' ? 'right_profile' : 'frontal'
      )

      console.log(' Métadonnées ISO/IEC 19794-5 générées')
    }

    // Métadonnées de sécurité ISO 27001
    const securityMetadata = createSecurityMetadata({
      data_type: 'facial_image',
      criminal_file_id: data.criminal_file
    })

    // Ajouter les métadonnées à la requête
    const enrichedData = {
      ...data,
      iso_metadata: isoMetadata,
      security_metadata: securityMetadata,
      validation_result: validationResult ? {
        is_compliant: validationResult.isCompliant,
        quality_score: validationResult.metadata?.qualityScore,
        errors_count: validationResult.errors?.length || 0,
        warnings_count: validationResult.warnings?.length || 0
      } : null
    }

    const response = await uploadFile('/biometrics/photos/upload/', file, onProgress, enrichedData)
    
    return { 
      success: true, 
      data: response.data,
      iso_compliance: {
        validated: validateISO,
        compliant: validationResult?.isCompliant || null,
        standard: 'ISO/IEC 19794-5:2011'
      }
    }
  } catch (error) {
    console.error('Erreur upload photo:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de l\'upload de la photo',
      errors: error.response?.data,
    }
  }
}

/**
 * Ajouter une empreinte digitale
 * @param {object} fingerprintData - Données de l'empreinte
 * @returns {Promise<object>} Empreinte créée
 */
export const addFingerprint = async (fingerprintData) => {
  try {
    const response = await post('/biometrics/fingerprints/', fingerprintData)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur ajout empreinte:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de l\'ajout de l\'empreinte',
      errors: error.response?.data,
    }
  }
}

/**
 * Upload d'une empreinte digitale avec fichier
 * @param {File} file - Fichier empreinte
 * @param {object} data - {criminal_file, doigt, main}
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<object>} Empreinte uploadée
 */
export const uploadFingerprint = async (file, data, onProgress = null) => {
  try {
    const response = await uploadFile('/biometrics/fingerprints/upload/', file, onProgress, data)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur upload empreinte:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de l\'upload de l\'empreinte',
      errors: error.response?.data,
    }
  }
}

/**
 * Mettre à jour une donnée biométrique
 * @param {number} biometricId - ID de la donnée
 * @param {object} data - Nouvelles données
 * @returns {Promise<object>} Donnée mise à jour
 */
export const updateBiometric = async (biometricId, data) => {
  try {
    const response = await put(`/biometrics/${biometricId}/`, data)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur mise à jour biométrie:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur de mise à jour',
      errors: error.response?.data,
    }
  }
}

/**
 * Supprimer une donnée biométrique
 * @param {number} biometricId - ID de la donnée
 * @returns {Promise<object>} Résultat
 */
export const deleteBiometric = async (biometricId) => {
  try {
    const response = await del(`/biometrie/biometrics/${biometricId}/`)
    return { success: true, message: 'Donnée biométrique supprimée avec succès', data: response.data }
  } catch (error) {
    console.error('Erreur suppression biométrie:', error)
    
    // Gérer spécifiquement les erreurs 401 (non autorisé)
    if (error.response?.status === 401) {
      throw {
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer cette donnée biométrique. Veuillez vous reconnecter.',
        status: 401,
      }
    }
    
    // Extraire le message d'erreur depuis la réponse
    let errorMessage = 'Erreur lors de la suppression de la donnée biométrique'
    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data
      }
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data,
      status: error.response?.status,
    }
  }
}

/**
 * Comparer des empreintes digitales
 * @param {number} fingerprintId - ID de l'empreinte de référence
 * @param {File} compareFile - Fichier à comparer
 * @returns {Promise<object>} Résultat de comparaison
 */
export const compareFingerprints = async (fingerprintId, compareFile) => {
  try {
    const response = await uploadFile(
      `/biometrics/fingerprints/${fingerprintId}/compare/`,
      compareFile
    )
    return response.data
  } catch (error) {
    console.error('Erreur comparaison empreintes:', error)
    throw error
  }
}

/**
 * Récupérer les logs de reconnaissance faciale
 * @param {Object} filters - Filtres de recherche
 * @returns {Promise<Array>} Liste des logs
 */
export const getRecognitionLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams()
    
    if (filters.startDate) params.append('start_date', filters.startDate)
    if (filters.endDate) params.append('end_date', filters.endDate)
    if (filters.userId) params.append('user_id', filters.userId)
    if (filters.matchedOnly !== undefined) params.append('matched_only', filters.matchedOnly)
    
    const response = await get(`/biometrics/recognition-logs/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération logs reconnaissance:', error)
    throw error
  }
}

/**
 * Exporter les logs de reconnaissance en CSV (pour audit)
 * @param {Array} logs - Logs à exporter
 * @returns {Promise<Blob>} Fichier CSV
 */
export const exportRecognitionLogsToCsv = async (logs) => {
  try {
    const response = await post('/biometrics/recognition-logs/export/', 
      { logs },
      { responseType: 'blob' }
    )
    return response.data
  } catch (error) {
    console.error('Erreur export logs:', error)
    throw error
  }
}

/**
 * Valider la conformité d'une image biométrique
 * @param {File} file - Fichier à valider
 * @returns {Promise<Object>} Résultat de validation
 */
export const validateBiometricImage = async (file) => {
  try {
    const validation = await validateImageISO19794_5(file)
    const metadata = await generateISO19794_5Metadata(file)
    
    return {
      validation,
      metadata,
      compliant: validation.isCompliant,
      standard: 'ISO/IEC 19794-5:2011'
    }
  } catch (error) {
    console.error('Erreur validation image:', error)
    throw error
  }
}

export default {
  getBiometrics,
  getBiometricById,
  addPhoto,
  uploadPhoto,
  addFingerprint,
  uploadFingerprint,
  updateBiometric,
  deleteBiometric,
  compareFingerprints,
  getRecognitionLogs,
  exportRecognitionLogsToCsv,
  validateBiometricImage,
}

