import { useState, useCallback, memo, useMemo, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Entete from '../components/commun/Entete'
import BarreLatérale from '../components/commun/BarreLatérale'
import LoaderNavigation from '../components/ui/LoaderNavigation'
import { useAuth } from './context/AuthContext' 
import { getRoleRedirect, shouldRedirectToRoleRoute } from './utils/roleRedirection'

const Layout = memo(() => {
  // Sidebar ouverte par défaut sur desktop, fermée sur mobile
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { utilisateur } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Mémoïser les callbacks pour éviter les re-rendus
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const handleToggleCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  // Mémoïser les props de la sidebar pour éviter les re-renders
  const sidebarProps = useMemo(() => ({
    isOpen: true,
    onClose: handleCloseSidebar,
    isCollapsed: sidebarCollapsed,
  }), [handleCloseSidebar, sidebarCollapsed])

  const sidebarPropsMobile = useMemo(() => ({
    isOpen: sidebarOpen,
    onClose: handleCloseSidebar,
    isCollapsed: sidebarCollapsed,
  }), [sidebarOpen, handleCloseSidebar, sidebarCollapsed])

  useEffect(() => {
    if (!utilisateur?.role) {
      return
    }

    const currentPath = location.pathname || '/'

    if (!shouldRedirectToRoleRoute(utilisateur.role, currentPath)) {
      return
    }

    const roleConfig = getRoleRedirect(utilisateur.role)
    navigate(roleConfig.route, {
      replace: true,
      state: { from: currentPath, reason: 'ROLE_BASED_REDIRECT' },
    })
  }, [location.pathname, utilisateur?.role, navigate])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      {/* Loader de navigation avec l'icône du menu */}
      <LoaderNavigation />
      
      <Entete 
        onToggleSidebar={handleToggleSidebar}
        onToggleCollapsed={handleToggleCollapsed}
        utilisateur={utilisateur}
      />
      
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Sidebar - Fixe à gauche, toujours visible sur desktop */}
        <div className="hidden lg:block lg:relative lg:flex-shrink-0" style={{ height: '100%', minHeight: 0 }}>
          <BarreLatérale {...sidebarProps} />
        </div>
        
        {/* Sidebar mobile */}
        {sidebarOpen && (
          <div className="lg:hidden">
            <BarreLatérale {...sidebarPropsMobile} />
          </div>
        )}
        
        {/* Contenu principal - À droite */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container-standard">
            <div className="p-standard">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
})

Layout.displayName = 'Layout'

export default Layout
