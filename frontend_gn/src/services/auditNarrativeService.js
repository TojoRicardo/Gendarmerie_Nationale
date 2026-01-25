/**
 * Service pour générer des résumés narratifs clairs et naturels
 * à partir des journaux d'audit, destinés aux non-informaticiens
 */

/**
 * Mappe les actions techniques vers des descriptions naturelles
 */
const actionTypeMap = {
  'connexion': 'login',
  'login': 'login',
  'deconnexion': 'logout',
  'logout': 'logout',
  'creation': 'create',
  'create': 'create',
  'modification': 'update',
  'update': 'update',
  'suppression': 'delete',
  'delete': 'delete',
  'consultation': 'view',
  'view': 'view',
  'navigation': 'navigate',
  'navigate': 'navigate',
};

/**
 * Mappe les ressources vers des descriptions naturelles
 */
const resourceTypeMap = {
  'Fiche Criminelle': 'fiche criminelle',
  'Fichier Criminel': 'dossier',
  'Utilisateur': 'compte utilisateur',
  'Preuve Numérique': 'preuve numérique',
  'Investigation': 'enquête',
  'Assignation': 'assignation',
  'Rapport': 'rapport',
};

/**
 * Formate une date en français naturel
 */
const formatDateNatural = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `le ${day}/${month}/${year} à ${hours}h${minutes}`;
  } catch (e) {
    return '';
  }
};

/**
 * Formate une heure simple
 */
const formatTimeSimple = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}h${minutes}`;
  } catch (e) {
    return '';
  }
};

/**
 * Prépare les données pour Ollama
 */
export const prepareNarrativeData = (entries) => {
  if (!entries || entries.length === 0) return null;

  // Grouper par utilisateur
  const userGroups = {};
  
  entries.forEach(entry => {
    const user = entry.utilisateur_display || 
                 entry.utilisateur_info?.full_name || 
                 entry.utilisateur_info?.username || 
                 'Système';
    
    if (!userGroups[user]) {
      userGroups[user] = [];
    }

    const actionType = actionTypeMap[entry.action?.toLowerCase()] || entry.action?.toLowerCase() || 'action';
    const resource = resourceTypeMap[entry.ressource] || entry.ressource?.toLowerCase() || 'ressource';
    
    // Extraire le nom de la cible depuis la description ou les détails
    let targetName = null;
    if (entry.description) {
      const nameMatch = entry.description.match(/username:\s*([^,]+)/i) ||
                       entry.description.match(/Nom d'utilisateur:\s*([^,]+)/i) ||
                       entry.description.match(/nom:\s*([^,]+)/i);
      if (nameMatch) {
        targetName = nameMatch[1].trim();
      }
    }

    // Extraire depuis ressource_id si disponible
    if (!targetName && entry.ressource_id) {
      targetName = entry.ressource_id.toString();
    }

    userGroups[user].push({
      type: actionType,
      timestamp: entry.date_action || new Date().toISOString(),
      resource: resource,
      target_name: targetName,
      details: {
        ip: entry.ip_adresse,
        success: entry.reussi,
        error: entry.message_erreur
      }
    });
  });

  // Convertir en format JSON pour Ollama
  const result = Object.keys(userGroups).map(user => ({
    user: user,
    actions: userGroups[user]
  }));

  return result.length === 1 ? result[0] : result;
};

/**
 * Génère un prompt pour Ollama pour créer un résumé narratif
 */
export const generateNarrativePrompt = (data, isDailySummary = false) => {
  if (isDailySummary) {
    return `Tu es un assistant spécialisé dans la création de résumés narratifs clairs destinés aux non-informaticiens.

À partir des actions suivantes, génère un résumé narratif structuré et chronologique.

Rédige un résumé narratif clair et structuré des actions réalisées par l'utilisateur.
Le texte doit être fluide, chronologique et lisible par un non-informaticien.
Transforme chaque action en phrase naturelle, et enchaîne-les comme un récit du déroulement de la journée.

Conclus par un petit résumé final de 1-2 phrases.

Style attendu :
"Le matin, Ricardo s'est connecté à 08h12 puis a consulté plusieurs dossiers.
Il a créé la fiche criminelle de Randrianasolo Marc et mis à jour le dossier de Rabenoro.
Plus tard, il a ouvert la page des preuves numériques avant de se déconnecter."

Données :
${JSON.stringify(data, null, 2)}

Rédige uniquement le résumé narratif, sans explication supplémentaire.`;
  }

  return `Tu es un assistant spécialisé dans la création de résumés narratifs clairs destinés aux non-informaticiens.

À partir d'un journal d'actions, génère des phrases naturelles comme si une personne racontait ce que l'utilisateur a fait.

Objectifs :
- Décrire les actions dans un style clair, professionnel et humain.
- Éviter les termes techniques (« endpoint », « POST », « route », « id »).
- Toujours indiquer : qui, quoi, où, quand.
- Permettre d'enchaîner plusieurs actions dans un même paragraphe narratif.

Format de sortie :
Une phrase ou un paragraphe narratif, en français naturel, sans aucun jargon technique.
Le ton doit être simple, professionnel et lisible par n'importe quel agent ou enquêteur.

Modèle de rédaction par type d'action :
- Login: "L'utilisateur X s'est connecté le date à heure."
- Logout: "L'utilisateur X s'est déconnecté à heure."
- Navigation: "Il a ouvert la page NomPage."
- Création: "Il a créé la fiche criminelle de Nom."
- Modification: "Il a modifié le dossier de Nom."
- Suppression: "Il a supprimé le fichier de Nom."
- Consultation: "Il a consulté les détails de Nom."

Si tu reçois plusieurs actions, crée un récit fluide, chronologique, sans sauter d'étapes.

Données :
${JSON.stringify(data, null, 2)}

Rédige uniquement le résumé narratif, sans explication supplémentaire.`;
};

/**
 * Génère un résumé narratif simple (sans Ollama) pour affichage rapide
 */
export const generateSimpleNarrative = (entry) => {
  if (!entry) return 'Aucune action enregistrée.';

  const user = entry.utilisateur_display || 
               entry.utilisateur_info?.full_name || 
               entry.utilisateur_info?.username || 
               'Système';
  
  const action = entry.action?.toLowerCase() || 'action';
  const resource = resourceTypeMap[entry.ressource] || entry.ressource?.toLowerCase() || 'ressource';
  const dateTime = formatDateNatural(entry.date_action);
  const time = formatTimeSimple(entry.date_action);

  // Extraire le nom de la cible
  let targetName = null;
  if (entry.description) {
    const nameMatch = entry.description.match(/username:\s*([^,]+)/i) ||
                     entry.description.match(/Nom d'utilisateur:\s*([^,]+)/i) ||
                     entry.description.match(/nom:\s*([^,]+)/i);
    if (nameMatch) {
      targetName = nameMatch[1].trim();
    }
  }

  // Générer la phrase selon le type d'action
  let narrative = '';

  switch (action) {
    case 'connexion':
    case 'login':
      narrative = `L'utilisateur ${user} s'est connecté ${dateTime || 'récemment'}.`;
      break;
    
    case 'deconnexion':
    case 'logout':
      narrative = `L'utilisateur ${user} s'est déconnecté ${time ? `à ${time}` : 'récemment'}.`;
      break;
    
    case 'creation':
    case 'create':
      if (targetName) {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} créé ${resource === 'fiche criminelle' ? 'la' : 'le'} ${resource} de ${targetName}.`;
      } else {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} créé ${resource === 'fiche criminelle' ? 'une' : 'un'} ${resource}.`;
      }
      break;
    
    case 'modification':
    case 'update':
      if (targetName) {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} modifié ${resource === 'fiche criminelle' ? 'la' : 'le'} ${resource} de ${targetName}.`;
      } else {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} modifié ${resource === 'fiche criminelle' ? 'une' : 'un'} ${resource}.`;
      }
      break;
    
    case 'suppression':
    case 'delete':
      if (targetName) {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} supprimé ${resource === 'fiche criminelle' ? 'la' : 'le'} ${resource} de ${targetName}.`;
      } else {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} supprimé ${resource === 'fiche criminelle' ? 'une' : 'un'} ${resource}.`;
      }
      break;
    
    case 'consultation':
    case 'view':
      if (targetName) {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} consulté ${resource === 'fiche criminelle' ? 'la' : 'le'} ${resource} de ${targetName}.`;
      } else {
        narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} consulté ${resource === 'fiche criminelle' ? 'une' : 'un'} ${resource}.`;
      }
      break;
    
    default:
      narrative = `${user === 'Système' ? 'Le système a' : `${user} a`} effectué une action sur ${resource === 'fiche criminelle' ? 'une' : 'un'} ${resource}.`;
  }

  return narrative;
};

/**
 * Génère un résumé narratif pour plusieurs entrées (chronologique)
 */
export const generateMultipleNarratives = (entries) => {
  if (!entries || entries.length === 0) return 'Aucune action enregistrée.';

  // Trier par date
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = new Date(a.date_action || 0);
    const dateB = new Date(b.date_action || 0);
    return dateA - dateB;
  });

  const narratives = sortedEntries.map(entry => generateSimpleNarrative(entry));
  
  // Enchaîner les phrases de manière naturelle
  let result = narratives[0];
  
  for (let i = 1; i < narratives.length; i++) {
    const prevNarrative = narratives[i - 1];
    const currentNarrative = narratives[i];
    
    // Vérifier si c'est le même utilisateur
    const prevUser = sortedEntries[i - 1].utilisateur_display || 
                     sortedEntries[i - 1].utilisateur_info?.full_name || 
                     sortedEntries[i - 1].utilisateur_info?.username || 
                     'Système';
    const currentUser = sortedEntries[i].utilisateur_display || 
                        sortedEntries[i].utilisateur_info?.full_name || 
                        sortedEntries[i].utilisateur_info?.username || 
                        'Système';
    
    if (prevUser === currentUser) {
      // Même utilisateur, utiliser "Il" ou "Il a ensuite"
      const timeDiff = new Date(sortedEntries[i].date_action) - new Date(sortedEntries[i - 1].date_action);
      const minutesDiff = timeDiff / (1000 * 60);
      
      if (minutesDiff < 5) {
        result += ` Quelques instants plus tard, ${currentNarrative.toLowerCase().replace(/^(l'utilisateur|le système|il|elle)/i, '').trim()}`;
      } else if (minutesDiff < 30) {
        result += ` Peu après, ${currentNarrative.toLowerCase().replace(/^(l'utilisateur|le système|il|elle)/i, '').trim()}`;
      } else {
        result += ` Plus tard, ${currentNarrative.toLowerCase().replace(/^(l'utilisateur|le système|il|elle)/i, '').trim()}`;
      }
    } else {
      // Utilisateur différent, nouvelle phrase
      result += ` ${currentNarrative}`;
    }
  }

  return result;
};

/**
 * Génère un résumé journalier narratif
 */
export const generateDailySummary = (entries) => {
  if (!entries || entries.length === 0) return 'Aucune action enregistrée pour cette journée.';

  // Grouper par utilisateur
  const userGroups = {};
  
  entries.forEach(entry => {
    const user = entry.utilisateur_display || 
                 entry.utilisateur_info?.full_name || 
                 entry.utilisateur_info?.username || 
                 'Système';
    
    if (!userGroups[user]) {
      userGroups[user] = [];
    }
    
    userGroups[user].push(entry);
  });

  // Trier chaque groupe par date
  Object.keys(userGroups).forEach(user => {
    userGroups[user].sort((a, b) => {
      const dateA = new Date(a.date_action || 0);
      const dateB = new Date(b.date_action || 0);
      return dateA - dateB;
    });
  });

  // Générer le résumé pour chaque utilisateur
  const summaries = Object.keys(userGroups).map(user => {
    const userEntries = userGroups[user];
    const narrative = generateMultipleNarratives(userEntries);
    
    // Ajouter un contexte temporel
    const firstEntry = userEntries[0];
    const lastEntry = userEntries[userEntries.length - 1];
    const firstTime = formatTimeSimple(firstEntry.date_action);
    const lastTime = formatTimeSimple(lastEntry.date_action);
    
    let timeContext = '';
    if (firstTime) {
      const hour = parseInt(firstTime.split('h')[0]);
      if (hour < 12) {
        timeContext = 'Le matin, ';
      } else if (hour < 18) {
        timeContext = 'L\'après-midi, ';
      } else {
        timeContext = 'Le soir, ';
      }
    }
    
    return `${timeContext}${narrative}`;
  });

  // Combiner les résumés
  let finalSummary = summaries.join('\n\n');
  
  // Ajouter un résumé final
  const totalActions = entries.length;
  const users = Object.keys(userGroups);
  const userCount = users.length;
  
  if (userCount === 1) {
    finalSummary += `\n\nAu total, ${users[0]} a effectué ${totalActions} action${totalActions > 1 ? 's' : ''} au cours de cette journée.`;
  } else {
    finalSummary += `\n\nAu total, ${totalActions} action${totalActions > 1 ? 's' : ''} ont été effectuées par ${userCount} utilisateur${userCount > 1 ? 's' : ''} au cours de cette journée.`;
  }

  return finalSummary;
};

export default {
  prepareNarrativeData,
  generateNarrativePrompt,
  generateSimpleNarrative,
  generateMultipleNarratives,
  generateDailySummary,
};

