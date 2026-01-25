import React, { useState, useEffect } from 'react'
import { getActiveInvestigators } from '../../src/services/sessionService'
import { FaUserTie, FaCircle, FaSync } from 'react-icons/fa'

/**
 * Composant pour afficher les Enquêteurs Principaux actuellement connectés
 */
const EnqueteursConnectes = () => {
  const [investigators, setInvestigators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchInvestigators = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getActiveInvestigators()
      setInvestigators(data.investigators || [])
      setLastUpdate(new Date())
    } catch (err) {
      setError('Impossible de récupérer les enquêteurs connectés')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvestigators()

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchInvestigators, 30000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading && investigators.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center text-red-600">
          <span className="text-sm">{error}</span>
          <button
            onClick={fetchInvestigators}
            className="ml-auto text-blue-600 hover:text-blue-700"
          >
            <FaSync className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FaUserTie className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Enquêteurs Principaux en ligne
            </h3>
            <p className="text-sm text-gray-500">
              {investigators.length} enquêteur{investigators.length !== 1 ? 's' : ''} connecté
              {investigators.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={fetchInvestigators}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Rafraîchir"
        >
          <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Liste des enquêteurs */}
      <div className="divide-y divide-gray-100">
        {investigators.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <FaUserTie className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun enquêteur principal connecté actuellement</p>
          </div>
        ) : (
          investigators.map((investigator) => (
            <div
              key={investigator.user_id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {investigator.prenom?.[0]?.toUpperCase() || investigator.username?.[0]?.toUpperCase()}
                      {investigator.nom?.[0]?.toUpperCase() || ''}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                      <FaCircle className="w-full h-full text-green-500" />
                    </div>
                  </div>

                  {/* Informations */}
                  <div>
                    <p className="font-medium text-gray-900">
                      {investigator.prenom && investigator.nom
                        ? `${investigator.prenom} ${investigator.nom}`
                        : investigator.username}
                    </p>
                    <p className="text-sm text-gray-500">{investigator.email}</p>
                  </div>
                </div>

                {/* Dernière activité */}
                <div className="text-right">
                  <p className="text-xs text-gray-500">Dernière activité</p>
                  <p className="text-sm font-medium text-gray-700">
                    {formatTime(investigator.last_activity)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
        </p>
      </div>
    </div>
  )
}

export default EnqueteursConnectes

