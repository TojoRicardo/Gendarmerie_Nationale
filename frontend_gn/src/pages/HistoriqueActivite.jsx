/**
 * Page "Historique / Journal d'activité"
 * Interface complète pour consulter l'historique des actions utilisateur
 */

import React, { useState, useEffect } from 'react';
import { 
  History, Calendar, User, Filter, Search,
  RefreshCw, CheckCircle, XCircle, Clock, Activity,
  ChevronLeft, ChevronRight, FileText, Trash2, AlertTriangle
} from 'lucide-react';
import { getAuditEntries, getAuditStatistics, clearAllAuditLogs } from '../services/auditService';
import { getUsers } from '../services/authService';
import { useToast } from '../context/ToastContext';
import SpinnerChargement from '../../components/commun/SpinnerChargement';
import ChampTexte from '../../components/commun/ChampTexte';
import Select from '../../components/commun/Select';

const HistoriqueActivite = () => {
  const { showSuccess, showError } = useToast();
  
  // États
  const [activites, setActivites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [pageActuelle, setPageActuelle] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [elementsParPage] = useState(20);
  
  // Filtres
  const [filtres, setFiltres] = useState({
    dateDebut: '',
    dateFin: '',
    utilisateur: '',
    action: '',
    module: '',
    recherche: ''
  });
  
  // Options
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [statistiques, setStatistiques] = useState(null);
  const [showFiltres, setShowFiltres] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Actions disponibles
  const actionsDisponibles = [
    { value: '', label: 'Toutes les actions' },
    { value: 'LOGIN', label: 'Connexion' },
    { value: 'LOGOUT', label: 'Déconnexion' },
    { value: 'VIEW', label: 'Consultation' },
    { value: 'CREATE', label: 'Création' },
    { value: 'UPDATE', label: 'Modification' },
    { value: 'DELETE', label: 'Suppression' },
    { value: 'DOWNLOAD', label: 'Téléchargement' },
    { value: 'UPLOAD', label: 'Téléversement' },
    { value: 'SEARCH', label: 'Recherche' },
    { value: 'NAVIGATION', label: 'Navigation' },
  ];

  // Modules disponibles
  const modulesDisponibles = [
    { value: '', label: 'Tous les modules' },
    { value: 'Enquête', label: 'Enquêtes' },
    { value: 'Fiche Criminelle', label: 'Fiches Criminelles' },
    { value: 'Rapport', label: 'Rapports' },
    { value: 'Utilisateur', label: 'Utilisateurs' },
    { value: 'Navigation', label: 'Navigation' },
    { value: 'Système', label: 'Système' },
  ];

  // Charger les données au montage
  useEffect(() => {
    chargerUtilisateurs();
    chargerStatistiques();
  }, []);

  // Charger les activités quand les filtres ou la page changent
  useEffect(() => {
    chargerActivites();
  }, [pageActuelle, filtres]);

  const chargerUtilisateurs = async () => {
    try {
      const response = await getUsers({ limit: 1000 });
      const usersList = Array.isArray(response) ? response : (response.results || []);
      const utilisateursFormates = usersList.map(user => ({
        value: user.id?.toString() || user.pk?.toString() || '',
        label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Utilisateur'
      }));
      setUtilisateurs(utilisateursFormates);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setUtilisateurs([]);
    }
  };

  const chargerStatistiques = async () => {
    try {
      const stats = await getAuditStatistics();
      setStatistiques(stats);
    } catch (error) {
      if (!error.isNetworkError) {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    }
  };

  const chargerActivites = async () => {
    setChargement(true);
    try {
      // Préparer les paramètres
      const params = {
        page: pageActuelle,
        page_size: elementsParPage,
        group_by_session: false, // Afficher toutes les actions individuellement
      };

      // Ajouter les filtres non vides
      if (filtres.dateDebut) params.date_debut = filtres.dateDebut;
      if (filtres.dateFin) params.date_fin = filtres.dateFin;
      if (filtres.utilisateur) params.utilisateur = filtres.utilisateur;
      if (filtres.action) params.action = filtres.action;
      if (filtres.module) params.module = filtres.module;
      if (filtres.recherche) params.search = filtres.recherche;

      const data = await getAuditEntries(params);
      
      setActivites(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalElements(data.count || 0);
    } catch (error) {
      if (!error.isNetworkError) {
        console.error('Erreur lors du chargement des activités:', error);
      }
      setActivites([]);
    } finally {
      setChargement(false);
    }
  };

  const handleFiltreChange = (name, value) => {
    setFiltres(prev => ({ ...prev, [name]: value }));
    setPageActuelle(1); // Réinitialiser à la première page
  };

  const handleReinitialiser = () => {
    setFiltres({
      dateDebut: '',
      dateFin: '',
      utilisateur: '',
      action: '',
      module: '',
      recherche: ''
    });
    setPageActuelle(1);
  };

  const getActionLabel = (action) => {
    const actionMap = {
      'LOGIN': 'Connexion',
      'LOGOUT': 'Déconnexion',
      'VIEW': 'Consultation',
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression',
      'DOWNLOAD': 'Téléchargement',
      'UPLOAD': 'Téléversement',
      'SEARCH': 'Recherche',
      'NAVIGATION': 'Navigation',
    };
    return actionMap[action] || action;
  };

  const getActionColor = (action) => {
    const colorMap = {
      'LOGIN': 'bg-green-100 text-green-700',
      'LOGOUT': 'bg-gray-100 text-gray-700',
      'VIEW': 'bg-blue-100 text-blue-700',
      'CREATE': 'bg-emerald-100 text-emerald-700',
      'UPDATE': 'bg-yellow-100 text-yellow-700',
      'DELETE': 'bg-red-100 text-red-700',
      'DOWNLOAD': 'bg-purple-100 text-purple-700',
      'UPLOAD': 'bg-indigo-100 text-indigo-700',
      'SEARCH': 'bg-cyan-100 text-cyan-700',
      'NAVIGATION': 'bg-slate-100 text-slate-700',
    };
    return colorMap[action] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const nombreFiltresActifs = Object.values(filtres).filter(v => v && v !== '').length;

  const handleClearAll = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await clearAllAuditLogs();
      setShowConfirmDelete(false);
      
      // Construire un message détaillé et informatif
      const deletedCounts = result.deleted_count || {};
      const auditLogsCount = deletedCounts.audit_logs || 0;
      const pinLogsCount = deletedCounts.pin_audit_logs || 0;
      const totalDeleted = deletedCounts.total || auditLogsCount + pinLogsCount || 0;
      
      let message = '';
      if (totalDeleted > 0) {
        const parts = [];
        if (auditLogsCount > 0) {
          parts.push(`${auditLogsCount} entrée${auditLogsCount > 1 ? 's' : ''} du journal d'audit principal`);
        }
        if (pinLogsCount > 0) {
          parts.push(`${pinLogsCount} entrée${pinLogsCount > 1 ? 's' : ''} du journal d'audit PIN`);
        }
        message = `${totalDeleted} entrée${totalDeleted > 1 ? 's' : ''} supprimée${totalDeleted > 1 ? 's' : ''} avec succès${parts.length > 0 ? ` (${parts.join(', ')})` : ''}.`;
      } else {
        message = 'Aucune entrée à supprimer.';
      }
      
      // Recharger les données
      await chargerActivites();
      await chargerStatistiques();
      
      // Afficher un toast de succès avec un message amélioré
      showSuccess(message, 'Suppression réussie');
    } catch (error) {
      const errorMessage = error.message || 'Une erreur est survenue lors de la suppression des logs d\'audit.';
      setDeleteError(errorMessage);
      showError(errorMessage, 'Erreur de suppression');
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
                <History className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Historique / Journal d'activité</h1>
                <p className="text-gray-600 mt-1">
                  Consultation de l'historique complet des actions utilisateur
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {statistiques && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total d'activités</div>
                  <div className="text-2xl font-bold text-blue-600">{statistiques.total || totalElements}</div>
                </div>
              )}
              <button
                onClick={() => setShowFiltres(!showFiltres)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Filter size={18} />
                <span>Filtres</span>
                {nombreFiltresActifs > 0 && (
                  <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                    {nombreFiltresActifs}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={18} />
                <span>Effacer tout</span>
              </button>
            </div>
          </div>
        </div>

      {/* Filtres */}
      {showFiltres && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date de début */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="mr-2" size={16} />
                  Date de début
                </label>
                <ChampTexte
                  name="dateDebut"
                  type="date"
                  value={filtres.dateDebut}
                  onChange={(e) => handleFiltreChange('dateDebut', e.target.value)}
                />
              </div>

              {/* Date de fin */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="mr-2" size={16} />
                  Date de fin
                </label>
                <ChampTexte
                  name="dateFin"
                  type="date"
                  value={filtres.dateFin}
                  onChange={(e) => handleFiltreChange('dateFin', e.target.value)}
                />
              </div>

              {/* Utilisateur */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="mr-2" size={16} />
                  Utilisateur
                </label>
                <Select
                  name="utilisateur"
                  value={filtres.utilisateur}
                  onChange={(e) => handleFiltreChange('utilisateur', e.target.value)}
                  options={[
                    { value: '', label: 'Tous les utilisateurs' },
                    ...utilisateurs
                  ]}
                />
              </div>

              {/* Action */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Activity className="mr-2" size={16} />
                  Action
                </label>
                <Select
                  name="action"
                  value={filtres.action}
                  onChange={(e) => handleFiltreChange('action', e.target.value)}
                  options={actionsDisponibles}
                />
              </div>

              {/* Module */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FileText className="mr-2" size={16} />
                  Module
                </label>
                <Select
                  name="module"
                  value={filtres.module}
                  onChange={(e) => handleFiltreChange('module', e.target.value)}
                  options={modulesDisponibles}
                />
              </div>

              {/* Recherche */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Search className="mr-2" size={16} />
                  Recherche
                </label>
                <ChampTexte
                  name="recherche"
                  type="text"
                  value={filtres.recherche}
                  onChange={(e) => handleFiltreChange('recherche', e.target.value)}
                  placeholder="Rechercher dans les descriptions..."
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleReinitialiser}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={18} />
                <span>Réinitialiser</span>
              </button>
              <button
                onClick={() => setShowFiltres(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des activités */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {chargement ? (
            <div className="p-12">
              <SpinnerChargement texte="Chargement de l'historique..." />
            </div>
          ) : activites.length === 0 ? (
            <div className="p-12 text-center">
              <History className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg">Aucune activité trouvée</p>
              <p className="text-gray-400 text-sm mt-2">
                {nombreFiltresActifs > 0 
                  ? 'Essayez de modifier vos filtres de recherche'
                  : 'Aucune activité enregistrée pour le moment'}
              </p>
            </div>
          ) : (
            <>
              {/* Tableau */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date/Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Module
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activites.map((activite) => (
                      <tr key={activite.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Clock className="text-gray-400" size={16} />
                            <span className="text-sm text-gray-900">
                              {formatDate(activite.timestamp || activite.date_action)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <User className="text-gray-400" size={16} />
                            <span className="text-sm text-gray-900">
                              {activite.user_display || 
                               activite.utilisateur_display || 
                               activite.utilisateur_info?.full_name || 
                               activite.utilisateur_info?.username || 
                               'Système'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(activite.action)}`}>
                            {getActionLabel(activite.action || activite.action_display)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {activite.resource_type || activite.ressource || activite.module || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md truncate" title={activite.description || activite.description_short}>
                            {activite.description_short || activite.description || 'N/A'}
                          </div>
                          {activite.frontend_route && (
                            <div className="text-xs text-gray-500 mt-1">
                              Route: {activite.frontend_route}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {activite.ip_address || activite.ip_adresse || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {activite.reussi !== false ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckCircle size={18} />
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-600">
                              <XCircle size={18} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Affichage de <span className="font-medium">{(pageActuelle - 1) * elementsParPage + 1}</span> à{' '}
                    <span className="font-medium">
                      {Math.min(pageActuelle * elementsParPage, totalElements)}
                    </span>{' '}
                    sur <span className="font-medium">{totalElements}</span> résultats
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPageActuelle(prev => Math.max(1, prev - 1))}
                      disabled={pageActuelle === 1}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Page {pageActuelle} sur {totalPages}
                    </span>
                    <button
                      onClick={() => setPageActuelle(prev => Math.min(totalPages, prev + 1))}
                      disabled={pageActuelle === totalPages}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* Modale de confirmation de suppression */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Confirmer la suppression</h2>
              </div>
              <p className="text-gray-700 mb-2">
                Êtes-vous sûr de vouloir supprimer <strong>tous</strong> les logs d'audit ?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Cette action est irréversible et supprimera définitivement toutes les entrées du journal d'audit.
              </p>
              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{deleteError}</p>
                </div>
              )}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      <span>Supprimer tout</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoriqueActivite;

