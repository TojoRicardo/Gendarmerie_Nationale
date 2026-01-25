import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const ListeInfractions = ({ ficheId, onAjouter }) => {
  const [infractions, setInfractions] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerInfractions();
  }, [ficheId]);

  const chargerInfractions = async () => {
    try {
      const response = await fetch(`/api/fiches-criminelles/${ficheId}/infractions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInfractions(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infractions:', error);
    } finally {
      setChargement(false);
    }
  };

  const getGraviteBadge = (gravite) => {
    const badges = {
      faible: 'bg-green-100 text-green-800',
      moyen: 'bg-yellow-100 text-yellow-800',
      grave: 'bg-orange-100 text-orange-800',
      tres_grave: 'bg-red-100 text-red-800',
    };
    return badges[gravite] || badges.moyen;
  };

  if (chargement) {
    return <SpinnerChargement texte="Chargement des infractions..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Infractions ({infractions.length})
        </h3>
        <Bouton
          variant="primary"
          taille="small"
          icone={Plus}
          onClick={onAjouter}
        >
          Ajouter une infraction
        </Bouton>
      </div>

      {infractions.length > 0 ? (
        <div className="space-y-3">
          {infractions.map((infraction) => (
            <div
              key={infraction.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                    <h4 className="font-medium text-gray-900">{infraction.type}</h4>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">{infraction.description}</p>
                  
                  <div className="flex items-center space-x-4 ml-8 mt-2 text-xs text-gray-500">
                    <span>{new Date(infraction.date).toLocaleDateString('fr-FR')}</span>
                    {infraction.lieu && <span>• {infraction.lieu}</span>}
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getGraviteBadge(infraction.gravite)}`}>
                  {infraction.gravite}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <AlertCircle className="mx-auto text-gray-400 mb-2" size={48} />
          <p className="text-gray-500">Aucune infraction enregistrée</p>
          <Bouton
            variant="outline"
            taille="small"
            icone={Plus}
            onClick={onAjouter}
            className="mt-4"
          >
            Ajouter la première infraction
          </Bouton>
        </div>
      )}
    </div>
  );
};

export default ListeInfractions;

