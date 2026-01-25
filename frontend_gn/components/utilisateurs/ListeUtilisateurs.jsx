import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Users, X, Mail, Shield, Phone, User, Ban, Trash2, UserCheck, Eye } from 'lucide-react';
import Pagination from '../commun/Pagination';
import Bouton from '../commun/Bouton';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import SpinnerChargement from '../commun/SpinnerChargement';

// Utiliser le service authService
import { getUsers as getUsersService } from '../../src/services/authService';
// Utiliser le contexte d'authentification pour identifier l'utilisateur connecté
import { useAuth } from '../../src/context/AuthContext';

const ListeUtilisateurs = ({ onCreer, onModifier, onSupprimer, onRestaurer, onVoir, onSupprimerDefinitif, isAdmin = false }) => {
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

  useEffect(() => {
    chargerUtilisateurs();
    chargerRoles();
  }, [pageActuelle, recherche, filtreRole, filtreStatut]);

  // Réinitialiser la page à 1 quand les filtres changent
  useEffect(() => {
    setPageActuelle(1);
  }, [recherche, filtreRole, filtreStatut]);

  const chargerUtilisateurs = async () => {
    setChargement(true);
    try {
      // Utiliser le service authService au lieu d'une URL hardcodée
      const response = await getUsersService();
      
      // S'assurer que response est un tableau
      let utilisateurs = Array.isArray(response) ? response : [];

      // Appliquer les filtres de recherche
      if (recherche) {
        utilisateurs = utilisateurs.filter(
          u =>
            `${u.nom || ''} ${u.prenom || ''}`.toLowerCase().includes(recherche.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(recherche.toLowerCase()) ||
            (u.matricule || '').toLowerCase().includes(recherche.toLowerCase())
        );
      }

      // Appliquer le filtre de rôle
      if (filtreRole) {
        utilisateurs = utilisateurs.filter(u => u.role === filtreRole);
      }

      // Appliquer le filtre de statut
      // Les statuts dans la base sont : 'actif', 'inactif', 'suspendu' (en minuscules)
      if (filtreStatut && filtreStatut.trim() !== '') {
        const filtreStatutNormalise = filtreStatut.toLowerCase().trim();
        const avantFiltre = utilisateurs.length;
        
        utilisateurs = utilisateurs.filter(u => {
          // Récupérer le statut de l'utilisateur
          const statutUtilisateur = u.statut;
          
          // Si pas de statut défini, exclure de ce filtre
          if (!statutUtilisateur) {
            return false;
          }
          
          // Normaliser le statut (minuscules, sans espaces)
          const statutNormalise = String(statutUtilisateur).toLowerCase().trim();
          
          // Comparer avec le filtre
          const correspond = statutNormalise === filtreStatutNormalise;
          
          return correspond;
        });
        
        console.log(`✅ Filtre statut "${filtreStatutNormalise}": ${utilisateurs.length} utilisateur(s) trouvé(s) sur ${avantFiltre}`);
      }

      // Calculer la pagination sur les résultats filtrés
      const totalFiltres = utilisateurs.length;
      const totalPagesCalcul = Math.ceil(totalFiltres / elementsParPage);
      
      // Appliquer la pagination
      const indexDebut = (pageActuelle - 1) * elementsParPage;
      const indexFin = indexDebut + elementsParPage;
      const utilisateursPagines = utilisateurs.slice(indexDebut, indexFin);

      // Mettre à jour les états
      setUtilisateurs(utilisateursPagines);
      setTotalElements(totalFiltres);
      setTotalPages(totalPagesCalcul);

    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs :', error);
      setUtilisateurs([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setChargement(false);
    }
  };

  const chargerRoles = async () => {
    try {
      // Données fictives des rôles
      const rolesMock = [
        { value: 'Administrateur Système', label: 'Administrateur Système' },
        { value: 'Enquêteur Principal', label: 'Enquêteur Principal' },
        { value: 'Analyste', label: 'Analyste' },
        { value: 'Observateur', label: 'Observateur' },
      ];
      setRoles(rolesMock);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
    }
  };

  const reinitialiserFiltres = () => {
    console.log('🔄 Réinitialisation des filtres');
    setRecherche('');
    setFiltreRole('');
    setFiltreStatut('');
    setPageActuelle(1);
  };

  const filtresActifs = recherche || filtreRole || filtreStatut;

  const handleExporter = async () => {
    try {
      const response = await fetch('/api/utilisateurs/exporter', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `utilisateurs_${new Date().toISOString()}.xlsx`;
        a.click();
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  const colonnes = [
    { id: 'nom', label: 'Nom Complet', sortable: true, render: (_, user) => `${user.nom} ${user.prenom}` },
    { id: 'matricule', label: 'Matricule', sortable: true },
    { id: 'email', label: 'Email', sortable: true },
    { id: 'role', label: 'Rôle', sortable: true },
    {
      id: 'statut',
      label: 'Statut',
      render: (statut, user) => {
        // Le premier paramètre est la valeur de la colonne, le second est l'objet complet
        // Utiliser user.statut si statut n'est pas défini
        const statutValue = statut || user?.statut || 'actif';
        // Normaliser le statut (minuscules, sans espaces)
        const statutNormalise = statutValue.toString().toLowerCase().trim();
        const badges = {
          actif: 'bg-green-100 text-green-800 border border-green-300',
          inactif: 'bg-red-100 text-red-800 border border-red-300',
          suspendu: 'bg-gray-100 text-gray-800 border border-gray-300',
        };
        const badgeClass = badges[statutNormalise] || badges.actif;
        // Afficher le statut avec la première lettre en majuscule
        const statutDisplay = statutNormalise.charAt(0).toUpperCase() + statutNormalise.slice(1);
        // Debug: afficher dans la console pour vérifier
        if (process.env.NODE_ENV === 'development') {
          console.log('Tableau - Statut:', statutValue, 'Normalisé:', statutNormalise, 'Badge:', badgeClass);
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
            {statutDisplay}
          </span>
        );
      }
    },
  ];

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
            onChange={(e) => setRecherche(e.target.value)}
            icone={Search}
          />

          <Select
            placeholder="Filtrer par rôle"
            value={filtreRole}
            onChange={(e) => setFiltreRole(e.target.value)}
            options={roles}
          />

          <Select
            placeholder="Tous les statuts"
            value={filtreStatut || ''}
            onChange={(e) => {
              const newValue = e.target.value || '';
              console.log('🔍 Filtre statut changé:', newValue);
              setFiltreStatut(newValue);
            }}
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
            
            const getStatutBadge = (statut, isConnected = false) => {
              // Si l'utilisateur est connecté, toujours afficher comme actif
              if (isConnected) {
                return 'bg-green-100 text-green-800 border border-green-300';
              }
              
              // Normaliser le statut (minuscules, sans espaces)
              const statutNormalise = (statut || 'actif').toString().toLowerCase().trim();
              const badges = {
                actif: 'bg-green-100 text-green-800 border border-green-300',
                inactif: 'bg-red-100 text-red-800 border border-red-300',
                suspendu: 'bg-gray-100 text-gray-800 border border-gray-300',
              };
              return badges[statutNormalise] || badges.actif;
            };
            
            const getStatutDisplay = (statut, isConnected = false) => {
              // Si l'utilisateur est connecté, afficher "Connecté"
              if (isConnected) {
                return 'Connecté';
              }
              // Sinon, afficher le statut normal
              const statutNormalise = (statut || 'actif').toString().toLowerCase().trim();
              return statutNormalise.charAt(0).toUpperCase() + statutNormalise.slice(1);
            };

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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutBadge(utilisateur.statut, isCurrentUser)}`}>
                          {getStatutDisplay(utilisateur.statut, isCurrentUser)}
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
                    {utilisateur.statut !== 'suspendu' && onSupprimer && (
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
                    {utilisateur.statut === 'suspendu' && isAdmin && onRestaurer && (
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

