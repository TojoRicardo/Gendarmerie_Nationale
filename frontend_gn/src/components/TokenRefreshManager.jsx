/**
 * Composant pour gérer le rafraîchissement automatique du token
 * Ce composant ne rend rien, il utilise juste le hook useTokenRefresh
 */

import { useTokenRefresh } from '../hooks/useTokenRefresh'

const TokenRefreshManager = () => {
  useTokenRefresh()
  return null
}

export default TokenRefreshManager

