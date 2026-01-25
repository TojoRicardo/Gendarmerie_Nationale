/**
 * Utilitaire pour gérer les erreurs de connexion et afficher des messages clairs
 */

/**
 * Détecte si une erreur est une erreur de connexion réseau
 */
export const isNetworkError = (error) => {
  if (!error) return false

  const message = error.message || ''
  const name = error.name || ''

  return (
    message === 'Failed to fetch' ||
    message.includes('ERR_CONNECTION_REFUSED') ||
    message.includes('ERR_NETWORK') ||
    message.includes('NetworkError') ||
    message.includes('Network request failed') ||
    (name === 'TypeError' && message.includes('fetch')) ||
    (name === 'TypeError' && message.includes('Network')) ||
    error.isNetworkError === true ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNREFUSED'
  )
}

/**
 * Détecte si une erreur est une erreur de timeout
 */
export const isTimeoutError = (error) => {
  if (!error) return false

  const message = error.message || ''
  return (
    message.includes('timeout') ||
    message.includes('Timeout') ||
    message.includes('TIMEOUT') ||
    error.code === 'ETIMEDOUT'
  )
}

/**
 * Génère un message d'erreur utilisateur convivial
 */
export const getErrorMessage = (error, defaultMessage = 'Une erreur est survenue') => {
  if (!error) {
    return {
      title: 'Erreur',
      message: defaultMessage,
      type: 'error',
    }
  }

  // Erreur réseau (serveur non démarré)
  if (isNetworkError(error)) {
    return {
      title: 'Erreur de connexion',
      message: `Impossible de se connecter au serveur backend.\n\n` +
               `Le serveur Django n'est pas accessible. Veuillez :\n\n` +
               `1. Vérifier que le serveur Django est démarré\n` +
               `2. Exécuter dans le dossier backend_gn :\n` +
               `   python manage.py runserver\n\n` +
               `3. Vérifier que le serveur écoute sur http://127.0.0.1:8000\n\n` +
               `Si le problème persiste, contactez le support technique.`,
      type: 'network',
      actionLabel: 'Réessayer',
      showHelp: true,
    }
  }

  // Erreur de timeout
  if (isTimeoutError(error)) {
    return {
      title: 'Timeout de connexion',
      message: `Le serveur a mis trop de temps à répondre.\n\n` +
               `Cela peut être dû à :\n\n` +
               `• Une surcharge du serveur\n` +
               `• Un problème de réseau\n` +
               `• Une requête trop longue\n\n` +
               `Veuillez réessayer dans quelques instants.`,
      type: 'timeout',
      actionLabel: 'Réessayer',
    }
  }

  // Erreur HTTP
  if (error.response) {
    const status = error.response.status
    const data = error.response.data || {}

    if (status === 401) {
      return {
        title: 'Non autorisé',
        message: `Votre session a expiré ou vous n'avez pas les permissions nécessaires.\n\n` +
                 `Veuillez vous reconnecter.`,
        type: 'auth',
        actionLabel: 'Se reconnecter',
      }
    }

    if (status === 403) {
      return {
        title: 'Accès interdit',
        message: `Vous n'avez pas les permissions nécessaires pour effectuer cette action.\n\n` +
                 `Contactez votre administrateur pour obtenir les droits d'accès.`,
        type: 'permission',
      }
    }

    if (status === 404) {
      return {
        title: 'Ressource introuvable',
        message: `La ressource demandée n'existe pas ou a été supprimée.\n\n` +
                 data.detail || `Vérifiez l'URL et réessayez.`,
        type: 'notFound',
        actionLabel: 'Retour',
      }
    }

    if (status >= 500) {
      return {
        title: 'Erreur serveur',
        message: `Une erreur est survenue sur le serveur.\n\n` +
                 (data.detail || data.message || `Erreur ${status}. Contactez le support technique.`),
        type: 'server',
        actionLabel: 'Réessayer',
      }
    }

    return {
      title: 'Erreur',
      message: data.detail || data.message || data.error || defaultMessage,
      type: 'error',
    }
  }

  // Erreur générique
  return {
    title: 'Erreur',
    message: error.message || defaultMessage,
    type: 'error',
  }
}

/**
 * Formate un message d'erreur pour l'affichage dans un toast/notification
 */
export const formatErrorMessage = (error, defaultMessage = 'Une erreur est survenue') => {
  const errorInfo = getErrorMessage(error, defaultMessage)
  return errorInfo.message
}

/**
 * Formate un message d'erreur pour l'affichage dans une alerte
 */
export const formatErrorTitle = (error, defaultTitle = 'Erreur') => {
  const errorInfo = getErrorMessage(error)
  return errorInfo.title || defaultTitle
}

/**
 * Vérifie si une erreur nécessite une action utilisateur
 */
export const requiresUserAction = (error) => {
  const errorInfo = getErrorMessage(error)
  return ['network', 'auth', 'permission'].includes(errorInfo.type)
}

