import { Loader2, Lock, FileText, Users, Fingerprint, Brain, BarChart3 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useNavigation } from '../context/NavigationContext'
import { MENU_ITEMS } from '../constants/menuItems'

/**
 * Composant de chargement sophistiqué pour Suspense
 * S'adapte au contexte de la route pour afficher des messages pertinents
 * Utilise les informations du menu si disponibles via NavigationContext
 */
const LoadingFallback = ({ message = 'Chargement en cours...' }) => {
  const location = useLocation()
  const { loadingItem } = useNavigation()

  // Si on a un loadingItem depuis le menu, l'utiliser en priorité
  const getLoadingContext = () => {
    // Priorité 1: Utiliser les informations du menu si disponibles
    if (loadingItem) {
      return {
        icon: loadingItem.icon || Loader2,
        title: `Chargement de ${loadingItem.label || 'la page'}`,
        description: loadingItem.description || 'Chargement en cours...'
      }
    }

    // Priorité 2: Chercher dans MENU_ITEMS selon le chemin
    const path = location.pathname
    const menuItem = MENU_ITEMS.find(item => 
      path === item.path || path.startsWith(item.path + '/')
    )
    
    if (menuItem) {
      return {
        icon: menuItem.icon || Loader2,
        title: `Chargement de ${menuItem.label}`,
        description: menuItem.description || 'Chargement en cours...'
      }
    }

    // Priorité 3: Détection basée sur le chemin (méthode précédente)

    if (path.includes('dashboard') || path === '/') {
      return {
        icon: BarChart3,
        title: 'Chargement du tableau de bord',
        description: 'Récupération des données analytiques...'
      }
    }

    if (path.includes('fiches-criminelles')) {
      return {
        icon: FileText,
        title: 'Chargement des fiches criminelles',
        description: 'Récupération des données sécurisées...'
      }
    }

    if (path.includes('utilisateurs')) {
      return {
        icon: Users,
        title: 'Chargement des utilisateurs',
        description: 'Préparation de l\'interface...'
      }
    }

    if (path.includes('roles') || path.includes('gestion-roles')) {
      return {
        icon: Lock,
        title: 'Chargement des rôles',
        description: 'Vérification des permissions...'
      }
    }

    if (path.includes('biometrie')) {
      return {
        icon: Fingerprint,
        title: 'Chargement du module biométrique',
        description: 'Initialisation des outils d\'analyse...'
      }
    }

    if (path.includes('ia') || path.includes('intelligence')) {
      return {
        icon: Brain,
        title: 'Chargement de l\'IA',
        description: 'Préparation des modèles d\'analyse...'
      }
    }

    if (path.includes('rapports')) {
      return {
        icon: BarChart3,
        title: 'Chargement des rapports',
        description: 'Compilation des données...'
      }
    }

    if (path.includes('audit') || path.includes('historique')) {
      return {
        icon: BarChart3,
        title: 'Chargement du journal d\'audit',
        description: 'Analyse des activités système...'
      }
    }

    if (path.includes('enquete') || path.includes('case') || path.includes('assignations')) {
      return {
        icon: FileText,
        title: 'Chargement des enquêtes',
        description: 'Récupération des dossiers...'
      }
    }

    if (path.includes('upr')) {
      return {
        icon: Fingerprint,
        title: 'Chargement du registre UPR',
        description: 'Initialisation du module de reconnaissance...'
      }
    }

    if (path.includes('profil')) {
      return {
        icon: Users,
        title: 'Chargement du profil',
        description: 'Récupération des informations utilisateur...'
      }
    }

    if (path.includes('notifications')) {
      return {
        icon: BarChart3,
        title: 'Chargement des notifications',
        description: 'Récupération des alertes...'
      }
    }

    // Par défaut
    return {
      icon: Loader2,
      title: 'Chargement',
      description: message
    }
  }

  const context = getLoadingContext()
  const Icon = context.icon

  // Couleurs du gradient selon le menu en cours de chargement
  const getGradientColors = () => {
    if (loadingItem?.id) {
      const menuColorMap = {
        'dashboard': 'from-blue-600 to-blue-400',
        'assignations': 'from-indigo-500 to-indigo-600',
        'enquete': 'from-emerald-500 to-emerald-600',
        'fiches': 'from-blue-500 to-blue-600',
        'biometrie': 'from-purple-500 to-purple-600',
        'upr': 'from-purple-500 to-purple-600',
        'rapports': 'from-yellow-500 to-yellow-400',
        'ia': 'from-blue-400 to-purple-500',
        'utilisateurs': 'from-blue-600 to-blue-800',
        'roles': 'from-yellow-500 to-yellow-700',
        'audit': 'from-gray-700 to-gray-600',
      };
      return menuColorMap[loadingItem.id] || 'from-blue-600 to-blue-800';
    }
    return 'from-blue-600 to-blue-800';
  };

  const gradientClass = getGradientColors();
  
  // Extraire la couleur principale du gradient pour les points
  const getDotColor = () => {
    if (loadingItem?.id) {
      const dotColorMap = {
        'dashboard': 'bg-blue-600',
        'assignations': 'bg-indigo-500',
        'enquete': 'bg-emerald-500',
        'fiches': 'bg-blue-500',
        'biometrie': 'bg-purple-500',
        'upr': 'bg-purple-500',
        'rapports': 'bg-yellow-500',
        'ia': 'bg-purple-500',
        'utilisateurs': 'bg-blue-600',
        'roles': 'bg-yellow-500',
        'audit': 'bg-gray-700',
      };
      return dotColorMap[loadingItem.id] || 'bg-blue-600';
    }
    return 'bg-blue-600';
  };

  const dotColorClass = getDotColor();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-6 animate-fadeIn max-w-md px-4">
        {/* Icône animée avec gradient */}
        <div className="relative">
          {/* Cercle de fond avec animation pulse */}
          <div className={`absolute inset-0 bg-gradient-to-r ${gradientClass} opacity-20 rounded-full animate-ping`} />
          
          {/* Cercle principal avec gradient */}
          <div className={`relative bg-gradient-to-r ${gradientClass} rounded-full p-6 shadow-2xl`}>
            <Icon className="w-12 h-12 text-white animate-spin" strokeWidth={2} />
          </div>
        </div>

        {/* Texte de chargement */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-gray-900">{context.title}</h3>
          <p className="text-sm text-gray-500">{context.description}</p>
        </div>

        {/* Barre de progression animée */}
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-300 ease-out`}
            style={{
              width: '75%',
              animation: 'progress-shimmer 1.5s ease-in-out infinite'
            }}
          />
        </div>

        {/* Points animés */}
        <div className="flex justify-center space-x-2">
          <div className={`w-2.5 h-2.5 ${dotColorClass} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
          <div className={`w-2.5 h-2.5 ${dotColorClass} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
          <div className={`w-2.5 h-2.5 ${dotColorClass} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      <style>{`
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Variante compacte pour les petits composants
 */
export const LoadingFallbackCompact = ({ message = 'Chargement...' }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-6 h-6 text-gendarme-blue animate-spin" />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    </div>
  )
}

/**
 * Variante plein écran pour les pages principales
 */
export const LoadingFallbackFullScreen = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center z-50">
      <LoadingFallback message={message} />
    </div>
  )
}

/**
 * Variante avec skeleton pour les listes
 */
export const SkeletonLoader = ({ rows = 5 }) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      {Array.from({ length: rows }).map((_, index) => (
        <div 
          key={index} 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="animate-pulse space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-4">
              <div className="rounded-full bg-gray-200 h-12 w-12" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default LoadingFallback

