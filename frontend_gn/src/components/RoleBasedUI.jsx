import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { ShieldOff } from 'lucide-react';

/**
 * Composant pour afficher du contenu uniquement si l'utilisateur a la permission
 * Usage: <RoleBasedUI permission="fiches.create">...</RoleBasedUI>
 */
export const RoleBasedUI = ({ 
  children, 
  permission = null,
  permissions = [],
  role = null,
  roles = [],
  requireAll = false,
  fallback = null,
  showMessage = false 
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission, hasRole } = usePermissions();

  // Vérifier les permissions
  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  // Vérifier le rôle si spécifié
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  } else if (roles.length > 0) {
    hasAccess = hasAccess && roles.some(r => hasRole(r));
  }

  if (!hasAccess) {
    if (fallback) return fallback;
    
    if (showMessage) {
      return (
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <ShieldOff size={20} className="text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">Accès non autorisé</span>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
};

/**
 * Bouton basé sur les permissions
 * Affiche un bouton uniquement si l'utilisateur a la permission
 */
export const PermissionButton = ({ 
  permission, 
  permissions = [],
  requireAll = false,
  children, 
  disabled = false,
  disabledMessage = "Vous n'avez pas les permissions nécessaires",
  tooltip = true,
  ...props 
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let hasAccess = true;
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) return null;

  const isDisabled = disabled || !hasAccess;
  
  return (
    <div className="relative group">
      <button 
        {...props} 
        disabled={isDisabled}
        className={`${props.className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {children}
      </button>
      
      {tooltip && isDisabled && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap shadow-lg">
            {disabledMessage}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Section basée sur les permissions
 * Cache une section entière si l'utilisateur n'a pas la permission
 */
export const PermissionSection = ({ 
  permission, 
  permissions = [],
  requireAll = false,
  children, 
  title = "",
  showPlaceholder = false 
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let hasAccess = true;
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    if (showPlaceholder) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <ShieldOff className="text-gray-400" size={24} />
            <div>
              <h3 className="font-semibold text-gray-700">{title || "Section restreinte"}</h3>
              <p className="text-sm text-gray-500">Vous n'avez pas accès à cette section</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
};

/**
 * Badge de rôle avec style
 */
export const RoleBadge = ({ role, size = "md" }) => {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base"
  };

  const roleStyles = {
    'Administrateur Système': 'bg-red-100 text-red-800 border-red-200',
    'Enquêteur Principal': 'bg-blue-100 text-blue-800 border-blue-200',
    'Analyste': 'bg-purple-100 text-purple-800 border-purple-200',
    'Observateur': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const style = roleStyles[role] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${style} ${sizeClasses[size]}`}>
      {role}
    </span>
  );
};

/**
 * Affichage des restrictions utilisateur
 */
export const UserRestrictionsDisplay = () => {
  const { displayRestrictions, utilisateur } = usePermissions();

  if (!utilisateur) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-semibold text-blue-900 mb-3">Vos accès actuels</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${displayRestrictions.showCreateButtons ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={displayRestrictions.showCreateButtons ? 'text-green-800' : 'text-gray-500'}>
            Création
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${displayRestrictions.showEditButtons ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={displayRestrictions.showEditButtons ? 'text-green-800' : 'text-gray-500'}>
            Modification
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${displayRestrictions.showDeleteButtons ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={displayRestrictions.showDeleteButtons ? 'text-green-800' : 'text-gray-500'}>
            Suppression
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${displayRestrictions.canUseIA ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={displayRestrictions.canUseIA ? 'text-green-800' : 'text-gray-500'}>
            Intelligence Artificielle
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${displayRestrictions.showExportButtons ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={displayRestrictions.showExportButtons ? 'text-green-800' : 'text-gray-500'}>
            Export de données
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${displayRestrictions.canViewAudit ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={displayRestrictions.canViewAudit ? 'text-green-800' : 'text-gray-500'}>
            Journal d'audit
          </span>
        </div>
      </div>
      
      {displayRestrictions.isReadOnly && (
        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-800">
          Mode lecture seule : Vous pouvez consulter mais pas modifier les données
        </div>
      )}
    </div>
  );
};

export default RoleBasedUI;

