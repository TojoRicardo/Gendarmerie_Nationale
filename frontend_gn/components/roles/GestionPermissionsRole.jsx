import React, { useState, useEffect } from 'react';
import { Check, X, Search } from 'lucide-react';
import Bouton from '../commun/Bouton';
import ChampTexte from '../commun/ChampTexte';
import SpinnerChargement from '../commun/SpinnerChargement';

const GestionPermissionsRole = ({ roleId, onSauvegarder, onAnnuler }) => {
  const [permissions, setPermissions] = useState([]);
  const [permissionsSelectionnees, setPermissionsSelectionnees] = useState(new Set());
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [categories, setCategories] = useState([]);
  const [categorieActive, setCategorieActive] = useState('all');

  useEffect(() => {
    chargerPermissions();
  }, [roleId]);

  const chargerPermissions = async () => {
    setChargement(true);
    try {
      const response = await fetch(`/api/permissions?roleId=${roleId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions);
        setPermissionsSelectionnees(new Set(data.permissionsRole));
        
        // Extraire les catégories uniques
        const cats = [...new Set(data.permissions.map(p => p.categorie))];
        setCategories(cats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
    } finally {
      setChargement(false);
    }
  };

  const togglePermission = (permissionId) => {
    const newSet = new Set(permissionsSelectionnees);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setPermissionsSelectionnees(newSet);
  };

  const toggleCategorie = (categorie) => {
    const permissionsCategorie = permissions
      .filter(p => p.categorie === categorie)
      .map(p => p.id);
    
    const toutesSelectionnees = permissionsCategorie.every(id => 
      permissionsSelectionnees.has(id)
    );

    const newSet = new Set(permissionsSelectionnees);
    
    if (toutesSelectionnees) {
      permissionsCategorie.forEach(id => newSet.delete(id));
    } else {
      permissionsCategorie.forEach(id => newSet.add(id));
    }
    
    setPermissionsSelectionnees(newSet);
  };

  const handleSauvegarder = async () => {
    try {
      await onSauvegarder(Array.from(permissionsSelectionnees));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const permissionsFiltrees = permissions.filter(p => {
    const matchRecherche = p.nom.toLowerCase().includes(recherche.toLowerCase()) ||
                          p.description.toLowerCase().includes(recherche.toLowerCase());
    const matchCategorie = categorieActive === 'all' || p.categorie === categorieActive;
    return matchRecherche && matchCategorie;
  });

  const permissionsParCategorie = permissionsFiltrees.reduce((acc, permission) => {
    if (!acc[permission.categorie]) {
      acc[permission.categorie] = [];
    }
    acc[permission.categorie].push(permission);
    return acc;
  }, {});

  if (chargement) {
    return <SpinnerChargement texte="Chargement des permissions..." />;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Gestion des Permissions</h3>
          <p className="text-sm text-gray-600 mt-1">
            {permissionsSelectionnees.size} permission(s) sélectionnée(s)
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="space-y-4">
        <ChampTexte
          placeholder="Rechercher une permission..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          icone={Search}
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategorieActive('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              categorieActive === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          {categories.map(categorie => (
            <button
              key={categorie}
              onClick={() => setCategorieActive(categorie)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                categorieActive === categorie
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {categorie}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des permissions par catégorie */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(permissionsParCategorie).map(([categorie, perms]) => {
          const toutesSelectionnees = perms.every(p => permissionsSelectionnees.has(p.id));
          const aucuneSelectionnee = perms.every(p => !permissionsSelectionnees.has(p.id));

          return (
            <div key={categorie} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900">{categorie}</h4>
                <button
                  onClick={() => toggleCategorie(categorie)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {toutesSelectionnees ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              <div className="space-y-2">
                {perms.map(permission => (
                  <label
                    key={permission.id}
                    className={`
                      flex items-start p-3 rounded-lg cursor-pointer transition-colors
                      ${permissionsSelectionnees.has(permission.id)
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={permissionsSelectionnees.has(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">
                        {permission.nom}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {permission.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        {permission.code}
                      </div>
                    </div>
                    {permissionsSelectionnees.has(permission.id) && (
                      <Check className="text-blue-600 mt-1" size={20} />
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Bouton
          type="button"
          variant="secondary"
          onClick={onAnnuler}
        >
          Annuler
        </Bouton>
        <Bouton
          type="button"
          variant="primary"
          onClick={handleSauvegarder}
        >
          Sauvegarder les permissions
        </Bouton>
      </div>
    </div>
  );
};

export default GestionPermissionsRole;

