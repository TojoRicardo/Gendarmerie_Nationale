import { useState } from 'react'
import { 
  GitBranch, 
  Network, 
  Link, 
  CheckCircle,
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  Activity,
  Info,
  Search,
  Eye,
  Database,
  Shield,
  Zap
} from 'lucide-react'

const CorrespondancesPattern = ({ ficheId }) => {
  const [loading, setLoading] = useState(false)
  const [patterns, setPatterns] = useState(null)
  const [selectedType, setSelectedType] = useState(null)

  const analysisTypes = [
    {
      id: 'networks',
      title: 'Réseaux Criminels',
      icon: Network,
      color: 'blue',
      description: 'Identification de structures organisées et hiérarchies',
      features: [
        'Cartographie des liens',
        'Analyse des communications',
        'Détection de leaders',
        'Flux financiers'
      ],
      accuracy: '95.3%',
      status: 'active'
    },
    {
      id: 'connections',
      title: 'Connexions Entre Fiches',
      icon: Link,
      color: 'green',
      description: 'Liens directs et indirects entre individus',
      features: [
        'Relations familiales',
        'Associations connues',
        'Co-localisations',
        'Infractions communes'
      ],
      accuracy: '92.7%',
      status: 'active'
    },
    {
      id: 'series',
      title: 'Crimes en Série',
      icon: GitBranch,
      color: 'red',
      description: 'Détection de séries criminelles et modus operandi',
      features: [
        'Similarités M.O.',
        'Patterns temporels',
        'Zones géographiques',
        'Types de victimes'
      ],
      accuracy: '89.5%',
      status: 'active'
    },
    {
      id: 'hotspots',
      title: 'Zones à Risque',
      icon: MapPin,
      color: 'orange',
      description: 'Analyse géographique et prédiction de zones critiques',
      features: [
        'Heatmaps criminelles',
        'Prédiction spatiale',
        'Heures critiques',
        'Patrouilles optimisées'
      ],
      accuracy: '91.2%',
      status: 'beta'
    }
  ]

  const handleSelectType = (type) => {
    setSelectedType(type)
  }

  const handleRunAnalysis = () => {
    setLoading(true)
    // Simulation - à remplacer par l'API réelle
    setTimeout(() => {
      setPatterns({
        type: selectedType.title,
        totalNodes: Math.floor(Math.random() * 50) + 10,
        connections: Math.floor(Math.random() * 100) + 20,
        clusters: Math.floor(Math.random() * 5) + 2,
        keyPlayers: [
          { id: 1, name: 'Individu A', role: 'Leader', risk: 95 },
          { id: 2, name: 'Individu B', role: 'Intermédiaire', risk: 75 },
          { id: 3, name: 'Individu C', role: 'Opérateur', risk: 60 }
        ]
      })
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="card-pro p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-l-4 border-indigo-600">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
            <GitBranch className="text-white" size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-indigo-900 mb-2">
               Patterns & Corrélations IA
            </h3>
            <p className="text-indigo-800 text-sm">
              Détection automatique de liens entre fiches criminelles et identification de réseaux avec <strong>Graph Neural Networks</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Types d'analyse */}
      <div className="card-pro p-6">
        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Search className="mr-2 text-indigo-600" size={24} />
          Types d'Analyse Disponibles
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysisTypes.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType?.id === type.id
            
            return (
              <div
                key={type.id}
                onClick={() => handleSelectType(type)}
                className={`group relative p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? `border-${type.color}-500 bg-gradient-to-br from-${type.color}-50 to-${type.color}-100 shadow-lg scale-105`
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Badge statut */}
                {type.status === 'beta' && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                    BETA
                  </span>
                )}
                {type.status === 'active' && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                    
                  </span>
                )}

                <div className="flex items-start space-x-3 mb-3">
                  <div className={`p-2 rounded-lg bg-${type.color}-100 group-hover:scale-110 transition-transform`}>
                    <Icon className={`text-${type.color}-600`} size={28} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-900 text-lg mb-1">
                      {type.title}
                    </h5>
                    <p className="text-sm text-gray-600 mb-2">
                      {type.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Shield className={`text-${type.color}-600`} size={14} />
                      <span className="text-xs font-semibold text-gray-700">
                        Précision: {type.accuracy}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liste des fonctionnalités */}
                <ul className="space-y-1 mt-3 pt-3 border-t border-gray-200">
                  {type.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className={`mr-2 text-${type.color}-500 flex-shrink-0`} size={14} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <span className="text-sm font-bold text-green-700 flex items-center">
                      <Zap className="mr-1" size={16} />
                      Type sélectionné
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bouton d'analyse */}
      {selectedType && (
        <div className="card-pro p-6 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="text-center">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="btn-primary px-8 py-3 text-lg"
            >
              {loading ? (
                <>
                  <Activity className="mr-2 animate-spin" size={20} />
                  Analyse des patterns...
                </>
              ) : (
                <>
                  <GitBranch className="mr-2" size={20} />
                  Lancer l'Analyse de Corrélations
                </>
              )}
            </button>
            <p className="text-sm text-gray-600 mt-3">
              Type sélectionné: <strong>{selectedType.title}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Résultats */}
      {patterns && (
        <div className="space-y-4 animate-slide-up">
          {/* Métriques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-pro p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600">
              <div className="flex items-center justify-between mb-2">
                <Users className="text-blue-600" size={28} />
                <TrendingUp className="text-blue-400" size={18} />
              </div>
              <p className="text-sm text-blue-800 font-semibold mb-1">Nœuds Identifiés</p>
              <p className="text-5xl font-bold text-blue-600">{patterns.totalNodes}</p>
            </div>

            <div className="card-pro p-5 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-600">
              <div className="flex items-center justify-between mb-2">
                <Link className="text-green-600" size={28} />
                <Activity className="text-green-400" size={18} />
              </div>
              <p className="text-sm text-green-800 font-semibold mb-1">Connexions</p>
              <p className="text-5xl font-bold text-green-600">{patterns.connections}</p>
            </div>

            <div className="card-pro p-5 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-600">
              <div className="flex items-center justify-between mb-2">
                <Network className="text-purple-600" size={28} />
                <Database className="text-purple-400" size={18} />
              </div>
              <p className="text-sm text-purple-800 font-semibold mb-1">Clusters</p>
              <p className="text-5xl font-bold text-purple-600">{patterns.clusters}</p>
            </div>
          </div>

          {/* Acteurs clés */}
          <div className="card-pro p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-l-4 border-orange-600">
            <h4 className="text-xl font-bold text-orange-900 mb-4 flex items-center">
              <Users className="mr-2" size={24} />
              Acteurs Clés Identifiés
            </h4>

            <div className="space-y-3">
              {patterns.keyPlayers.map((player, idx) => (
                <div 
                  key={player.id}
                  className="bg-white p-4 rounded-xl shadow-md border-2 border-gray-200 hover:border-orange-400 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{player.name}</p>
                        <p className="text-sm text-gray-600">{player.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-32 bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-red-500 to-orange-500 h-full transition-all duration-500"
                            style={{ width: `${player.risk}%` }}
                          ></div>
                        </div>
                        <p className="text-2xl font-bold text-red-600">{player.risk}%</p>
                      </div>
                      <p className="text-xs text-gray-600">Niveau de Risque</p>
                      <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                        <Eye size={14} className="mr-1" />
                        Analyser
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visualisation du réseau */}
          <div className="card-pro p-6">
            <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Network className="mr-2 text-indigo-600" size={24} />
              Visualisation du Réseau
            </h4>
            
            <div className="bg-gradient-to-br from-gray-100 to-slate-100 rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
              <Network size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-semibold mb-2">
                Graphique Interactif
              </p>
              <p className="text-sm text-gray-500">
                Visualisation 3D des réseaux et connexions (En développement)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Informations */}
      <div className="card-pro p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600">
        <div className="flex items-start space-x-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2 text-lg"> Analyse de Réseaux avec Graph IA</p>
            <p className="mb-3">
              Les algorithmes de <strong>Graph Neural Networks (GNN)</strong> permettent d'analyser les structures 
              complexes de réseaux criminels en identifiant automatiquement les patterns, hiérarchies et connexions cachées.
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Détection automatique</strong> - Identification des structures organisées</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Analyse multi-niveaux</strong> - Relations directes et indirectes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Prédiction de liens</strong> - Associations probables non découvertes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Visualisation interactive</strong> - Graphes 3D navigables</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="card-pro p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Database className="mr-2 text-indigo-600" size={20} />
          Statistiques Globales
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Fiches Analysées', value: '1,250+', icon: Users },
            { label: 'Réseaux Identifiés', value: '47', icon: Network },
            { label: 'Liens Découverts', value: '3,890', icon: Link },
            { label: 'Précision Moyenne', value: '93.4%', icon: TrendingUp }
          ].map((stat, idx) => (
            <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <stat.icon className="mx-auto text-indigo-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CorrespondancesPattern
