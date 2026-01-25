import React, { useState, useEffect } from 'react';
import { GitBranch, MapPin, Calendar, AlertCircle, Clock, Users, Target, TrendingUp, CheckCircle, Layers, Shield } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const CorrespondancesPattern = ({ ficheId }) => {
  const [patterns, setPatterns] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  console.log(' CorrespondancesPattern rendu, ficheId:', ficheId, 'chargement:', chargement, 'patterns:', patterns);

  useEffect(() => {
    if (ficheId) {
      rechercherPatterns();
    } else {
      setChargement(false);
      setErreur('Aucune fiche sélectionnée');
    }
  }, [ficheId]);

  const rechercherPatterns = async () => {
    setChargement(true);
    setErreur('');

    try {
      // MODE DÉVELOPPEMENT - Simulation de l'API
      // En production, remplacer par un vrai appel API
      const useMockData = true; // Changez à false quand le backend sera prêt

      if (useMockData) {
        // Simuler un délai de traitement
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Données de démonstration - VIDES (pas de patterns trouvés)
        const mockData = {
          totalPatterns: 0,
          fichesLiees: 0,
          confianceMoyenne: 0,
          patternsGeographiques: [],
          patternsTemporels: [],
          patternsComportementaux: [],
          algorithmeUtilise: 'Machine Learning - Pattern Recognition v1.5',
          dateAnalyse: new Date().toISOString()
        };

        setPatterns(mockData);
      } else {
        // Code pour appel API réel
        const response = await fetch(`/api/ia/patterns/${ficheId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPatterns(data);
        } else {
          setErreur('Erreur lors de la recherche de patterns');
        }
      }
    } catch (error) {
      setErreur(error.message || 'Erreur lors de la recherche');
    } finally {
      setChargement(false);
    }
  };

  const getConfidenceClasses = (confiance) => {
    if (confiance >= 0.8) return {
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800',
      label: 'Élevée'
    };
    if (confiance >= 0.6) return {
      badgeBg: 'bg-yellow-100',
      badgeText: 'text-yellow-800',
      label: 'Moyenne'
    };
    return {
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-800',
      label: 'Faible'
    };
  };

  if (chargement) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <SpinnerChargement texte="Recherche de patterns..." />
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {erreur}
        </div>
      </div>
    );
  }

  if (!patterns) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête Premium avec Statistiques */}
      <div className="card-pro-hover overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-xl">
                <GitBranch className="text-white" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white mb-1">
                  Patterns & Correspondances
                </h3>
                <p className="text-indigo-100 text-xs font-medium">
                  Analyse comportementale avancée par IA
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <Target className="text-white" size={16} />
              <span className="text-white font-bold text-xs">
                Algorithme: {patterns.algorithmeUtilise || 'ML Pattern Recognition v1.5'}
              </span>
            </div>
          </div>

          {/* Statistiques principales avec cercles SVG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Patterns */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-xl border-2 border-white/50 hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-indigo-600 mb-1">PATTERNS DÉTECTÉS</p>
                  <p className="text-xl font-black text-gray-900 mb-2">
                    {patterns.totalPatterns || 0}
                  </p>
                  <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000"
                      style={{ width: `${Math.min((patterns.totalPatterns / 10) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium mt-2">
                    Corrélations identifiées
                  </p>
                </div>
                <div className="ml-4">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
                    <Layers className="text-white" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Fiches Liées */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-xl border-2 border-white/50 hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-purple-600 mb-1">FICHES CONNECTÉES</p>
                  <p className="text-xl font-black text-gray-900 mb-2">
                    {patterns.fichesLiees || 0}
                  </p>
                  <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1000"
                      style={{ width: `${Math.min((patterns.fichesLiees / 20) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium mt-2">
                    Dossiers liés
                  </p>
                </div>
                <div className="ml-4">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
                    <GitBranch className="text-white" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Confiance Moyenne */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-xl border-2 border-white/50 hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-pink-600 mb-1">FIABILITÉ GLOBALE</p>
                  <p className="text-xl font-black text-gray-900 mb-2">
                    {Math.round((patterns.confianceMoyenne || 0) * 100)}%
                  </p>
                  <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-1000"
                      style={{ width: `${(patterns.confianceMoyenne || 0) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium mt-2">
                    Confiance moyenne
                  </p>
                </div>
                <div className="ml-4">
                  <div className="p-2.5 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-lg">
                    <CheckCircle className="text-white" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patterns géographiques */}
      {patterns.patternsGeographiques && patterns.patternsGeographiques.length > 0 && (
        <div className="bg-white rounded-xl shadow-xl border-2 border-emerald-200 overflow-hidden hover:shadow-emerald-200/50 hover:scale-[1.01] transition-all duration-300">
          <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-xl">
                  <MapPin className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white mb-1">Patterns Géographiques</h4>
                  <p className="text-emerald-50 font-bold">
                     {patterns.patternsGeographiques.length} zone(s) à concentration élevée
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-5 bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/30">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {patterns.patternsGeographiques.map((pattern, index) => {
                const classes = getConfidenceClasses(pattern.confiance);
                const percentage = Math.round(pattern.confiance * 100);
                const circumference = 2 * Math.PI * 45;
                const strokeDashoffset = circumference * (1 - pattern.confiance);
                
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-xl p-5 border-2 border-emerald-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-white via-emerald-50/50 to-white"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      {/* Cercle SVG de confiance */}
                      <div className="relative flex-shrink-0">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="transparent"
                            className="text-emerald-200"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="text-emerald-600 transition-all duration-1500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <MapPin className="text-emerald-600 mx-auto mb-0.5" size={16} />
                            <span className="text-xs font-black text-emerald-700">{percentage}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Informations */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-black text-gray-900 text-base leading-tight">
                            {pattern.zone}
                          </h5>
                          <span className={`px-2.5 py-0.5 ${classes.badgeBg} ${classes.badgeText} rounded-full text-xs font-bold shadow-sm flex-shrink-0 ml-2`}>
                            {classes.label}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mt-3">
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="p-1.5 bg-red-100 rounded-lg">
                              <AlertCircle className="text-red-600" size={14} />
                            </div>
                            <span className="font-bold text-gray-900">
                              {pattern.nombreInfractions} infractions
                            </span>
                            <span className="text-gray-500">détectées</span>
                          </div>
                          
                          {pattern.periode && (
                            <div className="flex items-center space-x-2 text-sm">
                              <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Calendar className="text-blue-600" size={14} />
                              </div>
                              <span className="text-gray-700 font-medium">{pattern.periode}</span>
                            </div>
                          )}
                        </div>

                        {/* Jauge de confiance horizontale */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span className="text-gray-600">Niveau de confiance</span>
                            <span className="text-emerald-700">{percentage}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1500 shadow-lg"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fiches associées */}
                    {pattern.fichesAssociees && pattern.fichesAssociees.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-gray-700 uppercase tracking-wide">
                            Dossiers liés ({pattern.fichesAssociees.length})
                          </p>
                          <Target className="text-emerald-600" size={14} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {pattern.fichesAssociees.map((fiche, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                            >
                              {fiche}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Patterns temporels */}
      {patterns.patternsTemporels && patterns.patternsTemporels.length > 0 && (
        <div className="bg-white rounded-xl shadow-xl border-2 border-blue-200 overflow-hidden hover:shadow-blue-200/50 hover:scale-[1.01] transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-xl">
                  <Clock className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white mb-1">Patterns Temporels</h4>
                  <p className="text-blue-50 font-bold">
                     {patterns.patternsTemporels.length} tendance(s) récurrente(s) identifiée(s)
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-5 bg-gradient-to-br from-blue-50/30 via-white to-cyan-50/30">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {patterns.patternsTemporels.map((pattern, index) => {
                const classes = getConfidenceClasses(pattern.confiance);
                const percentage = Math.round(pattern.confiance * 100);
                const circumference = 2 * Math.PI * 40;
                const strokeDashoffset = circumference * (1 - pattern.confiance);
                
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-xl p-5 border-2 border-blue-400 shadow-lg hover:shadow-blue-400/50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-white via-blue-50/60 to-cyan-50/40"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* En-tête avec cercle central */}
                    <div className="flex flex-col items-center mb-4">
                      {/* Cercle SVG de confiance - Plus grand */}
                      <div className="relative mb-3">
                        <svg className="transform -rotate-90 w-24 h-24">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="transparent"
                            className="text-blue-200"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="text-blue-600 transition-all duration-1500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex flex-col items-center justify-center shadow-lg border-3 border-white">
                            <Clock className="text-white mb-0.5" size={20} />
                            <span className="text-xs font-black text-white">{percentage}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Titre et badge */}
                      <div className="text-center mb-3">
                        <div className="flex items-center justify-center space-x-2 mb-1.5">
                          <Calendar className="text-blue-600" size={18} />
                          <h5 className="font-black text-gray-900 text-base">{pattern.periode}</h5>
                        </div>
                        <span className={`inline-block px-3 py-1 ${classes.badgeBg} ${classes.badgeText} rounded-full text-xs font-bold shadow-sm`}>
                          Confiance {classes.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white/80 rounded-xl p-4 mb-4 border-2 border-blue-100">
                      <p className="text-sm text-gray-700 leading-relaxed text-center">
                        {pattern.description}
                      </p>
                    </div>

                    {/* Informations principales - Nouvelle structure */}
                    <div className="space-y-4">
                      {/* Statistiques détaillées */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 border-2 border-cyan-700 rounded-xl p-4 shadow-lg hover:scale-105 transition-all">
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                              <TrendingUp className="text-white" size={18} />
                            </div>
                            <span className="text-xs font-black text-white uppercase">Fréquence</span>
                          </div>
                          <p className="text-xl font-black text-white text-center">{pattern.frequence}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-indigo-700 rounded-xl p-4 shadow-lg hover:scale-105 transition-all">
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                              <Target className="text-white" size={18} />
                            </div>
                            <span className="text-xs font-black text-white uppercase">Occurrences</span>
                          </div>
                          <p className="text-xl font-black text-white text-center">{pattern.occurrences}</p>
                        </div>
                      </div>

                      {/* Jauge de confiance horizontale */}
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                        <div className="flex items-center justify-between text-sm font-bold mb-2">
                          <span className="text-gray-700"> Fiabilité du pattern</span>
                          <span className="text-blue-700 text-base font-bold">{percentage}%</span>
                        </div>
                        <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner border-2 border-blue-300">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 transition-all duration-1500 shadow-lg"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Patterns comportementaux */}
      {patterns.patternsComportementaux && patterns.patternsComportementaux.length > 0 && (
        <div className="bg-white rounded-xl shadow-xl border-2 border-purple-200 overflow-hidden hover:shadow-purple-200/50 hover:scale-[1.01] transition-all duration-300">
          <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-xl">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white mb-1">Patterns Comportementaux</h4>
                  <p className="text-purple-50 font-bold">
                    {patterns.patternsComportementaux.length} profil(s) comportemental(aux) détecté(s)
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-5 bg-gradient-to-br from-purple-50/30 via-white to-pink-50/30">

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {patterns.patternsComportementaux.map((pattern, index) => {
                const classes = getConfidenceClasses(pattern.confiance);
                const percentage = Math.round(pattern.confiance * 100);
                const circumference = 2 * Math.PI * 50;
                const strokeDashoffset = circumference * (1 - pattern.confiance);
                
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-xl p-5 border-2 border-purple-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-white via-purple-50/50 to-white"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* En-tête avec cercle SVG */}
                    <div className="flex flex-col items-center mb-4">
                      {/* Cercle SVG central */}
                      <div className="relative mb-3">
                        <svg className="transform -rotate-90 w-24 h-24">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="transparent"
                            className="text-purple-200"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="text-purple-600 transition-all duration-1500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex flex-col items-center justify-center shadow-lg border-3 border-white">
                            <Users className="text-white mb-0.5" size={20} />
                            <span className="text-xs font-black text-white">{percentage}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Titre et badge */}
                      <div className="text-center">
                        <h5 className="font-black text-gray-900 text-base mb-1.5">{pattern.type}</h5>
                        <span className={`inline-block px-3 py-1 ${classes.badgeBg} ${classes.badgeText} rounded-full text-xs font-bold shadow-sm`}>
                          Confiance {classes.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white/80 rounded-xl p-4 mb-4 border-2 border-purple-100">
                      <p className="text-sm text-gray-700 leading-relaxed text-center">
                        {pattern.description}
                      </p>
                    </div>

                    {/* Jauge de confiance */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="text-gray-600">Niveau de fiabilité</span>
                        <span className="text-purple-700">{percentage}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1500 shadow-lg"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Caractéristiques */}
                    {pattern.caracteristiques && pattern.caracteristiques.length > 0 && (
                      <div className="pt-4 border-t-2 border-purple-100">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-black text-gray-700 uppercase tracking-wide">
                            Caractéristiques ({pattern.caracteristiques.length})
                          </p>
                          <CheckCircle className="text-purple-600" size={14} />
                        </div>
                        <div className="space-y-2">
                          {pattern.caracteristiques.map((car, i) => (
                            <div
                              key={i}
                              className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg px-3 py-2 shadow-md hover:shadow-lg hover:scale-105 transition-all"
                            >
                              <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                              <span className="text-xs font-bold">{car}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Aucun pattern trouvé */}
      {(!patterns.patternsGeographiques || patterns.patternsGeographiques.length === 0) &&
       (!patterns.patternsTemporels || patterns.patternsTemporels.length === 0) &&
       (!patterns.patternsComportementaux || patterns.patternsComportementaux.length === 0) && (
        <div className="bg-white rounded-xl shadow-xl border-2 border-gray-300 overflow-hidden hover:shadow-gray-300/50 hover:scale-[1.01] transition-all duration-300">
          <div className="p-10 text-center bg-gradient-to-br from-gray-100 via-white to-gray-100">
            <div className="flex flex-col items-center">
              <div className="relative mb-5">
                <div className="p-5 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full shadow-lg">
                  <GitBranch className="text-gray-500" size={48} />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-yellow-400 rounded-full shadow-md">
                  <AlertCircle className="text-yellow-800" size={20} />
                </div>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">
                Aucun Pattern Significatif
              </h3>
              <p className="text-gray-600 font-medium text-base max-w-md">
                L'analyse IA n'a pas révélé de corrélations ou patterns comportementaux importants dans les données actuelles.
              </p>
              <div className="mt-6 flex items-center space-x-2 text-sm text-gray-500">
                <Target size={16} />
                <span>Seuil de confiance minimum: 65%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pied de page avec métadonnées et bouton rafraîchir */}
      <div className="bg-white rounded-xl shadow-xl border-2 border-indigo-200 overflow-hidden hover:shadow-indigo-200/50 hover:scale-[1.01] transition-all duration-300">
        <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Métadonnées de l'analyse */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 text-sm text-gray-600">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Clock className="text-indigo-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Date d'analyse</p>
                  <p className="font-bold text-gray-900">
                    {new Date(patterns.dateAnalyse).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                    <span className="mx-1.5 text-gray-400">•</span>
                    {new Date(patterns.dateAnalyse).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="text-purple-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Modèle IA</p>
                  <p className="font-bold text-gray-900">
                    {patterns.algorithmeUtilise ? 
                      patterns.algorithmeUtilise.split(' - ')[0] : 
                      'Machine Learning'
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {patterns.algorithmeUtilise ? 
                      patterns.algorithmeUtilise.split(' - ')[1] || 'v1.5' : 
                      'Pattern Recognition v1.5'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton rafraîchir */}
            <button
              onClick={rechercherPatterns}
              disabled={chargement}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center space-x-2 shadow-lg ${
                chargement
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105'
              }`}
            >
              {chargement ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Analyse en cours...</span>
                </>
              ) : (
                <>
                  <TrendingUp size={20} />
                  <span>Rafraîchir l'analyse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Note informative */}
      <div className="bg-white rounded-xl shadow-xl border-2 border-indigo-300 overflow-hidden hover:shadow-indigo-300/50 hover:scale-[1.01] transition-all duration-300">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <AlertCircle className="text-white" size={24} />
            </div>
            <h4 className="text-base font-black text-white">
               À propos de l'analyse des patterns
            </h4>
          </div>
        </div>
        
        <div className="p-5 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/30">
          <div className="space-y-3">
            {/* Intelligence Artificielle */}
            <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all">
              <div className="flex items-start space-x-2.5">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm flex-shrink-0">
                  <Target className="text-white" size={18} />
                </div>
                <div className="flex-1">
                  <h5 className="font-black text-indigo-900 text-sm mb-1.5">Intelligence Artificielle</h5>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Les patterns sont identifiés par des algorithmes avancés qui analysent les corrélations géographiques, 
                    temporelles et comportementales dans les données criminelles.
                  </p>
                </div>
              </div>
            </div>

            {/* Seuil de confiance */}
            <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all">
              <div className="flex items-start space-x-2.5">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm flex-shrink-0">
                  <TrendingUp className="text-white" size={18} />
                </div>
                <div className="flex-1">
                  <h5 className="font-black text-purple-900 text-sm mb-1.5">Seuil de confiance</h5>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Seuls les patterns avec un niveau de confiance supérieur à <span className="font-bold text-purple-700">65%</span> sont affichés.
                  </p>
                </div>
              </div>
            </div>

            {/* Usage professionnel */}
            <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all">
              <div className="flex items-start space-x-2.5">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm flex-shrink-0">
                  <Shield className="text-white" size={18} />
                </div>
                <div className="flex-1">
                  <h5 className="font-black text-blue-900 text-sm mb-1.5">Usage professionnel</h5>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Cette analyse est un outil d'aide à la décision et doit être interprétée par des professionnels qualifiés.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrespondancesPattern;

