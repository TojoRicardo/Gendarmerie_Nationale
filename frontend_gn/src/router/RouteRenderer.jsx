import React, { Suspense } from 'react'
import { Route, useLocation } from 'react-router-dom'
import RouteProtegee from '../components/authentification/RouteProtegee'
import PermissionGuard from './PermissionGuard'
import LoadingFallback from '../components/LoadingFallback'
import Layout from '../Layout'

/**
 * Wrapper pour les éléments avec Suspense
 * Utilise LoadingFallback qui s'adapte au contexte de la route
 */
const SuspenseWrapper = ({ children }) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  )
}

/**
 * Génère une route à partir de la configuration
 * Gère automatiquement :
 * - La protection de route (authentification)
 * - Les vérifications de permissions
 * - Le lazy loading avec Suspense
 * - Les métadonnées (titre de page)
 */
export const generateRoute = (routeConfig, key) => {
  const {
    path,
    element,
    isProtected = false,
    requiredPermission = null,
    meta = {},
    children = [],
    index = false,
  } = routeConfig

  // Créer un wrapper qui retourne le composant au lieu de le créer immédiatement
  // Cela garantit que le composant sera créé par React Router au moment du rendu
  const RouteWrapper = () => {
    // Wrapper l'élément avec Suspense pour le lazy loading
    let wrappedElement = <SuspenseWrapper>{element}</SuspenseWrapper>

    // Ajouter la vérification de permission si nécessaire
    if (requiredPermission) {
      wrappedElement = (
        <PermissionGuard requiredPermission={requiredPermission}>
          {wrappedElement}
        </PermissionGuard>
      )
    }

    // Ajouter la protection de route si nécessaire
    if (isProtected) {
      wrappedElement = <RouteProtegee>{wrappedElement}</RouteProtegee>
    }

    // Gérer les métadonnées (titre de page)
    if (meta.title) {
      wrappedElement = <PageMeta title={meta.title}>{wrappedElement}</PageMeta>
    }

    return wrappedElement
  }

  // Créer la route - React Router appellera RouteWrapper au moment du rendu
  // quand le contexte sera disponible
  if (index) {
    return <Route key={key} index element={<RouteWrapper />} />
  }

  // Route avec enfants
  if (children.length > 0) {
    return (
      <Route key={key} path={path} element={<RouteWrapper />}>
        {children.map((child, idx) => generateRoute(child, `${key}-${idx}`))}
      </Route>
    )
  }

  // Route simple
  return <Route key={key} path={path} element={<RouteWrapper />} />
}

/**
 * Génère toutes les routes à partir de la configuration
 * Gère le Layout pour les routes protégées
 */
export const generateRoutes = (routesConfig) => {
  return routesConfig.map((routeConfig, index) => {
    // Si c'est une route racine protégée avec enfants, on ajoute le Layout
    if (routeConfig.path === '/' && routeConfig.isProtected && routeConfig.children) {
      function ProtectedLayout() {
        return (
          <RouteProtegee>
            <Layout />
          </RouteProtegee>
        )
      }
      
      return (
        <Route
          key={index}
          path={routeConfig.path}
          element={<ProtectedLayout />}
        >
          {routeConfig.children.map((child, childIndex) =>
            generateRoute(child, `${index}-${childIndex}`)
          )}
        </Route>
      )
    }

    return generateRoute(routeConfig, index)
  })
}

/**
 * Composant pour gérer les métadonnées de page
 * Met à jour le titre du document
 */
function PageMeta({ title, children }) {
  React.useEffect(() => {
    if (title) {
      document.title = title
    }
  }, [title])  

  return children
}

export default generateRoutes

