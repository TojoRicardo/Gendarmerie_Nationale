import React from 'react';
import { Bell, FileText, User, AlertCircle, Check, X } from 'lucide-react';

const ElementNotification = ({ notification, onMarquerLue, onSupprimer, onClick }) => {
  const getIcone = (type) => {
    const icones = {
      fiche: FileText,
      utilisateur: User,
      alerte: AlertCircle,
      systeme: Bell,
    };
    return icones[type] || Bell;
  };

  const getStyles = (type, estNonLue) => {
    if (!estNonLue) {
      return {
        containerClasses: 'border-gray-300 bg-white',
        iconBgClasses: 'bg-gray-100',
        iconClasses: 'text-gray-600',
      };
    }

    const styles = {
      fiche: {
        containerClasses: 'border-blue-500 bg-blue-50',
        iconBgClasses: 'bg-blue-100',
        iconClasses: 'text-blue-600',
      },
      utilisateur: {
        containerClasses: 'border-green-500 bg-green-50',
        iconBgClasses: 'bg-green-100',
        iconClasses: 'text-green-600',
      },
      alerte: {
        containerClasses: 'border-red-500 bg-red-50',
        iconBgClasses: 'bg-red-100',
        iconClasses: 'text-red-600',
      },
      systeme: {
        containerClasses: 'border-gray-500 bg-gray-50',
        iconBgClasses: 'bg-gray-100',
        iconClasses: 'text-gray-600',
      },
    };
    return styles[type] || styles.systeme;
  };

  const Icone = getIcone(notification.type);
  const estNonLue = !notification.lue;
  const styles = getStyles(notification.type, estNonLue);

  return (
    <button
      className={`
        w-full text-left p-4 border-l-3 rounded-lg transition-all duration-200
        ${styles.containerClasses}
        hover:shadow-md cursor-pointer transform hover:-translate-y-0.5
      `}
      onClick={() => onClick && onClick(notification)}
    >
      <div className="flex items-start space-x-3">
        {/* Icône */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center shadow-sm
          ${styles.iconBgClasses}
        `}>
          <Icone 
            size={20} 
            className={styles.iconClasses} 
          />
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`font-bold mb-1 ${estNonLue ? 'text-gray-900 text-sm' : 'text-gray-600 text-xs'}`}>
                {notification.titre}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {notification.message}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                <p className="text-xs text-gray-500 font-medium">
                  {new Date(notification.date).toLocaleString('fr-FR')}
                </p>
                {notification.priorite && (
                  <>
                    <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                    <span className={`badge-pro text-xs ${
                      notification.priorite === 'haute' ? 'bg-red-100 text-red-800 border-red-200' :
                      notification.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-green-100 text-green-800 border-green-200'
                    }`}>
                      {notification.priorite}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1.5 ml-3">
              {estNonLue && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarquerLue(notification.id);
                  }}
                      className="p-1.5 hover:bg-gendarme-green/10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                      title="Marquer comme lue"
                    >
                      <Check size={16} className="text-gendarme-green" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSupprimer(notification.id);
                }}
                    className="p-1.5 hover:bg-gendarme-red/10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                    title="Supprimer"
                  >
                    <X size={16} className="text-gendarme-red" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default ElementNotification;

