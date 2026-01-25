/**
 * Hook personnalisé pour gérer les formulaires avec chargement de données
 * Charge automatiquement les données existantes avant modification
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook pour gérer un formulaire avec chargement de données
 * 
 * @param {Function} fetchDataFn - Fonction pour récupérer les données (async)
 * @param {Object} initialData - Données initiales du formulaire
 * @param {any} dataId - ID des données à charger (optionnel)
 * @returns {Object} État et fonctions du formulaire
 * 
 * @example
 * const { formData, setFormData, loading, error, reloadData } = useFormWithData(
 *   () => getUserById(userId),
 *   { nom: '', prenom: '', email: '' },
 *   userId
 * )
 */
export const useFormWithData = (fetchDataFn, initialData, dataId = null) => {
  const [formData, setFormData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  /**
   * Charger les données depuis le serveur
   */
  const loadData = useCallback(async () => {
    if (!dataId || !fetchDataFn) {
      setIsDataLoaded(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchDataFn(dataId)
      setFormData(data)
      setIsDataLoaded(true)
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [dataId, fetchDataFn])

  /**
   * Recharger les données (après modification par exemple)
   */
  const reloadData = useCallback(async () => {
    setIsDataLoaded(false)
    await loadData()
  }, [loadData])

  /**
   * Réinitialiser le formulaire
   */
  const resetForm = useCallback(() => {
    setFormData(initialData)
    setError(null)
  }, [initialData])

  /**
   * Mettre à jour un champ du formulaire
   */
  const updateField = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }, [])

  /**
   * Mettre à jour plusieurs champs
   */
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  // Charger les données au montage du composant
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    formData,
    setFormData,
    loading,
    error,
    isDataLoaded,
    reloadData,
    resetForm,
    updateField,
    updateFields,
  }
}

/**
 * Hook pour gérer la soumission d'un formulaire
 * 
 * @param {Function} submitFn - Fonction de soumission (async)
 * @param {Function} onSuccess - Callback en cas de succès (optionnel)
 * @param {Function} onError - Callback en cas d'erreur (optionnel)
 * @returns {Object} État et fonction de soumission
 * 
 * @example
 * const { submitting, submitError, submitSuccess, handleSubmit } = useFormSubmit(
 *   (data) => updateUser(userId, data),
 *   () => console.log('Succès!'),
 *   (err) => console.error('Erreur:', err)
 * )
 */
export const useFormSubmit = (submitFn, onSuccess = null, onError = null) => {
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = useCallback(async (data) => {
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      const result = await submitFn(data)
      setSubmitSuccess(true)
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (err) {
      console.error('Erreur lors de la soumission:', err)
      setSubmitError(err.message || 'Erreur lors de la soumission')
      
      if (onError) {
        onError(err)
      }
      
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [submitFn, onSuccess, onError])

  const clearMessages = useCallback(() => {
    setSubmitError(null)
    setSubmitSuccess(false)
  }, [])

  return {
    submitting,
    submitError,
    submitSuccess,
    handleSubmit,
    clearMessages,
  }
}

/**
 * Hook combiné pour formulaire avec chargement et soumission
 * 
 * @param {Function} fetchDataFn - Fonction pour récupérer les données
 * @param {Function} submitFn - Fonction de soumission
 * @param {Object} initialData - Données initiales
 * @param {any} dataId - ID des données à charger
 * @returns {Object} État et fonctions combinés
 * 
 * @example
 * const {
 *   formData,
 *   setFormData,
 *   loading,
 *   submitting,
 *   error,
 *   submitError,
 *   handleSubmit,
 *   reloadData,
 * } = useFormWithDataAndSubmit(
 *   () => getUserById(userId),
 *   (data) => updateUser(userId, data),
 *   { nom: '', prenom: '' },
 *   userId
 * )
 */
export const useFormWithDataAndSubmit = (
  fetchDataFn,
  submitFn,
  initialData,
  dataId = null
) => {
  const formHook = useFormWithData(fetchDataFn, initialData, dataId)
  const submitHook = useFormSubmit(
    submitFn,
    () => {
      // Recharger les données après succès
      formHook.reloadData()
    }
  )

  return {
    ...formHook,
    ...submitHook,
  }
}

export default useFormWithData

