import { 
  FileText, Users, Search, Clock, CheckCircle, AlertCircle, TrendingUp, 
  Fingerprint, BrainCircuit, Target, Award, Activity, ArrowUp, ChevronRight,
  Bell, AlertTriangle, Info, Plus, Check, ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useNotification } from '../../context/NotificationContext'

const DashboardEnqueteur = () => {
  const navigate = useNavigate()
  const { ajouterNotification } = useNotification()
  
  // Fonction pour gérer le clic sur une alerte
  const handleAlerteClick = (alerte) => {
    // Afficher une notification de confirmation
    ajouterNotification({
      type: 'info',
      message: `Ouverture : ${alerte.titre}`,
      duree: 2000
    })
    
    // Exécuter l'action de navigation
    alerte.action()
  }

  // Fonction pour gérer le clic sur une enquête
  const handleEnqueteClick = (enquete) => {
    ajouterNotification({
      type: 'success',
      message: `Ouverture de l'enquête ${enquete.numero}`,
      duree: 2000
    })
    navigate(`/fiches-criminelles/voir/${enquete.numero.split('-')[2]}`)
  }

  // Fonction pour gérer le clic sur une action rapide
  const handleActionRapideClick = (action) => {
    ajouterNotification({
      type: 'success',
      message: `Navigation vers : ${action.titre}`,
      duree: 1500
    })
    action.action()
  }

  // Fonction pour gérer le clic sur une activité
  const handleActiviteClick = (activite) => {
    ajouterNotification({
      type: 'info',
      message: `Ouverture de l'activité`,
      duree: 1500
    })
    navigate(`/fiches-criminelles/voir/${activite.enquete.split('-')[2]}`)
  }

  // Fonction pour gérer le clic sur une statistique
  const handleStatClick = (stat) => {
    ajouterNotification({
      type: 'info',
      message: `Navigation vers : ${stat.titre}`,
      duree: 1500
    })
    
    // Navigation selon le type de stat
    switch(stat.titre) {
      case 'Mes Enquêtes':
      case 'En Cours':
      case 'Clôturées':
      case 'Suspects Identifiés':
        navigate('/fiches-criminelles')
        break
      default:
        navigate('/dashboard')
    }
  }
  
  // TODO: Récupérer les alertes réelles depuis l'API  
  // const [alertes, setAlertes] = useState(await fetch('/api/notifications/alertes-enqueteur'))
  const [alertes, setAlertes] = useState([])

  // TODO: Récupérer les statistiques personnelles depuis l'API
  // const statsPersonnelles = useEffect(() => fetch('/api/enqueteur/stats-personnelles'))
  const statsPersonnelles = []

  // Actions rapides - Sans compteurs fictifs
  const actionsRapides = [
    {
      titre: 'Nouvelle Fiche',
      description: 'Créer une nouvelle enquête criminelle',
      icone: FileText,
      gradient: 'from-gendarme-green to-gendarme-green-dark',
      action: () => navigate('/fiches-criminelles/creer'),
      count: 'Créer'
    },
    {
      titre: 'Reconnaissance Faciale',
      description: 'Analyser des photos de suspects',
      icone: Fingerprint,
      gradient: 'from-gendarme-light to-gendarme-light-hover',
      action: () => navigate('/biometrie'),
      count: 'Analyser'
    },
    {
      titre: 'Intelligence IA',
      description: 'Outils d\'analyse avancés et patterns',
      icone: BrainCircuit,
      gradient: 'from-gendarme-blue-light to-gendarme-light',
      action: () => navigate('/ia'),
      count: 'Prédictions'
    },
    {
      titre: 'Recherche Rapide',
      description: 'Consulter la base de données',
      icone: Search,
      gradient: 'from-gendarme-blue to-gendarme-blue-dark',
      action: () => navigate('/fiches-criminelles'),
      count: 'Rechercher'
    },
  ]

  // TODO: Récupérer les enquêtes réelles depuis l'API
  // const mesEnquetes = useEffect(() => fetch('/api/enquetes/mes-enquetes'))
  const mesEnquetes = []

  // TODO: Récupérer les activités réelles depuis l'API  
  // const activitesRecentes = useEffect(() => fetch('/api/audit/activites-enqueteur'))
  const activitesRecentes = []

  const getStatutBadge = (statut) => {
    switch(statut) {
      case 'en_cours':
        return { bg: 'bg-gendarme-gold/10', text: 'text-gendarme-gold-dark', border: 'border-gendarme-gold/20', label: 'En cours' }
      case 'en_attente':
        return { bg: 'bg-gendarme-light/10', text: 'text-gendarme-light', border: 'border-gendarme-light/20', label: 'En attente' }
      case 'cloture':
        return { bg: 'bg-gendarme-green/10', text: 'text-gendarme-green-dark', border: 'border-gendarme-green/20', label: 'Clôturée' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', label: 'Inconnu' }
    }
  }

  const getPrioriteBadge = (priorite) => {
    switch(priorite) {
      case 'haute':
        return { bg: 'bg-gendarme-red/10', text: 'text-gendarme-red-dark', border: 'border-gendarme-red/20', label: 'Haute' }
      case 'normale':
        return { bg: 'bg-gendarme-blue/10', text: 'text-gendarme-blue', border: 'border-gendarme-blue/20', label: 'Normale' }
      case 'basse':
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', label: 'Basse' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', label: 'Non définie' }
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alertes Importantes en Cartes Modernes */}
      {alertes.length > 0 && (
        <div className="space-y-4">
          {/* Header Section */}
          <div className="card-pro overflow-hidden">
            <div className="bg-gradient-to-r from-gendarme-red via-gendarme-red/90 to-gendarme-red-dark p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg animate-pulse">
                    <Bell className="text-white" size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Alertes Importantes</h2>
                    <p className="text-white/80 text-sm">{alertes.length} notification(s) nécessitant votre attention immédiate</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="text-white font-bold text-lg">{alertes.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cartes d'Alertes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alertes.map((alerte, index) => {
              const Icone = alerte.icone
              const couleurConfig = {
                blue: {
                  gradient: 'from-blue-500 to-blue-600',
                  bg: 'bg-blue-50',
                  border: 'border-blue-200',
                  text: 'text-blue-700',
                  iconBg: 'bg-blue-100',
                  ring: 'ring-blue-500/20'
                },
                green: {
                  gradient: 'from-green-500 to-green-600',
                  bg: 'bg-green-50',
                  border: 'border-green-200',
                  text: 'text-green-700',
                  iconBg: 'bg-green-100',
                  ring: 'ring-green-500/20'
                },
                orange: {
                  gradient: 'from-orange-500 to-orange-600',
                  bg: 'bg-orange-50',
                  border: 'border-orange-200',
                  text: 'text-orange-700',
                  iconBg: 'bg-orange-100',
                  ring: 'ring-orange-500/20'
                },
                red: {
                  gradient: 'from-red-500 to-red-600',
                  bg: 'bg-red-50',
                  border: 'border-red-200',
                  text: 'text-red-700',
                  iconBg: 'bg-red-100',
                  ring: 'ring-red-500/20'
                }
              }
              
              const config = couleurConfig[alerte.couleur]
              
              return (
                <div 
                  key={alerte.id} 
                  onClick={() => handleAlerteClick(alerte)}
                  className="card-pro-hover overflow-hidden group cursor-pointer ring-2 ring-transparent hover:ring-4 transition-all duration-300 active:scale-95"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Header avec gradient */}
                  <div className={`bg-gradient-to-r ${config.gradient} p-5 relative overflow-hidden`}>
                    {/* Icône géante en background */}
                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
                      <Icone size={120} className="text-white" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 transition-transform ring-2 ring-white/50`}>
                          <Icone className="text-white" size={24} />
                        </div>
                        <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-gray-700 shadow-md">
                          {alerte.temps}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-1">
                        {alerte.titre}
                      </h3>
                    </div>
                  </div>

                  {/* Corps de la carte */}
                  <div className={`p-5 ${config.bg} border-l-4 ${config.border}`}>
                    <p className={`text-sm ${config.text} font-medium leading-relaxed mb-4`}>
                      {alerte.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${config.text} uppercase tracking-wide`}>
                        {alerte.type}
                      </span>
                      <ChevronRight className={`${config.text} group-hover:translate-x-2 transition-transform`} size={20} />
                    </div>
                  </div>

                  {/* Footer avec effet hover */}
                  <div className="px-5 py-3 bg-white border-t border-gray-200 group-hover:bg-gradient-to-r group-hover:from-gray-50 group-hover:to-white transition-all">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={14} className="text-gendarme-gold" />
                      <span className="text-xs text-gray-600 font-medium">Cliquez pour voir les détails</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* En-tête Premium */}
      <div className="card-pro overflow-hidden">
        <div className="bg-gradient-to-r from-gendarme-green via-gendarme-green-light to-gendarme-green-dark p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-xl">
                <ShieldCheck size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white mb-1">Tableau de Bord Enquêteur</h1>
                <p className="text-white/80 text-base font-medium">
                  Gestion et suivi de vos enquêtes en cours
                </p>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-xl border-2 border-white/30">
                <p className="text-xs font-bold text-gendarme-gold mb-1">Rôle actuel</p>
                <div className="flex items-center space-x-2">
                  <Award className="text-white" size={20} />
                  <p className="text-lg font-black text-white">Enquêteur Principal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques personnelles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statsPersonnelles.map((stat, index) => {
          const Icone = stat.icone
          const getNavigationPath = () => {
            switch(stat.titre) {
              case 'Mes Enquêtes': return '/fiches-criminelles';
              case 'En Cours': return '/fiches-criminelles';
              case 'Clôturées': return '/fiches-criminelles';
              case 'Suspects Identifiés': return '/fiches-criminelles';
              default: return '/dashboard';
            }
          }
          return (
            <div
              key={index}
              className="stat-card hover-lift group animate-scaleIn cursor-pointer active:scale-95 transition-transform"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleStatClick(stat)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`inline-flex p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icone className="text-white" size={28} />
                </div>
                {stat.evolution && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${
                    stat.evolutionPositive ? 'bg-gendarme-green/10 text-gendarme-green-dark' : 'bg-gendarme-red/10 text-gendarme-red-dark'
                  }`}>
                    <ArrowUp size={14} className={stat.evolutionPositive ? '' : 'rotate-180'} />
                    <span className="text-xs font-bold">{stat.evolution}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600 font-semibold mb-2">{stat.titre}</p>
              <p className="text-3xl font-black text-gray-900 mb-2">{stat.valeur}</p>
              <p className="text-sm text-gray-500">{stat.description}</p>
              
              <div className="mt-4 pt-4 border-t-2 border-gray-100">
                <p className="text-xs font-bold text-gray-700">{stat.details}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {actionsRapides.map((action, index) => {
          const Icone = action.icone
          return (
            <button
              key={index}
              onClick={() => handleActionRapideClick(action)}
              className="card-pro-hover p-6 cursor-pointer group animate-slideInUp text-left active:scale-95 transition-transform"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`inline-flex p-4 bg-gradient-to-br ${action.gradient} rounded-xl shadow-lg mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                <Icone className="text-white" size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">{action.titre}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{action.description}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500">{action.count}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Mes enquêtes récentes - En cartes */}
      <div className="space-y-6">
        <div className="card-pro overflow-hidden">
          <div className="bg-gradient-to-r from-gendarme-green via-gendarme-green-light to-gendarme-green-dark p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                  <TrendingUp className="text-white" size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Mes Enquêtes Récentes</h2>
                  <p className="text-white/80 text-sm">Suivi des dossiers prioritaires</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/fiches-criminelles')}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
              >
                Voir tout
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mesEnquetes.map((enquete, i) => {
            const statutInfo = getStatutBadge(enquete.statut)
            const prioriteInfo = getPrioriteBadge(enquete.priorite)
            
            return (
              <div 
                key={i} 
                className="card-pro-hover overflow-hidden group cursor-pointer active:scale-95 transition-transform"
                onClick={() => handleEnqueteClick(enquete)}
              >
                {/* Header de la carte avec gradient */}
                <div className="bg-gradient-to-r from-gendarme-green to-gendarme-green-light p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gendarme-green-dark rounded-lg text-sm font-black shadow-md">
                      {enquete.numero}
                    </div>
                    <span className={`badge-pro border text-xs font-bold px-2.5 py-1.5 ${
                      enquete.priorite === 'haute' 
                        ? 'bg-gendarme-red/10 text-gendarme-red-dark border-gendarme-red/20' 
                        : enquete.priorite === 'normale' 
                          ? 'bg-gendarme-blue/10 text-gendarme-blue border-gendarme-blue/20' 
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                      {prioriteInfo.label}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-bold text-white mb-2 line-clamp-2 min-h-[3rem]">
                    {enquete.titre}
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`badge-pro border-2 text-xs font-semibold px-2.5 py-1.5 ${
                      enquete.statut === 'en_cours' 
                        ? 'bg-gendarme-gold/15 text-gendarme-gold-dark border-white/30' 
                        : enquete.statut === 'en_attente' 
                          ? 'bg-gendarme-light/15 text-gendarme-light border-white/30' 
                          : 'bg-gendarme-green/15 text-gendarme-green-dark border-white/30'
                    }`}>
                      {statutInfo.label}
                    </span>
                  </div>
                </div>

                {/* Corps de la carte */}
                <div className="p-5 bg-white">
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <div className="p-2.5 bg-gendarme-blue/10 rounded-lg">
                          <Users size={20} className="text-gendarme-blue" />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-gendarme-blue">{enquete.suspects}</p>
                      <p className="text-xs text-gray-600 font-medium mt-1">Suspect(s)</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <div className="p-2.5 bg-gendarme-gold/10 rounded-lg">
                          <FileText size={20} className="text-gendarme-gold-dark" />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-gendarme-gold-dark">{enquete.preuves}</p>
                      <p className="text-xs text-gray-600 font-medium mt-1">Preuve(s)</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <div className="p-2.5 bg-gendarme-light/10 rounded-lg">
                          <Clock size={20} className="text-gendarme-light" />
                        </div>
                      </div>
                      <p className="text-lg font-black text-gendarme-light">{enquete.derniereMaj}</p>
                      <p className="text-xs text-gray-600 font-medium mt-1">MAJ</p>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gendarme-dark">Progression</span>
                      <span className="text-sm font-black text-gendarme-green">{enquete.progression}%</span>
                    </div>
                    <div className="h-3 bg-gendarme-gray rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-gendarme-green to-gendarme-green-light transition-all duration-1000 shadow-lg"
                        style={{ width: `${enquete.progression}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Footer avec hover effect */}
                <div className="px-5 py-3 bg-gendarme-gray border-t border-gray-200 group-hover:bg-gendarme-green/5 transition-all duration-300">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">Cliquez pour voir les détails</span>
                    <ChevronRight size={16} className="text-gendarme-green group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Supervision des subordonnés */}
      <div className="card-pro overflow-hidden">
        <div className="bg-gradient-to-r from-gendarme-gold via-gendarme-gold-dark to-gendarme-gold p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                <Users className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Équipe & Supervision</h2>
                <p className="text-white/80 text-sm">Suivi du travail de votre équipe</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <span className="text-white font-bold">3 membres actifs</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Membre 1 - Opérateur de saisie */}
            <div className="card-pro-hover p-5 border-l-4 border-gendarme-light">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-gendarme-light to-gendarme-light-hover rounded-full flex items-center justify-center text-white font-bold text-xl">
                    JD
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-gendarme-green rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Jean Dupont</h4>
                  <p className="text-xs text-gray-600">Opérateur de saisie</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Fiches traitées</span>
                  <span className="font-bold text-gendarme-blue">8</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tâches en cours</span>
                  <span className="font-bold text-gendarme-gold-dark">3</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Dernière activité</span>
                  <span className="text-xs text-gray-500">Il y a 15 min</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Performance</span>
                  <span className="text-sm font-bold text-gendarme-green">85%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gendarme-green to-gendarme-green-light" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>

            {/* Membre 2 - Technicien biométrie */}
            <div className="card-pro-hover p-5 border-l-4 border-gendarme-blue">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-gendarme-blue to-gendarme-blue-dark rounded-full flex items-center justify-center text-white font-bold text-xl">
                    ML
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-gendarme-green rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Marie Leblanc</h4>
                  <p className="text-xs text-gray-600">Technicienne biométrie</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Analyses faites</span>
                  <span className="font-bold text-gendarme-blue">12</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">En attente</span>
                  <span className="font-bold text-gendarme-gold-dark">2</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Dernière activité</span>
                  <span className="text-xs text-gray-500">Il y a 5 min</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Performance</span>
                  <span className="text-sm font-bold text-gendarme-green">92%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gendarme-green to-gendarme-green-light" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>

            {/* Membre 3 - Assistant enquête */}
            <div className="card-pro-hover p-5 border-l-4 border-gendarme-gold">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-gendarme-gold to-gendarme-gold-dark rounded-full flex items-center justify-center text-white font-bold text-xl">
                    PB
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-gray-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Pierre Bernard</h4>
                  <p className="text-xs text-gray-600">Assistant enquête</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Documents traités</span>
                  <span className="font-bold text-gendarme-blue">15</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tâches en cours</span>
                  <span className="font-bold text-gendarme-gold-dark">1</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Dernière activité</span>
                  <span className="text-xs text-gray-500">Il y a 2h</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Performance</span>
                  <span className="text-sm font-bold text-gendarme-green">78%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gendarme-gold to-gendarme-gold-dark" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card border-l-4 border-gendarme-green">
              <p className="text-sm text-gray-600 font-semibold mb-2">Tâches complétées (aujourd'hui)</p>
              <p className="text-3xl font-black text-gendarme-green mb-2">35</p>
              <p className="text-xs text-gray-500">+8 par rapport à hier</p>
            </div>
            
            <div className="stat-card border-l-4 border-gendarme-gold">
              <p className="text-sm text-gray-600 font-semibold mb-2">Tâches en cours</p>
              <p className="text-3xl font-black text-gendarme-gold-dark mb-2">6</p>
              <p className="text-xs text-gray-500">Réparties dans l'équipe</p>
            </div>
            
            <div className="stat-card border-l-4 border-gendarme-blue">
              <p className="text-sm text-gray-600 font-semibold mb-2">Taux de réussite</p>
              <p className="text-3xl font-black text-gendarme-blue mb-2">87%</p>
              <p className="text-xs text-gray-500">Performance globale</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activités récentes - En cartes */}
      <div className="space-y-6">
        <div className="card-pro overflow-hidden">
          <div className="bg-gradient-to-r from-gendarme-blue via-gendarme-blue-light to-gendarme-light p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                <Activity className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Activités Récentes</h2>
                <p className="text-white/80 text-sm">Dernières actions sur vos enquêtes</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {activitesRecentes.map((activite, index) => {
            const Icone = activite.icone
            return (
              <div 
                key={index} 
                className="card-pro-hover overflow-hidden group animate-scaleIn cursor-pointer active:scale-95 transition-transform"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleActiviteClick(activite)}
              >
                {/* Header avec icône */}
                <div className={`p-5 ${activite.bg} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 opacity-10">
                    <Icone size={80} className={activite.color} />
                  </div>
                  <div className="relative z-10">
                    <div className={`inline-flex p-3 ${activite.bg} rounded-xl shadow-lg mb-3 group-hover:scale-110 transition-transform ring-2 ring-white/50`}>
                      <Icone className={activite.color} size={28} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-gray-700">
                        Il y a {activite.time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corps de la carte */}
                <div className="p-5 bg-white">
                  <h3 className="font-bold text-gendarme-dark text-sm mb-3 leading-tight min-h-[2.5rem]">
                    {activite.action}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gendarme-blue rounded-full"></div>
                      <span className="text-xs text-gray-600 font-medium">Enquête</span>
                    </div>
                    <div className="px-3 py-2 bg-gendarme-blue/5 rounded-lg border border-gendarme-blue/10">
                      <p className="text-sm font-black text-gendarme-blue">
                        {activite.enquete}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer avec hover effect */}
                <div className="px-5 py-3 bg-gendarme-gray border-t border-gray-200 group-hover:bg-gendarme-blue/5 transition-all duration-300">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${activite.color}`}>Voir détails</span>
                    <ChevronRight size={14} className={`${activite.color} group-hover:translate-x-1 transition-transform`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DashboardEnqueteur
