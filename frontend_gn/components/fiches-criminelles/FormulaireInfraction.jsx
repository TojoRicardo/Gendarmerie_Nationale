import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import Bouton from '../commun/Bouton';

const FormulaireInfraction = ({ infraction, ficheId, onSauvegarder, onAnnuler }) => {
  const [formData, setFormData] = useState({
    ficheId: ficheId || '',
    typeInfractionId: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    lieu: '',
    gravite: 'moyen',
    preuves: '',
  });

  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(false);
  const [typesInfractions, setTypesInfractions] = useState([]);

  useEffect(() => {
    if (infraction) {
      setFormData({
        ficheId: infraction.ficheId || ficheId,
        typeInfractionId: infraction.typeInfractionId || '',
        description: infraction.description || '',
        date: infraction.date ? infraction.date.split('T')[0] : '',
        lieu: infraction.lieu || '',
        gravite: infraction.gravite || 'moyen',
        preuves: infraction.preuves || '',
      });
    }
    chargerTypesInfractions();
  }, [infraction, ficheId]);

  const chargerTypesInfractions = async () => {
    try {
      const response = await fetch('/api/types-infractions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTypesInfractions(data.map(type => ({ 
          value: type.id, 
          label: type.nom 
        })));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types d\'infractions:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (erreurs[name]) {
      setErreurs(prev => ({ ...prev, [name]: null }));
    }
  };

  const validerFormulaire = () => {
    const nouvellesErreurs = {};

    if (!formData.typeInfractionId) {
      nouvellesErreurs.typeInfractionId = 'Le type d\'infraction est requis';
    }

    if (!formData.description.trim()) {
      nouvellesErreurs.description = 'La description est requise';
    }

    if (!formData.date) {
      nouvellesErreurs.date = 'La date est requise';
    }

    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validerFormulaire()) return;

    setChargement(true);

    try {
      await onSauvegarder(formData);
    } catch (error) {
      setErreurs({ general: error.message });
    } finally {
      setChargement(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erreurs.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {erreurs.general}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Type d'infraction"
          name="typeInfractionId"
          value={formData.typeInfractionId}
          onChange={handleChange}
          options={typesInfractions}
          erreur={erreurs.typeInfractionId}
          required
        />

        <ChampTexte
          label="Date de l'infraction"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          erreur={erreurs.date}
          icone={Calendar}
          required
        />

        <ChampTexte
          label="Lieu"
          name="lieu"
          value={formData.lieu}
          onChange={handleChange}
          placeholder="Ex: Antananarivo"
        />

        <Select
          label="Gravité"
          name="gravite"
          value={formData.gravite}
          onChange={handleChange}
          options={[
            { value: 'faible', label: 'Faible' },
            { value: 'moyen', label: 'Moyen' },
            { value: 'grave', label: 'Grave' },
            { value: 'tres_grave', label: 'Très grave' },
          ]}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:border-transparent
            ${erreurs.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
          `}
          placeholder="Décrivez l'infraction..."
        />
        {erreurs.description && (
          <p className="mt-1 text-sm text-red-600">{erreurs.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preuves et éléments
        </label>
        <textarea
          name="preuves"
          value={formData.preuves}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Décrivez les preuves disponibles..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Bouton
          type="button"
          variant="secondary"
          onClick={onAnnuler}
        >
          Annuler
        </Bouton>
        <Bouton
          type="submit"
          variant="primary"
          chargement={chargement}
        >
          {infraction ? 'Mettre à jour' : 'Ajouter'}
        </Bouton>
      </div>
    </form>
  );
};

export default FormulaireInfraction;

