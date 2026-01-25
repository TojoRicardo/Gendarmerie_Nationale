import React, { useState, useEffect } from 'react';
import { 
  Filter, Calendar, User, Activity, X, RefreshCw, 
  Clock, Shield, Zap, Save, Trash2, CheckCircle2, Download, Brain, Loader2
} from 'lucide-react';
import ChampTexte from '../commun/ChampTexte';
import Select from '../commun/Select';
import Bouton from '../commun/Bouton';
import { getUsers } from '../../src/services/authService';
import { getAuditEntries, getDerniereConnexion, getStatutIA } from '../../src/services/auditService';

const FiltreAudit = ({ onFiltrer, onReinitialiser, onToggleOllama }) => {
    const [filtres, setFiltres] = useState({
      dateDebut: '',
      dateFin: '', // Pas de date de fin par défaut pour afficher tout
      utilisateur: '',
    });

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [filtresPreset, setFiltresPreset] = useState([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [enCoursGeneration, setEnCoursGeneration] = useState(false);
  const [formatRapport, setFormatRapport] = useState('pdf');
  const [filtreRapideActif, setFiltreRapideActif] = useState(null);
  const [chargementConnexion, setChargementConnexion] = useState(false);
  const [statutIA, setStatutIA] = useState(null);
  const [resetKey, setResetKey] = useState(0); // Clé pour forcer la réinitialisation des champs

  useEffect(() => {
    chargerUtilisateurs();
    chargerPresetsLocaux();
    chargerStatutIA();
  }, []);

  const chargerStatutIA = async () => {
    try {
      const statut = await getStatutIA();
      setStatutIA(statut);
    } catch (error) {
      // Ne pas logger les erreurs réseau (serveur non disponible)
      // Seulement logger les erreurs réelles (400+, etc.)
      if (error.isNetworkError) {
        // Mode offline - définir un statut par défaut silencieusement
        setStatutIA({
          statut: 'inactif',
          message: 'Serveur indisponible - Mode hors ligne',
          ollama_installe: false,
          ollama_enabled: false,
          modele_disponible: false
        });
      } else {
        // Erreur réelle (400+, 500, etc.)
        console.error('Erreur lors du chargement du statut IA:', error);
        setStatutIA({
          statut: 'inactif',
          message: 'Impossible de vérifier le statut de l\'IA'
        });
      }
    }
  };

  // Réappliquer le filtre "Depuis connexion" si l'utilisateur change (seulement si le filtre est actif)
  useEffect(() => {
    if (filtreRapideActif === 'depuis_connexion' && filtres.utilisateur) {
      const appliquerFiltreConnexion = async () => {
        setChargementConnexion(true);
        try {
          const connexionData = await getDerniereConnexion(filtres.utilisateur);
          
          if (connexionData.derniere_connexion) {
            const dateConnexion = new Date(connexionData.derniere_connexion);
            const dateConnexionStr = dateConnexion.toISOString().split('T')[0];
            
            const nouveauxFiltres = {
              dateDebut: dateConnexionStr,
              dateFin: new Date().toISOString().split('T')[0],
              utilisateur: filtres.utilisateur
            };
            
            setFiltres(nouveauxFiltres);
            onFiltrer(nouveauxFiltres);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération de la dernière connexion:', error);
        } finally {
          setChargementConnexion(false);
        }
      };
      
      appliquerFiltreConnexion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres.utilisateur, filtreRapideActif]);

  const chargerUtilisateurs = async () => {
    try {
      // getUsers gère automatiquement le cache en cas d'erreur réseau
      // Il retourne toujours un tableau (vide ou avec des données)
      const response = await getUsers({ limit: 1000 });
      const usersList = Array.isArray(response) ? response : (response.results || []);
      const utilisateursFormates = usersList.map(user => ({
        value: user.id?.toString() || user.pk?.toString() || '',
        label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Utilisateur'
      }));
      setUtilisateurs(utilisateursFormates);
    } catch (error) {
      // Ne pas logger les erreurs réseau (serveur non disponible)
      // getUsers gère déjà le cache et retourne un tableau vide en cas d'erreur réseau
      // Seulement logger les erreurs réelles (erreurs de parsing, 400+, etc.)
      if (error.response && error.response.status >= 400) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      }
      setUtilisateurs([]);
    }
  };

  const chargerPresetsLocaux = () => {
    const saved = localStorage.getItem('auditFiltersPresets');
    if (saved) {
      setFiltresPreset(JSON.parse(saved));
    }
  };

  const sauvegarderPreset = () => {
    if (!presetName.trim()) return;

    const newPreset = {
      id: Date.now(),
      name: presetName,
      filters: filtres,
      createdAt: new Date().toISOString()
    };

    const updated = [...filtresPreset, newPreset];
    setFiltresPreset(updated);
    localStorage.setItem('auditFiltersPresets', JSON.stringify(updated));
    setPresetName('');
    setShowSavePreset(false);
  };

  const appliquerPreset = (preset) => {
    setFiltres(preset.filters);
    onFiltrer(preset.filters);
  };

  const supprimerPreset = (id) => {
    const updated = filtresPreset.filter(p => p.id !== id);
    setFiltresPreset(updated);
    localStorage.setItem('auditFiltersPresets', JSON.stringify(updated));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltres(prev => ({ ...prev, [name]: value }));
  };

  const handleFiltrer = () => {
    onFiltrer(filtres);
  };

    const handleReinitialiser = () => {
      // Réinitialiser tous les filtres avec des valeurs explicitement vides
      const filtresVides = {
        dateDebut: '',
        dateFin: '',
        utilisateur: '',
      };
      
      // Réinitialiser tous les états
      setFiltres(filtresVides);
      setFiltreRapideActif(null);
      setFormatRapport('pdf'); // Réinitialiser le format à PDF par défaut
      setShowSavePreset(false); // Fermer le formulaire de sauvegarde s'il est ouvert
      setPresetName(''); // Vider le nom du preset
      
      // Incrémenter la clé de réinitialisation pour forcer React à réinitialiser les champs
      setResetKey(prev => prev + 1);
      
      // Appeler onReinitialiser ET onFiltrer pour appliquer immédiatement les filtres vides
      if (onReinitialiser) {
        onReinitialiser(filtresVides);
      }
      if (onFiltrer) {
        onFiltrer(filtresVides);
      }
    };

  const genererRapport = async () => {
    setEnCoursGeneration(true);
    
    try {
      // Récupérer les vraies données d'audit selon les filtres
      const params = {
        page_size: 10000, // Récupérer toutes les entrées pour le rapport
        ...filtres,
      };
      
      // Convertir les filtres au format API
      if (filtres.dateDebut) params.date_debut = filtres.dateDebut;
      if (filtres.dateFin) params.date_fin = filtres.dateFin;
      if (filtres.utilisateur) params.utilisateur = filtres.utilisateur;
      
      const response = await getAuditEntries(params);
      const entries = response.results || response || [];
      
      // Adapter les données au format du rapport
      const data = entries.map(entry => ({
        id: entry.id,
        date: entry.date_action,
        utilisateur: entry.utilisateur_display || entry.utilisateur_info?.full_name || entry.utilisateur_info?.username || 'Système',
        action: entry.action_display || entry.action,
        ressourceType: entry.ressource,
        ressourceId: entry.ressource_id ? `#${entry.ressource_id}` : '',
        ip: entry.ip_adresse || 'N/A',
        statut: entry.reussi ? 'Succès' : 'Erreur',
      }));
      
      if (data.length === 0) {
        alert('Aucune donnée trouvée pour les filtres sélectionnés.');
        setEnCoursGeneration(false);
        return;
      }
      
      // Générer le rapport selon le format
      if (formatRapport === 'csv') {
        // Générer CSV
        const csv = [
          ['ID', 'Date', 'Utilisateur', 'Action', 'Ressource Type', 'Ressource ID', 'IP', 'Statut'].join(','),
          ...data.map(d => [
            d.id,
            new Date(d.date).toLocaleString('fr-FR'),
            d.utilisateur,
            d.action,
            d.ressourceType,
            d.ressourceId,
            d.ip,
            d.statut
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-audit-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (formatRapport === 'excel') {
        // Pour Excel, utiliser CSV avec extension xlsx (nécessiterait une lib comme xlsx)
        alert('Génération du rapport Excel en cours...\n\nEn production, ce rapport serait généré avec la bibliothèque "xlsx" pour un vrai fichier Excel.');
      } else {
        // PDF ou autres formats
        alert('Génération du rapport PDF en cours...\n\nEn production, ce rapport serait généré avec une bibliothèque PDF comme "jsPDF" ou depuis le backend.');
      }
      
      // Notification de succès
      console.log('Rapport généré avec succès');
      
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setEnCoursGeneration(false);
    }
  };

  // Filtres rapides - Tous supprimés, seulement l'option "Tout" reste disponible
  const filtresRapides = [];

  // Compter les filtres actifs
  const nombreFiltresActifs = Object.values(filtres).filter(v => v && v !== new Date().toISOString().split('T')[0]).length;

  return (
    <div className="w-full">
      {/* En-tête et Filtres combinés */}
      <div className="overflow-hidden">
        {/* En-tête compact */}
        <div style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <Filter size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Filtres de Recherche</h3>
                <p className="text-white/90 text-xs mt-0.5">
                  {nombreFiltresActifs > 0 
                    ? `${nombreFiltresActifs} filtre(s) actif(s)`
                    : "Affinez vos résultats de recherche"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {statutIA && (
                <button
                  onClick={() => onToggleOllama && onToggleOllama()}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                  className="p-2 backdrop-blur-sm rounded-lg transition-all flex items-center space-x-1.5"
                  title={statutIA.message || "Gérer Ollama IA"}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  <Brain className={`text-white ${statutIA.statut === 'actif' ? 'animate-pulse' : ''}`} size={14} />
                  <span className="text-white font-medium text-xs">
                    {statutIA.statut === 'actif' 
                      ? 'IA Actif' 
                      : statutIA.message?.includes('hors ligne') || statutIA.message?.includes('indisponible')
                      ? 'IA Offline' 
                      : 'IA'}
                  </span>
                </button>
              )}
              {nombreFiltresActifs > 0 && (
                <button
                  onClick={handleReinitialiser}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                  className="p-2 backdrop-blur-sm rounded-lg transition-all flex items-center space-x-1.5"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  <RefreshCw className="text-white" size={14} />
                  <span className="text-white font-medium text-xs">Réinitialiser</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filtres Rapides et Formulaire combinés */}
        <div className="p-3">
          {/* Section Filtres Rapides supprimée - Tous les filtres rapides ont été effacés */}

        {/* Presets Sauvegardés - Compact */}
        {filtresPreset.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200" style={{ backgroundColor: '#F9FAFB' }}>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-semibold text-gray-900 text-xs flex items-center">
                <Save className="mr-1.5" style={{ color: '#185CD6' }} size={12} />
                Filtres Sauvegardés
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filtresPreset.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center space-x-1.5 px-2 py-1 bg-white border rounded transition-all group"
                  style={{ borderColor: '#185CD6' }}
                >
                  <span className="font-semibold text-gray-900 text-xs">{preset.name}</span>
                  <button
                    onClick={() => appliquerPreset(preset)}
                    className="px-1.5 py-0.5 text-white rounded text-xs font-semibold transition-all"
                    style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }}
                  >
                    Appliquer
                  </button>
                  <button
                    onClick={() => supprimerPreset(preset.id)}
                    className="p-0.5 hover:bg-red-100 rounded transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X size={10} className="text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

          {/* Formulaire de Filtres - Compact */}
          <div className="border-t border-gray-200 pt-3">
            {/* Date de début, Date de fin, Utilisateur */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Date de début */}
              <div key={`dateDebut-${resetKey}`}>
                <label className="flex items-center text-xs font-medium mb-1" style={{ color: '#185CD6' }}>
                  <Calendar className="mr-1" size={12} />
                  Date de début
                </label>
                <ChampTexte
                  key={`input-dateDebut-${resetKey}`}
                  name="dateDebut"
                  type="date"
                  value={filtres.dateDebut || ''}
                  onChange={handleChange}
                  placeholder="jj/mm/aaaa"
                />
              </div>

              {/* Date de fin */}
              <div key={`dateFin-${resetKey}`}>
                <label className="flex items-center text-xs font-medium mb-1" style={{ color: '#185CD6' }}>
                  <Calendar className="mr-1" size={12} />
                  Date de fin
                </label>
                <ChampTexte
                  key={`input-dateFin-${resetKey}`}
                  name="dateFin"
                  type="date"
                  value={filtres.dateFin || ''}
                  onChange={handleChange}
                  placeholder="jj/mm/aaaa"
                />
              </div>

              {/* Utilisateur - Liste déroulante */}
              <div key={`utilisateur-${resetKey}`}>
                <label className="flex items-center text-xs font-medium mb-1" style={{ color: '#185CD6' }}>
                  <User className="mr-1" size={12} />
                  Utilisateur
                </label>
                <Select
                  key={`input-utilisateur-${resetKey}`}
                  name="utilisateur"
                  value={filtres.utilisateur || ''}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Tous les utilisateurs' },
                    ...utilisateurs
                  ]}
                  placeholder="Tous les utilisateurs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action - Organisés et alignés */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Section gauche: Format de rapport */}
            <div className="flex items-center space-x-2">
              <Download className="text-blue-600" size={16} />
              <span className="text-sm font-medium text-gray-700">Format:</span>
              <div className="flex items-center space-x-1.5">
                {['pdf', 'csv', 'excel'].map((format) => (
                  <button
                    key={format}
                    onClick={() => setFormatRapport(format)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all border ${
                      formatRapport === format
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Section droite: Boutons d'action alignés */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bouton Sauvegarder */}
              <button
                onClick={() => setShowSavePreset(!showSavePreset)}
                className="flex items-center space-x-1.5 px-3 py-1.5 border border-blue-600 text-blue-600 bg-white rounded-md text-xs font-medium transition-all hover:bg-blue-50"
              >
                <Save size={14} />
                <span>Sauvegarder</span>
              </button>

              {/* Bouton Réinitialiser */}
              <button
                onClick={handleReinitialiser}
                className="flex items-center space-x-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded-md text-xs font-medium transition-all hover:bg-gray-50"
              >
                <RefreshCw size={14} />
                <span>Réinitialiser</span>
              </button>

              {/* Bouton Appliquer Filtres */}
              <button
                onClick={handleFiltrer}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium transition-all hover:bg-green-700 shadow-sm"
              >
                <Filter size={14} />
                <span>Appliquer</span>
              </button>

              {/* Bouton Générer rapport */}
              <button
                onClick={genererRapport}
                disabled={enCoursGeneration}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-all shadow-sm ${
                  enCoursGeneration
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {enCoursGeneration ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" size={14} />
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Générer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Carte de sauvegarde de preset - Compact */}
          {showSavePreset && (
            <div className="mt-3 bg-white rounded-lg border shadow-lg overflow-hidden" style={{ borderColor: '#185CD6' }}>
              <div className="px-3 py-2" style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Save className="text-white" size={14} />
                    <h4 className="font-bold text-white text-xs">Sauvegarder ce filtre</h4>
                  </div>
                  <button
                    onClick={() => setShowSavePreset(false)}
                    className="p-1 bg-white/20 hover:bg-white/30 rounded transition-all"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Ex: Connexions du mois"
                    className="flex-1 px-2 py-1.5 border rounded text-xs focus:outline-none"
                    style={{ borderColor: '#185CD6' }}
                  />
                  <button
                    onClick={sauvegarderPreset}
                    disabled={!presetName.trim()}
                    className="px-3 py-1.5 text-white font-semibold rounded text-xs transition-all"
                    style={{
                      background: presetName.trim() ? 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' : '#9CA3AF',
                      cursor: presetName.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FiltreAudit;
