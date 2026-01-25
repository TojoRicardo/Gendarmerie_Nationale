import React, { useState } from 'react'
import { 
  Brain, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Info,
  Clock
} from 'lucide-react'

/**
 * Composant pour afficher les résultats d'analyse IA d'un événement d'audit.
 * Affiche le résumé narratif, le score de confiance, le niveau de risque et les détails admin.
 */
const AuditAIResultCard = ({ aiResult, event, className = '' }) => {
  const [showDetails, setShowDetails] = useState(false)

  if (!aiResult) {
    return null
  }

  const { 
    narrative_public, 
    narrative_admin, 
    confidence, 
    risk_level,
    missing_fields,
    date_analyse
  } = aiResult

  // Couleurs selon le niveau de risque
  const riskColors = {
    faible: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-800',
      icon: CheckCircle
    },
    moyen: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: AlertTriangle
    },
    élevé: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      icon: Shield
    }
  }

  const riskConfig = riskColors[risk_level] || riskColors.faible
  const RiskIcon = riskConfig.icon

  // Couleur du score de confiance
  const getConfidenceColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Formatage de la date
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`rounded-lg border-2 ${riskConfig.border} ${riskConfig.bg} p-4 ${className}`}>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className={`w-5 h-5 ${riskConfig.text}`} />
          <h3 className={`font-semibold ${riskConfig.text}`}>
            Analyse IA
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Badge niveau de risque */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskConfig.badge} flex items-center gap-1`}>
            <RiskIcon className="w-3 h-3" />
            {risk_level.charAt(0).toUpperCase() + risk_level.slice(1)}
          </span>
        </div>
      </div>

      {/* Résumé narratif public */}
      <div className="mb-4">
        <p className="text-gray-700 leading-relaxed">
          {narrative_public}
        </p>
      </div>

      {/* Score de confiance et métadonnées */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Score de confiance */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Confiance</span>
              <span className={`text-lg font-bold ${getConfidenceColor(confidence)}`}>
                {confidence}%
              </span>
            </div>
          </div>

          {/* Date d'analyse */}
          {date_analyse && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatDate(date_analyse)}
            </div>
          )}
        </div>

        {/* Bouton détails */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Masquer les détails
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Voir les détails
            </>
          )}
        </button>
      </div>

      {/* Détails admin (masqués par défaut) */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {/* Résumé admin */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Résumé technique (admin)
              </span>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {narrative_admin}
            </p>
          </div>

          {/* Informations de l'événement */}
          {event && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Informations techniques
                </span>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded space-y-1">
                {event.ip_address && (
                  <div>
                    <span className="font-medium">IP:</span> {event.ip_address}
                  </div>
                )}
                {event.endpoint && (
                  <div>
                    <span className="font-medium">Endpoint:</span> {event.endpoint}
                  </div>
                )}
                {event.methode_http && (
                  <div>
                    <span className="font-medium">Méthode HTTP:</span> {event.methode_http}
                  </div>
                )}
                {event.user_agent && (
                  <div>
                    <span className="font-medium">User-Agent:</span> {event.user_agent}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Champs manquants */}
          {missing_fields && missing_fields.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">
                  Champs manquants
                </span>
              </div>
              <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded">
                <p className="mb-1">
                  Les champs suivants auraient amélioré l'analyse :
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {missing_fields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AuditAIResultCard

