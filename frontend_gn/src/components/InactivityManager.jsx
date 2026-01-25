/**
 * Composant de gestion de l'inactivité utilisateur
 * Déconnecte automatiquement après 20 minutes d'inactivité
 */

import React, { useState, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import useInactivityTimeout from '../hooks/useInactivityTimeout'
import InactivityWarningModal from './InactivityWarningModal'
import { useAuth } from '../context/AuthContext'

const InactivityManager = memo(() => {
  const navigate = useNavigate()
  const { deconnexion } = useAuth()
  const [showWarning, setShowWarning] = useState(false)

  /**
   * Appelé 2 minutes avant la déconnexion
   */
  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  /**
   * Appelé lors de la déconnexion automatique
   */
  const handleLogout = useCallback(async () => {
    setShowWarning(false)
    try {
      await deconnexion()
      navigate('/connexion', { 
        state: { 
          message: 'Vous avez été déconnecté(e) pour cause d\'inactivité prolongée (20 minutes).' 
        }
      })
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      navigate('/connexion')
    }
  }, [deconnexion, navigate])

  /**
   * L'utilisateur veut rester connecté
   */
  const handleStayConnected = useCallback(() => {
    setShowWarning(false)
    // Le timer sera automatiquement réinitialisé par cette action (clic)
    console.log(' Utilisateur reste connecté - Timer réinitialisé')
  }, [])

  // Utiliser le hook d'inactivité
  useInactivityTimeout(handleWarning, handleLogout)

  return showWarning ? (
    <InactivityWarningModal
      isOpen={showWarning}
      onStayConnected={handleStayConnected}
      onLogout={handleLogout}
      remainingTime={120} // 2 minutes = 120 secondes
    />
  ) : null
})

InactivityManager.displayName = 'InactivityManager'

export default InactivityManager

