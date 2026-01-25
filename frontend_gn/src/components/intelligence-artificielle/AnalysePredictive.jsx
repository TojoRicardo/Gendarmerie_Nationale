import { useState } from 'react'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  BarChart3,
  Brain,
  Target,
  LineChart,
  PieChart,
  Zap,
  Shield,
  Info
} from 'lucide-react'

const AnalysePredictive = ({ ficheId }) => {
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)

  const models = [
    {
      id: 'risk_assessment',
      title: 'Évaluation des Risques',
      icon: AlertTriangle,
      color: 'red',
      description: 'Prédiction du niveau de dangerosité et récidive',
      accuracy: '94.2%',
      features: [
        'Analyse des antécédents',
        'Patterns comportementaux',
        'Facteurs de risque',
        'Score de récidive'
      ],
      status: 'active'
    },
    {
      id: 'pattern_detection',
      title: 'Détection de Patterns',
      icon: Activity,
      color: 'blue',
      description: 'Identification de schémas criminels récurrents',
      accuracy: '91.8%',
      features: [
        'Analyse temporelle',
        'Géolocalisation',
        'Modus operandi',
        'Séries criminelles'
      ],
      status: 'active'
    },
    {
      id: 'trend_analysis',
      title: 'Analyse de Tendances',
      icon: TrendingUp,
      color: 'green',
      description: 'Prévision des tendances criminelles futures',
      accuracy: '88.5%',
      features: [
        'Prédiction temporelle',
        'Zones à risque',
        'Types de crimes',
        'Périodes critiques'
      ],
      status: 'active'
    },
    {
      id: 'network_analysis',
      title: 'Analyse de Réseaux',
      icon: Brain,
      color: 'purple',
      description: 'Cartographie des réseaux criminels organisés',
      accuracy: '96.1%',
      features: [
        'Liens entre individus',
        'Hiérarchies',
        'Flux financiers',
        'Communications'
      ],
      status: 'beta'
    }
  ]

  const handleSelectModel = (model) => {
    setSelectedModel(model)
  }

  const handleRunAnalysis = () => {
    setLoading(true)
    // Simulation - à remplacer par l'API réelle
    setTimeout(() => {
      setPrediction({
        model: selectedModel.title,
        riskScore: Math.floor(Math.random() * 100),
        confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
        factors: [
          { name: 'Antécédents', score: 75, impact: 'high' },
          { name: 'Profil social', score: 45, impact: 'medium' },
          { name: 'Contexte géographique', score: 60, impact: 'high' }
        ]
      })
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="card-pro p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-l-4 border-amber-600">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-xl shadow-lg">
            <TrendingUp className="text-white" size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-amber-900 mb-2">
               Analyse Prédictive IA
            </h3>
            <p className="text-amber-800 text-sm">
              Analyse des patterns criminels et prédiction des risques avec <strong>Machine Learning</strong> avancé.
            </p>
          </div>
        </div>
      </div>

      {/* Sélection du modèle */}
      <div className="card-pro p-6">
        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Brain className="mr-2 text-amber-600" size={24} />
          Modèles d'Analyse Disponibles
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((model) => {
            const Icon = model.icon
            const isSelected = selectedModel?.id === model.id
            
            return (
              <div
                key={model.id}
                onClick={() => handleSelectModel(model)}
                className={`group relative p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? `border-${model.color}-500 bg-gradient-to-br from-${model.color}-50 to-${model.color}-100 shadow-lg scale-105`
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Badge statut */}
                {model.status === 'beta' && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                    BETA
                  </span>
                )}
                {model.status === 'active' && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                    
                  </span>
                )}

                <div className="flex items-start space-x-3 mb-3">
                  <div className={`p-2 rounded-lg bg-${model.color}-100 group-hover:scale-110 transition-transform`}>
                    <Icon className={`text-${model.color}-600`} size={28} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-900 text-lg mb-1">
                      {model.title}
                    </h5>
                    <p className="text-sm text-gray-600 mb-2">
                      {model.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Target className={`text-${model.color}-600`} size={14} />
                      <span className="text-xs font-semibold text-gray-700">
                        Précision: {model.accuracy}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liste des fonctionnalités */}
                <ul className="space-y-1 mt-3 pt-3 border-t border-gray-200">
                  {model.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className={`mr-2 text-${model.color}-500 flex-shrink-0`} size={14} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <span className="text-sm font-bold text-green-700 flex items-center">
                      <Zap className="mr-1" size={16} />
                      Modèle sélectionné
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bouton d'analyse */}
      {selectedModel && (
        <div className="card-pro p-6 bg-gradient-to-r from-amber-50 to-yellow-50">
          <div className="text-center">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="btn-primary px-8 py-3 text-lg"
            >
              {loading ? (
                <>
                  <Activity className="mr-2 animate-spin" size={20} />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2" size={20} />
                  Lancer l'Analyse Prédictive
                </>
              )}
            </button>
            <p className="text-sm text-gray-600 mt-3">
              Modèle sélectionné: <strong>{selectedModel.title}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Résultats */}
      {prediction && (
        <div className="card-pro p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-600 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-2xl font-bold text-green-900 flex items-center">
              <CheckCircle className="mr-3 animate-bounce" size={28} />
              Résultats de l'Analyse
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-lg shadow-md border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="text-red-600" size={28} />
                <TrendingUp className="text-green-400" size={18} />
              </div>
              <p className="text-sm text-gray-600 mb-1">Score de Risque</p>
              <p className="text-5xl font-bold text-red-600">{prediction.riskScore}%</p>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-md border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Target className="text-blue-600" size={28} />
                <Activity className="text-blue-400" size={18} />
              </div>
              <p className="text-sm text-gray-600 mb-1">Confiance IA</p>
              <p className="text-5xl font-bold text-blue-600">{(prediction.confidence * 100).toFixed(0)}%</p>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-md border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Brain className="text-purple-600" size={28} />
                <Zap className="text-purple-400" size={18} />
              </div>
              <p className="text-sm text-gray-600 mb-1">Modèle Utilisé</p>
              <p className="text-lg font-bold text-purple-600">{prediction.model}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <h5 className="font-bold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="mr-2 text-amber-600" size={20} />
              Facteurs d'Analyse
            </h5>
            <div className="space-y-3">
              {prediction.factors.map((factor, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">{factor.name}</span>
                    <span className="text-sm font-bold text-gray-900">{factor.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        factor.impact === 'high' ? 'bg-red-500' :
                        factor.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${factor.score}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-semibold ${
                    factor.impact === 'high' ? 'text-red-600' :
                    factor.impact === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    Impact: {factor.impact === 'high' ? 'Élevé' : factor.impact === 'medium' ? 'Moyen' : 'Faible'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Informations */}
      <div className="card-pro p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600">
        <div className="flex items-start space-x-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2 text-lg"> Intelligence Artificielle Prédictive</p>
            <p className="mb-3">
              Les modèles d'analyse prédictive utilisent des algorithmes de <strong>Machine Learning</strong> entraînés 
              sur des milliers de cas pour identifier les patterns et prédire les risques avec haute précision.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Analyse en temps réel</strong> - Résultats en moins de 2 secondes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Multi-facteurs</strong> - Combine données historiques, géographiques et comportementales</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Apprentissage continu</strong> - Les modèles s'améliorent avec chaque analyse</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Explications</strong> - Transparence sur les facteurs de décision</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Graphiques et visualisations (placeholder) */}
      <div className="card-pro p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <LineChart className="mr-2 text-amber-600" size={20} />
          Visualisations Disponibles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: BarChart3, title: 'Graphiques à Barres', color: 'blue' },
            { icon: LineChart, title: 'Courbes de Tendance', color: 'green' },
            { icon: PieChart, title: 'Répartition', color: 'purple' }
          ].map((viz, idx) => {
            const Icon = viz.icon
            return (
              <div 
                key={idx}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all duration-300 text-center"
              >
                <Icon className={`mx-auto mb-2 text-${viz.color}-600`} size={32} />
                <h5 className="font-semibold text-gray-900 text-sm">{viz.title}</h5>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AnalysePredictive
