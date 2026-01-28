import React, { useState } from 'react';
import {
  Activity, ChevronDown, ChevronUp
} from 'lucide-react';

/**
 * Composant pour afficher une session utilisateur comme un "blog"
 * avec toutes ses activités listées à l'intérieur
 */
const SessionBlogCard = ({ session }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Par défaut, la session est repliée
  
  // Formater la date de début
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Formater la durée
  const formatDuration = (minutes) => {
    if (!minutes) return 'En cours';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };
  
  // Obtenir le nom d'affichage de l'utilisateur
  const getUserDisplay = () => {
    if (session.user_info) {
      const fullName = `${session.user_info.first_name || ''} ${session.user_info.last_name || ''}`.trim();
      return fullName || session.user_info.username || 'Utilisateur';
    }
    return session.user_display || 'Utilisateur';
  };
  
  // Obtenir le rôle
  const getUserRole = () => {
    return session.user_role || session.user_info?.role || 'Utilisateur';
  };
  
  // Actions de la session
  const actions = session.actions || session.details?.all_actions || [];
  const actionsCount = session.actions_count || actions.length || 0;
  
  // Actions de la session (filtrer les navigations)
  const filteredActions = actions.filter(action => {
    const actionType = action.action || '';
    return actionType !== 'NAVIGATION';
  });

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* En-tête de la session avec flèche dropdown */}
      <div 
        className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4 border-b border-blue-400 cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Activity size={20} className="text-white" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">
                Session de {getUserDisplay()}
              </h3>
              <div className="flex items-center space-x-3 mt-1 text-sm text-blue-100">
                <span>{getUserRole()}</span>
                <span>•</span>
                <span>{formatDate(session.start_time)}</span>
                {session.end_time && (
                  <>
                    <span>→</span>
                    <span>{formatDate(session.end_time)}</span>
                  </>
                )}
                {session.duration_minutes && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(session.duration_minutes)}</span>
                  </>
                )}
                <span>•</span>
                <span>{filteredActions.length} action{filteredActions.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {session.ip_address && (
              <span className="text-sm text-blue-100 font-mono bg-blue-400/30 px-3 py-1 rounded-lg">
                IP: {session.ip_address}
              </span>
            )}
            {/* Flèche dropdown */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-2 hover:bg-blue-400/30 rounded-lg transition-colors"
              aria-label={isExpanded ? "Fermer la session" : "Ouvrir la session"}
            >
              {isExpanded ? (
                <ChevronUp size={20} className="text-white" />
              ) : (
                <ChevronDown size={20} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Contenu expandable : informations communes et actions */}
      {isExpanded && (
        <div className="px-5 py-4 bg-gray-50">
          <div className="bg-white rounded-lg p-5 border border-gray-200 space-y-5">
            
            {/* 1. Date de session */}
            <div className="border-b border-gray-200 pb-3">
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Date de session :</p>
              <p className="text-sm text-gray-900 font-medium">
                {formatDate(session.start_time)}
                {session.end_time && (
                  <span className="text-gray-600"> → {formatDate(session.end_time)}</span>
                )}
              </p>
            </div>

            {/* 2. Utilisateur */}
            <div className="border-b border-gray-200 pb-3">
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Utilisateur :</p>
              <p className="text-sm text-gray-900 font-medium">
                {getUserDisplay()}
                {getUserRole() && (
                  <span className="text-gray-600 ml-2">({getUserRole()})</span>
                )}
              </p>
            </div>

            {/* 3. Informations techniques */}
            <div className="border-b border-gray-200 pb-3">
              <p className="text-xs text-gray-500 mb-3 font-semibold uppercase">Informations techniques :</p>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 font-medium">Navigateur :</span>
                  <span className="text-gray-900 ml-2">
                    {session.browser || filteredActions[0]?.browser || 'Non spécifié'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">OS :</span>
                  <span className="text-gray-900 ml-2">
                    {session.os || filteredActions[0]?.os || 'Non spécifié'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">IP :</span>
                  <span className="text-gray-900 ml-2 font-mono">
                    {session.ip_address || filteredActions[0]?.ip_address || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Actions (liste avec date et heure explicites) */}
            <div className="border-b border-gray-200 pb-3">
              <p className="text-xs text-gray-500 mb-3 font-semibold uppercase">Action :</p>
              {filteredActions.length > 0 ? (
                <div className="space-y-3">
                  {filteredActions.map((action, index) => {
                    // Formater la date complète (ex: "25 janvier 2026")
                    const formatFullDate = (date) => {
                      if (!date) return '';
                      const d = new Date(date);
                      return d.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      });
                    };
                    
                    // Formater l'heure complète (ex: "16h32m15s")
                    const formatFullTime = (date) => {
                      if (!date) return '';
                      const d = new Date(date);
                      const timeString = d.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      });
                      // Remplacer ":" par "h" pour les heures, "m" pour les minutes, et "s" pour les secondes
                      return timeString.replace(/(\d{2}):(\d{2}):(\d{2})/, '$1h$2m$3s');
                    };
                    
                    const actionTime = action.timestamp || action.date_action;
                    const actionDisplay = action.action_display || action.action || 'Action';
                    const resourceType = action.resource_type || action.ressource || '';
                    const resourceId = action.resource_id || action.ressource_id;
                    
                    // Utiliser le narrative_text si disponible, sinon générer une description explicite
                    let actionDescription = action.narrative_text;
                    if (!actionDescription) {
                      const userDisplay = getUserDisplay();
                      actionDescription = `${userDisplay} a effectué l'action "${actionDisplay}"`;
                      if (resourceType) {
                        actionDescription += ` sur ${resourceType}`;
                        if (resourceId) {
                          actionDescription += ` #${resourceId}`;
                        }
                      }
                      actionDescription += '.';
                    }
                    
                    return (
                      <div
                        key={action.id || index}
                        className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-gray-900 font-semibold flex-1">
                              {actionDescription}
                            </p>
                          </div>
                          <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                            <span className="font-medium">Date et heure :</span>
                            <span className="ml-2">
                              {formatFullDate(actionTime)} à {formatFullTime(actionTime)}
                            </span>
                          </div>
                          {action.reussi !== undefined && (
                            <div className="text-xs mt-1">
                              {action.reussi ? (
                                <span className="text-green-600 font-semibold">✓ Succès</span>
                              ) : (
                                <span className="text-red-600 font-semibold">✗ Échec</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
                  <p className="text-sm text-gray-500">Aucune action enregistrée pour cette session</p>
                </div>
              )}
            </div>

            {/* 5. Référence audit */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Référence audit :</p>
              <p className="text-sm text-gray-900 font-mono">
                {session.session_id || session.id || 'N/A'}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SessionBlogCard;
