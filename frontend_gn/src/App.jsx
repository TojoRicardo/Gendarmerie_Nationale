import { BrowserRouter, Routes } from 'react-router-dom'
import { useMemo } from 'react'

// Context
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ToastProvider } from './context/ToastContext'
import { NavigationProvider, useNavigation } from './context/NavigationContext'

// Components
import ErrorBoundary from './components/ErrorBoundary'
import TokenRefreshManager from './components/TokenRefreshManager'
import InactivityManager from './components/InactivityManager'
import RoleChangeListener from './components/RoleChangeListener'
import LoaderGlobal from '../components/ui/LoaderGlobal'

// Hooks
import { useAuditNavigation } from './hooks/useAuditNavigation'

// Router configuration
import { routesConfig } from './router/routesConfig'
import { generateRoutes } from './router/RouteRenderer'

function AppRoutes() {
  // Générer les routes dans un composant séparé pour s'assurer qu'elles sont créées dans le contexte
  // Ne pas utiliser useMemo ici pour éviter les problèmes de timing avec le contexte
  const routes = generateRoutes(routesConfig)
  
  return <Routes>{routes}</Routes>
}

function AppContent() {
  const { chargement } = useAuth()
  
  return (
    <>
      {chargement && <LoaderGlobal />}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TokenRefreshManager />
        <InactivityManager />
        <RoleChangeListener />
        <AuditNavigationTracker />
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

// Composant pour tracker la navigation (doit être dans BrowserRouter)
function AuditNavigationTracker() {
  useAuditNavigation()
  return null
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationProvider>
          <NotificationProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </NotificationProvider>
        </NavigationProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
