import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Fingerprint, Loader2, CheckCircle2, AlertCircle, X, Scan, Eye, User, FileText, Save } from 'lucide-react';
import UploadPhotoCriminelle from '../../components/biometrie/UploadPhotoCriminelle';
import Button from '../components/commun/Button';
import Input from '../components/commun/Input';
import { useNotification } from '../context/NotificationContext';
import { getAuthToken } from '../utils/sessionStorage';
import { API_BASE_URL } from '../config/api';
import { searchUPRByPhoto, getUPR, createUPR } from '../services/uprService';
import { getCriminalFileById, createCriminalFile } from '../services/criminalFilesService';

/**
 * Page AjouterPhotoCriminelle
 * Interface moderne pour ajouter des photos criminelles
 * Design conforme à l'image fournie
 */
const AjouterPhotoCriminelle = () => {
  const navigate = useNavigate();
  const notification = useNotification();

  // États pour les photos
  const [photoFace, setPhotoFace] = useState(null);
  const [empreinteDigitale, setEmpreinteDigitale] = useState(null);

  // États pour la détection de visages
  const [visagesDetectes, setVisagesDetectes] = useState([]);
  const [visageSelectionne, setVisageSelectionne] = useState(null);
  const [detectionEnCours, setDetectionEnCours] = useState(false);
  const imageRef = useRef(null);

  // États pour le scan
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [personFound, setPersonFound] = useState(false);
  const [foundPersonData, setFoundPersonData] = useState(null);
  const [ficheDetails, setFicheDetails] = useState(null);
  const [loadingFiche, setLoadingFiche] = useState(false);

  // États pour l'upload
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [message, setMessage] = useState({ type: '', texte: '' });
  
  // États pour le formulaire de fiche criminelle
  const [afficherFormulaireFiche, setAfficherFormulaireFiche] = useState(false);
  const [formDataFiche, setFormDataFiche] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    lieu_naissance: '',
    cin: '',
    nationalite: '',
    adresse: '',
    contact: '',
    profession: '',
    notes: ''
  });

  /**
   * Helper pour construire l'URL API
   */
  const getAPIUrl = (endpoint) => {
    const baseURL = API_BASE_URL || 'http://127.0.0.1:8000/api';
    const cleanBaseURL = baseURL.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBaseURL}${cleanEndpoint}`;
  };

  /**
   * Détecter tous les visages dans l'image
   */
  const detecterTousLesVisages = async (file) => {
    if (!file) return;

    setDetectionEnCours(true);
    // Réinitialiser pour une nouvelle détection
    setVisagesDetectes([]);
    setVisageSelectionne(null);

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('image', file);

      // Utiliser l'API d'analyse biométrique qui peut détecter plusieurs visages
      const response = await fetch(getAPIUrl('/biometrie/analyse/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        const visages = [];
        
        // L'API analyse retourne un seul visage, mais on peut essayer de détecter plusieurs visages
        // en utilisant l'API IA si disponible
        if (data.bbox) {
          visages.push({
            id: 0,
            bbox: data.bbox,
            confidence: data.confidence || 1.0,
            landmarks: data.landmarks106 || []
          });
        }

        // Essayer aussi l'API IA pour détecter tous les visages
        try {
          const iaResponse = await fetch(getAPIUrl('/ia/recherche-photo-stream/'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const iaData = await iaResponse.json().catch(() => ({}));

          if (iaResponse.ok && iaData.faces && Array.isArray(iaData.faces) && iaData.faces.length > 0) {
            // Plusieurs visages détectés via l'API IA
            const visagesIA = iaData.faces.map((face, index) => ({
              id: index,
              bbox: face.bbox || [0, 0, 0, 0],
              confidence: face.confidence || 1.0,
              landmarks: face.landmarks || []
            }));
            
            if (visagesIA.length > 0) {
              setVisagesDetectes(visagesIA);
              setVisageSelectionne(visagesIA[0]);
              setDetectionEnCours(false);
              return;
            }
          }
        } catch (iaError) {
          console.log('API IA non disponible, utilisation de l\'API analyse standard');
        }

        // Si on a au moins un visage, l'utiliser
        if (visages.length > 0) {
          setVisagesDetectes(visages);
          setVisageSelectionne(visages[0]);
        } else {
          // Fallback: utiliser landmarks106
          const landmarksResponse = await fetch(getAPIUrl('/biometrie/landmarks106/'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const landmarksData = await landmarksResponse.json().catch(() => ({}));

          if (landmarksResponse.ok && landmarksData.success && landmarksData.bbox) {
            const visage = {
              id: 0,
              bbox: landmarksData.bbox,
              confidence: landmarksData.confidence || 1.0,
              landmarks: landmarksData.landmarks || []
            };
            setVisagesDetectes([visage]);
            setVisageSelectionne(visage);
          }
        }
      } else {
        // Essayer avec l'API landmarks106 comme fallback
        const landmarksResponse = await fetch(getAPIUrl('/biometrie/landmarks106/'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const landmarksData = await landmarksResponse.json().catch(() => ({}));

        if (landmarksResponse.ok && landmarksData.success && landmarksData.bbox) {
          const visage = {
            id: 0,
            bbox: landmarksData.bbox,
            confidence: landmarksData.confidence || 1.0,
            landmarks: landmarksData.landmarks || []
          };
          setVisagesDetectes([visage]);
          setVisageSelectionne(visage);
        }
      }
    } catch (error) {
      console.error('Erreur détection visages:', error);
    } finally {
      setDetectionEnCours(false);
    }
  };

  /**
   * Gestion de l'upload de photo de face
   * L'image s'affiche immédiatement via le preview
   * La détection des visages se fera uniquement lors du clic sur le bouton "Scanner"
   */
  const handlePhotoFaceUpload = (data) => {
    // Afficher l'image immédiatement
    setPhotoFace(data);
    
    // Réinitialiser les résultats de scan si nouvelle photo
    setScanResults(null);
    setPersonFound(false);
    setFoundPersonData(null);
    setVisagesDetectes([]);
    setVisageSelectionne(null);
    
    // NE PAS détecter automatiquement les visages
    // La détection se fera uniquement lors du clic sur le bouton "Scanner"
  };

  /**
   * Gestion de l'upload d'empreinte digitale
   */
  const handleEmpreinteDigitaleUpload = (data) => {
    setEmpreinteDigitale(data);
  };

  /**
   * Scanner la photo dans la base de données
   * Détecte d'abord les visages, puis scanne dans la base de données
   */
  const handleScanPhoto = async () => {
    if (!photoFace || !photoFace.file) {
      notification.showError({
        title: 'Photo requise',
        message: 'Veuillez d\'abord sélectionner une photo'
      });
      return;
    }

    setIsScanning(true);
    setScanResults(null);
    setPersonFound(false);
    setFoundPersonData(null);

    try {
      // Étape 1: Détecter tous les visages dans l'image
      await detecterTousLesVisages(photoFace.file);

      // Attendre un peu pour que la détection se termine
      await new Promise(resolve => setTimeout(resolve, 500));

      // Étape 2: Si des visages sont détectés, utiliser le premier (ou celui sélectionné)
      // Sinon, scanner quand même toute l'image
      if (visagesDetectes.length === 0) {
        notification.showWarning({
          title: 'Aucun visage détecté',
          message: 'Aucun visage détecté dans l\'image. Le scan se fera sur toute l\'image.'
        });
      }

      // Utiliser la fonction existante searchUPRByPhoto
      const results = await searchUPRByPhoto(photoFace.file, 0.35, 5);

      // Normaliser la structure des résultats (l'API peut retourner différentes structures)
      const normalizedResults = {
        upr_matches: results.upr_matches || results.upr_results || results.matches?.filter(m => m.type === 'UPR') || [],
        criminel_matches: results.criminel_matches || results.criminel_results || results.matches?.filter(m => m.type === 'CRIMINEL' || m.type === 'Criminel') || [],
        total_matches: results.total_matches || (results.upr_matches?.length || 0) + (results.criminel_matches?.length || 0)
      };

      setScanResults(normalizedResults);

      // Vérifier s'il y a des correspondances (même partielles)
      const allUPRMatches = normalizedResults.upr_matches || [];
      const allCriminelMatches = normalizedResults.criminel_matches || [];
      const hasAnyMatches = allUPRMatches.length > 0 || allCriminelMatches.length > 0;

      // Vérifier s'il y a des correspondances strictes (score >= 0.9)
      const strictUPRMatches = allUPRMatches.filter(
        (m) => m.similarity_score >= 0.9
      );
      const strictCriminelMatches = allCriminelMatches.filter(
        (m) => m.similarity_score >= 0.9
      );

      if (strictUPRMatches.length > 0 || strictCriminelMatches.length > 0) {
        // Personne trouvée avec correspondance stricte
        const bestMatch = strictUPRMatches[0] || strictCriminelMatches[0];
        setPersonFound(true);
        setFoundPersonData(bestMatch);

        // Charger IMMÉDIATEMENT les détails complets de la fiche pour affichage direct
        setLoadingFiche(true);
        try {
          if (bestMatch.type === 'UPR' && bestMatch.id) {
            const uprDetails = await getUPR(bestMatch.id);
            setFicheDetails({ type: 'UPR', data: uprDetails });
          } else if (bestMatch.id) {
            const criminelDetails = await getCriminalFileById(bestMatch.id);
            setFicheDetails({ type: 'CRIMINEL', data: criminelDetails });
          }
        } catch (error) {
          console.error('Erreur lors du chargement des détails de la fiche:', error);
        } finally {
          setLoadingFiche(false);
        }

        notification.showWarning({
          title: '⚠️ Personne déjà enregistrée',
          message: `Cette personne existe déjà dans la base de données. ${bestMatch.type === 'UPR' ? `UPR: ${bestMatch.code_upr || bestMatch.nom_temporaire}` : `Criminel: ${bestMatch.nom || bestMatch.numero_fiche}`}`,
        });
      } else if (hasAnyMatches) {
        // Des correspondances partielles existent mais pas de correspondance stricte
        setPersonFound(false);
        notification.showInfo({
          title: 'ℹ️ Correspondances partielles trouvées',
          message: `${allUPRMatches.length + allCriminelMatches.length} correspondance(s) partielle(s) trouvée(s). Consultez les résultats ci-dessous.`,
        });
      } else {
        // Aucune correspondance trouvée du tout
        setPersonFound(false);
        // Vérifier si un visage a été détecté
        const visageDetecte = visagesDetectes.length > 0;
        if (visageDetecte) {
          // Afficher DIRECTEMENT le formulaire de fiche criminelle si un visage est détecté
          setAfficherFormulaireFiche(true);
          notification.showSuccess({
            title: '✅ Visage détecté - Aucune correspondance',
            message: 'Un visage a été détecté dans l\'image, mais aucune personne correspondante n\'a été trouvée dans la base de données. Le formulaire de création de fiche criminelle est disponible ci-dessous.',
          });
        } else {
          notification.showSuccess({
            title: '✅ Aucune correspondance trouvée',
            message: 'Aucune personne correspondante trouvée dans la base de données. Vous pouvez procéder à l\'enregistrement.',
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recherche par photo:', error);

      if (error.response?.status === 400) {
        notification.showError({
          title: 'Erreur de validation',
          message: error.response.data?.error || 'La photo fournie n\'est pas valide',
        });
      } else if (error.response?.status === 500) {
        notification.showError({
          title: 'Erreur serveur',
          message: 'Une erreur est survenue lors de la recherche. Veuillez réessayer.',
        });
      } else {
        notification.showError({
          title: 'Erreur de recherche',
          message: 'Impossible d\'effectuer la recherche. Vérifiez votre connexion et réessayez.',
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Navigation vers la fiche de la personne trouvée
   */
  const handleViewFoundPerson = () => {
    if (!foundPersonData) return;

    if (foundPersonData.type === 'UPR') {
      navigate(`/upr/${foundPersonData.id}`);
    } else {
      navigate(`/criminels/${foundPersonData.id}`);
    }
  };

  /**
   * Enregistrer une nouvelle fiche criminelle avec les captures 1 et 2
   */
  const handleEnregistrerFicheCriminelle = async () => {
    // Vérifier que la capture 1 (photo de face) est présente
    if (!photoFace || !photoFace.file) {
      notification.showError({
        title: 'Photo de face requise',
        message: 'La capture 1 (photo de face) est obligatoire pour enregistrer une fiche criminelle.'
      });
      return;
    }

    // Vérifier qu'un visage a été détecté
    if (visagesDetectes.length === 0) {
      notification.showError({
        title: 'Visage non détecté',
        message: 'Aucun visage détecté dans la photo. Veuillez utiliser une photo avec un visage clairement visible.'
      });
      return;
    }

    // Validation des champs obligatoires
    if (!formDataFiche.nom || !formDataFiche.prenom) {
      notification.showError({
        title: 'Champs obligatoires manquants',
        message: 'Le nom et le prénom sont obligatoires pour créer une fiche criminelle.'
      });
      return;
    }

    setUploadEnCours(true);
    setMessage({ type: '', texte: '' });

    try {
      // Préparer les données de la fiche
      const ficheData = {
        nom: formDataFiche.nom.trim(),
        prenom: formDataFiche.prenom.trim(),
        date_naissance: formDataFiche.date_naissance || null,
        lieu_naissance: formDataFiche.lieu_naissance || '',
        cin: formDataFiche.cin || '',
        nationalite: formDataFiche.nationalite || '',
        adresse: formDataFiche.adresse || '',
        contact: formDataFiche.contact || '',
        profession: formDataFiche.profession || '',
        description: formDataFiche.notes || `Enregistré via scan biométrique. Visage détecté avec confiance: ${visageSelectionne?.confidence ? (visageSelectionne.confidence * 100).toFixed(0) + '%' : 'N/A'}`
      };

      // Créer la fiche criminelle
      const result = await createCriminalFile(ficheData);

      // Ensuite, uploader la photo de face
      if (result.id && photoFace.file) {
        try {
          const photoFormData = new FormData();
          photoFormData.append('criminel', result.id);
          photoFormData.append('type_photo', 'face');
          photoFormData.append('image', photoFace.file);
          photoFormData.append('est_principale', 'true');
          photoFormData.append('est_active', 'true');

          const token = getAuthToken();
          await fetch(getAPIUrl('/biometrie/photos/'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: photoFormData
          });
        } catch (photoError) {
          console.error('Erreur lors de l\'upload de la photo:', photoError);
          // Ne pas bloquer si la photo ne peut pas être uploadée
        }
      }

      notification.showSuccess({
        title: '✅ Fiche criminelle enregistrée avec succès',
        message: `La fiche criminelle a été créée avec succès. ${result.numero_fiche ? `N° Fiche: ${result.numero_fiche}` : ''}`
      });

      // Rediriger vers la fiche créée
      if (result.id) {
        setTimeout(() => {
          navigate(`/criminels/${result.id}`);
        }, 1500);
      } else {
        setTimeout(() => {
          navigate('/criminels');
        }, 1500);
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la fiche criminelle:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message || 
                          'Erreur lors de l\'enregistrement de la fiche criminelle';
      
      notification.showError({
        title: 'Erreur d\'enregistrement',
        message: errorMessage
      });
      
      setMessage({ type: 'error', texte: errorMessage });
    } finally {
      setUploadEnCours(false);
    }
  };

  /**
   * Enregistrer un nouveau UPR avec les captures 1 (photo de face) et 2 (empreinte digitale)
   */
  const handleEnregistrerUPR = async () => {
    // Vérifier que la capture 1 (photo de face) est présente
    if (!photoFace || !photoFace.file) {
      notification.showError({
        title: 'Photo de face requise',
        message: 'La capture 1 (photo de face) est obligatoire pour enregistrer un UPR.'
      });
      return;
    }

    // Vérifier qu'un visage a été détecté
    if (visagesDetectes.length === 0) {
      notification.showError({
        title: 'Visage non détecté',
        message: 'Aucun visage détecté dans la photo. Veuillez utiliser une photo avec un visage clairement visible.'
      });
      return;
    }

    setUploadEnCours(true);
    setMessage({ type: '', texte: '' });

    try {
      const formData = new FormData();
      
      // Capture 1 : Photo de face (obligatoire)
      formData.append('photo_face', photoFace.file);
      
      // Capture 2 : Empreinte digitale (optionnelle)
      if (empreinteDigitale && empreinteDigitale.file) {
        formData.append('empreinte_digitale', empreinteDigitale.file);
      }
      
      // Notes optionnelles
      formData.append('notes', `Enregistré via scan biométrique. Visage détecté avec confiance: ${visageSelectionne?.confidence ? (visageSelectionne.confidence * 100).toFixed(0) + '%' : 'N/A'}`);

      // Créer l'UPR
      const result = await createUPR(formData);

      notification.showSuccess({
        title: '✅ UPR enregistré avec succès',
        message: `L'UPR a été créé avec succès. ${result.code_upr ? `Code UPR: ${result.code_upr}` : ''}`
      });

      // Rediriger vers la fiche UPR créée
      if (result.id) {
        setTimeout(() => {
          navigate(`/upr/${result.id}`);
        }, 1500);
      } else {
        // Si pas d'ID, rediriger vers la liste UPR
        setTimeout(() => {
          navigate('/upr');
        }, 1500);
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'UPR:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message || 
                          'Erreur lors de l\'enregistrement de l\'UPR';
      
      notification.showError({
        title: 'Erreur d\'enregistrement',
        message: errorMessage
      });
      
      setMessage({ type: 'error', texte: errorMessage });
    } finally {
      setUploadEnCours(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50/30 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Deux cartes côte à côte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Carte gauche - Photo de face */}
          <UploadPhotoCriminelle
            titre="Photo de face"
            required={true}
            typePhoto="face"
            isScanning={isScanning || detectionEnCours}
            visagesDetectes={visagesDetectes}
            visageSelectionne={visageSelectionne}
            onVisageSelect={setVisageSelectionne}
            imageRef={imageRef}
            onUpload={handlePhotoFaceUpload}
            onRemove={() => {
              setPhotoFace(null);
              setScanResults(null);
              setPersonFound(false);
              setFoundPersonData(null);
              setVisagesDetectes([]);
              setVisageSelectionne(null);
            }}
          />

          {/* Carte droite - Empreinte digitale */}
          <UploadPhotoCriminelle
            titre="Empreinte digitale"
            required={false}
            typePhoto="empreinte"
            note="Optionnelle pour la reconnaissance dactyloscopique"
            icone={Fingerprint}
            onUpload={handleEmpreinteDigitaleUpload}
            onRemove={() => setEmpreinteDigitale(null)}
          />
        </div>

        {/* Message nombre de visages détectés */}
        {visagesDetectes.length > 0 && (
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-700">
              <span className="font-bold text-blue-600">{visagesDetectes.length}</span> visage{visagesDetectes.length > 1 ? 's' : ''} détecté{visagesDetectes.length > 1 ? 's' : ''}
              {visageSelectionne && (
                <span className="ml-1 text-gray-600">
                  • Visage {visageSelectionne.id + 1} sélectionné
                </span>
              )}
            </p>
            {visagesDetectes.length > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Cliquez sur un rectangle pour sélectionner un autre visage
              </p>
            )}
          </div>
        )}

        {/* Bouton Scanner - affiché seulement si photo uploadée */}
        {photoFace && !personFound && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleScanPhoto}
              disabled={isScanning || detectionEnCours}
              icon={isScanning || detectionEnCours ? Loader2 : Scan}
              variant="secondary"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isScanning || detectionEnCours ? 'Scan en cours...' : 'Scanner la photo'}
            </Button>
          </div>
        )}

        {/* Résultats du scan - toujours affiché si scanResults existe */}
        {scanResults && (
          <div className="mb-6">
            {personFound ? (
              <div className="space-y-4">
                {/* Alerte personne trouvée */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-bold text-amber-900 mb-2">
                          ⚠️ Personne déjà enregistrée dans la base de données
                        </h3>
                        {foundPersonData && (
                          <div className="mb-3">
                            <p className="text-sm text-amber-800">
                              <strong>Type:</strong> {foundPersonData.type === 'UPR' ? 'UPR (Personne non identifiée)' : 'Fiche criminelle'}
                            </p>
                            {foundPersonData.code_upr && (
                              <p className="text-sm text-amber-800">
                                <strong>Code UPR:</strong> {foundPersonData.code_upr}
                              </p>
                            )}
                            {foundPersonData.nom_temporaire && (
                              <p className="text-sm text-amber-800">
                                <strong>Nom:</strong> {foundPersonData.nom_temporaire}
                              </p>
                            )}
                            {foundPersonData.similarity_score && (
                              <p className="text-sm text-amber-800">
                                <strong>Score de similarité:</strong> {(foundPersonData.similarity_score * 100).toFixed(2)}%
                              </p>
                            )}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleViewFoundPerson}
                          icon={Eye}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Voir la fiche complète
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Affichage de la fiche détaillée */}
                {loadingFiche ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                      <span className="text-gray-600">Chargement des détails de la fiche...</span>
                    </div>
                  </div>
                ) : ficheDetails ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Fiche {ficheDetails.type === 'UPR' ? 'UPR' : 'Criminelle'}
                    </h3>
                    
                    {ficheDetails.type === 'UPR' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ficheDetails.data.code_upr && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Code UPR</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.code_upr}</p>
                            </div>
                          )}
                          {ficheDetails.data.nom_temporaire && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Nom temporaire</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.nom_temporaire}</p>
                            </div>
                          )}
                          {ficheDetails.data.date_enregistrement && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Date d'enregistrement</label>
                              <p className="text-sm font-bold text-gray-900">
                                {new Date(ficheDetails.data.date_enregistrement).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          )}
                          {ficheDetails.data.lieu_enregistrement && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Lieu d'enregistrement</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.lieu_enregistrement}</p>
                            </div>
                          )}
                        </div>
                        {ficheDetails.data.notes && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
                            <p className="text-sm text-gray-700 mt-1">{ficheDetails.data.notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Informations principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ficheDetails.data.numero_fiche && (
                            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">N° Fiche</label>
                              <p className="text-lg font-bold text-blue-900">{ficheDetails.data.numero_fiche}</p>
                            </div>
                          )}
                          {(ficheDetails.data.nom || ficheDetails.data.prenom) && (
                            <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Nom complet</label>
                              <p className="text-lg font-bold text-gray-900">
                                {ficheDetails.data.prenom || ''} {ficheDetails.data.nom || ''}
                              </p>
                            </div>
                          )}
                          {ficheDetails.data.surnom && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Surnom</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.surnom}</p>
                            </div>
                          )}
                          {ficheDetails.data.sexe && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Sexe</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.sexe === 'H' ? 'Homme' : 'Femme'}</p>
                            </div>
                          )}
                          {ficheDetails.data.date_naissance && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Date de naissance</label>
                              <p className="text-sm font-bold text-gray-900">
                                {new Date(ficheDetails.data.date_naissance).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          )}
                          {ficheDetails.data.lieu_naissance && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Lieu de naissance</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.lieu_naissance}</p>
                            </div>
                          )}
                          {ficheDetails.data.cin && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">CIN</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.cin}</p>
                            </div>
                          )}
                          {ficheDetails.data.nationalite && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Nationalité</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.nationalite}</p>
                            </div>
                          )}
                          {ficheDetails.data.profession && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Profession</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.profession}</p>
                            </div>
                          )}
                          {ficheDetails.data.contact && (
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase">Contact</label>
                              <p className="text-sm font-bold text-gray-900">{ficheDetails.data.contact}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Adresse */}
                        {ficheDetails.data.adresse && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Adresse</label>
                            <p className="text-sm text-gray-700">{ficheDetails.data.adresse}</p>
                          </div>
                        )}
                        
                        {/* Description physique */}
                        {(ficheDetails.data.corpulence || ficheDetails.data.cheveux || ficheDetails.data.visage || ficheDetails.data.marques_particulieres) && (
                          <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Description physique</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {ficheDetails.data.corpulence_display && (
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase">Corpulence</label>
                                  <p className="text-sm font-bold text-gray-900">{ficheDetails.data.corpulence_display}</p>
                                </div>
                              )}
                              {ficheDetails.data.cheveux_display && (
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase">Cheveux</label>
                                  <p className="text-sm font-bold text-gray-900">{ficheDetails.data.cheveux_display}</p>
                                </div>
                              )}
                              {ficheDetails.data.visage_display && (
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase">Visage</label>
                                  <p className="text-sm font-bold text-gray-900">{ficheDetails.data.visage_display}</p>
                                </div>
                              )}
                              {ficheDetails.data.marques_particulieres && (
                                <div className="md:col-span-2">
                                  <label className="text-xs font-semibold text-gray-500 uppercase">Marques particulières</label>
                                  <p className="text-sm text-gray-700 mt-1">{ficheDetails.data.marques_particulieres}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Description / Notes */}
                        {ficheDetails.data.description && (
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Description</label>
                            <p className="text-sm text-gray-700">{ficheDetails.data.description}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {/* Vérifier s'il y a des correspondances (même partielles) */}
                {(() => {
                  const hasUPRMatches = scanResults.upr_matches && scanResults.upr_matches.length > 0;
                  const hasCriminelMatches = scanResults.criminel_matches && scanResults.criminel_matches.length > 0;
                  const hasAnyMatches = hasUPRMatches || hasCriminelMatches;
                  
                  if (hasAnyMatches) {
                    // Des correspondances existent (même partielles)
                    return (
                      <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-bold text-blue-900 mb-2">
                              Correspondances trouvées
                            </h3>
                            <p className="text-sm text-blue-800 mb-2">
                              {(scanResults.upr_matches?.length || 0) + (scanResults.criminel_matches?.length || 0)} correspondance(s) trouvée(s) 
                              {(() => {
                                const strictMatches = [
                                  ...(scanResults.upr_matches || []).filter(m => m.similarity_score >= 0.9),
                                  ...(scanResults.criminel_matches || []).filter(m => m.similarity_score >= 0.9)
                                ];
                                if (strictMatches.length === 0) {
                                  return ' avec un score de similarité inférieur au seuil strict (90%).';
                                }
                                return '.';
                              })()}
                              {' '}Consultez les résultats ci-dessous pour plus de détails.
                            </p>
                            <p className="text-xs text-blue-700">
                              Vous pouvez quand même procéder à l'enregistrement si aucune de ces correspondances ne correspond à la personne recherchée.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Aucune correspondance du tout
                    return (
                      <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-bold text-green-900 mb-2">
                              {visagesDetectes.length > 0 
                                ? 'Visage détecté - Aucune correspondance trouvée'
                                : 'Aucune correspondance trouvée'}
                            </h3>
                            <p className="text-sm text-green-800 mb-4">
                              {visagesDetectes.length > 0 
                                ? 'Un visage a été détecté dans l\'image, mais aucune personne correspondante n\'a été trouvée dans la base de données. Vous pouvez procéder à l\'enregistrement de cette nouvelle personne.'
                                : 'Aucune personne correspondante trouvée dans la base de données. Vous pouvez procéder à l\'enregistrement.'}
                            </p>
                            
                            {/* Boutons pour enregistrer avec les captures 1 et 2 */}
                            {visagesDetectes.length > 0 && photoFace && (
                              <div className="mt-4 space-y-3">
                                <div className="mb-3 text-xs text-green-700 bg-green-100 p-3 rounded-lg">
                                  <strong>État des captures :</strong>
                                  <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>Capture 1 (Photo de face) : ✅ Prête</li>
                                    <li>Capture 2 (Empreinte digitale) : {empreinteDigitale ? '✅ Prête (optionnelle)' : '⚠️ Non fournie (optionnelle)'}</li>
                                  </ul>
                                </div>
                                
                                <div className="flex gap-3">
                                  <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => setAfficherFormulaireFiche(true)}
                                    disabled={uploadEnCours}
                                    icon={FileText}
                                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                                  >
                                    Créer une fiche criminelle
                                  </Button>
                                  
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleEnregistrerUPR}
                                    disabled={uploadEnCours}
                                    icon={uploadEnCours ? Loader2 : FileText}
                                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                  >
                                    {uploadEnCours ? 'Enregistrement...' : 'Enregistrer comme UPR'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        )}

        {/* Section en bas : Affichage de tous les fichiers/personnes trouvées */}
        {scanResults && (scanResults.upr_matches?.length > 0 || scanResults.criminel_matches?.length > 0) && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Fichiers correspondants trouvés
            </h3>

            {/* Correspondances UPR */}
            {scanResults.upr_matches && scanResults.upr_matches.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Personnes non identifiées (UPR) - {scanResults.upr_matches.length} résultat(s)
                </h4>
                <div className="space-y-3">
                  {scanResults.upr_matches.map((match, index) => {
                    // Fonction pour obtenir l'URL de la photo UPR
                    const getUPRPhotoUrl = (photoUrl) => {
                      if (!photoUrl) return null;
                      const imgUrl = photoUrl;
                      
                      // Si l'URL est déjà complète avec http:// ou https://
                      if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
                        // Extraire le chemin /media/ si présent (pour utiliser le proxy Vite)
                        if (imgUrl.includes('/media/')) {
                          const mediaMatch = imgUrl.match(/\/media\/.*/);
                          if (mediaMatch) {
                            return mediaMatch[0]; // Utiliser le proxy Vite
                          }
                        }
                        
                        // Si l'URL contient localhost:8000 ou 127.0.0.1:8000, extraire le chemin /media/
                        if (imgUrl.includes('localhost:8000') || imgUrl.includes('127.0.0.1:8000')) {
                          const mediaMatch = imgUrl.match(/\/media\/.*/);
                          if (mediaMatch) {
                            return mediaMatch[0]; // Utiliser le proxy Vite
                          }
                        }
                        
                        // Si on est en HTTPS et que l'URL est en HTTP, convertir
                        if (imgUrl.startsWith('http://') && window.location.protocol === 'https:') {
                          return imgUrl.replace('http://', 'https://');
                        }
                        
                        return imgUrl;
                      }
                      
                      // Pour les URLs relatives commençant par /media/, les retourner telles quelles
                      if (imgUrl.startsWith('/media/')) {
                        return imgUrl;
                      }
                      
                      // Si l'URL ne commence pas par /, ajouter /media/ si c'est un chemin de fichier
                      if (!imgUrl.startsWith('/')) {
                        return `/media/${imgUrl}`;
                      }
                      
                      return imgUrl;
                    };

                    const photoUrl = getUPRPhotoUrl(match.profil_face_url || match.profil_face || match.photo);

                    return (
                      <div
                        key={`upr-${match.id || index}`}
                        className={`p-4 rounded-lg border-2 ${
                          match.similarity_score >= 0.9
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Photo UPR */}
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md overflow-hidden">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={match.nom_temporaire || 'UPR'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center ${photoUrl ? 'hidden' : ''}`}>
                                <User size={32} className="text-white" />
                              </div>
                            </div>
                          </div>

                          {/* Informations UPR */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">
                                UPR
                              </span>
                              {match.similarity_score >= 0.9 && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                  Correspondance stricte
                                </span>
                              )}
                              <span className="text-xs text-gray-600">
                                Score: {(match.similarity_score * 100).toFixed(2)}%
                              </span>
                            </div>
                            {match.code_upr && (
                              <p className="text-sm font-semibold text-gray-900 mb-1">
                                Code UPR: <span className="text-blue-600">{match.code_upr}</span>
                              </p>
                            )}
                            {match.nom_temporaire && (
                              <p className="text-base font-bold text-gray-900 mb-1">
                                {match.nom_temporaire}
                              </p>
                            )}
                            {match.date_enregistrement && (
                              <p className="text-xs text-gray-500 mb-1">
                                Enregistré le: {new Date(match.date_enregistrement).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                            {match.id && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate(`/upr/${match.id}`)}
                                icon={Eye}
                                className="mt-3 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 px-3"
                              >
                                Voir le fichier UPR
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Correspondances Criminels */}
            {scanResults.criminel_matches && scanResults.criminel_matches.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Fiches criminelles - {scanResults.criminel_matches.length} résultat(s)
                </h4>
                <div className="space-y-3">
                  {scanResults.criminel_matches.map((match, index) => {
                    // Fonction pour obtenir l'URL de la photo (même logique que UPRList)
                    const getPhotoUrl = (photoUrl) => {
                      if (!photoUrl) return null;
                      const imgUrl = photoUrl;
                      
                      // Si l'URL est déjà complète avec http:// ou https://
                      if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
                        // Extraire le chemin /media/ si présent (pour utiliser le proxy Vite)
                        if (imgUrl.includes('/media/')) {
                          const mediaMatch = imgUrl.match(/\/media\/.*/);
                          if (mediaMatch) {
                            return mediaMatch[0]; // Utiliser le proxy Vite
                          }
                        }
                        
                        // Si l'URL contient localhost:8000 ou 127.0.0.1:8000, extraire le chemin /media/
                        if (imgUrl.includes('localhost:8000') || imgUrl.includes('127.0.0.1:8000')) {
                          const mediaMatch = imgUrl.match(/\/media\/.*/);
                          if (mediaMatch) {
                            return mediaMatch[0]; // Utiliser le proxy Vite
                          }
                        }
                        
                        // Si on est en HTTPS et que l'URL est en HTTP, convertir
                        if (imgUrl.startsWith('http://') && window.location.protocol === 'https:') {
                          return imgUrl.replace('http://', 'https://');
                        }
                        
                        return imgUrl;
                      }
                      
                      // Pour les URLs relatives commençant par /media/, les retourner telles quelles
                      if (imgUrl.startsWith('/media/')) {
                        return imgUrl;
                      }
                      
                      // Si l'URL ne commence pas par /, ajouter /media/ si c'est un chemin de fichier
                      if (!imgUrl.startsWith('/')) {
                        return `/media/${imgUrl}`;
                      }
                      
                      return imgUrl;
                    };

                    const photoUrl = getPhotoUrl(match.photo_profil || match.photo);

                    return (
                      <div
                        key={`criminel-${match.id || index}`}
                        className={`p-4 rounded-lg border-2 ${
                          match.similarity_score >= 0.9
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Photo du criminel */}
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md overflow-hidden">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={match.nom ? `${match.prenom || ''} ${match.nom}`.trim() : 'Criminel'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center ${photoUrl ? 'hidden' : ''}`}>
                                <User size={32} className="text-white" />
                              </div>
                            </div>
                          </div>

                          {/* Informations du criminel */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                                CRIMINEL
                              </span>
                              {match.similarity_score >= 0.9 && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                  Correspondance stricte
                                </span>
                              )}
                              <span className="text-xs text-gray-600">
                                Score: {(match.similarity_score * 100).toFixed(2)}%
                              </span>
                            </div>
                            
                            {match.numero_fiche && (
                              <p className="text-sm font-semibold text-gray-900 mb-1">
                                N° Fiche: <span className="text-red-600">{match.numero_fiche}</span>
                              </p>
                            )}
                            
                            {match.nom && (
                              <p className="text-base font-bold text-gray-900 mb-1">
                                {match.prenom || ''} {match.nom}
                              </p>
                            )}
                            
                            {match.surnom && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Surnom:</strong> {match.surnom}
                              </p>
                            )}
                            
                            {match.date_naissance && (
                              <p className="text-xs text-gray-500 mb-1">
                                Né(e) le: {new Date(match.date_naissance).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                            
                            {match.lieu_naissance && (
                              <p className="text-xs text-gray-500 mb-1">
                                Lieu de naissance: {match.lieu_naissance}
                              </p>
                            )}
                            
                            {match.id && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate(`/criminels/${match.id}`)}
                                icon={Eye}
                                className="mt-3 bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 px-3"
                              >
                                Voir la fiche criminelle
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulaire de création de fiche criminelle */}
        {afficherFormulaireFiche && visagesDetectes.length > 0 && photoFace && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Créer une fiche criminelle
              </h3>
              <button
                onClick={() => setAfficherFormulaireFiche(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Input
                label="Nom *"
                name="nom"
                value={formDataFiche.nom}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, nom: e.target.value })}
                required
                placeholder="Nom de famille"
              />
              <Input
                label="Prénom *"
                name="prenom"
                value={formDataFiche.prenom}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, prenom: e.target.value })}
                required
                placeholder="Prénom"
              />
              <Input
                label="Date de naissance"
                name="date_naissance"
                type="date"
                value={formDataFiche.date_naissance}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, date_naissance: e.target.value })}
              />
              <Input
                label="Lieu de naissance"
                name="lieu_naissance"
                value={formDataFiche.lieu_naissance}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, lieu_naissance: e.target.value })}
                placeholder="Ville, Pays"
              />
              <Input
                label="CIN"
                name="cin"
                value={formDataFiche.cin}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, cin: e.target.value })}
                placeholder="Numéro CIN"
              />
              <Input
                label="Nationalité"
                name="nationalite"
                value={formDataFiche.nationalite}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, nationalite: e.target.value })}
                placeholder="Nationalité"
              />
              <Input
                label="Adresse"
                name="adresse"
                value={formDataFiche.adresse}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, adresse: e.target.value })}
                placeholder="Adresse complète"
              />
              <Input
                label="Contact"
                name="contact"
                value={formDataFiche.contact}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, contact: e.target.value })}
                placeholder="Téléphone / Email"
              />
              <Input
                label="Profession"
                name="profession"
                value={formDataFiche.profession}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, profession: e.target.value })}
                placeholder="Profession"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Description
              </label>
              <textarea
                value={formDataFiche.notes}
                onChange={(e) => setFormDataFiche({ ...formDataFiche, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes supplémentaires..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAfficherFormulaireFiche(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleEnregistrerFicheCriminelle}
                disabled={uploadEnCours || !formDataFiche.nom || !formDataFiche.prenom}
                icon={uploadEnCours ? Loader2 : Save}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {uploadEnCours ? 'Enregistrement en cours...' : 'Enregistrer la fiche criminelle'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AjouterPhotoCriminelle;
