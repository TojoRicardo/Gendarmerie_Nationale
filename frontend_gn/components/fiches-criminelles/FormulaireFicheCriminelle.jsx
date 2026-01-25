import React, { useState, useEffect } from 'react';
import { FileText, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import Bouton from '../commun/Bouton';

const FormulaireFicheCriminelle = ({ fiche, onSauvegarder, onAnnuler }) => {
  const [formData, setFormData] = useState({
    numeroDossier: '',
    description: '',
    dateOuverture: new Date().toISOString().split('T')[0],
    lieu: '',
    niveauDanger: 'moyen',
    statut: 'en_cours',
    suspectId: '',
    notes: '',
  });

  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(false);
  const [suspects, setSuspects] = useState([]);

  useEffect(() => {
    if (fiche) {
      setFormData({
        numeroDossier: fiche.numeroDossier || '',
        description: fiche.description || '',
        dateOuverture: fiche.dateOuverture ? fiche.dateOuverture.split('T')[0] : '',
        lieu: fiche.lieu || '',
        niveauDanger: fiche.niveauDanger || 'moyen',
        statut: fiche.statut || 'en_cours',
        suspectId: fiche.suspectId || '',
        notes: fiche.notes || '',
      });
    }
    chargerSuspects();
  }, [fiche]);

  const chargerSuspects = async () => {
    try {
      const response = await fetch('/api/suspects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSuspects(data.map(s => ({ 
          value: s.id, 
          label: `${s.nom} ${s.prenom}` 
        })));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des suspects:', error);
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

    // Le numéro de dossier n'est plus validé car il est généré automatiquement

    if (!formData.description.trim()) {
      nouvellesErreurs.description = 'La description est requise';
    }

    if (!formData.dateOuverture) {
      nouvellesErreurs.dateOuverture = 'La date d\'ouverture est requise';
    }

    if (!formData.lieu.trim()) {
      nouvellesErreurs.lieu = 'Le lieu est requis';
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

      {/* Afficher le numéro de dossier uniquement en mode édition (lecture seule) */}
      {fiche && formData.numeroDossier && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileText className="text-blue-600" size={20} />
            <div>
              <p className="text-sm text-gray-600 font-medium">Numéro de dossier</p>
              <p className="text-lg font-bold text-blue-800">{formData.numeroDossier}</p>
            </div>
          </div>
        </div>
      )}

      {/* Message pour la création automatique */}
      {!fiche && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileText className="text-green-600" size={20} />
            <div>
              <p className="text-sm text-green-800">
                <span className="font-semibold">Numéro de dossier :</span> Sera généré automatiquement au format <span className="font-mono font-bold">XXX-CIE/2-RJ</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChampTexte
          label="Date d'ouverture"
          name="dateOuverture"
          type="date"
          value={formData.dateOuverture}
          onChange={handleChange}
          erreur={erreurs.dateOuverture}
          icone={Calendar}
          required
        />

        <ChampTexte
          label="Lieu"
          name="lieu"
          value={formData.lieu}
          onChange={handleChange}
          erreur={erreurs.lieu}
          icone={MapPin}
          placeholder="Ex: Antananarivo, Madagascar"
          required
        />

        <Select
          label="Niveau de danger"
          name="niveauDanger"
          value={formData.niveauDanger}
          onChange={handleChange}
          options={[
            { value: 'faible', label: 'Faible' },
            { value: 'moyen', label: 'Moyen' },
            { value: 'eleve', label: 'Élevé' },
            { value: 'critique', label: 'Critique' },
          ]}
          required
        />

        <Select
          label="Statut"
          name="statut"
          value={formData.statut}
          onChange={handleChange}
          options={[
            { value: 'en_cours', label: 'En cours' },
            { value: 'en_attente', label: 'En attente' },
            { value: 'cloture', label: 'Clôturé' },
            { value: 'archive', label: 'Archivé' },
          ]}
          required
        />

        <Select
          label="Suspect principal (optionnel)"
          name="suspectId"
          value={formData.suspectId}
          onChange={handleChange}
          options={suspects}
          placeholder="Sélectionner un suspect"
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
          placeholder="Décrivez les faits..."
        />
        {erreurs.description && (
          <p className="mt-1 text-sm text-red-600">{erreurs.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes complémentaires
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Informations supplémentaires..."
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
          {fiche ? 'Mettre à jour' : 'Créer'}
        </Bouton>
      </div>
    </form>
  );
};

export default FormulaireFicheCriminelle;

