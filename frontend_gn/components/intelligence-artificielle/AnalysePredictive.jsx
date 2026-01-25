import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Target, Clock, CheckCircle } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const AnalysePredictive = ({ ficheId, suspectId }) => {
  const [predictions, setPredictions] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  console.log(' AnalysePredictive rendu, ficheId:', ficheId);

  const lancerAnalyse = async () => {
    setChargement(true);
    setErreur('');

    try {
      // MODE DÉVELOPPEMENT - Simulation de l'API
      // En production, remplacer par un vrai appel API
      const useMockData = true; // Changez à false quand le backend sera prêt

      if (useMockData) {
        // Simuler un délai de traitement
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Données de démonstration
        const mockData = {
          scoreGlobal: 0.65, // Score entre 0 et 1
          predictions: [
            {
              type: 'Récidive dans les 6 mois',
              description: 'Probabilité de commettre une nouvelle infraction dans les 6 prochains mois',
              probabilite: 0.72,
              facteurs: ['Antécédents multiples', 'Contexte socio-économique', 'Pas de suivi']
            },
            {
              type: 'Récidive dans l\'année',
              description: 'Probabilité de commettre une nouvelle infraction dans l\'année',
              probabilite: 0.58,
              facteurs: ['Historique récent', 'Zone à risque', 'Manque d\'encadrement']
            },
            {
              type: 'Infraction similaire',
              description: 'Probabilité de commettre le même type d\'infraction',
              probabilite: 0.45,
              facteurs: ['Pattern comportemental', 'Spécialisation observée']
            }
          ],
          facteursRisque: [
            {
              titre: 'Antécédents criminels multiples',
              description: 'Le suspect a un historique de 5 infractions sur les 3 dernières années',
              impact: 0.85
            },
            {
              titre: 'Contexte socio-économique',
              description: 'Situation précaire augmentant les risques de récidive',
              impact: 0.62
            },
            {
              titre: 'Absence de suivi',
              description: 'Aucun programme de réinsertion ou de suivi actuellement en place',
              impact: 0.58
            },
            {
              titre: 'Zone géographique',
              description: 'Résidence dans une zone à forte criminalité',
              impact: 0.42
            }
          ],
          recommandations: [
            {
              titre: 'Mise en place d\'un suivi régulier',
              description: 'Surveillance hebdomadaire pendant 6 mois minimum avec un officier référent'
            },
            {
              titre: 'Programme de réinsertion',
              description: 'Inscription dans un programme d\'aide à l\'emploi et d\'accompagnement social'
            },
            {
              titre: 'Signalement aux services sociaux',
              description: 'Coordination avec les services sociaux pour un suivi global'
            },
            {
              titre: 'Alerte automatique',
              description: 'Mise en place d\'alertes sur les nouvelles activités suspectes dans le secteur'
            }
          ],
          dateAnalyse: new Date().toISOString(),
          modeleUtilise: 'Random Forest v2.3',
          confianceModele: 0.87
        };

        setPredictions(mockData);
      } else {
        // Code pour appel API réel
      const params = new URLSearchParams();
      if (ficheId) params.append('ficheId', ficheId);
      if (suspectId) params.append('suspectId', suspectId);

      const response = await fetch(`/api/ia/analyse-predictive?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data);
      } else {
        setErreur('Erreur lors de l\'analyse prédictive');
        }
      }
    } catch (error) {
      setErreur(error.message || 'Erreur lors de l\'analyse');
    } finally {
      setChargement(false);
    }
  };

  const getRisqueClasses = (niveau) => {
    if (niveau >= 0.7) return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      barColor: 'bg-red-500',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
      label: 'Élevé'
    };
    if (niveau >= 0.4) return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      barColor: 'bg-yellow-500',
      badgeBg: 'bg-yellow-100',
      badgeText: 'text-yellow-800',
      label: 'Moyen'
    };
    return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      barColor: 'bg-green-500',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800',
      label: 'Faible'
    };
  };

  return (
    <div className="space-y-6">
      {/* Bouton d'action et messages */}
      {!predictions && (
        <div className="card-pro p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 font-medium">
                Lancez une analyse prédictive pour évaluer les risques de récidive et obtenir des recommandations basées sur l'IA.
              </p>
            </div>
            <Bouton
              variant="primary"
              onClick={lancerAnalyse}
              chargement={chargement}
            >
              Lancer l'analyse
            </Bouton>
          </div>

          {erreur && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg flex items-center">
              <AlertTriangle className="mr-2 flex-shrink-0" size={20} />
              {erreur}
            </div>
          )}
        </div>
      )}

      {chargement && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <SpinnerChargement texte="Analyse en cours..." />
          <p className="text-sm text-gray-500 text-center mt-4">
            Traitement des données et calcul des prédictions...
          </p>
        </div>
      )}

      {predictions && (
        <>
          {/* Score global de risque - Carte Premium avec cercle animé */}
          <div className="card-pro-hover overflow-hidden animate-fadeIn">
            {(() => {
              const classes = getRisqueClasses(predictions.scoreGlobal);
              const percentage = Math.round(predictions.scoreGlobal * 100);
              const circumference = 2 * Math.PI * 70;
              const strokeDashoffset = circumference * (1 - predictions.scoreGlobal);
              
              return (
                <div className={`${classes.bg} ${classes.border} border-3 rounded-2xl p-8 shadow-2xl`}>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Cercle de progression animé */}
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        {/* SVG Circle Progress */}
                        <svg className="transform -rotate-90 w-40 h-40">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-gray-300"
                          />
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className={`${classes.iconColor} transition-all duration-1500 ease-out`}
                            strokeLinecap="round"
                          />
                        </svg>
                        {/* Centre avec icône */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-28 h-28 ${classes.iconBg} rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-white`}>
                            <AlertTriangle size={36} className={classes.iconColor} />
                            <span className={`text-xs font-bold ${classes.text} mt-1`}>RISQUE</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Informations */}
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">
                          {percentage}%
                        </h3>
                        <p className={`${classes.text} font-bold text-2xl mb-2`}>
                          Risque {classes.label}
                        </p>
                        <p className="text-gray-600 text-sm font-medium">
                          Probabilité de récidive
                        </p>
                      </div>
                    </div>

                    {/* Badge de niveau */}
                    <div className={`px-8 py-6 bg-white rounded-2xl shadow-2xl border-3 ${classes.border}`}>
                      <div className="text-center">
                        <div className={`w-16 h-16 ${classes.iconBg} rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                          <AlertTriangle className={classes.iconColor} size={32} />
                        </div>
                        <p className={`${classes.text} font-black text-xl mb-1`}>
                          {classes.label.toUpperCase()}
                        </p>
                        <p className="text-gray-500 text-xs font-semibold">Niveau d'alerte</p>
                      </div>
                    </div>
                  </div>

                  {/* Barre d'information supplémentaire */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock size={16} />
                      <span className="text-sm font-medium">Analyse basée sur {predictions.modeleUtilise || 'Random Forest v2.3'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Target size={16} />
                      <span className="text-sm font-medium">Confiance du modèle: {Math.round((predictions.confianceModele || 0.87) * 100)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Prédictions détaillées - Cartes Premium avec Cercles SVG */}
          <div className="card-pro p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-gray-900 text-xl flex items-center">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl mr-3 shadow-lg">
                  <Target className="text-white" size={24} />
                </div>
                Prédictions détaillées par période
              </h4>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-300 rounded-xl">
                <span className="text-sm font-bold text-purple-800">
                  {predictions.predictions?.length || 0} scénario(s) analysé(s)
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {predictions.predictions && predictions.predictions.map((pred, index) => {
                const classes = getRisqueClasses(pred.probabilite);
                const percentage = Math.round(pred.probabilite * 100);
                const circumference = 2 * Math.PI * 45;
                const strokeDashoffset = circumference * (1 - pred.probabilite);
                
                // Icônes selon le type
                const icons = [Clock, TrendingUp, AlertTriangle];
                const IconComponent = icons[index] || Target;
                
                return (
                  <div 
                    key={index} 
                    className="card-pro-hover p-6 bg-gradient-to-br from-white to-gray-50 border-2 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {/* Cercle de progression SVG */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative">
                        <svg className="transform -rotate-90 w-32 h-32">
                          <circle
                            cx="64"
                            cy="64"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-200"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className={`${classes.iconColor} transition-all duration-1500`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`w-20 h-20 ${classes.iconBg} rounded-full flex items-center justify-center shadow-xl border-4 border-white mb-1`}>
                              <IconComponent className={classes.iconColor} size={32} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Pourcentage géant */}
                      <div className="mt-4 text-center">
                        <span className="text-2xl font-black text-gray-900">{percentage}</span>
                        <span className="text-xl font-black text-gray-500">%</span>
                        <p className={`text-sm font-bold mt-1 ${classes.text}`}>
                          Probabilité {classes.label}
                        </p>
                      </div>
                    </div>

                    {/* Type et description */}
                    <div className="text-center mb-4 pb-4 border-b-2 border-gray-200">
                      <h5 className="font-black text-gray-900 text-xl mb-3 leading-tight">
                        {pred.type}
                      </h5>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {pred.description}
                      </p>
                    </div>

                    {/* Badge de niveau */}
                    <div className="mb-4">
                      <div className={`px-4 py-3 rounded-xl text-center ${classes.bg} border-2 ${classes.border}`}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Niveau de risque</p>
                        <p className={`text-lg font-black ${classes.text}`}>
                          {classes.label.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Jauge horizontale avec segments */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-600">Échelle de probabilité</span>
                        <span className={`text-xs font-black ${classes.text}`}>{percentage}%</span>
                      </div>
                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-1500 ${
                            pred.probabilite >= 0.7 ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-600' :
                            pred.probabilite >= 0.4 ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600' :
                            'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600'
                          } shadow-lg relative`}
                          style={{ width: `${percentage}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white to-transparent opacity-30"></div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs font-semibold text-emerald-600">0%</span>
                        <span className="text-xs font-semibold text-amber-600">50%</span>
                        <span className="text-xs font-semibold text-red-600">100%</span>
                      </div>
                    </div>

                    {/* Facteurs contributifs */}
                    {pred.facteurs && pred.facteurs.length > 0 && (
                      <div className="pt-4 border-t-2 border-gray-200">
                        <p className="text-xs font-bold text-gray-700 mb-3 flex items-center">
                          <CheckCircle size={14} className="mr-1.5 text-purple-600" />
                          Facteurs contributifs ({pred.facteurs.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {pred.facteurs.map((facteur, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 rounded-xl text-xs font-bold border-2 border-purple-200 hover:scale-105 transition-transform shadow-sm"
                            >
                              {facteur}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Résumé comparatif */}
            <div className="mt-6 p-5 bg-gradient-to-r from-purple-100 via-indigo-50 to-purple-100 border-2 border-purple-300 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white rounded-xl shadow-md">
                    <TrendingUp className="text-purple-600" size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Risque le plus élevé</p>
                    <p className="text-2xl font-black text-purple-800">
                      {Math.max(...(predictions.predictions?.map(p => Math.round(p.probabilite * 100)) || [0]))}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white rounded-xl shadow-md">
                    <Target className="text-indigo-600" size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Probabilité moyenne</p>
                    <p className="text-2xl font-black text-indigo-800">
                      {Math.round((predictions.predictions?.reduce((sum, p) => sum + p.probabilite, 0) / (predictions.predictions?.length || 1)) * 100)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white rounded-xl shadow-md">
                    <AlertTriangle className="text-orange-600" size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Scénarios critiques</p>
                    <p className="text-2xl font-black text-orange-800">
                      {predictions.predictions?.filter(p => p.probabilite >= 0.7).length || 0} / {predictions.predictions?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facteurs de risque - Cartes Premium avec Jauge Visuelle */}
          {predictions.facteursRisque && predictions.facteursRisque.length > 0 && (
            <div className="card-pro p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-gray-900 text-xl flex items-center">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mr-3 shadow-lg">
                    <AlertTriangle className="text-white" size={24} />
                </div>
                Principaux facteurs de risque
              </h4>
                <div className="px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-xl">
                  <span className="text-sm font-bold text-orange-800">
                    {predictions.facteursRisque.length} facteur(s) identifié(s)
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {predictions.facteursRisque.map((facteur, index) => {
                  const percentage = Math.round(facteur.impact * 100);
                  const isHighRisk = percentage >= 70;
                  const isMediumRisk = percentage >= 50 && percentage < 70;
                  
                  return (
                    <div 
                      key={index} 
                      className="card-pro-hover p-6 bg-gradient-to-br from-white via-orange-50 to-red-50 border-2 border-orange-200 hover:border-orange-400 animate-scaleIn"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* En-tête avec numéro et impact */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                            isHighRisk ? 'bg-gradient-to-br from-red-600 to-red-700' :
                            isMediumRisk ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                            'bg-gradient-to-br from-yellow-500 to-orange-500'
                          }`}>
                            <span className="text-white font-black text-lg">{index + 1}</span>
                          </div>
                    <div className="flex-1">
                            <h5 className="font-black text-gray-900 text-lg mb-1 flex items-center">
                              {facteur.titre}
                            </h5>
                            <p className="text-sm text-gray-700 leading-relaxed">{facteur.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Jauge visuelle circulaire */}
                      <div className="relative mt-6">
                        {/* Arrière-plan de la jauge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-600">Impact du facteur</span>
                          <div className={`px-3 py-1.5 rounded-xl text-sm font-black shadow-md ${
                            isHighRisk ? 'bg-red-600 text-white' :
                            isMediumRisk ? 'bg-orange-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>
                            {percentage}%
                          </div>
                        </div>

                        {/* Barre de progression avec segments */}
                        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-6 rounded-full transition-all duration-1000 shadow-lg relative ${
                              isHighRisk ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700' :
                              isMediumRisk ? 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600' :
                              'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          >
                            {/* Effet de brillance */}
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white to-transparent opacity-20"></div>
                          </div>
                        </div>

                        {/* Échelle de référence */}
                        <div className="flex justify-between mt-2 text-xs font-semibold">
                          <span className="text-green-600">0% Faible</span>
                          <span className="text-yellow-600">50% Moyen</span>
                          <span className="text-red-600">100% Critique</span>
                        </div>
                      </div>

                      {/* Badge de niveau */}
                      <div className="mt-4 pt-4 border-t-2 border-orange-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className={
                              isHighRisk ? 'text-red-600' :
                              isMediumRisk ? 'text-orange-600' :
                              'text-yellow-600'
                            } size={18} />
                            <span className="text-sm font-bold text-gray-700">
                              Niveau: {
                                isHighRisk ? 'Critique' :
                                isMediumRisk ? 'Élevé' :
                                'Modéré'
                              }
                            </span>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            isHighRisk ? 'bg-red-100 text-red-800 border border-red-300' :
                            isMediumRisk ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          }`}>
                            {isHighRisk ? ' PRIORITÉ' : isMediumRisk ? ' ATTENTION' : ' SURVEILLANCE'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Résumé statistique */}
              <div className="mt-6 p-5 bg-gradient-to-r from-orange-100 via-red-50 to-orange-100 border-2 border-orange-300 rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-md">
                      <AlertTriangle className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Impact moyen global</p>
                      <p className="text-2xl font-black text-orange-800">
                        {Math.round((predictions.facteursRisque.reduce((sum, f) => sum + f.impact, 0) / predictions.facteursRisque.length) * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-md">
                      <Target className="text-red-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Facteurs critiques</p>
                      <p className="text-2xl font-black text-red-800">
                        {predictions.facteursRisque.filter(f => f.impact >= 0.7).length} / {predictions.facteursRisque.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-md">
                      <TrendingUp className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Action requise</p>
                      <p className="text-lg font-black text-orange-800">
                        {predictions.facteursRisque.filter(f => f.impact >= 0.7).length > 0 ? ' URGENTE' : ' NORMALE'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommandations - Cartes d'Action Premium */}
          {predictions.recommandations && predictions.recommandations.length > 0 && (
            <div className="card-pro p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-gray-900 text-xl flex items-center">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mr-3 shadow-lg">
                    <CheckCircle className="text-white" size={24} />
                  </div>
                  Plan d'action recommandé
                </h4>
                <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 rounded-xl">
                  <span className="text-sm font-bold text-blue-800">
                    {predictions.recommandations.length} action(s) à mener
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {predictions.recommandations.map((rec, index) => {
                  const priorityLevels = [
                    { label: 'PRIORITÉ 1', color: 'red', icon: '', bgGradient: 'from-red-50 to-orange-50' },
                    { label: 'PRIORITÉ 2', color: 'orange', icon: '', bgGradient: 'from-orange-50 to-yellow-50' },
                    { label: 'PRIORITÉ 3', color: 'blue', icon: '', bgGradient: 'from-blue-50 to-cyan-50' },
                    { label: 'PRIORITÉ 4', color: 'green', icon: '', bgGradient: 'from-green-50 to-emerald-50' }
                  ];
                  
                  const priority = priorityLevels[Math.min(index, 3)];
                  
                  return (
                    <div 
                      key={index} 
                      className="card-pro-hover p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 hover:border-blue-400 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* En-tête avec priorité */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Numéro de l'action */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                            index === 0 ? 'bg-gradient-to-br from-red-600 to-red-700' :
                            index === 1 ? 'bg-gradient-to-br from-orange-600 to-orange-700' :
                            index === 2 ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
                            'bg-gradient-to-br from-green-600 to-green-700'
                          }`}>
                            <span className="text-white font-black text-xl">{index + 1}</span>
                          </div>
                          
                          <div className="flex-1">
                            {/* Titre de la recommandation */}
                            <h5 className="font-black text-gray-900 text-lg mb-2 leading-tight">
                              {rec.titre}
                            </h5>
                            
                            {/* Description */}
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Badge de priorité */}
                      <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className={
                              index === 0 ? 'text-red-600' :
                              index === 1 ? 'text-orange-600' :
                              index === 2 ? 'text-blue-600' :
                              'text-green-600'
                            } size={18} />
                            <span className="text-sm font-bold text-gray-700">
                              {priority.label}
                            </span>
                          </div>
                          <div className={`px-4 py-2 rounded-xl text-sm font-black shadow-md text-white ${
                            index === 0 ? 'bg-gradient-to-r from-red-600 to-red-700' :
                            index === 1 ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
                            index === 2 ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                            'bg-gradient-to-r from-green-600 to-green-700'
                          }`}>
                            {priority.icon} ACTION
                          </div>
                        </div>
                      </div>

                      {/* Barre de statut */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-600">Statut de mise en œuvre</span>
                          <span className="text-xs font-semibold text-gray-500">À planifier</span>
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-2 rounded-full ${
                            index === 0 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                            index === 1 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                            index === 2 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                            'bg-gradient-to-r from-green-400 to-green-500'
                          }`} style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Résumé du plan d'action */}
              <div className="mt-6 p-5 bg-gradient-to-r from-blue-100 via-indigo-50 to-blue-100 border-2 border-blue-300 rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white rounded-xl shadow-md">
                      <CheckCircle className="text-blue-600" size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Actions recommandées</p>
                      <p className="text-2xl font-black text-blue-800">
                        {predictions.recommandations.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white rounded-xl shadow-md">
                      <Clock className="text-indigo-600" size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Délai recommandé</p>
                      <p className="text-xl font-black text-indigo-800">
                        Immédiat
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white rounded-xl shadow-md">
                      <Target className="text-purple-600" size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Impact attendu</p>
                      <p className="text-xl font-black text-purple-800">
                         Réduction des risques
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note importante */}
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 rounded-r-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-1">Note importante</p>
                    <p className="text-sm text-amber-800">
                      Ces recommandations sont générées par intelligence artificielle et doivent être validées par un professionnel avant mise en œuvre.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton pour nouvelle analyse */}
          <div className="flex justify-center">
            <Bouton
              variant="outline"
              onClick={() => {
                setPredictions(null);
                lancerAnalyse();
              }}
              chargement={chargement}
            >
              Refaire l'analyse
            </Bouton>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalysePredictive;

