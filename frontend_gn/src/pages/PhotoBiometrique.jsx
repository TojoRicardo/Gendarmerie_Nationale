import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, User, ArrowLeft, Info, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PhotoBiometrique = () => {
  const navigate = useNavigate();
  const [photosParProfil, setPhotosParProfil] = useState({
    gauche: null,
    face: null,
    droit: null
  });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  
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
      bgGradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-200',
      iconColor: 'text-blue-700',
      badgeColor: 'bg-blue-500',
      hoverBorder: 'hover:border-blue-500',
      hoverBg: 'hover:bg-blue-50'
    },
    {
      type: 'face',
      label: 'Photo de face',
      description: '0° frontal',
      icone: User,
      couleur: 'green',
      bgGradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-200',
      iconColor: 'text-green-700',
      badgeColor: 'bg-green-500',
      hoverBorder: 'hover:border-green-500',
      hoverBg: 'hover:bg-green-50',
      required: true
    },
    {
      type: 'droit',
      label: 'Profil droit',
      description: '90° droit',
      icone: ChevronRight,
      couleur: 'purple',
      bgGradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-200',
      iconColor: 'text-purple-700',
      badgeColor: 'bg-purple-500',
      hoverBorder: 'hover:border-purple-500',
      hoverBg: 'hover:bg-purple-50'
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
      const acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!acceptedFormats.includes(file.type)) {
        setErreur(`Format non accepté: ${file.name}. Utilisez JPG ou PNG uniquement.`);
        setEnCours(false);
        return;
      }

      // Vérifier la taille (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSize) {
        setErreur('La photo ne doit pas dépasser 10 MB');
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
            taille: file.size
          }
        }));
        setEnCours(false);
        setSucces(` Photo ${typeProfil} ajoutée avec succès`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErreur(`Erreur lors du chargement: ${error.message}`);
      setEnCours(false);
    }
  };

  const supprimerPhoto = (typeProfil) => {
    setPhotosParProfil(prev => ({
      ...prev,
      [typeProfil]: null
    }));
    setErreur('');
    setSucces(`Photo ${typeProfil} supprimée`);
  };

  const handleEnregistrerPhotos = async () => {
    setErreur('');
    setSucces('');

    // Vérifier qu'au moins la photo de face est présente
    if (!photosParProfil.face) {
      setErreur(' La photo de face est obligatoire');
      return;
    }

    setEnCours(true);

    try {
      // Simulation de l'envoi des photos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSucces(' Photos enregistrées avec succès !');
      
      // Réinitialiser après succès (optionnel)
      setTimeout(() => {
        setPhotosParProfil({
          gauche: null,
          face: null,
          droit: null
        });
        setSucces('');
      }, 3000);
    } catch (error) {
      setErreur(` Erreur: ${error.message}`);
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

  const nombrePhotos = Object.values(photosParProfil).filter(p => p !== null).length;
  const progressPercentage = (nombrePhotos / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* En-tête */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Retour
        </button>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl shadow-lg">
                <Camera className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Gestion des Photos Biométriques
                </h1>
                <p className="text-gray-600 mt-1">
                  Module de capture et gestion des photos d'identification criminelle
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-pink-600">{nombrePhotos}/3</div>
              <p className="text-sm text-gray-500">Photos ajoutées</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-6">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center font-medium">
              {progressPercentage === 100 ? ' Tous les profils sont prêts' : 
               progressPercentage > 0 ? `${Math.round(progressPercentage)}% complété` : 
               'Commencez par téléverser la photo de face'}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Types de profils d'identification */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-blue-100 rounded-full mr-3">
            <Info className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Types de profils d'identification
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Les 3 angles requis pour une identification biométrique complète
            </p>
          </div>
        </div>

        {/* Les 3 cartes de profils informationnelles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Profil Gauche - Info */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex flex-col items-center mb-4">
              <div className="p-4 bg-blue-200 rounded-full mb-3">
                <ChevronLeft className="text-blue-700" size={32} />
              </div>
              <span className="px-4 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">
                90° gauche
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
              Profil gauche
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Photo du visage vue de côté gauche (oreille gauche visible, regard droit)
            </p>
            <div className="bg-white/50 rounded-lg p-3">
              <p className="text-xs text-gray-600 italic">
                <span className="font-semibold">Usage:</span> Permet de voir la forme du nez, des pommettes, du menton du côté gauche.
              </p>
            </div>
          </div>

          {/* Profil Face - Info */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
            <div className="flex flex-col items-center mb-4">
              <div className="p-4 bg-green-200 rounded-full mb-3">
                <User className="text-green-700" size={32} />
              </div>
              <span className="px-4 py-1 bg-green-500 text-white rounded-full text-sm font-bold">
                0° frontal
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
              Photo de face
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Photo du visage de face, regard droit vers la caméra
            </p>
            <div className="bg-white/50 rounded-lg p-3">
              <p className="text-xs text-gray-600 italic">
                <span className="font-semibold">Usage:</span> C'est la photo principale d'identification utilisée pour la reconnaissance faciale.
              </p>
            </div>
          </div>

          {/* Profil Droit - Info */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
            <div className="flex flex-col items-center mb-4">
              <div className="p-4 bg-purple-200 rounded-full mb-3">
                <ChevronRight className="text-purple-700" size={32} />
              </div>
              <span className="px-4 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">
                90° droit
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
              Profil droit
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Photo du visage vue de côté droit (oreille droite visible, regard droit)
            </p>
            <div className="bg-white/50 rounded-lg p-3">
              <p className="text-xs text-gray-600 italic">
                <span className="font-semibold">Usage:</span> Même principe, mais de l'autre côté — utile pour la symétrie faciale.
              </p>
            </div>
          </div>
        </div>

        {/* Note importante */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-start">
          <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0 mt-1" size={24} />
          <div>
            <p className="text-sm font-semibold text-yellow-900">
              Note importante :
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              Pour une identification biométrique complète, il est recommandé de capturer les trois angles (gauche, face, droit) du visage du suspect.
            </p>
          </div>
        </div>
      </div>

      {/* Messages de feedback */}
      {erreur && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center animate-slideInRight">
          <AlertCircle className="text-red-600 mr-3 flex-shrink-0" size={24} />
          <p className="text-red-700 font-medium">{erreur}</p>
        </div>
      )}

      {succes && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl flex items-center animate-slideInRight">
          <CheckCircle className="text-green-600 mr-3 flex-shrink-0" size={24} />
          <p className="text-green-700 font-medium">{succes}</p>
        </div>
      )}

      {/* Section: Téléversement des photos */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-center mb-6 pb-4 border-b-2 border-pink-200">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl shadow-lg mr-3">
            <Camera className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
               Téléversement des Photos
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Cliquez sur chaque zone pour téléverser les photos biométriques
            </p>
          </div>
        </div>

        {/* Grille des 3 profils - Upload */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profilesConfig.map((config) => {
            const Icone = config.icone;
            const photo = photosParProfil[config.type];
            const isRequired = config.required;

            return (
              <div key={config.type} className="relative bg-white rounded-xl shadow-md border-2 border-gray-200 p-5 hover:shadow-xl transition-all">
                {/* Badge requis */}
                {isRequired && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                      OBLIGATOIRE
                    </span>
                  </div>
                )}

                {/* En-tête du profil */}
                <div className="mb-4 pb-4 border-b-2 border-gray-100">
                  <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${config.iconBg}`}>
                    <Icone className={config.iconColor} size={32} />
                  </div>
                  <h4 className={`text-lg font-bold text-center mb-1 ${config.iconColor}`}>
                    {config.label}
                  </h4>
                  <p className="text-xs text-gray-500 text-center font-medium">{config.description}</p>
                </div>

                {/* Zone de téléversement ou preview */}
                {!photo ? (
                  <div
                    onClick={() => fileInputRefs[config.type].current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all group ${config.borderColor} ${config.hoverBorder} ${config.hoverBg}`}
                  >
                    <Upload className={`mx-auto mb-3 group-hover:scale-110 transition-transform ${config.iconColor}`} size={48} />
                    <p className="text-sm text-gray-700 font-semibold mb-1">
                      Cliquez pour téléverser la photo
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG • Max 10 MB
                    </p>
                    <input
                      ref={fileInputRefs[config.type]}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => handleFileSelect(config.type, e)}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Preview de l'image */}
                    <div className="relative group">
                      <img
                        src={photo.url}
                        alt={config.label}
                        className="w-full h-64 object-cover rounded-xl border-4 border-gray-200 shadow-md"
                      />
                      <div className={`absolute top-2 left-2 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow-lg ${config.badgeColor}`}>
                         Téléversé
                      </div>
                      <button
                        onClick={() => supprimerPhoto(config.type)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Info du fichier */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 truncate mb-1 font-medium">
                         {photo.nom}
                      </p>
                      <p className="text-xs text-gray-500">
                         Taille: {formatTaille(photo.taille)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bouton d'enregistrement */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="text-indigo-600" size={24} />
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {nombrePhotos === 0 && 'Aucune photo téléversée'}
                {nombrePhotos === 1 && '1 photo prête à être enregistrée'}
                {nombrePhotos > 1 && `${nombrePhotos} photos prêtes à être enregistrées`}
              </p>
              <p className="text-xs text-gray-500">
                {!photosParProfil.face && 'La photo de face est obligatoire'}
                {photosParProfil.face && 'Vous pouvez maintenant enregistrer'}
              </p>
            </div>
          </div>
          <button
            onClick={handleEnregistrerPhotos}
            disabled={!photosParProfil.face || enCours}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center space-x-3 shadow-lg ${
              !photosParProfil.face || enCours
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800 hover:scale-105'
            }`}
          >
            {enCours ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle size={24} />
                <span>Enregistrer les photos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoBiometrique;

