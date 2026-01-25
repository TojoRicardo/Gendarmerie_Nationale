import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Info, Award, Shield, Target } from 'lucide-react';

const AffichageResultatsIA = ({ resultats }) => {
  if (!resultats) return null;

  const getNiveauConfiance = (confiance) => {
    if (confiance >= 0.9) return { 
      label: 'Très élevée', 
      color: 'emerald', 
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-emerald-700',
      bgGradient: 'from-emerald-50 to-green-50'
    };
    if (confiance >= 0.7) return { 
      label: 'Élevée', 
      color: 'blue', 
      icon: Shield,
      gradient: 'from-blue-500 to-blue-700',
      bgGradient: 'from-blue-50 to-cyan-50'
    };
    if (confiance >= 0.5) return { 
      label: 'Moyenne', 
      color: 'amber', 
      icon: Target,
      gradient: 'from-amber-500 to-amber-700',
      bgGradient: 'from-amber-50 to-yellow-50'
    };
    return { 
      label: 'Faible', 
      color: 'red', 
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-700',
      bgGradient: 'from-red-50 to-orange-50'
    };
  };

  const niveau = getNiveauConfiance(resultats.confiance);
  const Icone = niveau.icon;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Carte Score Global - Design Premium */}
      <div className="card-pro-hover overflow-hidden">
        <div className={`bg-gradient-to-br rounded-2xl p-8 shadow-xl border-2 ${
          resultats.confiance >= 0.9 ? 'from-emerald-50 to-green-50 border-emerald-200' :
          resultats.confiance >= 0.7 ? 'from-blue-50 to-cyan-50 border-blue-200' :
          resultats.confiance >= 0.5 ? 'from-amber-50 to-yellow-50 border-amber-200' :
          'from-red-50 to-orange-50 border-red-200'
        }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Score principal avec cercle animé */}
            <div className="flex items-center space-x-6">
              {/* Cercle de score avec animation */}
              <div className="relative">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className={
                      resultats.confiance >= 0.9 ? 'text-emerald-200' :
                      resultats.confiance >= 0.7 ? 'text-blue-200' :
                      resultats.confiance >= 0.5 ? 'text-amber-200' :
                      'text-red-200'
                    }
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - resultats.confiance)}`}
                    className={`transition-all duration-1000 ${
                      resultats.confiance >= 0.9 ? 'text-emerald-600' :
                      resultats.confiance >= 0.7 ? 'text-blue-600' :
                      resultats.confiance >= 0.5 ? 'text-amber-600' :
                      'text-red-600'
                    }`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
                    resultats.confiance >= 0.9 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
                    resultats.confiance >= 0.7 ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                    resultats.confiance >= 0.5 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                    'bg-gradient-to-br from-red-500 to-red-700'
                  }`}>
                    <Icone className="text-white" size={40} />
                  </div>
                </div>
              </div>
              
              {/* Informations textuelles */}
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  {Math.round(resultats.confiance * 100)}%
                </h3>
                <p className={`font-bold text-xl mb-1 ${
                  resultats.confiance >= 0.9 ? 'text-emerald-800' :
                  resultats.confiance >= 0.7 ? 'text-blue-800' :
                  resultats.confiance >= 0.5 ? 'text-amber-800' :
                  'text-red-800'
                }`}>
                  Confiance {niveau.label}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Award className={
                    resultats.confiance >= 0.9 ? 'text-emerald-600' :
                    resultats.confiance >= 0.7 ? 'text-blue-600' :
                    resultats.confiance >= 0.5 ? 'text-amber-600' :
                    'text-red-600'
                  } size={18} />
                  <span className={`text-sm font-medium ${
                    resultats.confiance >= 0.9 ? 'text-emerald-700' :
                    resultats.confiance >= 0.7 ? 'text-blue-700' :
                    resultats.confiance >= 0.5 ? 'text-amber-700' :
                    'text-red-700'
                  }`}>
                    {resultats.type || 'Analyse IA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Badge de qualité */}
            <div className={`px-6 py-4 bg-white rounded-2xl shadow-lg border-2 ${
              resultats.confiance >= 0.9 ? 'border-emerald-300' :
              resultats.confiance >= 0.7 ? 'border-blue-300' :
              resultats.confiance >= 0.5 ? 'border-amber-300' :
              'border-red-300'
            }`}>
              <div className="text-center">
                <Icone className={`mx-auto mb-2 ${
                  resultats.confiance >= 0.9 ? 'text-emerald-600' :
                  resultats.confiance >= 0.7 ? 'text-blue-600' :
                  resultats.confiance >= 0.5 ? 'text-amber-600' :
                  'text-red-600'
                }`} size={32} />
                <p className={`font-bold text-lg ${
                  resultats.confiance >= 0.9 ? 'text-emerald-800' :
                  resultats.confiance >= 0.7 ? 'text-blue-800' :
                  resultats.confiance >= 0.5 ? 'text-amber-800' :
                  'text-red-800'
                }`}>
                  {niveau.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">Niveau de fiabilité</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques détaillées en cartes */}
      {resultats.metriques && (
        <div className="card-pro p-6">
          <h4 className="font-bold text-gray-900 mb-6 text-xl flex items-center">
            <TrendingUp className="mr-3 text-purple-600" size={24} />
            Métriques détaillées
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(resultats.metriques).map(([cle, valeur]) => {
              const valeurNum = typeof valeur === 'number' ? valeur : 0;
              const couleur = valeurNum >= 0.7 ? 'emerald' : valeurNum >= 0.5 ? 'amber' : 'red';
              
              return (
                <div key={cle} className="stat-card group hover-lift bg-white p-4 rounded-xl border-2 border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-700 font-semibold capitalize">
                      {cle.replace(/_/g, ' ')}
                    </span>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                      couleur === 'emerald' ? 'bg-emerald-100' :
                      couleur === 'amber' ? 'bg-amber-100' :
                      'bg-red-100'
                    }`}>
                      <TrendingUp className={
                        couleur === 'emerald' ? 'text-emerald-600' :
                        couleur === 'amber' ? 'text-amber-600' :
                        'text-red-600'
                      } size={20} />
                    </div>
                  </div>
                  
                  <span className="text-2xl font-black text-gray-900 block mb-2">
                    {typeof valeur === 'number' ? `${Math.round(valeur * 100)}%` : valeur}
                  </span>
                  
                  {typeof valeur === 'number' && (
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full bg-gradient-to-r ${
                            valeurNum >= 0.7 ? 'from-emerald-500 to-emerald-600' :
                            valeurNum >= 0.5 ? 'from-amber-500 to-amber-600' :
                            'from-red-500 to-red-600'
                          } transition-all duration-1000`}
                          style={{ width: `${valeur * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Caractéristiques détectées - Tags interactifs */}
      {resultats.caracteristiques && resultats.caracteristiques.length > 0 && (
        <div className="card-pro p-6">
          <h4 className="font-bold text-gray-900 mb-6 text-xl flex items-center">
            <Target className="mr-3 text-cyan-600" size={24} />
            Caractéristiques détectées
          </h4>
          <div className="flex flex-wrap gap-3">
            {resultats.caracteristiques.map((car, index) => (
              <span
                key={index}
                className="group px-5 py-2.5 bg-gradient-to-r from-cyan-100 to-blue-100 hover:from-cyan-200 hover:to-blue-200 text-cyan-800 rounded-xl text-sm font-bold border-2 border-cyan-200 hover:border-cyan-300 transition-all hover:scale-105 shadow-sm hover:shadow-md cursor-default animate-scaleIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CheckCircle className="inline mr-2 text-cyan-600" size={16} />
                {car}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommandations - Cartes avec numérotation */}
      {resultats.recommandations && resultats.recommandations.length > 0 && (
        <div className="card-pro p-6">
          <h4 className="font-bold text-gray-900 mb-6 text-xl flex items-center">
            <Info className="mr-3 text-blue-600" size={24} />
            Recommandations
          </h4>
          <div className="space-y-3">
            {resultats.recommandations.map((rec, index) => (
              <div 
                key={index} 
                className="flex items-start space-x-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all hover:shadow-lg animate-slideInRight"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium leading-relaxed">{rec}</p>
                </div>
                <Info className="text-blue-600 flex-shrink-0" size={20} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métadonnées - Carte info technique */}
      {resultats.metadata && (
        <div className="card-pro p-6 bg-gradient-to-br from-gray-50 to-slate-50">
          <h4 className="font-bold text-gray-900 mb-5 text-lg flex items-center">
            <Shield className="mr-2 text-gray-600" size={20} />
            Informations d'analyse
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resultats.metadata.tempsAnalyse && (
              <div className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <span className="text-xs text-gray-500 font-semibold block mb-1">Temps d'analyse</span>
                <p className="font-black text-xl text-gray-900">{resultats.metadata.tempsAnalyse}ms</p>
              </div>
            )}
            {resultats.metadata.modeleVersion && (
              <div className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <span className="text-xs text-gray-500 font-semibold block mb-1">Modèle IA</span>
                <p className="font-black text-xl text-gray-900">{resultats.metadata.modeleVersion}</p>
              </div>
            )}
            {resultats.metadata.dateAnalyse && (
              <div className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <span className="text-xs text-gray-500 font-semibold block mb-1">Date</span>
                <p className="font-bold text-sm text-gray-900">
                  {new Date(resultats.metadata.dateAnalyse).toLocaleString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AffichageResultatsIA;

