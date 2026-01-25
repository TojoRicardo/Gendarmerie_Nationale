/**
 * Hook pour tracer automatiquement la navigation dans l'application React
 * Envoie les logs de navigation au backend pour l'audit
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { logNavigation } from '../services/auditService'

// Mapping des routes vers les noms d'écran
const ROUTE_TO_SCREEN_NAME = {
  '/': 'Accueil',
  '/dashboard': 'Dashboard',
  '/enquetes': 'Liste des enquêtes',
  '/enquetes/nouvelle': 'Nouvelle enquête',
  '/enquetes/:id': 'Détails enquête',
  '/fiches-criminelles': 'Liste des fiches criminelles',
  '/fiches-criminelles/nouvelle': 'Nouvelle fiche criminelle',
  '/fiches-criminelles/:id': 'Détails fiche criminelle',
  '/rapports': 'Liste des rapports',
  '/rapports/nouveau': 'Nouveau rapport',
  '/rapports/:id': 'Détails rapport',
  '/audit': 'Journal d\'audit',
  '/audit/historique': 'Historique d\'audit',
  '/historique': 'Historique / Journal d\'activité',
  '/utilisateurs': 'Gestion des utilisateurs',
  '/parametres': 'Paramètres',
  '/biometrie': 'Biométrie',
  '/recherche': 'Recherche',
  '/recherche/faciale': 'Recherche faciale',
  '/recherche/dactyloscopique': 'Recherche dactyloscopique',
}

/**
 * Extrait le nom de l'écran depuis la route
 */
function getScreenNameFromRoute(route) {
  // Essayer de trouver une correspondance exacte
  if (ROUTE_TO_SCREEN_NAME[route]) {
    return ROUTE_TO_SCREEN_NAME[route]
  }
  
  // Essayer de trouver une correspondance avec paramètres (ex: /enquetes/123)
  for (const [pattern, screenName] of Object.entries(ROUTE_TO_SCREEN_NAME)) {
    if (pattern.includes(':')) {
      const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(route)) {
        return screenName
      }
    }
  }
  
  // Par défaut, utiliser le nom de la route
  return route.split('/').filter(Boolean).map(
    part => part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
  ).join(' > ') || 'Accueil'
}

/**
 * Hook pour tracer automatiquement la navigation
 */
export function useAuditNavigation() {
  const location = useLocation()
  const previousRouteRef = useRef(null)
  const isInitialMountRef = useRef(true)
  const debounceTimerRef = useRef(null)
  const lastNavigationTimeRef = useRef(null)

  useEffect(() => {
    // Ignorer le premier rendu (montage initial)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      previousRouteRef.current = location.pathname
      return
    }

    // Ignorer si la route n'a pas changé
    if (previousRouteRef.current === location.pathname) {
      return
    }

    // Nettoyer le timer précédent s'il existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const route = location.pathname
    const screenName = getScreenNameFromRoute(route)

    // Debounce : attendre 500ms avant d'envoyer le log
    // Cela évite les logs multiples lors de navigations rapides
    debounceTimerRef.current = setTimeout(() => {
      // Vérifier qu'on ne vient pas d'envoyer un log il y a moins de 3 secondes
      const now = Date.now()
      const timeSinceLastNav = lastNavigationTimeRef.current ? now - lastNavigationTimeRef.current : Infinity
      
      if (timeSinceLastNav > 3000) { // Au moins 3 secondes entre deux logs de navigation
        // Envoyer le log de navigation au backend
        // Ne pas bloquer l'interface en cas d'erreur
        logNavigation(route, screenName).then(() => {
          lastNavigationTimeRef.current = now
        }).catch(() => {
          // Ignorer les erreurs silencieusement
        })
      }

      // Mettre à jour la route précédente
      previousRouteRef.current = route
    }, 500)

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [location.pathname]) // Retirer location.search et location.hash pour éviter les logs multiples
}

export default useAuditNavigation

