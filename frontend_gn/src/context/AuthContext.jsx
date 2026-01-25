import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as authService from '../services/authService'
import connectionDetectionService from '../services/connectionDetectionService'
import { getUserData, isAuthenticated, getCurrentSessionId } from '../utils/sessionStorage'

const noop = async () => {
  throw new Error('AuthProvider non initialisé – assurez-vous de monter AuthProvider à la racine.')
}

const defaultAuthContext = {
  utilisateur: null,
  connexion: noop,
  deconnexion: noop,
  mettreAJourProfil: noop,
  changerMotDePasse: noop,
  rafraichirUtilisateur: noop,
  mettreAJourUtilisateurDirect: noop,
  estConnecte: false,
  chargement: false,
  providerReady: false,
}

export const AuthContext = createContext(defaultAuthContext)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context || context === defaultAuthContext) {
    if (import.meta?.env?.DEV) {
      // Avertir une seule fois pour les environnements de dev
      console.warn(
        '[AuthContext] AuthProvider est introuvable dans l’arbre des composants. ' +
        'Utilisation d’un contexte d’auth par défaut (utilisateur déconnecté).'
      )
    }
    return defaultAuthContext
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)
  const sessionIdRef = useRef(null)
  
  // Initialiser l'ID de session au montage
  useEffect(() => {
    sessionIdRef.current = getCurrentSessionId()
  }, [])

  useEffect(() => {
    // Vérifier si un utilisateur est déjà authentifié au chargement
    const loadUser = async () => {
      try {
        if (isAuthenticated()) {
          // Récupérer les données utilisateur depuis localStorage
          const userData = getUserData()
          setUtilisateur(userData)

          // Optionnel : Récupérer les données à jour depuis le serveur
          // MAIS seulement si c'est le même utilisateur (vérification de sécurité)
          // ET seulement si on n'a pas déjà détecté que le serveur est indisponible
          // (pour éviter les requêtes répétées qui génèrent des logs dans la console)
          const serverUnavailable = sessionStorage.getItem('server_unavailable')
          if (!serverUnavailable) {
            try {
              const currentUser = await authService.getCurrentUser()
              // Vérifier que c'est le même utilisateur
              if (currentUser?.id === userData?.id) {
                setUtilisateur(currentUser)
                // Réinitialiser le flag si le serveur répond
                sessionStorage.removeItem('server_unavailable')
              } else {
                console.warn('Tentative de chargement d\'un utilisateur différent détectée. Conservation des données locales.')
                // Garder les données locales si c'est un utilisateur différent
              }
            } catch (error) {
              // Ne pas logger les erreurs réseau - c'est normal si le serveur n'est pas démarré
              // Cache refresh
              const isNetworkError = 
                error.code === 'ERR_NETWORK' || 
                error.code === 'ERR_CONNECTION_REFUSED' ||
                error.message?.includes('ERR_CONNECTION_REFUSED') ||
                error.message?.includes('Failed to fetch') ||
                !error.response
              
              if (isNetworkError) {
                // Marquer que le serveur est indisponible pour éviter les requêtes répétées
                sessionStorage.setItem('server_unavailable', 'true')
                // Ne pas logger - c'est normal si le serveur n'est pas démarré
              } else if (!isNetworkError) {
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur:', error)
      } finally {
        setChargement(false)
      }
    }

    loadUser()
  }, [])

  // Écouter les changements de localStorage depuis d'autres onglets
  // MAIS IGNORER complètement les changements d'autres sessions
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Ignorer tous les changements qui ne concernent pas cette session
      // Les données sont maintenant isolées par sessionId dans localStorage
      const currentSessionId = sessionIdRef.current
      
      // Si le changement concerne une autre session, l'ignorer complètement
      if (e.key && e.key.startsWith('user_data_') && !e.key.includes(currentSessionId)) {
        return // Ignorer les changements d'autres sessions
      }
      
      // Si c'est un changement de session courante, vérifier
      if (e.key && e.key.includes(currentSessionId)) {
        const currentUserId = utilisateur?.id
        const newUserData = getUserData()
        const newUserId = newUserData?.id
        
        // Si c'est un utilisateur différent dans cette même session, ignorer
        if (newUserId && newUserId !== currentUserId) {
          console.warn('Tentative de changement d\'utilisateur détectée. Ignorée pour préserver la session actuelle.')
          return
        }
        
        // Si c'est le même utilisateur ou une déconnexion, mettre à jour
        if (newUserId === currentUserId || !newUserData) {
          if (isAuthenticated()) {
            setUtilisateur(newUserData)
          } else {
            setUtilisateur(null)
          }
        }
      }
    }

    // Ajouter l'écouteur d'événement storage
    window.addEventListener('storage', handleStorageChange)

    // Nettoyer l'écouteur au démontage
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [utilisateur?.id])

  /**
   * Connexion utilisateur
   * @param {string} emailOrUsername - Email ou nom d'utilisateur
   * @param {string} password - Mot de passe
   */
    const connexion = useCallback(async (emailOrUsername, password, pin = '') => {
    try {
      // Déterminer si c'est un email ou un username
      const isEmail = emailOrUsername.includes('@')
      const credentials = isEmail 
        ? { email: emailOrUsername, password, pin }
        : { username: emailOrUsername, password, pin }
      
      const result = await authService.login(credentials)
      
      // Vérifier si le PIN est requis
      if (result?.pin_required || result?.data?.pin_required) {
        return {
          pin_required: true,
          temp_token: result?.temp_token || result?.data?.temp_token
        }
      }
      
      
      // IMPORTANT : S'assurer que les permissions sont bien présentes
      // Vérifier que result.user existe avant d'accéder à ses propriétés
      if (!result.user) {
        throw new Error('Données utilisateur non reçues du serveur')
      }
      
      const userData = {
        ...result.user,
        permissions: result.user?.permissions || []
      }
      
      setUtilisateur(userData)

      // Détecter et enregistrer la connexion
      try {
        const detectionResult = await connectionDetectionService.detectConnection()
        if (detectionResult.success) {
        }
      } catch (detectionError) {
        console.warn('Erreur lors de la détection de connexion (non-bloquant):', detectionError)
        // Ne pas bloquer la connexion si la détection échoue
      }

      return {
        success: true,
        token: result.token,
        utilisateur: userData,
      }
    } catch (error) {
      // Ne pas logger les erreurs réseau - c'est normal si le serveur n'est pas démarré
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Network Error') ||
        !error.response
      
      if (!isNetworkError) {
        console.error('Erreur de connexion:', error)
      }
      
      // Si c'est une erreur formatée par authService, utiliser son message
      if (error.message && error.success === false) {
        throw new Error(error.message)
      }
      
      // Sinon, message générique
      throw new Error(error.message || 'Identifiant ou mot de passe incorrect')
    }
  }, [])

  /**
   * Déconnexion utilisateur
   */
  const deconnexion = useCallback(async () => {
    try {
      // Enregistrer la déconnexion (optionnel, non-bloquant)
      try {
        const disconnectResult = await connectionDetectionService.disconnect()
        if (disconnectResult.success) {
          // Seulement logger si l'endpoint existe et fonctionne
          if (process.env.NODE_ENV === 'development') {
          }
        }
        // Si l'endpoint n'existe pas (404), on ignore silencieusement
      } catch (detectionError) {
        // Ignorer silencieusement - l'endpoint peut ne pas exister
        if (process.env.NODE_ENV === 'development' && detectionError.response?.status !== 404) {
        }
      }
      
      // Déconnexion normale
      await authService.logout()
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    } finally {
      setUtilisateur(null)
    }
  }, [])


  /**
   * Mettre à jour le profil utilisateur
   * @param {object} userData - Nouvelles données
   */
  const mettreAJourProfil = useCallback(async (userData) => {
    try {
      const result = await authService.updateProfile(userData)
      setUtilisateur(result.user)
      return result
    } catch (error) {
      console.error('Erreur mise à jour profil:', error)
      throw error
    }
  }, [])

  /**
   * Changer le mot de passe
   * @param {object} passwords - {old_password, new_password, confirm_password}
   */
  const changerMotDePasse = useCallback(async (passwords) => {
    try {
      return await authService.changePassword(passwords)
    } catch (error) {
      console.error('Erreur changement mot de passe:', error)
      throw error
    }
  }, [])

  /**
   * Mettre à jour directement les données utilisateur (sans appel API)
   */
  const mettreAJourUtilisateurDirect = useCallback((userData) => {
    try {
      // S'assurer que les permissions sont présentes
      const userDataWithPermissions = {
        ...userData,
        permissions: userData?.permissions || []
      }
      
      setUtilisateur(userDataWithPermissions)
      // Cache refresh
      return userDataWithPermissions
    } catch (error) {
      console.error('Erreur lors de la mise à jour directe des données utilisateur:', error)
      throw error
    }
  }, [])

  /**
   * Rafraîchir les données utilisateur depuis le serveur
   * Utile après modification des rôles/permissions
   * Vérifie que c'est le même utilisateur avant de mettre à jour
   */
  const rafraichirUtilisateur = useCallback(async () => {
    try {
      if (!isAuthenticated()) {
        console.warn('Aucun utilisateur connecté')
        return null
      }

      // Sauvegarder l'ID utilisateur actuel avant la requête
      const currentUserId = utilisateur?.id
      
      // Récupérer les données à jour depuis le serveur
      const currentUser = await authService.getCurrentUser()
      
      // Vérifier que c'est le même utilisateur (sécurité supplémentaire)
      if (currentUserId && currentUser?.id && currentUser.id !== currentUserId) {
        console.warn('Tentative de rafraîchissement avec un utilisateur différent détectée. Ignorée.')
        return utilisateur // Retourner les données actuelles sans modification
      }
      
      // Mettre à jour l'état et le sessionStorage
      setUtilisateur(currentUser)
      
      return currentUser
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données utilisateur:', error)
      
      // Si l'erreur est 401 (non autorisé), déconnecter l'utilisateur
      if (error.response?.status === 401) {
        console.warn('Session expirée, déconnexion...')
        await deconnexion()
      }
      
      throw error
    }
  }, [deconnexion, utilisateur?.id])

  // Stabiliser l'objet utilisateur pour éviter les changements de référence inutiles
  const stableUtilisateur = useMemo(() => {
    if (!utilisateur) return null
    // Créer un nouvel objet uniquement si les propriétés importantes changent
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      username: utilisateur.username,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      role: utilisateur.role,
      grade: utilisateur.grade,
      matricule: utilisateur.matricule,
      statut: utilisateur.statut,
      permissions: utilisateur.permissions ? [...utilisateur.permissions].sort() : [],
    }
  }, [
    utilisateur?.id,
    utilisateur?.email,
    utilisateur?.username,
    utilisateur?.nom,
    utilisateur?.prenom,
    utilisateur?.role,
    utilisateur?.grade,
    utilisateur?.matricule,
    utilisateur?.statut,
    utilisateur?.permissions?.join(','), // Comparer les permissions comme string
  ])

  // Mémoïser le value pour éviter les re-rendus inutiles
  const value = useMemo(() => ({
    utilisateur: stableUtilisateur,
    connexion,
    deconnexion,
    mettreAJourProfil,
    changerMotDePasse,
    rafraichirUtilisateur,
    mettreAJourUtilisateurDirect,
    estConnecte: !!stableUtilisateur,
    chargement,
    providerReady: true,
  }), [
    stableUtilisateur,
    connexion,
    deconnexion,
    mettreAJourProfil,
    changerMotDePasse,
    rafraichirUtilisateur,
    mettreAJourUtilisateurDirect,
    chargement,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

