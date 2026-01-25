import React, { useState, useEffect } from 'react';
import { Clock, User, FileText, AlertCircle } from 'lucide-react';
import SpinnerChargement from '../commun/SpinnerChargement';

const TimelineHistorique = ({ ficheId }) => {
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerHistorique();
  }, [ficheId]);

  const chargerHistorique = async () => {
    try {
      const response = await fetch(`/api/fiches-criminelles/${ficheId}/historique`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistorique(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setChargement(false);
    }
  };

  const getIconeAction = (type) => {
    const icones = {
      creation: FileText,
      modification: FileText,
      ajout_infraction: AlertCircle,
      changement_statut: Clock,
    };
    return icones[type] || FileText;
  };

  const getCouleurAction = (type) => {
    const couleurs = {
      creation: 'bg-blue-100 text-blue-600',
      modification: 'bg-yellow-100 text-yellow-600',
      ajout_infraction: 'bg-red-100 text-red-600',
      changement_statut: 'bg-green-100 text-green-600',
    };
    return couleurs[type] || 'bg-gray-100 text-gray-600';
  };

  if (chargement) {
    return <SpinnerChargement texte="Chargement de l'historique..." />;
  }

  if (historique.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <Clock className="mx-auto text-gray-400 mb-2" size={48} />
        <p className="text-gray-500">Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Historique des modifications
      </h3>

      <div className="relative">
        {/* Ligne verticale */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Événements */}
        <div className="space-y-6">
          {historique.map((evenement, index) => {
            const Icone = getIconeAction(evenement.type);
            const couleur = getCouleurAction(evenement.type);

            return (
              <div key={index} className="relative flex items-start">
                {/* Icône */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${couleur}`}>
                  <Icone size={20} />
                </div>

                {/* Contenu */}
                <div className="ml-4 flex-1 bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {evenement.titre}
                      </h4>
                      {evenement.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {evenement.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <User size={12} className="mr-1" />
                          {evenement.utilisateur}
                        </div>
                        <div className="flex items-center">
                          <Clock size={12} className="mr-1" />
                          {new Date(evenement.date).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineHistorique;

