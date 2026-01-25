/**
 * Service d'intégration IA
 * Gère les fonctionnalités d'intelligence artificielle
 */

import { get, post, uploadFile } from './apiGlobal'

/**
 * Analyser un texte avec l'IA
 * @param {string} text - Texte à analyser
 * @param {string} analysisType - Type d'analyse (sentiment, entities, etc.)
 * @returns {Promise<object>} Résultat de l'analyse
 */
export const analyzeText = async (text, analysisType = 'general') => {
  try {
    const response = await post('/ai/analyze-text/', {
      text,
      analysis_type: analysisType
    })
    return response.data
  } catch (error) {
    console.error('Erreur analyse texte IA:', error)
    throw error
  }
}

/**
 * Générer une prédiction
 * @param {object} data - Données pour la prédiction
 * @returns {Promise<object>} Prédiction
 */
export const generatePrediction = async (data) => {
  try {
    const response = await post('/ai/predict/', data)
    return response.data
  } catch (error) {
    console.error('Erreur prédiction IA:', error)
    throw error
  }
}

/**
 * Reconnaissance faciale
 * @param {File} imageFile - Fichier image
 * @returns {Promise<object>} Résultats de reconnaissance
 */
export const faceRecognition = async (imageFile) => {
  try {
    const response = await uploadFile('/ai/face-recognition/', imageFile)
    return response.data
  } catch (error) {
    console.error('Erreur reconnaissance faciale:', error)
    throw error
  }
}

/**
 * Extraire des informations d'un document
 * @param {File} documentFile - Fichier document
 * @returns {Promise<object>} Informations extraites
 */
export const extractDocumentInfo = async (documentFile) => {
  try {
    const response = await uploadFile('/ai/extract-document/', documentFile)
    return response.data
  } catch (error) {
    console.error('Erreur extraction document:', error)
    throw error
  }
}

/**
 * Suggérer des liens entre fiches criminelles
 * @param {number} criminalFileId - ID de la fiche criminelle
 * @returns {Promise<Array>} Fiches similaires
 */
export const suggestLinks = async (criminalFileId) => {
  try {
    const response = await get(`/ai/suggest-links/${criminalFileId}/`)
    return response.data
  } catch (error) {
    console.error('Erreur suggestion liens:', error)
    throw error
  }
}

/**
 * Générer un résumé automatique
 * @param {string} text - Texte à résumer
 * @param {number} maxLength - Longueur maximale du résumé
 * @returns {Promise<string>} Résumé
 */
export const generateSummary = async (text, maxLength = 200) => {
  try {
    const response = await post('/ai/summarize/', { text, max_length: maxLength })
    return response.data.summary
  } catch (error) {
    console.error('Erreur génération résumé:', error)
    throw error
  }
}

/**
 * Détecter des patterns criminels
 * @param {object} criteria - Critères de recherche
 * @returns {Promise<object>} Patterns détectés
 */
export const detectPatterns = async (criteria) => {
  try {
    const response = await post('/ai/detect-patterns/', criteria)
    return response.data
  } catch (error) {
    console.error('Erreur détection patterns:', error)
    throw error
  }
}

/**
 * Chat avec l'assistant IA
 * @param {string} message - Message à envoyer
 * @param {Array} context - Contexte de la conversation
 * @returns {Promise<object>} Réponse de l'IA
 */
export const chatWithAI = async (message, context = []) => {
  try {
    const response = await post('/ai/chat/', { message, context })
    return response.data
  } catch (error) {
    console.error('Erreur chat IA:', error)
    throw error
  }
}

export default {
  analyzeText,
  generatePrediction,
  faceRecognition,
  extractDocumentInfo,
  suggestLinks,
  generateSummary,
  detectPatterns,
  chatWithAI,
}

