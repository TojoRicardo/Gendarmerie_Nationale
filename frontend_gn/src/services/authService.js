/**
 * Service d'authentification
 * Gère toutes les opérations liées à l'authentification et aux utilisateurs
 */

import { get, post, put, patch, del } from './apiGlobal'
import { writeCache, readCache, isNetworkError } from '../utils/apiFallback'
import {
  saveAuthToken,
  saveUserData,
  clearAuthData,
  saveRefreshToken,
  getUserData,
} from '../utils/sessionStorage'

const CURRENT_USER_CACHE_KEY = 'auth:current_user'
const USERS_CACHE_KEY = 'auth:users'

/**
 * Connexion utilisateur
 * @param {object} credentials - {username, password}
 * @returns {Promise<object>} Données de l'utilisateur connecté
 */
export const login = async (credentials) => {
  try {
    const response = await post('/utilisateur/login/', credentials)
    console.log('Réponse du backend:', response.data)
    
    const loginData = response.data || response

    // Vérifier si le PIN est requis
    if (loginData.pin_required) {
      return {
        pin_required: true,
        temp_token: loginData.temp_token
      }
    }
    
    const { token, refresh, user, access } = loginData

    // Sauvegarder le token et les données utilisateur
    // Supporter les deux formats : { token, user } et { access, refresh, user }
    const authToken = access || token
    const refreshToken = refresh
    
    console.log('Token extrait:', authToken)
    console.log('User:', user)
    
    if (!authToken) {
      console.error('ERREUR: Aucun token reçu du backend!')
      throw new Error('Aucun token reçu du backend')
    }
    
    saveAuthToken(authToken)
    console.log('Token sauvegardé dans localStorage')
    
    // Vérifier immédiatement que le token est bien sauvegardé
    const savedToken = localStorage.getItem('auth_token')
    console.log('Vérification token sauvegardé:', savedToken ? 'OK' : 'ÉCHEC')
    
    saveUserData(user)
    console.log('User data sauvegardé')
    
    // Sauvegarder le refresh token s'il existe
    if (refreshToken) {
      saveRefreshToken(refreshToken)
      console.log('Refresh token sauvegardé')
    }

    // Marquer que l'utilisateur vient de se connecter (pour afficher la bannière de bienvenue)
    sessionStorage.setItem('justLoggedIn', 'true')

    return { success: true, token: authToken, user, data: loginData }
  } catch (error) {
    // Ne pas logger les erreurs réseau - elles seront gérées plus bas
    const isNetworkError = 
      error.code === 'ERR_NETWORK' || 
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('Network Error') ||
      !error.response
    
    if (!isNetworkError) {
      console.error('Erreur de connexion:', error)
    }
    
    // Extraire le message d'erreur précis depuis la réponse
    let errorMessage = 'Erreur de connexion'
    const responseData = error.response?.data
    
    if (responseData) {
      // Priorité 1: Erreurs non-field (comme compte suspendu, compte désactivé)
      // Ces erreurs ont toujours la priorité absolue car elles concernent l'état du compte
      if (responseData.non_field_errors) {
        const nonFieldMsg = Array.isArray(responseData.non_field_errors) 
          ? responseData.non_field_errors[0] 
          : responseData.non_field_errors
        
        // Extraire le message si c'est un objet ErrorDetail
        if (typeof nonFieldMsg === 'object' && nonFieldMsg.toString) {
          errorMessage = nonFieldMsg.toString()
        } else if (typeof nonFieldMsg === 'string') {
          errorMessage = nonFieldMsg
        } else {
          errorMessage = String(nonFieldMsg)
        }
        
        // Message extrait et prêt à être utilisé
      }
      // Priorité 2: Erreur sur le champ email
      else if (responseData.email) {
        errorMessage = Array.isArray(responseData.email) 
          ? responseData.email[0] 
          : responseData.email
      }
      // Priorité 3: Erreur sur le champ username
      else if (responseData.username) {
        errorMessage = Array.isArray(responseData.username) 
          ? responseData.username[0] 
          : responseData.username
      }
      // Priorité 4: Erreur sur le champ password (uniquement si pas d'erreur non-field)
      else if (responseData.password) {
        errorMessage = Array.isArray(responseData.password) 
          ? responseData.password[0] 
          : responseData.password
      } 
      // Priorité 5: Message détaillé
      else if (responseData.detail) {
        errorMessage = responseData.detail
      } 
      // Priorité 6: Message générique
      else if (responseData.message) {
        errorMessage = responseData.message
      }
      // Priorité 7: Formatage manuel si plusieurs erreurs
      else {
        // Extraire tous les messages d'erreur disponibles
        const errorMessages = []
        if (responseData.email) {
          const emailMsg = Array.isArray(responseData.email) ? responseData.email[0] : responseData.email
          errorMessages.push(emailMsg)
        }
        if (responseData.username) {
          const usernameMsg = Array.isArray(responseData.username) ? responseData.username[0] : responseData.username
          errorMessages.push(usernameMsg)
        }
        if (responseData.password) {
          const passwordMsg = Array.isArray(responseData.password) ? responseData.password[0] : responseData.password
          errorMessages.push(passwordMsg)
        }
        if (errorMessages.length > 0) {
          errorMessage = errorMessages.join('. ')
        }
      }
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('Network Error')) {
      // Erreur de connexion réseau - serveur non disponible
      // Utiliser le gestionnaire d'erreurs centralisé
      const errorInfo = getErrorMessage(error)
      errorMessage = errorInfo.message
    } else if (error.message) {
      // Si pas de réponse serveur mais un message d'erreur Axios
      errorMessage = error.message
    } else if (!error.response) {
      // Pas de connexion au serveur
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le serveur Django est démarré (port 3000 ou 8080)'
    }
    
    // Utiliser la variable isNetworkError déjà définie plus haut (ligne 69)
    // Ne logger que si ce n'est pas une erreur réseau (pour éviter le spam)
    if (!isNetworkError) {
      // Logger uniquement les erreurs non-réseau pour le débogage
      console.debug('Erreur de connexion (non-réseau):', {
        message: errorMessage,
        hasResponse: !!error.response,
        status: error.response?.status
      })
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data,
    }
  }
}

/**
 * Inscription d'un nouvel utilisateur
 * @param {object} userData - Données du nouvel utilisateur
 * @returns {Promise<object>} Utilisateur créé
 */
export const register = async (userData) => {
  try {
    const response = await post('/utilisateur/register/', userData)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Erreur d\'inscription:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur d\'inscription',
      errors: error.response?.data,
    }
  }
}

/**
 * Déconnexion utilisateur
 * Appelle le backend pour marquer l'utilisateur comme inactif et nettoie les données locales
 */
export const logout = async () => {
  try {
    // Récupérer le refresh token
    const refreshToken = localStorage.getItem('refresh_token')
    
    // Appeler l'API de déconnexion pour marquer l'utilisateur comme inactif
    // Ignorer silencieusement les erreurs 401 (utilisateur déjà déconnecté) et 404 (endpoint non disponible)
    try {
      if (refreshToken) {
        await post('/utilisateur/logout/', { refresh_token: refreshToken })
      }
    } catch (apiError) {
      // Ne pas logger les erreurs 401 (non autorisé) ou 404 (endpoint non trouvé) lors de la déconnexion
      // Ces erreurs sont normales si l'utilisateur est déjà déconnecté ou si l'endpoint n'existe pas
      if (apiError.response?.status !== 401 && apiError.response?.status !== 404) {
        console.warn('Erreur API lors de la déconnexion (non bloquant):', apiError)
      }
    }
    
    // Nettoyer les données locales
    clearAuthData()
  } catch (error) {
    // Ne pas logger les erreurs liées à l'absence de refresh token lors de la déconnexion
    if (!error.message?.includes('refresh token') && !error.message?.includes('Aucun refresh token')) {
      console.error('Erreur de déconnexion:', error)
    }
    // Même en cas d'erreur, nettoyer les données locales
    clearAuthData()
  }
}

/**
 * Récupérer les informations de l'utilisateur courant
 * @returns {Promise<object>} Données de l'utilisateur
 */
export const getCurrentUser = async () => {
  try {
    const response = await get('/utilisateur/me/')
    
    // Sauvegarder les données à jour dans localStorage
    if (response.data) {
      saveUserData(response.data)
      writeCache(CURRENT_USER_CACHE_KEY, response.data)
    }
    
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      const cachedUser = getUserData() || readCache(CURRENT_USER_CACHE_KEY, null, 0)
      if (cachedUser) {
        // Ne pas logger les erreurs réseau - c'est normal si le serveur n'est pas démarré
        // console.debug('getCurrentUser: serveur indisponible, utilisation des données locales.')
        return cachedUser
      }
    }
    // Ne logger que les erreurs non-réseau
    if (!isNetworkError(error)) {
      console.error('Erreur récupération utilisateur:', error)
    }
    throw error
  }
}

/**
 * Changer le mot de passe
 * @param {object} passwords - {old_password, new_password, confirm_password}
 * @returns {Promise<object>} Résultat
 */
export const changePassword = async (passwords) => {
  try {
    const response = await post('/utilisateur/change-password/', passwords)
    return { success: true, message: response.data.message }
  } catch (error) {
    console.error('Erreur changement de mot de passe:', error)
    
    // Extraire les messages d'erreur spécifiques
    const responseData = error.response?.data
    let errorMessage = 'Erreur lors du changement de mot de passe'
    let fieldErrors = {}
    
    if (responseData) {
      // Gérer les erreurs de champs individuels
      if (responseData.old_password) {
        fieldErrors.old_password = Array.isArray(responseData.old_password) 
          ? responseData.old_password[0] 
          : responseData.old_password
      }
      if (responseData.new_password) {
        fieldErrors.new_password = Array.isArray(responseData.new_password) 
          ? responseData.new_password[0] 
          : responseData.new_password
      }
      if (responseData.confirm_password) {
        fieldErrors.confirm_password = Array.isArray(responseData.confirm_password) 
          ? responseData.confirm_password[0] 
          : responseData.confirm_password
      }
      
      // Message général si présent
      if (responseData.message) {
        errorMessage = responseData.message
      } else if (responseData.detail) {
        errorMessage = responseData.detail
      } else if (Object.keys(fieldErrors).length > 0) {
        // Prendre le premier message d'erreur de champ
        errorMessage = Object.values(fieldErrors)[0]
      }
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: fieldErrors,
      fullErrors: responseData,
    }
  }
}

/**
 * Mettre à jour le profil utilisateur
 * @param {object} userData - Nouvelles données
 * @returns {Promise<object>} Utilisateur mis à jour
 */
export const updateProfile = async (userData) => {
  try {
    const response = await put('/utilisateur/profile/', userData)
    // Mettre à jour les données stockées
    saveUserData(response.data)
    return { success: true, user: response.data }
  } catch (error) {
    console.error('Erreur mise à jour profil:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur de mise à jour',
      errors: error.response?.data,
    }
  }
}

// ============ Gestion des utilisateurs (Admin) ============

/**
 * Récupérer la liste de tous les utilisateurs
 * @param {object} params - Paramètres de filtrage/pagination
 * @returns {Promise<Array>} Liste des utilisateurs
 */
export const getUsers = async (params = {}) => {
  try {
    const response = await get('/utilisateur/utilisateurs/', { params })
    let normalized = response.data
    
    // Si la réponse est un objet paginé, retourner results
    // Sinon retourner data directement (si c'est un tableau)
    if (response.data && typeof response.data === 'object') {
      // Format paginé: {count, next, previous, results}
      if (Array.isArray(response.data.results)) {
        normalized = response.data.results
      }
      // Format avec count et users: {count, users}
      if (Array.isArray(response.data.users)) {
        normalized = response.data.users
      }
      // Si c'est déjà un tableau
      if (Array.isArray(response.data)) {
        normalized = response.data
      }
    }
    
    // Fallback
    const finalResult = Array.isArray(normalized) ? normalized : []
    writeCache(USERS_CACHE_KEY, finalResult)
    return finalResult
  } catch (error) {
    if (isNetworkError(error)) {
      const cachedUsers = readCache(USERS_CACHE_KEY, [])
      if (cachedUsers.length) {
        // Message silencieux - seulement en mode développement
        if (process.env.NODE_ENV === 'development') {
          console.debug('getUsers: serveur indisponible, utilisation du cache local.')
        }
        return cachedUsers
      }
      return []
    }
    console.error('Erreur récupération utilisateurs:', error)
    throw error
  }
}

/**
 * Récupérer un utilisateur par son ID
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<object>} Données de l'utilisateur
 */
export const getUserById = async (userId) => {
  try {
    const response = await get(`/utilisateur/utilisateurs/${userId}/`)
    return response.data
  } catch (error) {
    // Si aucune réponse du serveur, utiliser les données locales comme secours
    if (!error?.response) {
      const cachedUser = getUserData()
      if (cachedUser) {
        // Message silencieux - seulement en mode développement avec debug activé
        if (process.env.NODE_ENV === 'development') {
          console.debug('getUserById: serveur indisponible, utilisation des données utilisateur en cache.')
        }
        return cachedUser
      }
    }

    // Seulement logger les erreurs réelles (pas les erreurs réseau)
    if (error?.response) {
      console.error('Erreur récupération utilisateur:', error)
    }
    throw error
  }
}

/**
 * Créer un nouvel utilisateur (Admin)
 * @param {object} userData - Données du nouvel utilisateur
 * @returns {Promise<object>} Utilisateur créé
 */
export const createUser = async (userData) => {
  try {
    const response = await post('/utilisateur/utilisateurs/', userData)
    return { success: true, user: response.data }
  } catch (error) {
    console.error('Erreur création utilisateur:', error)
    console.error('Détails erreur:', error.response?.data)
    // Throw l'erreur originale pour que le composant puisse accéder à error.response.data
    throw error
  }
}

/**
 * Mettre à jour un utilisateur (Admin)
 * @param {number} userId - ID de l'utilisateur
 * @param {object} userData - Nouvelles données (mise à jour partielle)
 * @returns {Promise<object>} Utilisateur mis à jour
 */
export const updateUser = async (userId, userData) => {
  try {
    // Utiliser PATCH pour une mise à jour partielle (ne nécessite pas tous les champs)
    const response = await patch(`/utilisateur/utilisateurs/${userId}/`, userData)
    return { success: true, user: response.data }
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error)
    console.error('Détails erreur:', error.response?.data)
    // Throw l'erreur originale pour que le composant puisse accéder à error.response.data
    throw error
  }
}

/**
 * Suspendre un utilisateur (Admin)
 * Suspension au lieu de suppression - les données restent dans la base
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<object>} Résultat
 */
export const suspendUser = async (userId) => {
  try {
    const response = await post(`/utilisateur/utilisateurs/${userId}/suspend/`)
    
    // Gérer le cas où l'utilisateur est suspendu
    if (response.data?.user_suspended) {
      return { 
        success: true, 
        message: response.data.message || 'L\'utilisateur a été suspendu. Son compte est désactivé mais toutes les données sont conservées.',
        user_suspended: true,
        data: response.data 
      }
    }
    
    return { success: true, message: response.data.message || 'Utilisateur suspendu avec succès', data: response.data }
  } catch (error) {
    console.error('Erreur suspension utilisateur:', error)
    
    // Gérer spécifiquement les erreurs 401 (non autorisé)
    if (error.response?.status === 401) {
      throw {
        success: false,
        message: 'Vous n\'êtes pas autorisé à suspendre cet utilisateur. Veuillez vous reconnecter.',
        status: 401,
      }
    }
    
    // Gérer les erreurs 400 (requête incorrecte)
    if (error.response?.status === 400) {
      const errorData = error.response.data
      let errorMessage = 'Impossible de suspendre cet utilisateur'
      
      if (errorData?.error) {
        errorMessage = errorData.error
      } else if (errorData?.message) {
        errorMessage = errorData.message
      }
      
      throw {
        success: false,
        message: errorMessage,
        errors: errorData,
        status: 400,
      }
    }
    
    // Extraire le message d'erreur depuis la réponse
    let errorMessage = 'Erreur lors de la suspension de l\'utilisateur'
    if (error.response?.data) {
      if (error.response.data.error) {
        errorMessage = error.response.data.error
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data
      }
    } else if (!error.response) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.'
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data,
      status: error.response?.status || 500,
    }
  }
}

/**
 * Supprimer définitivement un utilisateur (Admin)
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<object>} Résultat
 */
export const deleteUser = async (userId) => {
  try {
    const response = await del(`/utilisateur/utilisateurs/${userId}/`)
    return {
      success: true,
      message: response.data?.message || 'Utilisateur supprimé avec succès.',
      user_deleted: true,
      data: response.data,
    }
  } catch (error) {
    const status = error.response?.status || 500
    const backendData = error.response?.data
    const backendMessage =
      backendData?.error ||
      backendData?.message ||
      backendData?.detail ||
      (typeof backendData === 'string' ? backendData : null)

    if (status === 401) {
      throw {
        success: false,
        message:
          backendMessage ||
          'Vous n\'êtes pas autorisé à supprimer définitivement cet utilisateur. Veuillez vous reconnecter.',
        status,
        errors: backendData,
      }
    }

    if (status === 403) {
      throw {
        success: false,
        message:
          backendMessage ||
          'Vous n\'avez pas les droits pour supprimer cet utilisateur. Seul un administrateur peut effectuer cette action.',
        status,
        errors: backendData,
      }
    }

    if (status === 400) {
      // Extraire le message du backend de manière exhaustive
      let finalMessage = backendMessage
      
      // Si backendMessage est null/undefined, essayer d'extraire directement depuis backendData
      if (!finalMessage && backendData) {
        if (typeof backendData === 'string') {
          finalMessage = backendData
        } else if (backendData.error) {
          finalMessage = backendData.error
        } else if (backendData.message) {
          finalMessage = backendData.message
        } else if (backendData.detail) {
          finalMessage = backendData.detail
        }
      }
      
      // Message par défaut si rien n'est trouvé
      if (!finalMessage) {
        finalMessage = 'Impossible de supprimer définitivement cet utilisateur'
      }
      
      // Propager l'erreur avec le message du backend et conserver response pour compatibilité
      throw {
        success: false,
        message: finalMessage,
        status,
        errors: backendData,
        response: error.response, // Conserver response pour compatibilité avec extractErrorMessage
      }
    }

    throw {
      success: false,
      message:
        backendMessage ||
        (error.response
          ? 'Erreur lors de la suppression définitive de l\'utilisateur'
          : 'Impossible de se connecter au serveur. Vérifiez votre connexion.'),
      status,
      errors: backendData,
    }
  }
}

/**
 * Restaurer un utilisateur suspendu (Admin uniquement)
 * Annule la suspension et réactive le compte
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<object>} Résultat
 */
export const restoreUser = async (userId) => {
  try {
    const response = await post(`/utilisateur/utilisateurs/${userId}/restaurer/`)
    
    return { 
      success: true, 
      message: response.data.message || 'Utilisateur restauré avec succès',
      user_restored: true,
      data: response.data 
    }
  } catch (error) {
    console.error('Erreur restauration utilisateur:', error)
    
    // Gérer spécifiquement les erreurs 401 (non autorisé)
    if (error.response?.status === 401) {
      throw {
        success: false,
        message: 'Vous n\'êtes pas autorisé à restaurer cet utilisateur. Veuillez vous reconnecter.',
        status: 401,
      }
    }
    
    // Gérer les erreurs 403 (interdit)
    if (error.response?.status === 403) {
      throw {
        success: false,
        message: 'Seuls les administrateurs peuvent restaurer un utilisateur suspendu.',
        status: 403,
      }
    }
    
    // Gérer les erreurs 400 (requête incorrecte)
    if (error.response?.status === 400) {
      const errorData = error.response.data
      let errorMessage = 'Impossible de restaurer cet utilisateur'
      
      if (errorData?.error) {
        errorMessage = errorData.error
      } else if (errorData?.message) {
        errorMessage = errorData.message
      }
      
      throw {
        success: false,
        message: errorMessage,
        errors: errorData,
        status: 400,
      }
    }
    
    // Extraire le message d'erreur depuis la réponse
    let errorMessage = 'Erreur lors de la restauration de l\'utilisateur'
    if (error.response?.data) {
      if (error.response.data.error) {
        errorMessage = error.response.data.error
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data
      }
    } else if (!error.response) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.'
    }
    
    throw {
      success: false,
      message: errorMessage,
      errors: error.response?.data,
      status: error.response?.status || 500,
    }
  }
}

// Alias pour compatibilité (maintenant suspend au lieu de delete)
// ============ Gestion des rôles ============

/**
 * Récupérer la liste de tous les rôles
 * @returns {Promise<Array>} Liste des rôles
 */
export const getRoles = async () => {
  try {
    const response = await get('/utilisateur/roles/')
    return response.data
  } catch (error) {
    console.error('Erreur récupération rôles:', error)
    throw error
  }
}

/**
 * Récupérer un rôle par son ID
 * @param {number} roleId - ID du rôle
 * @returns {Promise<object>} Données du rôle
 */
export const getRoleById = async (roleId) => {
  try {
    // Encoder le nom du rôle pour l'URL (peut contenir des espaces ou caractères spéciaux)
    const encodedRoleId = encodeURIComponent(roleId)
    const response = await get(`/utilisateur/roles/${encodedRoleId}/`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération rôle:', error)
    throw error
  }
}

// Note: createRole est défini plus bas dans le fichier (nouveau système)

/**
 * Mettre à jour un rôle
 * @param {number} roleId - ID du rôle
 * @param {object} roleData - Nouvelles données (mise à jour partielle)
 * @returns {Promise<object>} Rôle mis à jour
 */
export const updateRole = async (roleId, roleData) => {
  try {
    // Validation des données avant envoi
    if (!roleData) {
      throw { message: 'Les données du rôle sont requises' }
    }
    
    // Vérifier que les champs requis sont présents
    if (!roleData.nom && !roleData.code) {
      throw { message: 'Le nom ou le code du rôle est requis' }
    }
    
    // S'assurer que permissions est un tableau
    if (roleData.permissions && !Array.isArray(roleData.permissions)) {
      roleData.permissions = []
    }
    
    // Encoder le nom du rôle pour l'URL (peut contenir des espaces ou caractères spéciaux)
    const encodedRoleId = encodeURIComponent(roleId)
    
    // Utiliser PATCH pour une mise à jour partielle
    const response = await patch(`/utilisateur/roles/${encodedRoleId}/`, roleData)
    
    return { 
      success: true, 
      role: response.data.role || response.data,
      users_affected: response.data.users_affected || 0,
      permissions: response.data.role?.permissions || response.data.permissions || [],
      permissions_added: response.data.permissions_added || [],
      permissions_removed: response.data.permissions_removed || [],
      info_changes: response.data.info_changes || []
    }
  } catch (error) {
    console.error('Erreur mise à jour rôle:', error)
    throw {
      success: false,
      message: error.response?.data?.message || error.message || 'Erreur de mise à jour',
      errors: error.response?.data,
    }
  }
}

/**
 * Supprimer un rôle
 * @param {number} roleId - ID du rôle
 * @returns {Promise<object>} Résultat
 */
export const deleteRole = async (roleId) => {
  try {
    await del(`/utilisateur/roles/${roleId}/`)
    return { success: true, message: 'Rôle supprimé avec succès' }
  } catch (error) {
    console.error('Erreur suppression rôle:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur de suppression',
    }
  }
}

/**
 * Récupérer les permissions disponibles
 * @returns {Promise<Array>} Liste des permissions
 */
export const getPermissions = async () => {
  try {
    const response = await get('/utilisateur/permissions/')
    return response.data
  } catch (error) {
    console.error('Erreur récupération permissions:', error)
    throw error
  }
}

// ========== Nouvelles fonctions pour le système de rôles complet ==========

/**
 * Récupérer toutes les permissions disponibles
 * GET /api/utilisateur/permissions/
 * @returns {Promise<Array>} Liste des permissions
 */
export const fetchPermissions = async () => {
  try {
    const response = await get('/utilisateur/permissions/')
    return response.data
  } catch (error) {
    console.error('Erreur récupération permissions:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la récupération des permissions',
      errors: error.response?.data,
    }
  }
}

/**
 * Récupérer tous les rôles
 * GET /api/utilisateur/roles/
 * @returns {Promise<Array>} Liste des rôles
 */
export const fetchRoles = async (includeInactive = false) => {
  try {
    const params = includeInactive ? { include_inactive: 'true' } : {}
    const response = await get('/utilisateur/roles/', { params })
    return response.data
  } catch (error) {
    console.error('Erreur récupération rôles:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la récupération des rôles',
      errors: error.response?.data,
    }
  }
}

/**
 * Récupérer un rôle par son ID
 * GET /api/utilisateur/roles/<id>/
 * @param {number} roleId - ID du rôle
 * @returns {Promise<object>} Données du rôle
 */
export const fetchRoleById = async (roleId) => {
  try {
    const response = await get(`/utilisateur/roles/${roleId}/`)
    return response.data
  } catch (error) {
    console.error('Erreur récupération rôle:', error)
    throw {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la récupération du rôle',
      errors: error.response?.data,
    }
  }
}

/**
 * Créer un nouveau rôle
 * POST /api/utilisateur/roles/
 * @param {object} roleData - Données du rôle {name, description, is_active, permission_ids: []}
 * @returns {Promise<object>} Rôle créé
 */
export const createRole = async (roleData) => {
  try {
    const response = await post('/utilisateur/roles/', roleData)
    return {
      success: true,
      role: response.data
    }
  } catch (error) {
    console.error('Erreur création rôle:', error)
    throw {
      success: false,
      message: error.response?.data?.error || error.response?.data?.message || 'Erreur lors de la création du rôle',
      errors: error.response?.data,
    }
  }
}

/**
 * Mettre à jour un rôle
 * PUT/PATCH /api/utilisateur/roles/<id>/
 * @param {number} roleId - ID du rôle
 * @param {object} roleData - Données à mettre à jour
 * @returns {Promise<object>} Rôle mis à jour
 */
export const updateRoleById = async (roleId, roleData) => {
  try {
    const response = await patch(`/utilisateur/roles/${roleId}/`, roleData)
    return {
      success: true,
      role: response.data
    }
  } catch (error) {
    console.error('Erreur mise à jour rôle:', error)
    throw {
      success: false,
      message: error.response?.data?.error || error.response?.data?.message || 'Erreur lors de la mise à jour du rôle',
      errors: error.response?.data,
    }
  }
}

/**
 * Supprimer un rôle
 * DELETE /api/utilisateur/roles/<id>/
 * @param {number} roleId - ID du rôle
 * @returns {Promise<object>} Résultat
 */
export const deleteRoleById = async (roleId) => {
  try {
    const response = await del(`/utilisateur/roles/${roleId}/`)
    return {
      success: true,
      message: response.data?.message || 'Rôle supprimé avec succès'
    }
  } catch (error) {
    console.error('Erreur suppression rôle:', error)
    throw {
      success: false,
      message: error.response?.data?.error || error.response?.data?.message || 'Erreur lors de la suppression du rôle',
      errors: error.response?.data,
    }
  }
}

export default {
  // Authentification
  login,
  register,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,

  // Utilisateurs
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,

  // Rôles et permissions (ancien système - compatibilité)
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  
  // Nouvelles fonctions pour le système de rôles complet
  fetchRoles,
  fetchRoleById,
  createRole,
  updateRoleById,
  deleteRoleById,
  fetchPermissions,
  // Anciennes fonctions (compatibilité)
  updateRole,
  deleteRole,
  getPermissions,
}

