import React, { useState } from 'react';
import {
  Activity, ChevronDown, ChevronUp
} from 'lucide-react';

/**
 * Composant pour afficher une session utilisateur comme un "blog"
 * avec toutes ses activités listées à l'intérieur
 */
const SessionBlogCard = ({ session }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Par défaut, la session est ouverte
  
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
        <>
          {/* Informations communes de la session (affichées une seule fois) */}
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-3 font-semibold">INFORMATIONS DE LA SESSION</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600"><strong>Utilisateur:</strong> {getUserRole()} {getUserDisplay()}</p>
                </div>
                <div>
                  <p className="text-gray-600"><strong>IP:</strong> {session.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Navigateur:</strong> {session.browser || filteredActions[0]?.browser || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-gray-600"><strong>OS:</strong> {session.os || filteredActions[0]?.os || 'Non spécifié'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenu du bloc : toutes les actions regroupées avec format texte détaillé */}
          <div className="p-4 bg-gray-50">
        {filteredActions.length > 0 ? (
          <div className="space-y-4">
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
              
              // Formater l'heure (ex: "16h32")
              const formatTime = (date) => {
                if (!date) return '';
                const d = new Date(date);
                return d.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(':', 'h');
              };
              
              // Obtenir les informations spécifiques à l'action
              const actionTime = action.timestamp || action.date_action;
              const actionDisplay = action.action_display || action.action || 'Action';
              const resourceType = action.resource_type || action.ressource || 'Ressource';
              const resourceId = action.resource_id || action.ressource_id;
              const method = action.methode_http || action.method || 'N/A';
              
              // Utiliser le narrative_text si disponible, sinon générer
              let narrativeText = action.narrative_text;
              if (!narrativeText) {
                // Générer un texte narratif explicite (sans répéter le nom de l'utilisateur)
                const userDisplay = getUserDisplay();
                narrativeText = `À ${formatTime(actionTime)}, ${userDisplay} effectue l'action: ${actionDisplay} sur ${resourceType}${resourceId ? ` #${resourceId}` : ''}.`;
              }
              
              return (
                <div
                  key={action.id || index}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
                >
                  {/* En-tête de l'action */}
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-2">
                      {actionDisplay}
                    </h4>
                    <div className="text-sm text-gray-600">
                      <p><strong>Date:</strong> {formatFullDate(actionTime)} à {formatTime(actionTime)}</p>
                    </div>
                  </div>
                  
                  {/* Détails de l'action */}
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500 mb-2"><strong>Action:</strong></p>
                    <p className="text-sm text-gray-700 font-semibold">{actionDisplay}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Ressource:</strong> {resourceType}{resourceId ? ` #${resourceId}` : ''}
                    </p>
                    {method && method !== 'N/A' && (
                      <p className="text-xs text-gray-600 mt-1">
                        <strong>Méthode:</strong> {method}
                      </p>
                    )}
                  </div>
                  
                  {/* Description narrative explicite */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2"><strong>Description:</strong></p>
                    <p className="text-sm text-gray-800 leading-relaxed italic">
                      {narrativeText}
                    </p>
                  </div>
                  
                  {/* Statut */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      <strong>Journal:</strong> Action enregistrée et traçable.
                    </div>
                    {action.reussi !== undefined && (
                      <div className="flex items-center space-x-2">
                        {action.reussi ? (
                          <span className="text-xs text-green-600 font-semibold">✓ Succès</span>
                        ) : (
                          <span className="text-xs text-red-600 font-semibold">✗ Échec</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-gray-500">
            <p className="text-sm">Aucune activité enregistrée pour cette session</p>
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
};

export default SessionBlogCard;
