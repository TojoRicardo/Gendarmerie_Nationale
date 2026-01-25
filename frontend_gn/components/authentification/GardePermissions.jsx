import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';

/**
 * Composant de garde pour protéger l'accès basé sur les permissions
 * @param {React.ReactNode} children - Contenu à afficher si autorisé
 * @param {string[]} permissions - Liste des permissions requises
 * @param {string[]} roles - Liste des rôles autorisés
 * @param {React.ReactNode} fallback - Composant à afficher si non autorisé
 * @param {boolean} requireAll - Si true, nécessite toutes les permissions, sinon au moins une
 */
const GardePermissions = ({ 
  children, 
  permissions = [], 
  roles = [],
  fallback = null,
  requireAll = false 
}) => {
  const { utilisateur, chargement } = useAuth();

  const autorise = useMemo(() => {
    if (!utilisateur) return false;

    const utilisateurPermissions = utilisateur.permissions || [];
    const utilisateurRole = utilisateur.role || '';

    // Vérifier les rôles
    const aRole = roles.length === 0 || roles.includes(utilisateurRole);

    // Vérifier les permissions
    let aPermissions = true;
    if (permissions.length > 0) {
      if (requireAll) {
        aPermissions = permissions.every(perm => 
          utilisateurPermissions.includes(perm)
        );
      } else {
        aPermissions = permissions.some(perm => 
          utilisateurPermissions.includes(perm)
        );
      }
    }

    return aRole && aPermissions;
  }, [utilisateur, permissions, roles, requireAll]);

  if (chargement) {
    return null;
  }

  if (!autorise) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertTriangle className="text-yellow-600 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Accès refusé
        </h3>
        <p className="text-gray-600 text-center">
          Vous n'avez pas les permissions nécessaires pour accéder à cette fonctionnalité.
        </p>
      </div>
    );
  }

  return children;
};

export default GardePermissions;

