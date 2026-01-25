/**
 * Composant de débogage pour afficher les permissions de l'utilisateur
 * À utiliser temporairement pour diagnostiquer les problèmes d'authentification
 */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const PermissionsDebug = () => {
  const { utilisateur, estConnecte } = useAuth();
  const { permissions } = usePermissions();

  if (!estConnecte) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-md">
        <p className="font-bold"> Non connecté</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-400 text-blue-900 px-4 py-3 rounded shadow-lg max-w-md text-xs">
      <p className="font-bold mb-2"> Debug - Informations utilisateur</p>
      <div className="space-y-1">
        <p><strong>Nom:</strong> {utilisateur?.prenom} {utilisateur?.nom}</p>
        <p><strong>Email:</strong> {utilisateur?.email}</p>
        <p><strong>Rôle:</strong> {utilisateur?.role || ' Aucun'}</p>
        <p><strong>Permissions:</strong> {permissions?.length || 0}</p>
        {permissions && permissions.length > 0 ? (
          <details className="mt-2">
            <summary className="cursor-pointer font-semibold">
              Voir les permissions ({permissions.length})
            </summary>
            <ul className="mt-1 pl-4 max-h-40 overflow-y-auto">
              {permissions.map((perm, index) => (
                <li key={index} className="text-xs"> {perm}</li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="text-red-600 font-bold mt-2"> AUCUNE PERMISSION TROUVÉE</p>
        )}
      </div>
    </div>
  );
};

export default PermissionsDebug;

