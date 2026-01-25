/**
 * Composant pour afficher les statistiques de connexion personnelles
 * Accessible à tous les utilisateurs
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import connectionDetectionService from '../../src/services/connectionDetectionService';
import Loader from '../commun/Loader';
import ErrorMessage from '../commun/ErrorMessage';

const MesConnexions = () => {
  const { utilisateur } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);

  /**
   * Charge les données de connexion
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionsRes, statsRes, currentRes] = await Promise.all([
        connectionDetectionService.getMySessions(),
        connectionDetectionService.getMyStats(),
        connectionDetectionService.getCurrentSession(),
      ]);

      if (sessionsRes.success) {
        setSessions(sessionsRes.data.sessions || []);
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (currentRes.success) {
        setCurrentSession(currentRes.data.current_session);
      }
    } catch (err) {
      console.error(' Erreur lors du chargement des données:', err);
      setError('Impossible de charger vos données de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Termine toutes les sessions
   */
  const handleEndAllSessions = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir terminer toutes vos sessions actives ?')) {
      return;
    }

    try {
      const result = await connectionDetectionService.endAllMySessions();
      if (result.success) {
        alert('Toutes vos sessions ont été terminées');
        loadData();
      }
    } catch (err) {
      console.error(' Erreur:', err);
      alert('Erreur lors de la fin des sessions');
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader message="Chargement de vos connexions..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <i className="fas fa-history text-blue-600"></i>
          Mes Connexions
        </h1>
        <p className="text-gray-600 mt-2">
          Historique et statistiques de vos connexions au système
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Session Actuelle */}
      {currentSession && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <i className="fas fa-circle text-green-300 animate-pulse"></i>
                Session Actuelle
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-blue-100 text-sm">Connecté depuis</p>
                  <p className="text-lg font-semibold">{formatDateTime(currentSession.login_time)}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Appareil</p>
                  <p className="text-lg font-semibold">
                    {currentSession.device_type || 'Desktop'} - {currentSession.browser || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Adresse IP</p>
                  <p className="text-lg font-semibold">{currentSession.ip_address}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Durée</p>
                  <p className="text-lg font-semibold">{currentSession.session_duration_formatted}</p>
                </div>
              </div>
            </div>
            <div>
              <button
                onClick={handleEndAllSessions}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Terminer toutes les sessions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Connexions</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total_connections}</p>
              </div>
              <i className="fas fa-sign-in-alt text-4xl text-blue-200"></i>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Durée Moyenne</p>
                <p className="text-2xl font-bold text-purple-600">{stats.average_session_formatted}</p>
              </div>
              <i className="fas fa-clock text-4xl text-purple-200"></i>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Session la + longue</p>
                <p className="text-2xl font-bold text-green-600">{stats.longest_session_formatted}</p>
              </div>
              <i className="fas fa-hourglass-end text-4xl text-green-200"></i>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dernier Appareil</p>
                <p className="text-lg font-bold text-orange-600">{stats.last_login_device || 'N/A'}</p>
              </div>
              <i className="fas fa-laptop text-4xl text-orange-200"></i>
            </div>
          </div>
        </div>
      )}

      {/* Historique des Sessions */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-list text-blue-600"></i>
            Historique des Connexions
          </h2>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-sync-alt mr-1"></i>
            Actualiser
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  État
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Déconnexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appareil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Navigateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {session.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <i className="fas fa-circle text-green-500 mr-1 animate-pulse"></i>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <i className="fas fa-circle text-gray-500 mr-1"></i>
                        Terminée
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(session.login_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.logout_time ? formatDateTime(session.logout_time) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.session_duration_formatted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.device_type || 'Desktop'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.browser || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sessions.length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">Aucune session enregistrée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MesConnexions;

