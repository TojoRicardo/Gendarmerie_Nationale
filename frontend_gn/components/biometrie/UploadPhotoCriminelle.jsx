import React, { useState, useRef } from 'react';
import { Camera, Fingerprint, Upload, X, AlertCircle } from 'lucide-react';

/**
 * Composant UploadPhotoCriminelle
 * Interface moderne pour l'upload de photos criminelles
 * Design conforme à l'image fournie avec carte blanche et zone d'upload
 * 
 * @param {Object} props
 * @param {Function} props.onUpload - Callback appelé après sélection (reçoit {file, preview})
 * @param {Function} props.onRemove - Callback appelé lors de la suppression
 * @param {string} props.titre - Titre de la carte (défaut: "Photo de face")
 * @param {boolean} props.required - Si la photo est obligatoire (défaut: true)
 * @param {string} props.note - Note explicative en bas (défaut: note ArcFace)
 * @param {string} props.typePhoto - Type de photo (face, profil_gauche, profil_droit, etc.)
 */
const UploadPhotoCriminelle = ({ 
  onUpload, 
  onRemove,
  titre = "Photo de face",
  required = true,
  note = "* Obligatoire pour l'extraction biométrique (embedding ArcFace)",
  typePhoto = "face",
  isScanning = false,
  icone: IconeCustom = null,
  visagesDetectes = [],
  visageSelectionne = null,
  onVisageSelect = null,
  imageRef = null
}) => {
  const [fichier, setFichier] = useState(null);
  const [preview, setPreview] = useState(null);
  const [erreur, setErreur] = useState('');
  const fileInputRef = useRef(null);

  /**
   * Gestion de la sélection de fichier
   */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErreur('');

    // Vérifier le format
    const formatsAcceptes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!formatsAcceptes.includes(file.type)) {
      setErreur('Format non accepté. Utilisez JPG ou PNG uniquement');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErreur('La photo ne doit pas dépasser 10 MB');
      return;
    }

    setFichier(file);

    // Créer la prévisualisation IMMÉDIATEMENT pour afficher l'image tout de suite
    const reader = new FileReader();
    reader.onloadend = () => {
      // Afficher l'image immédiatement
      setPreview(reader.result);
      // Notifier le parent pour déclencher la détection des visages
      if (onUpload) {
        onUpload({ file, preview: reader.result, typePhoto });
      }
    };
    // Lire le fichier en base64 pour affichage immédiat
    reader.readAsDataURL(file);
  };

  /**
   * Suppression de la photo
   */
  const handleRemove = () => {
    setFichier(null);
    setPreview(null);
    setErreur('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  /**
   * Gestion du drag & drop
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
      {/* En-tête avec icône et titre */}
      <div className="flex items-center mb-6">
        <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
          <Camera className="text-blue-500" size={18} />
        </div>
        <h3 className="text-base font-semibold text-gray-900">
          {titre}
        </h3>
        {required && (
          <span className="text-red-500 ml-1.5 text-lg font-bold">*</span>
        )}
      </div>

      {/* Zone d'upload ou preview */}
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-0 rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-gray-50"
        >
          {/* Cercle avec icône upload */}
          <div className="w-28 h-28 mx-auto mb-5 bg-blue-100 rounded-full flex items-center justify-center">
            {IconeCustom ? (
              <IconeCustom className="text-blue-500" size={48} />
            ) : (
              <Upload className="text-blue-500" size={48} />
            )}
          </div>

          <p className="text-base font-bold text-gray-800 mb-1.5">
            Cliquez pour sélectionner
          </p>
          <p className="text-sm text-gray-500 mb-2">
            ou glissez-déposez l'image
          </p>
          <p className="text-xs text-gray-400">
            {required ? 'JPG, PNG (max 10MB)' : 'JPG, PNG (Optionnel)'}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <div className="rounded-xl overflow-hidden border-2 border-green-400 shadow-md relative">
            <img
              ref={imageRef}
              src={preview}
              alt={titre}
              className="w-full h-64 object-contain bg-gray-50"
              style={{ display: 'block' }}
              onLoad={(e) => {
                // L'image est chargée, les rectangles s'afficheront automatiquement
                // Force un re-render si nécessaire
                if (visagesDetectes.length > 0) {
                  // Les rectangles seront calculés et affichés
                }
              }}
            />
            
            {/* Affichage de tous les visages détectés avec rectangles - affiché immédiatement */}
            {visagesDetectes.length > 0 && preview && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {visagesDetectes.map((visage, index) => {
                  const imgElement = imageRef?.current;
                  
                  // Si l'image n'est pas encore chargée, attendre un peu
                  if (!imgElement || !visage.bbox || !Array.isArray(visage.bbox) || visage.bbox.length < 4) {
                    return null;
                  }

                  // Si l'image n'a pas encore ses dimensions naturelles, attendre
                  if (imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
                    // Retourner null mais les rectangles apparaîtront dès que l'image sera chargée
                    return null;
                  }

                  const imgWidth = imgElement.offsetWidth;
                  const imgHeight = imgElement.offsetHeight;
                  const imgNaturalWidth = imgElement.naturalWidth;
                  const imgNaturalHeight = imgElement.naturalHeight;

                  // Calculer le ratio de mise à l'échelle
                  const scaleX = imgWidth / imgNaturalWidth;
                  const scaleY = imgHeight / imgNaturalHeight;

                  // Coordonnées du bounding box (format: [x1, y1, x2, y2] ou [x, y, width, height])
                  let x1, y1, x2, y2;
                  if (visage.bbox.length === 4) {
                    // Format [x1, y1, x2, y2]
                    [x1, y1, x2, y2] = visage.bbox;
                  } else {
                    return null;
                  }

                  const left = Math.max(0, x1 * scaleX);
                  const top = Math.max(0, y1 * scaleY);
                  const width = Math.min(imgWidth - left, (x2 - x1) * scaleX);
                  const height = Math.min(imgHeight - top, (y2 - y1) * scaleY);

                  const isSelected = visageSelectionne?.id === visage.id;

                  return (
                    <React.Fragment key={visage.id}>
                      {/* Rectangle de sélection */}
                      <div
                        className={`absolute border-2 pointer-events-auto cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/50' 
                            : 'border-blue-400 bg-blue-400/10 hover:border-blue-500 hover:bg-blue-500/20'
                        }`}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                        }}
                        onClick={() => {
                          if (onVisageSelect) {
                            onVisageSelect(visage);
                          }
                        }}
                      />
                      {/* Badge numéro du visage */}
                      <div 
                        className={`absolute px-2 py-0.5 rounded text-xs font-bold z-30 pointer-events-auto cursor-pointer ${
                          isSelected ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                        }`}
                        style={{
                          left: `${left}px`,
                          top: `${Math.max(-24, top - 24)}px`,
                        }}
                        onClick={() => {
                          if (onVisageSelect) {
                            onVisageSelect(visage);
                          }
                        }}
                      >
                        Visage {index + 1}
                      </div>
                      {/* Badge confiance */}
                      {visage.confidence && (
                        <div 
                          className="absolute px-2 py-0.5 rounded text-xs bg-gray-800 text-white z-30"
                          style={{
                            left: `${left}px`,
                            top: `${top + height + 4}px`,
                          }}
                        >
                          {(visage.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Animation Scanning Line - affichée pendant le scan */}
            {isScanning && (
              <>
                <style>{`
                  @keyframes scanLineMove {
                    0% {
                      top: 0%;
                      opacity: 0;
                    }
                    2% {
                      opacity: 1;
                    }
                    98% {
                      opacity: 1;
                    }
                    100% {
                      top: 100%;
                      opacity: 0;
                    }
                  }
                  @keyframes scanLineGlow {
                    0%, 100% {
                      box-shadow: 0 0 10px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.4), 0 0 30px rgba(59, 130, 246, 0.2);
                    }
                    50% {
                      box-shadow: 0 0 20px rgba(59, 130, 246, 1), 0 0 40px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4);
                    }
                  }
                `}</style>
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                  {/* Ligne de balayage principale */}
                  <div 
                    className="absolute left-0 right-0 bg-gradient-to-b from-transparent via-blue-500 to-transparent"
                    style={{
                      height: '4px',
                      animation: 'scanLineMove 1.5s linear infinite, scanLineGlow 1.5s ease-in-out infinite',
                      top: '0%',
                      willChange: 'top'
                    }}
                  />
                  {/* Effet de lueur supplémentaire */}
                  <div 
                    className="absolute left-0 right-0 bg-blue-400 opacity-50 blur-sm"
                    style={{
                      height: '8px',
                      animation: 'scanLineMove 1.5s linear infinite',
                      top: '0%',
                      willChange: 'top'
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg z-20"
            title="Supprimer la photo"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Message d'erreur */}
      {erreur && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle size={16} className="text-red-600" />
          <p className="text-xs text-red-700">{erreur}</p>
        </div>
      )}

      {/* Note en bas */}
      {note && (
        <div className={`mt-5 ${required ? 'text-left' : 'text-center'}`}>
          <p className={`text-xs ${required ? 'text-red-600' : 'text-gray-500'}`}>
            {note}
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadPhotoCriminelle;
