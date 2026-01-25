import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Upload, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Camera,
  File,
  Clock,
  User,
  Shield,
  Search,
  Filter
} from 'lucide-react'

const EvidenceManagement = () => {
  const navigate = useNavigate()
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    description: '',
    evidence_type: '',
    linked_case: '',
    confidentiel: false,
    date_collecte: new Date().toISOString().split('T')[0],
    file: null
  })

  const evidenceTypes = [
    'Photo',
    'Document',
    'Audio',
    'Vidéo',
    'Objet physique',
    'Témoignage',
    'Expertise',
    'Analyse ADN',
    'Empreinte digitale',
    'Autre'
  ]

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('description', uploadForm.description)
      formData.append('evidence_type', uploadForm.evidence_type)
      formData.append('linked_case', uploadForm.linked_case)
      formData.append('confidentiel', uploadForm.confidentiel)
      formData.append('date_collecte', uploadForm.date_collecte)
      formData.append('file', uploadForm.file)

      // Ici vous appelleriez votre API pour uploader la preuve
      // const result = await uploadEvidence(formData)
      
      console.log(` Evidence ${uploadForm.description} successfully uploaded and linked to case ${uploadForm.linked_case}`)
      
      setShowUploadModal(false)
      setUploadForm({
        description: '',
        evidence_type: '',
        linked_case: '',
        confidentiel: false,
        date_collecte: new Date().toISOString().split('T')[0],
        file: null
      })
      
      // Recharger la liste des preuves
      // loadEvidence()
      
    } catch (error) {
      setError(error.message || 'Erreur lors de l\'upload de la preuve')
      console.error('Erreur upload preuve:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEvidenceIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'photo':
      case 'vidéo':
        return <Camera className="h-5 w-5" />
      case 'audio':
        return <File className="h-5 w-5" />
      case 'document':
        return <FileText className="h-5 w-5" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  const getEvidenceTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'photo':
      case 'vidéo':
        return 'bg-blue-100 text-blue-800'
      case 'audio':
        return 'bg-green-100 text-green-800'
      case 'document':
        return 'bg-gray-100 text-gray-800'
      case 'expertise':
        return 'bg-purple-100 text-purple-800'
      case 'analyse adn':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Gestion des preuves
                  </h1>
                  <p className="text-gray-600">
                    Collecte, organisation et analyse des éléments de preuve
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Ajouter une preuve
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Filtres et recherche */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="inline h-4 w-4 mr-1" />
                    Recherche
                  </label>
                  <input
                    type="text"
                    placeholder="Description, type..."
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="inline h-4 w-4 mr-1" />
                    Type de preuve
                  </label>
                  <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm">
                    <option value="">Tous les types</option>
                    {evidenceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dossier lié
                  </label>
                  <input
                    type="text"
                    placeholder="Numéro de dossier..."
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidentialité
                  </label>
                  <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm">
                    <option value="">Tous</option>
                    <option value="false">Public</option>
                    <option value="true">Confidentiel</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des preuves */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Preuves collectées
              </h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {/* Exemple de preuve */}
              <div className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Camera className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Photo de la scène de crime - Centre ville
                      </p>
                      <p className="text-sm text-gray-500">
                        Dossier: ENQ-2024-0001 • Collectée le 15/01/2024
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Photo
                    </span>
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-1" />
                      Insp. Dupont
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      14:30
                    </div>
                  </div>
                </div>
              </div>

              {/* Autre exemple */}
              <div className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Rapport d'expertise balistique
                      </p>
                      <p className="text-sm text-gray-500">
                        Dossier: ENQ-2024-0002 • Collectée le 16/01/2024
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Expertise
                    </span>
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-1" />
                      Dr. Martin
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Shield className="h-4 w-4 mr-1 text-red-500" />
                      Confidentiel
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Ajouter une preuve
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Décrivez la preuve collectée..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type de preuve *
                  </label>
                  <select
                    required
                    value={uploadForm.evidence_type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, evidence_type: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  >
                    <option value="">Sélectionner un type</option>
                    {evidenceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dossier lié
                  </label>
                  <input
                    type="text"
                    value={uploadForm.linked_case}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, linked_case: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="ENQ-2024-XXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date de collecte
                  </label>
                  <input
                    type="date"
                    value={uploadForm.date_collecte}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, date_collecte: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fichier *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] }))}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="confidentiel"
                    checked={uploadForm.confidentiel}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, confidentiel: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="confidentiel" className="ml-2 block text-sm text-gray-900">
                    Marquer comme confidentiel
                  </label>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Erreur d'upload
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          {error}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {loading ? 'Upload...' : 'Uploader'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EvidenceManagement
