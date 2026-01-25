/**
 * Composant React pour visualiser les analyses prédictives de dossiers criminels
 * Affiche les prédictions, scores de risque et recommandations
 */

import React, { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, MapPin, Users, BarChart3, Loader2 } from 'lucide-react'
import api from '../../services/api'

const CaseAnalysisViewer = ({ ficheId }) => {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [typeAnalyse, setTypeAnalyse] = useState('complet')

  useEffect(() => {
    if (ficheId) {
      loadAnalysis()
    }
  }, [ficheId])

  const loadAnalysis = async () => {
    if (!ficheId) return

    setLoading(true)
    setError(null)

    try {
      const response = await api.get('/ia/case-analysis/list/', {
        params: { fiche_id: ficheId }
      })

      if (response.data.success && response.data.analyses.length > 0) {
        setAnalysis(response.data.analyses[0])
      }
    } catch (err) {
      console.error('Erreur chargement analyse:', err)
      setError(err.response?.data?.message || 'Erreur lors du chargement de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!ficheId) {
      setError('ID de fiche criminelle requis')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.post('/ia/case-analysis/create/', {
        fiche_id: ficheId,
        type_analyse: typeAnalyse
      })

      if (response.data.success) {
        setAnalysis(response.data)
      } else {
        setError(response.data.message || 'Erreur lors de l\'analyse')
      }
    } catch (err) {
      console.error('Erreur analyse:', err)
      setError(err.response?.data?.message || 'Erreur lors de l\'analyse du dossier')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600 bg-red-50'
    if (score >= 40) return 'text-orange-600 bg-orange-50'
    return 'text-green-600 bg-green-50'
  }

  const getRiskLabel = (score) => {
    if (score >= 70) return 'Élevé'
    if (score >= 40) return 'Modéré'
    return 'Faible'
  }

  if (!ficheId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-600">Sélectionnez une fiche criminelle pour analyser</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analyse Prédictive IA</h2>
            <p className="mt-1 text-sm text-gray-600">
              Analyse du dossier criminel pour prédire les comportements futurs
            </p>
          </div>
        </div>

        {/* Contrôles */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type d'analyse
            </label>
            <select
              value={typeAnalyse}
              onChange={(e) => setTypeAnalyse(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="complet">Analyse complète</option>
              <option value="recidive">Risque de récidive</option>
              <option value="dangerosite">Profil de dangerosité</option>
              <option value="zones_risque">Zones à risque</option>
              <option value="associations">Associations criminelles</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Lancer l'analyse
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Erreur</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Résultats */}
        {analysis && (
          <div className="space-y-6">
            {/* Score de risque global */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Score de risque global</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {analysis.score_risque_global?.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Confiance: {analysis.score_confiance?.toFixed(1)}%
                  </p>
                </div>
                <div
                  className={`rounded-full px-4 py-2 text-sm font-medium ${getRiskColor(
                    analysis.score_risque_global
                  )}`}
                >
                  {getRiskLabel(analysis.score_risque_global)}
                </div>
              </div>
            </div>

            {/* Résultats détaillés */}
            {analysis.resultats && (
              <div className="space-y-4">
                {/* Risque de récidive */}
                {analysis.resultats.recidive && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Risque de récidive</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Score de risque:</span>
                        <span className="font-medium text-gray-900">
                          {analysis.resultats.recidive.risque_recidive?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Niveau:</span>
                        <span className="font-medium text-gray-900">
                          {analysis.resultats.recidive.niveau_risque}
                        </span>
                      </div>
                      {analysis.resultats.recidive.facteurs && (
                        <div className="mt-3">
                          <p className="mb-2 text-sm font-medium text-gray-700">Facteurs de risque:</p>
                          <div className="space-y-1">
                            {analysis.resultats.recidive.facteurs.map((facteur, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1 text-sm"
                              >
                                <span className="font-medium">{facteur.facteur}:</span>
                                <span className="text-gray-600">{facteur.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profil de dangerosité */}
                {analysis.resultats.dangerosite && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-900">Profil de dangerosité</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Score global:</span>
                        <span className="font-medium text-gray-900">
                          {analysis.resultats.dangerosite.score_global?.toFixed(1)}%
                        </span>
                      </div>
                      {analysis.resultats.dangerosite.scores_detailles && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {Object.entries(analysis.resultats.dangerosite.scores_detailles).map(
                            ([key, value]) => (
                              <div key={key} className="rounded bg-gray-50 p-2">
                                <p className="text-xs text-gray-600 capitalize">{key}:</p>
                                <p className="font-medium text-gray-900">{value?.toFixed(1)}%</p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Zones à risque */}
                {analysis.resultats.zones_risque && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-gray-900">Zones à risque</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.resultats.zones_risque.zones_risque?.map((zone, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded bg-gray-50 p-2"
                        >
                          <span className="text-sm text-gray-700">{zone.lieu}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {zone.probabilite?.toFixed(1)}% ({zone.frequence} occurrences)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Associations criminelles */}
                {analysis.resultats.associations && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">Associations criminelles</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.resultats.associations.associations?.map((assoc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded bg-gray-50 p-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {assoc.nom_complet}
                            </p>
                            <p className="text-xs text-gray-600">
                              {assoc.type_correlation} - Fiche: {assoc.numero_fiche}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {assoc.probabilite?.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recommandations */}
            {analysis.recommandations && analysis.recommandations.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-3 font-semibold text-blue-900">Recommandations</h3>
                <ul className="space-y-2">
                  {analysis.recommandations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Liens détectés */}
            {analysis.liens_detectes && analysis.liens_detectes.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Liens détectés</h3>
                <div className="space-y-2">
                  {analysis.liens_detectes.map((lien, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded bg-gray-50 p-2"
                    >
                      <span className="text-sm text-gray-700">
                        {lien.nom_complet || `${lien.nom} ${lien.prenom}`}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        Probabilité: {lien.probabilite?.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CaseAnalysisViewer

