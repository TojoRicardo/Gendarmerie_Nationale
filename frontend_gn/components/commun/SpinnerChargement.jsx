import React from 'react';
import { Loader2 } from 'lucide-react';

const SpinnerChargement = ({ 
  taille = 'medium', 
  texte = 'Chargement...', 
  pleinePage = false 
}) => {
  const tailleClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <Loader2 
        className={`${tailleClasses[taille]} animate-spin text-blue-600`} 
      />
      {texte && (
        <p className="text-gray-600 text-sm font-medium">{texte}</p>
      )}
    </div>
  );

  if (pleinePage) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
};

export default SpinnerChargement;

