/**
 * Service pour générer des rapports d'audit professionnels
 * Transforme les données techniques en rapports structurés et compréhensibles
 */

/**
 * Génère un identifiant unique pour l'événement
 */
const generateEventId = (entry) => {
  if (entry.id) {
    const date = entry.date_action ? new Date(entry.date_action) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `EVT-${year}${month}${day}-${String(entry.id).padStart(4, '0')}`;
  }
  const now = new Date();
  return `EVT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-XXXX`;
};

/**
 * Formate la date et l'heure
 */
const formatDateTime = (dateString) => {
  if (!dateString) return 'Non fournie / information manquante';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return 'Format invalide';
  }
};

/**
 * Détermine l'origine de l'action
 */
const getActionOrigin = (entry) => {
  if (entry.utilisateur_display === 'Système' || entry.utilisateur_info?.username === 'Système' || !entry.utilisateur_display) {
    return 'Système (automatique)';
  }
  return entry.utilisateur_display || entry.utilisateur_info?.full_name || entry.utilisateur_info?.username || 'Non spécifié';
};

/**
 * Analyse l'adresse IP
 */
const analyzeIP = (ip) => {
  if (!ip) return 'Non fournie / information manquante';
  
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.') || ip === 'localhost') {
    return `${ip} (localhost – machine interne)`;
  }
  
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return `${ip} (réseau interne)`;
  }
  
  return `${ip} (externe)`;
};

/**
 * Détermine le type d'opération
 */
const getOperationType = (action) => {
  const actionMap = {
    'creation': 'Création d\'un compte utilisateur',
    'modification': 'Modification d\'un compte utilisateur',
    'suppression': 'Suppression d\'un compte utilisateur',
    'connexion': 'Connexion au système',
    'deconnexion': 'Déconnexion du système',
    'validation': 'Validation d\'une opération',
    'consultation': 'Consultation de données',
    'otp': 'Validation de code OTP',
  };
  
  return actionMap[action?.toLowerCase()] || `Opération: ${action || 'Non spécifiée'}`;
};

/**
 * Extrait les informations de la ressource
 */
const extractResourceInfo = (entry, description) => {
  const info = {
    type: entry.ressource || 'Non spécifié',
    name: null,
    email: null,
    modifiedFields: []
  };

  // Essayer d'extraire depuis la description
  if (description) {
    // Nom d'utilisateur
    const usernameMatch = description.match(/username:\s*([^,]+)/i) || 
                         description.match(/Nom d'utilisateur:\s*([^,]+)/i) ||
                         description.match(/utilisateur:\s*([^,]+)/i);
    if (usernameMatch) {
      info.name = usernameMatch[1].trim();
    }

    // Email
    const emailMatch = description.match(/email:\s*([^,]+)/i) || 
                      description.match(/Email:\s*([^,]+)/i);
    if (emailMatch) {
      info.email = emailMatch[1].trim();
    }
  }

  // Utiliser les données de l'entrée si disponibles
  if (entry.ressource_id) {
    info.id = entry.ressource_id;
  }

  return info;
};

/**
 * Génère un résumé court pour les utilisateurs (format narratif sans détails techniques)
 */
const generateShortSummary = (entry, resourceInfo, ipAnalysis) => {
  const user = getActionOrigin(entry);
  const action = entry.action_display || entry.action || 'effectué une action';
  const resource = resourceInfo.type || 'une ressource';
  const name = resourceInfo.name ? ` ${resourceInfo.name}` : '';
  
  // Mapper les actions vers des descriptions naturelles
  const actionMap = {
    'connexion': 's\'est connecté',
    'login': 's\'est connecté',
    'deconnexion': 's\'est déconnecté',
    'logout': 's\'est déconnecté',
    'creation': 'a créé',
    'create': 'a créé',
    'modification': 'a modifié',
    'update': 'a modifié',
    'suppression': 'a supprimé',
    'delete': 'a supprimé',
    'consultation': 'a consulté',
    'view': 'a consulté',
  };
  
  const actionText = actionMap[action?.toLowerCase()] || 'a effectué une action sur';
  
  // Mapper les ressources vers des descriptions naturelles
  const resourceMap = {
    'Fiche Criminelle': 'la fiche criminelle',
    'Fichier Criminel': 'le dossier',
    'Utilisateur': 'le compte utilisateur',
    'Preuve Numérique': 'la preuve numérique',
    'Investigation': 'l\'enquête',
    'Assignation': 'l\'assignation',
    'Rapport': 'le rapport',
  };
  
  const resourceText = resourceMap[resource] || resource.toLowerCase();
  
  // Formater la date si disponible
  let dateTime = '';
  if (entry.date_action) {
    try {
      const date = new Date(entry.date_action);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      dateTime = ` le ${day}/${month}/${year} à ${hours}h${minutes}`;
    } catch (e) {
      // Ignorer les erreurs de formatage
    }
  }
  
  // Générer le résumé narratif selon le type d'action
  if (user.includes('Système')) {
    if (action.toLowerCase() in ['connexion', 'login']) {
      return `Le système s'est connecté${dateTime}.`;
    } else if (action.toLowerCase() in ['deconnexion', 'logout']) {
      return `Le système s'est déconnecté${dateTime ? dateTime.split(' à ')[1] : ''}.`;
    } else if (name) {
      return `Le système ${actionText} ${resourceText} de${name}.`;
    } else {
      return `Le système ${actionText} ${resourceText}.`;
    }
  } else {
    if (action.toLowerCase() in ['connexion', 'login']) {
      return `L'utilisateur ${user} ${actionText}${dateTime}.`;
    } else if (action.toLowerCase() in ['deconnexion', 'logout']) {
      const timeOnly = dateTime ? dateTime.split(' à ')[1] : '';
      return `L'utilisateur ${user} ${actionText}${timeOnly ? ` à ${timeOnly}` : ''}.`;
    } else if (name) {
      return `${user} ${actionText} ${resourceText} de${name}.`;
    } else {
      return `${user} ${actionText} ${resourceText}.`;
    }
  }
};

/**
 * Génère l'analyse IA détaillée (version courte et concise)
 */
const generateDetailedAnalysis = (entry, resourceInfo, ipAnalysis, iaAnalysis) => {
  const user = getActionOrigin(entry);
  
  // Analyse courte selon le contexte
  if (user.includes('Système')) {
    if (ipAnalysis.includes('localhost') || ipAnalysis.includes('interne')) {
      return "Action automatique interne détectée depuis le serveur local.";
    }
    return "Action automatique du système détectée.";
  }
  
  if (entry.message_erreur) {
    return `Erreur détectée lors de l'opération : ${entry.message_erreur}.`;
  }
  
  if (ipAnalysis.includes('externe')) {
    return `Opération effectuée depuis un réseau externe (${entry.ip_adresse}).`;
  }
  
  return "Opération effectuée avec succès.";
};

/**
 * Calcule le score de risque
 */
const calculateRiskScore = (entry, ipAnalysis, iaAnalysis) => {
  let score = 50; // Score de base

  // IP locale = moins de risque
  if (ipAnalysis.includes('localhost') || ipAnalysis.includes('interne')) {
    score -= 20;
  } else if (ipAnalysis.includes('externe')) {
    score += 10;
  }

  // Action système = moins de risque
  const user = getActionOrigin(entry);
  if (user.includes('Système')) {
    score -= 20;
  }

  // Erreur = plus de risque
  if (entry.message_erreur) {
    score += 30;
  }

  // Données manquantes = légèrement plus de risque
  if (!entry.date_action) {
    score += 5;
  }

  // Action de suppression = plus de risque
  if (entry.action === 'suppression') {
    score += 20;
  }

  // Score de confiance IA si disponible
  if (iaAnalysis && iaAnalysis.score_confiance) {
    const iaScore = (1 - iaAnalysis.score_confiance) * 50;
    score = Math.round((score + iaScore) / 2);
  }

  // Limiter entre 0 et 100
  score = Math.max(0, Math.min(100, score));

  const level = score < 30 ? 'Faible' : score < 60 ? 'Modéré' : score < 80 ? 'Élevé' : 'Critique';
  
  return {
    score,
    level,
    reasons: generateRiskReasons(entry, ipAnalysis, user, score)
  };
};

/**
 * Génère les motifs du score de risque
 */
const generateRiskReasons = (entry, ipAnalysis, user, score) => {
  const reasons = [];

  if (user.includes('Système')) {
    reasons.push('Action automatique interne détectée');
  }

  if (ipAnalysis.includes('localhost') || ipAnalysis.includes('interne')) {
    reasons.push('Adresse IP locale');
  } else if (ipAnalysis.includes('externe')) {
    reasons.push('Adresse IP externe');
  }

  if (!entry.date_action) {
    reasons.push('Horodatage manquant');
  }

  if (entry.message_erreur) {
    reasons.push('Erreur détectée dans l\'opération');
  } else {
    reasons.push('Aucune erreur détectée');
  }

  if (entry.action === 'suppression') {
    reasons.push('Opération de suppression (sensible)');
  }

  return reasons;
};

/**
 * Génère les tags de classification
 */
const generateTags = (entry, ipAnalysis, user) => {
  const tags = [];

  const action = entry.action?.toLowerCase();
  if (action === 'modification') tags.push('modification');
  if (action === 'creation') tags.push('création');
  if (action === 'suppression') tags.push('suppression');
  if (action === 'connexion') tags.push('connexion');

  if (user.includes('Système')) {
    tags.push('automatique');
    tags.push('interne');
  }

  if (ipAnalysis.includes('localhost') || ipAnalysis.includes('interne')) {
    tags.push('interne');
  } else {
    tags.push('externe');
  }

  if (!entry.date_action) {
    tags.push('information_manquante');
  }

  if (entry.message_erreur) {
    tags.push('erreur');
  }

  return tags;
};

/**
 * Génère les recommandations
 */
const generateRecommendations = (entry, resourceInfo, ipAnalysis, user) => {
  const recommendations = [];

  if (user.includes('Système')) {
    recommendations.push('Vérifier si une tâche de maintenance était prévue à ce moment-là.');
    recommendations.push('Analyser les scripts automatiques récents pour confirmer l\'origine de l\'action.');
  }

  if (!entry.date_action) {
    recommendations.push('Compléter le journal en ajoutant l\'horodatage exact de l\'opération.');
  }

  if (resourceInfo.modifiedFields.length === 0 && entry.action === 'modification') {
    recommendations.push('Ajouter les détails des champs modifiés (avant/après) dans le journal.');
  }

  if (ipAnalysis.includes('externe')) {
    recommendations.push('Vérifier l\'authentification et l\'autorisation de l\'utilisateur pour cette opération.');
  }

  recommendations.push('Conserver cet événement dans les logs pour traçabilité interne.');

  if (entry.message_erreur) {
    recommendations.push('Investigator l\'erreur détectée et corriger le problème à l\'origine.');
  }

  if (entry.action === 'suppression') {
    recommendations.push('Vérifier la cohérence avec les opérations programmées et confirmer l\'autorisation.');
  }

  return recommendations;
};

/**
 * Génère un message court pour l'administrateur
 */
const generateAdminMessage = (entry, resourceInfo, user) => {
  const action = entry.action_display || entry.action || 'action';
  const name = resourceInfo.name || 'un compte';
  
  if (user.includes('Système')) {
    return `Merci de confirmer si une ${action.toLowerCase()}${name !== 'un compte' ? ` du compte ${name}` : ''} a été effectuée par un script interne. ${!entry.date_action ? 'L\'horodatage ne figure pas dans le log actuel.' : ''}`;
  }
  
  return `Vérifier l'opération de ${action.toLowerCase()}${name !== 'un compte' ? ` sur le compte ${name}` : ''} effectuée par ${user}. ${!entry.date_action ? 'L\'horodatage est manquant.' : ''}`;
};

/**
 * Identifie les données manquantes
 */
const identifyMissingData = (entry, resourceInfo) => {
  const missing = [];

  if (!entry.date_action) {
    missing.push('Horodatage');
  }

  if (entry.action === 'modification' && resourceInfo.modifiedFields.length === 0) {
    missing.push('Champs modifiés (avant/après)');
  }

  if (!entry.ip_adresse) {
    missing.push('Adresse IP');
  }

  if (entry.action === 'creation' && !resourceInfo.name) {
    missing.push('Nom du compte créé');
  }

  if (entry.action === 'suppression' && !resourceInfo.name) {
    missing.push('Nom du compte supprimé');
  }

  if (entry.action === 'modification' && !resourceInfo.name) {
    missing.push('Nom du compte modifié');
  }

  if (entry.action && entry.action.includes('système') && !entry.details) {
    missing.push('Identité de la routine ou script ayant déclenché l\'action');
  }

  return missing;
};

/**
 * Génère le rapport d'audit complet
 */
export const generateAuditReport = (entry, iaAnalysis = null) => {
  const description = entry.description || '';
  const resourceInfo = extractResourceInfo(entry, description);
  const ipAnalysis = analyzeIP(entry.ip_adresse);
  const user = getActionOrigin(entry);
  const riskAssessment = calculateRiskScore(entry, ipAnalysis, iaAnalysis);
  const tags = generateTags(entry, ipAnalysis, user);
  const recommendations = generateRecommendations(entry, resourceInfo, ipAnalysis, user);
  const missingData = identifyMissingData(entry, resourceInfo);

  return {
    // 1. Informations Générales
    generalInfo: {
      eventId: generateEventId(entry),
      dateTime: formatDateTime(entry.date_action),
      origin: user,
      ipAddress: ipAnalysis,
      operationType: getOperationType(entry.action)
    },

    // 2. Ressource Concernée
    resource: {
      type: resourceInfo.type,
      name: resourceInfo.name || 'Non spécifié',
      email: resourceInfo.email || 'Non spécifié',
      modifiedFields: resourceInfo.modifiedFields.length > 0 
        ? resourceInfo.modifiedFields 
        : ['Non spécifiés dans le journal (information manquante)']
    },

    // 3. Résumé Court
    shortSummary: generateShortSummary(entry, resourceInfo, ipAnalysis),

    // 4. Analyse IA Détaillée
    detailedAnalysis: generateDetailedAnalysis(entry, resourceInfo, ipAnalysis, iaAnalysis),

    // 5. Évaluation des Risques
    riskAssessment: {
      score: riskAssessment.score,
      level: riskAssessment.level,
      reasons: riskAssessment.reasons
    },

    // 6. Classification IA
    classification: tags,

    // 7. Recommandations
    recommendations: recommendations,

    // 8. Message Administrateur
    adminMessage: generateAdminMessage(entry, resourceInfo, user),

    // 9. Données Manquantes
    missingData: missingData,

    // 10. Données Techniques Brutes
    rawData: {
      description: description || 'Aucune description disponible',
      user: user,
      action: entry.action_display || entry.action || 'Non spécifié',
      resource: entry.ressource || 'Non spécifié',
      username: resourceInfo.name || 'Non spécifié',
      email: resourceInfo.email || 'Non spécifié',
      endpoint: entry.endpoint || 'Non spécifié',
      method: entry.methode_http || 'Non spécifié',
      status: entry.reussi ? 'Succès' : 'Échec',
      error: entry.message_erreur || null
    }
  };
};

export default {
  generateAuditReport
};

