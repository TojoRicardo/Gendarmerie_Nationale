/**
 * Page de consultation du journal d'activité narratif
 * Affiche la liste des journaux narratifs (sessions utilisateur avec récit complet)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyNarrativeJournals } from '../services/narrativeAuditService'
import Loader from '../components/ui/LoaderGlobal'

const JournalActiviteNarratif = () => {
  const navigate = useNavigate()
  const [journaux, setJournaux] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filtres, setFiltres] = useState({
    est_cloture: null, // null = tous, true = clôturés, false = en cours
    search: '',
  })

  useEffect(() => {
    chargerJournaux()
  }, [page, filtres])

  const chargerJournaux = async () => {
    setLoading(true)
    try {
      const params = {
        page: page,
        page_size: 20,
        ...filtres,
      }
      
      // Pour l'instant, charger les journaux de l'utilisateur connecté
      // TODO: Ajouter une option pour voir tous les journaux (admin)
      const response = await getMyNarrativeJournals(params)
      
      setJournaux(response.results || response.data || [])
      setTotalPages(response.total_pages || 1)
    } catch (error) {
      console.error('Erreur lors du chargement des journaux:', error)
    } finally {
      setLoading(false)
    }
  }

  const formaterDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formaterDuree = (dureeStr) => {
    if (!dureeStr || dureeStr === 'En cours') return dureeStr
    return dureeStr
  }

  const obtenirBadgeStatut = (estCloture) => {
    if (estCloture) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          Clôturé
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        En cours
      </span>
    )
  }

  const handleVoirDetail = (journalId) => {
    navigate(`/journal-activite/${journalId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Journal d'Activité Narratif
          </h1>
          <p className="text-gray-600">
            Consultation des journaux narratifs des sessions utilisateur. Chaque journal raconte chronologiquement toutes les actions d'une session.
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={filtres.est_cloture === null ? '' : filtres.est_cloture}
                onChange={(e) =>
                  setFiltres({
                    ...filtres,
                    est_cloture: e.target.value === '' ? null : e.target.value === 'true',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous</option>
                <option value="false">En cours</option>
                <option value="true">Clôturés</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recherche
              </label>
              <input
                type="text"
                value={filtres.search}
                onChange={(e) =>
                  setFiltres({ ...filtres, search: e.target.value })
                }
                placeholder="Rechercher dans les journaux..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Liste des journaux */}
        {loading ? (
          <Loader />
        ) : journaux.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">Aucun journal trouvé.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200">
              {journaux.map((journal) => (
                <div
                  key={journal.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleVoirDetail(journal.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {journal.user_display || 'Utilisateur'}
                        </h3>
                        {obtenirBadgeStatut(journal.est_cloture)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Début:</span>{' '}
                          {formaterDate(journal.date_debut)}
                        </div>
                        {journal.date_fin && (
                          <div>
                            <span className="font-medium">Fin:</span>{' '}
                            {formaterDate(journal.date_fin)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Durée:</span>{' '}
                          {formaterDuree(journal.duree_session_str)}
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {journal.resume_narratif || 'Aucune action enregistrée.'}
                        </p>
                      </div>

                      {journal.ip_address && (
                        <div className="text-xs text-gray-500">
                          IP: {journal.ip_address}
                          {journal.browser && ` • ${journal.browser}`}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVoirDetail(journal.id)
                        }}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        Voir le détail →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} sur {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default JournalActiviteNarratif

