import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Calendar, Search, Download,
  Activity, TrendingUp, AlertTriangle,
  X, CheckCircle, Brain, FileText, Trash2
} from 'lucide-react';
import Pagination from '../commun/Pagination';
import SpinnerChargement from '../commun/SpinnerChargement';
import AuditEntryCard from './AuditEntryCard';
import AnalyseRapport from './AnalyseRapport';
import { getAuditEntries, getAuditStatistics, searchAudit, clearAllAuditLogs } from '../../src/services/auditService';
import { useToast } from '../../src/context/ToastContext';
import '../../src/styles/audit-animations.css';

const TableauAudit = ({ filtres = {} }) => {
  const { showSuccess, showError } = useToast();
  
  const [journaux, setJournaux] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [pageActuelle, setPageActuelle] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [recherche, setRecherche] = useState('');
  const [statistiques, setStatistiques] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [showAnalyseRapport, setShowAnalyseRapport] = useState(false);
  const [allEntriesForAnalysis, setAllEntriesForAnalysis] = useState([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const elementsParPage = 20;

  // Charger les statistiques au montage
  useEffect(() => {
    chargerStatistiques();
  }, []);

  // Charger les journaux quand la page ou les filtres changent
  useEffect(() => {
    chargerJournaux();
  }, [pageActuelle, filtres, recherche]);

  const chargerStatistiques = async () => {
    try {
      const stats = await getAuditStatistics();
      setStatistiques(stats);
    } catch (error) {
      // Ne pas logger les erreurs réseau (serveur non disponible)
      if (!error.isNetworkError) {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
      // Utiliser des statistiques par défaut en cas d'erreur réseau
      if (error.isNetworkError) {
        setStatistiques(null); // null indique que les stats ne sont pas disponibles
      }
    }
  };

  const chargerJournaux = async () => {
    setChargement(true);
    setErreur(null);
    try {
      let data;
      
      // Préparer les paramètres de requête
      // Ne pas envoyer les filtres vides pour afficher tout
      const params = {
        page: pageActuelle,
        page_size: elementsParPage,
        group_by_session: false, // Ne pas grouper par défaut pour voir toutes les actions
      };
      
      // Ajouter seulement les filtres non vides
      if (filtres.dateDebut) params.date_debut = filtres.dateDebut;
      if (filtres.dateFin) params.date_fin = filtres.dateFin;
      if (filtres.utilisateur) params.utilisateur = filtres.utilisateur;
      if (filtres.action) params.action = filtres.action;
      if (filtres.ressource) params.ressource = filtres.ressource;
      if (filtres.module) params.module = filtres.module;
      
      if (recherche && recherche.trim()) {
        // Utiliser l'endpoint de recherche
        data = await searchAudit(recherche.trim(), params);
      } else {
        // Utiliser l'endpoint normal avec filtres (ou sans si aucun filtre)
        data = await getAuditEntries(params);
      }
      
      // Vérifier si les données sont des sessions groupées
      const isGroupedBySession = data.results && data.results.length > 0 && data.results[0].session_id;
      
      // Adapter les données au format attendu par le composant
      const journauxAdaptes = (data.results || data).map(entry => {
        // Si c'est une session groupée, créer une entrée consolidée
        if (isGroupedBySession && entry.session_id && entry.actions) {
          // Créer une description consolidée de toutes les actions de la session
          const actionsList = entry.actions || [];
          const actionsSummary = entry.actions_summary || {};
          const actionsText = Object.entries(actionsSummary)
            .map(([action, count]) => `${count} ${action}`)
            .join(', ');
          
          // Utiliser la première action pour les informations de base
          const firstAction = actionsList[0] || {};
          
          // Créer une description consolidée
          const sessionDescription = entry.description_short || 
            `Session de ${entry.user_display || 'Utilisateur'} - ${entry.actions_count || 0} action(s) : ${actionsText}`;
          
          return {
            ...entry, // Conserver toutes les données originales de la session
            id: entry.session_id || firstAction.id, // Utiliser session_id comme ID unique
            is_session: true, // Flag pour indiquer que c'est une session
            session_id: entry.session_id,
            date_action: entry.start_time || firstAction.timestamp,
            utilisateur_display: entry.user_display || firstAction.user_display || 'Système',
            action: 'SESSION', // Action spéciale pour les sessions
            action_display: `Session (${entry.actions_count || 0} action(s))`,
            ressource: `Session ${entry.session_id}`,
            ressource_id: entry.session_id,
            description: sessionDescription,
            description_narrative: sessionDescription,
            ip_adresse: entry.ip_address || firstAction.ip_address,
            user_agent: firstAction.user_agent || null,
            endpoint: null, // Pas d'endpoint unique pour une session
            methode_http: null,
            duree_ms: entry.duration_minutes ? entry.duration_minutes * 60 * 1000 : null,
            reussi: true, // Par défaut, une session est réussie
            message_erreur: null,
            details: {
              session_id: entry.session_id,
              actions_count: entry.actions_count,
              actions_summary: actionsSummary,
              start_time: entry.start_time,
              end_time: entry.end_time,
              duration_minutes: entry.duration_minutes,
              all_actions: actionsList, // Toutes les actions de la session
            },
            ai_result: null,
          };
        }
        
        // Format normal pour les entrées individuelles
        return {
          ...entry, // Conserver toutes les données originales
          id: entry.id,
          is_session: false,
          date_action: entry.date_action || entry.timestamp,
          utilisateur_display: entry.utilisateur_display || entry.utilisateur_info?.full_name || entry.utilisateur_info?.username || 'Système',
          action: entry.action,
          action_display: entry.action_display || entry.action,
          ressource: entry.ressource || entry.resource_type,
          ressource_id: entry.ressource_id || entry.resource_id,
          // Priorité: description_narrative (LLaMA) > description
          description: entry.description_narrative || entry.description || `Action ${entry.action_display || entry.action} sur ${entry.ressource || entry.resource_type}`,
          description_narrative: entry.description_narrative || entry.description, // Description narrative LLaMA
          ip_adresse: entry.ip_adresse || entry.ip_address || null,
          user_agent: entry.user_agent || null,
          endpoint: entry.endpoint || null,
          methode_http: entry.methode_http || entry.method || null,
          duree_ms: entry.duree_ms || null,
          reussi: entry.reussi !== undefined ? entry.reussi : true,
          message_erreur: entry.message_erreur || null,
          details: entry.details || {},
          ai_result: entry.ai_result || null, // Résultat d'analyse IA si disponible
        };
      });
      
      setJournaux(journauxAdaptes);
      
      // Gérer la pagination
      if (data.count !== undefined) {
        setTotalElements(data.count);
        setTotalPages(Math.ceil(data.count / elementsParPage));
      } else if (data.next || data.previous) {
        // Pagination basée sur les URLs next/previous
        setTotalPages(Math.ceil((journauxAdaptes.length + (pageActuelle - 1) * elementsParPage) / elementsParPage));
      }
    } catch (error) {
      // Ne pas logger les erreurs réseau (serveur non disponible)
      if (!error.isNetworkError) {
        console.error('Erreur lors du chargement des journaux:', error);
        setErreur(error.message || 'Erreur lors du chargement des données');
      } else {
        // Erreur réseau - afficher un message plus clair
        setErreur('Serveur indisponible. Veuillez démarrer le serveur Django.');
      }
      setJournaux([]);
    } finally {
      setChargement(false);
    }
  };


  // Statistiques depuis l'API ou calculées localement
  const statsGlobales = statistiques ? [
    { 
      label: 'Total Entrées', 
      valeur: statistiques.total_actions || totalElements, 
      icon: ClipboardList, 
      couleur: '#185CD6',
    },
    { 
      label: 'Aujourd\'hui', 
      valeur: statistiques.actions_aujourdhui || 0, 
      icon: Calendar, 
      couleur: '#185CD6',
    },
    { 
      label: '7 Derniers Jours', 
      valeur: statistiques.actions_7_jours || 0, 
      icon: TrendingUp, 
      couleur: '#185CD6',
    },
    { 
      label: 'Taux de Réussite', 
      valeur: `${statistiques.taux_reussite || 0}%`, 
      icon: CheckCircle, 
      couleur: '#185CD6',
    }
  ] : [
    { 
      label: 'Total Entrées', 
      valeur: totalElements, 
      icon: ClipboardList, 
      couleur: '#185CD6',
    },
    { 
      label: 'Chargement...', 
      valeur: '...', 
      icon: Activity, 
      couleur: '#185CD6',
    }
  ];

  const handleGenerateAnalysis = async () => {
    setShowAnalyseRapport(true);
    
    // Charger toutes les entrées pour l'analyse (pas seulement la page actuelle)
    try {
      const params = {
        page_size: 10000, // Charger toutes les entrées
        ...filtres,
      };
      
      let allData;
      if (recherche && recherche.trim()) {
        allData = await searchAudit(recherche.trim(), params);
      } else {
        allData = await getAuditEntries(params);
      }
      
      const allEntries = (allData.results || allData).map(entry => ({
        ...entry, // Conserver toutes les données originales de l'API
        id: entry.id,
        // Utiliser timestamp ou date_action (les deux sont mappés dans le serializer)
        date_action: entry.timestamp || entry.date_action,
        timestamp: entry.timestamp || entry.date_action,
        // Utiliser user_display, utilisateur_display, ou user_info
        utilisateur_display: entry.user_display || 
                            entry.utilisateur_display || 
                            entry.user_info?.full_name || 
                            entry.user_info?.username || 
                            'Système',
        user_display: entry.user_display || entry.utilisateur_display || 'Système',
        user_info: entry.user_info || entry.utilisateur_info,
        action: entry.action,
        action_display: entry.action_display || entry.action,
        // Utiliser resource_type, ressource, ou content_type
        ressource: entry.resource_type || entry.ressource || (entry.content_type?.model || 'Non spécifié'),
        resource_type: entry.resource_type || entry.ressource,
        ressource_id: entry.resource_id || entry.object_id,
        resource_id: entry.resource_id || entry.object_id,
        object_id: entry.object_id || entry.resource_id,
        content_type: entry.content_type,
        // Description avec priorité
        description: entry.description_narrative || 
                    entry.description || 
                    `Action ${entry.action_display || entry.action} sur ${entry.resource_type || entry.ressource || 'ressource'}`,
        description_narrative: entry.description_narrative || entry.description,
        // Informations réseau
        ip_adresse: entry.ip_address || entry.ip_adresse || null,
        ip_address: entry.ip_address || entry.ip_adresse,
        user_agent: entry.user_agent || null,
        endpoint: entry.endpoint || null,
        methode_http: entry.method || entry.methode_http || null,
        method: entry.method || entry.methode_http,
        duree_ms: entry.duree_ms || null,
        // Statut
        reussi: entry.reussi !== undefined ? entry.reussi : true,
        message_erreur: entry.message_erreur || null,
        // Données supplémentaires
        details: entry.details || {},
        changes_before: entry.changes_before,
        changes_after: entry.changes_after,
        additional_info: entry.additional_info,
        data_before: entry.data_before,
        data_after: entry.data_after,
      }));
      
      setAllEntriesForAnalysis(allEntries);
    } catch (error) {
      console.error('Erreur lors du chargement des données pour l\'analyse:', error);
      // Utiliser les entrées de la page actuelle en fallback
      setAllEntriesForAnalysis(journaux);
    }
  };

  const exporterJournaux = () => {
    const csv = [
      ['Date', 'Utilisateur', 'Action', 'Ressource', 'IP', 'Statut'].join(','),
      ...journaux.map(j => [
        new Date(j.date_action).toLocaleString('fr-FR'),
        j.utilisateur_display || 'Système',
        j.action_display || j.action,
        `${j.ressource} ${j.ressource_id ? `#${j.ressource_id}` : ''}`,
        j.ip_adresse || 'N/A',
        j.reussi ? 'Succès' : 'Échec'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

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
      await chargerJournaux();
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
    <div className="w-full">
      {/* En-tête Premium */}
      <div className="overflow-hidden">
        <div style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl mr-3">
                  <ClipboardList size={24} />
                </div>
                Journal d'Audit
              </h2>
              <p className="text-white/90 mt-1 ml-14 text-sm flex items-center space-x-2">
                <span>Suivi complet de toutes les activités système</span>
                <span className="flex items-center space-x-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  <Brain size={12} />
                  <span>IA Locale</span>
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exporterJournaux}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}
                className="p-2.5 backdrop-blur-sm rounded-lg transition-all flex items-center space-x-2"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <Download className="text-white" size={18} />
                <span className="text-white font-medium text-sm">Exporter</span>
              </button>
              <button
                onClick={handleGenerateAnalysis}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}
                className="p-2.5 backdrop-blur-sm rounded-lg transition-all flex items-center space-x-2"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <FileText className="text-white" size={18} />
                <span className="text-white font-medium text-sm">Rapport d'Analyse</span>
              </button>
              <button
                onClick={() => setShowConfirmDelete(true)}
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.3)',
                }}
                className="p-2.5 backdrop-blur-sm rounded-lg transition-all flex items-center space-x-2"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.3)';
                }}
              >
                <Trash2 className="text-white" size={18} />
                <span className="text-white font-medium text-sm">Effacer tout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="px-5 py-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {statsGlobales.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-4 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stat.valeur}</p>
                  </div>
                  <div 
                    className="p-2.5 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)',
                    }}
                  >
                    <stat.icon className="text-white" size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }} className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <Search className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-base">Recherche Intelligente</h3>
              <p className="text-white/90 text-xs mt-0.5">
                {recherche 
                  ? `Recherche active : "${recherche}"`
                  : "Recherchez par utilisateur, action, ressource, IP, description..."
                }
              </p>
            </div>
            {recherche && (
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs font-semibold">
                  {journaux.length} résultat(s)
                </span>
                <button
                  onClick={() => {
                    setRecherche('');
                    setPageActuelle(1);
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all"
                  title="Effacer"
                >
                  <X className="text-white" size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-4 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-600" size={20} />
            <input
              type="text"
              placeholder="Tapez votre recherche ici..."
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setPageActuelle(1);
              }}
              className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium bg-white ${
                recherche ? 'border-blue-600' : 'border-gray-300'
              }`}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">
                Astuce
              </span>
              <span>Utilisez des mots-clés pour affiner votre recherche</span>
            </div>
            {recherche && (
              <p className="text-xs text-gray-600 font-semibold">
                Recherche instantanée activée
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Liste des journaux */}
      <div className="mt-4">
        {chargement ? (
          <div className="py-12">
            <SpinnerChargement texte="Chargement des journaux..." />
          </div>
        ) : (
          <>
              <div className="space-y-3">
                {journaux.map((journal) => (
                  <AuditEntryCard key={journal.id} entry={journal} />
                ))}
              </div>

              {/* Pagination */}
              {journaux.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    pageActuelle={pageActuelle}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    elementsParPage={elementsParPage}
                    onPageChange={setPageActuelle}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Message d'erreur */}
        {erreur && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="text-red-600 mx-auto mb-2" size={32} />
            <h3 className="text-lg font-bold text-red-900 mb-2">Erreur de chargement</h3>
            <p className="text-sm text-red-700">{erreur}</p>
          </div>
        )}

        {/* Message si aucun résultat */}
        {!chargement && !erreur && journaux.length === 0 && (
          <div className="mt-4 bg-white rounded-lg border border-gray-200 p-10 text-center shadow-sm">
            <div className="inline-block p-5 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }}>
              <ClipboardList className="text-white" size={48} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune entrée trouvée</h3>
            <p className="text-sm text-gray-500">
              {recherche 
                ? `Aucun résultat pour "${recherche}"`
                : "Aucune activité enregistrée pour le moment"
              }
            </p>
          </div>
        )}

      {/* Modal Rapport d'Analyse */}
      {showAnalyseRapport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <AnalyseRapport 
              entries={allEntriesForAnalysis.length > 0 ? allEntriesForAnalysis : journaux}
              onClose={() => setShowAnalyseRapport(false)}
            />
          </div>
        </div>
      )}

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

export default TableauAudit;
