/**
 * Service pour générer automatiquement des sections "Résultats et Analyse"
 * professionnelles à partir de données d'audit, statistiques ou graphiques
 */

/**
 * Analyse les données d'audit et génère une section "Résultats et Analyse"
 */
export const generateAnalysisReport = (data, dataType = 'audit') => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return {
      presentation: "Aucune donnée disponible pour l'analyse.",
      analysis: "Impossible de procéder à l'analyse en l'absence de données.",
      interpretation: "Les données manquantes ne permettent pas d'établir des conclusions.",
      conclusion: "Il est nécessaire de collecter des données supplémentaires pour effectuer une analyse pertinente."
    };
  }

  switch (dataType) {
    case 'audit':
      return generateAuditAnalysis(data);
    case 'statistics':
      return generateStatisticsAnalysis(data);
    case 'graph':
      return generateGraphAnalysis(data);
    case 'table':
      return generateTableAnalysis(data);
    default:
      return generateGenericAnalysis(data);
  }
};

/**
 * Génère une analyse pour des données d'audit
 */
const generateAuditAnalysis = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      presentation: "Aucune entrée d'audit disponible.",
      analysis: "Aucune donnée à analyser.",
      interpretation: "Impossible d'interpréter des données absentes.",
      conclusion: "Collecte de données nécessaire."
    };
  }

  // Calculer les statistiques de base
  const totalEntries = entries.length;
  const successCount = entries.filter(e => e.reussi !== false && e.reussi !== undefined).length;
  const errorCount = entries.filter(e => e.reussi === false || e.message_erreur).length;
  const successRate = totalEntries > 0 ? ((successCount / totalEntries) * 100).toFixed(1) : 0;

  // Analyser les types d'actions (utiliser action_display si disponible, sinon action)
  const actionTypes = {};
  entries.forEach(entry => {
    // Utiliser action_display (format lisible) ou action (code) ou le label du content_type
    let action = entry.action_display || entry.action || 'Autre';
    // Si c'est un code d'action, essayer de le rendre plus lisible
    if (action && !entry.action_display) {
      const actionMap = {
        'LOGIN': 'Connexion',
        'LOGOUT': 'Déconnexion',
        'FAILED_LOGIN': 'Échec de connexion',
        'VIEW': 'Consultation',
        'CREATE': 'Création',
        'UPDATE': 'Modification',
        'DELETE': 'Suppression',
        'DOWNLOAD': 'Téléchargement',
        'SEARCH': 'Recherche',
        'SUSPEND': 'Suspension',
        'RESTORE': 'Restauration',
        'PERMISSION_CHANGE': 'Changement de permissions',
        'ACCESS_DENIED': 'Accès refusé',
      };
      action = actionMap[action] || action;
    }
    actionTypes[action] = (actionTypes[action] || 0) + 1;
  });

  // Analyser les utilisateurs (utiliser user_display, utilisateur_display, ou user_info)
  const userActivity = {};
  entries.forEach(entry => {
    const user = entry.user_display || 
                 entry.utilisateur_display || 
                 entry.user_info?.full_name || 
                 entry.user_info?.username || 
                 (entry.user && typeof entry.user === 'object' ? (entry.user.full_name || entry.user.username) : null) ||
                 'Système';
    userActivity[user] = (userActivity[user] || 0) + 1;
  });

  // Analyser les ressources (utiliser resource_type, ressource, ou content_type)
  const resourceTypes = {};
  entries.forEach(entry => {
    // Priorité: resource_type > ressource > content_type.model
    let resource = entry.resource_type || 
                   entry.ressource || 
                   (entry.content_type?.model ? entry.content_type.model : null) ||
                   'Non spécifié';
    // Si c'est un nom de modèle Django, le rendre plus lisible
    if (resource && resource.includes('_')) {
      resource = resource.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    resourceTypes[resource] = (resourceTypes[resource] || 0) + 1;
  });

  // Trouver les actions les plus fréquentes
  const topActions = Object.entries(actionTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([action, count]) => ({ action, count, percentage: ((count / totalEntries) * 100).toFixed(1) }));

  // Trouver les utilisateurs les plus actifs
  const topUsers = Object.entries(userActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([user, count]) => ({ user, count, percentage: ((count / totalEntries) * 100).toFixed(1) }));

  // Analyser la répartition temporelle
  const timeDistribution = analyzeTimeDistribution(entries);

  // Présentation des données
  const presentation = `L'analyse porte sur un échantillon de ${totalEntries} événement${totalEntries > 1 ? 's' : ''} d'audit enregistré${totalEntries > 1 ? 's' : ''}. 
Parmi ces événements, ${successCount} opération${successCount > 1 ? 's' : ''} ${successCount > 1 ? 'ont' : 'a'} été réalisée${successCount > 1 ? 's' : ''} avec succès (${successRate}%), 
tandis que ${errorCount} opération${errorCount > 1 ? 's' : ''} ${errorCount > 1 ? 'ont' : 'a'} rencontré${errorCount > 1 ? '' : ''} des difficultés ou des erreurs. 
Les données couvrent ${Object.keys(actionTypes).length} type${Object.keys(actionTypes).length > 1 ? 's' : ''} d'action${Object.keys(actionTypes).length > 1 ? 's' : ''} distinct${Object.keys(actionTypes).length > 1 ? 's' : ''}, 
${Object.keys(userActivity).length} utilisateur${Object.keys(userActivity).length > 1 ? 's' : ''} différent${Object.keys(userActivity).length > 1 ? 's' : ''}, 
et ${Object.keys(resourceTypes).length} type${Object.keys(resourceTypes).length > 1 ? 's' : ''} de ressource${Object.keys(resourceTypes).length > 1 ? 's' : ''}.`;

  // Analyse
  let analysis = `L'analyse quantitative révèle une répartition hétérogène des activités. `;
  
  if (topActions.length > 0) {
    analysis += `Les actions les plus fréquentes sont : ${topActions.map(a => `${a.action} (${a.count} occurrences, ${a.percentage}%)`).join(', ')}. `;
  }

  if (topUsers.length > 0) {
    analysis += `En termes d'activité utilisateur, les principaux acteurs sont : ${topUsers.map(u => `${u.user} (${u.count} actions, ${u.percentage}%)`).join(', ')}. `;
  }

  if (successRate >= 95) {
    analysis += `Le taux de succès élevé (${successRate}%) indique un fonctionnement globalement stable du système. `;
  } else if (successRate >= 80) {
    analysis += `Le taux de succès modéré (${successRate}%) suggère une performance acceptable avec quelques points d'attention. `;
  } else {
    analysis += `Le taux de succès relativement faible (${successRate}%) nécessite une investigation approfondie des causes d'échec. `;
  }

  if (timeDistribution.peakHour) {
    analysis += `L'activité présente un pic d'utilisation autour de ${timeDistribution.peakHour}h, `;
    analysis += `avec ${timeDistribution.peakCount} événements enregistrés durant cette période. `;
  }

  if (errorCount > 0) {
    const errorRate = ((errorCount / totalEntries) * 100).toFixed(1);
    analysis += `Le taux d'erreur de ${errorRate}% mérite une attention particulière pour identifier les patterns récurrents. `;
  }

  // Interprétation
  let interpretation = `L'interprétation des résultats permet d'identifier plusieurs tendances significatives. `;
  
  if (topActions.length > 0 && topActions[0].percentage > 40) {
    interpretation += `La prédominance de l'action "${topActions[0].action}" (${topActions[0].percentage}%) `;
    interpretation += `suggère une utilisation ciblée du système sur cette fonctionnalité spécifique. `;
  }

  if (topUsers.length > 0 && topUsers[0].percentage > 50) {
    interpretation += `La concentration de l'activité autour de l'utilisateur "${topUsers[0].user}" (${topUsers[0].percentage}%) `;
    interpretation += `indique une répartition inégale des charges de travail ou une spécialisation des rôles. `;
  }

  if (successRate >= 95 && errorCount === 0) {
    interpretation += `L'absence totale d'erreurs et le taux de succès optimal témoignent d'une configuration système robuste et d'une utilisation maîtrisée. `;
  } else if (errorCount > 0) {
    interpretation += `La présence d'erreurs (${errorCount} occurrences) nécessite une analyse des logs d'erreur `;
    interpretation += `pour identifier les causes racines et mettre en place des mesures correctives. `;
  }

  if (timeDistribution.hasPattern) {
    interpretation += `La distribution temporelle montre une activité ${timeDistribution.pattern}, `;
    interpretation += `ce qui peut informer les stratégies de maintenance et d'optimisation des ressources. `;
  }

  // Conclusion partielle
  let conclusion = `En conclusion partielle, l'analyse des ${totalEntries} événements d'audit révèle `;
  
  if (successRate >= 95) {
    conclusion += `un fonctionnement globalement satisfaisant avec un taux de succès de ${successRate}%. `;
  } else {
    conclusion += `des performances mitigées nécessitant une attention particulière sur les ${errorCount} échecs enregistrés. `;
  }

  conclusion += `Les données suggèrent une utilisation principalement orientée vers `;
  if (topActions.length > 0) {
    conclusion += `les actions de type "${topActions[0].action}" et "${topActions[1]?.action || 'autres'}". `;
  } else {
    conclusion += `diverses fonctionnalités du système. `;
  }

  conclusion += `Il est recommandé de poursuivre le monitoring pour confirmer ces tendances `;
  conclusion += `et d'approfondir l'analyse des cas d'erreur pour améliorer la fiabilité globale du système.`;

  return {
    presentation: presentation.trim(),
    analysis: analysis.trim(),
    interpretation: interpretation.trim(),
    conclusion: conclusion.trim()
  };
};

/**
 * Analyse la distribution temporelle des événements
 */
const analyzeTimeDistribution = (entries) => {
  const hourlyCounts = {};
  
  entries.forEach(entry => {
    // Utiliser timestamp, date_action, ou toute autre propriété de date
    const dateValue = entry.timestamp || entry.date_action || entry.created_at || entry.date;
    if (dateValue) {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const hour = date.getHours();
          hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
  });

  if (Object.keys(hourlyCounts).length === 0) {
    return { peakHour: null, peakCount: 0, hasPattern: false, pattern: 'non identifiable' };
  }

  const peakHour = Object.entries(hourlyCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  const peakCount = hourlyCounts[peakHour];

  // Déterminer le pattern
  const totalHours = Object.keys(hourlyCounts).length;
  const avgCount = Object.values(hourlyCounts).reduce((a, b) => a + b, 0) / totalHours;
  const variance = Object.values(hourlyCounts).reduce((sum, count) => {
    return sum + Math.pow(count - avgCount, 2);
  }, 0) / totalHours;

  let pattern = 'uniforme';
  if (variance > avgCount * 2) {
    pattern = 'concentrée sur certaines périodes';
  } else if (variance < avgCount * 0.5) {
    pattern = 'régulière';
  }

  return {
    peakHour: String(peakHour).padStart(2, '0'),
    peakCount,
    hasPattern: true,
    pattern
  };
};

/**
 * Génère une analyse pour des données statistiques
 */
const generateStatisticsAnalysis = (stats) => {
  // À implémenter selon le format des statistiques
  return {
    presentation: "Analyse statistique en cours de développement.",
    analysis: "Les données statistiques nécessitent un format spécifique.",
    interpretation: "Interprétation à compléter selon le type de statistiques.",
    conclusion: "Conclusion partielle à établir après analyse complète."
  };
};

/**
 * Génère une analyse pour un graphique
 */
const generateGraphAnalysis = (graphData) => {
  // À implémenter selon le type de graphique
  return {
    presentation: "Analyse graphique en cours de développement.",
    analysis: "Les données graphiques nécessitent un format spécifique.",
    interpretation: "Interprétation à compléter selon le type de graphique.",
    conclusion: "Conclusion partielle à établir après analyse complète."
  };
};

/**
 * Génère une analyse pour un tableau
 */
const generateTableAnalysis = (tableData) => {
  // À implémenter selon le format du tableau
  return {
    presentation: "Analyse tabulaire en cours de développement.",
    analysis: "Les données tabulaires nécessitent un format spécifique.",
    interpretation: "Interprétation à compléter selon le type de tableau.",
    conclusion: "Conclusion partielle à établir après analyse complète."
  };
};

/**
 * Génère une analyse générique
 */
const generateGenericAnalysis = (data) => {
  return {
    presentation: "Les données fournies nécessitent une analyse spécifique selon leur type.",
    analysis: "Une analyse approfondie permettrait d'extraire des insights pertinents.",
    interpretation: "L'interprétation dépend du contexte et du format des données.",
    conclusion: "Il est recommandé de spécifier le type de données pour une analyse plus précise."
  };
};

/**
 * Formate le rapport d'analyse complet avec structure académique
 */
export const formatAnalysisReport = (analysisData, title = "Résultats et Analyse") => {
  return {
    title,
    sections: {
      "Présentation des données": analysisData.presentation,
      "Analyse": analysisData.analysis,
      "Interprétation": analysisData.interpretation,
      "Conclusion partielle": analysisData.conclusion
    }
  };
};

export default {
  generateAnalysisReport,
  formatAnalysisReport,
  generateAuditAnalysis,
};

