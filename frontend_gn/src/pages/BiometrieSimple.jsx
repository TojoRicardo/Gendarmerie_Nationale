import React, { useState } from 'react';
import UploadBiometrieSimple from '../../components/biometrie/UploadBiometrieSimple';

const BiometrieSimple = () => {
  const [photoData, setPhotoData] = useState(null);
  const [empreinteData, setEmpreinteData] = useState(null);

  const handlePhotoUpload = (data) => {
    setPhotoData(data);
    if (data.file) {
      console.log('Photo de face uploadée:', data.file.name);
      // Ici vous pouvez appeler votre API pour uploader la photo
    }
  };

  const handleFingerprintUpload = (data) => {
    setEmpreinteData(data);
    if (data.file) {
      console.log('Empreinte digitale uploadée:', data.file.name);
      // Ici vous pouvez appeler votre API pour uploader l'empreinte
    }
  };

  return (
    <div className="min-h-screen">
      <UploadBiometrieSimple
        onPhotoUpload={handlePhotoUpload}
        onFingerprintUpload={handleFingerprintUpload}
      />
    </div>
  );
};

export default BiometrieSimple;
