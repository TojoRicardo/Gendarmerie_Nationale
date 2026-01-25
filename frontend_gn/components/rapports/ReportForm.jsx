import React, { useState } from 'react';
import { FileText, Calendar, Filter, MapPin, User, FileSpreadsheet } from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import Bouton from '../commun/Bouton';

const ReportForm = ({ onGenerate, onPreview }) => {
  const [formData, setFormData] = useState({
    typeRapport: '',
    dateDebut: '',
    dateFin: new Date().toISOString().split('T')[0],
    typeInfraction: '',
    region: '',
    formatExport: 'pdf',
  });

  const [erreurs, setErreurs] = useState({});

  const typesRapport = [
    { value: 'enquete', label: "Rapport d'enquête" },
    { value: 'statistique', label: 'Rapport statistique' },
    { value: 'activite', label: "Rapport d'activité" },
    { value: 'mensuel', label: 'Rapport mensuel' },
    { value: 'annuel', label: 'Rapport annuel' },
  ];

  const typesInfraction = [
    { value: 'vol', label: 'Vol' },
    { value: 'meurtre', label: 'Meurtre' },
    { value: 'cybercrime', label: 'Cybercriminalité' },
    { value: 'fraude', label: 'Fraude' },
    { value: 'trafic', label: 'Trafic de drogue' },
    { value: 'tous', label: 'Toutes les infractions' },
  ];

  const regions = [
    { value: 'antananarivo', label: 'Antananarivo' },
    { value: 'toamasina', label: 'Toamasina' },
    { value: 'antsirabe', label: 'Antsirabe' },
    { value: 'mahajanga', label: 'Mahajanga' },
    { value: 'batna', label: 'Batna' },
    { value: 'toutes', label: 'Toutes les régions' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (erreurs[name]) {
      setErreurs(prev => ({ ...prev, [name]: null }));
    }
  };

  const validerFormulaire = () => {
    const nouvellesErreurs = {};

    if (!formData.typeRapport) {
      nouvellesErreurs.typeRapport = 'Le type de rapport est requis';
    }
    if (!formData.dateDebut) {
      nouvellesErreurs.dateDebut = 'La date de début est requise';
    }
    if (!formData.dateFin) {
      nouvellesErreurs.dateFin = 'La date de fin est requise';
    }
    if (formData.dateDebut && formData.dateFin && formData.dateDebut > formData.dateFin) {
      nouvellesErreurs.dateFin = 'La date de fin doit être après la date de début';
    }

    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validerFormulaire()) {
      onGenerate(formData);
    }
  };

  const handlePreview = () => {
    if (validerFormulaire()) {
      onPreview(formData);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
      {/* En-tête Premium */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl mr-4">
            <FileText className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Générateur de Rapport</h2>
            <p className="text-blue-100 mt-1">Gendarmerie Nationale – Sélectionnez les critères et générez un rapport complet</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-6">
          {/* Section 1 : Configuration de base - Format Cartes Premium */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-black mr-3">1</span>
              Configuration du rapport
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Carte Type de rapport */}
              <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-all p-5">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-md mr-3">
                    <FileText className="text-white" size={20} />
                  </div>
                  <label className="font-bold text-gray-900 text-sm">Type de rapport *</label>
                </div>
                <Select
                  name="typeRapport"
                  value={formData.typeRapport}
                  onChange={handleChange}
                  options={typesRapport}
                  erreur={erreurs.typeRapport}
                  required
                />
              </div>

              {/* Carte Format d'export */}
              <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all p-5">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md mr-3">
                    <FileSpreadsheet className="text-white" size={20} />
                  </div>
                  <label className="font-bold text-gray-900 text-sm">Format d'export *</label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'formatExport', value: 'pdf' } })}
                    className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      formData.formatExport === 'pdf'
                        ? 'border-red-500 bg-gradient-to-br from-red-50 to-red-100 text-red-700 shadow-lg scale-105'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:shadow-md'
                    }`}
                  >
                    <div>PDF</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'formatExport', value: 'excel' } })}
                    className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      formData.formatExport === 'excel'
                        ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 text-green-700 shadow-lg scale-105'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-2xl mb-1"></div>
                    <div>Excel</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'formatExport', value: 'print' } })}
                    className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      formData.formatExport === 'print'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 shadow-lg scale-105'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    <div>Print</div>
                  </button>
                </div>
              </div>

              {/* Carte Date de début */}
              <div className="bg-white rounded-2xl border-2 border-cyan-200 shadow-lg hover:shadow-xl transition-all p-5">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg shadow-md mr-3">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <label className="font-bold text-gray-900 text-sm">Date de début *</label>
                </div>
                <ChampTexte
                  name="dateDebut"
                  type="date"
                  value={formData.dateDebut}
                  onChange={handleChange}
                  erreur={erreurs.dateDebut}
                  required
                />
              </div>

              {/* Carte Date de fin */}
              <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-lg hover:shadow-xl transition-all p-5">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-md mr-3">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <label className="font-bold text-gray-900 text-sm">Date de fin *</label>
                </div>
                <ChampTexte
                  name="dateFin"
                  type="date"
                  value={formData.dateFin}
                  onChange={handleChange}
                  erreur={erreurs.dateFin}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Période */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center text-sm font-black mr-3">2</span>
              Période de couverture
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChampTexte
                label="Date de début *"
                name="dateDebut"
                type="date"
                value={formData.dateDebut}
                onChange={handleChange}
                erreur={erreurs.dateDebut}
                icone={Calendar}
                required
              />

              <ChampTexte
                label="Date de fin *"
                name="dateFin"
                type="date"
                value={formData.dateFin}
                onChange={handleChange}
                erreur={erreurs.dateFin}
                icone={Calendar}
                required
              />
            </div>
          </div>

          {/* Section 3 : Filtres */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm font-black mr-3">
                <Filter size={16} />
              </span>
              Filtres spécifiques
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Type d'infraction"
                name="typeInfraction"
                value={formData.typeInfraction}
                onChange={handleChange}
                options={typesInfraction}
                placeholder="Toutes les infractions"
              />

              <Select
                label="Région / Unité"
                name="region"
                value={formData.region}
                onChange={handleChange}
                options={regions}
                placeholder="Toutes les régions"
              />
            </div>
          </div>

          {/* Section 4 : Informations automatiques */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border-2 border-cyan-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-cyan-600 text-white rounded-lg flex items-center justify-center text-sm font-black mr-3">
                <User size={16} />
              </span>
              Informations du rapport
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-cyan-200">
                <p className="text-xs text-gray-500 mb-1">Auteur du rapport</p>
                <p className="font-semibold text-gray-900">Enquêteur connecté</p>
              </div>
              
              <div className="p-4 bg-white rounded-lg border border-cyan-200">
                <p className="text-xs text-gray-500 mb-1">Date de génération</p>
                <p className="font-semibold text-gray-900">{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-2">
            <Bouton
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  typeRapport: '',
                  dateDebut: '',
                  dateFin: new Date().toISOString().split('T')[0],
                  typeInfraction: '',
                  region: '',
                  formatExport: 'pdf',
                });
                setErreurs({});
              }}
            >
              Réinitialiser
            </Bouton>
            <Bouton
              type="submit"
              variant="primary"
              icone={FileSpreadsheet}
            >
              Générer rapport
            </Bouton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;

