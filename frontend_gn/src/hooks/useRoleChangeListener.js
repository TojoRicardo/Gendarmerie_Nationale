import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import roleChangeService from '../services/roleChangeService'
import { useNotification } from '../context/NotificationContext'

/**
 * Hook personnalisé pour écouter les changements de rôle/permissions
 * et rafraîchir automatiquement les données de l'utilisateur
 * 
 * @param {object} options - Options de configuration
 * @param {number} options.intervalMs - Intervalle de vérification en millisecondes (défaut: 30000 = 30 secondes)
 * @param {boolean} options.enabled - Active/désactive le listener (défaut: true)
 */
const useRoleChangeListener = (options = {}) => {
  const { intervalMs = 30000, enabled = true } = options
  const { rafraichirUtilisateur, utilisateur, estConnecte } = useAuth()
  const notification = useNotification()
  const intervalRef = useRef(null)
  const lastCheckRef = useRef(null)

  const checkForChanges = useCallback(async () => {
    // Ne vérifier que si l'utilisateur est connecté
    if (!estConnecte || !utilisateur) {
      return
    }

    // Ne pas faire de requête si le serveur est marqué comme indisponible
    const serverUnavailable = sessionStorage.getItem('server_unavailable')
    if (serverUnavailable) {
      return // Ne pas faire de requête si le serveur est indisponible
    }

    try {
      // Vérifier s'il y a des changements
      const result = await roleChangeService.checkForRoleChanges()

      if (result.has_changes) {
        console.log('🔄 Changements de rôle/permissions détectés pour l\'utilisateur')

        // Afficher une notification à l'utilisateur
        notification?.showInfo(
          'Vos permissions ont été mises à jour par un administrateur. Actualisation en cours...',
          5000
        )

        // Rafraîchir les données de l'utilisateur
        try {
          await rafraichirUtilisateur()
          
          // Afficher une notification de succès
          notification?.showSuccess(
            'Vos permissions ont été mises à jour avec succès !',
            4000
          )

          // Marquer les changements comme vus
          await roleChangeService.acknowledgeRoleChanges()
          
          console.log('✅ Permissions utilisateur rafraîchies avec succès')
        } catch (refreshError) {
          console.error('❌ Erreur lors du rafraîchissement des permissions:', refreshError)
          
          notification?.showError(
            'Erreur lors de la mise à jour de vos permissions. Veuillez vous reconnecter.',
            6000
          )
        }
      } else {
        // Ne pas logger si tout va bien - éviter le spam dans la console
        // console.log('✓ Aucun changement de rôle/permissions détecté')
      }

      lastCheckRef.current = new Date()
    } catch (error) {
      // Ignorer COMPLÈTEMENT toutes les erreurs réseau, auth et refresh token
      // Ne pas logger pour éviter le spam dans la console
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ERR_CONNECTION_REFUSED' || 
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Failed to fetch') ||
        !error.response
      
      const isAuthError = error.response?.status === 404 || error.response?.status === 401
      const isRefreshTokenError = 
        error.message?.includes('refresh token') || 
        error.message?.includes('Aucun refresh token')
      
      // Si c'est une erreur réseau, auth ou refresh token, ignorer silencieusement
      if (isNetworkError || isAuthError || isRefreshTokenError) {
        return
      }
      
      // Pour toutes les autres erreurs, ignorer aussi silencieusement
      // Ne pas logger pour éviter le spam
    }
  }, [estConnecte, utilisateur, rafraichirUtilisateur, notification])

  useEffect(() => {
    // Ne démarrer le listener que si activé et utilisateur connecté
    if (!enabled || !estConnecte) {
      return
    }


    // Vérification initiale après 5 secondes (pour laisser l'app se charger)
    const initialTimeout = setTimeout(() => {
      checkForChanges()
    }, 5000)

    // Puis vérification périodique
    intervalRef.current = setInterval(() => {
      checkForChanges()
    }, intervalMs)

    // Nettoyage
    return () => {
      console.log('🛑 Arrêt du listener de changements de rôle')
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, estConnecte, intervalMs, checkForChanges])

  // Fournir une méthode pour forcer une vérification manuelle
  const forceCheck = useCallback(() => {
    console.log('🔍 Vérification manuelle des changements de rôle...')
    return checkForChanges()
  }, [checkForChanges])

  return {
    forceCheck,
    lastCheck: lastCheckRef.current
  }
}

export default useRoleChangeListener

