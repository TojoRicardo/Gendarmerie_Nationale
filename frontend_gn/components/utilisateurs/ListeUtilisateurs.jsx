import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Filter, Users, X, Mail, Shield, User, Ban, Trash2, UserCheck, Eye } from 'lucide-react';
import Pagination from '../commun/Pagination';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import SpinnerChargement from '../commun/SpinnerChargement';

// Utiliser le service authService
import { getUsers as getUsersService, getRoles as getRolesService } from '../../src/services/authService';
// Utiliser le contexte d'authentification pour identifier l'utilisateur connecté
import { useAuth } from '../../src/context/AuthContext';
import { getStatutEffectif, getStatutConfig } from '../../src/utils/userStatut';

const ListeUtilisateurs = ({ onCreer, onModifier: _onModifier, onSupprimer, onRestaurer, onVoir, onSupprimerDefinitif, isAdmin = false }) => {
  // Récupérer l'utilisateur actuellement connecté depuis le contexte d'authentification
  const { utilisateur: currentUser } = useAuth();
  
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [roles, setRoles] = useState([]);

  // Pagination
  const [pageActuelle, setPageActuelle] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const elementsParPage = 12;

  const chargerUtilisateurs = useCallback(async () => {
    setChargement(true);
    try {
      const params = { page_size: 500 };
      if (recherche.trim()) params.search = recherche.trim();
      if (filtreRole) params.role = filtreRole;
      if (filtreStatut) params.statut = filtreStatut;

      const response = await getUsersService(params);
      let utilisateurs = Array.isArray(response) ? response : [];

      if (filtreStatut) {
        const filtreNormalise = filtreStatut.toLowerCase().trim();
        utilisateurs = utilisateurs.filter(
          (u) => getStatutEffectif(u) === filtreNormalise,
        );
      }

      if (recherche.trim()) {
        const terme = recherche.trim().toLowerCase();
        utilisateurs = utilisateurs.filter(
          (u) =>
            `${u.nom || ''} ${u.prenom || ''}`.toLowerCase().includes(terme)
            || (u.email || '').toLowerCase().includes(terme)
            || (u.matricule || '').toLowerCase().includes(terme),
        );
      }

      if (filtreRole) {
        utilisateurs = utilisateurs.filter(
          (u) => (u.role || '').toLowerCase() === filtreRole.toLowerCase(),
        );
      }

      const totalFiltres = utilisateurs.length;
      const totalPagesCalcul = Math.max(1, Math.ceil(totalFiltres / elementsParPage));
      const pageCourante = Math.min(pageActuelle, totalPagesCalcul);
      const indexDebut = (pageCourante - 1) * elementsParPage;
      const indexFin = indexDebut + elementsParPage;
      const utilisateursPagines = utilisateurs.slice(indexDebut, indexFin);

      setUtilisateurs(utilisateursPagines);
      setTotalElements(totalFiltres);
      setTotalPages(totalPagesCalcul);
      if (pageCourante !== pageActuelle) {
        setPageActuelle(pageCourante);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs :', error);
      setUtilisateurs([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setChargement(false);
    }
  }, [pageActuelle, recherche, filtreRole, filtreStatut, elementsParPage]);

  const chargerRoles = useCallback(async () => {
    try {
      const rolesApi = await getRolesService();
      let liste = [];
      if (Array.isArray(rolesApi)) {
        liste = rolesApi;
      } else if (Array.isArray(rolesApi?.results)) {
        liste = rolesApi.results;
      }
      const options = liste
        .map((role) => {
          const label = role.name || role.nom || role.libelle || role.label;
          return label ? { value: label, label } : null;
        })
        .filter(Boolean);
      setRoles(options);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    chargerUtilisateurs();
  }, [chargerUtilisateurs]);

  useEffect(() => {
    chargerRoles();
  }, [chargerRoles]);

  const appliquerFiltreRecherche = (value) => {
    setRecherche(value);
    setPageActuelle(1);
  };

  const appliquerFiltreRole = (value) => {
    setFiltreRole(value);
    setPageActuelle(1);
  };

  const appliquerFiltreStatut = (value) => {
    setFiltreStatut(value);
    setPageActuelle(1);
  };

  const reinitialiserFiltres = () => {
    console.log('Réinitialisation des filtres');
    setRecherche('');
    setFiltreRole('');
    setFiltreStatut('');
    setPageActuelle(1);
  };

  const filtresActifs = recherche || filtreRole || filtreStatut;

  return (
    <div className="space-y-6">
      {/* Barre d'actions avec gradient */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Liste des Utilisateurs</h2>
            <p className="text-gray-600 mt-1 font-medium">
              <span className="text-blue-600 font-bold">{totalElements}</span> utilisateur(s) trouvé(s)
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {onCreer && (
            <button
              onClick={onCreer}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus size={20} />
              <span>Créer un utilisateur</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtres modernes avec glassmorphism */}
      <div className="glass-effect p-6 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Filter className="text-blue-600 mr-2" size={20} />
            <h3 className="font-bold text-gray-900">Filtres de recherche</h3>
            {filtresActifs && (
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                Filtres actifs
              </span>
            )}
          </div>
          {filtresActifs && (
            <button
              onClick={reinitialiserFiltres}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <X size={16} />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChampTexte
            placeholder="Rechercher par nom, email..."
            value={recherche}
            onChange={(e) => appliquerFiltreRecherche(e.target.value)}
            icone={Search}
          />

          <Select
            placeholder="Filtrer par rôle"
            value={filtreRole}
            onChange={(e) => appliquerFiltreRole(e.target.value)}
            options={roles}
          />

          <Select
            placeholder="Tous les statuts"
            value={filtreStatut || ''}
            onChange={(e) => appliquerFiltreStatut(e.target.value || '')}
            options={[
              { value: 'actif', label: 'Actif' },
              { value: 'inactif', label: 'Inactif' },
              { value: 'suspendu', label: 'Suspendu' },
            ]}
          />

        </div>
      </div>

      {/* Contenu */}
      {chargement ? (
        <SpinnerChargement texte="Chargement des utilisateurs..." />
      ) : (
        <div className="space-y-4">
          {utilisateurs.map((utilisateur) => {
            // Vérifier si cet utilisateur est l'utilisateur actuellement connecté
            // Utiliser is_current_user du backend ou comparer les IDs
            const isCurrentUser = utilisateur.is_current_user || utilisateur.is_connected || 
                                 (currentUser && currentUser.id === utilisateur.id);
            
            const statutEffectif = getStatutEffectif(utilisateur);
            const statutConfig = getStatutConfig(statutEffectif);

            return (
              <div
                key={utilisateur.id}
                onClick={() => onVoir && onVoir(utilisateur)}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer border ${
                  isCurrentUser ? 'border-green-300 border-2' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCurrentUser ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {utilisateur.photo ? (
                        <img
                          src={utilisateur.photo}
                          alt={`${utilisateur.nom} ${utilisateur.prenom}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User size={24} className={isCurrentUser ? 'text-green-600' : 'text-blue-600'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {utilisateur.nom} {utilisateur.prenom}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-green-600 font-medium">(Vous)</span>
                          )}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutConfig.badgeClass}`}>
                          {isCurrentUser && statutEffectif === 'actif' ? 'Connecté' : statutConfig.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        {utilisateur.matricule && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Matricule:</span>
                            <span>{utilisateur.matricule}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Mail size={14} className="mr-2" />
                          <span className="truncate">{utilisateur.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Shield size={14} className="mr-2" />
                          <span>{utilisateur.role || 'Aucun rôle'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {onVoir && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVoir(utilisateur);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        title="Voir"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    {statutEffectif !== 'suspendu' && onSupprimer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSupprimer(utilisateur);
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        title="Suspendre"
                      >
                        <Ban size={18} />
                      </button>
                    )}
                    {statutEffectif === 'suspendu' && isAdmin && onRestaurer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestaurer(utilisateur);
                        }}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                        title="Restaurer"
                      >
                        <UserCheck size={18} />
                      </button>
                    )}
                    {isAdmin && onSupprimerDefinitif && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSupprimerDefinitif(utilisateur);
                        }}
                        className="p-2 hover:bg-rose-100 rounded-lg transition-colors text-rose-600"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!chargement && utilisateurs.length > 0 && (
        <Pagination
          pageActuelle={pageActuelle}
          totalPages={totalPages}
          totalElements={totalElements}
          elementsParPage={elementsParPage}
          onPageChange={setPageActuelle}
        />
      )}

      {/* Message si aucun résultat */}
      {!chargement && utilisateurs.length === 0 && (
        <div className="card-pro p-12 text-center">
          <div className="inline-flex p-6 bg-gray-100 rounded-full mb-6">
            <Users size={64} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
          <p className="text-gray-500 mb-6">Essayez de modifier vos critères de recherche ou créez un nouvel utilisateur</p>
        </div>
      )}
    </div>
  );
};

export default ListeUtilisateurs;

