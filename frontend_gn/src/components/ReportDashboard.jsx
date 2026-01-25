import React, { useState, useEffect } from 'react';
import { FileText, Download, Plus, X, Calendar, Clock, FileSpreadsheet, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const formatDateFR = (dateString) => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

const ReportDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [periodeType, setPeriodeType] = useState('personnalise');
  const [newReport, setNewReport] = useState({
    type: 'statistique',
    periode_type: 'personnalise',
    parameters: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      province: ''
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, reportId: null, reportTitle: null });
  const [deleting, setDeleting] = useState(false);

  const reportTypes = [
    { value: 'statistique', label: 'Rapport Statistique', icon: FileText },
    { value: 'criminel', label: 'Rapport Criminel', icon: FileText },
    { value: 'enquete', label: 'Rapport d\'Enquête', icon: FileText },
    { value: 'audit', label: 'Rapport d\'Audit', icon: FileText },
  ];

  const periodeTypes = [
    { value: 'journalier', label: 'Journalier', description: 'Rapport du jour' },
    { value: 'mensuel', label: 'Mensuel', description: 'Rapport du mois' },
    { value: '3mois', label: 'Trimestriel', description: 'Rapport des 3 derniers mois' },
    { value: '6mois', label: 'Semestriel', description: 'Rapport des 6 derniers mois' },
    { value: 'annuel', label: 'Annuel', description: 'Rapport de l\'année' },
    { value: 'personnalise', label: 'Personnalisé', description: 'Sélectionnez vos dates' },
  ];

  const statusColors = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    en_cours: 'bg-blue-100 text-blue-800',
    termine: 'bg-green-100 text-green-800',
    erreur: 'bg-red-100 text-red-800',
    queued: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (periodeType !== 'personnalise') {
      const today = new Date();
      let dateDebut, dateFin;

      if (periodeType === 'journalier') {
        dateDebut = today;
        dateFin = today;
      } else if (periodeType === 'mensuel') {
        dateDebut = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (periodeType === '3mois') {
        // 3 derniers mois : du début du mois il y a 3 mois jusqu'à aujourd'hui
        dateDebut = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        dateFin = today;
      } else if (periodeType === '6mois') {
        // 6 derniers mois : du début du mois il y a 6 mois jusqu'à aujourd'hui
        dateDebut = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        dateFin = today;
      } else if (periodeType === 'annuel') {
        dateDebut = new Date(today.getFullYear(), 0, 1);
        dateFin = new Date(today.getFullYear(), 11, 31);
      }

      if (dateDebut && dateFin) {
        setNewReport(prev => ({
          ...prev,
          periode_type: periodeType,
          parameters: {
            ...prev.parameters,
            from: dateDebut.toISOString().split('T')[0],
            to: dateFin.toISOString().split('T')[0],
          }
        }));
      }
    }
  }, [periodeType]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rapports/');
      const reportsData = response.data.results || response.data || [];
      setReports(Array.isArray(reportsData) ? reportsData : []);
    } catch (err) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setSubmitting(true);
      
      const payload = {
        type_rapport: newReport.type,
        periode_type: periodeType,
        parametres: {}
      };
      
      if (newReport.type === 'statistique') {
        payload.parametres = {
          date_debut: newReport.parameters.from,
          date_fin: newReport.parameters.to,
        };
        if (newReport.parameters.province) {
          payload.parametres.province = newReport.parameters.province;
        }
      } else if (newReport.type === 'criminel') {
        payload.parametres = {
          criminel_id: newReport.parameters.criminel_id
        };
      } else if (newReport.type === 'enquete') {
        payload.parametres = {
          enquete_id: newReport.parameters.enquete_id
        };
      }
      
      if (newReport.note) {
        payload.note = newReport.note;
      }
      
      // Augmenter le timeout pour la génération de rapport (peut prendre du temps)
      const response = await api.post('/rapports/creer/', payload, {
        timeout: 60000 // 60 secondes pour la génération de rapport
      });
      
      if (response.data && response.data.id) {
        const rapportId = response.data.id;
        const statut = response.data.statut;
        
        // Vérifier s'il y a une erreur dans le rapport généré
        if (statut === 'erreur' || statut === 'error') {
          const errorMsg = response.data.message_erreur || 'Erreur lors de la génération du rapport';
          alert(`Erreur: ${errorMsg}\n\nVérifiez les logs du serveur pour plus de détails.`);
          setShowModal(false);
          setTimeout(() => loadReports(), 500);
          return;
        }
        
        if (statut === 'termine' && response.data.url_fichier && response.data.fichier) {
          try {
            await handleDownload(rapportId, 'pdf');
          } catch (downloadErr) {
            console.error('Erreur lors du téléchargement automatique:', downloadErr);
            // Ne pas afficher d'alerte ici car l'utilisateur peut télécharger manuellement plus tard
          }
        } else if (statut === 'termine' && !response.data.fichier) {
          console.warn(`Rapport ${rapportId} terminé mais sans fichier. Statut: ${statut}, Message erreur: ${response.data.message_erreur || 'Aucun'}`);
        }
        
        setShowModal(false);
        setPeriodeType('personnalise');
        setNewReport({
          type: 'statistique',
          periode_type: 'personnalise',
          parameters: {
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
            province: ''
          }
        });
        
        setTimeout(() => loadReports(), 1500);
      } else {
        // Si pas d'ID, c'est une erreur
        const errorMsg = response.data?.erreur || response.data?.detail || response.data?.message_erreur || 'Erreur lors de la génération du rapport';
        alert(`Erreur: ${errorMsg}\n\nVérifiez les logs du serveur pour plus de détails.`);
      }
    } catch (err) {
      let errorMessage = 'Erreur lors de la génération du rapport';
      
      // Gérer les erreurs réseau en premier
      const isNetworkError = 
        err.code === 'ERR_NETWORK' || 
        err.code === 'ERR_CONNECTION_REFUSED' ||
        err.message?.includes('Network Error') ||
        err.message?.includes('ERR_CONNECTION_REFUSED') ||
        err.message?.includes('Failed to fetch') ||
        (!err.response && err.request);
      
      if (isNetworkError) {
        // Utiliser le gestionnaire d'erreurs centralisé
        const { getErrorMessage } = await import('../utils/errorHandler')
        const errorInfo = getErrorMessage(err)
        errorMessage = errorInfo.message
        console.error('Erreur réseau lors de la génération du rapport:', err);
        alert(`Erreur: ${errorMessage}`);
        setSubmitting(false);
        return;
      }
      
      if (err.response) {
        // Gérer les erreurs de validation
        if (err.response.data?.non_field_errors) {
          errorMessage = Array.isArray(err.response.data.non_field_errors) 
            ? err.response.data.non_field_errors[0] 
            : err.response.data.non_field_errors;
        } else if (err.response.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data?.erreur) {
          errorMessage = err.response.data.erreur;
        } else if (err.response.data?.message_erreur) {
          // Utiliser le message d'erreur du rapport si disponible
          errorMessage = err.response.data.message_erreur;
        } else if (err.response.status === 404) {
          errorMessage = 'Endpoint non trouvé. Vérifiez que l\'endpoint /api/rapports/creer/ existe sur le serveur.';
        } else if (err.response.status === 400) {
          // Erreurs de validation de champ
          const fieldErrors = Object.entries(err.response.data || {})
            .filter(([key]) => key !== 'detail' && key !== 'erreur' && key !== 'message_erreur')
            .map(([key, value]) => {
              const fieldName = key.replace(/_/g, ' ');
              const errorText = Array.isArray(value) ? value[0] : value;
              return `${fieldName}: ${errorText}`;
            });
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('\n');
          } else {
            errorMessage = 'Données invalides. Vérifiez les paramètres du rapport.';
          }
        } else if (err.response.status === 500) {
          errorMessage = err.response.data?.erreur || err.response.data?.details || err.response.data?.message_erreur || 'Erreur serveur. Veuillez réessayer plus tard.';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('Erreur génération rapport:', err);
      // Afficher un message d'erreur plus clair
      alert(`Erreur: ${errorMessage}\n\nVérifiez les logs du serveur pour plus de détails.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (reportId, format = 'pdf') => {
    try {
      const response = await api.get(`/rapports/${reportId}/telecharger/`, {
        params: { format: format },
        responseType: 'blob'
      });
      
      const contentType = response.headers['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        const errorMsg = json.erreur || json.detail || 'Erreur lors du téléchargement';
        console.error('Erreur téléchargement:', errorMsg);
        alert(errorMsg);
        throw new Error(errorMsg);
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let errorMessage = 'Erreur lors du téléchargement du rapport';
      
      if (err.response) {
        // Gérer spécifiquement les erreurs 404
        if (err.response.status === 404) {
          if (err.response.data instanceof Blob) {
            try {
              const text = await err.response.data.text();
              if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                const json = JSON.parse(text);
                errorMessage = json.erreur || json.detail || 'Le fichier du rapport n\'a pas été trouvé';
              } else {
                errorMessage = text || 'Le fichier du rapport n\'a pas été trouvé';
              }
            } catch (parseErr) {
              errorMessage = 'Le fichier du rapport n\'a pas été trouvé. Le rapport peut ne pas avoir été généré correctement.';
            }
          } else if (typeof err.response.data === 'object' && err.response.data !== null) {
            errorMessage = err.response.data?.erreur || err.response.data?.detail || 'Le fichier du rapport n\'a pas été trouvé';
          } else {
            errorMessage = 'Le fichier du rapport n\'a pas été trouvé. Le rapport peut ne pas avoir été généré correctement.';
          }
        } else if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              const json = JSON.parse(text);
              errorMessage = json.erreur || json.detail || json.message || `Erreur ${err.response.status}`;
            } else {
              errorMessage = text || `Erreur ${err.response.status}`;
            }
          } catch (parseErr) {
            errorMessage = `Erreur ${err.response.status}: Impossible de lire le message d'erreur`;
          }
        } else if (typeof err.response.data === 'object' && err.response.data !== null) {
          errorMessage = err.response.data?.erreur || err.response.data?.detail || err.response.data?.message || `Erreur ${err.response.status}`;
        } else {
          switch (err.response.status) {
            case 404:
              errorMessage = 'Rapport non trouvé. Vérifiez que le rapport a été généré avec succès.';
              break;
            case 400:
              errorMessage = 'Le rapport n\'est pas encore disponible';
              break;
            case 403:
              errorMessage = 'Vous n\'avez pas la permission de télécharger ce rapport';
              break;
            default:
              errorMessage = `Erreur ${err.response.status}: Erreur inconnue`;
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(`Erreur: ${errorMessage}\n\nVérifiez les logs du serveur pour plus de détails.`);
    }
  };

  const handleDeleteClick = (reportId, reportTitle) => {
    setDeleteConfirm({ show: true, reportId, reportTitle });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.reportId) return;

    setDeleting(true);
    try {
      await api.delete(`/rapports/${deleteConfirm.reportId}/`);
      // Recharger la liste des rapports après suppression
      await loadReports();
      setDeleteConfirm({ show: false, reportId: null, reportTitle: null });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.erreur ||
                          err.response?.data?.message ||
                          'Erreur lors de la suppression du rapport';
      console.error('Erreur suppression:', errorMessage);
      alert(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, reportId: null, reportTitle: null });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPeriodeLabel = (rapport) => {
    if (rapport.parametres?.periode_type) {
      const periode = periodeTypes.find(p => p.value === rapport.parametres.periode_type);
      return periode ? periode.label : 'Personnalisé';
    }
    if (rapport.parametres?.date_debut && rapport.parametres?.date_fin) {
      const debut = new Date(rapport.parametres.date_debut);
      const fin = new Date(rapport.parametres.date_fin);
      if (debut.toDateString() === fin.toDateString()) {
        return 'Journalier';
      }
      return 'Personnalisé';
    }
    return 'N/A';
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Module de Rapports</h2>
            <p className="text-gray-600 mt-2">
              Générez et consultez vos rapports d'activité selon différentes périodes
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Générer un rapport</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Chargement des rapports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun rapport trouvé</h3>
            <p className="text-gray-500">
              Aucun rapport n'a été généré pour le moment. Cliquez sur "Générer un rapport" pour créer votre premier rapport.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Période</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date de création</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Taille</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.type_rapport_display || report.type_rapport || report.type_display || report.type}
                          </div>
                          {report.titre && (
                            <div className="text-xs text-gray-500 mt-1">{report.titre}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{getPeriodeLabel(report)}</span>
                      </div>
                      {report.parametres?.date_debut && report.parametres?.date_fin && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(report.parametres.date_debut).toLocaleDateString('fr-FR')} - {new Date(report.parametres.date_fin).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[report.statut] || 'bg-gray-100 text-gray-800'}`}>
                        {report.statut_display || report.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatDate(report.date_creation || report.date_generation)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.taille_mb ? `${report.taille_mb} Mo` : report.taille_fichier ? `${Math.round(report.taille_fichier / 1024)} Ko` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {(report.statut === 'termine' || report.statut === 'done') && (report.url_fichier || report.fichier) ? (
                          <button
                            onClick={() => handleDownload(report.id, 'pdf')}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Télécharger le rapport"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            {report.statut === 'en_cours' || report.statut === 'processing' ? 'En cours...' : 
                             report.statut === 'en_attente' || report.statut === 'queued' ? 'En attente...' : 
                             report.statut === 'erreur' || report.statut === 'error' ? 'Erreur' : 'Non disponible'}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteClick(report.id, report.titre)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer le rapport"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-bold text-gray-900">Générer un nouveau rapport</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {newReport.type === 'statistique' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Période du rapport *
                  </label>
                  <select
                    value={periodeType}
                    onChange={(e) => setPeriodeType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white mb-4"
                  >
                    {periodeTypes.map(periode => (
                      <option key={periode.value} value={periode.value}>
                        {periode.label} - {periode.description}
                      </option>
                    ))}
                  </select>

                  {periodeType === 'personnalise' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de début *
                        </label>
                        <input
                          type="date"
                          value={newReport.parameters.from}
                          onChange={(e) => setNewReport({
                            ...newReport,
                            parameters: { ...newReport.parameters, from: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de fin *
                        </label>
                        <input
                          type="date"
                          value={newReport.parameters.to}
                          onChange={(e) => setNewReport({
                            ...newReport,
                            parameters: { ...newReport.parameters, to: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {periodeType !== 'personnalise' && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">
                          Période sélectionnée : {formatDateFR(newReport.parameters.from)} au {formatDateFR(newReport.parameters.to)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province (optionnel)
                    </label>
                    <select
                      value={newReport.parameters.province || ''}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        parameters: { ...newReport.parameters, province: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Choisir une province</option>
                      <option value="Antananarivo">Antananarivo</option>
                      <option value="Toamasina">Toamasina</option>
                      <option value="Antsiranana">Antsiranana</option>
                      <option value="Mahajanga">Mahajanga</option>
                      <option value="Fianarantsoa">Fianarantsoa</option>
                      <option value="Toliara">Toliara</option>
                    </select>
                  </div>
                </div>
              )}

              {newReport.type === 'criminel' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ID du criminel *
                  </label>
                  <input
                    type="number"
                    value={newReport.parameters.criminel_id || ''}
                    onChange={(e) => setNewReport({
                      ...newReport,
                      parameters: { ...newReport.parameters, criminel_id: parseInt(e.target.value) }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ID de la fiche criminelle"
                    required
                  />
                </div>
              )}

              {newReport.type === 'enquete' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ID de l'enquête *
                  </label>
                  <input
                    type="number"
                    value={newReport.parameters.enquete_id || ''}
                    onChange={(e) => setNewReport({
                      ...newReport,
                      parameters: { ...newReport.parameters, enquete_id: e.target.value ? parseInt(e.target.value) : null }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ID de l'enquête"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (optionnel)
                </label>
                <textarea
                  value={newReport.note || ''}
                  onChange={(e) => setNewReport({ ...newReport, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Ajoutez une note ou description pour ce rapport..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      Générer le rapport
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header bleu foncé */}
            <div className="bg-blue-900 p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-gray-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">Suppression de rapport</h3>
            </div>
            
            {/* Corps blanc */}
            <div className="p-6 space-y-4">
              <p className="text-gray-900">
                Ce rapport sera définitivement supprimé du système.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  {deleteConfirm.reportTitle || 'Rapport sans titre'}
                </p>
              </div>
              
              <p className="text-gray-900 font-medium">
                Confirmer cette action ?
              </p>

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Suppression...
                    </>
                  ) : (
                    'Confirmer'
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

export default ReportDashboard;
