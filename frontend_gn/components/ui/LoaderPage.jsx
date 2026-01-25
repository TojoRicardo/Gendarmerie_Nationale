import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoaderPage - Composant de chargement pour les pages/routes
 * Affiche un loader élégant pendant les requêtes API
 * Utilise un fade-in subtil lorsque les données apparaissent
 */
const LoaderPage = ({ 
  message = 'Chargement des données...',
  fullScreen = false,
  minimal = false 
}) => {
  if (minimal) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-600">{message}</span>
        </div>
      </div>
    );
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm'
    : 'flex items-center justify-center min-h-[400px] p-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4 animate-fadeIn">
        {/* Spinner principal */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-10 rounded-full animate-pulse" />
          <Loader2 
            className="relative w-10 h-10 text-blue-600 animate-spin" 
            strokeWidth={2}
          />
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{message}</p>
        </div>

        {/* Barre de progression subtile */}
        <div className="w-48 bg-gray-100 rounded-full h-1 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-full animate-progress"
            style={{
              width: '30%',
              animation: 'progress-shimmer 1.2s ease-in-out infinite'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
        .animate-progress {
          animation: progress-shimmer 1.2s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LoaderPage;
