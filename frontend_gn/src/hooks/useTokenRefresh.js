/**
 * Hook React pour gérer le rafraîchissement automatique du token
 * Vérifie périodiquement si le token doit être rafraîchi
 */

import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { checkAndRefreshToken } from '../services/tokenRefresh'
import ENV from '../config/environment'

/**
 * Hook pour rafraîchir automatiquement le token d'authentification
 */
export const useTokenRefresh = () => {
  const { estConnecte } = useAuth()
  const intervalRef = useRef(null)

  useEffect(() => {
    // Ne démarrer la vérification que si l'utilisateur est connecté
    if (!estConnecte) {
      // Nettoyer l'intervalle si l'utilisateur n'est plus connecté
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    console.log(' Système de rafraîchissement automatique du token démarré')
    console.log(`⏱ Vérification toutes les ${ENV.TOKEN_REFRESH_INTERVAL / 60000} minutes`)

    // Vérifier immédiatement au montage
    checkAndRefreshToken()

    // Configurer la vérification périodique
    intervalRef.current = setInterval(() => {
      checkAndRefreshToken()
    }, ENV.TOKEN_REFRESH_INTERVAL)

    // Nettoyer l'intervalle au démontage
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [estConnecte])
}

export default useTokenRefresh

