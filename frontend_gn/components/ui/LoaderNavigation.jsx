import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigation } from '../../src/context/NavigationContext';

/**
 * LoaderNavigation - Composant de chargement lors de la navigation dans le menu
 * Affiche le loader avec l'icône et les couleurs du menu cliqué
 */
const LoaderNavigation = () => {
  const { loadingItem } = useNavigation();
  const [progress, setProgress] = useState(0);

  // Simulation d'une barre de progression animée
  useEffect(() => {
    if (!loadingItem) {
      setProgress(0);
      return;
    }

    // Réinitialiser la progression quand un nouvel item se charge
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return 85; // S'arrêter à 85% jusqu'à la fin du chargement réel
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [loadingItem]);

  // Si aucun élément en chargement, ne rien afficher
  if (!loadingItem) {
    return null;
  }

  const Icon = loadingItem.icon || Loader2;
  const title = loadingItem.label || 'Chargement...';
  const description = loadingItem.description || 'Chargement en cours...';
  
  // Couleurs du gradient selon le menu
  const getGradientColors = () => {
    // Mapping des IDs de menu vers les couleurs
    const menuColorMap = {
      'dashboard': 'from-blue-600 to-blue-400',
      'assignations': 'from-indigo-500 to-indigo-600',
      'enquete': 'from-emerald-500 to-emerald-600',
      'fiches': 'from-blue-500 to-blue-600',
      'biometrie': 'from-purple-500 to-purple-600',
      'upr': 'from-purple-500 to-purple-600',
      'rapports': 'from-yellow-500 to-yellow-400',
      'ia': 'from-blue-400 to-purple-500',
      'utilisateurs': 'from-blue-600 to-blue-800',
      'roles': 'from-yellow-500 to-yellow-700',
      'audit': 'from-gray-700 to-gray-600',
    };

    // Vérifier par ID d'abord
    if (loadingItem.id && menuColorMap[loadingItem.id]) {
      return menuColorMap[loadingItem.id];
    }

    // Sinon utiliser le gradient si disponible
    if (loadingItem.gradient) {
      // Convertir les classes Tailwind en couleurs réelles
      const gradientMap = {
        'from-gendarme-blue to-gendarme-blue-light': 'from-blue-600 to-blue-400',
        'from-indigo-500 to-indigo-600': 'from-indigo-500 to-indigo-600',
        'from-emerald-500 to-emerald-600': 'from-emerald-500 to-emerald-600',
        'from-gendarme-light to-gendarme-blue': 'from-blue-500 to-blue-600',
        'from-gendarme-light to-gendarme-light-hover': 'from-purple-500 to-purple-600',
        'from-purple-500 to-purple-600': 'from-purple-500 to-purple-600',
        'from-gendarme-gold to-gendarme-gold-light': 'from-yellow-500 to-yellow-400',
        'from-gendarme-blue-light to-gendarme-light': 'from-blue-400 to-purple-500',
        'from-gendarme-blue to-gendarme-blue-dark': 'from-blue-600 to-blue-800',
        'from-gendarme-gold to-gendarme-gold-dark': 'from-yellow-500 to-yellow-700',
        'from-gendarme-dark to-gendarme-dark-light': 'from-gray-700 to-gray-600',
      };
      return gradientMap[loadingItem.gradient] || 'from-blue-600 to-blue-800';
    }
    
    return 'from-blue-600 to-blue-800';
  };

  const gradientClass = getGradientColors();
  
  // Extraire la couleur principale du gradient pour les points
  const getDotColor = () => {
    if (loadingItem?.id) {
      const dotColorMap = {
        'dashboard': 'bg-blue-600',
        'assignations': 'bg-indigo-500',
        'enquete': 'bg-emerald-500',
        'fiches': 'bg-blue-500',
        'biometrie': 'bg-purple-500',
        'upr': 'bg-purple-500',
        'rapports': 'bg-yellow-500',
        'ia': 'bg-purple-500',
        'utilisateurs': 'bg-blue-600',
        'roles': 'bg-yellow-500',
        'audit': 'bg-gray-700',
      };
      return dotColorMap[loadingItem.id] || 'bg-blue-600';
    }
    return 'bg-blue-600';
  };

  const dotColorClass = getDotColor();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-6 animate-fadeIn max-w-md px-4">
        {/* Logo ou icône principale avec les couleurs du menu */}
        <div className="relative">
          {/* Cercle de fond avec animation pulse */}
          <div className={`absolute inset-0 bg-gradient-to-r ${gradientClass} opacity-20 rounded-full animate-ping`} />
          
          {/* Cercle principal avec gradient du menu */}
          <div className={`relative bg-gradient-to-r ${gradientClass} rounded-full p-6 shadow-2xl flex items-center justify-center`}>
            {typeof Icon === 'function' ? (
              <Icon className="w-12 h-12 text-white animate-spin" strokeWidth={2} />
            ) : (
              <Loader2 className="w-12 h-12 text-white animate-spin" strokeWidth={2} />
            )}
          </div>
        </div>

        {/* Texte de chargement */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-gray-900">Chargement de {title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>

        {/* Barre de progression animée */}
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-300 ease-out`}
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Points animés avec les couleurs du menu */}
        <div className="flex justify-center space-x-2">
          <div className={`w-2.5 h-2.5 ${dotColorClass} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
          <div className={`w-2.5 h-2.5 ${dotColorClass} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
          <div className={`w-2.5 h-2.5 ${dotColorClass} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LoaderNavigation;
