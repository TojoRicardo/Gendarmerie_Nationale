import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Calendar, MapPin, AlertTriangle, User, 
  Edit, Trash2, Clock, CheckCircle, Camera, Fingerprint, 
  Upload, X, Plus, Download 
} from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';
import TimelineHistorique from './TimelineHistorique';
import DownloadFicheCriminelle from '../rapports/DownloadFicheCriminelle';
import { usePermissions } from '../../src/hooks/usePermissions';
import { PERMISSIONS } from '../../src/utils/permissions';
import ProtectedAction from '../../src/components/ProtectedAction';

const DetailFicheCriminelle = ({ ficheId, onModifier, onSupprimer, onFermer }) => {
  const navigate = useNavigate();
  const { can, canModify, displayRestrictions } = usePermissions();
  
  const [fiche, setFiche] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [ongletActif, setOngletActif] = useState('details');
  const [photosBiometriques, setPhotosBiometriques] = useState([]);
  const [empreintesBiometriques, setEmpreintesBiometriques] = useState([]);
  const [modalUploadPhoto, setModalUploadPhoto] = useState(false);
  const [modalUploadEmpreinte, setModalUploadEmpreinte] = useState(false);
  const [fichierPhoto, setFichierPhoto] = useState(null);
  const [typePhoto, setTypePhoto] = useState('face');
  const [fichierEmpreinte, setFichierEmpreinte] = useState(null);
  const [doigtEmpreinte, setDoigtEmpreinte] = useState('pouce_droit');
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [messageUpload, setMessageUpload] = useState({ type: '', texte: '' });

  useEffect(() => {
    chargerFiche();
    chargerDonneesBiometriques();
  }, [ficheId]);

  const chargerFiche = async () => {
    try {
      const response = await fetch(`/api/fiches-criminelles/${ficheId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiche(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la fiche:', error);
    } finally {
      setChargement(false);
    }
  };

  const chargerDonneesBiometriques = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      // Charger les photos biométriques
      const photosResponse = await fetch(`/api/biometrie/photos/?criminel=${ficheId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (photosResponse.ok) {
        const photosData = await photosResponse.json();
        setPhotosBiometriques(photosData.results || photosData || []);
      }

      // Charger les empreintes biométriques
      const empreintesResponse = await fetch(`/api/biometrie/empreintes/?criminel=${ficheId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (empreintesResponse.ok) {
        const empreintesData = await empreintesResponse.json();
        setEmpreintesBiometriques(empreintesData.results || empreintesData || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données biométriques:', error);
    }
  };

  const handleUploadPhoto = async (continuerAjout = false) => {
    if (!fichierPhoto) {
      setMessageUpload({ type: 'error', texte: 'Veuillez sélectionner une photo' });
      return;
    }

    setUploadEnCours(true);
    setMessageUpload({ type: '', texte: '' });

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', fichierPhoto);
      formData.append('criminel', fiche.suspect?.id || ficheId);
      formData.append('type_photo', typePhoto);

      const response = await fetch('/api/biometrie/photos/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const responseData = await response.json().catch(() => ({}));

      // Vérifier si la photo correspond à un criminel existant
      if (responseData.existing_criminal === true) {
        setMessageUpload({ 
          type: 'warning', 
          texte: `Cette photo correspond à un dossier criminel déjà enregistré: ${responseData.nom_complet || 'Criminel #' + responseData.criminel_id}` 
        });
        
        // Rediriger vers le criminel existant après un court délai
        setTimeout(() => {
          if (responseData.criminel_id) {
            navigate(`/fiches-criminelles/${responseData.criminel_id}`);
          }
        }, 2000);
        
        return; // Ne pas continuer l'upload
      }

      if (response.ok) {
        setMessageUpload({ type: 'success', texte: 'Photo ajoutée avec succès!' });
        
        if (continuerAjout) {
          // Garder le modal ouvert et réinitialiser le formulaire
          setFichierPhoto(null);
          // Changer automatiquement le type de photo pour la suite logique
          if (typePhoto === 'face') {
            setTypePhoto('profil_gauche');
          } else if (typePhoto === 'profil_gauche') {
            setTypePhoto('profil_droit');
          } else {
            setTypePhoto('face');
          }
          // Effacer le message de succès après 2 secondes
          setTimeout(() => setMessageUpload({ type: '', texte: '' }), 2000);
        } else {
          // Fermer le modal
          setModalUploadPhoto(false);
          setFichierPhoto(null);
          setTypePhoto('face');
        }
        
        chargerDonneesBiometriques();
      } else {
        throw new Error(responseData.message || responseData.error || responseData.detail || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo:', error);
      setMessageUpload({ type: 'error', texte: error.message });
    } finally {
      setUploadEnCours(false);
    }
  };

  const handleUploadEmpreinte = async (continuerAjout = false) => {
    if (!fichierEmpreinte) {
      setMessageUpload({ type: 'error', texte: 'Veuillez sélectionner une empreinte' });
      return;
    }

    setUploadEnCours(true);
    setMessageUpload({ type: '', texte: '' });

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', fichierEmpreinte);
      formData.append('criminel', fiche.suspect?.id || ficheId);
      formData.append('doigt', doigtEmpreinte);

      const response = await fetch('/api/biometrie/empreintes/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setMessageUpload({ type: 'success', texte: 'Empreinte ajoutée avec succès!' });
        
        if (continuerAjout) {
          // Garder le modal ouvert et réinitialiser le formulaire
          setFichierEmpreinte(null);
          // Passer au doigt suivant automatiquement
          const doigtsOrdre = [
            'pouce_droit', 'index_droit', 'majeur_droit', 'annulaire_droit', 'auriculaire_droit',
            'pouce_gauche', 'index_gauche', 'majeur_gauche', 'annulaire_gauche', 'auriculaire_gauche'
          ];
          const indexActuel = doigtsOrdre.indexOf(doigtEmpreinte);
          if (indexActuel >= 0 && indexActuel < doigtsOrdre.length - 1) {
            setDoigtEmpreinte(doigtsOrdre[indexActuel + 1]);
          } else {
            setDoigtEmpreinte('pouce_droit');
          }
          // Effacer le message de succès après 2 secondes
          setTimeout(() => setMessageUpload({ type: '', texte: '' }), 2000);
        } else {
          // Fermer le modal
          setModalUploadEmpreinte(false);
          setFichierEmpreinte(null);
          setDoigtEmpreinte('pouce_droit');
        }
        
        chargerDonneesBiometriques();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'empreinte:', error);
      setMessageUpload({ type: 'error', texte: error.message });
    } finally {
      setUploadEnCours(false);
    }
  };

  const handleTelechargerPhoto = async (photo) => {
    try {
      const response = await fetch(photo.image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo_${photo.type_photo}_${new Date(photo.date_capture).toLocaleDateString('fr-FR').replace(/\//g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement de la photo:', error);
    }
  };

  if (chargement) {
    return <SpinnerChargement texte="Chargement..." />;
  }

  if (!fiche) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Fiche non trouvée</p>
      </div>
    );
  }

  const onglets = [
    { id: 'details', label: 'Détails' },
    { id: 'biometrie', label: `Biométrie (${photosBiometriques.length + empreintesBiometriques.length})` },
    { id: 'infractions', label: 'Infractions' },
    { id: 'historique', label: 'Historique' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <FileText size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {fiche.numeroDossier}
                </h2>
                <p className="text-gray-600">{fiche.lieu}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            {/* Bouton Modifier - Visible uniquement si autorisé */}
            {displayRestrictions.showEditButtons && canModify(fiche.createur_id) && (
              <ProtectedAction permission={PERMISSIONS.FICHES_EDIT}>
                <Bouton
                  variant="outline"
                  icone={Edit}
                  onClick={() => onModifier(fiche)}
                >
                  Modifier
                </Bouton>
              </ProtectedAction>
            )}
            
            {/* Bouton Supprimer - Visible uniquement si autorisé */}
            {displayRestrictions.showDeleteButtons && canModify(fiche.createur_id) && (
              <ProtectedAction permission={PERMISSIONS.FICHES_DELETE}>
                <Bouton
                  variant="danger"
                  icone={Trash2}
                  onClick={() => onSupprimer(fiche)}
                >
                  Supprimer
                </Bouton>
              </ProtectedAction>
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6">
            {onglets.map(onglet => (
              <button
                key={onglet.id}
                onClick={() => setOngletActif(onglet.id)}
                className={`
                  py-4 px-2 border-b-2 font-medium text-sm transition-colors
                  ${ongletActif === onglet.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {onglet.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {ongletActif === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700">{fiche.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Calendar className="text-gray-400 mr-3 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Date d'ouverture</p>
                      <p className="font-medium">
                        {new Date(fiche.dateOuverture).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="text-gray-400 mr-3 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Lieu</p>
                      <p className="font-medium">{fiche.lieu}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <AlertTriangle className="text-gray-400 mr-3 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Niveau de danger</p>
                      <p className="font-medium capitalize">{fiche.niveauDanger}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {fiche.suspect && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start">
                        <User className="text-gray-400 mr-3 mt-1" size={20} />
                        <div>
                          <p className="text-sm text-gray-500">Suspect principal</p>
                          <p className="font-medium">
                            {fiche.suspect.nom} {fiche.suspect.prenom}
                          </p>
                          {fiche.suspect.dateNaissance && (
                            <p className="text-sm text-gray-600 mt-1">
                              Né(e) le {new Date(fiche.suspect.dateNaissance).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {fiche.notes && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Notes</p>
                      <p className="text-gray-700">{fiche.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {ongletActif === 'biometrie' && (
            <div className="space-y-8">
              {/* Message de succès/erreur */}
              {messageUpload.texte && (
                <div className={`p-4 rounded-lg ${
                  messageUpload.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {messageUpload.texte}
                </div>
              )}

              {/* Section Photos Biométriques */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Camera size={24} className="mr-2" style={{ color: '#1e40af' }} />
                    Photos Biométriques ({photosBiometriques.length})
                  </h3>
                  <button
                    onClick={() => setModalUploadPhoto(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={20} />
                    <span>Ajouter une photo</span>
                  </button>
                </div>
                
                {photosBiometriques.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photosBiometriques.map((photo) => (
                      <div key={photo.id} className="relative bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-2xl">
                        <div className="relative h-56 bg-gray-100 overflow-hidden">
                          <img
                            src={photo.image}
                            alt={`Photo ${photo.type_photo}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
                               style={{
                                 backgroundColor: '#BBE4FC',
                                 color: '#1e40af'
                               }}>
                            {photo.type_photo === 'profil_gauche' ? '↶ Gauche' :
                             photo.type_photo === 'face' ? 'Face' :
                             photo.type_photo === 'profil_droit' ? '↷ Droit' :
                             photo.type_photo || 'Photo'}
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 space-y-2">
                          <p className="text-xs text-gray-600 font-medium text-center">
                            {new Date(photo.date_capture).toLocaleDateString('fr-FR')}
                          </p>
                          <button
                            onClick={() => handleTelechargerPhoto(photo)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md transition-all text-sm font-semibold"
                          >
                            <Download size={16} />
                            <span>Télécharger</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <Camera size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Aucune photo biométrique enregistrée</p>
                  </div>
                )}
              </div>

              {/* Section Empreintes Digitales */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Fingerprint size={24} className="mr-2 text-indigo-600" />
                    Empreintes Digitales ({empreintesBiometriques.length})
                  </h3>
                  <button
                    onClick={() => setModalUploadEmpreinte(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={20} />
                    <span>Ajouter une empreinte</span>
                  </button>
                </div>
                
                {empreintesBiometriques.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {empreintesBiometriques.map((empreinte) => (
                      <div key={empreinte.id} className="relative group bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:scale-105">
                        <div className="relative h-48 bg-gray-100 overflow-hidden">
                          <img
                            src={empreinte.image}
                            alt={`Empreinte ${empreinte.doigt}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg text-white bg-indigo-600">
                            {empreinte.doigt || 'Empreinte'}
                          </div>
                        </div>
                        <div className="p-2 bg-gradient-to-r from-gray-50 to-gray-100">
                          <p className="text-xs text-gray-600 font-medium text-center truncate">
                            {empreinte.doigt?.replace('_', ' ') || 'Empreinte'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <Fingerprint size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Aucune empreinte digitale enregistrée</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {ongletActif === 'infractions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Infractions liées</h3>
              {fiche.infractions && fiche.infractions.length > 0 ? (
                fiche.infractions.map((infraction, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{infraction.type}</h4>
                        <p className="text-sm text-gray-600 mt-1">{infraction.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(infraction.date).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        {infraction.gravite}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Aucune infraction enregistrée</p>
              )}
            </div>
          )}

          {ongletActif === 'historique' && (
            <TimelineHistorique ficheId={ficheId} />
          )}

          {ongletActif === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Documents joints</h3>
                
                {/* Section Fiche Dactylographique */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText size={28} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <DownloadFicheCriminelle 
                        criminelId={fiche.id || ficheId} 
                        criminelNom={fiche.nom && fiche.prenom ? `${fiche.nom}_${fiche.prenom}` : (fiche.numero_fiche || ficheId)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Autres documents */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <FileText size={48} className="text-gray-400 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">
                    Autres documents
                  </h4>
                  <p className="text-gray-500 text-sm">
                    Fonctionnalité de gestion des documents en développement
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Upload Photo */}
      {modalUploadPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Ajouter une photo</h3>
              <button
                onClick={() => {
                  setModalUploadPhoto(false);
                  setFichierPhoto(null);
                  setMessageUpload({ type: '', texte: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de photo
                </label>
                <select
                  value={typePhoto}
                  onChange={(e) => setTypePhoto(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="face">Face</option>
                  <option value="profil_gauche">Profil Gauche</option>
                  <option value="profil_droit">Profil Droit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Sélectionner un fichier</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFichierPhoto(e.target.files[0])}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    {fichierPhoto && (
                      <p className="text-sm text-green-600 font-medium">
                        {fichierPhoto.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {messageUpload.texte && (
                <div className={`px-4 py-3 rounded-lg ${
                  messageUpload.type === 'error' 
                    ? 'bg-red-50 border border-red-200 text-red-700' 
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  {messageUpload.texte}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setModalUploadPhoto(false);
                    setFichierPhoto(null);
                    setMessageUpload({ type: '', texte: '' });
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <span>Réinitialiser</span>
                </button>
                <button
                  onClick={() => handleUploadPhoto(true)}
                  disabled={uploadEnCours || !fichierPhoto}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  {uploadEnCours ? (
                    <>
                      <Upload className="animate-pulse" size={18} />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Enregistrer et Continuer</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleUploadPhoto(false)}
                  disabled={uploadEnCours || !fichierPhoto}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  {uploadEnCours ? (
                    <>
                      <Upload className="animate-pulse" size={18} />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Empreinte */}
      {modalUploadEmpreinte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Ajouter une empreinte</h3>
              <button
                onClick={() => {
                  setModalUploadEmpreinte(false);
                  setFichierEmpreinte(null);
                  setMessageUpload({ type: '', texte: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doigt
                </label>
                <select
                  value={doigtEmpreinte}
                  onChange={(e) => setDoigtEmpreinte(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="pouce_droit">Pouce Droit</option>
                  <option value="index_droit">Index Droit</option>
                  <option value="majeur_droit">Majeur Droit</option>
                  <option value="annulaire_droit">Annulaire Droit</option>
                  <option value="auriculaire_droit">Auriculaire Droit</option>
                  <option value="pouce_gauche">Pouce Gauche</option>
                  <option value="index_gauche">Index Gauche</option>
                  <option value="majeur_gauche">Majeur Gauche</option>
                  <option value="annulaire_gauche">Annulaire Gauche</option>
                  <option value="auriculaire_gauche">Auriculaire Gauche</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                        <span>Sélectionner un fichier</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFichierEmpreinte(e.target.files[0])}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    {fichierEmpreinte && (
                      <p className="text-sm text-green-600 font-medium">
                        {fichierEmpreinte.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {messageUpload.texte && (
                <div className={`px-4 py-3 rounded-lg ${
                  messageUpload.type === 'error' 
                    ? 'bg-red-50 border border-red-200 text-red-700' 
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  {messageUpload.texte}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setModalUploadEmpreinte(false);
                    setFichierEmpreinte(null);
                    setMessageUpload({ type: '', texte: '' });
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <span>Réinitialiser</span>
                </button>
                <button
                  onClick={() => handleUploadEmpreinte(true)}
                  disabled={uploadEnCours || !fichierEmpreinte}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  {uploadEnCours ? (
                    <>
                      <Upload className="animate-pulse" size={18} />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Enregistrer et Continuer</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleUploadEmpreinte(false)}
                  disabled={uploadEnCours || !fichierEmpreinte}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  {uploadEnCours ? (
                    <>
                      <Upload className="animate-pulse" size={18} />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailFicheCriminelle;

