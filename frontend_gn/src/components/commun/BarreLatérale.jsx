import { useMemo, memo, useCallback, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNavigation } from '../../context/NavigationContext'
import { getFilteredMenuItems, MENU_ITEMS } from '../../constants/menuItems'
import { usePermissions } from '../../hooks/usePermissions'
import { ChevronRight, Loader2 } from 'lucide-react'
import ENV from '../../config/environment'

const BarreLatérale = ({ isOpen, onClose, isCollapsed }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { utilisateur } = useAuth()
  const { permissions } = usePermissions()
  const { loadingItem, setLoadingItem, clearLoadingItem } = useNavigation()
  const [logoError, setLogoError] = useState(false)

  // Clé stable pour les permissions
  const permissionsKey = useMemo(() => {
    if (!permissions || !Array.isArray(permissions)) return ''
    return permissions.slice().sort().join(',')
  }, [permissions])

  const userId = utilisateur?.id

  // Menu items filtrés
  const menuItems = useMemo(() => {
    if (!userId) {
      return []
    }
    
    if (!permissions || permissions.length === 0) {
      if (utilisateur?.role === 'Administrateur Système' || utilisateur?.role === 'Administrateur') {
        return getFilteredMenuItems(['*'])
      }
      return []
    }
    
    const filtered = getFilteredMenuItems(permissions)
    return filtered
    return filtered
  }, [permissionsKey, userId, permissions, utilisateur])

  // Navigation avec indicateur de chargement
  const handleNavigation = useCallback((item) => {
    // Afficher le loader avec l'icône de l'élément cliqué
    setLoadingItem(item)
    
    // Navigation
    navigate(item.path)
    
    // Fermer la sidebar sur mobile
    if (window.innerWidth < 1024) {
      onClose?.()
    }
  }, [navigate, onClose, setLoadingItem])

  // Nettoyer le loader quand la navigation est terminée
  useEffect(() => {
    if (!loadingItem) return
    
    // Vérifier si la route actuelle correspond au chemin du menu chargé
    const targetPath = loadingItem.path
    const isRouteMatched = location.pathname === targetPath || location.pathname.startsWith(targetPath + '/')
    
    if (isRouteMatched) {
      // Attendre que la route soit complètement chargée et que le composant soit monté
      // Utiliser un délai raisonnable pour le lazy loading et le rendu initial
      const timer = setTimeout(() => {
        clearLoadingItem()
      }, 1000) // 1 seconde pour laisser le temps au composant lazy-loaded de se monter

      return () => clearTimeout(timer)
    } else {
      // Si la route ne correspond pas (navigation annulée ou erreur), nettoyer immédiatement
      clearLoadingItem()
    }
  }, [location.pathname, loadingItem, clearLoadingItem])

  // Vérifier si un chemin est actif
  const currentPath = useMemo(() => location.pathname, [location.pathname])
  const isActive = useCallback((path) => {
    return currentPath === path || currentPath.startsWith(path + '/')
  }, [currentPath])

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar avec thème sombre */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
          border-r border-slate-700/50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-16' : 'w-64'}
          lg:translate-x-0 lg:relative lg:z-auto
          flex flex-col
          h-screen lg:h-full
          shadow-2xl lg:shadow-none
          transition-all duration-300 ease-out
        `}
        style={{
          width: isCollapsed ? '64px' : '256px',
        }}
      >
        {/* Header avec emblème de la Gendarmerie */}
        {!isCollapsed && (
          <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {!logoError ? (
                  <img 
                    src="/logo-gendarmerie.svg" 
                    alt="Emblème Gendarmerie Nationale"
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">SG</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-white truncate">SGIC</h2>
                <p className="text-xs text-slate-400 truncate">Gendarmerie</p>
              </div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="p-4 border-b border-slate-700/50 flex-shrink-0 flex justify-center">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              {!logoError ? (
                <img 
                  src="/logo-gendarmerie.svg" 
                  alt="Emblème Gendarmerie"
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">SG</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu Items - Zone scrollable avec thème sombre */}
        <nav 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          style={{
            padding: '12px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
          }}
        >
          {userId && (!permissions || permissions.length === 0) ? (
            // Indicateur de chargement des permissions
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="inline-block w-6 h-6 animate-spin mb-2 text-white/60" />
                {!isCollapsed && (
                  <p className="text-xs text-white/60">Chargement des permissions...</p>
                )}
              </div>
            </div>
          ) : menuItems.length === 0 ? (
            // Aucun élément de menu disponible
            !isCollapsed && (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-white/60 text-center">
                  Aucun menu disponible
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-1" style={{ paddingBottom: '12px' }}>
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                // Vérifier si cet item est en cours de chargement
                const isLoading = loadingItem && (loadingItem.id === item.id || loadingItem.path === item.path)
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    disabled={isLoading}
                    className={`
                      group relative
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      transition-all duration-300 ease-out
                      ${active
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'text-white/90 hover:text-white hover:bg-slate-700/50'
                      }
                      ${isCollapsed ? 'justify-center px-2' : ''}
                      ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
                      overflow-hidden
                    `}
                    title={isCollapsed ? item.label : ''}
                  >
                    {/* Effet de brillance au survol */}
                    {!active && !isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out" />
                    )}
                    
                    {/* Indicateur de chargement avec animations professionnelles */}
                    {isLoading && (
                      <>
                        {/* Barre de progression animée en bas */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/80 to-transparent animate-loading-bar" />
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400 opacity-60 animate-loading-bar" style={{ animationDelay: '0.3s' }} />
                        </div>
                        
                        {/* Overlay de chargement avec pulse subtil */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-400/15 to-blue-500/10 animate-pulse-slow" />
                        
                        {/* Effet de brillance animé */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                      </>
                    )}

                    {/* Conteneur d'icône avec transition fluide professionnelle */}
                    <div className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {/* Icône normale avec transition 3D */}
                      <Icon 
                        className={`
                          absolute w-5 h-5 transition-all duration-300 ease-out
                          ${isLoading 
                            ? 'opacity-0 scale-75 rotate-90 translate-y-1' 
                            : 'opacity-100 scale-100 rotate-0 translate-y-0'
                          }
                          ${active ? 'text-white drop-shadow-md' : 'text-white/70'}
                          ${!isLoading && 'group-hover:text-white group-hover:scale-110 group-hover:rotate-3'}
                          transform-gpu
                        `} 
                        style={{
                          transformStyle: 'preserve-3d',
                          backfaceVisibility: 'hidden',
                        }}
                      />
                      
                      {/* Spinner de chargement avec transition fluide */}
                      <Loader2 
                        className={`
                          absolute w-5 h-5 transition-all duration-300 ease-out
                          ${isLoading 
                            ? 'opacity-100 scale-100 rotate-0 translate-y-0 animate-spin' 
                            : 'opacity-0 scale-75 -rotate-90 translate-y-1'
                          }
                          ${active ? 'text-white drop-shadow-md' : 'text-white/80'}
                          transform-gpu
                        `} 
                        strokeWidth={2.5}
                        style={{
                          transformStyle: 'preserve-3d',
                          backfaceVisibility: 'hidden',
                        }}
                      />
                      
                      {/* Point indicateur de chargement avec pulse élégant */}
                      {isLoading && (
                        <>
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75" />
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-300 rounded-full opacity-100" />
                        </>
                      )}
                      
                      {/* Cercle de progression subtil */}
                      {isLoading && (
                        <div className="absolute inset-0 border-2 border-blue-400/30 rounded-full animate-spin" style={{ 
                          borderTopColor: 'transparent',
                          borderRightColor: 'transparent',
                          animation: 'spin 1s linear infinite'
                        }} />
                      )}
                    </div>
                    
                    {!isCollapsed && (
                      <>
                        <span className={`
                          text-sm font-medium truncate flex-1 transition-all duration-300
                          ${active ? 'text-white font-semibold' : 'text-white/90'}
                          ${isLoading ? 'animate-pulse' : ''}
                        `}>
                          {item.label}
                        </span>
                        
                        {/* Chevron ou indicateur de chargement */}
                        <div className="relative w-4 h-4 flex-shrink-0 flex items-center justify-center">
                          {isLoading ? (
                            <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" />
                          ) : active ? (
                            <ChevronRight className="w-4 h-4 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5" />
                          ) : null}
                        </div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </nav>

        {/* Footer système uniquement - Style comme dans l'image */}
        <div 
          className={`
            flex-shrink-0 border-t border-slate-700/50
            ${isCollapsed ? 'px-2 py-2' : 'px-4 py-3'} 
            bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
          `}
          style={{ 
            minHeight: isCollapsed ? '48px' : 'auto',
          }}
        >
          {isCollapsed ? (
            <div className="flex justify-center items-center h-full">
              <div 
                className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50" 
                title="Système Opérationnel"
                style={{
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                }}
              />
            </div>
          ) : (
            <div className="text-center space-y-2.5">
              {/* Badge status avec point vert animé */}
              <div className="flex justify-center">
                <span className="inline-flex items-center px-3 py-1.5 bg-green-500/20 text-green-300 text-xs font-semibold rounded-lg border border-green-500/40 shadow-md">
                  <span 
                    className="w-2 h-2 bg-green-500 rounded-full mr-2 shadow-sm shadow-green-500/50"
                    style={{
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      boxShadow: '0 0 6px rgba(34, 197, 94, 0.8)'
                    }}
                  />
                  Système Opérationnel
                </span>
              </div>
              
              {/* Version et Copyright */}
              <div className="space-y-1">
                <p className="text-xs text-gray-300 font-medium">Version {ENV.APP_VERSION}</p>
                <p className="text-xs text-gray-400">© 2025 Gendarmerie Nationale</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Styles pour la scrollbar dans le thème sombre */}
      <style>{`
        aside nav::-webkit-scrollbar {
          width: 6px;
        }
        aside nav::-webkit-scrollbar-track {
          background: transparent;
        }
        aside nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        aside nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        /* Animation de barre de chargement professionnelle */
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
        
        /* Animation de pulse subtile */
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.15;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        /* Animation de brillance (shimmer) */
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}

BarreLatérale.displayName = 'BarreLatérale'

export default memo(BarreLatérale)
