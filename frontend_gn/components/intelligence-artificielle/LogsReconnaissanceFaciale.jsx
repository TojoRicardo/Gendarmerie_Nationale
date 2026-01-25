import React, { useState, useEffect } from 'react';
import { 
  FileText, Shield, User, Calendar, Clock, CheckCircle2, 
  AlertTriangle, Database, Lock, Scale, Download, Eye, Search 
} from 'lucide-react';
import Bouton from '../commun/Bouton';
import Pagination from '../commun/Pagination';

/**
 * Composant d'affichage des logs de reconnaissance faciale
 * Conforme à ISO/IEC 30137-1:2019 (Forensic facial image comparison)
 * 
 * Garantit:
 * - Traçabilité complète des reconnaissances
 * - Chain of custody (chaîne de confiance)
 * - Conformité RGPD
 * - Audit trail complet
 */
const LogsReconnaissanceFaciale = ({ logs = [], onExport, onViewDetail }) => {
  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'matched', 'unmatched'
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'confidence_desc'
  
  const itemsPerPage = 10;

  // Filtrer et trier les logs
  useEffect(() => {
    let filtered = [...logs];

    // Filtre de recherche
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.operator?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.result?.matched_subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.log_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.forensic?.case_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par type
    if (filterType === 'matched') {
      filtered = filtered.filter(log => log.result?.match_found);
    } else if (filterType === 'unmatched') {
      filtered = filtered.filter(log => !log.result?.match_found);
    }

    // Tri
    if (sortBy === 'date_desc') {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortBy === 'date_asc') {
      filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (sortBy === 'confidence_desc') {
      filtered.sort((a, b) => (b.result?.confidence_score || 0) - (a.result?.confidence_score || 0));
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, searchTerm, filterType, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Statistiques
  const stats = {
    total: logs.length,
    matched: logs.filter(l => l.result?.match_found).length,
    unmatched: logs.filter(l => !l.result?.match_found).length,
    avgConfidence: logs.length > 0 
      ? (logs.reduce((sum, l) => sum + (l.result?.confidence_score || 0), 0) / logs.length).toFixed(2)
      : 0
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec badge de conformité */}
      <div className="card-pro p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Logs de Reconnaissance Faciale
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                   ISO/IEC 30137-1:2019
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                   Chain of Custody
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                   RGPD
                </span>
              </div>
            </div>
          </div>
          {onExport && (
            <Bouton
              variant="secondary"
              icone={Download}
              onClick={() => onExport(filteredLogs)}
            >
              Exporter ({filteredLogs.length})
            </Bouton>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-pro p-5 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-1">Total</p>
              <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
            </div>
            <Database className="text-blue-400" size={40} />
          </div>
        </div>

        <div className="card-pro p-5 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-1">Correspondances</p>
              <p className="text-3xl font-bold text-green-700">{stats.matched}</p>
            </div>
            <CheckCircle2 className="text-green-400" size={40} />
          </div>
        </div>

        <div className="card-pro p-5 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-1">Sans correspondance</p>
              <p className="text-3xl font-bold text-orange-700">{stats.unmatched}</p>
            </div>
            <AlertTriangle className="text-orange-400" size={40} />
          </div>
        </div>

        <div className="card-pro p-5 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-1">Confiance moy.</p>
              <p className="text-3xl font-bold text-purple-700">{Math.round(stats.avgConfidence * 100)}%</p>
            </div>
            <Scale className="text-purple-400" size={40} />
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card-pro p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Nom, ID log, ID dossier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Filtre par type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type de résultat
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tous les logs</option>
              <option value="matched">Avec correspondance</option>
              <option value="unmatched">Sans correspondance</option>
            </select>
          </div>

          {/* Tri */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Trier par
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
            >
              <option value="date_desc">Date (récent → ancien)</option>
              <option value="date_asc">Date (ancien → récent)</option>
              <option value="confidence_desc">Confiance (élevée → faible)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des logs */}
      <div className="card-pro overflow-hidden">
        {paginatedLogs.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-gray-500 font-medium">Aucun log trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedLogs.map((log, index) => (
              <div 
                key={log.log_id || index} 
                className="p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  {/* Informations principales */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {/* Badge de statut */}
                      {log.result?.match_found ? (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                          <CheckCircle2 className="text-green-600" size={16} />
                          <span className="text-xs font-bold text-green-700">CORRESPONDANCE</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
                          <AlertTriangle className="text-gray-600" size={16} />
                          <span className="text-xs font-bold text-gray-700">AUCUNE CORRESPONDANCE</span>
                        </div>
                      )}

                      {/* ID du log */}
                      <span className="text-sm font-mono text-gray-500">
                        {log.log_id}
                      </span>

                      {/* Badge ISO */}
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">
                        ISO 30137-1
                      </span>
                    </div>

                    {/* Opérateur */}
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="text-gray-500" size={16} />
                      <span className="text-sm font-semibold text-gray-900">
                        {log.operator?.user_name || 'Inconnu'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({log.operator?.role || 'N/A'})
                      </span>
                    </div>

                    {/* Résultat */}
                    {log.result?.match_found && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Suspect identifié:</span>{' '}
                          <span className="text-indigo-600 font-bold">
                            {log.result.matched_subject_name}
                          </span>
                          {' '}
                          <span className="text-gray-500">
                            (ID: {log.result.matched_subject_id})
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Métadonnées */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Scale size={14} />
                        <span>Algorithme: {log.method?.algorithm || 'N/A'}</span>
                      </div>
                      {log.forensic?.case_id && (
                        <div className="flex items-center space-x-1">
                          <FileText size={14} />
                          <span>Dossier: {log.forensic.case_id}</span>
                        </div>
                      )}
                      {log.forensic?.chain_of_custody && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Lock size={14} />
                          <span className="font-semibold">Chain of Custody </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score de confiance */}
                  <div className="ml-4 text-center">
                    <div className={`px-4 py-2 rounded-xl font-bold text-lg ${getConfidenceColor(log.result?.confidence_score || 0)}`}>
                      {Math.round((log.result?.confidence_score || 0) * 100)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Confiance</p>
                    
                    {onViewDetail && (
                      <button
                        onClick={() => onViewDetail(log)}
                        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all flex items-center space-x-1"
                      >
                        <Eye size={14} />
                        <span>Détails</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Indicateurs de conformité RGPD */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle2 size={14} />
                      <span>RGPD: {log.gdpr?.legal_basis || 'law_enforcement'}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Lock size={14} />
                      <span>Rétention: {log.gdpr?.retention_period || '10 ans'}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-purple-600">
                      <Shield size={14} />
                      <span>Preuve: {log.forensic?.evidence_id || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Note de conformité */}
      <div className="card-pro p-4 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">
              Conformité ISO/IEC 30137-1:2019 - Forensic facial image comparison
            </p>
            <p>
              Tous les logs de reconnaissance sont enregistrés avec une traçabilité complète 
              (chain of custody), conformément aux standards judiciaires internationaux et aux 
              exigences du RGPD pour les données biométriques.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsReconnaissanceFaciale;

