import React from 'react'
import { useAuth } from '../context/AuthContext'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../utils/permissions'
import { normalizeRole } from '../utils/roleMapper'

/**
 * Composant pour afficher conditionnellement des éléments selon les permissions
 * 
 * @param {Object} props
 * @param {Array<string>} props.permissions - Liste des permissions requises
 * @param {Array<string>} props.roles - Liste des rôles autorisés
 * @param {boolean} props.requireAll - Si true, toutes les permissions sont requises. Si false, au moins une suffit
 * @param {React.ReactNode} props.children - Contenu à afficher si autorisé
 * @param {React.ReactNode} props.fallback - Contenu à afficher si non autorisé (optionnel)
 * 
 * @example
 * // Afficher seulement pour les administrateurs
 * <ProtectedElement roles={[ROLES.ADMINISTRATEUR]}>
 *   <button>Supprimer</button>
 * </ProtectedElement>
 * 
 * @example
 * // Afficher si l'utilisateur a la permission de créer des fiches
 * <ProtectedElement permissions={[PERMISSIONS.FICHES_CREATE]}>
 *   <button>Créer Fiche</button>
 * </ProtectedElement>
 * 
 * @example
 * // Afficher si l'utilisateur a AU MOINS UNE des permissions
 * <ProtectedElement permissions={[PERMISSIONS.FICHES_EDIT, PERMISSIONS.FICHES_DELETE]} requireAll={false}>
 *   <button>Modifier ou Supprimer</button>
 * </ProtectedElement>
 * 
 * @example
 * // Afficher avec fallback
 * <ProtectedElement 
 *   permissions={[PERMISSIONS.USERS_EDIT]}
 *   fallback={<p className="text-gray-500">Accès restreint</p>}
 * >
 *   <button>Modifier Utilisateur</button>
 * </ProtectedElement>
 */
const ProtectedElement = ({ 
  children, 
  permissions = [], 
  roles = [],
  requireAll = false,
  fallback = null 
}) => {
  const { utilisateur } = useAuth()

  // Si pas d'utilisateur connecté, ne rien afficher
  if (!utilisateur) {
    return fallback
  }

  const userRole = normalizeRole(utilisateur.role)

  // Vérifier les rôles si spécifiés
  if (roles.length > 0 && !roles.includes(userRole)) {
    return fallback
  }

  // Vérifier les permissions si spécifiées
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(userRole, permissions)
      : hasAnyPermission(userRole, permissions)

    if (!hasRequiredPermissions) {
      return fallback
    }
  }

  // Si toutes les conditions sont remplies, afficher les enfants
  return <>{children}</>
}

export default ProtectedElement

/**
 * Hook personnalisé pour vérifier les permissions dans les composants
 * 
 * @returns {Object} Fonctions de vérification de permissions
 * 
 * @example
 * const { canCreate, canEdit, canDelete, userRole } = usePermissionCheck()
 * 
 * return (
 *   <div>
 *     {canCreate && <button>Créer</button>}
 *     {canEdit && <button>Modifier</button>}
 *     {canDelete && <button>Supprimer</button>}
 *   </div>
 * )
 */
export const usePermissionCheck = () => {
  const { utilisateur } = useAuth()
  
  if (!utilisateur) {
    return {
      userRole: null,
      checkPermission: () => false,
      checkAnyPermission: () => false,
      checkAllPermissions: () => false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      isReadOnly: true
    }
  }

  const userRole = normalizeRole(utilisateur.role)

  return {
    userRole,
    checkPermission: (permission) => hasPermission(userRole, permission),
    checkAnyPermission: (permissions) => hasAnyPermission(userRole, permissions),
    checkAllPermissions: (permissions) => hasAllPermissions(userRole, permissions),
    
    // Raccourcis pour les actions communes
    canCreate: hasPermission(userRole, 'fiches.create'),
    canEdit: hasPermission(userRole, 'fiches.edit'),
    canDelete: hasPermission(userRole, 'fiches.delete'),
    canExport: hasPermission(userRole, 'reports.export'),
    isReadOnly: ['Analyste Judiciaire', 'Observateur Externe'].includes(userRole)
  }
}

