import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, X, AlertCircle } from 'lucide-react';

const PhotoBiometrique = ({ 
  titre, 
  type,
  icone: IconeCustom,
  required = false,
  onUpload 
}) => {
  const [fichier, setFichier] = useState(null);
  const [preview, setPreview] = useState(null);
  const [erreur, setErreur] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
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

    // Créer la preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setFichier(file);
      if (onUpload) {
        onUpload({ type, file, preview: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSupprimer = () => {
    setFichier(null);
    setPreview(null);
    setErreur('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onUpload) {
      onUpload({ type, file: null, preview: null });
    }
  };

  const Icone = IconeCustom || Camera;

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300 relative">
      {/* Badge requis */}
      {required && !preview && (
        <div className="absolute -top-3 -right-3 z-10">
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
            OBLIGATOIRE
          </span>
        </div>
      )}

      {/* En-tête */}
      <div className="text-center mb-4">
        <div className="inline-flex p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-3">
          <Icone className="text-gray-700" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{titre}</h3>
        <p className="text-xs text-gray-500 mt-1">{type}</p>
      </div>

      {/* Zone d'upload ou preview */}
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
        >
          <Upload className="mx-auto text-gray-400 group-hover:text-blue-600 mb-3 group-hover:scale-110 transition-transform" size={48} />
          <p className="text-sm text-gray-700 font-semibold mb-1">
            Cliquez pour téléverser
          </p>
          <p className="text-xs text-gray-500">
            JPG, PNG • Max 10 MB
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
        <div className="relative group">
          <div className="rounded-xl overflow-hidden border-4 border-green-500 shadow-lg">
            <img
              src={preview}
              alt={titre}
              className="w-full h-64 object-cover"
            />
          </div>
          
          {/* Badge enregistré */}
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center space-x-1">
            <Check size={16} />
            <span>Photo enregistrée</span>
          </div>

          {/* Bouton supprimer */}
          <button
            onClick={handleSupprimer}
            className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 hover:scale-110"
          >
            <X size={20} />
          </button>

          {/* Info fichier */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 truncate">
               {fichier.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
               {(fichier.size / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {erreur && (
        <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-2">
          <AlertCircle size={16} className="text-red-600" />
          <p className="text-xs text-red-700 font-medium">{erreur}</p>
        </div>
      )}
    </div>
  );
};

export default PhotoBiometrique;

