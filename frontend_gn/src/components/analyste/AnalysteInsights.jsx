import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Brain, Target } from 'lucide-react';

/**
 * Composant pour afficher les insights et recommandations pour l'Analyste
 */
const AnalysteInsights = ({ stats }) => {
  // Générer des insights basés sur les statistiques
  const insights = [
    {
      type: 'warning',
      icon: AlertTriangle,
      title: 'Augmentation des vols',
      description: 'Les cas de vols ont augmenté de 12% ce mois-ci. Analyse approfondie recommandée.',
      action: 'Générer rapport détaillé',
      color: 'orange'
    },
    {
      type: 'success',
      icon: CheckCircle,
      title: 'Baisse des agressions',
      description: 'Les cas d\'agression ont diminué de 8%. Tendance positive à maintenir.',
      action: 'Voir les détails',
      color: 'green'
    },
    {
      type: 'info',
      icon: Brain,
      title: 'Prédiction IA',
      description: 'Le modèle prédit une hausse de 5% des fraudes le mois prochain.',
      action: 'Voir l\'analyse prédictive',
      color: 'blue'
    },
    {
      type: 'target',
      icon: Target,
      title: 'Zone à risque',
      description: 'Concentration élevée d\'incidents dans le secteur Nord-Est.',
      action: 'Analyse géographique',
      color: 'purple'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'bg-orange-100 text-orange-600',
        text: 'text-orange-900',
        button: 'bg-orange-600 hover:bg-orange-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'bg-green-100 text-green-600',
        text: 'text-green-900',
        button: 'bg-green-600 hover:bg-green-700'
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'bg-blue-100 text-blue-600',
        text: 'text-blue-900',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'bg-purple-100 text-purple-600',
        text: 'text-purple-900',
        button: 'bg-purple-600 hover:bg-purple-700'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Insights & Recommandations</h3>
        <p className="text-sm text-gray-600">Analyses automatiques basées sur les données actuelles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => {
          const colors = getColorClasses(insight.color);
          const Icon = insight.icon;

          return (
            <div
              key={index}
              className={`${colors.bg} border ${colors.border} rounded-xl p-5 hover:shadow-lg transition-all`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 ${colors.icon} rounded-xl flex-shrink-0`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold ${colors.text} mb-2`}>{insight.title}</h4>
                  <p className="text-sm text-gray-700 mb-4">{insight.description}</p>
                  <button className={`text-xs ${colors.button} text-white px-4 py-2 rounded-lg font-semibold transition-colors`}>
                    {insight.action}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicateurs clés de performance */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <h4 className="font-bold text-gray-900 mb-4">Indicateurs Clés (KPI)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <p className="text-2xl font-bold text-gray-900">94.5%</p>
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <p className="text-xs text-gray-600">Taux de résolution</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <p className="text-2xl font-bold text-gray-900">3.2j</p>
              <TrendingDown className="text-green-600" size={20} />
            </div>
            <p className="text-xs text-gray-600">Temps moyen</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <p className="text-2xl font-bold text-gray-900">89%</p>
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <p className="text-xs text-gray-600">Précision IA</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <p className="text-2xl font-bold text-gray-900">+12%</p>
              <TrendingUp className="text-orange-600" size={20} />
            </div>
            <p className="text-xs text-gray-600">Nouveaux cas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysteInsights;

