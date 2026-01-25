import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getInvestigationById, closeInvestigation } from '../services/investigationService'
import { 
  FileText, 
  CheckCircle, 
  ArrowLeft, 
  AlertCircle, 
  Shield,
  Calendar,
  User,
  Clock,
  FileCheck
} from 'lucide-react'

const CloseCase = () => {
  const navigate = useNavigate()
  const { uuid } = useParams()
  const [investigation, setInvestigation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [closingData, setClosingData] = useState({
    final_report: '',
    conclusion: '',
    recommendations: '',
    closing_notes: ''
  })

  useEffect(() => {
    const loadInvestigation = async () => {
      try {
        const data = await getInvestigationById(uuid)
        setInvestigation(data)
      } catch (error) {
        console.error('Erreur chargement investigation:', error)
        setError('Erreur lors du chargement de l\'enquête')
      }
    }

    if (uuid) {
      loadInvestigation()
    }
  }, [uuid])

  const handleChange = (e) => {
    const { name, value } = e.target
    setClosingData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await closeInvestigation(uuid)
      setSuccess(true)
      console.log(` Case ${investigation.case_number} has been officially closed.`)
      
      // Rediriger vers le tableau de bord après 3 secondes
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
      
    } catch (error) {
      setError(error.message || 'Erreur lors de la clôture de l\'enquête')
      console.error('Erreur clôture enquête:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Enquête clôturée !
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              L'enquête {investigation?.case_number} a été officiellement clôturée.
              Vous allez être redirigé vers le tableau de bord.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!investigation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (investigation.status === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-yellow-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Enquête déjà clôturée
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Cette enquête a déjà été clôturée le {new Date(investigation.date_closed).toLocaleDateString('fr-FR')}.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Clôturer l'enquête
                </h1>
                <p className="text-gray-600">
                  Finaliser et clôturer l'enquête {investigation.case_number}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informations de l'enquête */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Informations de l'enquête
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {investigation.title}
                </h4>
                <p className="text-gray-600 mb-4">
                  {investigation.description}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Numéro de dossier:</span>
                  <span className="text-sm text-gray-900">{investigation.case_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Statut:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(investigation.status)}`}>
                    {investigation.status_display}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Priorité:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(investigation.priority)}`}>
                    {investigation.priority_display}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Enquêteur:</span>
                  <span className="text-sm text-gray-900">{investigation.assigned_investigator_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Date d'ouverture:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(investigation.date_opened).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Durée:</span>
                  <span className="text-sm text-gray-900">{investigation.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire de clôture */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Rapport de clôture
            </h3>
            <p className="text-sm text-gray-600">
              Remplissez les informations finales avant de clôturer l'enquête
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            <div>
              <label htmlFor="final_report" className="block text-sm font-medium text-gray-700 mb-2">
                <FileCheck className="inline h-4 w-4 mr-1" />
                Rapport final *
              </label>
              <textarea
                id="final_report"
                name="final_report"
                required
                rows={6}
                value={closingData.final_report}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Résumé complet de l'enquête, actions menées, résultats obtenus..."
              />
            </div>

            <div>
              <label htmlFor="conclusion" className="block text-sm font-medium text-gray-700 mb-2">
                <CheckCircle className="inline h-4 w-4 mr-1" />
                Conclusion *
              </label>
              <textarea
                id="conclusion"
                name="conclusion"
                required
                rows={4}
                value={closingData.conclusion}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Conclusion de l'enquête, verdict, décisions prises..."
              />
            </div>

            <div>
              <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700 mb-2">
                Recommandations
              </label>
              <textarea
                id="recommendations"
                name="recommendations"
                rows={4}
                value={closingData.recommendations}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Recommandations pour la suite, mesures préventives, améliorations..."
              />
            </div>

            <div>
              <label htmlFor="closing_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes de clôture
              </label>
              <textarea
                id="closing_notes"
                name="closing_notes"
                rows={3}
                value={closingData.closing_notes}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Notes internes, remarques finales..."
              />
            </div>

            {/* Avertissement */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Attention
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      La clôture de cette enquête est définitive. Assurez-vous que toutes les 
                      informations sont correctes et que tous les éléments de preuve ont été 
                      traités avant de procéder.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Erreur de clôture
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {loading ? 'Clôture...' : 'Clôturer l\'enquête'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CloseCase
