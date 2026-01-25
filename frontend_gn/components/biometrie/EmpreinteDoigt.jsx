import React, { useState, useRef } from 'react';
import { Fingerprint, Upload, Check, X, AlertCircle } from 'lucide-react';

const EmpreinteDoigt = ({ 
  doigt, 
  position, 
  couleur = 'blue',
  onUpload 
}) => {
  const [fichier, setFichier] = useState(null);
  const [preview, setPreview] = useState(null);
  const [erreur, setErreur] = useState('');
  const fileInputRef = useRef(null);

  const couleursConfig = {
    pink: {
      bg: 'from-pink-500 to-pink-700',
      border: 'border-pink-300',
      hover: 'hover:border-pink-500',
      text: 'text-pink-700',
      bgLight: 'bg-pink-50'
    },
    blue: {
      bg: 'from-blue-500 to-blue-700',
      border: 'border-blue-300',
      hover: 'hover:border-blue-500',
      text: 'text-blue-700',
      bgLight: 'bg-blue-50'
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
      setFichier(file);
      if (onUpload) {
        onUpload({ doigt, position, file, preview: reader.result });
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
      onUpload({ doigt, position, file: null, preview: null });
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {/* Zone d'upload */}
        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-20 h-32 rounded-t-full cursor-pointer border-2 border-dashed ${config.border} ${config.hover} ${config.bgLight} flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg`}
          >
            <Fingerprint className={`${config.text} mb-2`} size={32} />
            <Upload className={`${config.text} opacity-50`} size={16} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/bmp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative">
            <div className="w-20 h-32 rounded-t-full overflow-hidden border-4 border-green-500 shadow-lg">
              <img
                src={preview}
                alt={doigt}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Icône de validation */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <Check className="text-white" size={18} />
            </div>
            {/* Bouton supprimer au hover */}
            <button
              onClick={handleSupprimer}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Nom du doigt */}
      <p className={`mt-3 text-xs font-bold ${preview ? 'text-green-700' : 'text-gray-700'} text-center`}>
        {doigt}
      </p>

      {/* Badge de statut */}
      {preview && (
        <div className="mt-1.5 px-2 py-0.5 bg-green-100 border border-green-300 rounded-full flex items-center space-x-1">
          <Check size={12} className="text-green-600" />
          <span className="text-xs font-semibold text-green-700">OK</span>
        </div>
      )}

      {/* Message d'erreur */}
      {erreur && (
        <div className="mt-2 px-2 py-1 bg-red-100 border border-red-300 rounded text-xs text-red-700 flex items-center space-x-1">
          <AlertCircle size={12} />
          <span>{erreur}</span>
        </div>
      )}
    </div>
  );
};

export default EmpreinteDoigt;

