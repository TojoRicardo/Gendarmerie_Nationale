/**
 * Page de détail d'un journal d'activité narratif
 * Affiche le journal narratif complet d'une session utilisateur
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNarrativeJournalDetail } from '../services/narrativeAuditService'
import Loader from '../components/ui/LoaderGlobal'

const JournalActiviteDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [journal, setJournal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chargerJournal()
  }, [id])

  const chargerJournal = async () => {
    setLoading(true)
    try {
      const data = await getNarrativeJournalDetail(id)
      setJournal(data)
    } catch (error) {
      console.error('Erreur lors du chargement du journal:', error)
    } finally {
      setLoading(false)
    }
  }

  const formaterDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const obtenirBadgeStatut = (estCloture) => {
    if (estCloture) {
      return (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
          Journal clôturé
        </span>
      )
    }
    return (
      <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
        Journal en cours
      </span>
    )
  }

  if (loading) {
    return <Loader />
  }

  if (!journal) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">Journal non trouvé.</p>
            <button
              onClick={() => navigate('/journal-activite')}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              ← Retour à la liste
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/journal-activite')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Retour à la liste
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Journal d'Activité
              </h1>
              <p className="text-gray-600">
                {journal.user_display || 'Utilisateur'}
              </p>
            </div>
            {obtenirBadgeStatut(journal.est_cloture)}
          </div>
        </div>

        {/* Informations de session */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informations de la session
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Date de début</span>
              <p className="text-gray-900">{formaterDate(journal.date_debut)}</p>
            </div>
            {journal.date_fin && (
              <div>
                <span className="text-sm font-medium text-gray-500">Date de fin</span>
                <p className="text-gray-900">{formaterDate(journal.date_fin)}</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-500">Durée</span>
              <p className="text-gray-900">
                {journal.duree_session_str || 'En cours'}
              </p>
            </div>
            {journal.ip_address && (
              <div>
                <span className="text-sm font-medium text-gray-500">Adresse IP</span>
                <p className="text-gray-900">{journal.ip_address}</p>
              </div>
            )}
            {journal.browser && (
              <div>
                <span className="text-sm font-medium text-gray-500">Navigateur</span>
                <p className="text-gray-900">{journal.browser}</p>
              </div>
            )}
            {journal.os && (
              <div>
                <span className="text-sm font-medium text-gray-500">Système d'exploitation</span>
                <p className="text-gray-900">{journal.os}</p>
              </div>
            )}
          </div>
        </div>

        {/* Journal narratif */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Récit narratif de la session
          </h2>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans">
              {journal.description_narrative || 'Aucune action enregistrée dans ce journal.'}
            </div>
          </div>
        </div>

        {/* Bouton d'impression/export (à implémenter) */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Imprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export default JournalActiviteDetail

