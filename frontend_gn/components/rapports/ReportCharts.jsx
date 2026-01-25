import React, { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Activity } from 'lucide-react';

const ReportCharts = ({ data = {} }) => {
  const [graphiqueActif, setGraphiqueActif] = useState('barres');

  // Données exemple pour les graphiques
  const {
    infractionsPar Type = [
      { type: 'Vol', nombre: 45, couleur: '#3b82f6' },
      { type: 'Meurtre', nombre: 12, couleur: '#ef4444' },
      { type: 'Fraude', nombre: 28, couleur: '#f59e0b' },
      { type: 'Cybercrime', nombre: 35, couleur: '#8b5cf6' },
      { type: 'Trafic', nombre: 18, couleur: '#10b981' },
    ],
    repartitionRegions = [
      { nom: 'Antananarivo', count: 65, pourcentage: 35, couleur: '#3b82f6' },
      { nom: 'Toamasina', count: 48, pourcentage: 26, couleur: '#ef4444' },
      { nom: 'Antsirabe', count: 38, pourcentage: 20, couleur: '#f59e0b' },
      { nom: 'Mahajanga', count: 22, pourcentage: 12, couleur: '#10b981' },
      { nom: 'Batna', count: 13, pourcentage: 7, couleur: '#8b5cf6' },
    ],
    evolutionMensuelle = [
      { mois: 'Jan', valeur: 32 },
      { mois: 'Fév', valeur: 45 },
      { mois: 'Mar', valeur: 38 },
      { mois: 'Avr', valeur: 52 },
      { mois: 'Mai', valeur: 48 },
      { mois: 'Juin', valeur: 61 },
    ],
  } = data;

  const graphiques = [
    { id: 'barres', label: 'Infractions par type', icon: BarChart3 },
    { id: 'camembert', label: 'Répartition par région', icon: PieChart },
    { id: 'ligne', label: 'Évolution mensuelle', icon: TrendingUp },
  ];

  const maxValeur = Math.max(...infractionsPar Type.map(i => i.nombre), 0);
  const maxEvolution = Math.max(...evolutionMensuelle.map(e => e.valeur), 0);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 p-5">
        <div className="flex items-center">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl mr-4">
            <Activity className="text-white" size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Graphiques Interactifs</h3>
            <p className="text-pink-100 mt-1">Visualisez vos données en temps réel</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
        <div className="flex space-x-2 p-4">
          {graphiques.map((graph) => {
            const Icone = graph.icon;
            return (
              <button
                key={graph.id}
                onClick={() => setGraphiqueActif(graph.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                  graphiqueActif === graph.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:scale-102 shadow-md'
                }`}
              >
                <Icone size={18} />
                <span>{graph.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu des graphiques */}
      <div className="p-8 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30">
        {/* Diagramme à barres */}
        {graphiqueActif === 'barres' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-gray-900">Infractions par type</h4>
              <div className="text-sm text-gray-600">
                Total: <span className="font-bold text-gray-900">{infractionsPar Type.reduce((sum, i) => sum + i.nombre, 0)}</span>
              </div>
            </div>
            
            {infractionsPar Type.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700 flex items-center">
                    <span 
                      className="w-4 h-4 rounded mr-2" 
                      style={{ backgroundColor: item.couleur }}
                    ></span>
                    {item.type}
                  </span>
                  <span className="text-lg font-black" style={{ color: item.couleur }}>
                    {item.nombre}
                  </span>
                </div>
                <div className="relative h-12 bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                  <div
                    className="h-full flex items-center justify-end px-4 transition-all duration-1000 shadow-lg"
                    style={{
                      width: `${(item.nombre / maxValeur) * 100}%`,
                      background: `linear-gradient(to right, ${item.couleur}, ${item.couleur}dd)`,
                    }}
                  >
                    <span className="text-white font-black text-sm">
                      {Math.round((item.nombre / maxValeur) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Camembert */}
        {graphiqueActif === 'camembert' && (
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-gray-900 mb-6">Répartition géographique</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cercle visuel simplifié */}
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {repartitionRegions.map((region, index) => {
                    const total = repartitionRegions.reduce((sum, r) => sum + r.count, 0);
                    const angle = (region.count / total) * 360;
                    
                    return (
                      <div
                        key={index}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ transform: `rotate(${index * 72}deg)` }}
                      >
                        <div
                          className="w-full h-full rounded-full border-8 transition-all hover:scale-110"
                          style={{
                            borderColor: region.couleur,
                            clipPath: `polygon(50% 50%, 100% 0%, 100% ${angle}%)`,
                          }}
                        ></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Légende */}
              <div className="space-y-4">
                {repartitionRegions.map((region, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 border-2 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    style={{ borderColor: region.couleur }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded-lg shadow-md"
                          style={{ backgroundColor: region.couleur }}
                        ></div>
                        <span className="font-bold text-gray-900">{region.nom}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black" style={{ color: region.couleur }}>
                          {region.count}
                        </div>
                        <div className="text-xs text-gray-500 font-semibold">
                          {region.pourcentage}% du total
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Graphique linéaire */}
        {graphiqueActif === 'ligne' && (
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-gray-900 mb-6">Évolution mensuelle des infractions</h4>
            
            <div className="relative h-80 bg-gradient-to-t from-blue-50 to-white rounded-xl p-6 border-2 border-blue-200">
              {/* Grille */}
              <div className="absolute inset-6 grid grid-rows-5 border-l-2 border-b-2 border-gray-300">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-t border-gray-200"></div>
                ))}
              </div>

              {/* Ligne et points */}
              <div className="relative h-full flex items-end justify-around px-4">
                {evolutionMensuelle.map((point, index) => {
                  const hauteur = (point.valeur / maxEvolution) * 100;
                  
                  return (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <div
                        className="relative w-16 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-xl transition-all duration-1000 hover:scale-105 shadow-lg group"
                        style={{ height: `${hauteur}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                          {point.valeur}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{point.mois}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-300 text-center">
                <p className="text-xs text-gray-600 font-semibold">Maximum</p>
                <p className="text-2xl font-black text-blue-600">{maxEvolution}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-300 text-center">
                <p className="text-xs text-gray-600 font-semibold">Moyenne</p>
                <p className="text-2xl font-black text-green-600">
                  {Math.round(evolutionMensuelle.reduce((sum, e) => sum + e.valeur, 0) / evolutionMensuelle.length)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-300 text-center">
                <p className="text-xs text-gray-600 font-semibold">Total</p>
                <p className="text-2xl font-black text-purple-600">
                  {evolutionMensuelle.reduce((sum, e) => sum + e.valeur, 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportCharts;

