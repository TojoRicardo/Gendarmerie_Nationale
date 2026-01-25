import { 
  FileText, Users, AlertTriangle, Activity, TrendingUp, TrendingDown,
  ArrowUp, ArrowDown, Clock, MapPin, UserCheck, UserX, 
  BarChart3, PieChart, LineChart, Search, Filter, ShieldCheck, KeyRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid,
  LineChart as RechartsLine, Line, AreaChart, Area
} from 'recharts'
import statsService from '../../services/statsService'
import { getUsers } from '../../services/authService'
import Loader, { SkeletonStats, SkeletonChart } from '../../../components/commun/Loader'
import ErrorMessage from '../../../components/commun/ErrorMessage'

const DashboardAdministrateur = () => {
  const navigate = useNavigate()
  
  // États pour les données
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statsData, setStatsData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tousUtilisateurs, setTousUtilisateurs] = useState([])
  const [filtreStatut, setFiltreStatut] = useState('tous') // 'tous', 'actif', 'inactif'

  // Charger les données au montage du composant
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [statsData, usersData] = await Promise.all([
          statsService.getDashboardStats(),
          getUsers()
        ])
        setStatsData(statsData)
        setTousUtilisateurs(usersData.results || usersData || [])
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err)
        setError(err.message || 'Erreur lors du chargement des données')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Construire les statistiques uniquement depuis les données réelles du backend
  const statistiques = statsData?.global ? [
    {
      titre: 'Fiches Criminelles',
      valeur: statsData.global.total_fiches?.toString() || statsData.global.total?.toString() || '0',
      evolution: statsData.global.evolution_total || '0%',
      evolutionPositive: statsData.global.evolution_total_hausse !== false,
      icone: FileText,
      gradient: 'from-gendarme-blue to-gendarme-blue-dark',
      description: 'Total des dossiers',
      details: `${statsData.global.fiches_recentes_30j || 0} ce mois`
    },
    {
      titre: 'Utilisateurs Actifs',
      valeur: nbUtilisateursActifs?.toString() || statsData.users?.actifs?.toString() || '0',
      evolution: statsData.users?.evolution || '+0%',
      evolutionPositive: statsData.users?.evolution_positive !== false,
      icone: Users,
      gradient: 'from-gendarme-light to-gendarme-light-hover',
      description: 'Comptes actifs',
      details: `${nbUtilisateursInactifs || 0} inactifs`
    },
    {
      titre: 'En cours',
      valeur: statsData.global?.en_cours?.toString() || '0',
      evolution: statsData.global?.evolution_en_cours || '0%',
      evolutionPositive: statsData.global?.evolution_en_cours_hausse !== false,
      icone: Clock,
      gradient: 'from-amber-500 to-amber-600',
      description: 'Fiches en traitement',
      details: `${statsData.global?.clotures || 0} clôturées`
    },
    {
      titre: 'Critiques',
      valeur: statsData.global?.critiques?.toString() || '0',
      evolution: statsData.global?.evolution_critiques || '0%',
      evolutionPositive: statsData.global?.evolution_critiques_hausse !== false,
      icone: AlertTriangle,
      gradient: 'from-gendarme-red to-gendarme-red-dark',
      description: 'Niveau danger élevé',
      details: 'Nécessitent attention'
    },
  ] : []


  // Couleurs pour les graphiques
  const COLORS = ['#002382', '#17A6E6', '#F0C75E', '#FF0000', '#0CED05']

  // Actions rapides avec données dynamiques réelles
  const actionsRapides = [
    {
      titre: 'Nouvelle fiche',
      description: 'Créer une nouvelle fiche criminelle',
      icone: FileText,
      gradient: 'from-gendarme-blue to-gendarme-blue-dark',
      action: () => navigate('/fiches-criminelles/creer'),
      count: `${statsData?.global?.total || 0} totales`
    },
    {
      titre: 'Gestion utilisateurs',
      description: 'Gérer les comptes utilisateurs',
      icone: Users,
      gradient: 'from-gendarme-light to-gendarme-light-hover',
      action: () => navigate('/utilisateurs'),
      count: `${nbUtilisateursActifs || 0} actifs`
    },
    {
      titre: 'Rôles & Permissions',
      description: 'Configurer les accès',
      icone: ShieldCheck,
      gradient: 'from-gendarme-gold to-gendarme-gold-dark',
      action: () => navigate('/roles'),
      count: 'Configuration'
    },
    {
      titre: 'Journal d\'audit',
      description: 'Consulter l\'historique',
      icone: Activity,
      gradient: 'from-gendarme-dark to-gendarme-dark-light',
      action: () => navigate('/audit'),
      count: 'Activités'
    },
  ]

  // Activités récentes - Uniquement les données réelles du backend
  const activitesRecentes = statsData?.recentActivity?.length > 0 
    ? statsData.recentActivity.map(activity => ({
        action: activity.description || activity.action || 'Action non spécifiée',
        user: activity.user_name || activity.utilisateur || 'Système',
        time: activity.time_ago || activity.temps || 'Récemment',
        icone: getActivityIcon(activity.type),
        color: getActivityColor(activity.type),
        bg: getActivityBg(activity.type)
      }))
    : []

  // Données pour les graphiques - Uniquement les données réelles du backend
  const dataCrimes = statsData?.crimeTypes?.length > 0
    ? statsData.crimeTypes.map((crime, index) => ({
        name: crime.name || crime.type || 'Inconnu',
        value: crime.count || crime.valeur || 0,
        color: COLORS[index % COLORS.length]
      }))
    : []

  const dataMensuelle = statsData?.monthly?.length > 0
    ? statsData.monthly
    : []

  const dataEvolution = statsData?.evolution?.length > 0
    ? statsData.evolution
    : []

  const statsGeographiques = statsData?.geographic?.length > 0
    ? statsData.geographic.map(stat => ({
        ville: stat.city || stat.ville || 'Ville',
        cas: stat.cases || stat.cas || 0,
        normalized: stat.normalized || 0,
        evolution: stat.evolution || '0%',
        hausse: stat.increasing !== false
      }))
    : []

  const statsHoraires = statsData?.hourly?.length > 0
    ? statsData.hourly
    : []

  const utilisateursStats = [
    { label: 'Actifs', valeur: nbUtilisateursActifs || 0, icone: UserCheck, couleur: 'emerald' },
    { label: 'Inactifs', valeur: nbUtilisateursInactifs || 0, icone: UserX, couleur: 'red' },
    { label: 'Total', valeur: tousUtilisateurs.length || 0, icone: Users, couleur: 'blue' },
  ]
  
  // Filtrer les utilisateurs par statut
  const utilisateursParStatut = tousUtilisateurs.filter(user => {
    const userStatut = user.statut?.toLowerCase() || (user.is_active ? 'actif' : 'inactif')
    if (filtreStatut === 'actif') return userStatut === 'actif'
    if (filtreStatut === 'inactif') return userStatut === 'inactif'
    if (filtreStatut === 'suspendu') return userStatut === 'suspendu'
    return true // 'tous'
  })

  // Filtrer les utilisateurs par recherche
  const utilisateursFiltres = utilisateursParStatut.filter(user => {
    const nomComplet = `${user.nom || ''} ${user.prenom || ''}`.toLowerCase()
    const username = (user.username || '').toLowerCase()
    const email = (user.email || '').toLowerCase()
    const role = (user.role?.nom || '').toLowerCase()
    
    const searchLower = searchQuery.toLowerCase()
    
    return nomComplet.includes(searchLower) ||
           username.includes(searchLower) ||
           email.includes(searchLower) ||
           role.includes(searchLower)
  })
  
  // Compter les utilisateurs par statut
  const nbUtilisateursActifs = tousUtilisateurs.filter(u => {
    const statut = u.statut?.toLowerCase() || (u.is_active ? 'actif' : 'inactif')
    return statut === 'actif'
  }).length
  const nbUtilisateursInactifs = tousUtilisateurs.filter(u => {
    const statut = u.statut?.toLowerCase() || (u.is_active ? 'actif' : 'inactif')
    return statut === 'inactif'
  }).length
  const nbUtilisateursSuspendus = tousUtilisateurs.filter(u => u.statut?.toLowerCase() === 'suspendu').length
  const nbUtilisateursEnLigne = nbUtilisateursActifs // Pour compatibilité avec l'affichage existant

  // Fonctions helper pour les icônes/couleurs des activités
  function getActivityIcon(type) {
    const icons = {
      'fiche': FileText,
      'utilisateur': Users,
      'rapport': Activity,
      'permission': KeyRound,
      'ia': TrendingUp
    }
    return icons[type] || Activity
  }

  function getActivityColor(type) {
    const colors = {
      'fiche': 'text-gendarme-blue',
      'utilisateur': 'text-gendarme-light',
      'rapport': 'text-gendarme-gold-dark',
      'permission': 'text-gendarme-gold-dark',
      'ia': 'text-gendarme-blue-light'
    }
    return colors[type] || 'text-gray-600'
  }

  function getActivityBg(type) {
    const bgs = {
      'fiche': 'bg-gendarme-blue/10',
      'utilisateur': 'bg-gendarme-light/10',
      'rapport': 'bg-gendarme-gold/10',
      'permission': 'bg-gendarme-gold/10',
      'ia': 'bg-gendarme-blue-light/10'
    }
    return bgs[type] || 'bg-gray-100'
  }

  // Fonction pour rafraîchir les données
  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await statsService.getDashboardStats()
      setStatsData(data)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  // Afficher le loader pendant le chargement initial
  if (loading && !statsData) {
    return (
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    )
  }

  // Afficher l'erreur si présente
  if (error && !statsData) {
    return (
      <ErrorMessage
        title="Erreur de chargement"
        message={error}
        onRetry={handleRetry}
        showHomeButton={false}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Statistiques principales avec effet glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statistiques.map((stat, index) => {
          const Icone = stat.icone
          const getNavigationPath = () => {
            switch(stat.titre) {
              case 'Fiches Criminelles': return '/fiches-criminelles';
              case 'Utilisateurs Actifs': return '/utilisateurs';
              case 'Rôles & Permissions': return '/roles';
              case 'Alertes en cours': return '/audit';
              default: return '/dashboard';
            }
          }
          return (
            <div
              key={index}
              className="stat-card group hover-lift cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(getNavigationPath())}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icone className="text-white" size={24} />
                </div>
                <span className={`flex items-center text-sm font-semibold px-2 py-1 rounded-lg ${stat.evolutionPositive ? 'text-gendarme-green bg-gendarme-green/10' : 'text-gendarme-red bg-gendarme-red/10'}`}>
                  {stat.evolutionPositive ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
                  {stat.evolution}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 font-medium mb-2">{stat.titre}</p>
              <p className="text-2xl font-bold text-gray-900 mb-2">{stat.valeur}</p>
              <p className="text-xs text-gray-500">{stat.description}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.details}</p>
            </div>
          )
        })}
      </div>

      {/* Actions rapides avec hover effects */}
      <div className="card-pro p-6">
        <div className="flex items-center mb-6">
          <TrendingUp className="text-gendarme-blue mr-3" size={28} />
          <h2 className="text-2xl font-bold text-gendarme-dark">Actions rapides</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {actionsRapides.map((action, index) => {
            const Icone = action.icone
            return (
              <div
                key={index}
                onClick={action.action}
                className="card-pro-hover p-6 group relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                <div className={`inline-flex p-4 bg-gradient-to-br ${action.gradient} rounded-2xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                  <Icone className="text-white" size={28} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg relative z-10">{action.titre}</h3>
                <p className="text-sm text-gray-600 mb-2 relative z-10">{action.description}</p>
                <p className="text-xs text-gray-500 font-medium relative z-10">{action.count}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique circulaire - Types de crimes */}
        <div className="card-pro p-6">
          <h3 className="font-bold text-gendarme-dark mb-6 text-xl flex items-center">
            <PieChart className="mr-2 text-gendarme-gold-dark" size={24} />
            Répartition par type de crime
          </h3>
          {dataCrimes.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={dataCrimes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataCrimes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {dataCrimes.map((item, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-sm text-gray-700 font-medium">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <PieChart size={64} className="mb-3 opacity-30" />
              <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              <p className="text-sm text-gray-500 mt-1">Les statistiques apparaîtront ici</p>
            </div>
          )}
        </div>

        {/* Graphique barres - Tendances mensuelles */}
        <div className="card-pro p-6">
          <h3 className="font-bold text-gendarme-dark mb-6 text-xl flex items-center">
            <BarChart3 className="mr-2 text-gendarme-light" size={24} />
            Évolution mensuelle
          </h3>
          {dataMensuelle.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBar data={dataMensuelle}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mois" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                  <Bar dataKey="cas" fill="#002382" name="Cas totaux" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="resolus" fill="#0CED05" name="Cas résolus" radius={[8, 8, 0, 0]} />
              </RechartsBar>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <BarChart3 size={64} className="mb-3 opacity-30" />
              <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              <p className="text-sm text-gray-500 mt-1">Les statistiques mensuelles apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>

      {/* Graphique évolution + Stats temporelles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique ligne - Évolution totale */}
        <div className="card-pro p-6">
          <h3 className="font-bold text-gendarme-dark mb-6 text-xl flex items-center">
            <LineChart className="mr-2 text-gendarme-blue" size={24} />
            Évolution cumulative des fiches
          </h3>
          {dataEvolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dataEvolution}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002382" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#002382" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mois" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#002382" 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <LineChart size={64} className="mb-3 opacity-30" />
              <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              <p className="text-sm text-gray-500 mt-1">L'évolution cumulative apparaîtra ici</p>
            </div>
          )}
        </div>

        {/* Statistiques temporelles - Graphique */}
        <div className="card-pro p-6">
          <h3 className="font-bold text-gendarme-dark mb-6 text-xl flex items-center">
            <Clock className="mr-2 text-gendarme-gold-dark" size={24} />
            Statistiques temporelles
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBar data={[
              { periode: 'Aujourd\'hui', valeur: 28 },
              { periode: 'Cette semaine', valeur: 187 },
              { periode: 'Ce mois', valeur: 367 },
              { periode: 'Cette année', valeur: 4390 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="periode" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar 
                dataKey="valeur" 
                fill="url(#gradientPurple)" 
                radius={[12, 12, 0, 0]}
                name="Nombre de cas"
              />
              <defs>
                <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0C75E" />
                  <stop offset="100%" stopColor="#E8BF45" />
                </linearGradient>
              </defs>
            </RechartsBar>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistiques géographiques */}
      <div className="card-pro p-6">
        <h3 className="font-bold text-gendarme-dark mb-6 text-xl flex items-center">
          <MapPin className="mr-2 text-gendarme-red" size={24} />
          Répartition géographique
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsGeographiques.map((stat, i) => (
            <div key={i} className="p-6 bg-gradient-to-br from-gendarme-gray to-white rounded-xl border-2 border-gendarme-blue/10 hover:border-gendarme-blue/30 transition-all hover:scale-105 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gendarme-dark text-lg">{stat.ville}</h4>
                <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${stat.hausse ? 'text-gendarme-red bg-gendarme-red/10' : 'text-gendarme-green bg-gendarme-green/10'}`}>
                  {stat.evolution}
                </span>
              </div>
              <p className="text-2xl font-bold text-gendarme-blue mb-2">{stat.cas}</p>
              <p className="text-sm text-gray-600 mb-3">cas enregistrés</p>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gendarme-blue to-gendarme-blue-dark rounded-full"
                  style={{ width: `${(stat.cas / 500) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistiques utilisateurs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {utilisateursStats.map((stat, i) => {
          const Icone = stat.icone
          const getCouleurClasses = (couleur) => {
            const colors = {
              emerald: {
                border: 'border-emerald-500',
                bg: 'bg-emerald-100',
                text: 'text-emerald-600'
              },
              red: {
                border: 'border-red-500',
                bg: 'bg-red-100',
                text: 'text-red-600'
              },
              blue: {
                border: 'border-blue-500',
                bg: 'bg-blue-100',
                text: 'text-blue-600'
              }
            }
            return colors[couleur] || colors.blue
          }
          const colorClasses = getCouleurClasses(stat.couleur)
          return (
            <div key={i} className={`card-pro p-6 border-l-4 ${colorClasses.border}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${colorClasses.bg} rounded-xl`}>
                  <Icone className={colorClasses.text} size={28} />
                </div>
                <span className={`text-2xl font-bold ${colorClasses.text}`}>{stat.valeur}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{stat.label}</h3>
              <p className="text-sm text-gray-600 mt-1">Utilisateurs {stat.label.toLowerCase()}</p>
            </div>
          )
        })}
      </div>

      {/* Utilisateurs connectés en temps réel */}
      <div className="card-pro overflow-hidden">
        <div className="bg-gradient-to-r from-gendarme-green via-gendarme-green-light to-gendarme-green-dark p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                <Activity className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Gestion des Utilisateurs</h2>
                <p className="text-white/80 text-sm">Vue d'ensemble des comptes actifs et inactifs</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <div className="w-2 h-2 bg-gendarme-green rounded-full animate-pulse"></div>
                <span className="text-white font-bold">{nbUtilisateursActifs} actifs</span>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-white font-bold">{nbUtilisateursInactifs} inactifs</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Filtres de recherche */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <Filter className="text-gendarme-blue mr-2" size={20} />
              <h3 className="font-bold text-gray-900 text-lg">Filtres de recherche</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, rôle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gendarme-blue rounded-xl focus:border-gendarme-blue focus:ring-2 focus:ring-gendarme-blue/20 transition-all outline-none text-gray-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  
                </button>
              )}
            </div>
            
            {/* Boutons de filtre par statut */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setFiltreStatut('tous')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  filtreStatut === 'tous'
                    ? 'bg-gendarme-blue text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users size={18} />
                  <span>Tous ({tousUtilisateurs.length})</span>
                </div>
              </button>
              <button
                onClick={() => setFiltreStatut('actif')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  filtreStatut === 'actif'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <UserCheck size={18} />
                  <span>Actifs ({nbUtilisateursActifs})</span>
                </div>
              </button>
              <button
                onClick={() => setFiltreStatut('inactif')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  filtreStatut === 'inactif'
                    ? 'bg-gray-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <UserX size={18} />
                  <span>Inactifs ({nbUtilisateursInactifs})</span>
                </div>
              </button>
              <button
                onClick={() => setFiltreStatut('suspendu')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  filtreStatut === 'suspendu'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <UserX size={18} />
                  <span>Suspendus ({nbUtilisateursSuspendus})</span>
                </div>
              </button>
            </div>
            
            {(searchQuery || filtreStatut !== 'tous') && (
              <p className="mt-3 text-sm text-gray-600">
                {utilisateursFiltres.length} résultat{utilisateursFiltres.length !== 1 ? 's' : ''} trouvé{utilisateursFiltres.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {utilisateursFiltres.length > 0 ? (
              utilisateursFiltres.map((user, i) => {
                const nomComplet = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.username || 'Utilisateur'
                const initiales = (user.prenom?.[0] || '') + (user.nom?.[0] || '') || user.username?.[0] || '?'
                const userStatut = user.statut?.toLowerCase() || (user.is_active ? 'actif' : 'inactif')
                
                // Configuration des couleurs selon le statut
                const statusConfig = {
                  actif: {
                    borderColor: 'border-emerald-500',
                    bgGradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
                    dotColor: 'bg-emerald-500',
                    badgeClass: 'bg-emerald-100 text-emerald-700',
                    label: 'Actif'
                  },
                  inactif: {
                    borderColor: 'border-gray-500',
                    bgGradient: 'bg-gradient-to-br from-gray-400 to-gray-500',
                    dotColor: 'bg-gray-500',
                    badgeClass: 'bg-gray-100 text-gray-700',
                    label: 'Inactif'
                  },
                  suspendu: {
                    borderColor: 'border-red-500',
                    bgGradient: 'bg-gradient-to-br from-red-500 to-red-600',
                    dotColor: 'bg-red-500',
                    badgeClass: 'bg-red-100 text-red-700',
                    label: 'Suspendu'
                  }
                }
                
                const config = statusConfig[userStatut] || statusConfig.inactif
                
                return (
                  <div 
                    key={user.id || i} 
                    className={`card-pro-hover p-4 border-l-4 animate-slideInUp cursor-pointer ${config.borderColor}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => navigate(`/utilisateurs/voir/${user.id}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${config.bgGradient}`}>
                          {initiales.toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${config.dotColor}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{nomComplet}</h4>
                          <span className={`px-2 py-0.5 ${config.badgeClass} text-xs font-semibold rounded-full whitespace-nowrap`}>
                            {config.label}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{user.role?.nom || 'Rôle non défini'}</p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {user.email || user.username}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-full text-center py-8">
                <UserX className="mx-auto text-gray-400 mb-3" size={48} />
                {searchQuery || filtreStatut !== 'tous' ? (
                  <>
                    <p className="text-gray-600 font-medium">Aucun utilisateur trouvé</p>
                    <p className="text-xs text-gray-500 mt-1">Aucun utilisateur ne correspond à vos critères</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 font-medium">Aucun utilisateur</p>
                    <p className="text-xs text-gray-500 mt-1">Les utilisateurs apparaîtront ici une fois créés</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          {tousUtilisateurs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/utilisateurs')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gendarme-green hover:bg-gendarme-green-dark text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Users size={20} />
                <span>Voir tous les utilisateurs</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activité récente moderne - En cartes */}
      <div className="space-y-4">
        <div className="flex items-center">
          <Activity className="text-gendarme-blue mr-3" size={28} />
          <h2 className="text-2xl font-bold text-gendarme-dark">Activité récente du système</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activitesRecentes.map((item, i) => {
            const Icone = item.icone
            const getNavigationPath = () => {
              if (item.action.includes('fiche')) return '/fiches-criminelles';
              if (item.action.includes('Utilisateur')) return '/utilisateurs';
              if (item.action.includes('Rapport')) return '/rapports';
              if (item.action.includes('permissions')) return '/roles';
              if (item.action.includes('IA')) return '/ia';
              return '/dashboard';
            }
            return (
              <div 
                key={i} 
                className="card-pro-hover p-6 relative overflow-hidden group cursor-pointer"
                onClick={() => navigate(getNavigationPath())}
              >
                <div className={`absolute inset-0 ${item.bg} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${item.bg} rounded-xl shadow-md group-hover:scale-110 transition-transform`}>
                      <Icone className={item.color} size={24} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full">
                      Il y a {item.time}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.action}</h3>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    {item.user}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DashboardAdministrateur
