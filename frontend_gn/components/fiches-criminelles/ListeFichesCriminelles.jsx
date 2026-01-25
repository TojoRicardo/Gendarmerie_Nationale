import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, FileText, Edit2, Trash2, Archive, RotateCcw, Eye, MoreVertical, ArchiveRestore } from 'lucide-react';
import CarteFicheCriminelle from './CarteFicheCriminelle';
import Tableau from '../commun/Tableau';
import Pagination from '../commun/Pagination';
import Bouton from '../commun/Bouton';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import SpinnerChargement from '../commun/SpinnerChargement';
import { usePermissions } from '../../src/hooks/usePermissions';
import { PERMISSIONS } from '../../src/utils/permissions';
import ProtectedAction from '../../src/components/ProtectedAction';
import { getCriminalFiles, getArchivedFiles } from '../../src/services/criminalFilesService';

const ListeFichesCriminelles = ({ onCreer, onModifier, onSupprimer, onDesarchiver, onVoir }) => {
  const { displayRestrictions, hasPermission, canModify, canDelete, isAdmin, isEnqueteurPrincipal } = usePermissions();

  const [fiches, setFiches] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [rechercheDebounced, setRechercheDebounced] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreNiveauDanger, setFiltreNiveauDanger] = useState('');
  const [affichage, setAffichage] = useState('grille');
  const [vueActuelle, setVueActuelle] = useState('actives'); // 'actives' ou 'archives'

  const [pageActuelle, setPageActuelle] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const elementsParPage = 12;

  // Mapper les niveaux de danger du backend (1-5) vers les libellés
  const getNiveauDangerLabel = (niveau) => {
    const mapping = {
      1: 'Faible',
      2: 'Modéré',
      3: 'Élevé',
      4: 'Très Élevé',
      5: 'Extrême'
    };
    return mapping[niveau] || 'Modéré';
  };

  // Forcer la vue "actives" pour les enquêteurs principaux
  useEffect(() => {
    if (isEnqueteurPrincipal && vueActuelle === 'archives') {
      setVueActuelle('actives');
    }
  }, [isEnqueteurPrincipal, vueActuelle]);

  // Debounce pour la recherche pour éviter trop de requêtes
  useEffect(() => {
    const timer = setTimeout(() => {
      setRechercheDebounced(recherche);
      // Réinitialiser à la page 1 quand on change les filtres
      setPageActuelle(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [recherche]);

  // Réinitialiser la page quand les autres filtres changent
  useEffect(() => {
    setPageActuelle(1);
  }, [filtreStatut, filtreNiveauDanger]);

  useEffect(() => {
    chargerFiches();
  }, [pageActuelle, rechercheDebounced, filtreStatut, filtreNiveauDanger, vueActuelle]);

  const chargerFiches = async () => {
    setChargement(true);
    try {
      let response;

      // Les enquêteurs principaux ne peuvent pas accéder aux archives
      // Si un enquêteur principal essaie d'accéder aux archives, charger les fiches actives
      if (vueActuelle === 'archives' && !isEnqueteurPrincipal) {
        // Charger les archives (uniquement si pas enquêteur principal)
        response = await getArchivedFiles();
      } else {
        // Appel API vers le backend Django pour les fiches actives
        // Ne pas envoyer les paramètres vides pour éviter les erreurs
      const params = {
        page: pageActuelle,
        exclude_archived: true, // Toujours exclure les fiches archivées de la liste principale
        };
        
        // Ajouter les paramètres seulement s'ils ne sont pas vides
        if (rechercheDebounced && rechercheDebounced.trim()) {
          params.search = rechercheDebounced.trim();
        }
        if (filtreStatut && filtreStatut.trim()) {
          params.statut = filtreStatut.trim();
        }
        if (filtreNiveauDanger && filtreNiveauDanger.trim()) {
          params.niveau_danger = filtreNiveauDanger.trim();
        }
        
        response = await getCriminalFiles(params);
      }

      // Adapter les données de l'API au format attendu par le frontend
      // DRF retourne {count, next, previous, results: [...]} pour la pagination
      const fichesData = Array.isArray(response) ? response : (response.results || []);
      const totalCount = response.count || fichesData.length;
      
      const fichesAdaptees = fichesData.map(fiche => ({
        id: fiche.id,
        numeroDossier: fiche.numero_fiche || fiche.numero_dossier,
        description: fiche.description || fiche.motif_arrestation || 'Aucune description',
        suspect: fiche.nom && fiche.prenom ? { nom: fiche.nom, prenom: fiche.prenom } : null,
        infractions: fiche.infractions || [],
        lieu: fiche.adresse || fiche.lieu_arrestation || fiche.lieu || 'Non spécifié',
        dateOuverture: fiche.date_creation || fiche.date_arrestation || fiche.dateOuverture,
        statut: fiche.statut_fiche?.code || fiche.statut || 'en_cours',
        niveauDanger: fiche.niveau_danger || 2, // Garder la valeur entière
        niveauDangerLabel: getNiveauDangerLabel(fiche.niveau_danger || 2), // Ajouter le libellé
        created_by: fiche.created_by || fiche.createur_id || fiche.user_id || null,
      }));

      setFiches(fichesAdaptees);
      setTotalElements(totalCount);
      setTotalPages(Math.ceil(totalCount / elementsParPage));
    } catch (error) {
      console.error('Erreur lors du chargement des fiches:', error);
      setFiches([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setChargement(false);
    }
  };

  const colonnes = [
    { id: 'numeroDossier', label: 'N° Dossier', sortable: true },
    {
      id: 'suspect',
      label: 'Suspect',
      render: (_, fiche) => fiche.suspect ? `${fiche.suspect.nom} ${fiche.suspect.prenom}` : '-'
    },
    { id: 'lieu', label: 'Lieu' },
    {
      id: 'dateOuverture',
      label: 'Date',
      sortable: true,
      render: (date) => new Date(date).toLocaleDateString('fr-FR')
    },
    {
      id: 'statut',
      label: 'Statut',
      render: (statut) => {
        const badges = {
          'en_cours': { bg: 'bg-gendarme-gold/10', text: 'text-gendarme-gold-dark' },
          'cloture': { bg: 'bg-gendarme-green/10', text: 'text-gendarme-green-dark' },
          'en_attente': { bg: 'bg-gendarme-light/10', text: 'text-gendarme-light' },
          'archive': { bg: 'bg-gray-100', text: 'text-gray-800' },
        };
        const labels = {
          'en_cours': 'En cours',
          'cloture': 'Clôturé',
          'en_attente': 'En attente',
          'archive': 'Archivé',
        };
        const badge = badges[statut] || badges['en_cours'];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
            {labels[statut]}
          </span>
        );
      }
    },
    {
      id: 'niveauDangerLabel',
      label: 'Danger',
      render: (label, fiche) => {
        const niveau = fiche.niveauDanger;
        const badges = {
          1: { bg: 'bg-gendarme-green/10', text: 'text-gendarme-green-dark' }, // Faible
          2: { bg: 'bg-gendarme-gold/10', text: 'text-gendarme-gold-dark' },   // Modéré
          3: { bg: 'bg-orange-100', text: 'text-orange-700' },                  // Élevé
          4: { bg: 'bg-gendarme-light/10', text: 'text-gendarme-light' },      // Très Élevé
          5: { bg: 'bg-gendarme-red/10', text: 'text-gendarme-red-dark' },     // Extrême
        };
        const badge = badges[niveau] || badges[2];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
            {label}
          </span>
        );
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (_, fiche) => {
        const hasViewPermission = true; // Tout le monde peut voir
        const hasEditPermission = hasPermission(PERMISSIONS.FICHES_EDIT) && canModify(fiche.created_by);
        const hasDeletePermission = hasPermission(PERMISSIONS.FICHES_DELETE) && canDelete(fiche.created_by);
        const isArchived = vueActuelle === 'archives' || fiche.is_archived;
        const hasUnarchivePermission = isAdmin && isArchived && hasPermission(PERMISSIONS.FICHES_DELETE) && canDelete(fiche.created_by);
        
        if (!hasViewPermission && !hasEditPermission && !hasDeletePermission && !hasUnarchivePermission) {
          return <span className="text-gray-400 text-sm">-</span>;
        }
        
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {hasViewPermission && onVoir && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVoir(fiche);
                }}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all hover:scale-110 active:scale-95 hover:shadow-md"
                title="Voir les détails"
                aria-label="Voir les détails"
              >
                <Eye size={16} />
              </button>
            )}
            {hasEditPermission && !isArchived && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onModifier(fiche);
                }}
                className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition-all hover:scale-110 active:scale-95 hover:shadow-md"
                title="Modifier"
                aria-label="Modifier la fiche"
              >
                <Edit2 size={16} />
              </button>
            )}
            {hasDeletePermission && !isArchived && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSupprimer(fiche);
                }}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all hover:scale-110 active:scale-95 hover:shadow-md"
                title="Supprimer"
                aria-label="Supprimer la fiche"
              >
                <Trash2 size={16} />
              </button>
            )}
            {hasUnarchivePermission && onDesarchiver && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDesarchiver(fiche);
                }}
                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all hover:scale-110 active:scale-95 hover:shadow-md"
                title="Désarchiver"
                aria-label="Désarchiver la fiche"
              >
                <ArchiveRestore size={16} />
              </button>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div className="space-y-6">
      {/* Barre d'actions avec gradient */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-gray-100">
        <div className="flex items-center space-x-3">
          <div className={`p-3 bg-gradient-to-br ${vueActuelle === 'archives' ? 'from-purple-600 to-purple-700' : 'from-gendarme-blue to-gendarme-blue-dark'} rounded-xl shadow-lg`}>
            {vueActuelle === 'archives' ? <Archive className="text-white" size={24} /> : <FileText className="text-white" size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gendarme-dark">Liste des Fiches</h2>
            <p className="text-gray-600 mt-1 font-medium">
              <span className={`font-bold ${vueActuelle === 'archives' ? 'text-purple-600' : 'text-gendarme-blue'}`}>{totalElements}</span> fiche(s) trouvée(s)
            </p>
          </div>
        </div>

        {/* Bouton Nouvelle Fiche - Visible uniquement pour ceux qui peuvent créer */}
        {displayRestrictions.showCreateButtons && vueActuelle === 'actives' && (
          <ProtectedAction permission={PERMISSIONS.FICHES_CREATE}>
            <div className="flex space-x-3">
              <button
                onClick={onCreer}
                className="px-6 py-3 text-white rounded-xl font-semibold transition-all hover:scale-105 flex items-center space-x-2 shadow-lg"
                style={{ backgroundColor: '#00BF29' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00A923'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00BF29'}
              >
                <Plus size={20} />
                <span>Nouvelle Fiche</span>
              </button>
            </div>
          </ProtectedAction>
        )}
      </div>

      {/* Onglets pour basculer entre actives et archives */}
      {/* Masquer l'onglet Archives pour les enquêteurs principaux */}
      {!isEnqueteurPrincipal && (
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => {
            setVueActuelle('actives');
            setPageActuelle(1);
            setRecherche('');
            setFiltreStatut('');
            setFiltreNiveauDanger('');
          }}
          className={`px-6 py-3 font-semibold border-b-2 transition-all ${
            vueActuelle === 'actives'
              ? 'border-gendarme-blue text-gendarme-blue bg-blue-50'
              : 'border-transparent text-gray-600 hover:text-gendarme-blue hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText size={20} />
            <span>Fiches Actives</span>
          </div>
        </button>
        <button
          onClick={() => {
            setVueActuelle('archives');
            setPageActuelle(1);
            setRecherche('');
            setFiltreStatut('');
            setFiltreNiveauDanger('');
          }}
          className={`px-6 py-3 font-semibold border-b-2 transition-all ${
            vueActuelle === 'archives'
              ? 'border-purple-600 text-purple-600 bg-purple-50'
              : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Archive size={20} />
            <span>Archives</span>
          </div>
        </button>
      </div>
      )}

      {/* Filtres modernes avec glassmorphism */}
      <div className="glass-effect p-6 rounded-2xl shadow-lg border border-gray-200">
        {vueActuelle === 'actives' ? (
          <>
        <div className="flex items-center mb-4">
          <Filter className="text-gendarme-blue mr-2" size={20} />
          <h3 className="font-bold text-gendarme-dark">Filtres de recherche</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ChampTexte
            placeholder="Rechercher par nom, prénom ou numéro..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            icone={Search}
          />

          <Select
            placeholder="Tous les statuts"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'en_cours', label: 'En cours' },
              { value: 'en_attente', label: 'En attente' },
              { value: 'cloture', label: 'Clôturé' },
            ]}
          />

          <Select
            placeholder="Tous les niveaux"
            value={filtreNiveauDanger}
            onChange={(e) => setFiltreNiveauDanger(e.target.value)}
            options={[
              { value: '', label: 'Tous les niveaux' },
              { value: '1', label: 'Faible' },
              { value: '2', label: 'Modéré' },
              { value: '3', label: 'Élevé' },
              { value: '4', label: 'Très Élevé' },
              { value: '5', label: 'Extrême' },
            ]}
          />

          <div className="flex space-x-2">
            <button
              onClick={() => {
                setRecherche('');
                setRechercheDebounced('');
                setFiltreStatut('');
                setFiltreNiveauDanger('');
                setPageActuelle(1);
              }}
              className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-xl transition-all border-2 border-gray-300 hover:border-gray-400 hover:shadow-lg flex items-center justify-center active:scale-95"
              title="Réinitialiser les filtres"
            >
              <RotateCcw size={20} className="transition-transform hover:rotate-180" />
            </button>
            <button
              onClick={() => setAffichage('grille')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${affichage === 'grille'
                ? 'bg-gradient-to-r from-gendarme-blue to-gendarme-blue-dark text-white shadow-lg scale-105'
                : 'bg-white text-gendarme-dark hover:bg-gendarme-gray border-2 border-gray-200'
                }`}
            >
              Grille
            </button>
            <button
              onClick={() => setAffichage('tableau')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${affichage === 'tableau'
                ? 'bg-gradient-to-r from-gendarme-blue to-gendarme-blue-dark text-white shadow-lg scale-105'
                : 'bg-white text-gendarme-dark hover:bg-gendarme-gray border-2 border-gray-200'
                }`}
            >
              Tableau
            </button>
          </div>
        </div>
          </>
        ) : (
          <div className="flex items-center justify-end">
            <p className="text-gray-600 mr-4">Affichage des fiches archivées</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setAffichage('grille')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${affichage === 'grille'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
              >
                Grille
              </button>
              <button
                onClick={() => setAffichage('tableau')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${affichage === 'tableau'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
              >
                Tableau
              </button>
            </div>
          </div>
        )}
      </div>

      {chargement ? (
        <SpinnerChargement texte="Chargement des fiches..." />
      ) : affichage === 'grille' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fiches.map((fiche) => (
            <CarteFicheCriminelle
              key={fiche.id}
              fiche={fiche}
              onModifier={onModifier}
              onSupprimer={onSupprimer}
              onVoir={onVoir}
              isArchived={vueActuelle === 'archives'}
            />
          ))}
        </div>
      ) : (
        <Tableau
          colonnes={colonnes}
          donnees={fiches}
          onRowClick={onVoir}
          chargement={chargement}
        />
      )}

      {!chargement && fiches.length > 0 && (
        <Pagination
          pageActuelle={pageActuelle}
          totalPages={totalPages}
          totalElements={totalElements}
          elementsParPage={elementsParPage}
          onPageChange={setPageActuelle}
        />
      )}

      {!chargement && fiches.length === 0 && (
        <div className="card-pro p-12 text-center">
          <div className="inline-flex p-6 bg-gray-100 rounded-full mb-6">
            <FileText size={64} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gendarme-dark mb-2">Aucune fiche trouvée</h3>
          <p className="text-gray-500 mb-6">
            Essayez de modifier vos critères de recherche
          </p>
        </div>
      )}
    </div>
  );
};

export default ListeFichesCriminelles;

