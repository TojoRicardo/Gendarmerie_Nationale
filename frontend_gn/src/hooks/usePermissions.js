/**
 * Hook personnalisé pour gérer les permissions utilisateur
 */
import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

export const usePermissions = () => {
  const { utilisateur } = useAuth()

  // Permissions de l'utilisateur - utiliser une référence stable
  const permissions = useMemo(() => {
    const perms = utilisateur?.permissions || []
    // Retourner un tableau vide si pas de permissions, sinon retourner le tableau trié pour stabilité
    if (perms.length === 0) return []
    // Créer une copie triée pour éviter les changements de référence
    return [...perms].sort()
  }, [utilisateur?.permissions])

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   * @param {string} permission - Code de la permission (ex: 'fiches.create')
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    if (!utilisateur) return false
    if (!permission) return true
    
    // Si l'utilisateur a tous les droits (permission '*'), autoriser tout
    if (permissions.includes('*')) {
      return true
    }
    
    return permissions.includes(permission)
  }

  /**
   * Vérifie si l'utilisateur a toutes les permissions spécifiées
   * @param {string[]} requiredPermissions - Liste des permissions requises
   * @returns {boolean}
   */
  const hasAllPermissions = (requiredPermissions) => {
    if (!utilisateur) return false
    if (!requiredPermissions || requiredPermissions.length === 0) return true
    
    // Si l'utilisateur a tous les droits (permission '*'), autoriser tout
    if (permissions.includes('*')) {
      return true
    }
    
    return requiredPermissions.every((perm) => permissions.includes(perm))
  }

  /**
   * Vérifie si l'utilisateur a au moins une des permissions spécifiées
   * @param {string[]} requiredPermissions - Liste des permissions
   * @returns {boolean}
   */
  const hasAnyPermission = (requiredPermissions) => {
    if (!utilisateur) return false
    if (!requiredPermissions || requiredPermissions.length === 0) return true
    
    // Si l'utilisateur a tous les droits (permission '*'), autoriser tout
    if (permissions.includes('*')) {
      return true
    }
    
    return requiredPermissions.some((perm) => permissions.includes(perm))
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   * @param {string} role - Nom du rôle
   * @returns {boolean}
   */
  const hasRole = (role) => {
    if (!utilisateur) return false
    return utilisateur.role === role
  }

  /**
   * Vérifie si l'utilisateur est Enquêteur Principal
   * @returns {boolean}
   */
  const isEnqueteurPrincipal = useMemo(() => {
    return hasRole('Enquêteur Principal')
  }, [utilisateur])

  /**
   * Vérifie si l'utilisateur est Administrateur
   * @returns {boolean}
   */
  const isAdmin = useMemo(() => {
    return hasRole('Administrateur Système') || hasRole('Administrateur')
  }, [utilisateur])

  /**
   * Vérifie si l'utilisateur est Analyste Judiciaire
   * @returns {boolean}
   */
  const isAnalyste = useMemo(() => {
    return hasRole('Analyste Judiciaire')
  }, [utilisateur])

  /**
   * Vérifie si l'utilisateur est Observateur Externe
   * @returns {boolean}
   */
  const isObservateur = useMemo(() => {
    return hasRole('Observateur Externe')
  }, [utilisateur])

  /**
   * Vérifie si l'utilisateur peut modifier une ressource
   * @param {number} resourceOwnerId - ID du créateur de la ressource
   * @returns {boolean}
   */
  const canModify = (resourceOwnerId) => {
    if (!utilisateur) return false
    
    // L'administrateur peut tout modifier
    if (utilisateur.role === 'Administrateur Système' || utilisateur.role === 'Administrateur') {
      return true
    }
    
    // Les Enquêteurs Principaux peuvent modifier toutes les fiches criminelles
    if (utilisateur.role === 'Enquêteur Principal') {
      return hasPermission('fiches.edit')
    }
    
    // Les Enquêteurs et Enquêteurs Juniors peuvent modifier s'ils ont la permission
    // (le backend vérifiera l'assignation)
    if (utilisateur.role === 'Enquêteur' || utilisateur.role === 'Enquêteur Junior') {
      return hasPermission('fiches.edit')
    }
    
    // Pour les autres rôles, vérifier la permission et si c'est leur ressource
    if (hasPermission('fiches.edit')) {
      // Si l'utilisateur a la permission, il peut modifier ses propres ressources
      // ou si resourceOwnerId n'est pas défini (cas où on ne vérifie pas le propriétaire)
      return !resourceOwnerId || utilisateur.id === resourceOwnerId
    }
    
    // Par défaut, ne peut pas modifier
    return false
  }

  /**
   * Vérifie si l'utilisateur peut supprimer une ressource
   * @param {number} resourceOwnerId - ID du créateur de la ressource
   * @returns {boolean}
   */
  const canDelete = (resourceOwnerId) => {
    // Même logique que canModify pour la suppression
    return canModify(resourceOwnerId)
  }

  /**
   * Restrictions d'affichage basées sur les permissions
   * Détermine quels boutons/actions doivent être affichés
   */
  const displayRestrictions = useMemo(() => {
    const hasAdminRole = utilisateur?.role === 'Administrateur Système'
    const hasAllRights = permissions.includes('*')
    const checkPermission = (perm) => hasAllRights || permissions.includes(perm)
    
    // Un utilisateur est en lecture seule s'il n'a aucune permission de modification
    // Les Enquêteurs ne sont PAS en mode lecture seule
    const isEnqueteur = ['Enquêteur Principal', 'Enquêteur', 'Enquêteur Junior'].includes(utilisateur?.role)
    const isReadOnlyMode = !isEnqueteur && 
                           !checkPermission('fiches.create') && 
                           !checkPermission('fiches.edit') && 
                           !checkPermission('fiches.delete') && 
                           !checkPermission('biometrie.add') &&
                           !hasAdminRole
    
    return {
      showCreateButtons: checkPermission('fiches.create') || checkPermission('utilisateurs.create') || hasAdminRole,
      showEditButtons: checkPermission('fiches.edit') || checkPermission('utilisateurs.edit') || hasAdminRole || isEnqueteurPrincipal,
      showDeleteButtons: checkPermission('fiches.delete') || checkPermission('utilisateurs.delete') || hasAdminRole,
      showExportButtons: checkPermission('rapports.export') || hasAdminRole,
      showAdminFeatures: hasAdminRole,
      canViewAudit: checkPermission('audit.view') || hasAdminRole,
      canUseIA: checkPermission('ia.use_recognition') || checkPermission('ia.use_prediction') || hasAdminRole,
      isReadOnly: isReadOnlyMode,
    }
  }, [permissions, utilisateur])

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    isEnqueteurPrincipal,
    isAdmin,
    isAnalyste,
    isObservateur,
    canModify,
    canDelete,
    displayRestrictions,
  }
}

export default usePermissions
