import React, { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import Bouton from '../commun/Bouton';

const FormulaireTypeInfraction = ({ typeInfraction, onSauvegarder, onAnnuler }) => {
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: '',
    categorie: '',
    peineMinimum: '',
    peineMaximum: '',
  });

  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (typeInfraction) {
      setFormData({
        nom: typeInfraction.nom || '',
        code: typeInfraction.code || '',
        description: typeInfraction.description || '',
        categorie: typeInfraction.categorie || '',
        peineMinimum: typeInfraction.peineMinimum || '',
        peineMaximum: typeInfraction.peineMaximum || '',
      });
    }
  }, [typeInfraction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (erreurs[name]) {
      setErreurs(prev => ({ ...prev, [name]: null }));
    }
  };

  const validerFormulaire = () => {
    const nouvellesErreurs = {};

    if (!formData.nom.trim()) {
      nouvellesErreurs.nom = 'Le nom est requis';
    }

    if (!formData.code.trim()) {
      nouvellesErreurs.code = 'Le code est requis';
    }

    if (!formData.categorie) {
      nouvellesErreurs.categorie = 'La catégorie est requise';
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
        <ChampTexte
          label="Nom de l'infraction"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          erreur={erreurs.nom}
          icone={Tag}
          placeholder="Ex: Vol à main armée"
          required
        />

        <ChampTexte
          label="Code"
          name="code"
          value={formData.code}
          onChange={handleChange}
          erreur={erreurs.code}
          placeholder="Ex: INF-001"
          required
        />

        <Select
          label="Catégorie"
          name="categorie"
          value={formData.categorie}
          onChange={handleChange}
          erreur={erreurs.categorie}
          options={[
            { value: 'crime', label: 'Crime' },
            { value: 'delit', label: 'Délit' },
            { value: 'contravention', label: 'Contravention' },
          ]}
          required
        />

        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <ChampTexte
            label="Peine minimum (mois)"
            name="peineMinimum"
            type="number"
            value={formData.peineMinimum}
            onChange={handleChange}
            placeholder="Ex: 6"
          />

          <ChampTexte
            label="Peine maximum (mois)"
            name="peineMaximum"
            type="number"
            value={formData.peineMaximum}
            onChange={handleChange}
            placeholder="Ex: 120"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Décrivez ce type d'infraction..."
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
          {typeInfraction ? 'Mettre à jour' : 'Créer'}
        </Bouton>
      </div>
    </form>
  );
};

export default FormulaireTypeInfraction;

