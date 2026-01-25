import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Shield, X } from 'lucide-react';
import CarteRole from './CarteRole';
import Tableau from '../commun/Tableau';
import Pagination from '../commun/Pagination';
import Bouton from '../commun/Bouton';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import SpinnerChargement from '../commun/SpinnerChargement';
import { getUsers } from '../../src/services/authService';

const ListeRoles = ({ onCreer, onModifier, onSupprimer, onVoir }) => {
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [affichage, setAffichage] = useState('grille'); // 'grille' ou 'tableau'
  
  // Pagination
  const [pageActuelle, setPageActuelle] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const elementsParPage = 12;

  useEffect(() => {
    chargerRoles();
  }, [pageActuelle, recherche, filtreStatut]);

  // Réinitialiser la page à 1 quand les filtres changent
  useEffect(() => {
    setPageActuelle(1);
  }, [recherche, filtreStatut]);

  const chargerRoles = async () => {
    setChargement(true);
    try {
      // Récupérer les utilisateurs pour calculer le nombre réel par rôle
      let utilisateurs = [];
      try {
        const response = await getUsers();
        utilisateurs = Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        utilisateurs = [];
      }

      // Définition des rôles avec leurs informations
      const rolesMock = [
        {
          id: 1,
          nom: 'Administrateur Système',
          code: 'ADMIN',
          description: 'Accès complet au système avec tous les privilèges',
          nombrePermissions: 24,
          estActif: true,
          couleur: 'blue'
        },
        {
          id: 2,
          nom: 'Enquêteur Principal',
          code: 'ENQUETEUR',
          description: 'Peut créer, modifier et gérer les fiches criminelles',
          nombrePermissions: 15,
          estActif: true,
          couleur: 'emerald'
        },
        {
          id: 3,
          nom: 'Analyste',
          code: 'ANALYSTE',
          description: 'Lecture seule avec accès aux rapports et statistiques',
          nombrePermissions: 8,
          estActif: true,
          couleur: 'blue'
        },
        {
          id: 4,
          nom: 'Observateur',
          code: 'OBSERVATEUR',
          description: 'Consultation limitée des informations non sensibles',
          nombrePermissions: 4,
          estActif: true,
          couleur: 'orange'
        },
      ];

      // Calculer le nombre réel d'utilisateurs par rôle
      const rolesAvecComptage = rolesMock.map(role => {
        const nombreUtilisateurs = utilisateurs.filter(
          u => u.role === role.nom || u.role === role.code
        ).length;
        
        return {
          ...role,
          nombreUtilisateurs
        };
      });

      // Filtrer les rôles
      let rolesFiltres = rolesAvecComptage;

      // Filtre de recherche textuelle
      if (recherche) {
        rolesFiltres = rolesFiltres.filter(
          r => 
            r.nom.toLowerCase().includes(recherche.toLowerCase()) ||
            r.code.toLowerCase().includes(recherche.toLowerCase()) ||
            r.description.toLowerCase().includes(recherche.toLowerCase())
        );
      }

      // Filtre par statut
      if (filtreStatut) {
        const estActif = filtreStatut === 'actif';
        rolesFiltres = rolesFiltres.filter(r => r.estActif === estActif);
      }

      // Calculer la pagination sur les résultats filtrés
      const totalFiltres = rolesFiltres.length;
      const totalPagesCalcul = Math.ceil(totalFiltres / elementsParPage);
      
      // Appliquer la pagination
      const indexDebut = (pageActuelle - 1) * elementsParPage;
      const indexFin = indexDebut + elementsParPage;
      const rolesPagines = rolesFiltres.slice(indexDebut, indexFin);

      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 500));

      setRoles(rolesPagines);
      setTotalElements(totalFiltres);
      setTotalPages(totalPagesCalcul);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
    } finally {
      setChargement(false);
    }
  };

  const reinitialiserFiltres = () => {
    setRecherche('');
    setFiltreStatut('');
    setPageActuelle(1);
  };

  const filtresActifs = recherche || filtreStatut;

  const colonnes = [
    { 
      id: 'nom', 
      label: 'Nom du rôle', 
      sortable: true,
      render: (nom, role) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">{nom.charAt(0)}</span>
          </div>
          <div>
            <div className="font-medium">{nom}</div>
            <div className="text-xs text-gray-500">{role.code}</div>
          </div>
        </div>
      ),
    },
    { id: 'description', label: 'Description', render: (desc) => desc || '-' },
    { 
      id: 'nombreUtilisateurs', 
      label: 'Utilisateurs', 
      sortable: true,
      render: (nb) => <span className="font-bold text-blue-600">{nb || 0}</span>,
    },
    { 
      id: 'nombrePermissions', 
      label: 'Permissions', 
      sortable: true,
      render: (nb) => <span className="font-bold text-green-600">{nb || 0}</span>,
    },
    { 
      id: 'estActif', 
      label: 'Statut', 
      render: (estActif) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          estActif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {estActif ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Barre d'actions avec gradient */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl shadow-lg" style={{ background: 'linear-gradient(to bottom right, #185CD6, #1348A8)' }}>
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Liste des Rôles</h2>
            <p className="text-gray-600 mt-1 font-medium">
              <span className="font-bold" style={{ color: '#185CD6' }}>{totalElements}</span> rôle(s) trouvé(s)
            </p>
          </div>
        </div>
      </div>

      {/* Filtres modernes avec glassmorphism */}
      <div className="glass-effect p-6 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Filter className="mr-2" style={{ color: '#185CD6' }} size={20} />
            <h3 className="font-bold text-gray-900">Filtres de recherche</h3>
            {filtresActifs && (
              <span className="ml-3 px-2 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#185CD61A', color: '#185CD6' }}>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <ChampTexte
              placeholder="Rechercher un rôle par nom, code..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              icone={Search}
            />
          </div>

          <Select
            placeholder="Filtrer par statut"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            options={[
              { value: 'actif', label: 'Actif' },
              { value: 'inactif', label: 'Inactif' },
            ]}
          />

          <div className="flex space-x-2">
            <button
              onClick={() => setAffichage('grille')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                affichage === 'grille' 
                  ? 'text-white shadow-lg' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
              }`}
              style={affichage === 'grille' ? { background: 'linear-gradient(to right, #185CD6, #1348A8)' } : {}}
            >
               Grille
            </button>
            <button
              onClick={() => setAffichage('tableau')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                affichage === 'tableau' 
                  ? 'text-white shadow-lg' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
              }`}
              style={affichage === 'tableau' ? { background: 'linear-gradient(to right, #185CD6, #1348A8)' } : {}}
            >
              Tableau
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {chargement ? (
        <SpinnerChargement texte="Chargement des rôles..." />
      ) : affichage === 'grille' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <CarteRole
              key={role.id}
              role={role}
              onModifier={onModifier}
              onSupprimer={onSupprimer}
              onVoir={onVoir}
            />
          ))}
        </div>
      ) : (
        <Tableau
          colonnes={colonnes}
          donnees={roles}
          onRowClick={onVoir}
          chargement={chargement}
        />
      )}

      {/* Pagination */}
      {!chargement && roles.length > 0 && (
        <Pagination
          pageActuelle={pageActuelle}
          totalPages={totalPages}
          totalElements={totalElements}
          elementsParPage={elementsParPage}
          onPageChange={setPageActuelle}
        />
      )}

      {/* Message si aucun résultat */}
      {!chargement && roles.length === 0 && (
        <div className="card-pro p-12 text-center">
          <div className="inline-flex p-6 bg-gray-100 rounded-full mb-6">
            <Shield size={64} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun rôle trouvé</h3>
          <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
        </div>
      )}
    </div>
  );
};

export default ListeRoles;

