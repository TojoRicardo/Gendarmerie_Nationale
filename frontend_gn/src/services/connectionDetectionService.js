/**
 * Service pour la détection et gestion des connexions utilisateurs
 */
import api from './api';
import { getRoleRedirect, hasAccessToRoute } from '../utils/roleRedirection';

const connectionDetectionService = {
  /**
   * Enregistre une nouvelle connexion et obtient les informations de redirection
   */
  async detectConnection() {
    try {
      const response = await api.post('/utilisateur/detect-connection/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async getCurrentSession() {
    try {
      const response = await api.get('/utilisateur/detect-connection/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Enregistre la déconnexion de l'utilisateur
   * Note: Cet endpoint peut ne pas exister (404), dans ce cas on ignore silencieusement
   */
  async disconnect() {
    try {
      const response = await api.post('/utilisateur/disconnect/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // Si l'endpoint n'existe pas (404) ou si l'utilisateur n'est plus authentifié (401), ignorer silencieusement
      // C'est une fonctionnalité optionnelle pour le tracking des connexions
      if (error.response?.status === 404 || error.response?.status === 401) {
        // Endpoint non disponible ou utilisateur déjà déconnecté, ignorer silencieusement
        return {
          success: false,
          error: 'Endpoint non disponible ou utilisateur déconnecté',
        };
      }
      // Pour les autres erreurs, logger seulement en mode développement
      if (import.meta.env.DEV) {
        console.debug('Erreur lors de l\'enregistrement de la déconnexion:', error);
      }
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Liste toutes les connexions actives (admin/superviseur)
   */
  async getActiveConnections() {
    try {
      const response = await api.get('/utilisateur/connections/active/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async getConnectionsByRole(role = null) {
    try {
      const url = role 
        ? `/utilisateur/connections/by_role/?role=${encodeURIComponent(role)}`
        : '/utilisateur/connections/by_role/';
      
      const response = await api.get(url);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async getMySessions() {
    try {
      const response = await api.get('/utilisateur/connections/my_sessions/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async endSession(connectionId) {
    try {
      const response = await api.post(`/utilisateur/connections/${connectionId}/end_session/`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async endAllMySessions() {
    try {
      const response = await api.post('/utilisateur/connections/end_all_my_sessions/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async getConnectionStatistics() {
    try {
      const response = await api.get('/utilisateur/connections/statistics/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async getMyStats() {
    try {
      const response = await api.get('/utilisateur/connection-stats/my_stats/');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Obtient l'URL de redirection pour un rôle donné
   * @param {string} role - Le rôle de l'utilisateur
   * @returns {string} L'URL de redirection
   */
  getRedirectUrlForRole(role) {
    return getRoleRedirect(role).route;
  },

  /**
   * Détermine si l'utilisateur doit être redirigé selon son rôle
   * @param {string} currentPath - Le chemin actuel
   * @param {string} role - Le rôle de l'utilisateur
   * @returns {boolean} True si redirection nécessaire
   */
  shouldRedirect(currentPath, role) {
    if (!role) {
      return false;
    }

    const sanitizedPath = currentPath.split('?')[0] || '/';

    // Ne pas rediriger si l'utilisateur est déjà sur une route autorisée
    return !hasAccessToRoute(role, sanitizedPath);
  },
};

export default connectionDetectionService;

