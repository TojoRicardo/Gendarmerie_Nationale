/**
 * Hook React pour gérer la déconnexion automatique après inactivité
 * Déconnecte l'utilisateur après 20 minutes d'inactivité
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import ENV from '../config/environment'

const INACTIVITY_TIMEOUT = ENV.INACTIVITY_TIMEOUT // 20 minutes en millisecondes
const WARNING_TIME = ENV.INACTIVITY_WARNING_TIME // Avertir 2 minutes avant

/**
 * Hook pour détecter l'inactivité et déconnecter automatiquement
 * @param {Function} onWarning - Callback appelé 2 minutes avant la déconnexion
 * @param {Function} onLogout - Callback appelé lors de la déconnexion
 */
export const useInactivityTimeout = (onWarning, onLogout) => {
  const { estConnecte, deconnexion } = useAuth()
  const timeoutRef = useRef(null)
  const warningTimeoutRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  /**
   * Déconnecter l'utilisateur
   */
  const handleLogout = useCallback(async () => {
    console.log(' Déconnexion automatique pour inactivité')
    
    try {
      await deconnexion()
      if (onLogout) {
        onLogout()
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion automatique:', error)
    }
  }, [deconnexion, onLogout])

  /**
   * Afficher l'avertissement
   */
  const handleWarning = useCallback(() => {
    console.log(' Avertissement: Déconnexion dans 2 minutes')
    if (onWarning) {
      onWarning()
    }
  }, [onWarning])

  /**
   * Réinitialiser les timers d'inactivité
   */
  const resetTimer = useCallback(() => {
    // Mettre à jour la dernière activité
    lastActivityRef.current = Date.now()

    // Nettoyer les anciens timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }

    // Ne démarrer les timers que si l'utilisateur est connecté
    if (!estConnecte) {
      return
    }

    // Timer pour l'avertissement (18 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      handleWarning()
    }, INACTIVITY_TIMEOUT - WARNING_TIME)

    // Timer pour la déconnexion (20 minutes)
    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, INACTIVITY_TIMEOUT)
  }, [estConnecte, handleWarning, handleLogout])

  /**
   * Gestionnaire d'activité utilisateur (throttled)
   * Utilise un throttle pour éviter trop d'appels
   */
  const lastCallRef = useRef(0)
  const handleActivity = useCallback(() => {
    if (!estConnecte) return
    
    // Throttle: appeler resetTimer max 1 fois par seconde
    const now = Date.now()
    if (now - lastCallRef.current > 1000) {
      lastCallRef.current = now
      resetTimer()
    }
  }, [estConnecte, resetTimer])

  /**
   * Initialiser les écouteurs d'événements
   */
  useEffect(() => {
    if (!estConnecte) {
      // Si l'utilisateur n'est pas connecté, nettoyer les timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
      return
    }


    // Événements à surveiller pour détecter l'activité
    // Optimisé : moins d'événements, plus ciblés
    const events = [
      'mousedown',
      'keydown',
      'touchstart',
      'wheel',
    ]

    // Ajouter les écouteurs avec option passive pour meilleure performance
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { 
        passive: true, 
        capture: true 
      })
    })

    // Démarrer le timer initial
    resetTimer()

    // Nettoyer au démontage
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, { 
          passive: true, 
          capture: true 
        })
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [estConnecte, handleActivity, resetTimer])

  return {
    resetTimer, // Permet de réinitialiser manuellement le timer
    lastActivity: lastActivityRef.current,
  }
}

export default useInactivityTimeout

