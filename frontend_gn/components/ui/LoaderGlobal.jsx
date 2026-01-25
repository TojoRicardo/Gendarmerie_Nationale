import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoaderGlobal - Composant de chargement initial de l'application
 * Affiche un loader moderne avec des messages personnalisés
 */
const LoaderGlobal = ({ message, title }) => {
  const [progress, setProgress] = useState(0);

  // Déterminer le contexte de chargement selon les props ou utiliser les valeurs par défaut
  const getLoadingContext = () => {
    if (title && message) {
      return { title, description: message };
    }

    // Par défaut pour le chargement initial de l'application
    return {
      title: 'Chargement de l\'application',
      description: 'Initialisation en cours...'
    };
  };

  const context = getLoadingContext();

  // Simulation d'une barre de progression animée
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; // S'arrêter à 90% jusqu'à la fin du chargement réel
        return prev + Math.random() * 15;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-6 animate-fadeIn max-w-md px-4">
        {/* Logo ou icône principale */}
        <div className="relative">
          {/* Cercle de fond avec animation pulse */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-20 rounded-full animate-ping" />
          
          {/* Cercle principal avec gradient */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 rounded-full p-6 shadow-2xl">
            <Loader2 className="w-12 h-12 text-white animate-spin" strokeWidth={2} />
          </div>
        </div>

        {/* Texte de chargement */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-gray-900">{context.title}</h3>
          <p className="text-sm text-gray-500">{context.description}</p>
        </div>

        {/* Barre de progression animée */}
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Points animés */}
        <div className="flex justify-center space-x-2">
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LoaderGlobal;
