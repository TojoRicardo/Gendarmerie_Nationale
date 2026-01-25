import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Download, Trash2, ZoomIn, X, ChevronLeft, User, ChevronRight, Calendar, MapPin, Camera } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const GaleriePhotos = ({ entityId, entityType, photosInitiales = [], onDelete }) => {
  const [photos, setPhotos] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [photoSelectionnee, setPhotoSelectionnee] = useState(null);
  const [modalOuverte, setModalOuverte] = useState(false);

  useEffect(() => {
    // Utiliser les photos passées en props
    if (photosInitiales && photosInitiales.length > 0) {
      setPhotos(photosInitiales);
      setChargement(false);
    } else {
      // Sinon, afficher un état vide après un court délai
      setTimeout(() => {
        setPhotos([]);
        setChargement(false);
      }, 500);
    }
  }, [photosInitiales]);

  const ouvrirModal = (photo) => {
    setPhotoSelectionnee(photo);
    setModalOuverte(true);
  };

  const fermerModal = () => {
    setModalOuverte(false);
    setPhotoSelectionnee(null);
  };

  const telechargerPhoto = async (photo) => {
    try {
      const response = await fetch(photo.url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.nom || 'photo.jpg';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const supprimerPhoto = async (photoId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;

    try {
      // Supprimer localement
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      
      // Appeler le callback parent
      if (onDelete) {
        onDelete(photoId);
      }
      
      fermerModal();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
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
    return <SpinnerChargement texte="Chargement de la galerie..." />;
  }

  if (photos.length === 0) {
    return (
      <div className="card-pro p-12 text-center">
        <div className="inline-flex p-6 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full mb-6">
          <ImageIcon size={64} className="text-pink-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune photo disponible</h3>
        <p className="text-gray-500 mb-6">Commencez par téléverser les photos d'identification du suspect</p>
        <div className="inline-flex space-x-2 text-sm text-gray-600 bg-gray-100 px-6 py-3 rounded-xl">
          <Camera size={18} className="text-pink-600" />
          <span>Utilisez le formulaire ci-dessus pour ajouter des photos</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* En-tête de la galerie */}
      <div className="card-pro p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg">
              <ImageIcon className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Galerie de photos</h3>
              <p className="text-sm text-gray-600">
                <span className="font-bold text-purple-600">{photos.length}</span> photo(s) enregistrée(s)
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {['gauche', 'face', 'droit'].map(type => {
              const count = photos.filter(p => p.typeProfil === type).length;
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
              
              return (
                <div key={type} className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${bgClass}`}>
                  <Icone className={iconClass} size={16} />
                  <span className={`text-sm font-bold ${textClass}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {photos.map((photo) => {
          const config = getProfilConfig(photo.typeProfil);
          const Icone = config.icone;
          
          return (
            <div
              key={photo.id}
              className="card-pro-hover relative group cursor-pointer overflow-hidden animate-scaleIn"
              onClick={() => ouvrirModal(photo)}
            >
              <img
                src={photo.url}
                alt={photo.nom}
                className="w-full h-56 object-cover"
              />
              
              {/* Badge type de profil */}
              <div className={`absolute top-3 left-3 ${config.bg} text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center space-x-2`}>
                <Icone size={16} />
                <span className="text-xs font-bold">{config.label}</span>
              </div>
              
              {/* Overlay au survol */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex space-x-2">
                  <button className="p-3 bg-white rounded-xl hover:bg-gray-100 hover:scale-110 transition-all shadow-lg">
                    <ZoomIn size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      telechargerPhoto(photo);
                    }}
                    className="p-3 bg-white rounded-xl hover:bg-blue-50 hover:scale-110 transition-all shadow-lg"
                  >
                    <Download size={20} className="text-blue-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      supprimerPhoto(photo.id);
                    }}
                    className="p-3 bg-white rounded-xl hover:bg-red-50 hover:scale-110 transition-all shadow-lg"
                  >
                    <Trash2 size={20} className="text-red-600" />
                  </button>
                </div>
              </div>

              {/* Informations */}
              <div className="p-4 bg-white">
                <p className="text-xs text-gray-600 truncate mb-2 font-medium"> {photo.nom}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {new Date(photo.dateAjout).toLocaleDateString('fr-FR')}
                  </span>
                  {photo.lieu && (
                    <span className="flex items-center truncate ml-2">
                      <MapPin size={12} className="mr-1" />
                      {photo.lieu}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de visualisation */}
      {modalOuverte && photoSelectionnee && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <button
            onClick={fermerModal}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>

          <div className="max-w-4xl w-full">
            <img
              src={photoSelectionnee.url}
              alt={photoSelectionnee.nom}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            
            <div className="bg-white mt-4 p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">
                    {photoSelectionnee.nom}
                  </h3>
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(photoSelectionnee.dateAjout).toLocaleString('fr-FR')}
                    </span>
                    {photoSelectionnee.lieu && (
                      <span className="flex items-center">
                        <MapPin size={14} className="mr-1" />
                        {photoSelectionnee.lieu}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Bouton
                    variant="outline"
                    taille="small"
                    icone={Download}
                    onClick={() => telechargerPhoto(photoSelectionnee)}
                  >
                    Télécharger
                  </Bouton>
                  <Bouton
                    variant="danger"
                    taille="small"
                    icone={Trash2}
                    onClick={() => supprimerPhoto(photoSelectionnee.id)}
                  >
                    Supprimer
                  </Bouton>
                </div>
              </div>

              {/* Type de profil */}
              {photoSelectionnee.typeProfil && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-3">Type de profil :</span>
                  {(() => {
                    const config = getProfilConfig(photoSelectionnee.typeProfil);
                    const Icone = config.icone;
                    return (
                      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${config.bg} text-white`}>
                        <Icone size={16} />
                        <span className="text-sm font-bold">{config.label}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Notes */}
              {photoSelectionnee.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Notes :</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {photoSelectionnee.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GaleriePhotos;

