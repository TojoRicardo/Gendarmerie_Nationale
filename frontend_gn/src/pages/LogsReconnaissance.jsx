import React, { useState, useEffect } from 'react';
import { Shield, Download, FileText, AlertCircle } from 'lucide-react';
import LogsReconnaissanceFaciale from '../../components/intelligence-artificielle/LogsReconnaissanceFaciale';
import { getRecognitionLogs, exportRecognitionLogsToCsv } from '../services/biometricsService';
import SpinnerChargement from '../../components/commun/SpinnerChargement';
import { useNotification } from '../context/NotificationContext';

/**
 * Page d'affichage des logs de reconnaissance faciale
 * Conforme ISO/IEC 30137-1:2019 (Forensic facial image comparison)
 */
const LogsReconnaissance = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    chargerLogs();
  }, []);

  const chargerLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mode développement - données mockées
      const useMock = true; // Passer à false quand le backend sera prêt

      if (useMock) {
        // Simuler un délai
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Données de démonstration
        const mockLogs = [
          {
            log_id: 'LOG-20250114-ABC123',
            standard: 'ISO/IEC 30137-1:2019',
            log_type: 'facial_recognition',
            operator: {
              user_id: '1',
              user_name: 'Commandant RAKOTO',
              role: 'investigator',
              department: 'Brigade Criminelle'
            },
            source: {
              image_path: 'suspect_face_001.jpg',
              image_hash: 'a3f5b2c8d1e4f7g9',
              upload_timestamp: '2025-01-14T10:30:00Z'
            },
            result: {
              match_found: true,
              matched_subject_id: 'FC-2024-001',
              matched_subject_name: 'BENALI Ahmed',
              confidence_score: 0.94,
              threshold_used: 0.70
            },
            method: {
              comparison_type: 'automated',
              algorithm: 'FaceNet',
              model_version: 'v1.0',
              distance_metric: 'cosine'
            },
            forensic: {
              case_id: 'AFF-2025-0042',
              evidence_id: 'EV-LKJ8H9G7F6D5',
              chain_of_custody: true,
              operator_qualified: true,
              method_reproducible: true
            },
            timestamp: '2025-01-14T10:30:15Z',
            gdpr: {
              data_subject_informed: false,
              legal_basis: 'law_enforcement',
              retention_period: '10_years',
              processing_purpose: 'criminal_investigation'
            }
          },
          {
            log_id: 'LOG-20250114-DEF456',
            standard: 'ISO/IEC 30137-1:2019',
            log_type: 'facial_recognition',
            operator: {
              user_id: '2',
              user_name: 'Inspecteur RANDRIA',
              role: 'analyst',
              department: 'Analyse Criminelle'
            },
            source: {
              image_path: 'surveillance_capture_142.jpg',
              image_hash: 'b7c9d2e5f8a1b4c6',
              upload_timestamp: '2025-01-14T11:15:00Z'
            },
            result: {
              match_found: false,
              matched_subject_id: null,
              matched_subject_name: null,
              confidence_score: 0.52,
              threshold_used: 0.70
            },
            method: {
              comparison_type: 'automated',
              algorithm: 'FaceNet',
              model_version: 'v1.0',
              distance_metric: 'cosine'
            },
            forensic: {
              case_id: 'AFF-2025-0043',
              evidence_id: 'EV-MNO3P4Q5R6S7',
              chain_of_custody: true,
              operator_qualified: true,
              method_reproducible: true
            },
            timestamp: '2025-01-14T11:15:22Z',
            gdpr: {
              data_subject_informed: false,
              legal_basis: 'law_enforcement',
              retention_period: '10_years',
              processing_purpose: 'criminal_investigation'
            }
          },
          {
            log_id: 'LOG-20250113-GHI789',
            standard: 'ISO/IEC 30137-1:2019',
            log_type: 'facial_recognition',
            operator: {
              user_id: '1',
              user_name: 'Commandant RAKOTO',
              role: 'investigator',
              department: 'Brigade Criminelle'
            },
            source: {
              image_path: 'identity_check_078.jpg',
              image_hash: 'c8d1e4f7g9a2b5c7',
              upload_timestamp: '2025-01-13T14:45:00Z'
            },
            result: {
              match_found: true,
              matched_subject_id: 'FC-2023-156',
              matched_subject_name: 'HAMIDI Karim',
              confidence_score: 0.87,
              threshold_used: 0.70
            },
            method: {
              comparison_type: 'automated',
              algorithm: 'FaceNet',
              model_version: 'v1.0',
              distance_metric: 'cosine'
            },
            forensic: {
              case_id: 'AFF-2025-0041',
              evidence_id: 'EV-TUV8W9X0Y1Z2',
              chain_of_custody: true,
              operator_qualified: true,
              method_reproducible: true
            },
            timestamp: '2025-01-13T14:45:18Z',
            gdpr: {
              data_subject_informed: false,
              legal_basis: 'law_enforcement',
              retention_period: '10_years',
              processing_purpose: 'criminal_investigation'
            }
          }
        ];

        setLogs(mockLogs);
      } else {
        // Appel API réel
        const response = await getRecognitionLogs();
        setLogs(response.logs || []);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des logs');
      showNotification('Erreur de chargement des logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (logsToExport) => {
    try {
      // Créer un CSV simple côté client
      const headers = [
        'ID Log',
        'Date/Heure',
        'Opérateur',
        'Rôle',
        'Correspondance',
        'Suspect Identifié',
        'Confiance (%)',
        'Algorithme',
        'Dossier',
        'ID Preuve',
        'Standard ISO'
      ];

      const rows = logsToExport.map(log => [
        log.log_id,
        new Date(log.timestamp).toLocaleString('fr-FR'),
        log.operator?.user_name || 'N/A',
        log.operator?.role || 'N/A',
        log.result?.match_found ? 'Oui' : 'Non',
        log.result?.matched_subject_name || 'N/A',
        Math.round((log.result?.confidence_score || 0) * 100),
        log.method?.algorithm || 'N/A',
        log.forensic?.case_id || 'N/A',
        log.forensic?.evidence_id || 'N/A',
        log.standard
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs_reconnaissance_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('Export réussi', 'success');
    } catch (err) {
      showNotification('Erreur lors de l\'export', 'error');
    }
  };

  const handleViewDetail = (log) => {
    // Afficher un modal avec les détails complets du log
    console.log('Détails du log:', log);
    showNotification('Fonction de détails à implémenter', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinnerChargement texte="Chargement des logs de reconnaissance..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête de la page */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl">
            <Shield className="text-white" size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Logs de Reconnaissance Faciale
            </h1>
            <p className="text-gray-600 mt-1">
              Audit trail conforme ISO/IEC 30137-1:2019 • Chain of Custody • RGPD
            </p>
          </div>
        </div>

        {/* Bannière de conformité */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-300 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <FileText className="text-indigo-600" size={24} />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">
                Traçabilité Judiciaire Complète
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Tous les logs de reconnaissance sont enregistrés avec une chaîne de confiance ininterrompue,
                conformément aux standards internationaux d'investigation criminelle.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Affichage des erreurs */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-3" size={24} />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Composant de logs */}
      <LogsReconnaissanceFaciale
        logs={logs}
        onExport={handleExport}
        onViewDetail={handleViewDetail}
      />
    </div>
  );
};

export default LogsReconnaissance;

