import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Clock,
  Database,
  Lightbulb,
  MapPin,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  FileText,
} from 'lucide-react'

const NIVEAU_COLORS = {
  élevé: 'bg-red-100 text-red-700 border-red-200',
  eleve: 'bg-red-100 text-red-700 border-red-200',
  'très élevé': 'bg-red-200 text-red-800 border-red-300',
  'tres eleve': 'bg-red-200 text-red-800 border-red-300',
  modéré: 'bg-orange-100 text-orange-700 border-orange-200',
  modere: 'bg-orange-100 text-orange-700 border-orange-200',
  moyen: 'bg-orange-100 text-orange-700 border-orange-200',
  faible: 'bg-green-100 text-green-700 border-green-200',
  stable: 'bg-blue-100 text-blue-700 border-blue-200',
  critique: 'bg-red-200 text-red-900 border-red-400',
}

function niveauClass(niveau) {
  if (!niveau) return NIVEAU_COLORS.faible
  const key = niveau.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return NIVEAU_COLORS[niveau] || NIVEAU_COLORS[key] || 'bg-gray-100 text-gray-700 border-gray-200'
}

function formatNiveau(niveau) {
  if (!niveau) return '—'
  return niveau.charAt(0).toUpperCase() + niveau.slice(1)
}

function ScoreBar({ value, colorFrom, colorTo, height = 'h-2.5' }) {
  const pct = Math.min(Number(value) || 0, 100)
  return (
    <div className={`overflow-hidden rounded-full bg-gray-200 ${height}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colorFrom} ${colorTo} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function TendanceBadge({ tendance }) {
  if (!tendance) return null
  const dir = tendance.direction || tendance.label
  const Icon = dir === 'hausse' ? TrendingUp : dir === 'baisse' ? TrendingDown : Minus
  const color =
    dir === 'hausse'
      ? 'text-red-600 bg-red-50 border-red-200'
      : dir === 'baisse'
        ? 'text-green-600 bg-green-50 border-green-200'
        : 'text-blue-600 bg-blue-50 border-blue-200'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {tendance.label || dir}
    </span>
  )
}

function FacteurItem({ facteur }) {
  const impactColors = {
    'très élevé': 'bg-red-500',
    élevé: 'bg-orange-500',
    modéré: 'bg-amber-500',
    faible: 'bg-green-500',
  }
  const dot = impactColors[facteur.impact] || 'bg-gray-400'

  return (
    <div className="rounded-lg border border-orange-100 bg-white/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900">{facteur.facteur}</p>
            {facteur.description && (
              <p className="mt-0.5 text-xs text-gray-500">{facteur.description}</p>
            )}
          </div>
        </div>
        {facteur.valeur != null && (
          <span className="shrink-0 rounded-md bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
            {facteur.valeur}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AnalysePredictiveResultats({ caseAnalysis }) {
  const navigate = useNavigate()
  if (!caseAnalysis) return null

  const { resultats, fiche, synthese, qualite_donnees, niveau_alerte, avertissements } = caseAnalysis
  const alertColor =
    niveau_alerte === 'critique' || niveau_alerte === 'élevé'
      ? 'from-red-500 to-rose-600'
      : niveau_alerte === 'modéré'
        ? 'from-orange-500 to-amber-500'
        : 'from-emerald-500 to-teal-500'

  return (
    <div className="mt-6 space-y-6">
      {/* En-tête dossier + synthèse */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {fiche && (
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-bold text-purple-800">{fiche.numero_fiche}</span>
                <span className="text-sm text-gray-600">— {fiche.nom_complet}</span>
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-900">Synthèse de l'analyse</h3>
            {synthese && <p className="mt-2 text-sm leading-relaxed text-gray-700">{synthese}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${niveauClass(niveau_alerte)}`}>
              Alerte {formatNiveau(niveau_alerte)}
            </span>
            {caseAnalysis.timestamp && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {new Date(caseAnalysis.timestamp).toLocaleString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Avertissements */}
      {avertissements?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">Analyses partielles</p>
          <ul className="space-y-1">
            {avertissements.map((msg, i) => (
              <li key={i} className="text-sm text-amber-700">• {msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Score global + qualité données */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl bg-gradient-to-br ${alertColor} p-2.5`}>
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Risque global</p>
                <p className="text-xs text-gray-500">
                  Confiance : {caseAnalysis.score_confiance?.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-5xl font-extrabold text-gray-900">
                {caseAnalysis.score_risque_global?.toFixed(1)}
                <span className="text-2xl text-gray-500">%</span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ScoreBar
              value={caseAnalysis.score_risque_global}
              colorFrom="from-purple-500"
              colorTo="to-indigo-600"
              height="h-3"
            />
          </div>
        </div>

        {qualite_donnees && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-bold text-gray-900">Qualité des données</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">
              {qualite_donnees.score}%
              <span className="ml-2 text-sm font-medium text-gray-500">
                ({formatNiveau(qualite_donnees.niveau)})
              </span>
            </p>
            <ScoreBar
              value={qualite_donnees.score}
              colorFrom="from-slate-400"
              colorTo="to-slate-600"
            />
            {qualite_donnees.donnees_manquantes?.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Manquant : {qualite_donnees.donnees_manquantes.slice(0, 3).join(', ')}
                {qualite_donnees.donnees_manquantes.length > 3 && '…'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cartes détaillées */}
      {resultats && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Récidive */}
          {resultats.recidive && (
            <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <h3 className="font-bold text-gray-900">Risque de récidive</h3>
                </div>
                <div className="flex items-center gap-2">
                  <TendanceBadge tendance={resultats.recidive.tendance} />
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${niveauClass(resultats.recidive.niveau_risque)}`}>
                    {formatNiveau(resultats.recidive.niveau_risque)}
                  </span>
                </div>
              </div>
              <p className="mb-2 text-4xl font-extrabold text-gray-900">
                {resultats.recidive.risque_recidive?.toFixed(1)}%
              </p>
              <ScoreBar value={resultats.recidive.risque_recidive} colorFrom="from-orange-500" colorTo="to-amber-500" />
              {resultats.recidive.interpretation && (
                <p className="mt-3 text-sm text-gray-600">{resultats.recidive.interpretation}</p>
              )}
              {resultats.recidive.scores_detailles && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Object.entries(resultats.recidive.scores_detailles).map(([key, val]) => (
                    <div key={key} className="rounded-lg bg-white/70 px-3 py-2">
                      <p className="text-xs capitalize text-gray-500">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-bold text-orange-700">{val}%</p>
                    </div>
                  ))}
                </div>
              )}
              {resultats.recidive.facteurs?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-gray-500">Facteurs identifiés</p>
                  {resultats.recidive.facteurs.map((f, i) => (
                    <FacteurItem key={i} facteur={f} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dangerosité */}
          {resultats.dangerosite && (
            <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-bold text-gray-900">Profil de dangerosité</h3>
                </div>
                <TendanceBadge tendance={resultats.dangerosite.tendance} />
              </div>
              <div className="mb-2 flex items-end justify-between">
                <p className="text-4xl font-extrabold text-gray-900">
                  {resultats.dangerosite.score_global?.toFixed(1)}%
                </p>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${niveauClass(resultats.dangerosite.niveau_dangerosite)}`}>
                  {formatNiveau(resultats.dangerosite.niveau_dangerosite)}
                </span>
              </div>
              <ScoreBar value={resultats.dangerosite.score_global} colorFrom="from-red-500" colorTo="to-rose-500" />
              {resultats.dangerosite.interpretation && (
                <p className="mt-3 text-sm text-gray-600">{resultats.dangerosite.interpretation}</p>
              )}
              {resultats.dangerosite.scores_detailles && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ['violence', 'Violence', 'text-red-600'],
                    ['frequence', 'Fréquence', 'text-orange-600'],
                    ['gravite', 'Gravité', 'text-amber-600'],
                    ['evolution', 'Évolution', 'text-purple-600'],
                  ].map(([key, label, color]) => (
                    <div key={key} className="rounded-lg bg-white/70 px-3 py-2">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-sm font-bold ${color}`}>
                        {resultats.dangerosite.scores_detailles[key]?.toFixed(0)}%
                      </p>
                      <ScoreBar
                        value={resultats.dangerosite.scores_detailles[key]}
                        colorFrom="from-gray-300"
                        colorTo="to-gray-400"
                        height="h-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Zones à risque */}
          {resultats.zones_risque?.zones_risque?.length > 0 && (
            <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-md">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Zones à risque</h3>
              </div>
              {resultats.zones_risque.interpretation && (
                <p className="mb-3 text-sm text-gray-600">{resultats.zones_risque.interpretation}</p>
              )}
              <div className="space-y-2">
                {resultats.zones_risque.zones_risque.map((zone, idx) => (
                  <div key={idx} className="rounded-lg border border-blue-100 bg-white/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-800">{zone.lieu}</span>
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                        {zone.probabilite?.toFixed(0)}%
                      </span>
                    </div>
                    <ScoreBar value={zone.probabilite} colorFrom="from-blue-400" colorTo="to-cyan-500" height="h-1.5" />
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>{zone.frequence} infraction(s)</span>
                      {zone.types_infractions?.length > 0 && (
                        <span>• {zone.types_infractions.join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associations */}
          {resultats.associations && (
            <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-900">Associations criminelles</h3>
                </div>
                <span className="rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  {resultats.associations.nb_associations || 0}
                </span>
              </div>
              {resultats.associations.interpretation && (
                <p className="mb-3 text-sm text-gray-600">{resultats.associations.interpretation}</p>
              )}
              {resultats.associations.associations?.length > 0 ? (
                <div className="space-y-2">
                  {resultats.associations.associations.map((asso, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => navigate(`/fiches-criminelles/voir/${asso.criminel_id}`)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-white/80 p-3 text-left transition hover:bg-white hover:shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{asso.nom_complet}</p>
                        <p className="text-xs text-gray-500">
                          {asso.numero_fiche}
                          {asso.type_correlation && ` • ${asso.type_correlation.replace(/_/g, ' ')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white">
                          {asso.probabilite?.toFixed(0)}%
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-500">Aucune association détectée</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommandations */}
      {caseAnalysis.recommandations?.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-2.5">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Recommandations opérationnelles</h3>
          </div>
          <ol className="space-y-3">
            {caseAnalysis.recommandations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-xl bg-white/80 p-4 shadow-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                  {idx + 1}
                </span>
                <p className="text-sm font-medium leading-relaxed text-gray-800 pt-0.5">{rec}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
