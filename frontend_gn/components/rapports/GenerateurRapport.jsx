import React, { useState } from 'react';
import { FileText, Calendar, Filter, Download, BarChart3, TrendingUp, FileCheck, Loader2 } from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import reportService from '../../src/services/reportService';

const GenerateurRapport = ({ onGenerer }) => {
  const [formData, setFormData] = useState({
    typeRapport: '',
    dateDebut: '',
    dateFin: new Date().toISOString().split('T')[0],
    format: 'pdf',
    includeGraphiques: true,
    includeStatistiques: true,
    includeDetails: false,
    filtreStatut: '',
    filtreRegion: '',
  });

  const [erreurs, setErreurs] = useState({});
  const [enCours, setEnCours] = useState(false);

  const typesRapport = [
    { value: 'resume_mensuel', label: 'Résumé Mensuel' },
    { value: 'statistiques_infractions', label: 'Statistiques des Infractions' },
    { value: 'activite_agents', label: 'Activité des Agents' },
    { value: 'fiches_ouvertes', label: 'Fiches Ouvertes' },
    { value: 'analyse_geographique', label: 'Analyse Géographique' },
    { value: 'taux_resolution', label: 'Taux de Résolution' },
    { value: 'biometrie', label: 'Données Biométriques' },
    { value: 'personnalise', label: 'Rapport Personnalisé' },
  ];

  const formatsExport = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel (XLSX)' },
    { value: 'csv', label: 'CSV' },
    { value: 'word', label: 'Word (DOCX)' },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
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

  // Fonction pour formater une date en JJ/MM/AAAA
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fonction pour formater une date avec l'heure en JJ/MM/AAAA HH:MM
  const formatDateTime = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleGenerer = async () => {
    if (!validerFormulaire()) return;

    setEnCours(true);

    try {
      // Préparer les données pour l'API backend
      const rapportData = {
        type_rapport: formData.typeRapport,
        format: formData.format,
        date_debut: formData.dateDebut,
        date_fin: formData.dateFin,
        filtres: {},
        options_inclusion: {
          includeGraphiques: formData.includeGraphiques,
          includeStatistiques: formData.includeStatistiques,
          includeDetails: formData.includeDetails,
        }
      };

      // Ajouter les filtres s'ils sont définis
      if (formData.filtreStatut) {
        rapportData.filtres.statut = formData.filtreStatut;
      }
      if (formData.filtreRegion) {
        rapportData.filtres.region = formData.filtreRegion;
      }

      // Appeler l'API backend pour générer le rapport avec les VRAIES DONNÉES
      const response = await reportService.genererRapport(rapportData);
      
      // Vérifier la structure de la réponse
      if (!response) {
        throw new Error('Aucune réponse du serveur');
      }

      // Gérer les erreurs du backend
      if (response.erreur) {
        const errorMessage = response.details 
          ? `${response.erreur}: ${JSON.stringify(response.details)}`
          : response.erreur;
        throw new Error(errorMessage);
      }

      // Le backend retourne la réponse avec l'ID du rapport généré
      if (response.success && response.rapport) {
        const rapportId = response.rapport.id;
        const downloadUrl = response.rapport.download_url || response.rapport.fichier;
        
        // Déterminer l'extension selon le format
        let extension = 'pdf';
        if (formData.format === 'excel') {
          extension = 'xlsx';
        } else if (formData.format === 'csv') {
          extension = 'csv';
        } else if (formData.format === 'word') {
          extension = 'docx';
        }
        
        // Générer un nom de fichier significatif avec dates formatées DD/MM/YYYY
        const typeLabel = typesRapport.find(t => t.value === formData.typeRapport)?.label || formData.typeRapport;
        const dateDebutFormatee = formatDate(formData.dateDebut).replace(/\//g, '-'); // DD-MM-YYYY pour nom de fichier
        const dateFinFormatee = formatDate(formData.dateFin).replace(/\//g, '-'); // DD-MM-YYYY pour nom de fichier
        const fileName = `${typeLabel.replace(/\s+/g, '_')}_${dateDebutFormatee}_${dateFinFormatee}.${extension}`;
        
        // Télécharger le rapport via l'API (avec authentification)
        try {
          const downloadResponse = await reportService.telechargerRapport(rapportId);
          
          // Déterminer le type MIME selon le format
          let mimeType = 'application/pdf';
          if (formData.format === 'excel') {
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          } else if (formData.format === 'csv') {
            mimeType = 'text/csv';
          } else if (formData.format === 'word') {
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          }
          
          // Créer un blob et télécharger
          const blob = new Blob([downloadResponse.data], { type: mimeType });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
        } catch (downloadError) {
          console.error('Erreur téléchargement rapport:', downloadError);
          throw new Error('Le rapport a été généré mais le téléchargement a échoué. Veuillez réessayer.');
        }
        
        // Appeler le callback de succès
        if (onGenerer) {
          onGenerer({
            ...formData,
            rapportId: rapportId,
            fichier: fileName,
            taille: response.rapport.taille,
            duree: response.rapport.duree,
            titre: response.rapport.titre,
          });
        }
        
        setEnCours(false);
        return;
      } else {
        // Si la réponse ne contient pas le rapport attendu
        throw new Error(response?.message || 'Erreur lors de la génération du rapport');
      }

    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      
      // Extraire le message d'erreur détaillé si disponible
      let errorMessage = 'Erreur lors de la génération du rapport';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.details) {
          errorMessage = `${errorData.erreur || 'Erreur'}: ${typeof errorData.details === 'string' ? errorData.details : JSON.stringify(errorData.details)}`;
        } else if (errorData.erreur) {
          errorMessage = errorData.erreur;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErreurs({ general: errorMessage });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* En-tête avec gradient */}
      <div style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }} className="p-5">
        <div className="flex items-center">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl mr-3">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Générateur de Rapport</h3>
            <p className="text-white/90 text-sm mt-0.5">Créez des rapports personnalisés et professionnels</p>
          </div>
        </div>
      </div>

      <div className="p-5">

      {erreurs.general && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {erreurs.general}
        </div>
      )}

        <div className="space-y-5">
          {/* Configuration de base */}
          <div style={{ backgroundColor: '#185CD61A' }} className="rounded-xl p-4 border border-[#185CD6]/20">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
              <span style={{ backgroundColor: '#185CD6' }} className="w-7 h-7 text-white rounded-lg flex items-center justify-center text-xs font-bold mr-2.5">1</span>
              Configuration de base
            </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Type de rapport"
              name="typeRapport"
              value={formData.typeRapport}
              onChange={handleChange}
              options={typesRapport}
              erreur={erreurs.typeRapport}
              required
            />

            <Select
              label="Format d'export"
              name="format"
              value={formData.format}
              onChange={handleChange}
              options={formatsExport}
              required
            />

            <ChampTexte
              label="Date de début"
              name="dateDebut"
              type="date"
              value={formData.dateDebut}
              onChange={handleChange}
              erreur={erreurs.dateDebut}
              icone={Calendar}
              required
            />

            <ChampTexte
              label="Date de fin"
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

          {/* Options d'inclusion - Format Cartes Premium */}
          <div style={{ backgroundColor: '#185CD61A' }} className="rounded-xl p-4 border border-[#185CD6]/20">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center text-sm">
              <span style={{ backgroundColor: '#185CD6' }} className="w-7 h-7 text-white rounded-lg flex items-center justify-center text-xs font-bold mr-2.5">2</span>
              Options d'inclusion
            </h4>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Carte 1 : Graphiques */}
              <label 
                className="cursor-pointer group relative overflow-hidden rounded-xl border-2 transition-all duration-200"
                style={{
                  borderColor: formData.includeGraphiques ? '#185CD6' : '#E5E7EB',
                  backgroundColor: formData.includeGraphiques ? '#185CD61A' : '#FFFFFF',
                }}
              >
                <div className="p-4">
                  {/* En-tête de la carte */}
                  <div className="flex items-center justify-between mb-3">
                    <div 
                      className="p-2.5 rounded-lg transition-all"
                      style={{
                        background: formData.includeGraphiques ? 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' : '#F3F4F6',
                      }}
                    >
                      <BarChart3 
                        style={{ color: formData.includeGraphiques ? '#FFFFFF' : '#185CD6' }}
                        size={22} 
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="includeGraphiques"
                        checked={formData.includeGraphiques}
                        onChange={handleChange}
                        style={{
                          accentColor: '#185CD6',
                        }}
                        className="w-5 h-5 rounded border-2 cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Contenu */}
                  <h5 className="font-bold text-gray-900 mb-1.5 text-sm">
                    Graphiques et visualisations
                  </h5>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Inclure les diagrammes, courbes et représentations visuelles des données
                  </p>

                  {/* Badge de statut */}
                  {formData.includeGraphiques && (
                    <div 
                      className="mt-2.5 inline-flex items-center space-x-1 text-white px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: '#185CD6' }}
                    >
                      <FileCheck size={11} />
                      <span>Activé</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Carte 2 : Statistiques */}
              <label 
                className="cursor-pointer group relative overflow-hidden rounded-xl border-2 transition-all duration-200"
                style={{
                  borderColor: formData.includeStatistiques ? '#185CD6' : '#E5E7EB',
                  backgroundColor: formData.includeStatistiques ? '#185CD61A' : '#FFFFFF',
                }}
              >
                <div className="p-4">
                  {/* En-tête de la carte */}
                  <div className="flex items-center justify-between mb-3">
                    <div 
                      className="p-2.5 rounded-lg transition-all"
                      style={{
                        background: formData.includeStatistiques ? 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' : '#F3F4F6',
                      }}
                    >
                      <TrendingUp 
                        style={{ color: formData.includeStatistiques ? '#FFFFFF' : '#185CD6' }}
                        size={22} 
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="includeStatistiques"
                        checked={formData.includeStatistiques}
                        onChange={handleChange}
                        style={{
                          accentColor: '#185CD6',
                        }}
                        className="w-5 h-5 rounded border-2 cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Contenu */}
                  <h5 className="font-bold text-gray-900 mb-1.5 text-sm">
                    Statistiques détaillées
                  </h5>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Inclure les analyses approfondies, moyennes, totaux et calculs statistiques
                  </p>

                  {/* Badge de statut */}
                  {formData.includeStatistiques && (
                    <div 
                      className="mt-2.5 inline-flex items-center space-x-1 text-white px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: '#185CD6' }}
                    >
                      <FileCheck size={11} />
                      <span>Activé</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Carte 3 : Détails */}
              <label 
                className="cursor-pointer group relative overflow-hidden rounded-xl border-2 transition-all duration-200"
                style={{
                  borderColor: formData.includeDetails ? '#185CD6' : '#E5E7EB',
                  backgroundColor: formData.includeDetails ? '#185CD61A' : '#FFFFFF',
                }}
              >
                <div className="p-4">
                  {/* En-tête de la carte */}
                  <div className="flex items-center justify-between mb-3">
                    <div 
                      className="p-2.5 rounded-lg transition-all"
                      style={{
                        background: formData.includeDetails ? 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' : '#F3F4F6',
                      }}
                    >
                      <FileText 
                        style={{ color: formData.includeDetails ? '#FFFFFF' : '#185CD6' }}
                        size={22} 
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="includeDetails"
                        checked={formData.includeDetails}
                        onChange={handleChange}
                        style={{
                          accentColor: '#185CD6',
                        }}
                        className="w-5 h-5 rounded border-2 cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Contenu */}
                  <h5 className="font-bold text-gray-900 mb-1.5 text-sm">
                    Détails des fiches
                  </h5>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Inclure les informations complètes de chaque fiche criminelle individuelle
                  </p>

                  {/* Badge de statut */}
                  {formData.includeDetails && (
                    <div 
                      className="mt-2.5 inline-flex items-center space-x-1 text-white px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: '#185CD6' }}
                    >
                      <FileCheck size={11} />
                      <span>Activé</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Filtres supplémentaires */}
          <div style={{ backgroundColor: '#185CD61A' }} className="rounded-xl p-4 border border-[#185CD6]/20">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
              <span style={{ backgroundColor: '#185CD6' }} className="w-7 h-7 text-white rounded-lg flex items-center justify-center text-xs font-bold mr-2.5">
                <Filter size={14} />
              </span>
              Filtres supplémentaires (optionnels)
            </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Filtrer par statut"
              name="filtreStatut"
              value={formData.filtreStatut}
              onChange={handleChange}
              options={[
                { value: 'en_cours', label: 'En cours' },
                { value: 'cloture', label: 'Clôturé' },
                { value: 'en_attente', label: 'En attente' },
              ]}
              placeholder="Tous les statuts"
            />

            <ChampTexte
              label="Filtrer par région"
              name="filtreRegion"
              value={formData.filtreRegion}
              onChange={handleChange}
              placeholder="Ex: Antananarivo"
            />
          </div>
        </div>
        </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  typeRapport: '',
                  dateDebut: '',
                  dateFin: new Date().toISOString().split('T')[0],
                  format: 'pdf',
                  includeGraphiques: true,
                  includeStatistiques: true,
                  includeDetails: false,
                  filtreStatut: '',
                  filtreRegion: '',
                });
                setErreurs({});
              }}
              className="px-4 py-2 border-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                borderColor: '#185CD6',
                color: '#185CD6',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#185CD61A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={handleGenerer}
              disabled={enCours}
              className="px-4 py-2 rounded-lg font-medium text-sm text-white transition-all duration-200 flex items-center space-x-2"
              style={{
                background: enCours ? '#9CA3AF' : 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)',
                cursor: enCours ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!enCours) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 92, 214, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!enCours) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {enCours ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" size={16} />
                  <span>Génération...</span>
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
  );
};

export default GenerateurRapport;

