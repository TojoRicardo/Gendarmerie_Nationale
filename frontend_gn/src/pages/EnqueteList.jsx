/**
 * Composant pour la liste des enquêtes
 * Avec recherche, filtres et pagination
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import {
  fetchEnquetes,
  deleteEnquete,
  cloturerEnquete,
} from '../services/enqueteEnhancedService'

const STATUT_COLORS = {
  ouverte: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-yellow-100 text-yellow-700',
  suspendue: 'bg-orange-100 text-orange-700',
  cloturee: 'bg-green-100 text-green-700',
}

const PRIORITE_COLORS = {
  faible: 'bg-gray-100 text-gray-700',
  moyen: 'bg-blue-100 text-blue-700',
  elevee: 'bg-orange-100 text-orange-700',
  critique: 'bg-red-100 text-red-700',
}

const EnqueteList = () => {
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  
  const [enquetes, setEnquetes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filtres, setFiltres] = useState({
    statut: '',
    type_enquete: '',
    niveau_priorite: '',
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadEnquetes()
  }, [page, filtres, searchQuery])

  const loadEnquetes = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: 12,
        ...filtres,
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      
      const data = await fetchEnquetes(params)
      setEnquetes(data.results || data)
      setTotalPages(data.total_pages || 1)
      setTotalCount(data.count || data.length || 0)
    } catch (error) {
      console.error('Erreur chargement enquêtes:', error)
      showError('Impossible de charger les enquêtes.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (enqueteId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette enquête ?')) {
      return
    }
    
    try {
      await deleteEnquete(enqueteId)
      showSuccess('Enquête supprimée avec succès.')
      loadEnquetes()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showError('Impossible de supprimer l\'enquête.')
    }
  }

  const handleCloturer = async (enqueteId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir clôturer cette enquête ?')) {
      return
    }
    
    try {
      await cloturerEnquete(enqueteId)
      showSuccess('Enquête clôturée avec succès.')
      loadEnquetes()
    } catch (error) {
      console.error('Erreur clôture:', error)
      showError('Impossible de clôturer l\'enquête.')
    }
  }

  const handleFiltreChange = (key, value) => {
    setFiltres(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const resetFiltres = () => {
    setFiltres({
      statut: '',
      type_enquete: '',
      niveau_priorite: '',
    })
    setSearchQuery('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Enquêtes</h1>
            <p className="text-gray-600 mt-1">
              {totalCount} enquête{totalCount > 1 ? 's' : ''} au total
            </p>
          </div>
          <button
            onClick={() => navigate('/enquetes/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Nouvelle enquête
          </button>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtre Statut */}
            <select
              value={filtres.statut}
              onChange={(e) => handleFiltreChange('statut', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="ouverte">Ouverte</option>
              <option value="en_cours">En cours</option>
              <option value="suspendue">Suspendue</option>
              <option value="cloturee">Clôturée</option>
            </select>

            {/* Filtre Type */}
            <select
              value={filtres.type_enquete}
              onChange={(e) => handleFiltreChange('type_enquete', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les types</option>
              <option value="penale">Pénale</option>
              <option value="criminelle">Criminelle</option>
              <option value="terrorisme">Terrorisme</option>
              <option value="cybercriminalite">Cybercriminalité</option>
            </select>

            {/* Filtre Priorité */}
            <select
              value={filtres.niveau_priorite}
              onChange={(e) => handleFiltreChange('niveau_priorite', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les priorités</option>
              <option value="faible">Faible</option>
              <option value="moyen">Moyen</option>
              <option value="elevee">Élevée</option>
              <option value="critique">Critique</option>
            </select>
          </div>

          {/* Bouton reset filtres */}
          {(filtres.statut || filtres.type_enquete || filtres.niveau_priorite || searchQuery) && (
            <button
              onClick={resetFiltres}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Liste des enquêtes */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : enquetes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune enquête trouvée</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enquetes.map((enquete) => (
                <div
                  key={enquete.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {enquete.titre}
                      </h3>
                      <p className="text-sm text-gray-500">{enquete.numero_enquete}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/enquetes/${enquete.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Voir détails"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/enquetes/${enquete.id}/edit`)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                        title="Modifier"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUT_COLORS[enquete.statut] || 'bg-gray-100 text-gray-700'}`}>
                      {enquete.statut_display}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITE_COLORS[enquete.niveau_priorite] || 'bg-gray-100 text-gray-700'}`}>
                      {enquete.niveau_priorite_display}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      {enquete.type_enquete_display}
                    </span>
                  </div>

                  {/* Infos */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {enquete.enqueteur_responsable_detail && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{enquete.enqueteur_responsable_detail.full_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(enquete.date_ouverture).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {enquete.lieu_faits && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="truncate">{enquete.lieu_faits}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-gray-500">
                      {enquete.nombre_pieces || 0} pièce{enquete.nombre_pieces > 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                      {enquete.statut !== 'cloturee' && (
                        <button
                          onClick={() => handleCloturer(enquete.id)}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          Clôturer
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(enquete.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Précédent
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} sur {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default EnqueteList

