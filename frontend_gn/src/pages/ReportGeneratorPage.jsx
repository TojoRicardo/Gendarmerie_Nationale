/**
 * Page de génération de rapports professionnels
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, BarChart3, Download, Calendar, Filter, 
  TrendingUp, MapPin, CheckCircle, Activity, RefreshCw, Loader2,
  FileSpreadsheet, FileType, FileBarChart
} from 'lucide-react';
import reportService from '../services/reportService';
import { useNotification } from '../context/NotificationContext';
import { MESSAGES } from '../utils/notifications';

const ReportGeneratorPage = () => {
  const notification = useNotification();
  
  // États pour le formulaire
  const [formData, setFormData] = useState({
    type_rapport: 'statistiques_infractions',
    format: 'pdf',
    date_debut: '',
    date_fin: new Date().toISOString().split('T')[0],
    filtres: {
      statut: '',
      region: '',
    },
    options_inclusion: {
      includeGraphiques: true,
      includeStatistiques: true,
      includeDetails: false,
    },
  });
  
  // États pour l'UI
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [formats, setFormats] = useState([]);
  const [erreurs, setErreurs] = useState({});
  
  // Charger les types de rapports
  useEffect(() => {
    const chargerTypes = async () => {
      try {
        const data = await reportService.getTypes();
        setTypes(data.types_rapports || []);
        setFormats(data.formats_export || []);
      } catch (error) {
        console.error('Erreur chargement types:', error);
      }
    };
    
    chargerTypes();
  }, []);
  
  // Gestion des changements de formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur du champ
    if (erreurs[name]) {
      setErreurs(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleFiltreChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      filtres: {
        ...prev.filtres,
        [name]: value
      }
    }));
  };
  
  const toggleOption = (option) => {
    setFormData(prev => ({
      ...prev,
      options_inclusion: {
        ...prev.options_inclusion,
        [option]: !prev.options_inclusion[option]
      }
    }));
  };
  
  // Validation du formulaire
  const validerFormulaire = () => {
    const nouvelles_erreurs = {};
    
    if (!formData.type_rapport) {
      nouvelles_erreurs.type_rapport = 'Le type de rapport est requis';
    }
    
    if (!formData.format) {
      nouvelles_erreurs.format = 'Le format d\'export est requis';
    }
    
    if (!formData.date_debut) {
      nouvelles_erreurs.date_debut = 'La date de début est requise';
    }
    
    if (!formData.date_fin) {
      nouvelles_erreurs.date_fin = 'La date de fin est requise';
    }
    
    if (formData.date_debut && formData.date_fin && formData.date_debut > formData.date_fin) {
      nouvelles_erreurs.date_fin = 'La date de fin doit être postérieure à la date de début';
    }
    
    setErreurs(nouvelles_erreurs);
    return Object.keys(nouvelles_erreurs).length === 0;
  };
  
  // Génération du rapport
  const handleGenerer = async () => {
    if (!validerFormulaire()) {
      notification.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await reportService.genererRapport(formData);
      
      if (response.success) {
        notification.showSuccess(MESSAGES.SUCCESS_REPORT_GENERATED);
        
        // Télécharger automatiquement
        if (response.rapport && response.rapport.id) {
          const filename = `${response.rapport.titre}.${response.rapport.format}`;
          await reportService.telechargerEtSauvegarder(response.rapport.id, filename);
        }
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      notification.showError(MESSAGES.ERROR_REPORT_GENERATION);
    } finally {
      setLoading(false);
    }
  };
  
  // Réinitialiser le formulaire
  const handleReinitialiser = () => {
    setFormData({
      type_rapport: 'statistiques_infractions',
      format: 'pdf',
      date_debut: '',
      date_fin: new Date().toISOString().split('T')[0],
      filtres: {
        statut: '',
        region: '',
      },
      options_inclusion: {
        includeGraphiques: true,
        includeStatistiques: true,
        includeDetails: false,
      },
    });
    setErreurs({});
  };
  
  // Types de rapports pour l'affichage
  const typesRapports = [
    {
      value: 'resume_mensuel',
      label: 'Résumé Mensuel',
      icon: FileText,
      description: 'Vue d\'ensemble du mois'
    },
    {
      value: 'statistiques_infractions',
      label: 'Statistiques Infractions',
      icon: BarChart3,
      description: 'Analyse par type'
    },
    {
      value: 'analyse_geographique',
      label: 'Analyse Géographique',
      icon: MapPin,
      description: 'Répartition territoriale'
    },
    {
      value: 'taux_resolution',
      label: 'Taux de Résolution',
      icon: TrendingUp,
      description: 'Performance équipes'
    },
  ];
  
  // Formats d'export pour l'affichage
  const formatsExport = [
    {
      value: 'pdf',
      label: 'PDF',
      icon: FileText,
      couleur: '#EF4444',
      description: 'Pour présentation et archivage',
      avantages: ['Format universel et sécurisé', 'Préserve la mise en page', 'Idéal pour impression']
    },
    {
      value: 'excel',
      label: 'Excel',
      icon: FileSpreadsheet,
      couleur: '#10B981',
      description: 'Pour analyse approfondie',
      avantages: ['Tableaux et formules', 'Graphiques dynamiques', 'Manipulation des données']
    },
    {
      value: 'csv',
      label: 'CSV',
      icon: FileBarChart,
      couleur: '#185CD6',
      description: 'Pour import dans outils tiers',
      avantages: ['Format léger et universel', 'Compatible tous logiciels', 'Idéal pour bases de données']
    },
    {
      value: 'word',
      label: 'Word',
      icon: FileType,
      couleur: '#1E40AF',
      description: 'Pour édition et modification',
      avantages: ['Éditable et personnalisable', 'Ajout commentaires', 'Collaboration facilitée']
    },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6" style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }}>
        <div className="flex items-center">
          <div 
            className="p-2 rounded-lg mr-3"
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #FFFFFF'
            }}
          >
            <BarChart3 size={32} style={{ color: '#185CD6' }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Rapports & Statistiques</h1>
            <p className="text-blue-100 text-sm">Génération de rapports personnalisés et exports de données</p>
          </div>
        </div>
        
        {/* Statistiques Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Rapports générés', value: '248', icon: FileText },
            { label: 'Ce mois', value: '42', icon: Calendar },
            { label: 'En attente', value: '3', icon: Activity },
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #185CD6'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                  <div className="text-xl font-bold" style={{ color: '#185CD6' }}>{stat.value}</div>
                </div>
                <stat.icon size={20} style={{ color: '#185CD6' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Description */}
      <div className="p-5">
        <div 
          className="rounded-lg p-4"
          style={{
            backgroundColor: '#185CD60D',
            border: '1px solid #185CD6'
          }}
        >
          <div className="flex items-start">
            <FileText size={20} className="mr-2 flex-shrink-0" style={{ color: '#185CD6' }} />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Génération de Rapports Professionnels</h3>
              <p className="text-xs text-gray-600">
                Créez des rapports personnalisés en sélectionnant le type, la période et les options d'export. 
                Les rapports sont générés instantanément et peuvent être téléchargés en PDF, Excel, CSV ou Word.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Formulaire Principal */}
      <div className="p-5">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* En-tête formulaire */}
          <div className="p-5" style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }}>
            <div className="flex items-center">
              <FileText size={20} className="mr-2 text-white" />
              <h2 className="text-lg font-bold text-white">Générateur de Rapport</h2>
            </div>
            <p className="text-blue-100 text-xs mt-1">Créez des rapports personnalisés et professionnels</p>
          </div>
          
          {/* 1. Configuration de base */}
          <div className="p-5 border-b">
            <div className="flex items-center mb-4">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center mr-2 text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }}
              >
                1
              </div>
              <h3 className="font-semibold text-gray-900">Configuration de base</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type de rapport */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de rapport <span className="text-red-500">*</span>
                </label>
                <select
                  name="type_rapport"
                  value={formData.type_rapport}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {types.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {erreurs.type_rapport && (
                  <p className="text-red-500 text-xs mt-1">{erreurs.type_rapport}</p>
                )}
              </div>
              
              {/* Format d'export */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format d'export <span className="text-red-500">*</span>
                </label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {formats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
                {erreurs.format && (
                  <p className="text-red-500 text-xs mt-1">{erreurs.format}</p>
                )}
              </div>
              
              {/* Date de début */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date_debut"
                  value={formData.date_debut}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {erreurs.date_debut && (
                  <p className="text-red-500 text-xs mt-1">{erreurs.date_debut}</p>
                )}
              </div>
              
              {/* Date de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date_fin"
                  value={formData.date_fin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {erreurs.date_fin && (
                  <p className="text-red-500 text-xs mt-1">{erreurs.date_fin}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* 2. Options d'inclusion */}
          <div className="p-5 border-b">
            <div className="flex items-center mb-4">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center mr-2 text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }}
              >
                2
              </div>
              <h3 className="font-semibold text-gray-900">Options d'inclusion</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  key: 'includeGraphiques',
                  label: 'Graphiques et visualisations',
                  description: 'Inclure les diagrammes, courbes et représentations visuelles des données',
                  icon: BarChart3
                },
                {
                  key: 'includeStatistiques',
                  label: 'Statistiques détaillées',
                  description: 'Inclure les analyses approfondies, moyennes, totaux et calculs statistiques',
                  icon: TrendingUp
                },
                {
                  key: 'includeDetails',
                  label: 'Détails des fiches',
                  description: 'Inclure les informations complètes de chaque fiche criminelle individuelle',
                  icon: FileText
                },
              ].map((option) => (
                <div
                  key={option.key}
                  onClick={() => toggleOption(option.key)}
                  className="relative p-4 border-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    borderColor: formData.options_inclusion[option.key] ? '#185CD6' : '#E5E7EB',
                    backgroundColor: formData.options_inclusion[option.key] ? '#185CD60D' : '#FFFFFF'
                  }}
                >
                  {formData.options_inclusion[option.key] && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle size={20} style={{ color: '#185CD6' }} />
                    </div>
                  )}
                  <option.icon size={24} className="mb-2" style={{ color: '#185CD6' }} />
                  <h4 className="font-semibold text-sm text-gray-900 mb-1">{option.label}</h4>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* 3. Filtres supplémentaires */}
          <div className="p-5 border-b">
            <div className="flex items-center mb-4">
              <Filter size={18} className="mr-2" style={{ color: '#185CD6' }} />
              <h3 className="font-semibold text-gray-900">Filtres supplémentaires (optionnels)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtre par statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrer par statut
                </label>
                <select
                  name="statut"
                  value={formData.filtres.statut}
                  onChange={handleFiltreChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="en_cours">En cours</option>
                  <option value="cloture">Clôturé</option>
                  <option value="en_attente">En attente</option>
                </select>
              </div>
              
              {/* Filtre par région */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrer par région
                </label>
                <input
                  type="text"
                  name="region"
                  value={formData.filtres.region}
                  onChange={handleFiltreChange}
                  placeholder="Ex: Antananarivo, Toamasina..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="p-5 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={handleReinitialiser}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} />
              <span>Réinitialiser</span>
            </button>
            
            <button
              onClick={handleGenerer}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{
                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin text-white" size={16} />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Générer rapport</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Types de Rapports Disponibles */}
      <div className="p-5">
        <div className="mb-4 flex items-center">
          <FileText size={20} className="mr-2" style={{ color: '#185CD6' }} />
          <h2 className="text-lg font-semibold text-gray-900">Types de Rapports Disponibles</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Sélectionnez le type d'analyse souhaité</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {typesRapports.map((type) => (
            <div
              key={type.value}
              onClick={() => setFormData(prev => ({ ...prev, type_rapport: type.value }))}
              className="p-4 bg-white rounded-lg border-2 cursor-pointer transition-all"
              style={{
                borderColor: formData.type_rapport === type.value ? '#185CD6' : '#E5E7EB',
                borderLeftWidth: formData.type_rapport === type.value ? '4px' : '2px'
              }}
            >
              <type.icon size={24} className="mb-2" style={{ color: '#185CD6' }} />
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{type.label}</h3>
              <p className="text-xs text-gray-600">{type.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Formats d'Export */}
      <div className="p-5">
        <div className="mb-4 flex items-center">
          <Download size={20} className="mr-2" style={{ color: '#185CD6' }} />
          <h2 className="text-lg font-semibold text-gray-900">Formats d'Export</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Choisissez le format adapté à vos besoins</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {formatsExport.map((format) => (
            <div
              key={format.value}
              onClick={() => setFormData(prev => ({ ...prev, format: format.value }))}
              className="relative p-5 rounded-lg cursor-pointer transition-all"
              style={{
                backgroundColor: formData.format === format.value ? format.couleur : '#FFFFFF',
                border: `2px solid ${formData.format === format.value ? format.couleur : '#E5E7EB'}`,
              }}
            >
              {formData.format === format.value && (
                <div className="absolute top-3 right-3">
                  <CheckCircle size={20} className="text-white" />
                </div>
              )}
              <format.icon 
                size={24} 
                className="mb-3"
                style={{ color: formData.format === format.value ? '#FFFFFF' : format.couleur }}
              />
              <h3 
                className="font-bold text-lg mb-1"
                style={{ color: formData.format === format.value ? '#FFFFFF' : '#1F2937' }}
              >
                {format.label}
              </h3>
              <p 
                className="text-sm mb-3"
                style={{ color: formData.format === format.value ? '#FFFFFF' : '#6B7280' }}
              >
                {format.description}
              </p>
              <ul className="space-y-1">
                {format.avantages.map((avantage, idx) => (
                  <li key={idx} className="flex items-start text-xs">
                    <CheckCircle 
                      size={14} 
                      className="mr-1 flex-shrink-0 mt-0.5"
                      style={{ color: formData.format === format.value ? '#FFFFFF' : format.couleur }}
                    />
                    <span style={{ color: formData.format === format.value ? '#FFFFFF' : '#6B7280' }}>
                      {avantage}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportGeneratorPage;
