import { get, post, patch, del } from './apiGlobal';

/**
 * Service pour gérer les notifications
 * Utilise l'instance API centralisée qui gère automatiquement l'authentification
 */
const notificationService = {
  /**
   * Récupérer toutes les notifications de l'utilisateur
   * @param {Object} params - Paramètres de filtrage (lue: boolean)
   * @returns {Promise<Array>}
   */
  getNotifications: async (params = {}) => {
    try {
      const response = await get('/notifications/', { params });
      return response.data;
    } catch (error) {
      // Ignorer silencieusement les erreurs réseau si le serveur n'est pas disponible
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || !error.response) {
        console.debug('⚠️ Serveur non disponible, notifications non chargées');
        return []; // Retourner un tableau vide au lieu de lancer une erreur
      }
      // Logger uniquement les autres erreurs
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        console.error('Erreur lors de la récupération des notifications:', error);
      }
      throw error;
    }
  },

  /**
   * Récupérer uniquement les notifications non lues
   * @returns {Promise<Array>}
   */
  getUnreadNotifications: async () => {
    try {
      const response = await get('/notifications/non_lues/');
      return response.data;
    } catch (error) {
      // Ignorer silencieusement les erreurs réseau si le serveur n'est pas disponible
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || !error.response) {
        console.debug('⚠️ Serveur non disponible, notifications non lues non chargées');
        return []; // Retourner un tableau vide au lieu de lancer une erreur
      }
      // Logger uniquement les autres erreurs
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        console.error('Erreur lors de la récupération des notifications non lues:', error);
      }
      throw error;
    }
  },

  /**
   * Compter les notifications non lues
   * @returns {Promise<number>}
   */
  getUnreadCount: async () => {
    try {
      const response = await get('/notifications/count_non_lues/');
      return response.data.count;
    } catch (error) {
      // Ignorer silencieusement les erreurs réseau - retourner 0 par défaut
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || !error.response) {
        console.debug('⚠️ Serveur non disponible, comptage des notifications impossible');
        return 0;
      }
      // Logger uniquement les autres erreurs
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        console.error('Erreur lors du comptage des notifications:', error);
      }
      return 0; // Retourner 0 par défaut en cas d'erreur
    }
  },

  /**
   * Marquer une notification comme lue
   * @param {number} id - ID de la notification
   * @returns {Promise<Object>}
   */
  markAsRead: async (id) => {
    try {
      const response = await patch(`/notifications/${id}/marquer_lue/`, {});
      return response.data;
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
      throw error;
    }
  },

  /**
   * Marquer toutes les notifications comme lues
   * @returns {Promise<Object>}
   */
  markAllAsRead: async () => {
    try {
      const response = await patch('/notifications/marquer_toutes_lues/', {});
      return response.data;
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
      throw error;
    }
  },

  /**
   * Supprimer une notification
   * @param {number} id - ID de la notification
   * @returns {Promise<void>}
   */
  deleteNotification: async (id) => {
    try {
      await del(`/notifications/${id}/`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      throw error;
    }
  },

  /**
   * Supprimer toutes les notifications lues
   * @returns {Promise<Object>}
   */
  deleteReadNotifications: async () => {
    try {
      const response = await del('/notifications/supprimer_lues/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression des notifications lues:', error);
      throw error;
    }
  },

  /**
   * Créer une notification de test
   * @returns {Promise<Object>}
   */
  createTestNotification: async () => {
    try {
      const response = await post('/notifications/tester/', {});
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la notification de test:', error);
      throw error;
    }
  },

  /**
   * Créer une nouvelle notification
   * @param {Object} notification - Données de la notification
   * @returns {Promise<Object>}
   */
  createNotification: async (notification) => {
    try {
      const response = await post('/notifications/', notification);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
      throw error;
    }
  }
};

export default notificationService;

