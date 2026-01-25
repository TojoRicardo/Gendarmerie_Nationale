/**
 * Hook pour gérer la redirection basée sur le rôle
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleRedirect, getWelcomeMessage } from '../utils/roleRedirection'

/**
 * Hook qui redirige automatiquement l'utilisateur selon son rôle
 * @param {boolean} shouldRedirect - Si la redirection doit être effectuée
 * @returns {object} - Informations de bienvenue
 */
export const useRoleRedirection = (shouldRedirect = true) => {
  const { utilisateur } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (shouldRedirect && utilisateur && utilisateur.role) {
      const roleConfig = getRoleRedirect(utilisateur.role)
      
      // Log pour debug
      console.log(' Redirection selon rôle:', {
        role: utilisateur.role,
        route: roleConfig.route
      })
      
      // Redirection après un court délai pour permettre le chargement des données
      const timer = setTimeout(() => {
        navigate(roleConfig.route, { replace: true })
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [utilisateur, navigate, shouldRedirect])

  // Retourner les informations de bienvenue
  return utilisateur ? getWelcomeMessage(utilisateur) : null
}

export default useRoleRedirection

