import React, { useState, useRef } from 'react';
import { Hand, Upload, Check, X, AlertCircle } from 'lucide-react';

const EmpreintePalmaire = ({ 
  titre,
  couleur = 'blue',
  onUpload,
  fichier
}) => {
  const [preview, setPreview] = useState(null);
  const [erreur, setErreur] = useState('');
  const fileInputRef = useRef(null);

  const couleursConfig = {
    pink: {
      bg: 'from-pink-50 to-pink-100',
      border: 'border-pink-300',
      hover: 'hover:border-pink-400',
      icon: 'text-pink-500',
      badge: 'bg-pink-500'
    },
    blue: {
      bg: 'from-blue-50 to-blue-100',
      border: 'border-blue-300',
      hover: 'hover:border-blue-400',
      icon: 'text-blue-500',
      badge: 'bg-blue-500'
    }
  };

  const config = couleursConfig[couleur];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErreur('');

    // Vérifier le format
    const formatsAcceptes = ['image/jpeg', 'image/png', 'image/bmp'];
    if (!formatsAcceptes.includes(file.type)) {
      setErreur('Format non accepté. Utilisez JPG, PNG ou BMP');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErreur('Le fichier ne doit pas dépasser 10 MB');
      return;
    }

    // Créer la preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      if (onUpload) {
        onUpload(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSupprimer = () => {
    setPreview(null);
    setErreur('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onUpload) {
      onUpload(null);
    }
  };

  return (
    <div className="relative group">
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`bg-gradient-to-br ${config.bg} rounded-2xl p-8 border-2 border-dashed ${config.border} ${config.hover} transition-all cursor-pointer hover:shadow-xl`}
        >
          <div className="text-center">
            <Hand 
              className={`mx-auto ${config.icon} mb-4 ${couleur === 'pink' ? 'transform scale-x-[-1]' : ''}`} 
              size={56} 
            />
            <h4 className="text-gray-900 font-bold text-lg mb-2">{titre}</h4>
            <p className="text-gray-600 text-sm mb-4">Cliquez pour téléverser</p>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-lg text-gray-700 text-xs font-medium shadow-sm">
              <Upload size={16} />
              <span>JPG, PNG, BMP • Max 10MB</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/bmp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className={`bg-gradient-to-br ${config.bg} rounded-2xl p-6 border-4 border-green-500 shadow-xl`}>
          <div className="relative">
            {/* Preview de l'image */}
            <div className="rounded-xl overflow-hidden bg-white shadow-lg">
              <img
                src={preview}
                alt={titre}
                className="w-full h-48 object-cover"
              />
            </div>

            {/* Badge de succès */}
            <div className="absolute top-3 left-3 px-3 py-2 bg-green-500 text-white text-sm font-bold rounded-lg shadow-lg flex items-center space-x-2">
              <Check size={18} />
              <span>Enregistrée</span>
            </div>

            {/* Bouton supprimer */}
            <button
              onClick={handleSupprimer}
              className="absolute top-3 right-3 p-2.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 hover:scale-110"
            >
              <X size={20} />
            </button>

            {/* Info du fichier */}
            <div className="mt-4 p-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{titre}</p>
                  {fichier && (
                    <p className="text-xs text-gray-500 mt-1">
                       {(fichier.size / 1024).toFixed(2)} KB
                    </p>
                  )}
                </div>
                <div className="px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                  <span className="text-xs font-bold text-green-700"> OK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {erreur && (
        <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-2">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{erreur}</p>
        </div>
      )}
    </div>
  );
};

export default EmpreintePalmaire;

