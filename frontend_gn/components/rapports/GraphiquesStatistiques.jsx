import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const GraphiquesStatistiques = ({ dateDebut, dateFin }) => {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [graphiqueActif, setGraphiqueActif] = useState('infractions');

  useEffect(() => {
    chargerStatistiques();
  }, [dateDebut, dateFin]);

  const chargerStatistiques = async () => {
    setChargement(true);
    try {
      const params = new URLSearchParams();
      if (dateDebut) params.append('dateDebut', dateDebut);
      if (dateFin) params.append('dateFin', dateFin);

      const response = await fetch(`/api/rapports/statistiques?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDonnees(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setChargement(false);
    }
  };

  const exporterGraphique = async (type) => {
    try {
      const response = await fetch(`/api/rapports/exporter-graphique/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ dateDebut, dateFin }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graphique_${type}_${Date.now()}.png`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  if (chargement) {
    return <SpinnerChargement texte="Chargement des statistiques..." />;
  }

  if (!donnees) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <BarChart3 className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques globales - Premium */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Total Fiches</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {donnees.totalFiches || 0}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp size={12} className="text-green-600 mr-1" />
                <p className="text-xs font-bold text-green-600">
                  +{donnees.evolutionFiches || 0}% ce mois
                </p>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <BarChart3 className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-red-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Infractions</p>
              <p className="text-2xl font-black text-red-600 mt-1">
                {donnees.totalInfractions || 0}
              </p>
              <p className="text-xs font-bold text-red-600 mt-2">
                {donnees.evolutionInfractions || 0}% vs période précédente
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
              <PieChart className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Taux de résolution</p>
              <p className="text-2xl font-black text-green-600 mt-1">
                {donnees.tauxResolution || 0}%
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp size={12} className="text-green-600 mr-1" />
                <p className="text-xs font-bold text-green-600">
                  +{donnees.evolutionResolution || 0}%
                </p>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
              <TrendingUp className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Suspects identifiés</p>
              <p className="text-2xl font-black text-purple-600 mt-1">
                {donnees.totalSuspects || 0}
              </p>
              <p className="text-xs font-bold text-purple-600 mt-2">
                {donnees.nouveauxSuspects || 0} nouveaux
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
              <BarChart3 className="text-white" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques détaillés - Premium */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white">Graphiques Détaillés</h3>
              <p className="text-indigo-100 mt-1 flex items-center">
                <Calendar size={14} className="mr-2" />
                Période: {dateDebut} - {dateFin}
              </p>
            </div>
            <button
              onClick={() => exporterGraphique(graphiqueActif)}
              className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all shadow-lg hover:scale-105 flex items-center space-x-2"
            >
              <Download className="text-white" size={18} />
              <span className="text-white font-semibold text-sm">Exporter</span>
            </button>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-gray-50 to-white">

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setGraphiqueActif('infractions')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                graphiqueActif === 'infractions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Infractions par type
            </button>
            <button
              onClick={() => setGraphiqueActif('evolution')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                graphiqueActif === 'evolution'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Évolution temporelle
            </button>
            <button
              onClick={() => setGraphiqueActif('geographique')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                graphiqueActif === 'geographique'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Répartition géographique
            </button>
          </nav>
        </div>

        {/* Contenu des graphiques (simulations) */}
        <div className="h-96">
          {graphiqueActif === 'infractions' && donnees.infractionsPar Type && (
            <div className="space-y-3">
              {donnees.infractionsPar Type.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-32 text-sm text-gray-700">{item.type}</div>
                  <div className="flex-1 flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-blue-600 h-8 rounded-full flex items-center justify-end px-3"
                        style={{ width: `${(item.count / donnees.totalInfractions) * 100}%` }}
                      >
                        <span className="text-white font-medium text-sm">{item.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {graphiqueActif === 'evolution' && (
            <div className="text-center py-20 text-gray-500">
              Graphique d'évolution temporelle (intégration Chart.js recommandée)
            </div>
          )}

          {graphiqueActif === 'geographique' && donnees.repartitionGeographique && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {donnees.repartitionGeographique.map((region, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">{region.nom}</h4>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {region.count}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((region.count / donnees.totalFiches) * 100)}% du total
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default GraphiquesStatistiques;

