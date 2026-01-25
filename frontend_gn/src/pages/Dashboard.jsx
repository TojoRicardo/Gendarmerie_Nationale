import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  Activity, TrendingUp, TrendingDown, Users, FileText, 
  AlertTriangle, Clock, CheckCircle, MapPin, BarChart3, PieChart,
  RefreshCw, Maximize2, Eye, ShieldCheck, KeyRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GraphiquesAvances from '../../components/rapports/GraphiquesAvances'
import { getUsers } from '../services/authService'
import { getDashboardStats } from '../services/statsService'

const Dashboard = () => {
  const { utilisateur } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statsData, setStatsData] = useState(null)
  const [tousUtilisateurs, setTousUtilisateurs] = useState([])
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Données par défaut avec plus de richesse
  const defaultStats = {
    global: {
      total_fiches: 1234,
      evolution_fiches: '+12%',
      evolution_fiches_positive: true,
      fiches_ce_mois: 156,
      total_roles: 8,
      nouveaux_roles: 2,
      total_permissions: 45,
      alertes_en_cours: 23,
      evolution_alertes: '+8%',
      alertes_critiques: 5
    },
    users: {
      actifs: 89,
      inactifs: 12,
      total: 101,
      evolution: '+5%',
      en_ligne: 24
    },
    recentActivity: [
      {
        description: 'Nouvelle fiche criminelle créée pour l\'affaire #2847',
        user_name: 'M. Kaddour',
        time_ago: '5 min',
        type: 'fiche'
      },
      {
        description: 'Utilisateur "F. Taleb" a été ajouté au système',
        user_name: 'Admin',
        time_ago: '23 min',
        type: 'utilisateur'
      },
      {
        description: 'Rapport mensuel validé et archivé',
        user_name: 'O. Magistrat',
        time_ago: '1 h',
        type: 'rapport'
      },
      {
        description: 'Permissions modifiées pour le rôle "Analyste"',
        user_name: 'Admin',
        time_ago: '2 h',
        type: 'permission'
      },
      {
        description: 'Analyse IA terminée : 5 correspondances trouvées',
        user_name: 'Système IA',
        time_ago: '3 h',
        type: 'ia'
      }
    ],
    onlineUsers: [
      { name: 'Mohamed Kaddour', role: 'Enquêteur Principal', connected_since: '2h 15min' },
      { name: 'Fatima Taleb', role: 'Analyste Judiciaire', connected_since: '45min' },
      { name: 'Admin Système', role: 'Administrateur', connected_since: '5h 30min' },
      { name: 'Omar Magistrat', role: 'Observateur Externe', connected_since: '1h 20min' },
      { name: 'Sarah Benali', role: 'Enquêteur', connected_since: '35min' },
      { name: 'Karim Hassani', role: 'Technicien Biométrie', connected_since: '3h 10min' }
    ]
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Récupérer toutes les statistiques réelles depuis le backend
        let stats = { ...defaultStats }
        
        try {
          // Appeler le service qui récupère toutes les stats
          const dashboardData = await getDashboardStats()
          
          // Récupérer aussi les utilisateurs pour des stats supplémentaires
          const utilisateurs = await getUsers().catch(() => [])
          const utilisateursArray = Array.isArray(utilisateurs) ? utilisateurs : (utilisateurs.results || [])
          setTousUtilisateurs(utilisateursArray)
          
          // Compter les rôles uniques
          const rolesUniques = [...new Set(utilisateursArray.map(u => u.role).filter(Boolean))]
          const totalRoles = rolesUniques.length || dashboardData.global?.total_roles || 4
          
          // Calculer les stats utilisateurs
          const utilisateursActifs = utilisateursArray.filter(u => u.statut === 'actif' || u.statut === 'Actif').length
          const utilisateursInactifs = utilisateursArray.filter(u => u.statut === 'inactif' || u.statut === 'Inactif').length
          const totalUtilisateurs = utilisateursArray.length
          
          // Construire l'objet de stats avec les vraies données
          stats = {
            global: {
              total_fiches: dashboardData.global?.total_fiches || dashboardData.global?.count || 0,
              evolution_fiches: dashboardData.global?.evolution_fiches || '+0%',
              evolution_fiches_positive: dashboardData.global?.evolution_fiches_positive !== false,
              fiches_ce_mois: dashboardData.global?.fiches_ce_mois || dashboardData.global?.this_month || 0,
              total_roles: totalRoles,
              nouveaux_roles: dashboardData.global?.nouveaux_roles || 0,
              total_permissions: dashboardData.global?.total_permissions || 45,
              alertes_en_cours: dashboardData.global?.alertes_en_cours || dashboardData.global?.pending_alerts || 0,
              evolution_alertes: dashboardData.global?.evolution_alertes || '+0%',
              alertes_critiques: dashboardData.global?.alertes_critiques || dashboardData.global?.critical_alerts || 0
            },
            users: {
              actifs: dashboardData.users?.actifs || utilisateursActifs || 0,
              inactifs: dashboardData.users?.inactifs || utilisateursInactifs || 0,
              total: dashboardData.users?.total || totalUtilisateurs || 0,
              evolution: dashboardData.users?.evolution || '+0%',
              en_ligne: dashboardData.users?.en_ligne || dashboardData.users?.online || 0
            },
            recentActivity: dashboardData.recentActivity && dashboardData.recentActivity.length > 0 
              ? dashboardData.recentActivity 
              : defaultStats.recentActivity,
            onlineUsers: dashboardData.onlineUsers && dashboardData.onlineUsers.length > 0 
              ? dashboardData.onlineUsers 
              : [],
            // Ajouter les données pour les graphiques
            crimeTypes: dashboardData.crimeTypes || [],
            evolution: dashboardData.evolution || [],
            monthly: dashboardData.monthly || [],
            geographic: dashboardData.geographic || [],
            hourly: dashboardData.hourly || [],
            performance: dashboardData.performance || [],
            typesCriminels: dashboardData.typesCriminels || []
          }
          
          console.log('Statistiques réelles chargées depuis le backend:', stats)
          console.log('Données graphiques:', {
            crimeTypes: stats.crimeTypes?.length || 0,
            evolution: stats.evolution?.length || 0,
            monthly: stats.monthly?.length || 0,
            geographic: stats.geographic?.length || 0,
            hourly: stats.hourly?.length || 0,
            typesCriminels: stats.typesCriminels?.length || 0
          })
          
        } catch (apiError) {
          console.error('Erreur lors de la récupération des données depuis l\'API:', apiError)
          console.warn('Utilisation des données par défaut en attendant la connexion au backend')
          // En cas d'erreur API, utiliser les données par défaut
          stats = defaultStats
        }
        
        setStatsData(stats)
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err)
        setError(err.message || 'Erreur lors du chargement des données')
        setStatsData(defaultStats)
      } finally {
        setLoading(false)
      }
    }

    if (utilisateur) {
      loadDashboardData()
    } else {
      setLoading(false)
    }
  }, [utilisateur, refreshKey])

  const getRoleConfig = (roleName) => {
    const configs = {
      'admin': { title: 'Administrateur', color: 'from-red-500 to-red-600', icon: ShieldCheck },
      'Administrateur': { title: 'Administrateur', color: 'from-red-500 to-red-600', icon: ShieldCheck },
      'officer': { title: 'Officier', color: 'from-[#1487EB] to-[#0f6bc6]', icon: Users },
      'Officier': { title: 'Officier', color: 'from-[#1487EB] to-[#0f6bc6]', icon: Users },
      'supervisor': { title: 'Superviseur', color: 'from-green-500 to-green-600', icon: FileText },
      'Superviseur': { title: 'Superviseur', color: 'from-green-500 to-green-600', icon: FileText },
      'analyst': { title: 'Analyste', color: 'from-purple-500 to-purple-600', icon: BarChart3 },
      'Analyste': { title: 'Analyste', color: 'from-purple-500 to-purple-600', icon: BarChart3 },
      'viewer': { title: 'Lecteur', color: 'from-gray-500 to-gray-600', icon: Eye },
      'Lecteur': { title: 'Lecteur', color: 'from-gray-500 to-gray-600', icon: Eye }
    }
    return configs[roleName] || configs['viewer']
  }

  const roleConfig = getRoleConfig(utilisateur?.role)
  const Icone = roleConfig.icon

  const statistiques = statsData?.global ? [
    {
      titre: 'Fiches Criminelles',
      valeur: statsData.global.total_fiches?.toString() || '0',
      evolution: statsData.global.evolution_fiches || '0%',
      evolutionPositive: statsData.global.evolution_fiches_positive !== false,
      icone: FileText,
      gradient: 'from-gendarme-blue to-gendarme-blue-dark',
      description: 'Total des dossiers',
      details: `${statsData.global.fiches_ce_mois || 0} ce mois`,
      navigation: '/fiches-criminelles'
    },
    {
      titre: 'Utilisateurs Actifs',
      valeur: statsData.users?.actifs?.toString() || '0',
      evolution: statsData.users?.evolution || '0%',
      evolutionPositive: true,
      icone: Users,
      gradient: 'from-gendarme-light to-gendarme-light-hover',
      description: 'Connectés ce mois',
      details: `${statsData.users?.en_ligne || 0} en ligne`,
      navigation: '/utilisateurs'
    },
    {
      titre: 'Rôles & Permissions',
      valeur: statsData.global?.total_roles?.toString() || '0',
      evolution: `+${statsData.global?.nouveaux_roles || 0}`,
      evolutionPositive: true,
      icone: ShieldCheck,
      gradient: 'from-gendarme-gold to-gendarme-gold-dark',
      description: 'Rôles configurés',
      details: `${statsData.global?.total_permissions || 0} permissions`,
      navigation: '/roles'
    },
    {
      titre: 'Alertes en cours',
      valeur: statsData.global?.alertes_en_cours?.toString() || '0',
      evolution: statsData.global?.evolution_alertes || '0%',
      evolutionPositive: true,
      icone: AlertTriangle,
      gradient: 'from-gendarme-red to-gendarme-red-dark',
      description: 'Nécessitent attention',
      details: `${statsData.global?.alertes_critiques || 0} critiques`,
      navigation: '/audit'
    },
  ] : []

  const handleStatClick = (stat) => {
    if (stat.navigation) {
      navigate(stat.navigation)
    }
  }

  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading && !statsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto" style={{ borderColor: '#1487EB' }}></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (error && !statsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-bold">Erreur</p>
            <p>{error}</p>
            <button 
              onClick={refreshData} 
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!utilisateur) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
            <p className="font-bold">Non authentifié</p>
            <p>Veuillez vous connecter pour accéder au tableau de bord.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-gradient-to-br from-gray-50 to-gray-100 p-6 overflow-auto' : 'bg-gradient-to-br from-gray-50 to-gray-100 -m-6 p-6 min-h-screen'}`}>
      {/* En-tête Premium */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden backdrop-blur-sm">
        <div className={`relative bg-gradient-to-r ${roleConfig.color} p-6 overflow-hidden`}>
          {/* Effet de fond décoratif */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg ring-2 ring-white/30">
                <Icone className="text-white drop-shadow-lg" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-md mb-1">
                  Tableau de Bord
                </h1>
                <p className="text-white/90 text-sm font-medium">
                  {utilisateur ? `${utilisateur.prenom} ${utilisateur.nom} • ${roleConfig.title}` : 'Système'}
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center space-x-2">
              <button
                onClick={refreshData}
                className="group p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm hover:scale-105"
                title="Rafraîchir"
              >
                <RefreshCw className="text-white group-hover:rotate-180 transition-transform duration-500" size={20} />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm hover:scale-105"
                title={isFullscreen ? 'Réduire' : 'Plein écran'}
              >
                <Maximize2 className="text-white" size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {statistiques.map((stat, index) => {
          const Icone = stat.icone
          return (
            <div
              key={index}
              className="group relative bg-white rounded-xl border border-gray-200/60 p-5 cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-400/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              onClick={() => handleStatClick(stat)}
            >
              {/* Effet de brillance au survol */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                    <Icone className="text-white" size={20} />
                  </div>
                  <span className={`flex items-center text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm ${
                    stat.evolutionPositive ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200' : 'text-red-700 bg-red-50 ring-1 ring-red-200'
                  }`}>
                    {stat.evolutionPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                    {stat.evolution}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">{stat.titre}</p>
                <p className="text-3xl font-extrabold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">{stat.valeur}</p>
                <p className="text-xs text-gray-600 font-medium">{stat.details}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Graphiques avancés */}
      <GraphiquesAvances 
        data={statsData}
        theme="light"
        showControls={true}
        enableAnimations={true}
        defaultView="overview"
      />

      {/* Gestion des utilisateurs - Actifs et Inactifs */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-lg">
        <div className="relative p-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1487EB 0%, #0f6bc6 100%)' }}>
          {/* Effets décoratifs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/95 rounded-xl shadow-lg backdrop-blur-sm">
                <Users style={{ color: '#1487EB' }} size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white drop-shadow-md">Gestion des Utilisateurs</h2>
                <p className="text-white/90 text-xs font-medium">Utilisateurs actifs et inactifs</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <div className="w-2 h-2 bg-gendarme-green rounded-full animate-pulse"></div>
                <span className="text-white font-bold">{tousUtilisateurs.filter(u => u.is_active === true).length} actifs</span>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-white font-bold">{tousUtilisateurs.filter(u => u.is_active === false).length} inactifs</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-5 bg-gradient-to-br from-gray-50 to-white">
          {/* Filtres */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setFiltreStatut('tous')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filtreStatut === 'tous'
                  ? 'bg-gendarme-blue text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous ({tousUtilisateurs.length})
            </button>
            <button
              onClick={() => setFiltreStatut('actif')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filtreStatut === 'actif'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Actifs ({tousUtilisateurs.filter(u => (u.statut === 'actif' || (u.is_active === true && !u.statut))).length})
            </button>
            <button
              onClick={() => setFiltreStatut('inactif')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filtreStatut === 'inactif'
                  ? 'bg-gray-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inactifs ({tousUtilisateurs.filter(u => (u.statut === 'inactif' || (u.is_active === false && u.statut !== 'suspendu'))).length})
            </button>
            <button
              onClick={() => setFiltreStatut('suspendu')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filtreStatut === 'suspendu'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Suspendus ({tousUtilisateurs.filter(u => u.statut === 'suspendu').length})
            </button>
          </div>

          {/* Liste des utilisateurs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tousUtilisateurs.length > 0 ? (
              tousUtilisateurs
                .filter(user => {
                  // Déterminer le statut réel de l'utilisateur
                  const userStatut = user.statut?.toLowerCase() || (user.is_active ? 'actif' : 'inactif')
                  
                  if (filtreStatut === 'actif') return userStatut === 'actif'
                  if (filtreStatut === 'inactif') return userStatut === 'inactif'
                  if (filtreStatut === 'suspendu') return userStatut === 'suspendu'
                  return true
                })
                .map((user, i) => {
                  // Déterminer le statut réel de l'utilisateur
                  const userStatut = user.statut?.toLowerCase() || (user.is_active ? 'actif' : 'inactif')
                  
                  // Couleurs selon le statut
                  const statusConfig = {
                    actif: {
                      bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      dotColor: '#10b981',
                      textColor: 'text-green-600',
                      label: 'Actif',
                      dotClass: 'bg-green-500 animate-pulse'
                    },
                    inactif: {
                      bgGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      dotColor: '#6b7280',
                      textColor: 'text-gray-600',
                      label: 'Inactif',
                      dotClass: 'bg-gray-500'
                    },
                    suspendu: {
                      bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      dotColor: '#ef4444',
                      textColor: 'text-red-600',
                      label: 'Suspendu',
                      dotClass: 'bg-red-500'
                    }
                  }
                  
                  const config = statusConfig[userStatut] || statusConfig.inactif
                  
                  return (
                  <div 
                    key={user.id || i}
                    onClick={() => navigate(`/utilisateurs/${user.id}`)}
                    className="group bg-white rounded-xl border border-gray-200/60 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300 p-4 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300" style={{ background: config.bgGradient }}>
                          {(user.nom?.charAt(0) || user.username?.charAt(0) || '?').toUpperCase()}
                        </div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: config.dotColor }}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                          {user.nom && user.prenom ? `${user.nom} ${user.prenom}` : user.username || 'Utilisateur'}
                        </h4>
                        <p className="text-xs text-gray-600 truncate mb-1">{user.role?.nom || user.role || 'Rôle'}</p>
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full ${config.dotClass} mr-1.5`}></div>
                            <p className={`text-xs ${config.textColor} font-medium`}>{config.label}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200/60 shadow-sm">
                <div className="inline-flex p-4 bg-gray-100 rounded-full mb-3">
                  <Users className="text-gray-400" size={40} />
                </div>
                <p className="text-gray-700 font-bold text-base mb-1">Aucun utilisateur trouvé</p>
                <p className="text-xs text-gray-500">Les utilisateurs apparaîtront ici</p>
              </div>
            )}
          </div>
          
          {tousUtilisateurs.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-200/60">
              <button
                onClick={() => navigate('/utilisateurs')}
                className="group w-full flex items-center justify-center space-x-2 px-5 py-3 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #1487EB 0%, #0f6bc6 100%)' }}
              >
                <Users size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm">Voir tous les utilisateurs</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

