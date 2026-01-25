/**
 * Composant de surveillance des connexions en temps réel
 * Pour Administrateurs et Superviseurs
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import connectionDetectionService from '../../src/services/connectionDetectionService';
import { getRoleColor, getRoleIcon, formatRoleName } from '../../src/utils/roleRedirection';
import Loader from '../commun/Loader';
import ErrorMessage from '../commun/ErrorMessage';

const SurveillanceConnexions = () => {
  const { utilisateur } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour les données
  const [activeConnections, setActiveConnections] = useState([]);
  const [connectionsByRole, setConnectionsByRole] = useState({});
  const [statistics, setStatistics] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // Rafraîchissement automatique
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  /**
   * Charge les données de connexion
   */
  const loadConnectionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger en parallèle
      const [connectionsRes, byRoleRes, statsRes] = await Promise.all([
        connectionDetectionService.getActiveConnections(),
        connectionDetectionService.getConnectionsByRole(),
        connectionDetectionService.getConnectionStatistics(),
      ]);

      if (connectionsRes.success) {
        setActiveConnections(connectionsRes.data.connections || []);
      }

      if (byRoleRes.success) {
        setConnectionsByRole(byRoleRes.data || {});
      }

      if (statsRes.success) {
        setStatistics(statsRes.data);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error(' Erreur lors du chargement des connexions:', err);
      setError('Impossible de charger les données de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadConnectionData();
  }, []);

  // Rafraîchissement automatique toutes les 30 secondes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadConnectionData();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [autoRefresh]);

  /**
   * Termine une session spécifique
   */
  const handleEndSession = async (connectionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir terminer cette session ?')) {
      return;
    }

    try {
      const result = await connectionDetectionService.endSession(connectionId);
      if (result.success) {
        alert('Session terminée avec succès');
        loadConnectionData(); // Recharger les données
      }
    } catch (err) {
      console.error(' Erreur lors de la fin de session:', err);
      alert('Erreur lors de la fin de session');
    }
  };

  /**
   * Formate la durée en format lisible
   */
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  /**
   * Formate la date/heure
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !activeConnections.length) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader message="Chargement des connexions..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <i className="fas fa-network-wired text-blue-600"></i>
              Surveillance des Connexions
            </h1>
            <p className="text-gray-600 mt-2">
              Suivi en temps réel des utilisateurs connectés au système
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={loadConnectionData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
              Actualiser
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                autoRefresh
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'}`}></i>
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-2">
          Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Statistiques Globales */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connexions Actives</p>
                <p className="text-3xl font-bold text-blue-600">{statistics.active_connections}</p>
              </div>
              <i className="fas fa-users text-4xl text-blue-200"></i>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dernières 24h</p>
                <p className="text-3xl font-bold text-green-600">{statistics.connections_last_24h}</p>
              </div>
              <i className="fas fa-clock text-4xl text-green-200"></i>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Durée Moyenne</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.average_session_formatted}</p>
              </div>
              <i className="fas fa-hourglass-half text-4xl text-purple-200"></i>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rôles Actifs</p>
                <p className="text-3xl font-bold text-orange-600">
                  {Object.keys(connectionsByRole).filter(role => connectionsByRole[role].count > 0).length}
                </p>
              </div>
              <i className="fas fa-user-tag text-4xl text-orange-200"></i>
            </div>
          </div>
        </div>
      )}

      {/* Connexions par Rôle */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-user-shield text-indigo-600"></i>
          Connexions par Rôle
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(connectionsByRole).map(([role, data]) => (
            <button
              key={role}
              onClick={() => setSelectedRole(selectedRole === role ? null : role)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedRole === role
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <i className={`fas ${getRoleIcon(role)} text-2xl mb-2 text-${getRoleColor(role)}-600`}></i>
                <p className="text-xs text-gray-600 mb-1">{role}</p>
                <p className="text-2xl font-bold text-gray-800">{data.count}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des Connexions Actives */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-list text-blue-600"></i>
            Connexions Actives
            {selectedRole && ` - ${selectedRole}`}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière Activité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appareil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeConnections
                .filter(conn => !selectedRole || conn.user_role === selectedRole)
                .map((connection) => (
                  <tr key={connection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {connection.user_name?.charAt(0) || '?'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {connection.user_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {connection.user_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getRoleColor(connection.user_role)}-100 text-${getRoleColor(connection.user_role)}-800`}>
                        <i className={`fas ${getRoleIcon(connection.user_role)} mr-1`}></i>
                        {connection.user_role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(connection.login_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(connection.last_activity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(connection.session_duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {connection.device_type || 'Desktop'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {connection.ip_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {utilisateur?.role === 'Administrateur Système' && (
                        <button
                          onClick={() => handleEndSession(connection.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Terminer la session"
                        >
                          <i className="fas fa-times-circle"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {activeConnections.filter(conn => !selectedRole || conn.user_role === selectedRole).length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-users-slash text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">Aucune connexion active</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveillanceConnexions;

