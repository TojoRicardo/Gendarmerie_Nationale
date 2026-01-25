import React, { useState } from 'react';
import { 
  FileText, Database, TrendingUp, CheckCircle, RefreshCw, Download, 
  Calendar, BarChart3, Brain, AlertCircle, FileDown, FileSpreadsheet, 
  FileType, FileCode, Eye, EyeOff, Activity, Users, Shield, AlertTriangle,
  Clock, MapPin, PieChart as PieChartIcon, LineChart as LineChartIcon, Loader2
} from 'lucide-react';
import {
  LineChart as RechartsLine, Line, PieChart as RechartsPie, Pie, Cell,
  ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, CartesianGrid, Area, ComposedChart
} from 'recharts';
import reportService from '../../src/services/reportService';

const DonneesReellesRapports = () => {
  const [statistiques, setStatistiques] = useState(null);
  const [chargementStatistiques, setChargementStatistiques] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [afficherJsonBrut, setAfficherJsonBrut] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  
  // Dates pour les statistiques
  const [dateDebut, setDateDebut] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dateFin, setDateFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const chargerStatistiques = async () => {
    if (!dateDebut || !dateFin) {
      setErreur('Veuillez sélectionner les dates');
      return;
    }

    setChargementStatistiques(true);
    setErreur(null);
    try {
      const response = await reportService.getStatistiques(dateDebut, dateFin, 'resume_mensuel');
      if (response && response.success) {
        setStatistiques(response);
        setErreur(null); // Effacer les erreurs précédentes en cas de succès
      } else {
        setStatistiques(null);
        // Afficher un message d'erreur plus clair
        const messageErreur = response?.erreur || response?.details || 'Aucune statistique disponible pour cette période';
        setErreur(messageErreur);
      }
    } catch (error) {
      // Ne logger que si ce n'est pas une erreur réseau normale ou timeout
      if (
        error.code !== 'ERR_NETWORK' && 
        error.code !== 'ERR_CONNECTION_REFUSED' &&
        error.code !== 'ECONNABORTED' &&
        !error.message?.includes('timeout')
      ) {
        console.error('Erreur chargement statistiques:', error);
      }
      const messageErreur = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
        ? 'Le calcul des statistiques prend plus de temps que prévu. Veuillez réessayer ou réduire la période sélectionnée.'
        : (error.response?.data?.details || error.response?.data?.erreur || error.message || 'Erreur lors du chargement des statistiques');
      setErreur(messageErreur);
      setStatistiques(null);
    } finally {
      setChargementStatistiques(false);
    }
  };

  const formaterDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const telechargerRapport = async (rapportId, titre) => {
    try {
      const response = await reportService.telechargerRapport(rapportId);
      const contentType = response.headers?.['content-type'] || '';
      const blob = new Blob([response.data], { type: contentType || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titre}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      setErreur('Erreur lors du téléchargement du rapport. Nouvelle tentative...');
    }
  };

  const telechargerRapportSafe = async (rapport) => {
    try {
      await telechargerRapport(rapport.id, rapport.titre);
    } catch (e1) {
      try {
        // Fallback 1: ouvrir l'URL directe de téléchargement si disponible
        if (rapport.download_url) {
          window.open(rapport.download_url, '_blank', 'noopener');
          return;
        }
        // Fallback 2: ouvrir l'URL du fichier statique si fournie
        if (rapport.fichier) {
          window.open(rapport.fichier, '_blank', 'noopener');
          return;
        }
        setErreur('Téléchargement impossible: lien non disponible');
      } catch (e2) {
        console.error('Erreur téléchargement (fallback):', e2);
        setErreur('Erreur lors du téléchargement du rapport');
      }
    }
  };

  // Fonction pour exporter les statistiques dans différents formats
  const exporterStatistiques = async (format) => {
    if (!statistiques) {
      setErreur('Aucune statistique à exporter');
      return;
    }

    setExportEnCours(true);
    try {
      const data = {
        type_rapport: 'resume_mensuel',
        format: format,
        date_debut: dateDebut,
        date_fin: dateFin,
        filtres: {},
        options_inclusion: {
          includeGraphiques: true,
          includeStatistiques: true,
          includeDetails: false,
        }
      };

      const response = await reportService.genererRapport(data);
      if (response.success && response.rapport) {
        await telechargerRapportSafe(response.rapport);
      } else {
        setErreur(response?.erreur || 'Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Erreur export:', error);
      setErreur('Erreur lors de l\'export des statistiques');
    } finally {
      setExportEnCours(false);
    }
  };

  // Extraire les statistiques principales depuis les données
  const extraireStatistiquesPrincipales = () => {
    if (!statistiques || !statistiques.donnees) return null;

    const donnees = statistiques.donnees;
    const stats = {};

    // Total des fiches
    if (donnees.statistiques?.total_fiches !== undefined) {
      stats.totalFiches = donnees.statistiques.total_fiches;
    } else if (donnees.global?.total_fiches !== undefined) {
      stats.totalFiches = donnees.global.total_fiches;
    } else if (donnees.total !== undefined) {
      stats.totalFiches = donnees.total;
    }

    // Taux de clôture
    if (donnees.statistiques?.taux_cloture !== undefined) {
      stats.tauxCloture = donnees.statistiques.taux_cloture;
    } else if (donnees.global?.taux_cloture !== undefined) {
      stats.tauxCloture = donnees.global.taux_cloture;
    } else if (donnees.statistiques?.resolus && donnees.statistiques?.total) {
      stats.tauxCloture = (donnees.statistiques.resolus / donnees.statistiques.total) * 100;
    }

    // Danger moyen
    if (donnees.statistiques?.danger_moyen !== undefined) {
      stats.dangerMoyen = donnees.statistiques.danger_moyen;
    } else if (donnees.global?.danger_moyen !== undefined) {
      stats.dangerMoyen = donnees.global.danger_moyen;
    }

    // Fiches en cours
    if (donnees.statistiques?.en_cours !== undefined) {
      stats.enCours = donnees.statistiques.en_cours;
    } else if (donnees.global?.en_cours !== undefined) {
      stats.enCours = donnees.global.en_cours;
    }

    // Fiches résolues
    if (donnees.statistiques?.resolus !== undefined) {
      stats.resolus = donnees.statistiques.resolus;
    } else if (donnees.global?.resolus !== undefined) {
      stats.resolus = donnees.global.resolus;
    }

    // Fiches critiques
    if (donnees.statistiques?.critiques !== undefined) {
      stats.critiques = donnees.statistiques.critiques;
    } else if (donnees.global?.critiques !== undefined) {
      stats.critiques = donnees.global.critiques;
    }

    return stats;
  };

  // Extraire les données pour le graphique d'évolution
  const extraireDonneesEvolution = () => {
    if (!statistiques || !statistiques.donnees) return [];

    const donnees = statistiques.donnees;
    
    // Chercher les données d'évolution dans différentes structures possibles
    if (donnees.evolution && Array.isArray(donnees.evolution)) {
      return donnees.evolution.map(item => ({
        periode: item.mois || item.periode || item.month || '',
        valeur: item.total || item.cas || item.valeur || item.count || 0
      }));
    }
    
    if (donnees.monthly && Array.isArray(donnees.monthly)) {
      return donnees.monthly.map(item => ({
        periode: item.mois || item.month || item.periode || '',
        valeur: item.total || item.cas || item.count || 0
      }));
    }

    if (donnees.statistiques?.evolution && Array.isArray(donnees.statistiques.evolution)) {
      return donnees.statistiques.evolution.map(item => ({
        periode: item.mois || item.periode || item.month || '',
        valeur: item.total || item.cas || item.valeur || item.count || 0
      }));
    }

    return [];
  };

  // Extraire les données pour le graphique de répartition
  const extraireDonneesRepartition = () => {
    if (!statistiques || !statistiques.donnees) return [];

    const donnees = statistiques.donnees;
    const statsPrincipales = extraireStatistiquesPrincipales();
    
    if (!statsPrincipales) return [];

    const repartition = [];

    // Taux de clôture
    if (statsPrincipales.tauxCloture !== undefined) {
      repartition.push({
        name: 'Taux de clôture',
        value: statsPrincipales.tauxCloture,
        color: '#8B5CF6'
      });
    }

    // Total des fiches
    if (statsPrincipales.totalFiches) {
      repartition.push({
        name: 'Total des fiches',
        value: statsPrincipales.totalFiches,
        color: '#EC4899'
      });
    }

    // Fiches en cours
    if (statsPrincipales.enCours) {
      repartition.push({
        name: 'Fiches ouvertes',
        value: statsPrincipales.enCours,
        color: '#10B981'
      });
    }

    // Fiches résolues
    if (statsPrincipales.resolus) {
      repartition.push({
        name: 'Fiches clôturées',
        value: statsPrincipales.resolus,
        color: '#10B981'
      });
    }

    // Si on a des données de répartition géographique
    if (donnees.geographic && Array.isArray(donnees.geographic)) {
      const colors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
      donnees.geographic.slice(0, 6).forEach((item, index) => {
        repartition.push({
          name: item.ville || item.city || item.location || 'Autre',
          value: item.cas || item.cases || item.count || 0,
          color: colors[index % colors.length]
        });
      });
    }

    return repartition.filter(item => item.value > 0);
  };

  // Tooltip personnalisé pour les graphiques
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" style={{ fontFamily: 'Inter, sans-serif' }}>
          <p className="text-gray-900 font-semibold mb-2 text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-gray-900 font-bold text-lg" style={{ color: entry.color }}>
              {entry.value} {entry.name || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div style={{ background: 'linear-gradient(135deg, #185CD6 0%, #1348A8 100%)' }} className="p-5">
          <div className="flex items-center">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl mr-3">
              <Database className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Données Réelles depuis la Base de Données</h3>
              <p className="text-white/90 text-sm mt-0.5">Visualisez les rapports générés, statistiques et fonctionnalités IA</p>
            </div>
          </div>
        </div>
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {erreur}
        </div>
      )}

      {/* Section Statistiques et IA - Interface Professionnelle */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* En-tête avec boutons d'export */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <div className="p-2 bg-[#185CD6] rounded-lg mr-3">
                <BarChart3 className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">Statistiques en Temps Réel</h4>
                <p className="text-sm text-gray-600">Données depuis la base de données</p>
              </div>
            </div>
            
            {/* Boutons d'export */}
            {statistiques && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => exporterStatistiques('pdf')}
                  disabled={exportEnCours}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  title="Exporter en PDF"
                >
                  <FileDown size={16} />
                  PDF
                </button>
                <button
                  onClick={() => exporterStatistiques('excel')}
                  disabled={exportEnCours}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  title="Exporter en Excel"
                >
                  <FileSpreadsheet size={16} />
                  Excel
                </button>
                <button
                  onClick={() => exporterStatistiques('word')}
                  disabled={exportEnCours}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  title="Exporter en Word"
                >
                  <FileType size={16} />
                  Word
                </button>
                <button
                  onClick={() => exporterStatistiques('csv')}
                  disabled={exportEnCours}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  title="Exporter en CSV"
                >
                  <FileCode size={16} />
                  CSV
                </button>
                <button
                  onClick={() => setAfficherJsonBrut(!afficherJsonBrut)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  title="Afficher le JSON brut"
                >
                  {afficherJsonBrut ? <EyeOff size={16} /> : <Eye size={16} />}
                  {afficherJsonBrut ? 'Masquer JSON' : 'JSON'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          {/* Sélection de dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#185CD6] focus:border-[#185CD6]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#185CD6] focus:border-[#185CD6]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={chargerStatistiques}
                disabled={chargementStatistiques || !dateDebut || !dateFin}
                className="w-full px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center"
                style={{
                  backgroundColor: chargementStatistiques || !dateDebut || !dateFin ? '#9CA3AF' : '#185CD6',
                  color: 'white',
                  cursor: chargementStatistiques || !dateDebut || !dateFin ? 'not-allowed' : 'pointer'
                }}
              >
                {chargementStatistiques ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} className="mr-2" />
                    Charger les statistiques
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Affichage des statistiques */}
          {statistiques && (
            <div className="space-y-6">
              {/* Cartes de métriques principales */}
              {(() => {
                const statsPrincipales = extraireStatistiquesPrincipales();
                if (!statsPrincipales) return null;

                const metriques = [
                  {
                    label: 'Total des fiches',
                    valeur: statsPrincipales.totalFiches || 0,
                    icone: FileText,
                    couleur: 'blue',
                    bgGradient: 'from-blue-500 to-blue-600',
                    borderColor: 'border-blue-200'
                  },
                  {
                    label: 'Taux de clôture',
                    valeur: statsPrincipales.tauxCloture ? `${statsPrincipales.tauxCloture.toFixed(1)}%` : 'N/A',
                    icone: CheckCircle,
                    couleur: 'green',
                    bgGradient: 'from-green-500 to-green-600',
                    borderColor: 'border-green-200'
                  },
                  {
                    label: 'Fiches en cours',
                    valeur: statsPrincipales.enCours || 0,
                    icone: Clock,
                    couleur: 'orange',
                    bgGradient: 'from-orange-500 to-orange-600',
                    borderColor: 'border-orange-200'
                  },
                  {
                    label: 'Fiches résolues',
                    valeur: statsPrincipales.resolus || 0,
                    icone: CheckCircle,
                    couleur: 'green',
                    bgGradient: 'from-green-500 to-green-600',
                    borderColor: 'border-green-200'
                  },
                  {
                    label: 'Danger moyen',
                    valeur: statsPrincipales.dangerMoyen ? `${statsPrincipales.dangerMoyen.toFixed(1)}/10` : 'N/A',
                    icone: AlertTriangle,
                    couleur: 'red',
                    bgGradient: 'from-red-500 to-red-600',
                    borderColor: 'border-red-200'
                  },
                  {
                    label: 'Fiches critiques',
                    valeur: statsPrincipales.critiques || 0,
                    icone: AlertTriangle,
                    couleur: 'red',
                    bgGradient: 'from-red-500 to-red-600',
                    borderColor: 'border-red-200'
                  }
                ].filter(m => m.valeur !== 'N/A' && m.valeur !== 0);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metriques.map((metrique, index) => {
                      const Icone = metrique.icone;
                      return (
                        <div
                          key={index}
                          className={`bg-white rounded-xl shadow-lg border-2 ${metrique.borderColor} p-6 hover:shadow-xl transition-all`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 bg-gradient-to-br ${metrique.bgGradient} rounded-lg shadow-md`}>
                              <Icone className="text-white" size={24} />
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold text-gray-900">{metrique.valeur}</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-600">{metrique.label}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Section Graphiques - Interactifs */}
              {(() => {
                const donneesEvolution = extraireDonneesEvolution();
                const donneesRepartition = extraireDonneesRepartition();
                const hasGraphiques = donneesEvolution.length > 0 || donneesRepartition.length > 0;

                if (!hasGraphiques) return null;

                return (
                  <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-purple-600 rounded-lg mr-3">
                        <BarChart3 className="text-white" size={20} />
                      </div>
                      <h5 className="font-bold text-gray-900 text-lg">Graphiques</h5>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Graphique d'évolution (courbe) */}
                      {donneesEvolution.length > 0 && (
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-md">
                          <div className="flex items-center mb-4">
                            <LineChartIcon className="text-blue-600 mr-2" size={18} />
                            <h6 className="font-bold text-gray-900">Évolution</h6>
                          </div>
                          <div className="bg-white rounded-lg">
                            <h6 className="text-sm font-semibold text-gray-700 mb-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Évolution Temporelle
                            </h6>
                            <ResponsiveContainer width="100%" height={300}>
                              <ComposedChart data={donneesEvolution}>
                                <defs>
                                  <linearGradient id="lineShadow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.15} />
                                    <stop offset="50%" stopColor="#1E40AF" stopOpacity={0.08} />
                                    <stop offset="100%" stopColor="#1E40AF" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area
                                  type="monotone"
                                  dataKey="valeur"
                                  stroke="none"
                                  fill="url(#lineShadow)"
                                  fillOpacity={1}
                                />
                                <CartesianGrid strokeDasharray="3 3" stroke="#DADBDD" opacity={0.8} vertical={false} />
                                <XAxis 
                                  dataKey="periode" 
                                  stroke="#E5E7EB"
                                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                                  axisLine={{ stroke: '#E5E7EB' }}
                                  tickLine={{ stroke: '#E5E7EB' }}
                                />
                                <YAxis 
                                  stroke="#E5E7EB"
                                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                                  axisLine={{ stroke: '#E5E7EB' }}
                                  tickLine={{ stroke: '#E5E7EB' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line 
                                  type="monotone" 
                                  dataKey="valeur" 
                                  stroke="#1E40AF"
                                  strokeWidth={3}
                                  dot={{ 
                                    r: 5, 
                                    fill: '#2563EB', 
                                    stroke: '#1E40AF', 
                                    strokeWidth: 2,
                                    style: { filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))' }
                                  }}
                                  activeDot={{ 
                                    r: 8, 
                                    fill: '#2563EB', 
                                    stroke: '#1E40AF', 
                                    strokeWidth: 3,
                                    style: { 
                                      filter: 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.5))',
                                      transition: 'all 0.2s ease'
                                    }
                                  }}
                                  animationDuration={1500}
                                  name="Nombre de cas"
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Graphique de répartition (camembert) */}
                      {donneesRepartition.length > 0 && (
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-md">
                          <div className="flex items-center mb-4">
                            <PieChartIcon className="text-purple-600 mr-2" size={18} />
                            <h6 className="font-bold text-gray-900">Répartition</h6>
                          </div>
                          <div className="bg-white rounded-lg">
                            <h6 className="text-sm font-semibold text-gray-700 mb-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Répartition
                            </h6>
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartsPie>
                                <Pie
                                  data={donneesRepartition}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {donneesRepartition.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                  wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                                />
                              </RechartsPie>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Graphiques statiques depuis le backend (si disponibles) */}
                      {statistiques.graphiques && Object.keys(statistiques.graphiques).length > 0 && (
                        Object.entries(statistiques.graphiques).map(([key, url]) => (
                          <div key={key} className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                              <p className="text-sm font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="bg-white p-4">
                              <img src={url} alt={key} className="w-full h-auto rounded-lg" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Section Analyse IA */}
              {statistiques.analyse_ia && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-green-600 rounded-lg mr-3">
                      <Brain className="text-white" size={20} />
                    </div>
                    <h5 className="font-bold text-gray-900 text-lg">Analyse IA</h5>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center mb-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="text-green-600 mr-2" size={18} />
                      <span className="font-semibold text-green-800">Analyse IA activée et fonctionnelle</span>
                    </div>
                    {afficherJsonBrut ? (
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(statistiques.analyse_ia, null, 2)}
                      </pre>
                    ) : (
                      <div className="space-y-2">
                        {statistiques.analyse_ia.diagnostic?.insights && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">Insights:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                              {statistiques.analyse_ia.diagnostic.insights.slice(0, 5).map((insight, i) => (
                                <li key={i}>{insight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {statistiques.analyse_ia.descriptive && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold">Total:</span> {statistiques.analyse_ia.descriptive.total || 0} enregistrements | 
                              <span className="font-semibold ml-2">Tendance:</span> {statistiques.analyse_ia.descriptive.tendance || 'stable'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section Données brutes */}
              {statistiques.donnees && (
                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-600 rounded-lg mr-3">
                        <Database className="text-white" size={20} />
                      </div>
                      <h5 className="font-bold text-gray-900 text-lg">Données Brutes</h5>
                    </div>
                    <button
                      onClick={() => setAfficherJsonBrut(!afficherJsonBrut)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    >
                      {afficherJsonBrut ? <EyeOff size={16} /> : <Eye size={16} />}
                      {afficherJsonBrut ? 'Masquer' : 'Afficher'} JSON
                    </button>
                  </div>
                  {afficherJsonBrut && (
                    <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto border border-gray-200">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {JSON.stringify(statistiques.donnees, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Section Métadonnées */}
              {statistiques.metadonnees && (
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl shadow-lg border-2 border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-gray-600 rounded-lg mr-3">
                      <Calendar className="text-white" size={20} />
                    </div>
                    <h5 className="font-bold text-gray-900 text-lg">Métadonnées</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Date de début</p>
                      <p className="text-sm font-medium text-gray-900">{statistiques.metadonnees.date_debut}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Date de fin</p>
                      <p className="text-sm font-medium text-gray-900">{statistiques.metadonnees.date_fin}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Type de rapport</p>
                      <p className="text-sm font-medium text-gray-900">{statistiques.metadonnees.type_rapport}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Généré le</p>
                      <p className="text-sm font-medium text-gray-900">{formaterDate(statistiques.metadonnees.date_generation)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!statistiques && !chargementStatistiques && (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600 mb-2">Aucune statistique chargée</p>
              <p className="text-sm text-gray-500">Sélectionnez une période et cliquez sur "Charger les statistiques" pour voir les données</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonneesReellesRapports;

