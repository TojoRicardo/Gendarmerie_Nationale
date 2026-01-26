import React, { useState, useEffect } from 'react';
import {
  Brain, Clock, MapPin, Activity, Eye, Shield,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
  UserCheck, AlertTriangle, FileText, Server,
  Key, Database, Code, Globe, Monitor, Download, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyserJournal } from '../../src/services/auditAnalysisService';
import { parseUserAgent } from '../../src/utils/userAgentParser';
import { getCachedAnalysis, setCachedAnalysis, quickAnalysis } from '../../src/utils/auditAnalysisCache';
import AuditAIResultCard from '../../src/components/audit/AuditAIResultCard';
import { downloadFicheCriminellePDF } from '../../src/services/reportsService';

/**
 * Composant pour afficher une entrée d'audit avec Description IA et Détails Techniques
 * Interface claire et compréhensible pour utilisateurs non techniques
 */
const AuditEntryCard = ({ entry }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [iaAnalysis, setIaAnalysis] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [userAgentInfo, setUserAgentInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Analyser le User-Agent au montage
  useEffect(() => {
    if (entry.user_agent) {
      try {
        const uaInfo = parseUserAgent(entry.user_agent);
        setUserAgentInfo(uaInfo);
      } catch (error) {
        console.debug('Erreur parsing User-Agent:', error);
      }
    }
  }, [entry.user_agent]);

  // Analyser avec l'IA quand les détails sont ouverts
  useEffect(() => {
    if (isExpanded && !iaAnalysis && !loadingIA) {
      analyserAvecIA();
    }
  }, [isExpanded]);

  const analyserAvecIA = async () => {
    // 1. D'abord, essayer l'analyse rapide locale (instantanée)
    const quickResult = quickAnalysis(entry);
    if (quickResult) {
      setIaAnalysis(quickResult);
    }
    
    // 2. Si on a une description, vérifier le cache
    if (entry.description) {
      const cached = getCachedAnalysis(entry.description);
      if (cached) {
        setIaAnalysis(cached);
        return; // Utiliser le cache, pas besoin d'appeler l'API
      }
    }
    
    // 3. Si pas de cache et description disponible, analyser avec l'IA (en arrière-plan)
    if (entry.description) {
      setLoadingIA(true);
      try {
        const result = await analyserJournal(entry.description);
        if (result && result.resultat) {
          const analysis = result.resultat;
          setIaAnalysis(analysis);
          // Mettre en cache pour les prochaines fois
          setCachedAnalysis(entry.description, analysis);
        }
      } catch (error) {
        // En cas d'erreur, garder l'analyse rapide locale
        console.debug('Erreur analyse IA:', error);
        // L'analyse rapide est déjà affichée, pas besoin de faire quoi que ce soit
      } finally {
        setLoadingIA(false);
      }
    }
  };

  // Obtenir l'icône selon le type d'action
  const getActionIcon = (action) => {
    const icons = {
      'connexion': UserCheck,
      'deconnexion': UserCheck,
      'validation': Key,
      'creation': FileText,
      'modification': Database,
      'suppression': AlertTriangle,
      'consultation': Eye,
      'otp': Shield,
      'mfa': Shield,
    };
    return icons[action?.toLowerCase()] || Activity;
  };

  // Fonction getActionEmoji supprimée - plus d'emojis dans l'interface

  // Obtenir le badge de couleur selon l'action
  const getActionBadge = (action) => {
    const badges = {
      'creation': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      'modification': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
      'suppression': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
      'consultation': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
      'connexion': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      'deconnexion': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
      'validation': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    };
    return badges[action?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  };

  // Générer une phrase de résumé intelligente
  const getResumePhrase = () => {
    if (iaAnalysis && iaAnalysis.action) {
      const actionMap = {
        'validation OTP': 'Validation de Code OTP',
        'connexion': 'Connexion au système',
        'authentification MFA': 'Authentification multi-facteurs',
        'changement de mot de passe': 'Changement de mot de passe',
        'suppression': 'Suppression de ressource',
        'modification': 'Modification de ressource',
        'creation': 'Création de ressource',
      };
      const actionLabel = actionMap[iaAnalysis.action] || iaAnalysis.action;
      const statut = iaAnalysis.statut === 'succès' ? 'réussie' : iaAnalysis.statut === 'échec' ? 'échouée' : '';
      return `${actionLabel} ${statut}`.trim();
    }
    
    // Fallback vers l'action display
    return entry.action_display || entry.action || 'Action système';
  };

  // Formater la description pour les non-informaticiens
  const formatDescriptionForUsers = (description) => {
    if (!description) return null;

    // Extraire les informations structurées de la description
    const formatted = {
      mainText: '',
      details: []
    };

    // Patterns améliorés pour extraire les informations
    const patterns = {
      // Utilisateur - plusieurs variantes
      utilisateur: /(?:L'utilisateur|utilisateur|L'utilisateur|L'utilisateur|L'utilisateur)\s+([^a]+?)\s+(?:a|depuis|effectué)/i,
      // Action - plusieurs variantes
      action: /(?:a\s+)(modifié|créé|supprimé|consulté|connecté|validé|effectué|réalisé)\s+(?:la\s+)?(?:ressource|depuis|l'opération)/i,
      // Ressource - plusieurs variantes
      ressource: /(?:ressource\s+['"]?|la\s+ressource\s+['"]?|['"]?)([^'"]+?)(?:['"]?\s+depuis|['"]?\s*\.|['"]?\s*$)/i,
      // IP - plusieurs variantes
      ip: /(?:depuis\s+l'?adresse\s+IP\s+|IP\s+|adresse\s+IP\s+)([0-9.]+)/i,
      // Détails techniques dans "Détails: info:"
      detailsSection: /Détails:\s*info:\s*(.+?)(?:\.|$)/i,
    };

    // Extraire les informations principales
    let mainDescription = description;

    // Extraire l'utilisateur (amélioré) - gérer "Système" et autres variantes
    const userMatch = description.match(/(?:L'utilisateur|utilisateur)\s+([A-Za-z0-9_@.]+|Système)/i);
    if (userMatch) {
      const userName = userMatch[1].trim();
      formatted.details.push({
        label: '👤 Utilisateur',
        value: userName,
        icon: UserCheck
      });
    } else {
      // Essayer de trouver "Système" directement
      if (description.match(/Système/i)) {
        formatted.details.push({
          label: '👤 Utilisateur',
          value: 'Système',
          icon: UserCheck
        });
      }
    }

    // Extraire l'action (amélioré)
    const actionMatch = description.match(/(?:a\s+)(modifié|créé|supprimé|consulté|connecté|validé|effectué|réalisé)/i);
    if (actionMatch) {
      const actionText = actionMatch[1].trim();
      const actionMap = {
        'modifié': 'Modification',
        'créé': 'Création',
        'supprimé': 'Suppression',
        'consulté': 'Consultation',
        'connecté': 'Connexion',
        'validé': 'Validation',
        'effectué': 'Action effectuée',
        'réalisé': 'Action réalisée'
      };
      formatted.details.push({
        label: '⚡ Action',
        value: actionMap[actionText] || actionText,
        icon: Activity
      });
    }

    // Extraire la ressource (amélioré)
    const resourceMatch = description.match(/(?:ressource\s+['"]?|la\s+ressource\s+['"]?)([^'"]+?)(?:['"]?\s+depuis|['"]?\s*\.|['"]?\s*$)/i);
    if (resourceMatch) {
      formatted.details.push({
        label: '📄 Ressource',
        value: resourceMatch[1].trim(),
        icon: FileText
      });
    }

    // Extraire l'IP (amélioré)
    const ipMatch = description.match(/(?:depuis\s+l'?adresse\s+IP\s+|IP\s+|adresse\s+IP\s+)([0-9.]+)/i);
    if (ipMatch) {
      formatted.details.push({
        label: '🌐 Adresse IP',
        value: ipMatch[1].trim(),
        icon: MapPin
      });
    }

    // Extraire les détails techniques depuis "Détails: info:"
    const detailsMatch = description.match(/Détails:\s*info:\s*(.+?)(?:\.|$)/i);
    if (detailsMatch) {
      const detailsText = detailsMatch[1];
      
      // Parser les détails séparés par des virgules
      const detailPairs = detailsText.split(',').map(d => d.trim());
      
      detailPairs.forEach(pair => {
        const colonIndex = pair.indexOf(':');
        if (colonIndex > 0) {
          const key = pair.substring(0, colonIndex).trim();
          const value = pair.substring(colonIndex + 1).trim();
          
          // Mapper les clés aux labels lisibles
          const keyMap = {
            'username': { label: '👤 Nom d\'utilisateur', icon: UserCheck },
            'email': { label: '📧 Email', icon: UserCheck },
            'statut': { label: '✅ Statut', icon: CheckCircle },
            'endpoint': { label: '🔗 Point d\'accès', icon: Server },
            'methode_http': { label: '📡 Méthode HTTP', icon: Code },
            'navigateur': { label: '🌐 Navigateur', icon: Globe },
            'systeme': { label: '💻 Système', icon: Monitor },
            'browser': { label: '🌐 Navigateur', icon: Globe },
            'os': { label: '💻 Système', icon: Monitor },
          };
          
          const mapping = keyMap[key.toLowerCase()];
          if (mapping && value) {
            // Éviter les doublons
            const exists = formatted.details.some(d => d.label === mapping.label);
            if (!exists) {
              formatted.details.push({
                label: mapping.label,
                value: value,
                icon: mapping.icon
              });
            }
          }
        }
      });
    }

    // Créer un texte principal simplifié et lisible
    let mainText = description;
    
    // Nettoyer le texte principal en retirant les détails techniques
    mainText = mainText.replace(/Détails:\s*info:.*$/i, '');
    mainText = mainText.replace(/endpoint:\s*[^,]+/gi, '');
    mainText = mainText.replace(/methode_http:\s*[^,]+/gi, '');
    mainText = mainText.replace(/navigateur:\s*[^,]+/gi, '');
    mainText = mainText.replace(/systeme:\s*[^,]+/gi, '');
    mainText = mainText.replace(/username:\s*[^,]+/gi, '');
    mainText = mainText.replace(/email:\s*[^,]+/gi, '');
    mainText = mainText.replace(/statut:\s*[^,]+/gi, '');
    
    // Nettoyer les espaces multiples et ponctuation
    mainText = mainText.replace(/\s+/g, ' ').trim();
    mainText = mainText.replace(/\s*\.\s*\./g, '.');
    mainText = mainText.replace(/\s*,\s*,/g, ',');
    
    // Capitaliser la première lettre
    if (mainText.length > 0) {
      mainText = mainText.charAt(0).toUpperCase() + mainText.slice(1);
    }
    
    // Ajouter un point final si nécessaire
    if (mainText.length > 0 && !mainText.endsWith('.') && !mainText.endsWith('!') && !mainText.endsWith('?')) {
      mainText += '.';
    }
    
    // Si le texte est trop court, créer une phrase simple
    if (mainText.length < 20) {
      const user = formatted.details.find(d => d.label.includes('Utilisateur'))?.value || 'Un utilisateur';
      const action = formatted.details.find(d => d.label.includes('Action'))?.value || 'a effectué une action';
      const resource = formatted.details.find(d => d.label.includes('Ressource'))?.value || 'sur une ressource';
      mainText = `${user} ${action.toLowerCase()} ${resource.toLowerCase()}.`;
    }

    formatted.mainText = mainText;

    return formatted;
  };

  // Obtenir la description formatée
  // Priorité: description_narrative (LLaMA) > description > formatDescriptionForUsers
  const descriptionToUse = entry.description_narrative || entry.description || '';
  const formattedDescription = formatDescriptionForUsers(descriptionToUse);

  const actionBadge = getActionBadge(entry.action);
  const ActionIcon = getActionIcon(entry.action);
  // Emoji supprimé - plus d'emojis dans l'interface

  // Fonction pour gérer la consultation (navigation vers la ressource)
  const handleView = () => {
    const resourceId = entry.resource_id || entry.ressource_id || entry.object_id;
    const resourceType = entry.resource_type || entry.ressource || '';
    
    if (!resourceId) return;
    
    // Navigation selon le type de ressource
    if (resourceType.toLowerCase().includes('fiche') || resourceType.toLowerCase().includes('criminel')) {
      navigate(`/criminels/fiches-criminelles/${resourceId}`);
    } else if (resourceType.toLowerCase().includes('utilisateur')) {
      navigate(`/utilisateurs/${resourceId}`);
    } else if (resourceType.toLowerCase().includes('rapport')) {
      navigate(`/rapports/${resourceId}`);
    }
    // Ajouter d'autres types de ressources si nécessaire
  };

  // Fonction pour gérer le téléchargement
  const handleDownload = async () => {
    const resourceId = entry.resource_id || entry.ressource_id || entry.object_id;
    const resourceType = entry.resource_type || entry.ressource || '';
    
    if (!resourceId) return;
    
    // Téléchargement selon le type de ressource
    if (resourceType.toLowerCase().includes('fiche') || resourceType.toLowerCase().includes('criminel')) {
      setDownloading(true);
      try {
        await downloadFicheCriminellePDF(resourceId, true);
      } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
      } finally {
        setDownloading(false);
      }
    }
    // Ajouter d'autres types de téléchargements si nécessaire
  };

  // Déterminer si les boutons doivent être affichés
  const resourceId = entry.resource_id || entry.ressource_id || entry.object_id;
  const resourceType = entry.resource_type || entry.ressource || '';
  const canView = resourceId && (
    resourceType.toLowerCase().includes('fiche') || 
    resourceType.toLowerCase().includes('criminel') ||
    resourceType.toLowerCase().includes('utilisateur') ||
    resourceType.toLowerCase().includes('rapport')
  );
  const canDownload = resourceId && (
    resourceType.toLowerCase().includes('fiche') || 
    resourceType.toLowerCase().includes('criminel')
  );

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg">
      {/* En-tête de la carte */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {/* Gauche: Date, Utilisateur, Action */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Date & Heure */}
            <div className="flex items-center space-x-2 min-w-[140px]">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <Clock className="text-white" size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(entry.timestamp || entry.date_action).toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(entry.timestamp || entry.date_action).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Utilisateur */}
            <div className="flex items-center space-x-2 min-w-[120px]">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <UserCheck className="text-white" size={16} />
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {entry.user_display || entry.utilisateur_display || entry.user_info?.full_name || entry.utilisateur_info?.full_name || entry.user?.username || 'Système'}
              </span>
            </div>

            {/* Action avec badge - Utiliser narrative_text si disponible pour plus de précision */}
            <div className="flex items-center space-x-2 flex-1">
              {entry.narrative_text ? (
                <p className="text-sm text-gray-800 leading-relaxed">
                  {entry.narrative_text}
                </p>
              ) : (
                <>
                  <span className={`${actionBadge.bg} ${actionBadge.text} ${actionBadge.border} border px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm`}>
                    <span>{entry.action_display || entry.action}</span>
                  </span>
                  {/* Ressource */}
                  <div className="ml-4">
                    <p className="text-sm font-bold text-gray-900">{entry.resource_type || entry.ressource || 'Ressource'}</p>
                    {(entry.resource_id || entry.ressource_id) && (
                      <p className="text-xs text-gray-500">ID: {entry.resource_id || entry.ressource_id}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* IP */}
            <div className="flex items-center space-x-2">
              <MapPin size={16} className="text-gray-400" />
              <span className="text-xs font-mono text-gray-600">{entry.ip_address || entry.ip_adresse || 'N/A'}</span>
            </div>

            {/* Statut */}
            <div>
              {entry.reussi ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <XCircle size={20} className="text-red-600" />
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Bouton Consultation */}
            {canView && (
              <button
                onClick={handleView}
                className="p-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm hover:shadow-md"
                title="Consulter la ressource"
                aria-label="Consulter la ressource"
              >
                <Eye size={18} />
              </button>
            )}

            {/* Bouton Téléchargement */}
            {canDownload && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="p-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Télécharger le PDF"
                aria-label="Télécharger le PDF"
              >
                {downloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Download size={18} />
                )}
              </button>
            )}

            {/* Bouton Détails */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              aria-label={isExpanded ? 'Masquer les détails' : 'Afficher les détails'}
            >
              {isExpanded ? (
                <ChevronUp size={20} className="text-gray-600" />
              ) : (
                <ChevronDown size={20} className="text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Détails Expandables */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-4">
            {/* Résultat d'analyse IA LLaMA (prioritaire) */}
            {entry.ai_result && (
              <div className="mb-4">
                <AuditAIResultCard 
                  aiResult={entry.ai_result}
                  event={entry}
                />
              </div>
            )}
            
            {/* Description de l'action */}
            {!entry.ai_result && (
              <>
                {/* Si c'est une session groupée, afficher toutes les actions */}
                {entry.is_session && entry.details && entry.details.all_actions ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200 mb-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-blue-500">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-blue-900">
                        Session complète ({entry.details.actions_count || 0} action(s))
                      </span>
                    </div>
                    <div className="space-y-3 pl-8">
                      <p className="text-sm text-gray-700 mb-3">
                        <strong>Période:</strong> {entry.details.start_time ? new Date(entry.details.start_time).toLocaleString('fr-FR') : 'N/A'}
                        {entry.details.end_time && ` → ${new Date(entry.details.end_time).toLocaleString('fr-FR')}`}
                        {entry.details.duration_minutes && ` (${entry.details.duration_minutes} min)`}
                      </p>
                      <div className="space-y-2">
                        {entry.details.all_actions.map((action, index) => (
                          <div key={action.id || index} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700">
                                {action.action_display || action.action || 'Action'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {action.timestamp ? new Date(action.timestamp).toLocaleTimeString('fr-FR') : ''}
                              </span>
                            </div>
                            {/* Description de l'action - priorité: description_narrative > description > description_short */}
                            {(action.description_narrative || action.description || action.description_short) && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                                  {action.description_narrative || action.description || action.description_short}
                                </p>
                                {/* Informations techniques compactes */}
                                {(action.browser || action.os || action.ip_address) && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                      {action.browser && (
                                        <span>
                                          <span className="font-medium">Navigateur:</span> <span className="text-gray-700">{action.browser}</span>
                                        </span>
                                      )}
                                      {action.os && (
                                        <span>
                                          <span className="font-medium">OS:</span> <span className="text-gray-700">{action.os}</span>
                                        </span>
                                      )}
                                      {action.ip_address && (
                                        <span>
                                          <span className="font-medium">IP:</span> <span className="text-gray-700 font-mono">{action.ip_address}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {action.resource_type && (
                              <p className="text-xs text-gray-500 mt-2">
                                <span className="font-medium">Ressource:</span> {action.resource_type} {action.resource_id ? `#${action.resource_id}` : ''}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Format normal pour les entrées individuelles */
                  <>
                    {/* Priorité: narrative_text > description_narrative > description > formattedDescription */}
                    {entry.narrative_text ? (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {entry.narrative_text}
                        </p>
                      </div>
                    ) : (entry.description_narrative || entry.description) ? (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                          {entry.description_narrative || entry.description}
                        </p>
                      </div>
                    ) : formattedDescription && formattedDescription.mainText ? (
                      <div className="bg-gray-50 rounded p-3 border border-gray-100 mb-4">
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {formattedDescription.mainText}
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}

            {/* Détails simplifiés */}
            {formattedDescription && formattedDescription.details && formattedDescription.details.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {formattedDescription.details.slice(0, 4).map((detail, index) => (
                  <div key={index}>
                    <span className="text-gray-500">{detail.label.replace(/[👤⚡📄🌐📧✅🔗📡💻]/g, '').trim()}: </span>
                    <span className="text-gray-900">{detail.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Message d'erreur si présent */}
            {entry.message_erreur && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-800">Erreur détectée:</p>
                    <p className="text-xs text-red-700 mt-1">{entry.message_erreur}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Détails Techniques - Format compact */}
            {(userAgentInfo?.navigateur || userAgentInfo?.systeme || entry.ip_address || entry.ip_adresse || entry.method || entry.methode_http || entry.browser || entry.os) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  {(entry.browser || userAgentInfo?.navigateur) && (
                    <span>
                      <span className="font-medium">Navigateur:</span> <span className="text-gray-700">{entry.browser || userAgentInfo?.navigateur}</span>
                    </span>
                  )}
                  {(entry.os || userAgentInfo?.systeme) && (
                    <span>
                      <span className="font-medium">OS:</span> <span className="text-gray-700">{entry.os || userAgentInfo?.systeme}</span>
                    </span>
                  )}
                  {(entry.ip_address || entry.ip_adresse) && (
                    <span>
                      <span className="font-medium">IP:</span> <span className="text-gray-700 font-mono">{entry.ip_address || entry.ip_adresse}</span>
                    </span>
                  )}
                  {(entry.method || entry.methode_http) && (
                    <span>
                      <span className="font-medium">Méthode:</span> <span className="text-gray-700">{entry.method || entry.methode_http}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditEntryCard;

