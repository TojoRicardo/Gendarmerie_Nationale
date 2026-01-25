/**
 * Utilitaire pour générer des PDFs avec jsPDF
 */

import jsPDF from 'jspdf';

/**
 * Extrait les statistiques des entrées d'audit
 */
const extractStatistics = (entries) => {
  const stats = {
    total: entries.length,
    successCount: entries.filter(e => e.reussi !== false && e.reussi !== undefined).length,
    errorCount: entries.filter(e => e.reussi === false || e.message_erreur).length,
    actionTypes: {},
    userActivity: {},
    resourceTypes: {},
  };

  entries.forEach(entry => {
    // Actions
    let action = entry.action_display || entry.action || 'Autre';
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
    stats.actionTypes[action] = (stats.actionTypes[action] || 0) + 1;

    // Utilisateurs
    const user = entry.user_display || 
                 entry.utilisateur_display || 
                 entry.user_info?.full_name || 
                 entry.user_info?.username || 
                 'Système';
    stats.userActivity[user] = (stats.userActivity[user] || 0) + 1;

    // Ressources
    let resource = entry.resource_type || entry.ressource || 'Non spécifié';
    if (resource && resource.includes('_')) {
      resource = resource.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    stats.resourceTypes[resource] = (stats.resourceTypes[resource] || 0) + 1;
  });

  // Trier et prendre les top 5
  stats.topActions = Object.entries(stats.actionTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action, count]) => ({ action, count, percentage: ((count / stats.total) * 100).toFixed(1) }));

  stats.topUsers = Object.entries(stats.userActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user, count]) => ({ user, count, percentage: ((count / stats.total) * 100).toFixed(1) }));

  stats.topResources = Object.entries(stats.resourceTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([resource, count]) => ({ resource, count, percentage: ((count / stats.total) * 100).toFixed(1) }));

  stats.successRate = stats.total > 0 ? ((stats.successCount / stats.total) * 100).toFixed(1) : 0;

  return stats;
};

/**
 * Dessine un graphique en barres simple
 */
const drawBarChart = (doc, x, y, width, height, data, maxValue, color) => {
  if (!data || data.length === 0) return;
  
  const barWidth = width / Math.max(data.length, 1);
  const barSpacing = barWidth * 0.15;
  const actualBarWidth = barWidth - barSpacing;
  const maxBarHeight = height - 25; // Réserver de l'espace pour les labels et valeurs
  const chartY = y + 5; // Décalage pour les labels

  // Dessiner le fond du graphique
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.rect(x, chartY, width, maxBarHeight + 5, 'FD');

  // Dessiner les barres
  data.forEach((item, index) => {
    const barHeight = maxValue > 0 ? (item.count / maxValue) * maxBarHeight : 0;
    const barX = x + (index * barWidth) + (barSpacing / 2);
    const barY = chartY + maxBarHeight - barHeight;

    // Barre simple
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(barX, barY, actualBarWidth, barHeight, 'F');

    // Valeur au-dessus de la barre (seulement si la barre est assez haute)
    if (barHeight > 5) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(
        item.count.toString(),
        barX + actualBarWidth / 2,
        barY - 3,
        { align: 'center' }
      );
    }

    // Label en dessous
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(75, 85, 99);
    const label = doc.splitTextToSize(item.action || item.user || item.resource || '', actualBarWidth - 2);
    const labelY = chartY + maxBarHeight + 8;
    doc.text(
      label[0] || '',
      barX + actualBarWidth / 2,
      labelY,
      { align: 'center', maxWidth: actualBarWidth - 2 }
    );
    
    // Pourcentage sous le label
    if (label.length === 1 && item.percentage) {
      doc.setFontSize(6);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `${item.percentage}%`,
        barX + actualBarWidth / 2,
        labelY + 4,
        { align: 'center' }
      );
    }
  });

  // Axes
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.5);
  // Axe horizontal (bas)
  doc.line(x, chartY + maxBarHeight, x + width, chartY + maxBarHeight);
  // Axe vertical (gauche)
  doc.line(x, chartY, x, chartY + maxBarHeight);
};

/**
 * Génère un PDF à partir du rapport d'analyse d'audit
 * @param {Object} analysisReport - Rapport d'analyse formaté
 * @param {number} entriesCount - Nombre d'entrées analysées
 * @param {Array} entries - Entrées d'audit pour calculer les statistiques
 * @returns {jsPDF} Instance jsPDF
 */
export const generateAuditAnalysisPDF = (analysisReport, entriesCount, entries = []) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Extraire les statistiques
  const stats = entries.length > 0 ? extractStatistics(entries) : null;

  // Fonction pour ajouter une nouvelle page si nécessaire
  const checkPageBreak = (requiredHeight = 10) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Fonction pour ajouter du texte avec gestion du retour à la ligne
  const addText = (text, fontSize = 11, isBold = false, color = [0, 0, 0], lineHeight = 6) => {
    if (!text) return;
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont(undefined, 'bold');
    } else {
      doc.setFont(undefined, 'normal');
    }

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      checkPageBreak(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };


  // En-tête simplifié
  doc.setFillColor(24, 92, 214); // Bleu Gendarmerie
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('GENDARMERIE NATIONALE', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('SYSTÈME DE GESTION CRIMINELLE (SGIC)', pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text('Rapport d\'Analyse du Journal d\'Audit', pageWidth / 2, 27, { align: 'center' });
  
  yPosition = 40;

  // Informations générales simplifiées
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');
  const dateStr = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Date de génération: ${dateStr}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Événements analysés: ${entriesCount}`, margin, yPosition);
  yPosition += 10;

  // Statistiques textuelles simples si disponibles
  if (stats) {
    checkPageBreak(30);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Statistiques', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Total: ${stats.total} événements`, margin, yPosition);
    yPosition += 5;
    doc.text(`Succès: ${stats.successCount} | Erreurs: ${stats.errorCount} | Taux de réussite: ${stats.successRate}%`, margin, yPosition);
    yPosition += 10;
  }

  // Section 1: Présentation des données
  checkPageBreak(30);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('1. Présentation des données', margin, yPosition);
  yPosition += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  const presentationText = analysisReport.sections['Présentation des données'] || '';
  doc.setTextColor(0, 0, 0);
  addText(presentationText, 10, false, [0, 0, 0], 5);
  yPosition += 8;

  // Section 2: Analyse
  checkPageBreak(30);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('2. Analyse', margin, yPosition);
  yPosition += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  const analyseText = analysisReport.sections['Analyse'] || '';
  doc.setTextColor(0, 0, 0);
  addText(analyseText, 10, false, [0, 0, 0], 5);
  yPosition += 8;

  // Liste des top utilisateurs si disponible (format texte simple)
  if (stats && stats.topUsers.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Utilisateurs les plus actifs:', margin, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    stats.topUsers.forEach((user) => {
      doc.text(`• ${user.user}: ${user.count} actions (${user.percentage}%)`, margin + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Section 3: Interprétation
  checkPageBreak(30);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('3. Interprétation', margin, yPosition);
  yPosition += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  const interpretationText = analysisReport.sections['Interprétation'] || '';
  doc.setTextColor(0, 0, 0);
  addText(interpretationText, 10, false, [0, 0, 0], 5);
  yPosition += 8;

  // Section 4: Conclusion partielle
  checkPageBreak(30);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('4. Conclusion partielle', margin, yPosition);
  yPosition += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  const conclusionText = analysisReport.sections['Conclusion partielle'] || '';
  doc.setTextColor(0, 0, 0);
  addText(conclusionText, 10, false, [0, 0, 0], 5);
  yPosition += 10;

  // Pied de page amélioré
  checkPageBreak(20);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');
  doc.text('Rapport généré automatiquement par le système SGIC', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text(`Gendarmerie Nationale - Système de Gestion Criminelle - ${new Date().getFullYear()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text('Document confidentiel - Usage interne uniquement', pageWidth / 2, yPosition, { align: 'center' });

  // Numéro de page avec style
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    
    // Logo ou filigrane en bas de page
    doc.setDrawColor(240, 240, 240);
    doc.setFontSize(6);
    doc.setTextColor(240, 240, 240);
    doc.text('SGIC', pageWidth / 2, pageHeight - 5, { align: 'center' });
  }

  return doc;
};

/**
 * Télécharge le PDF du rapport d'analyse
 * @param {Object} analysisReport - Rapport d'analyse formaté
 * @param {number} entriesCount - Nombre d'entrées analysées
 * @param {Array} entries - Entrées d'audit pour calculer les statistiques
 * @param {string} filename - Nom du fichier (optionnel)
 */
export const downloadAuditAnalysisPDF = (analysisReport, entriesCount, entries = [], filename = null) => {
  try {
    const doc = generateAuditAnalysisPDF(analysisReport, entriesCount, entries);
    
    // Générer le nom de fichier si non fourni
    if (!filename) {
      const dateStr = new Date().toISOString().split('T')[0];
      filename = `rapport_analyse_audit_${dateStr}.pdf`;
    }

    // Télécharger le PDF
    doc.save(filename);
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Impossible de générer le PDF. Veuillez réessayer.');
  }
};

export default {
  generateAuditAnalysisPDF,
  downloadAuditAnalysisPDF,
};
