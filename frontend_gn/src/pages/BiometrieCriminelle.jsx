import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Fingerprint, Camera, Search, User, CheckCircle, AlertCircle, 
  X, Eye, AlertTriangle, Image, Download, Loader2, CheckCircle2, Plus
} from 'lucide-react';
import { getAuthToken } from '../utils/sessionStorage';
import { useNotification } from '../context/NotificationContext';
import TeleverseurEmpreinte from '../../components/biometrie/TeleverseurEmpreinte';
import { API_BASE_URL } from '../config/api';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const BiometrieCriminelle = () => {
  const navigate = useNavigate();
  const [criminels, setCriminels] = useState([]);
  const [criminelSelectionne, setCriminelSelectionne] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState({ type: '', texte: '' });
  
  // Onglets principaux: 'photos', 'empreintes'
  const [ongletPrincipal, setOngletPrincipal] = useState('photos');
  
  // Photos uploadées
  const [photosAffichees, setPhotosAffichees] = useState([]);
  const [photoSelectionnee, setPhotoSelectionnee] = useState(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  
  // Empreintes uploadées
  const [empreintesAffichees, setEmpreintesAffichees] = useState([]);
  const [empreinteSelectionnee, setEmpreinteSelectionnee] = useState(null);
  const [modalEmpreinteOuvert, setModalEmpreinteOuvert] = useState(false);
  const [encodageEnCours, setEncodageEnCours] = useState(false);
  
  // Landmarks 106 pour le modal photo
  const [landmarks106Modal, setLandmarks106Modal] = useState(null);
  const [isAnalyzing106Modal, setIsAnalyzing106Modal] = useState(false);
  const canvasRefModal = useRef(null);
  const imageRefModal = useRef(null);

  const notification = useNotification();
  
  // Effacer automatiquement les messages après 5 secondes
  useEffect(() => {
    if (message.texte) {
      const timer = setTimeout(() => {
        setMessage({ type: '', texte: '' });
      }, 5000); // 5 secondes
      
      return () => clearTimeout(timer);
    }
  }, [message.texte]);

  // Helper pour construire l'URL API correctement
  const getAPIUrl = (endpoint) => {
    // Utiliser la configuration centralisée de l'API
    const baseURL = API_BASE_URL || 'http://127.0.0.1:8000/api';
    
    // Nettoyer l'URL de base (enlever les slashes à la fin)
    const cleanBaseURL = baseURL.replace(/\/+$/, '');
    // S'assurer que l'endpoint commence par /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Construire l'URL finale
    const finalURL = `${cleanBaseURL}${cleanEndpoint}`;
    
    // Log pour débogage
    console.log('Construction URL API:', { baseURL, cleanBaseURL, endpoint, finalURL });
    
    return finalURL;
  };

  // Helper pour corriger les URLs d'images (utiliser le proxy Vite pour les médias)
  const fixImageUrl = (url) => {
    if (!url) return url;
    
    // Si c'est une URL relative, la retourner telle quelle
    if (url.startsWith('/')) {
      return url;
    }
    
    // Détecter si on est en développement local
    const isLocalDev = url.includes('localhost') || url.includes('127.0.0.1');
    const isHttpsPage = window.location.protocol === 'https:';
    
    // Si la page est en HTTPS et l'URL contient /media/ (développement local)
    if (isHttpsPage && url.includes('/media/') && isLocalDev) {
      // Extraire le chemin /media/... de l'URL
      const mediaMatch = url.match(/\/media\/.*/);
      if (mediaMatch) {
        // Utiliser le proxy Vite qui sert les médias via HTTPS
        return mediaMatch[0]; // Retourner juste le chemin relatif /media/...
      }
    }
    
    // Si la page est en HTTPS et l'URL est en HTTP
    if (isHttpsPage && url.startsWith('http://')) {
      // Remplacer 127.0.0.1 par localhost
      if (url.includes('127.0.0.1')) {
        url = url.replace('127.0.0.1', 'localhost');
      }
      // Si c'est une URL de média en développement, utiliser le proxy
      if (url.includes('/media/') && isLocalDev) {
        const mediaMatch = url.match(/\/media\/.*/);
        if (mediaMatch) {
          return mediaMatch[0];
        }
      }
      // Sinon, convertir en HTTPS pour la production
      url = url.replace('http://', 'https://');
    } else if (url.includes('127.0.0.1')) {
      // Remplacer 127.0.0.1 par localhost pour la cohérence
      url = url.replace('127.0.0.1', 'localhost');
    }
    
    return url;
  };

  // Recherche avec debounce - appel API après 500ms d'inactivité
  // NE CHARGER QUE SI UNE RECHERCHE EST EFFECTUÉE
  useEffect(() => {
    // Ne rien faire si la recherche est vide
    if (!recherche || recherche.trim() === '') {
      setCriminels([]);
      return;
    }

    const timer = setTimeout(() => {
      console.log('Debounce terminé, recherche en cours...');
      chargerCriminels(recherche);
    }, 500); // Attendre 500ms après la dernière frappe

    return () => {
      console.log(' Annulation du timer précédent');
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  const chargerCriminels = async (searchTerm = '') => {
    setChargement(true);
    try {
      const token = getAuthToken();
      
      console.log(' Token récupéré:', token ? ' Existe' : ' Manquant');
      
      // Construire l'URL avec le paramètre de recherche si présent
      let url = getAPIUrl('/criminel/fiches-criminelles/');
      
      if (searchTerm && searchTerm.trim() !== '') {
        url += `?search=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      console.log(' Recherche:', searchTerm);
      console.log(' URL finale:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(' Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(' Données reçues:', data);
        console.log(' Nombre de criminels:', (data.results || data).length);
        setCriminels(data.results || data);
      } else if (response.status === 401) {
        // Token invalide ou expiré
        const errorData = await response.json().catch(() => ({}));
        console.error(' Erreur 401:', errorData);
        console.error(' Token utilisé:', token);
        
        setMessage({ 
          type: 'error', 
          texte: ' Token invalide. Veuillez vous reconnecter manuellement.' 
        });
        
        // NE PAS rediriger automatiquement - laisser l'utilisateur contrôler
        // L'utilisateur peut cliquer sur "Se reconnecter" manuellement
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(' Erreur API:', errorData);
        setMessage({ 
          type: 'error', 
          texte: ` Erreur API: ${errorData.detail || response.status}` 
        });
      }
    } catch (error) {
      console.error(' Erreur chargement criminels:', error);
      
      // Gérer les erreurs avec le gestionnaire centralisé
      const { getErrorMessage } = await import('../utils/errorHandler')
      const errorInfo = getErrorMessage(error)
      setMessage({ 
        type: 'error', 
        texte: errorInfo.message || 'Erreur lors du chargement des criminels. Vérifiez votre connexion.' 
      });
    } finally {
      setChargement(false);
    }
  };

  // Utiliser directement les criminels chargés depuis l'API (déjà filtrés côté backend)
  const criminelsFiltres = criminels;

  // Gérer la sélection d'un criminel
  const selectionnerCriminel = (criminel) => {
    setCriminelSelectionne(criminel);
    setMessage({ type: '', texte: '' });
  };

  // Charger photos et empreintes d'un criminel
  const chargerPhotos = useCallback(async () => {
    if (!criminelSelectionne) return;
    
    try {
      const token = getAuthToken();
      const url = getAPIUrl(`/biometrie/photos/?criminel=${criminelSelectionne.id}`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhotosAffichees(data.results || data);
      }
    } catch (error) {
      console.error('Erreur chargement photos:', error);
    }
  }, [criminelSelectionne]);

  const chargerEmpreintes = useCallback(async () => {
    if (!criminelSelectionne) return;
    
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const criminelId = criminelSelectionne.id;

      const [respEmp, respPaume] = await Promise.all([
        fetch(getAPIUrl(`/biometrie/empreintes/?criminel=${criminelId}`), { headers }),
        fetch(getAPIUrl(`/biometrie/paumes/?criminel=${criminelId}`), { headers }),
      ]);

      let empreintes = [];
      if (respEmp.ok) {
        const empData = await respEmp.json();
        empreintes = empData.results || empData || [];
      }

      let paumes = [];
      if (respPaume.ok) {
        const paumeData = await respPaume.json();
        paumes = paumeData.results || paumeData || [];
      }

      const paumesNormalisees = paumes.map((p) => ({
        ...p,
        doigt: p.paume,
        type_empreinte: 'palmaire',
      }));

      setEmpreintesAffichees([...empreintes, ...paumesNormalisees]);
    } catch (error) {
      console.error('Erreur chargement empreintes:', error);
    }
  }, [criminelSelectionne]);

  useEffect(() => {
    if (criminelSelectionne) {
      chargerPhotos();
      chargerEmpreintes();
    }
  }, [criminelSelectionne, chargerPhotos, chargerEmpreintes]);

  const sauvegarderPhotosBiometriques = async () => {
    if (!criminelSelectionne) {
      setMessage({ type: 'error', texte: ' Veuillez sélectionner un criminel avant de sauvegarder' });
      return;
    }

    if (!photosAffichees || photosAffichees.length === 0) {
      setMessage({ type: 'error', texte: ' Aucune photo biométrique à sauvegarder' });
      return;
    }

    try {
      setEncodageEnCours(true);

      const token = getAuthToken();
      const endpoint = getAPIUrl('/biometrie/enregistrer/');

      let succes = 0;
      let echecs = 0;

      for (const photo of photosAffichees) {
        try {
          const telechargement = await fetch(fixImageUrl(photo.image), {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!telechargement.ok) {
            throw new Error("Impossible de récupérer la photo");
          }

          const blob = await telechargement.blob();
          const extension = blob.type?.split('/')[1] || 'jpg';
          const filename = `photo_${photo.id || Date.now()}.${extension}`;
          const fichier = new File([blob], filename, { type: blob.type || 'image/jpeg' });

          const formData = new FormData();
          formData.append('criminel_id', criminelSelectionne.id);
          formData.append('photo', fichier);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Erreur lors de l'encodage facial");
          }

          succes += 1;
        } catch (error) {
          console.error('Erreur encodage photo:', error);
          echecs += 1;
        }
      }

      if (succes > 0) {
        setMessage({ type: 'success', texte: ` ${succes} photo(s) encodée(s) avec succès` });
      }

      if (echecs > 0) {
        setMessage({ type: 'error', texte: ` ${echecs} photo(s) n'ont pas pu être encodées` });
      }
    } catch (error) {
      console.error('Erreur sauvegarde photos biométriques:', error);
      setMessage({ type: 'error', texte: ` Erreur sauvegarde: ${error.message}` });
    } finally {
      setEncodageEnCours(false);
    }
  };

  // Gérer l'upload de fichiers avec type de photo
  const handleFileChange = async (event, typePhoto = 'face') => {
    if (!criminelSelectionne) {
      setMessage({ type: 'error', texte: 'Veuillez sélectionner un criminel d\'abord' });
      return;
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    await uploadFiles(files, typePhoto);
  };

  // Upload des fichiers (utilisé par handleFileChange et drag & drop)
  const uploadFiles = async (files, typePhoto = 'face') => {
    // Limiter à 1 fichier par type
    if (files.length > 1) {
      setMessage({ type: 'error', texte: 'Une seule photo par type autorisée' });
      return;
    }

    try {
      const token = getAuthToken();
      const urlUpload = getAPIUrl('/biometrie/photos/');
      const urlEncodage = getAPIUrl('/biometrie/enregistrer/');

      let uploadsReussis = 0;
      let encodagesReussis = 0;
      let encodagesEchoues = 0;

      for (const file of files) {
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          setMessage({ type: 'error', texte: ` Format non accepté pour ${file.name}` });
          continue;
        }

        const formData = new FormData();
        formData.append('criminel', criminelSelectionne.id);
        formData.append('type_photo', typePhoto);
        formData.append('image', file);
        formData.append('qualite', 85);
        formData.append('est_principale', typePhoto === 'face' ? 'true' : 'false');
        formData.append('est_active', 'true');

        let noteDescription = '';
        if (typePhoto === 'profil_gauche') {
          noteDescription = 'Profil gauche (90°) - Oreille gauche visible';
        } else if (typePhoto === 'face') {
          noteDescription = 'Photo frontale (0°) - Vue de face';
        } else if (typePhoto === 'profil_droit') {
          noteDescription = 'Profil droit (90°) - Oreille droite visible';
        }
        formData.append('notes', `${noteDescription} - ${criminelSelectionne.nom} ${criminelSelectionne.prenom}`);

        const response = await fetch(urlUpload, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const responseData = await response.json().catch(() => ({}));

        // Vérifier si la photo correspond à un criminel existant
        if (responseData.existing_criminal === true) {
          setMessage({ 
            type: 'warning', 
            texte: `Cette photo correspond à un dossier criminel déjà enregistré: ${responseData.nom_complet || 'Criminel #' + responseData.criminel_id}` 
          });
          
          // Rediriger vers le criminel existant après un court délai
          setTimeout(() => {
            if (responseData.criminel_id) {
              window.location.href = `/fiches-criminelles/${responseData.criminel_id}`;
            }
          }, 2000);
          
          return; // Ne pas continuer l'upload
        }

        if (!response.ok) {
          throw new Error(responseData.detail || responseData.error || 'Erreur lors de l\'upload');
        }

        uploadsReussis += 1;

        try {
          const encodageForm = new FormData();
          encodageForm.append('criminel_id', criminelSelectionne.id);
          encodageForm.append('photo', file);

          const encodageResponse = await fetch(urlEncodage, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: encodageForm
          });

          if (!encodageResponse.ok) {
            encodagesEchoues += 1;
          } else {
            encodagesReussis += 1;
          }
        } catch (err) {
          console.error('Erreur encodage ArcFace:', err);
          encodagesEchoues += 1;
        }
      }

      if (uploadsReussis > 0) {
        let texte = ` ${uploadsReussis} photo(s) ajoutée(s)`;
        if (encodagesReussis > 0) {
          texte += ` et encodée(s) (${encodagesReussis})`;
        }
        if (encodagesEchoues > 0) {
          texte += ` • ${encodagesEchoues} encodage(s) à réessayer`;
        }
        setMessage({ type: encodagesEchoues > 0 ? 'error' : 'success', texte });
        await chargerPhotos();
      }
    } catch (error) {
      console.error(' Erreur upload:', error);
      setMessage({ type: 'error', texte: ` Erreur: ${error.message}` });
    }
  };


  // Fonction pour l'upload des empreintes digitales
  const handleEmpreinteUpload = async (formData) => {
    const criminelId = formData.get('criminel') || formData.get('suspectId') || criminelSelectionne?.id;
    if (!criminelId) {
      throw new Error('Aucun criminel sélectionné');
    }

    try {
      const token = getAuthToken();
      const uploadData = new FormData();
      uploadData.append('criminel', criminelId);

      for (const [key, value] of formData.entries()) {
        if (key === 'suspectId' || key === 'criminel') continue;
        if (value instanceof File) {
          uploadData.append(key, value);
        }
      }

      const url = getAPIUrl('/biometrie/empreintes/upload-lot/');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = data.erreur || data.detail || data.details || 'Erreur lors de l\'upload';
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }

      const count = data.count || 0;
      setMessage({
        type: 'success',
        texte: `${count} empreinte(s) enregistrée(s) avec succès`,
      });
      await chargerEmpreintes();
    } catch (error) {
      console.error(' Erreur upload empreintes:', error);
      setMessage({ type: 'error', texte: ` Erreur upload empreintes: ${error.message}` });
      throw error;
    }
  };

  // Supprimer une photo
  const supprimerPhoto = async (photoId) => {
    const confirmed = await notification.showConfirm({
      title: 'Supprimer cette photo ?',
      message: "Êtes-vous sûr de vouloir supprimer définitivement cette photo biométrique ?\nCette action est irréversible.",
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });

    if (!confirmed) {
      return;
    }

    try {
      const token = getAuthToken();
      const url = getAPIUrl(`/biometrie/photos/${photoId}/`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Impossible de supprimer la photo");
      }

      setMessage({ type: 'success', texte: ' Photo supprimée avec succès' });
      await chargerPhotos();
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      setMessage({ type: 'error', texte: ` Erreur suppression photo: ${error.message}` });
    }
  };

  // Supprimer une empreinte (digitale ou palmaire)
  const supprimerEmpreinte = async (empreinte) => {
    const empreinteId = typeof empreinte === 'object' ? empreinte.id : empreinte;
    const isPaume = typeof empreinte === 'object' && empreinte.type_empreinte === 'palmaire';

    const confirmed = await notification.showConfirm({
      title: 'Supprimer cette empreinte ?',
      message: "Cette empreinte sera définitivement retirée du dossier biométrique.",
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });

    if (!confirmed) {
      return;
    }

    try {
      const token = getAuthToken();
      const endpoint = isPaume ? '/biometrie/paumes/' : '/biometrie/empreintes/';
      const url = getAPIUrl(`${endpoint}${empreinteId}/`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Impossible de supprimer l'empreinte");
      }

      setMessage({ type: 'success', texte: ' Empreinte supprimée avec succès' });
      await chargerEmpreintes();
    } catch (error) {
      console.error('Erreur suppression empreinte:', error);
      setMessage({ type: 'error', texte: ` Erreur suppression empreinte: ${error.message}` });
    }
  };

  // Fonction pour analyser les 106 landmarks dans le modal
  const analyserLandmarks106Modal = async () => {
    if (!photoSelectionnee || !photoSelectionnee.image || isAnalyzing106Modal) {
      return
    }

    setIsAnalyzing106Modal(true)
    setMessage({ type: '', texte: '' })

    try {
      // Télécharger l'image
      const token = getAuthToken()
      const imageUrl = fixImageUrl(photoSelectionnee.image)
      
      const response = await fetch(imageUrl, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error("Impossible de récupérer la photo")
      }

      const blob = await response.blob()
      const extension = blob.type?.split('/')[1] || 'jpg'
      const filename = `photo_${photoSelectionnee.id || Date.now()}.${extension}`
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })

      const formData = new FormData()
      formData.append('image', file)

      const apiResponse = await api.post('/biometrie/landmarks106/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (apiResponse.data.success && apiResponse.data.landmarks) {
        setLandmarks106Modal(apiResponse.data)
        
        // Dessiner les landmarks et le bounding box sur le canvas
        setTimeout(() => {
          dessinerLandmarksModal(apiResponse.data.landmarks, apiResponse.data.bbox)
        }, 100)
        
        setMessage({ type: 'success', texte: 'Analyse des 106 landmarks terminée avec succès.' })
      } else {
        const errorMsg = apiResponse.data.error || 'Aucun visage détecté. Réessayer.'
        setMessage({ type: 'error', texte: errorMsg })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de l\'analyse biométrique'
      setMessage({ type: 'error', texte: errorMessage })
    } finally {
      setIsAnalyzing106Modal(false)
    }
  }

  // Fonction pour dessiner les landmarks dans le modal
  const dessinerLandmarksModal = (landmarks, _bbox) => {
    const canvas = canvasRefModal.current
    const imageElement = imageRefModal.current
    
    if (!canvas || !imageElement || !landmarks || landmarks.length === 0) {
      return
    }

    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const displayedWidth = imageElement.offsetWidth || imageElement.clientWidth
      const displayedHeight = imageElement.offsetHeight || imageElement.clientHeight
      const scaleX = displayedWidth / img.width
      const scaleY = displayedHeight / img.height

      canvas.width = displayedWidth
      canvas.height = displayedHeight

      // Convertir les landmarks
      const scaledLandmarks = landmarks.map((point) => {
        if (point && point.length === 2) {
          return { x: point[0] * scaleX, y: point[1] * scaleY }
        }
        return null
      }).filter(p => p !== null)

      // Dessiner les points
      ctx.fillStyle = '#ff0000'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 0.5
      scaledLandmarks.forEach((point) => {
        if (point) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()
        }
      })
    }
    
    if (photoSelectionnee && photoSelectionnee.image) {
      img.src = fixImageUrl(photoSelectionnee.image)
    }
  }

  const ongletsPrincipaux = [
    { id: 'photos', label: 'Photos enregistrées', icone: Camera },
    { id: 'empreintes', label: 'Empreintes digitales', icone: Fingerprint }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contenu principal sans sidebar (car elle est déjà dans Layout.jsx) */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        
        {/* Section de sélection du criminel */}
        {!criminelSelectionne && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4">
              <User className="mr-2" size={24} />
              Sélectionner un criminel
            </h2>

            {/* Barre de recherche */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, surnom, N° fiche..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {chargement && recherche ? (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                  </div>
                ) : recherche ? (
                  <button
                    onClick={() => setRecherche('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                ) : null}
              </div>
              {/* Info sur la recherche */}
              {recherche && !chargement && (
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Search size={12} className="mr-1" />
                  Recherche avancée : nom, prénom, surnom, N° fiche, description, adresse
                </p>
              )}
            </div>
            
            {/* Compteur de résultats */}
            {recherche && (
              <div className="mb-3 text-sm text-gray-600">
                <span className="font-semibold">{criminelsFiltres.length}</span> résultat{criminelsFiltres.length > 1 ? 's' : ''} trouvé{criminelsFiltres.length > 1 ? 's' : ''}
              </div>
            )}

            {/* Liste des criminels en tableau */}
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              {chargement ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin h-12 w-12 text-indigo-500 mx-auto" />
                  <p className="text-gray-500 mt-4">Chargement...</p>
                </div>
              ) : !recherche || recherche.trim() === '' ? (
                <div className="text-center py-16">
                  <Search className="mx-auto text-gray-200 mb-4" size={80} />
                </div>
              ) : criminelsFiltres.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-8 bg-red-50 rounded-full mb-6">
                    <AlertCircle className="text-red-400" size={64} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Aucun criminel trouvé
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Aucun résultat pour "<span className="font-semibold text-indigo-600">{recherche}</span>"
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Photo</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">N° Fiche</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Nom complet</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Surnom</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Date de naissance</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Lieu</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Nationalité</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">CIN</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {criminelsFiltres.map((criminel) => {
                        // Calculer l'âge si date de naissance disponible
                        let age = null;
                        if (criminel.date_naissance) {
                          const today = new Date();
                          const birthDate = new Date(criminel.date_naissance);
                          age = today.getFullYear() - birthDate.getFullYear();
                          const monthDiff = today.getMonth() - birthDate.getMonth();
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                          }
                        }

                        return (
                          <tr 
                            key={criminel.id}
                            className="hover:bg-indigo-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow">
                                {criminel.photo_profil ? (
                                  <img
                                    src={criminel.photo_profil}
                                    alt={`${criminel.prenom} ${criminel.nom}`}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <User size={24} className="text-white" />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-indigo-600">
                                {criminel.numero_fiche || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {criminel.prenom} {criminel.nom}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {criminel.sexe_display || criminel.sexe}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {criminel.surnom ? (
                                <span className="text-sm italic text-purple-600">
                                  "{criminel.surnom}"
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {criminel.date_naissance ? (
                                <div className="text-sm">
                                  <p className="font-medium text-gray-900">
                                    {new Date(criminel.date_naissance).toLocaleDateString('fr-FR')}
                                  </p>
                                  {age !== null && (
                                    <p className="text-xs text-gray-500">{age} ans</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">
                                {criminel.lieu_naissance || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">
                                {criminel.nationalite || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-mono text-gray-600">
                                {criminel.cin || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => selectionnerCriminel(criminel)}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all flex items-center mx-auto"
                              >
                                <CheckCircle size={16} className="mr-1" />
                                Sélectionner
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Affichage du criminel sélectionné */}
        {criminelSelectionne && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle size={28} />
                <div>
                  <p className="text-sm opacity-90">Criminel sélectionné</p>
                  <p className="font-bold text-xl">
                    {criminelSelectionne.prenom} {criminelSelectionne.nom}
                  </p>
                  <p className="text-xs opacity-75">
                    N° {criminelSelectionne.numero_fiche || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCriminelSelectionne(null);
                  setPhotosAffichees([]);
                }}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all flex items-center"
              >
                <X size={20} className="mr-2" />
                Changer
              </button>
            </div>
          </div>
        )}
        
        {/* Onglets principaux */}
        <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {ongletsPrincipaux.map((onglet) => {
              const Icone = onglet.icone;
              const isActif = ongletPrincipal === onglet.id;
              
              return (
                <button
                  key={onglet.id}
                  onClick={() => setOngletPrincipal(onglet.id)}
                  className={`flex-1 min-w-fit px-6 py-4 font-medium transition-all flex items-center justify-center space-x-2 border-b-2 ${
                    isActif
                      ? 'border-pink-500 bg-white text-gray-900'
                      : 'border-transparent text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icone size={20} />
                  <span>{onglet.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenu selon l'onglet principal */}
        {ongletPrincipal === 'photos' && (
          <div className="bg-white rounded-b-lg shadow-sm p-6">
            {/* Contenu Gestion des Photos */}
                  {criminelSelectionne && (
                    <div className="space-y-6">
                      {/* Zones d'upload pour les 3 types de photos */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Photo Profil Gauche */}
                  <div className="group">
                    <div className="bg-white border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300" style={{ borderColor: '#BBE4FC' }}>
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" style={{ backgroundColor: '#BBE4FC' }}>
                          <span className="text-3xl font-bold" style={{ color: '#1e40af' }}>↶</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Profil gauche
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">Angle 90° gauche</p>
                        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: '#BBE4FC', color: '#1e40af' }}>
                          Recommandé
                        </span>
                      </div>

                      <input
                        type="file"
                        id="photo-gauche"
                        accept="image/jpeg,image/png"
                        onChange={(e) => handleFileChange(e, 'profil_gauche')}
                        className="hidden"
                      />
                      <label
                        htmlFor="photo-gauche"
                        className="block cursor-pointer border-3 border-dashed rounded-xl p-8 text-center transition-all duration-300 group-hover:scale-105"
                        style={{ borderColor: '#BBE4FC', backgroundColor: '#f0f9ff' }}
                      >
                        <Camera size={48} className="mx-auto mb-3" style={{ color: '#1e40af' }} />
                        <p className="text-base font-bold mb-2" style={{ color: '#1e40af' }}>
                          Téléverser la photo
                        </p>
                        <p className="text-xs text-gray-600 font-medium">
                          JPG, PNG • Max 10 MB
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Photo de Face */}
                  <div className="group">
                    <div className="bg-white border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300" style={{ borderColor: '#BBE4FC' }}>
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" style={{ backgroundColor: '#BBE4FC' }}>
                          <User size={40} style={{ color: '#1e40af' }} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Face
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">Angle 0° frontal</p>
                        <span className="inline-block px-4 py-1.5 text-white rounded-full text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: '#ef4444' }}>
                          Obligatoire
                        </span>
                      </div>

                      <input
                        type="file"
                        id="photo-face"
                        accept="image/jpeg,image/png"
                        onChange={(e) => handleFileChange(e, 'face')}
                        className="hidden"
                      />
                      <label
                        htmlFor="photo-face"
                        className="block cursor-pointer border-3 border-dashed rounded-xl p-8 text-center transition-all duration-300 group-hover:scale-105"
                        style={{ borderColor: '#BBE4FC', backgroundColor: '#f0f9ff' }}
                      >
                        <Camera size={48} className="mx-auto mb-3" style={{ color: '#1e40af' }} />
                        <p className="text-base font-bold mb-2" style={{ color: '#1e40af' }}>
                          Téléverser la photo
                        </p>
                        <p className="text-xs text-gray-600 font-medium">
                          JPG, PNG • Max 10 MB
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Photo Profil Droit */}
                  <div className="group">
                    <div className="bg-white border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300" style={{ borderColor: '#BBE4FC' }}>
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" style={{ backgroundColor: '#BBE4FC' }}>
                          <span className="text-3xl font-bold" style={{ color: '#1e40af' }}>↷</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Profil droit
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">Angle 90° droit</p>
                        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: '#BBE4FC', color: '#1e40af' }}>
                          Recommandé
                        </span>
                      </div>

                      <input
                        type="file"
                        id="photo-droite"
                        accept="image/jpeg,image/png"
                        onChange={(e) => handleFileChange(e, 'profil_droit')}
                        className="hidden"
                      />
                      <label
                        htmlFor="photo-droite"
                        className="block cursor-pointer border-3 border-dashed rounded-xl p-8 text-center transition-all duration-300 group-hover:scale-105"
                        style={{ borderColor: '#BBE4FC', backgroundColor: '#f0f9ff' }}
                      >
                        <Camera size={48} className="mx-auto mb-3" style={{ color: '#1e40af' }} />
                        <p className="text-base font-bold mb-2" style={{ color: '#1e40af' }}>
                          Téléverser la photo
                        </p>
                        <p className="text-xs text-gray-600 font-medium">
                          JPG, PNG • Max 10 MB
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Zone d'affichage des photos */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <Camera size={24} className="mr-2" style={{ color: '#1e40af' }} />
                      Photos enregistrées ({photosAffichees.length})
                    </h3>
                    <button
                      onClick={() => navigate('/ajouter-photo-criminelle')}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                      <Plus size={20} />
                      <span>Ajouter une photo</span>
                    </button>
                  </div>
                  
                  <div className={photosAffichees.length === 0 ? "border-2 border-dashed border-gray-300 rounded-xl p-12 bg-gray-50" : ""}>
                  {photosAffichees.length === 0 ? (
                    <div className="text-center">
                      <div className="mb-4 p-6 bg-gray-200 rounded-full inline-flex">
                        <Image size={64} className="text-gray-400" />
                      </div>
                      <p className="text-xl font-semibold text-gray-600">
                        Aucune photo disponible
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      {photosAffichees.map((photo, index) => (
                        <div key={photo.id || index} className="relative group bg-white rounded-2xl shadow-xl overflow-hidden transition-all hover:shadow-2xl hover:scale-[1.02]">
                          {/* Image */}
                          <div className="relative h-80 bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden">
                            <img
                              src={fixImageUrl(photo.image)}
                              alt={`Photo ${photo.type_photo || index + 1}`}
                              className="w-full h-full object-cover cursor-pointer transition-all duration-300 group-hover:scale-105"
                              onClick={() => {
                                setPhotoSelectionnee(photo);
                                setModalOuvert(true);
                              }}
                              onError={(e) => {
                                console.error(' Erreur chargement image:', photo.image);
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            
                            {/* Tag type de photo */}
                            <div className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-bold shadow-2xl backdrop-blur-sm"
                                 style={{
                                   backgroundColor: '#BBE4FC',
                                   color: '#1e40af'
                                 }}>
                              {photo.type_photo === 'profil_gauche' ? '↶ Profil gauche' :
                               photo.type_photo === 'face' ? 'Face' :
                               photo.type_photo === 'profil_droit' ? '↷ Profil droit' :
                               photo.type_photo || 'Photo'}
                            </div>

                            {/* Overlay avec boutons au hover */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoSelectionnee(photo);
                                  setModalOuvert(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-all bg-white text-gray-800 p-3 rounded-full hover:bg-gray-100 transform hover:scale-110 shadow-xl"
                              >
                                <Eye size={20} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  supprimerPhoto(photo.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-all bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transform hover:scale-110 shadow-xl"
                              >
                                <X size={20} />
                              </button>
                            </div>
                          </div>

                          {/* Info de la photo */}
                          <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
                            <p className="text-sm text-gray-700 font-semibold text-center">
                              {new Date(photo.date_capture).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                  {/* Bouton global de sauvegarde des photos - placé en bas de la section */}
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={sauvegarderPhotosBiometriques}
                      disabled={encodageEnCours}
                      className={`px-6 py-3 rounded-xl font-semibold text-white shadow transition-all flex items-center gap-2 ${
                        encodageEnCours
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                      }`}
                    >
                      {encodageEnCours ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 text-white" />
                          <span>Encodage en cours…</span>
                        </>
                      ) : (
                        'Sauvegarder les photos'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Message si aucun criminel sélectionné */}
            {!criminelSelectionne && (
              <div className="text-center py-12">
                <div className="inline-flex p-8 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full mb-6">
                  <AlertTriangle className="text-orange-600" size={64} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Sélectionnez un criminel
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Veuillez d'abord sélectionner un criminel dans la liste de gauche
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contenu Onglet Empreintes Digitales */}
        {ongletPrincipal === 'empreintes' && (
          <div className="bg-white rounded-b-lg shadow-sm p-6">
            {criminelSelectionne ? (
              <div className="space-y-8">
                {/* Composant d'upload des empreintes */}
                <TeleverseurEmpreinte 
                  onUpload={handleEmpreinteUpload}
                  suspectId={criminelSelectionne.id}
                />

                {/* Zone d'affichage des empreintes */}
                {empreintesAffichees.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <Fingerprint size={24} className="mr-2 text-indigo-600" />
                      Empreintes enregistrées ({empreintesAffichees.length})
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {empreintesAffichees.map((empreinte, index) => (
                        <div key={empreinte.id || index} className="relative group bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:scale-105">
                          {/* Image de l'empreinte */}
                          <div className="relative h-48 bg-gray-100 overflow-hidden">
                            <img
                              src={fixImageUrl(empreinte.image)}
                              alt={`Empreinte ${empreinte.doigt || index + 1}`}
                              className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-110"
                              onClick={() => {
                                setEmpreinteSelectionnee(empreinte);
                                setModalEmpreinteOuvert(true);
                              }}
                              onError={(e) => {
                                console.error(' Erreur chargement empreinte:', empreinte.image);
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EEmpreinte%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            
                            {/* Tag doigt */}
                            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg text-white bg-indigo-600">
                              {empreinte.doigt || 'Empreinte'}
                            </div>

                            {/* Overlay avec boutons au hover */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmpreinteSelectionnee(empreinte);
                                  setModalEmpreinteOuvert(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-all bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transform hover:scale-110 shadow-xl"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  supprimerEmpreinte(empreinte);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-all bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transform hover:scale-110 shadow-xl"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Info de l'empreinte */}
                          <div className="p-2 bg-gradient-to-r from-gray-50 to-gray-100">
                            <p className="text-xs text-gray-600 font-medium text-center truncate">
                              {empreinte.doigt?.replace('_', ' ') || 'Empreinte'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex p-8 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full mb-6">
                  <AlertTriangle className="text-orange-600" size={64} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Sélectionnez un criminel
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Veuillez d'abord sélectionner un criminel dans la liste en haut
                </p>
              </div>
            )}
          </div>
        )}

        {/* Messages de notification */}
        {message.texte && (
          <div className={`fixed top-6 right-6 rounded-xl p-4 flex items-center shadow-2xl z-50 ${
            message.type === 'success' 
              ? 'bg-green-50 border-2 border-green-200 text-green-800'
              : 'bg-red-50 border-2 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="mr-3 flex-shrink-0" size={24} />
            ) : (
              <AlertCircle className="mr-3 flex-shrink-0" size={24} />
            )}
            <span className="font-medium">{message.texte}</span>
            <button
              onClick={() => setMessage({ type: '', texte: '' })}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Modal de visualisation photo */}
        {modalOuvert && photoSelectionnee && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* En-tête du modal */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Camera size={24} />
                  <div>
                    <h3 className="font-bold text-lg">Photo Biométrique</h3>
                    <p className="text-xs opacity-90">
                      {photoSelectionnee.type_photo || 'Face'} • Qualité: {photoSelectionnee.qualite || 85}%
                      {landmarks106Modal && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-600 rounded text-white font-semibold">
                          ✓ 106 pts
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalOuvert(false);
                    setPhotoSelectionnee(null);
                    setLandmarks106Modal(null);
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Image avec canvas superposé */}
              <div className="p-6 bg-gray-100 relative">
                <div className="relative inline-block max-w-full">
                <img
                    ref={imageRefModal}
                  src={fixImageUrl(photoSelectionnee.image)}
                  alt="Photo biométrique"
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-lg mx-auto"
                />
                  {/* Canvas superposé pour les 106 landmarks */}
                  <canvas
                    ref={canvasRefModal}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ maxHeight: '60vh' }}
                  />
                </div>
              </div>

              {/* Bouton Analyser visage (106 points) */}
              <div className="px-6 pb-4">
                <button
                  onClick={analyserLandmarks106Modal}
                  disabled={isAnalyzing106Modal}
                  className={`w-full px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 ${
                    isAnalyzing106Modal
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : landmarks106Modal
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                  }`}
                >
                  {isAnalyzing106Modal ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Analyse biométrique en cours…</span>
                    </>
                  ) : landmarks106Modal ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Re-analyser visage (106 points)</span>
                    </>
                  ) : (
                    <>
                      <Eye size={18} />
                      <span>Analyser visage (106 points)</span>
                    </>
                  )}
                </button>

              </div>

              {/* Informations */}
              {photoSelectionnee.notes && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Notes: </span>
                    {photoSelectionnee.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    // Télécharger l'image
                    const link = document.createElement('a');
                    link.href = fixImageUrl(photoSelectionnee.image);
                    link.download = `photo_${photoSelectionnee.id}.jpg`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all flex items-center"
                >
                  <Download size={18} className="mr-2" />
                  Télécharger
                </button>
                <button
                  onClick={() => supprimerPhoto(photoSelectionnee.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all flex items-center"
                >
                  <X size={18} className="mr-2" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de visualisation empreinte */}
        {modalEmpreinteOuvert && empreinteSelectionnee && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* En-tête du modal */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Fingerprint size={24} />
                  <div>
                    <h3 className="font-bold text-lg">Empreinte Digitale</h3>
                    <p className="text-xs opacity-90">
                      {empreinteSelectionnee.doigt?.replace('_', ' ') || 'Empreinte'} • Qualité: {empreinteSelectionnee.qualite || 85}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalEmpreinteOuvert(false);
                    setEmpreinteSelectionnee(null);
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Image */}
              <div className="p-6 bg-gray-100">
                <img
                  src={fixImageUrl(empreinteSelectionnee.image)}
                  alt="Empreinte digitale"
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-lg mx-auto"
                />
              </div>

              {/* Informations */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-sm font-semibold text-gray-900">{empreinteSelectionnee.type_empreinte || 'Digitale'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Doigt/Position</p>
                    <p className="text-sm font-semibold text-gray-900">{empreinteSelectionnee.doigt?.replace('_', ' ') || 'Non spécifié'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    // Télécharger l'image
                    const link = document.createElement('a');
                    link.href = fixImageUrl(empreinteSelectionnee.image);
                    link.download = `empreinte_${empreinteSelectionnee.id}.jpg`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all flex items-center"
                >
                  <Download size={18} className="mr-2" />
                  Télécharger
                </button>
                <button
                  onClick={() => {
                    supprimerEmpreinte(empreinteSelectionnee);
                    setModalEmpreinteOuvert(false);
                    setEmpreinteSelectionnee(null);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all flex items-center"
                >
                  <X size={18} className="mr-2" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometrieCriminelle;
