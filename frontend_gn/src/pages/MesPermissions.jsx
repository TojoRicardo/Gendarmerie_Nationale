import React from 'react';
import { CheckCircle, XCircle, Info, User, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS, PERMISSION_LABELS, ROLE_PERMISSIONS } from '../constants/permissions';
import { RoleBadge, UserRestrictionsDisplay } from '../components/RoleBasedUI';

const MesPermissions = () => {
  const { utilisateur } = useAuth();
  const { permissions, displayRestrictions } = usePermissions();

  if (!utilisateur) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const roleConfig = ROLE_PERMISSIONS[utilisateur.role];
  const allPermissions = Object.values(PERMISSIONS);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 shadow-2xl text-white">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
            <KeyRound size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Mes Permissions</h1>
            <p className="text-blue-100">Visualisez vos droits d'accès et permissions</p>
          </div>
        </div>

        {/* Informations utilisateur */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-blue-100 text-sm mb-1">Utilisateur</p>
              <p className="font-semibold text-lg">{utilisateur.nom} {utilisateur.prenom}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Rôle</p>
              <RoleBadge role={utilisateur.role} size="lg" />
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Permissions actives</p>
              <p className="font-semibold text-lg">{permissions.length} / {allPermissions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description du rôle */}
      {roleConfig && (
        <div className="card-pro p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Info className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Description de votre rôle
              </h2>
              <p className="text-gray-600">{roleConfig.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Restrictions d'accès */}
      <UserRestrictionsDisplay />

      {/* Liste des permissions */}
      <div className="card-pro p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <CheckCircle className="mr-2 text-green-600" size={24} />
          Détail de vos permissions
        </h2>

        <div className="space-y-6">
          {/* Dashboard */}
          <PermissionCategory
            title="Tableau de bord"
            permissions={[PERMISSIONS.DASHBOARD_VIEW]}
            userPermissions={permissions}
          />

          {/* Fiches Criminelles */}
          <PermissionCategory
            title="Fiches Criminelles"
            permissions={[
              PERMISSIONS.FICHES_VIEW,
              PERMISSIONS.FICHES_CREATE,
              PERMISSIONS.FICHES_EDIT,
              PERMISSIONS.FICHES_DELETE,
            ]}
            userPermissions={permissions}
          />

          {/* Biométrie */}
          <PermissionCategory
            title="Biométrie"
            permissions={[
              PERMISSIONS.BIOMETRIE_VIEW,
              PERMISSIONS.BIOMETRIE_ADD,
              PERMISSIONS.BIOMETRIE_EDIT,
              PERMISSIONS.BIOMETRIE_DELETE,
            ]}
            userPermissions={permissions}
          />

          {/* Rapports */}
          <PermissionCategory
            title="Rapports"
            permissions={[
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.REPORTS_CREATE,
              PERMISSIONS.REPORTS_EXPORT,
            ]}
            userPermissions={permissions}
          />

          {/* Intelligence Artificielle */}
          <PermissionCategory
            title="Intelligence Artificielle"
            permissions={[
              PERMISSIONS.IA_VIEW_RESULTS,
              PERMISSIONS.IA_USE_RECOGNITION,
              PERMISSIONS.IA_USE_PREDICTION,
            ]}
            userPermissions={permissions}
          />

          {/* Audit */}
          <PermissionCategory
            title="Journal d'Audit"
            permissions={[
              PERMISSIONS.AUDIT_VIEW,
              PERMISSIONS.AUDIT_VIEW_OWN,
              PERMISSIONS.AUDIT_VIEW_ALL,
            ]}
            userPermissions={permissions}
          />

          {/* Utilisateurs */}
          <PermissionCategory
            title="Utilisateurs"
            permissions={[
              PERMISSIONS.USERS_VIEW,
              PERMISSIONS.USERS_CREATE,
              PERMISSIONS.USERS_EDIT,
              PERMISSIONS.USERS_DELETE,
            ]}
            userPermissions={permissions}
          />

          {/* Rôles */}
          <PermissionCategory
            title="Rôles et Permissions"
            permissions={[
              PERMISSIONS.ROLES_VIEW,
              PERMISSIONS.ROLES_MANAGE,
            ]}
            userPermissions={permissions}
          />
        </div>
      </div>

      {/* Aide */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <Info className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">
              Besoin de permissions supplémentaires ?
            </h3>
            <p className="text-yellow-800 text-sm">
              Si vous pensez avoir besoin de permissions supplémentaires pour accomplir vos tâches,
              veuillez contacter votre administrateur système. Indiquez clairement les permissions
              dont vous avez besoin et la raison de votre demande.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Composant pour afficher une catégorie de permissions
 */
const PermissionCategory = ({ title, permissions, userPermissions }) => {
  const hasAnyPermission = permissions.some(perm => userPermissions.includes(perm));

  if (!hasAnyPermission && permissions.every(perm => !userPermissions.includes(perm))) {
    return null; // Ne rien afficher si aucune permission de cette catégorie
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-lg">{title}</h3>
      <div className="space-y-2">
        {permissions.map(permission => {
          const hasPermission = userPermissions.includes(permission);
          const label = PERMISSION_LABELS[permission] || permission;

          return (
            <div
              key={permission}
              className={`flex items-center justify-between p-3 rounded-lg ${
                hasPermission ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {hasPermission ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <XCircle className="text-gray-400" size={20} />
                )}
                <span className={hasPermission ? 'text-green-900 font-medium' : 'text-gray-500'}>
                  {label}
                </span>
              </div>
              {hasPermission && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  Autorisé
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MesPermissions;

