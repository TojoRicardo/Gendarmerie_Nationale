import React, { useState, useRef } from 'react';
import { Camera, Fingerprint, Upload, X, AlertCircle } from 'lucide-react';

const UploadBiometrieSimple = ({ onPhotoUpload, onFingerprintUpload }) => {
  const [photoFace, setPhotoFace] = useState(null);
  const [empreinteDigitale, setEmpreinteDigitale] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [empreintePreview, setEmpreintePreview] = useState(null);
  const [erreurPhoto, setErreurPhoto] = useState('');
  const [erreurEmpreinte, setErreurEmpreinte] = useState('');
  
  const photoInputRef = useRef(null);
  const empreinteInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErreurPhoto('');

    // Vérifier le format
    const formatsAcceptes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!formatsAcceptes.includes(file.type)) {
      setErreurPhoto('Format non accepté. Utilisez JPG ou PNG uniquement');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErreurPhoto('La photo ne doit pas dépasser 10 MB');
      return;
    }

    // Créer la preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      setPhotoFace(file);
      if (onPhotoUpload) {
        onPhotoUpload({ file, preview: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEmpreinteSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErreurEmpreinte('');

    // Vérifier le format
    const formatsAcceptes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!formatsAcceptes.includes(file.type)) {
      setErreurEmpreinte('Format non accepté. Utilisez JPG ou PNG uniquement');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErreurEmpreinte('L\'empreinte ne doit pas dépasser 10 MB');
      return;
    }

    // Créer la preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setEmpreintePreview(reader.result);
      setEmpreinteDigitale(file);
      if (onFingerprintUpload) {
        onFingerprintUpload({ file, preview: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSupprimerPhoto = () => {
    setPhotoFace(null);
    setPhotoPreview(null);
    setErreurPhoto('');
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    if (onPhotoUpload) {
      onPhotoUpload({ file: null, preview: null });
    }
  };

  const handleSupprimerEmpreinte = () => {
    setEmpreinteDigitale(null);
    setEmpreintePreview(null);
    setErreurEmpreinte('');
    if (empreinteInputRef.current) {
      empreinteInputRef.current.value = '';
    }
    if (onFingerprintUpload) {
      onFingerprintUpload({ file: null, preview: null });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (type === 'photo') {
        const fakeEvent = { target: { files: [file] } };
        handlePhotoSelect(fakeEvent);
      } else {
        const fakeEvent = { target: { files: [file] } };
        handleEmpreinteSelect(fakeEvent);
      }
    }
  };

  return (
    <div className="bg-blue-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Carte Photo de face */}
          <div className="bg-white rounded-2xl shadow-sm p-6 relative">
            {/* En-tête avec icône et titre */}
            <div className="flex items-center mb-6">
              <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                <Camera className="text-blue-500" size={18} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Photo de face
              </h3>
              <span className="text-red-500 ml-1.5 text-lg font-bold">*</span>
            </div>

            {/* Zone d'upload ou preview */}
            {!photoPreview ? (
              <div
                onClick={() => photoInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'photo')}
                className="border-0 rounded-xl p-8 text-center cursor-pointer transition-all"
              >
                {/* Cercle avec icône upload - plus grand et bleu clair */}
                <div className="w-28 h-28 mx-auto mb-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="text-blue-500" size={48} />
                </div>
                
                <p className="text-base font-bold text-gray-800 mb-1.5">
                  Cliquez pour sélectionner
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  ou glissez-déposez l'image
                </p>
                <p className="text-xs text-gray-400">
                  JPG, PNG (max 10MB)
                </p>
                
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="rounded-xl overflow-hidden border-2 border-green-400 shadow-md">
                  <img
                    src={photoPreview}
                    alt="Photo de face"
                    className="w-full h-64 object-cover"
                  />
                </div>
                <button
                  onClick={handleSupprimerPhoto}
                  className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Message d'erreur */}
            {erreurPhoto && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-xs text-red-700">{erreurPhoto}</p>
              </div>
            )}

            {/* Note en bas à gauche */}
            <div className="mt-5 text-left">
              <p className="text-xs text-red-600">
                * Obligatoire pour l'extraction biométrique (embedding ArcFace)
              </p>
            </div>
          </div>

          {/* Carte Empreinte digitale */}
          <div className="bg-white rounded-2xl shadow-sm p-6 relative">
            {/* En-tête avec icône et titre */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                  <Fingerprint className="text-blue-500" size={18} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Empreinte digitale
                </h3>
              </div>
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                Optionnel
              </span>
            </div>

            {/* Zone d'upload ou preview */}
            {!empreintePreview ? (
              <div
                onClick={() => empreinteInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'empreinte')}
                className="border-0 rounded-xl p-8 text-center cursor-pointer transition-all"
              >
                {/* Cercle avec icône empreinte - plus grand et bleu clair */}
                <div className="w-28 h-28 mx-auto mb-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Fingerprint className="text-blue-500" size={48} />
                </div>
                
                <p className="text-base font-bold text-gray-800 mb-1.5">
                  Cliquez pour sélectionner
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  ou glissez-déposez l'image
                </p>
                <p className="text-xs text-gray-400">
                  JPG, PNG (Optionnel)
                </p>
                
                <input
                  ref={empreinteInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleEmpreinteSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="rounded-xl overflow-hidden border-2 border-green-400 shadow-md">
                  <img
                    src={empreintePreview}
                    alt="Empreinte digitale"
                    className="w-full h-64 object-cover"
                  />
                </div>
                <button
                  onClick={handleSupprimerEmpreinte}
                  className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Message d'erreur */}
            {erreurEmpreinte && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-xs text-red-700">{erreurEmpreinte}</p>
              </div>
            )}

            {/* Note en bas au centre */}
            <div className="mt-5 text-center">
              <p className="text-xs text-gray-500">
                Optionnelle pour la reconnaissance dactyloscopique
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadBiometrieSimple;
