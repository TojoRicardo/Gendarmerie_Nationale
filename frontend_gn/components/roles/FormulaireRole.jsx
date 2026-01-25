import React, { useState, useEffect } from 'react';
import { Shield, FileText } from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Bouton from '../commun/Bouton';

const FormulaireRole = ({ role, onSauvegarder, onAnnuler }) => {
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: '',
    estActif: true,
  });

  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (role) {
      setFormData({
        nom: role.nom || '',
        code: role.code || '',
        description: role.description || '',
        estActif: role.estActif !== undefined ? role.estActif : true,
      });
    }
  }, [role]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Effacer l'erreur pour ce champ
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
    } else if (!/^[A-Z_]+$/.test(formData.code)) {
      nouvellesErreurs.code = 'Le code doit contenir uniquement des lettres majuscules et underscores';
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

      <div className="space-y-4">
        <ChampTexte
          label="Nom du rôle"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          erreur={erreurs.nom}
          icone={Shield}
          placeholder="Ex: Administrateur"
          required
        />

        <ChampTexte
          label="Code du rôle"
          name="code"
          value={formData.code}
          onChange={handleChange}
          erreur={erreurs.code}
          placeholder="Ex: ADMIN"
          aide="Utilisez uniquement des lettres majuscules et underscores"
          required
        />

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
            placeholder="Décrivez les responsabilités de ce rôle..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="estActif"
            name="estActif"
            checked={formData.estActif}
            onChange={handleChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
          <label htmlFor="estActif" className="ml-2 text-sm text-gray-700">
            Rôle actif
          </label>
        </div>
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
          {role ? 'Mettre à jour' : 'Créer'}
        </Bouton>
      </div>
    </form>
  );
};

export default FormulaireRole;

