/**
 * Cache pour les analyses IA des journaux d'audit
 * Évite de ré-analyser les mêmes descriptions
 */

const CACHE_KEY_PREFIX = 'audit_ia_analysis_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
const MAX_CACHE_SIZE = 100; // Maximum 100 entrées en cache

/**
 * Génère une clé de cache basée sur le hash de la description
 */
const getCacheKey = (description) => {
  // Utiliser un hash simple pour la clé
  let hash = 0;
  for (let i = 0; i < description.length; i++) {
    const char = description.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32-bit entier
  }
  return `${CACHE_KEY_PREFIX}${Math.abs(hash)}`;
};

/**
 * Nettoie le cache des entrées expirées
 */
const cleanExpiredCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleaned = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (cached && cached.timestamp && (now - cached.timestamp) > CACHE_DURATION) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch (e) {
          // Si erreur de parsing, supprimer la clé
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });
    
    if (cleaned > 0) {
      console.debug(`Cache nettoyé: ${cleaned} entrées expirées supprimées`);
    }
  } catch (error) {
    console.debug('Erreur lors du nettoyage du cache:', error);
  }
};

/**
 * Limite la taille du cache en supprimant les plus anciennes entrées
 */
const limitCacheSize = () => {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    
    if (keys.length > MAX_CACHE_SIZE) {
      // Trier par timestamp (plus anciennes en premier)
      const entries = keys.map(key => {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          return { key, timestamp: cached?.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => a.timestamp - b.timestamp);
      
      // Supprimer les plus anciennes
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      toRemove.forEach(({ key }) => localStorage.removeItem(key));
      
      console.debug(`Cache limité: ${toRemove.length} entrées supprimées`);
    }
  } catch (error) {
    console.debug('Erreur lors de la limitation du cache:', error);
  }
};

/**
 * Récupère une analyse depuis le cache
 * @param {string} description - Description du journal
 * @returns {object|null} Analyse en cache ou null
 */
export const getCachedAnalysis = (description) => {
  if (!description) return null;
  
  try {
    const key = getCacheKey(description);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = Date.now();
    
    // Vérifier si le cache est expiré
    if (data.timestamp && (now - data.timestamp) > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data.analysis;
  } catch (error) {
    console.debug('Erreur lors de la récupération du cache:', error);
    return null;
  }
};

/**
 * Met en cache une analyse
 * @param {string} description - Description du journal
 * @param {object} analysis - Résultat de l'analyse
 */
export const setCachedAnalysis = (description, analysis) => {
  if (!description || !analysis) return;
  
  try {
    const key = getCacheKey(description);
    const data = {
      analysis,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(key, JSON.stringify(data));
    
    // Nettoyer le cache périodiquement
    if (Math.random() < 0.1) { // 10% de chance à chaque appel
      cleanExpiredCache();
      limitCacheSize();
    }
  } catch (error) {
    // Si localStorage est plein, nettoyer et réessayer
    if (error.name === 'QuotaExceededError') {
      cleanExpiredCache();
      limitCacheSize();
      try {
        const key = getCacheKey(description);
        const data = {
          analysis,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.debug('Impossible de mettre en cache après nettoyage:', e);
      }
    } else {
      console.debug('Erreur lors de la mise en cache:', error);
    }
  }
};

/**
 * Vide tout le cache
 */
export const clearCache = () => {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
    console.debug(`Cache vidé: ${keys.length} entrées supprimées`);
  } catch (error) {
    console.debug('Erreur lors du vidage du cache:', error);
  }
};

/**
 * Analyse rapide locale sans appel API
 * Utilise les données déjà disponibles pour générer une analyse basique
 */
export const quickAnalysis = (entry) => {
  if (!entry) return null;
  
  const analysis = {
    utilisateur: entry.utilisateur_display || entry.utilisateur_info?.username || null,
    action: entry.action_display || entry.action || 'action',
    evenement_type: entry.action || 'autre',
    ip: entry.ip_adresse || null,
    statut: entry.reussi ? 'succès' : (entry.message_erreur ? 'échec' : 'autre'),
    score_confiance: 0.75, // Score moyen pour analyse locale
    details: {}
  };
  
  // Ajouter les détails techniques si disponibles
  if (entry.endpoint) {
    analysis.endpoint = entry.endpoint;
    analysis.details.endpoint = entry.endpoint;
  }
  
  if (entry.methode_http) {
    analysis.methode_http = entry.methode_http;
    analysis.details.methode_http = entry.methode_http;
  }
  
  if (entry.duree_ms) {
    analysis.duree_ms = entry.duree_ms;
    analysis.details.duree_ms = entry.duree_ms;
  }
  
  // Parser le User-Agent si disponible
  if (entry.user_agent) {
    try {
      const { parseUserAgent } = require('./userAgentParser');
      const uaInfo = parseUserAgent(entry.user_agent);
      if (uaInfo.navigateur) {
        analysis.navigateur = uaInfo.navigateur;
        analysis.details.navigateur = uaInfo.navigateur;
      }
      if (uaInfo.systeme) {
        analysis.systeme = uaInfo.systeme;
        analysis.details.systeme = uaInfo.systeme;
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
  }
  
  // Détecter le type d'événement
  const actionLower = (entry.action || '').toLowerCase();
  if (actionLower.includes('connexion')) {
    analysis.evenement_type = 'connexion';
    analysis.action = 'connexion';
    analysis.score_confiance = 0.85;
  }
  
  return analysis;
};

