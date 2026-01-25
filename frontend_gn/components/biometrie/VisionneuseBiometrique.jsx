import React, { useState, useEffect } from 'react';
import { User, Fingerprint, Camera, Download, Calendar, Hand, TrendingUp, CheckCircle2, AlertCircle, FileText, ZoomIn, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const VisionneuseBiometrique = ({ suspectId }) => {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [ongletActif, setOngletActif] = useState('photos');
  const [photoAgrandie, setPhotoAgrandie] = useState(null);
  const [enCoursExport, setEnCoursExport] = useState(false);

  useEffect(() => {
    chargerDonneesBiometriques();
  }, [suspectId]);

  const chargerDonneesBiometriques = async () => {
    try {
      const response = await fetch(`/api/biometrie/suspect/${suspectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDonnees(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données biométriques:', error);
    } finally {
      setChargement(false);
    }
  };

  const exporterDonnees = async () => {
    setEnCoursExport(true);
    try {
      const response = await fetch(`/api/biometrie/suspect/${suspectId}/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `biometrie_${suspectId}_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    } finally {
      setEnCoursExport(false);
    }
  };

  const getProfilConfig = (type) => {
    const configs = {
      'gauche': {
        label: 'Profil gauche',
        icone: ChevronLeft,
        couleur: 'blue',
        bg: 'bg-blue-600'
      },
      'face': {
        label: 'Profil face',
        icone: User,
        couleur: 'emerald',
        bg: 'bg-emerald-600'
      },
      'droit': {
        label: 'Profil droit',
        icone: ChevronRight,
        couleur: 'purple',
        bg: 'bg-purple-600'
      }
    };
    return configs[type] || configs['face'];
  };

  if (chargement) {
    return <SpinnerChargement texte="Chargement des données biométriques..." />;
  }

  if (!donnees) {
    return (
      <div className="card-pro p-12 text-center">
        <div className="inline-flex p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
          <User className="text-gray-600" size={64} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune donnée biométrique</h3>
        <p className="text-gray-500 mb-6">Ce suspect n'a pas encore de données biométriques enregistrées</p>
        <div className="inline-flex space-x-2 text-sm text-gray-600 bg-gray-100 px-6 py-3 rounded-xl">
          <AlertCircle size={18} className="text-gray-600" />
          <span>Ajoutez des photos ou des empreintes depuis l'onglet Biométrie</span>
        </div>
      </div>
    );
  }

  const nombreTotalEmpreintes = 15; // 10 doigts + 2 palmaires + 2 simultanées + 1 pouces
  const tauxCompletion = Math.round(((donnees.nombreEmpreintes || 0) / nombreTotalEmpreintes) * 100);
  const tauxQualite = donnees.qualiteMoyenne || 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête avec statistiques principales */}
      <div className="card-pro p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl shadow-lg">
              <Fingerprint className="text-white" size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Dossier Biométrique</h3>
              <p className="text-sm text-gray-600 mt-1 flex items-center">
                <Calendar className="mr-1.5" size={14} />
                Dernière mise à jour: {new Date(donnees.derniereMiseAJour).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            onClick={exporterDonnees}
            disabled={enCoursExport}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 shadow-lg ${
              enCoursExport
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-105'
            }`}
          >
            {enCoursExport ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Export en cours...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Exporter le dossier</span>
              </>
            )}
          </button>
        </div>

        {/* Barre de progression globale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border-2 border-cyan-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Empreintes enregistrées</span>
              <span className="text-2xl font-bold text-cyan-600">{donnees.nombreEmpreintes || 0}/{nombreTotalEmpreintes}</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-500"
                style={{ width: `${tauxCompletion}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {tauxCompletion === 100 ? ' Dossier complet' : `${tauxCompletion}% complété`}
            </p>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Qualité moyenne</span>
              <span className="text-2xl font-bold text-emerald-600">{tauxQualite}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  tauxQualite >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                  tauxQualite >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                  'bg-gradient-to-r from-red-500 to-red-600'
                }`}
                style={{ width: `${tauxQualite}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {tauxQualite >= 80 ? ' Excellente qualité' : tauxQualite >= 60 ? ' Qualité acceptable' : ' Qualité à améliorer'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card group hover-lift">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-xl bg-pink-100 group-hover:bg-pink-200 transition-colors">
              <Camera className="text-pink-600 group-hover:scale-110 transition-transform" size={24} />
            </div>
            <p className="text-sm font-bold text-gray-700">Photos d'identification</p>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-2xl font-bold text-gray-900">{donnees.nombrePhotos || 0}</p>
            <span className="text-sm font-semibold flex items-center text-emerald-500">
              <CheckCircle2 size={16} className="mr-1" />
              Actives
            </span>
          </div>
          <p className="text-xs text-gray-500">3 profils recommandés</p>
        </div>

        <div className="stat-card group hover-lift">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-xl bg-cyan-100 group-hover:bg-cyan-200 transition-colors">
              <Fingerprint className="text-cyan-600 group-hover:scale-110 transition-transform" size={24} />
            </div>
            <p className="text-sm font-bold text-gray-700">Empreintes digitales</p>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-2xl font-bold text-gray-900">{donnees.nombreEmpreintes || 0}</p>
            <span className={`text-sm font-semibold flex items-center ${tauxCompletion === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
              <TrendingUp size={16} className="mr-1" />
              {tauxCompletion}%
            </span>
          </div>
          <p className="text-xs text-gray-500">Sur 15 empreintes</p>
        </div>

        <div className="stat-card group hover-lift">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
              <CheckCircle2 className="text-emerald-600 group-hover:scale-110 transition-transform" size={24} />
            </div>
            <p className="text-sm font-bold text-gray-700">Qualité biométrique</p>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-2xl font-bold text-gray-900">{tauxQualite}%</p>
            <span className={`text-sm font-semibold flex items-center ${
              tauxQualite >= 80 ? 'text-emerald-500' : tauxQualite >= 60 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {tauxQualite >= 80 ? <CheckCircle2 size={16} className="mr-1" /> : <AlertCircle size={16} className="mr-1" />}
              {tauxQualite >= 80 ? 'Excellent' : tauxQualite >= 60 ? 'Bon' : 'Faible'}
            </span>
          </div>
          <p className="text-xs text-gray-500">Note de fiabilité</p>
        </div>
      </div>

      {/* Onglets modernes */}
      <div className="card-pro p-6">
        <div className="border-b-2 border-gray-100 mb-6">
          <nav className="flex space-x-2">
            <button
              onClick={() => setOngletActif('photos')}
              className={`px-6 py-3 rounded-t-xl font-semibold text-sm transition-all relative ${
                ongletActif === 'photos'
                  ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Camera className="inline mr-2" size={18} />
              Photos ({donnees.nombrePhotos || 0})
              {ongletActif === 'photos' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-600"></div>
              )}
            </button>
            <button
              onClick={() => setOngletActif('empreintes')}
              className={`px-6 py-3 rounded-t-xl font-semibold text-sm transition-all relative ${
                ongletActif === 'empreintes'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Fingerprint className="inline mr-2" size={18} />
              Empreintes ({donnees.nombreEmpreintes || 0})
              {ongletActif === 'empreintes' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-600"></div>
              )}
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div>
          {ongletActif === 'photos' && (
            <div>
              {donnees.photos && donnees.photos.length > 0 ? (
                <>
                  {/* En-tête de la galerie */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ImageIcon className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Galerie de photos</h4>
                        <p className="text-sm text-gray-600">{donnees.photos.length} photo(s) enregistrée(s)</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {['gauche', 'face', 'droit'].map(type => {
                        const count = donnees.photos.filter(p => p.typeProfil === type).length;
                        const config = getProfilConfig(type);
                        const Icone = config.icone;
                        
                        // Classes conditionnelles complètes pour Tailwind
                        const bgClass = config.couleur === 'blue' ? 'bg-blue-50 border-blue-200' :
                                        config.couleur === 'emerald' ? 'bg-emerald-50 border-emerald-200' :
                                        'bg-purple-50 border-purple-200';
                        const iconClass = config.couleur === 'blue' ? 'text-blue-600' :
                                          config.couleur === 'emerald' ? 'text-emerald-600' :
                                          'text-purple-600';
                        const textClass = config.couleur === 'blue' ? 'text-blue-700' :
                                          config.couleur === 'emerald' ? 'text-emerald-700' :
                                          'text-purple-700';
                        
                        return count > 0 ? (
                          <div key={type} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${bgClass}`}>
                            <Icone className={iconClass} size={14} />
                            <span className={`text-xs font-bold ${textClass}`}>{count}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Grille de photos */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {donnees.photos.map((photo, index) => {
                      const config = getProfilConfig(photo.typeProfil);
                      const Icone = config.icone;
                      
                      return (
                        <div
                          key={index}
                          className="card-pro-hover relative group cursor-pointer overflow-hidden animate-scaleIn"
                          onClick={() => setPhotoAgrandie(photo)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <img
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-48 object-cover"
                          />
                          
                          {/* Badge type de profil */}
                          <div className={`absolute top-3 left-3 ${config.bg} text-white px-2 py-1 rounded-lg shadow-lg flex items-center space-x-1.5`}>
                            <Icone size={14} />
                            <span className="text-xs font-bold">{config.label}</span>
                          </div>
                          
                          {/* Overlay au survol */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button className="p-3 bg-white rounded-xl hover:bg-gray-100 hover:scale-110 transition-all shadow-lg">
                              <ZoomIn size={24} className="text-gray-700" />
                            </button>
                          </div>

                          {/* Informations */}
                          <div className="p-3 bg-white">
                            <p className="text-xs text-gray-600 flex items-center">
                              <Calendar size={12} className="mr-1" />
                              {new Date(photo.date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                  <div className="inline-flex p-6 bg-white rounded-full mb-4 shadow-lg">
                    <Camera className="text-gray-400" size={48} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Aucune photo disponible</h4>
                  <p className="text-gray-500 text-sm">Les photos d'identification apparaîtront ici</p>
                </div>
              )}
            </div>
          )}

          {ongletActif === 'empreintes' && (
            <div>
              {donnees.empreintes && donnees.empreintes.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Main gauche */}
                  <div className="card-pro p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Hand className="text-purple-600 transform scale-x-[-1]" size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">Main gauche</h4>
                          <p className="text-sm text-gray-600">
                            {donnees.empreintes.filter(e => e.main === 'gauche').length} empreinte(s)
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {donnees.empreintes.filter(e => e.main === 'gauche').map((emp, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-600 rounded-lg">
                              <Fingerprint className="text-white" size={20} />
                            </div>
                            <span className="text-sm font-bold text-gray-900">{emp.doigt}</span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${
                              emp.qualite >= 80 ? 'text-emerald-600' : emp.qualite >= 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {emp.qualite}%
                            </div>
                            <p className="text-xs text-gray-500">Qualité</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main droite */}
                  <div className="card-pro p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Hand className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">Main droite</h4>
                          <p className="text-sm text-gray-600">
                            {donnees.empreintes.filter(e => e.main === 'droite').length} empreinte(s)
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {donnees.empreintes.filter(e => e.main === 'droite').map((emp, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                              <Fingerprint className="text-white" size={20} />
                            </div>
                            <span className="text-sm font-bold text-gray-900">{emp.doigt}</span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${
                              emp.qualite >= 80 ? 'text-emerald-600' : emp.qualite >= 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {emp.qualite}%
                            </div>
                            <p className="text-xs text-gray-500">Qualité</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                  <div className="inline-flex p-6 bg-white rounded-full mb-4 shadow-lg">
                    <Fingerprint className="text-gray-400" size={48} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Aucune empreinte disponible</h4>
                  <p className="text-gray-500 text-sm">Les empreintes digitales apparaîtront ici</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal pour photo agrandie */}
      {photoAgrandie && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 animate-fadeIn">
          <button
            onClick={() => setPhotoAgrandie(null)}
            className="absolute top-6 right-6 p-3 bg-white rounded-full hover:bg-gray-100 transition-all hover:scale-110 shadow-xl"
          >
            <span className="text-2xl font-bold text-gray-700">×</span>
          </button>

          <div className="max-w-4xl w-full">
            <img
              src={photoAgrandie.url}
              alt="Photo agrandie"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            
            <div className="bg-white mt-4 p-6 rounded-xl shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    {(() => {
                      const config = getProfilConfig(photoAgrandie.typeProfil);
                      const Icone = config.icone;
                      return (
                        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${config.bg} text-white`}>
                          <Icone size={16} />
                          <span className="text-sm font-bold">{config.label}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-gray-600 flex items-center">
                    <Calendar size={14} className="mr-1.5" />
                    {new Date(photoAgrandie.date).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionneuseBiometrique;

