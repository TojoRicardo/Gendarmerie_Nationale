/**
 * Service API pour la génération de rapports
 */

import api from './api';

const reportService = {
  /**
   * Génère un nouveau rapport
   * @param {Object} data - Données du rapport
   * @returns {Promise}
   */
  genererRapport: async (data) => {
    try {
      // Utiliser l'endpoint /rapports/creer/ du RapportViewSet
      // Note: baseURL contient déjà /api, donc on ne met pas /api/ au début
      const response = await api.post('/rapports/creer/', data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur génération rapport:', error);
      throw error;
    }
  },

  /**
   * Génère un rapport avec les types simples (journalier, mensuel, trimestriel, etc.)
   * @param {string} type - Type de rapport: 'journalier', 'mensuel', 'trimestriel', 'semestriel', 'annuel', 'personnalise'
   * @param {string} dateDebut - Date de début (requis pour 'personnalise', format: YYYY-MM-DD)
   * @param {string} dateFin - Date de fin (requis pour 'personnalise', format: YYYY-MM-DD)
   * @returns {Promise}
   */
  genererRapportSimple: async (type, dateDebut = null, dateFin = null) => {
    try {
      const payload = {
        type: type,
      };
      
      if (type === 'personnalise') {
        if (!dateDebut || !dateFin) {
          throw new Error('Les dates dateDebut et dateFin sont requises pour un rapport personnalisé');
        }
        payload.dateDebut = dateDebut;
        payload.dateFin = dateFin;
      }
      
      // Note: baseURL contient déjà /api, donc on ne met pas /api/ au début
      // Utiliser l'endpoint /rapports/generate/ du GenerateReportView
      const response = await api.post('/rapports/generate/', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur génération rapport simple:', error);
      if (error.response) {
        throw {
          message: error.response.data?.message || 'Erreur lors de la génération du rapport',
          status: error.response.status,
          data: error.response.data
        };
      }
      throw error;
    }
  },

  /**
   * Récupère l'historique des rapports
   * @param {number} limit - Nombre de rapports à récupérer
   * @returns {Promise}
   */
  getHistorique: async (limit = 20) => {
    try {
      // Utiliser le nouveau système avec ReportViewSet
      // Note: baseURL contient déjà /api, donc on ne met pas /api/ au début
      const response = await api.get(`/rapports/reports/?page_size=${limit}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      throw error;
    }
  },

  /**
   * Récupère les types de rapports disponibles
   * @returns {Promise}
   */
  getTypes: async () => {
    try {
      // Retourner les types statiques pour le nouveau système
      return {
        types_rapports: [
          { value: 'criminel', label: 'Rapport Criminel' },
          { value: 'enquete', label: 'Rapport d\'Enquête' },
          { value: 'statistique', label: 'Rapport Statistique' },
          { value: 'audit', label: 'Rapport d\'Audit' }
        ],
        formats_export: [
          { value: 'pdf', label: 'PDF' },
          { value: 'csv', label: 'CSV' }
        ]
      };
    } catch (error) {
      console.error('❌ Erreur récupération types:', error);
      throw error;
    }
  },

  /**
   * Télécharge un rapport
   * @param {string|number} rapportId - ID du rapport (UUID pour nouveau système)
   * @returns {Promise}
   */
  telechargerRapport: async (rapportId) => {
    try {
      // Utiliser la route personnalisée pour télécharger
      // Note: baseURL contient déjà /api, donc on ne met pas /api/ au début
      const response = await api.get(`/rapports/${rapportId}/telecharger/`, {
        params: { format: 'pdf' },
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.error('❌ Erreur téléchargement rapport:', error);
      throw error;
    }
  },

  /**
   * Récupère les détails d'un rapport
   * @param {string|number} rapportId - ID du rapport (UUID pour nouveau système)
   * @returns {Promise}
   */
  getDetailRapport: async (rapportId) => {
    try {
      // Utiliser le nouveau système avec ReportViewSet
      // Note: baseURL contient déjà /api, donc on ne met pas /api/ au début
      const response = await api.get(`/rapports/reports/${rapportId}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération détail rapport:', error);
      throw error;
    }
  },

  /**
   * Supprime un rapport
   * @param {string|number} rapportId - ID du rapport (UUID pour nouveau système)
   * @returns {Promise}
   */
  supprimerRapport: async (rapportId) => {
    try {
      // Utiliser le nouveau système avec ReportViewSet
      // Note: baseURL contient déjà /api, donc on ne met pas /api/ au début
      const response = await api.delete(`/rapports/reports/${rapportId}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur suppression rapport:', error);
      throw error;
    }
  },

  /**
   * Télécharge un rapport et déclenche le download dans le navigateur
   * @param {number} rapportId - ID du rapport
   * @param {string} filename - Nom du fichier
   */
  telechargerEtSauvegarder: async (rapportId, filename) => {
    try {
      const response = await reportService.telechargerRapport(rapportId);
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur téléchargement et sauvegarde:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques depuis la base de données
   * @param {string} dateDebut - Date de début (YYYY-MM-DD)
   * @param {string} dateFin - Date de fin (YYYY-MM-DD)
   * @param {string} typeRapport - Type de rapport
   * @returns {Promise}
   */
  getStatistiques: async (dateDebut, dateFin, typeRapport = 'resume_mensuel') => {
    try {
      const params = new URLSearchParams({
        date_debut: dateDebut,
        date_fin: dateFin,
        type_rapport: typeRapport,
      });
      // Augmenter le timeout à 60 secondes pour les statistiques (calculs complexes)
      // Utiliser l'ancien endpoint pour les statistiques (RapportViewSet)
      // Note: baseURL contient déjà /api, donc on ne met pas /api/ au début
      const response = await api.get(`/rapports/statistiques/?${params}`, {
        timeout: 60000, // 60 secondes au lieu de 30
      });
      return response.data;
    } catch (error) {
      // Ne logger que si ce n'est pas une erreur de timeout, réseau normale ou 500
      if (
        error.code !== 'ERR_NETWORK' && 
        error.code !== 'ERR_CONNECTION_REFUSED' &&
        error.code !== 'ECONNABORTED' &&
        error.code !== 'ERR_BAD_RESPONSE' &&
        !error.message?.includes('timeout') &&
        error.response?.status !== 500
      ) {
        console.error('❌ Erreur récupération statistiques:', error);
      }
      // Retourner un objet vide au lieu de throw pour éviter de casser l'UI
      return {
        success: false,
        erreur: error.code === 'ECONNABORTED' || error.message?.includes('timeout')
          ? 'Le calcul des statistiques prend plus de temps que prévu. Veuillez réessayer.'
          : error.response?.status === 500
          ? 'Erreur serveur lors du calcul des statistiques. Veuillez réessayer plus tard.'
          : (error.response?.data?.erreur || error.message || 'Erreur lors de la récupération des statistiques'),
        details: error.response?.data?.details || null
      };
    }
  },
};

export default reportService;

