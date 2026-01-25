import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, Check, ChevronLeft, ChevronRight, User, Calendar, MapPin, AlertCircle, CheckCircle2, Shield, Info, Loader2, Eye } from 'lucide-react';
import Bouton from '../commun/Bouton';
import { validateImageISO19794_5 } from '../../src/utils/imageStandardsValidator';
import { useNotification } from '../../src/context/NotificationContext';
import api from '../../src/services/api';
import { API_BASE_URL } from '../../src/config/api';

const TeleverseurPhoto = ({ onUpload, maxFiles = 3, acceptedFormats = ['image/jpeg', 'image/png'] }) => {
  const [photosParProfil, setPhotosParProfil] = useState({
    gauche: null,
    face: null,
    droit: null
  });
  const [metadonnees, setMetadonnees] = useState({
    dateCapture: new Date().toISOString().split('T')[0],
    lieu: '',
    notes: ''
  });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [validationISO, setValidationISO] = useState({
    gauche: null,
    face: null,
    droit: null
  });
  const [afficherDetailsISO, setAfficherDetailsISO] = useState(false);
  const [landmarks106, setLandmarks106] = useState({
    gauche: null,
    face: null,
    droit: null
  });
  const [analysing, setAnalysing] = useState({
    gauche: false,
    face: false,
    droit: false
  });
  const [analysingComplete, setAnalysingComplete] = useState({
    gauche: false,
    face: false,
    droit: false
  });
  const [analyseCompleteResults, setAnalyseCompleteResults] = useState({
    gauche: null,
    face: null,
    droit: null
  });
  const canvasRefs = {
    gauche: useRef(null),
    face: useRef(null),
    droit: useRef(null)
  };
  const imageRefs = {
    gauche: useRef(null),
    face: useRef(null),
    droit: useRef(null)
  };
  const notification = useNotification();
  
  const fileInputRefs = {
    gauche: useRef(null),
    face: useRef(null),
    droit: useRef(null)
  };

  const profilesConfig = [
    {
      type: 'gauche',
      label: 'Profil gauche',
      description: '90° gauche',
      icone: ChevronLeft,
      couleur: 'blue',
      placeholder: 'Téléverser le profil gauche'
    },
    {
      type: 'face',
      label: 'Profil face',
      description: '0° frontal',
      icone: User,
      couleur: 'emerald',
      placeholder: 'Téléverser le profil frontal',
      required: true
    },
    {
      type: 'droit',
      label: 'Profil droit',
      description: '90° droit',
      icone: ChevronRight,
      couleur: 'purple',
      placeholder: 'Téléverser le profil droit'
    },
  ];

  const handleFileSelect = async (typeProfil, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErreur('');
    setSucces('');
    setEnCours(true);

    try {
      // Vérifier le format
      if (!acceptedFormats.includes(file.type)) {
        setErreur(`Format non accepté: ${file.name}. Utilisez JPG ou PNG.`);
        setEnCours(false);
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErreur('La photo ne doit pas dépasser 10 MB');
        setEnCours(false);
        return;
      }

      // Validation ISO/IEC 19794-5
      console.log(' Validation ISO/IEC 19794-5 en cours...');
      const isoValidation = await validateImageISO19794_5(file);
      
      // Stocker la validation ISO
      setValidationISO(prev => ({
        ...prev,
        [typeProfil]: isoValidation
      }));

      // Afficher les avertissements ISO si nécessaire
      if (isoValidation.warnings.length > 0) {
        console.warn(' Avertissements ISO:', isoValidation.warnings);
      }

      // Bloquer si erreurs critiques
      if (!isoValidation.isValid) {
        setErreur(
          `Image non conforme ISO/IEC 19794-5: ${isoValidation.errors[0].message}`
        );
        setEnCours(false);
        return;
      }

      // Créer la preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotosParProfil(prev => ({
          ...prev,
          [typeProfil]: {
            file: file,
            url: reader.result,
            nom: file.name,
            taille: file.size,
            isoCompliant: isoValidation.isCompliant,
            qualityScore: isoValidation.metadata?.qualityScore || 0
          }
        }));
        setEnCours(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErreur(`Erreur de validation: ${error.message}`);
      setEnCours(false);
    }
  };

  const supprimerPhoto = (typeProfil) => {
    setPhotosParProfil(prev => ({
      ...prev,
      [typeProfil]: null
    }));
    setValidationISO(prev => ({
      ...prev,
      [typeProfil]: null
    }));
    setLandmarks106(prev => ({
      ...prev,
      [typeProfil]: null
    }));
    setAnalyseCompleteResults(prev => ({
      ...prev,
      [typeProfil]: null
    }));
    // Nettoyer le canvas
    const canvas = canvasRefs[typeProfil].current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setErreur('');
    setSucces('');
  };

  const handleUpload = async () => {
    setErreur('');
    setSucces('');

    // Vérifier qu'au moins le profil frontal est présent
    if (!photosParProfil.face) {
      setErreur('Le profil frontal est obligatoire');
      return;
    }

    setEnCours(true);

    try {
      const formData = new FormData();
      
      // Ajouter les photos
      Object.keys(photosParProfil).forEach(type => {
        if (photosParProfil[type]) {
          formData.append(`photo_${type}`, photosParProfil[type].file);
        }
      });

      // Ajouter les métadonnées
      formData.append('dateCapture', metadonnees.dateCapture);
      formData.append('lieu', metadonnees.lieu);
      formData.append('notes', metadonnees.notes);

      await onUpload(formData);
      
      // Réinitialiser après succès
      setPhotosParProfil({
        gauche: null,
        face: null,
        droit: null
      });
      setMetadonnees({
        dateCapture: new Date().toISOString().split('T')[0],
        lieu: '',
        notes: ''
      });
      setSucces('Photos téléversées avec succès !');
    } catch (error) {
      setErreur(error.message || 'Erreur lors du téléversement');
    } finally {
      setEnCours(false);
    }
  };

  const formatTaille = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Fonction pour l'analyse biométrique complète
  const analyserComplete = async (typeProfil) => {
    const photo = photosParProfil[typeProfil];
    if (!photo || !photo.file) {
      notification.showError('Aucune photo sélectionnée pour ce profil');
      return;
    }

    setAnalysingComplete(prev => ({ ...prev, [typeProfil]: true }));
    setErreur('');

    try {
      const formData = new FormData();
      formData.append('image', photo.file);

      const response = await api.post('/biometrie/analyse/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setAnalyseCompleteResults(prev => ({
          ...prev,
          [typeProfil]: response.data
        }));
        
        // Mettre à jour aussi les landmarks106 si disponibles
        if (response.data.landmarks106 && response.data.landmarks106.length > 0) {
          setLandmarks106(prev => ({
            ...prev,
            [typeProfil]: {
              landmarks: response.data.landmarks106,
              bbox: response.data.bbox,
              confidence: response.data.confidence || 1.0
            }
          }));
          
          // Dessiner les landmarks
          setTimeout(() => {
            dessinerLandmarks(typeProfil, photo.url, response.data.landmarks106, response.data.bbox);
          }, 100);
        }
        
        notification.showSuccess('Analyse biométrique complète terminée avec succès');
      } else {
        setErreur(response.data.error || 'Erreur lors de l\'analyse complète');
        notification.showError(response.data.error || 'Erreur lors de l\'analyse complète');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de l\'analyse biométrique complète';
      setErreur(errorMessage);
      notification.showError(errorMessage);
    } finally {
      setAnalysingComplete(prev => ({ ...prev, [typeProfil]: false }));
    }
  };

  // Fonction pour analyser les 106 landmarks d'une photo
  const analyserLandmarks106 = async (typeProfil) => {
    const photo = photosParProfil[typeProfil];
    if (!photo || !photo.file) {
      notification.showError('Aucune photo sélectionnée pour ce profil');
      return;
    }

    setAnalysing(prev => ({ ...prev, [typeProfil]: true }));
    setErreur('');

    try {
      const formData = new FormData();
      formData.append('image', photo.file);

      const response = await api.post('/biometrie/landmarks106/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.landmarks) {
        setLandmarks106(prev => ({
          ...prev,
          [typeProfil]: response.data
        }));
        
        // Dessiner les landmarks et le bounding box sur le canvas après que l'image soit chargée
        setTimeout(() => {
          dessinerLandmarks(typeProfil, photo.url, response.data.landmarks, response.data.bbox);
        }, 100);
      } else {
        setErreur(response.data.error || 'Aucun visage détecté. Réessayer.');
        notification.showError(response.data.error || 'Aucun visage détecté. Réessayer.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de l\'analyse biométrique';
      setErreur(errorMessage);
      notification.showError(errorMessage);
    } finally {
      setAnalysing(prev => ({ ...prev, [typeProfil]: false }));
    }
  };

  // Fonction pour obtenir les connexions du maillage facial
  const getFaceMeshConnections = () => {
    const connections = []
    for (let i = 0; i < 16; i++) connections.push([i, i + 1])
    for (let i = 17; i < 21; i++) connections.push([i, i + 1])
    for (let i = 22; i < 26; i++) connections.push([i, i + 1])
    for (let i = 27; i < 35; i++) connections.push([i, i + 1])
    for (let i = 36; i < 41; i++) connections.push([i, i + 1])
    connections.push([41, 36])
    for (let i = 42; i < 47; i++) connections.push([i, i + 1])
    connections.push([47, 42])
    for (let i = 48; i < 59; i++) connections.push([i, i + 1])
    connections.push([59, 48])
    for (let i = 60; i < 67; i++) connections.push([i, i + 1])
    connections.push([67, 60])
    connections.push([27, 30], [30, 33], [33, 51], [51, 57])
    connections.push([36, 42], [39, 45], [0, 36], [16, 45])
    for (let i = 0; i < 16; i += 2) {
      if (i + 2 <= 16) connections.push([i, i + 2])
    }
    return connections
  }

  // Fonction pour dessiner les landmarks sur le canvas
  const dessinerLandmarks = (typeProfil, imageUrl, landmarks, bbox) => {
    const canvas = canvasRefs[typeProfil].current;
    const imageElement = imageRefs[typeProfil].current;
    
    if (!canvas || !imageElement || !landmarks || landmarks.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const displayedWidth = imageElement.offsetWidth;
      const displayedHeight = imageElement.offsetHeight;
      const scaleX = displayedWidth / img.width;
      const scaleY = displayedHeight / img.height;

      canvas.width = displayedWidth;
      canvas.height = displayedHeight;

      // Convertir les landmarks
      const scaledLandmarks = landmarks.map((point) => {
        if (point && point.length === 2) {
          return { x: point[0] * scaleX, y: point[1] * scaleY }
        }
        return null
      }).filter(p => p !== null)

      // Dessiner les points avec une seule couleur (bleu)
      ctx.fillStyle = '#3b82f6'; // Bleu uniforme
      scaledLandmarks.forEach((point) => {
        if (point) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    };
    
    img.src = imageUrl;
  };

  // Effet pour redessiner les landmarks lors du redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      Object.keys(landmarks106).forEach((typeProfil) => {
        if (landmarks106[typeProfil] && photosParProfil[typeProfil]) {
          dessinerLandmarks(
            typeProfil,
            photosParProfil[typeProfil].url,
            landmarks106[typeProfil].landmarks,
            landmarks106[typeProfil].bbox
          );
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [landmarks106, photosParProfil]);

  const nombrePhotos = Object.values(photosParProfil).filter(p => p !== null).length;
  const progressPercentage = (nombrePhotos / 3) * 100;
  
  // Calculer le score de qualité moyen ISO
  const qualityScores = Object.values(photosParProfil)
    .filter(p => p !== null)
    .map(p => p.qualityScore || 0);
  const avgQualityScore = qualityScores.length > 0 
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : 0;
    
  // Vérifier si toutes les photos sont conformes ISO
  const allCompliant = Object.values(photosParProfil)
    .filter(p => p !== null)
    .every(p => p.isoCompliant);

  return (
    <div className="space-y-6">
      {/* En-tête avec progression */}
      <div className="card-pro p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl shadow-lg">
              <Camera className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Téléversement de photos criminelles</h3>
              <p className="text-sm text-gray-600">Ajoutez les 3 profils d'identification du suspect</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-pink-600">{nombrePhotos}/3</div>
            <p className="text-xs text-gray-500">Photos ajoutées</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="relative">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center font-medium">
            {progressPercentage === 100 ? ' Tous les profils sont prêts' : 
             progressPercentage > 0 ? `${Math.round(progressPercentage)}% complété` : 
             'Commencez par téléverser le profil frontal'}
          </p>
        </div>
      </div>

      {/* Badge de conformité ISO/IEC 19794-5 */}
      {nombrePhotos > 0 && (
        <div className={`card-pro p-4 border-2 ${allCompliant ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className={allCompliant ? 'text-green-600' : 'text-yellow-600'} size={24} />
              <div>
                <p className="font-bold text-gray-900">
                  {allCompliant ? ' Conformité ISO/IEC 19794-5' : ' Conformité partielle'}
                </p>
                <p className="text-sm text-gray-600">
                  Qualité moyenne: <span className="font-semibold">{avgQualityScore}%</span> • 
                  Standard: Format d'images faciales biométriques
                </p>
              </div>
            </div>
            <button
              onClick={() => setAfficherDetailsISO(!afficherDetailsISO)}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold text-gray-700 transition-all flex items-center space-x-1"
            >
              <Info size={16} />
              <span>{afficherDetailsISO ? 'Masquer' : 'Détails'}</span>
            </button>
          </div>

          {/* Détails ISO collapsible */}
          {afficherDetailsISO && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(validationISO).map(([type, validation]) => {
                if (!validation) return null;
                const config = profilesConfig.find(p => p.type === type);
                return (
                  <div key={type} className="bg-white rounded-lg p-3 border-2 border-gray-200">
                    <p className="text-sm font-bold text-gray-900 mb-2">{config?.label}</p>
                    <div className="space-y-1 text-xs">
                      <p className={`font-semibold ${validation.isCompliant ? 'text-green-600' : 'text-yellow-600'}`}>
                        {validation.isCompliant ? ' Conforme' : ' Avertissements'}
                      </p>
                      <p className="text-gray-600">
                        Qualité: {validation.metadata?.qualityScore || 0}%
                      </p>
                      <p className="text-gray-600">
                        Dimensions: {validation.metadata?.width}×{validation.metadata?.height}px
                      </p>
                      {validation.warnings.length > 0 && (
                        <p className="text-yellow-600 mt-2">
                          {validation.warnings[0].message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Messages d'erreur et succès */}
      {erreur && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center animate-slideInRight">
          <AlertCircle className="text-red-600 mr-3 flex-shrink-0" size={24} />
          <p className="text-red-700 font-medium">{erreur}</p>
        </div>
      )}

      {succes && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-center animate-slideInRight">
          <CheckCircle2 className="text-emerald-600 mr-3 flex-shrink-0" size={24} />
          <p className="text-emerald-700 font-medium">{succes}</p>
        </div>
      )}

      {/* Grille des 3 profils */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {profilesConfig.map((config) => {
          const Icone = config.icone;
          const photo = photosParProfil[config.type];
          const isRequired = config.required;

          return (
            <div key={config.type} className="card-pro-hover p-5 relative">
              {/* Badge requis */}
              {isRequired && (
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                    OBLIGATOIRE
                  </span>
                </div>
              )}

              {/* En-tête du profil */}
              <div className="mb-4 pb-4 border-b-2 border-gray-100">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  config.couleur === 'blue' ? 'bg-blue-100' :
                  config.couleur === 'emerald' ? 'bg-emerald-100' :
                  'bg-purple-100'
                }`}>
                  <Icone className={
                    config.couleur === 'blue' ? 'text-blue-600' :
                    config.couleur === 'emerald' ? 'text-emerald-600' :
                    'text-purple-600'
                  } size={32} />
                </div>
                <h4 className={`text-lg font-bold text-center mb-1 ${
                  config.couleur === 'blue' ? 'text-blue-700' :
                  config.couleur === 'emerald' ? 'text-emerald-700' :
                  'text-purple-700'
                }`}>
                  {config.label}
                </h4>
                <p className="text-xs text-gray-500 text-center font-medium">{config.description}</p>
              </div>

              {/* Zone de téléversement ou preview */}
              {!photo ? (
                <div
                  onClick={() => fileInputRefs[config.type].current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all group ${
                    config.couleur === 'blue' ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50' :
                    config.couleur === 'emerald' ? 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50' :
                    'border-purple-300 hover:border-purple-500 hover:bg-purple-50'
                  }`}
                >
                  <Upload className={`mx-auto mb-3 group-hover:scale-110 transition-transform ${
                    config.couleur === 'blue' ? 'text-blue-400 group-hover:text-blue-600' :
                    config.couleur === 'emerald' ? 'text-emerald-400 group-hover:text-emerald-600' :
                    'text-purple-400 group-hover:text-purple-600'
                  }`} size={40} />
                  <p className="text-sm text-gray-700 font-medium mb-1">
                    Cliquer pour téléverser
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG • Max 10MB
                  </p>
                  <input
                    ref={fileInputRefs[config.type]}
                    type="file"
                    accept={acceptedFormats.join(',')}
                    onChange={(e) => handleFileSelect(config.type, e)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview de l'image avec canvas superposé pour les landmarks */}
                  <div className="relative group">
                    <div className="relative">
                      <img
                        ref={imageRefs[config.type]}
                        src={photo.url}
                        alt={config.label}
                        className="w-full h-48 object-cover rounded-xl border-4 border-gray-200"
                      />
                      {/* Canvas superposé pour afficher les 106 landmarks */}
                      <canvas
                        ref={canvasRefs[config.type]}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{ maxHeight: '192px' }}
                      />
                    </div>
                    <div className={`absolute top-2 left-2 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow-lg ${
                      config.couleur === 'blue' ? 'bg-blue-600' :
                      config.couleur === 'emerald' ? 'bg-emerald-600' :
                      'bg-purple-600'
                    }`}>
                       Téléversé
                    </div>
                    {/* Badge de conformité ISO */}
                    <div className={`absolute top-2 right-12 px-2 py-1 text-xs font-bold rounded-lg shadow-lg ${
                      photo.isoCompliant ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {photo.isoCompliant ? ' ISO' : ' ISO'} {photo.qualityScore}%
                    </div>
                    {/* Badge landmarks si analysé */}
                    {landmarks106[config.type] && (
                      <div className="absolute top-2 right-24 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-lg">
                        ✓ 106 pts
                      </div>
                    )}
                    {/* Badge analyse complète si effectuée */}
                    {analyseCompleteResults[config.type] && (
                      <div className="absolute top-2 right-36 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-lg shadow-lg">
                        ✓ Complète
                      </div>
                    )}
                    <button
                      onClick={() => supprimerPhoto(config.type)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Bouton Analyse complète */}
                  <button
                    onClick={() => analyserComplete(config.type)}
                    disabled={analysingComplete[config.type] || analysing[config.type]}
                    className={`w-full px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 mb-2 ${
                      analysingComplete[config.type] || analysing[config.type]
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : analyseCompleteResults[config.type]
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                        : 'bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800'
                    }`}
                  >
                    {analysingComplete[config.type] ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Analyse complète en cours…</span>
                      </>
                    ) : analyseCompleteResults[config.type] ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Re-analyser complète</span>
                      </>
                    ) : (
                      <>
                        <Shield size={18} />
                        <span>Analyse biométrique complète</span>
                      </>
                    )}
                  </button>

                  {/* Bouton Analyser visage (106 points) */}
                  <button
                    onClick={() => analyserLandmarks106(config.type)}
                    disabled={analysing[config.type] || analysingComplete[config.type]}
                    className={`w-full px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 ${
                      analysing[config.type] || analysingComplete[config.type]
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : landmarks106[config.type]
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    }`}
                  >
                    {analysing[config.type] ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Analyse en cours…</span>
                      </>
                    ) : landmarks106[config.type] ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Re-analyser visage (106 points)</span>
                      </>
                    ) : (
                      <>
                        <Eye size={18} />
                        <span>Analyser visage (106 points)</span>
                      </>
                    )}
                  </button>

                  {/* Info du fichier */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 truncate mb-1">
                       {photo.nom}
                    </p>
                    <p className="text-xs text-gray-500">
                       {formatTaille(photo.taille)}
                    </p>
                    {landmarks106[config.type] && landmarks106[config.type].confidence && (
                      <p className="text-xs text-purple-600 font-semibold mt-1">
                        Confiance: {(landmarks106[config.type].confidence * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>

                  {/* Résultats de l'analyse complète */}
                  {analyseCompleteResults[config.type] && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mt-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-bold text-green-800 flex items-center">
                          <CheckCircle2 size={16} className="mr-2" />
                          Analyse complète terminée
                        </h5>
                        <button
                          onClick={() => setAnalyseCompleteResults(prev => ({ ...prev, [config.type]: null }))}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        {analyseCompleteResults[config.type].embedding512 && (
                          <div className="bg-white rounded-lg p-2">
                            <p className="font-semibold text-gray-700 mb-1">Embedding ArcFace (512-d)</p>
                            <p className="text-gray-600">
                              Dimensions: {analyseCompleteResults[config.type].embedding512.length} • 
                              Premiers: [{analyseCompleteResults[config.type].embedding512.slice(0, 3).map(v => v.toFixed(3)).join(', ')}, ...]
                            </p>
                          </div>
                        )}
                        
                        {analyseCompleteResults[config.type].landmarks106 && (
                          <div className="bg-white rounded-lg p-2">
                            <p className="font-semibold text-gray-700 mb-1">Landmarks 106 points</p>
                            <p className="text-gray-600">
                              Points détectés: {analyseCompleteResults[config.type].landmarks106.length}
                            </p>
                          </div>
                        )}
                        
                        {analyseCompleteResults[config.type].facemesh468 && analyseCompleteResults[config.type].facemesh468.length > 0 && (
                          <div className="bg-white rounded-lg p-2">
                            <p className="font-semibold text-gray-700 mb-1">FaceMesh 468 points 3D</p>
                            <p className="text-gray-600">
                              Points 3D: {analyseCompleteResults[config.type].facemesh468.length}
                            </p>
                          </div>
                        )}
                        
                        {analyseCompleteResults[config.type].morphable3d && Object.keys(analyseCompleteResults[config.type].morphable3d).length > 0 && (
                          <div className="bg-white rounded-lg p-2">
                            <p className="font-semibold text-gray-700 mb-1">Modèle 3D Morphable</p>
                            <p className="text-gray-600">
                              {analyseCompleteResults[config.type].morphable3d.vertices?.length > 0 
                                ? `Vertices: ${analyseCompleteResults[config.type].morphable3d.vertices.length}`
                                : 'Non disponible'}
                            </p>
                          </div>
                        )}
                        
                        {analyseCompleteResults[config.type].warnings && analyseCompleteResults[config.type].warnings.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                            <p className="font-semibold text-yellow-800 mb-1">Avertissements</p>
                            <ul className="list-disc list-inside text-yellow-700 text-xs">
                              {analyseCompleteResults[config.type].warnings.map((warning, idx) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Métadonnées */}
      <div className="card-pro p-6">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center">
          <Camera className="mr-2 text-gray-600" size={20} />
          Métadonnées de capture
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <Calendar className="mr-2 text-blue-600" size={16} />
              Date de capture
            </label>
            <input
              type="date"
              value={metadonnees.dateCapture}
              onChange={(e) => setMetadonnees(prev => ({ ...prev, dateCapture: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <MapPin className="mr-2 text-red-600" size={16} />
              Lieu de capture
            </label>
            <input
              type="text"
              placeholder="Ex: Commissariat d'Antananarivo"
              value={metadonnees.lieu}
              onChange={(e) => setMetadonnees(prev => ({ ...prev, lieu: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes additionnelles (optionnel)
            </label>
            <textarea
              placeholder="Informations complémentaires sur les photos..."
              value={metadonnees.notes}
              onChange={(e) => setMetadonnees(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={async () => {
            const confirmed = await notification.showConfirm({
              title: 'Annuler le téléversement ?',
              message: 'Toutes les photos sélectionnées seront supprimées du formulaire.',
              confirmText: 'Oui, annuler',
              cancelText: 'Continuer'
            });

            if (!confirmed) {
              return;
            }

            setPhotosParProfil({ gauche: null, face: null, droit: null });
            setMetadonnees({ dateCapture: new Date().toISOString().split('T')[0], lieu: '', notes: '' });
            setErreur('');
            setSucces('');
          }}
          className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
          disabled={enCours || nombrePhotos === 0}
        >
          Annuler
        </button>
        <button
          onClick={handleUpload}
          disabled={!photosParProfil.face || enCours}
          className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 shadow-lg ${
            !photosParProfil.face || enCours
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800 hover:scale-105'
          }`}
        >
          {enCours ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Téléversement en cours...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Enregistrer les photos ({nombrePhotos})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TeleverseurPhoto;

