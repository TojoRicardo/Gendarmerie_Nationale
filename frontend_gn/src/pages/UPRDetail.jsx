import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, FileText, UserSearch, Eye, Loader2, CheckCircle2, XCircle, TrendingDown, Fingerprint, Clock, User, Edit, Trash2, Archive, RotateCcw } from "lucide-react";
import api from "../services/api";
import Button from "../components/commun/Button";
import { useNotification } from "../context/NotificationContext";
import { restoreUPR } from "../services/uprService";

export default function UPRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notification = useNotification();
  const [upr, setUpr] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const fetchUPR = async () => {
    try {
      const uprRes = await api.get(`/upr/${id}/`);
      if (uprRes.data) {
        setUpr(uprRes.data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'UPR:", err);
      setError(err.response?.data?.error || "Erreur lors du chargement de l'UPR");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Vérifier que l'ID est valide
      if (!id || id === 'undefined' || id === 'null') {
        setError("ID UPR invalide");
        setLoading(false);
        return;
      }
      
      // Charger les données UPR
      try {
        const uprRes = await api.get(`/upr/${id}/`);
        if (uprRes.data) {
          console.log('Données UPR reçues:', {
            id: uprRes.data.id,
            code_upr: uprRes.data.code_upr,
            profil_face: uprRes.data.profil_face,
            profil_face_url: uprRes.data.profil_face_url,
            empreinte_digitale: uprRes.data.empreinte_digitale,
            empreinte_digitale_url: uprRes.data.empreinte_digitale_url
          });
          
          // Vérifier si le fichier image est valide
          if (uprRes.data.profil_face && (uprRes.data.profil_face === '1' || uprRes.data.profil_face === 1 || !uprRes.data.profil_face_url)) {
            console.warn('⚠️ UPR a un fichier image invalide. Le fichier n\'a probablement pas été correctement sauvegardé lors de la création.');
          }
          
          setUpr(uprRes.data);
        } else {
          setError("Les données UPR sont vides");
        }
      } catch (uprErr) {
        // Gérer différents types d'erreurs
        if (uprErr.response) {
          const status = uprErr.response.status;
          const data = uprErr.response.data;
          
          if (status === 404) {
            // Erreur 404 normale si l'UPR n'existe plus (supprimé ou ID invalide)
            setError(`UPR avec l'ID "${id}" non trouvé. Il a peut-être été supprimé.`);
            // Ne pas logger les erreurs 404 dans la console car elles sont normales
          } else if (status === 403) {
            setError("Vous n'avez pas la permission d'accéder à cet UPR");
            console.error("Erreur 403 lors du chargement de l'UPR:", uprErr);
          } else if (status === 401) {
            setError("Vous devez être connecté pour accéder à cet UPR");
            console.error("Erreur 401 lors du chargement de l'UPR:", uprErr);
          } else {
            setError(data?.detail || data?.error || `Erreur ${status}: Impossible de charger les données UPR`);
            console.error(`Erreur ${status} lors du chargement de l'UPR:`, uprErr);
          }
        } else if (uprErr.request) {
          setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
          // Ne pas logger les erreurs réseau car elles sont déjà filtrées dans main.jsx
        } else {
          setError(uprErr.message || "Une erreur inattendue s'est produite");
          console.error("Erreur inattendue lors du chargement de l'UPR:", uprErr);
        }
        return; // Ne pas continuer si l'UPR n'a pas pu être chargé
      }
      
      // Charger les correspondances (gérer l'erreur silencieusement si l'endpoint n'existe pas)
      try {
        const matchesRes = await api.get(`/upr/${id}/matches/`);
        if (matchesRes.data) {
          // Le format de réponse peut être différent selon l'endpoint
          if (Array.isArray(matchesRes.data)) {
            setMatches(matchesRes.data);
          } else if (matchesRes.data.upr_matches || matchesRes.data.criminel_matches) {
            // Format avec upr_matches et criminel_matches
            const allMatches = [
              ...(matchesRes.data.upr_matches || []),
              ...(matchesRes.data.criminel_matches || [])
            ];
            setMatches(allMatches);
          } else {
            setMatches([]);
          }
        } else {
          setMatches([]);
        }
      } catch (matchesErr) {
        // Si l'endpoint n'existe pas ou retourne une erreur, initialiser avec une liste vide
        console.warn("Impossible de charger les correspondances:", matchesErr);
        setMatches([]);
      }
    } catch (err) {
      console.error("Erreur générale:", err);
      setError(err.message || "Impossible de charger les données UPR");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des détails UPR...</p>
        </div>
      </div>
    );
  }

  if (error || !upr) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">UPR non trouvé</h2>
            <p className="text-gray-600 mb-6">
              {error || `L'UPR avec l'ID "${id}" n'existe pas ou a été supprimé.`}
            </p>
            {id && (
              <p className="text-sm text-gray-500 mb-4">
                ID recherché: <code className="bg-gray-100 px-2 py-1 rounded">{id}</code>
              </p>
            )}
            <Button onClick={() => navigate('/upr')} variant="primary">
              Retour à la liste
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getImageUrl = (url) => {
    if (!url) return null;
    
    // Si l'URL est déjà complète
    if (url.startsWith('http')) {
      // Si l'URL est en HTTP et qu'on est en HTTPS
      if (url.startsWith('http://') && window.location.protocol === 'https:') {
        // Si c'est une URL de média locale, utiliser le proxy Vite (URL relative)
        if (url.includes('/media/')) {
          const mediaMatch = url.match(/\/media\/.*/);
          if (mediaMatch) {
            return mediaMatch[0]; // Retourner juste le chemin relatif pour utiliser le proxy
          }
        }
        // Sinon, convertir en HTTPS
        return url.replace('http://', 'https://');
      }
      return url;
    }
    
    // Pour les URLs relatives commençant par /media/, les retourner telles quelles
    // Le proxy Vite les servira via HTTPS
    if (url.startsWith('/media/')) {
      return url;
    }
    
    // Pour les autres URLs relatives, construire l'URL avec le protocole de la page
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = host === 'localhost' ? ':8000' : '';
    const baseUrl = `${protocol}//${host}${port}`;
    
    return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  };

  // Fonction helper pour normaliser les URLs d'images (gère HTTP -> HTTPS et utilise le proxy)
  const normalizeImageUrl = (url) => {
    if (!url) return null;
    
    // Vérifier si c'est une valeur invalide (juste un nombre ou "1")
    if (url === '1' || url === 1 || url === '0' || url === 0 || 
        (typeof url === 'string' && /^\d+$/.test(url) && url.length < 3)) {
      // C'est probablement une valeur invalide, ne pas essayer de charger
      console.warn('URL d\'image invalide détectée:', url);
      return null;
    }
    
    // Si l'URL est déjà complète avec http:// ou https://
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Extraire le chemin /media/ si présent (pour utiliser le proxy Vite)
      if (url.includes('/media/')) {
        const mediaMatch = url.match(/\/media\/.*/);
        if (mediaMatch) {
          // Vérifier que ce n'est pas juste /media/1 ou /media/0
          const path = mediaMatch[0];
          if (path === '/media/1' || path === '/media/0' || /^\/media\/\d+$/.test(path)) {
            console.warn('URL d\'image invalide (valeur numérique):', path);
            return null;
          }
          // Retourner juste le chemin relatif pour utiliser le proxy Vite
          return path;
        }
      }
      
      // Si on est en HTTPS et que l'URL est en HTTP, convertir
      if (url.startsWith('http://') && window.location.protocol === 'https:') {
        return url.replace('http://', 'https://');
      }
      
      // Si l'URL contient localhost:8000 ou 127.0.0.1:8000, extraire le chemin /media/
      if (url.includes('localhost:8000') || url.includes('127.0.0.1:8000')) {
        const mediaMatch = url.match(/\/media\/.*/);
        if (mediaMatch) {
          const path = mediaMatch[0];
          if (path === '/media/1' || path === '/media/0' || /^\/media\/\d+$/.test(path)) {
            console.warn('URL d\'image invalide (valeur numérique):', path);
            return null;
          }
          return path; // Utiliser le proxy Vite
        }
      }
      
      return url;
    }
    
    // Pour les URLs relatives commençant par /media/, les retourner telles quelles
    // Le proxy Vite les servira automatiquement
    if (url.startsWith('/media/')) {
      // Vérifier que ce n'est pas juste /media/1 ou /media/0
      if (url === '/media/1' || url === '/media/0' || /^\/media\/\d+$/.test(url)) {
        console.warn('URL d\'image invalide (valeur numérique):', url);
        return null;
      }
      return url;
    }
    
    // Si l'URL ne commence pas par /, ajouter /media/ si c'est un chemin de fichier
    if (!url.startsWith('/') && !url.startsWith('http')) {
      // Vérifier que ce n'est pas juste un nombre
      if (/^\d+$/.test(url) && url.length < 3) {
        console.warn('URL d\'image invalide (valeur numérique):', url);
        return null;
      }
      // C'est probablement juste un nom de fichier ou un chemin relatif
      return `/media/${url}`;
    }
    
    return url;
  };

  const handleArchive = async () => {
    if (!upr) return;
    
    // Demander confirmation
    const confirmed = await notification.showConfirm({
      title: "Confirmer l'archivage",
      message: `Êtes-vous sûr de vouloir archiver l'UPR "${upr.code_upr}" ?\n\nL'UPR sera archivé et ne sera plus visible dans la liste principale, mais pourra être restauré ultérieurement.`,
      confirmText: "Archiver",
      cancelText: "Annuler"
    });
    
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      await api.delete(`/upr/${id}/`);
      
      notification.showSuccess({
        title: "UPR archivé",
        message: `L'UPR "${upr.code_upr}" a été archivé avec succès.`
      });
      
      // Rediriger vers la liste après un court délai
      setTimeout(() => {
        navigate('/upr');
      }, 1000);
    } catch (err) {
      console.error("Erreur lors de l'archivage:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || "Erreur lors de l'archivage de l'UPR";
      notification.showError({
        title: "Erreur",
        message: errorMsg
      });
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    if (!upr) return;
    
    // Demander confirmation
    const confirmed = await notification.showConfirm({
      title: "Confirmer la restauration",
      message: `Êtes-vous sûr de vouloir restaurer l'UPR "${upr.code_upr}" ?\n\nL'UPR sera restauré et redeviendra visible dans la liste principale.`,
      confirmText: "Restaurer",
      cancelText: "Annuler"
    });
    
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      await restoreUPR(id);
      
      notification.showSuccess({
        title: "UPR restauré",
        message: `L'UPR "${upr.code_upr}" a été restauré avec succès.`
      });
      
      // Recharger les données de l'UPR
      await fetchUPR();
      setDeleting(false);
    } catch (err) {
      console.error("Erreur lors de la restauration:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || "Erreur lors de la restauration de l'UPR";
      notification.showError({
        title: "Erreur",
        message: errorMsg
      });
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header avec design amélioré */}
        <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/upr')}
                className="p-2.5 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105 text-gray-600 hover:text-blue-600"
                title="Retour à la liste"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {upr.code_upr}
                  </h1>
                  {upr.is_resolved && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                      Résolu
                    </span>
                  )}
                  {upr.is_archived && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold border border-gray-200">
                      Archivé
                    </span>
                  )}
                </div>
                <p className="text-gray-600 font-medium">{upr.nom_temporaire || "Individu non identifié"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {upr.face_embedding && (
                <span className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2 border border-green-200 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Embedding disponible
                </span>
              )}
              {upr.empreinte_digitale && (
                <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2 border border-blue-200 shadow-sm">
                  <Fingerprint className="w-4 h-4" />
                  Empreinte disponible
                </span>
              )}
              {upr.landmarks_106 && (
                <span className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-lg text-sm font-semibold flex items-center gap-2 border border-purple-200 shadow-sm">
                  <MapPin className="w-4 h-4" />
                  106 Landmarks
                </span>
              )}
              {upr.is_archived ? (
                <Button
                  onClick={handleRestore}
                  variant="secondary"
                  disabled={deleting || loading}
                  icon={deleting ? Loader2 : RotateCcw}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {deleting ? 'Restauration...' : 'Restaurer'}
                </Button>
              ) : (
                <Button
                  onClick={handleArchive}
                  variant="danger"
                  disabled={deleting || loading}
                  icon={deleting ? Loader2 : Archive}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {deleting ? 'Archivage...' : 'Archiver'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Photos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Photo */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Photo de face
                </h2>
              </div>
              <div className="p-6">
                {(() => {
                  // Vérifier si on a une URL valide (pas juste "1" ou un nombre)
                  const hasValidImage = upr.profil_face_url || 
                    (upr.profil_face && 
                     upr.profil_face !== '1' && 
                     upr.profil_face !== 1 && 
                     typeof upr.profil_face === 'string' && 
                     upr.profil_face.includes('/'));
                  
                  if (hasValidImage) {
                    const imageUrl = normalizeImageUrl(upr.profil_face_url || upr.profil_face);
                    
                    // Si l'URL est invalide après normalisation, afficher le placeholder
                    if (!imageUrl) {
                      return (
                        <div className="w-full h-96 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-yellow-300">
                          <div className="p-4 bg-yellow-100 rounded-full mb-4">
                            <UserSearch className="w-16 h-16 text-yellow-600" />
                          </div>
                          <p className="text-gray-700 font-semibold mb-2">Photo de face manquante</p>
                          <p className="text-sm text-gray-600 text-center px-4 mb-4 max-w-md">
                            La photo de face n'a pas été correctement enregistrée lors de la création de l'UPR.
                            <br />
                            Le fichier image est invalide ou n'existe pas.
                          </p>
                          <button
                            onClick={() => navigate(`/upr/${id}/modifier`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            Modifier l'UPR pour ajouter une photo
                          </button>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="relative group">
                        <img
                          src={imageUrl}
                          alt={upr.code_upr}
                          className="w-full rounded-lg border-2 border-gray-200 shadow-md transition-transform duration-300 group-hover:scale-[1.02] object-cover"
                          onError={(e) => {
                            console.error('Erreur de chargement de l\'image:', {
                              originalUrl: upr.profil_face_url || upr.profil_face,
                              normalizedUrl: normalizeImageUrl(upr.profil_face_url || upr.profil_face),
                              uprData: {
                                id: upr.id,
                                code_upr: upr.code_upr,
                                profil_face: upr.profil_face,
                                profil_face_url: upr.profil_face_url
                              }
                            });
                            // Cacher l'image et afficher le placeholder
                            e.target.style.display = 'none';
                            const placeholder = e.target.parentElement?.querySelector('.image-placeholder');
                            if (placeholder) {
                              placeholder.classList.remove('hidden');
                            }
                          }}
                          onLoad={() => {
                            console.log('Image chargée avec succès:', {
                              original: upr.profil_face_url || upr.profil_face,
                              normalized: normalizeImageUrl(upr.profil_face_url || upr.profil_face)
                            });
                          }}
                        />
                        <div className="hidden image-placeholder w-full h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                          <UserSearch className="w-20 h-20 text-gray-400 mb-4" />
                          <p className="text-gray-500 font-medium">Image non disponible</p>
                          <p className="text-xs text-gray-400 mt-2 text-center px-4">
                            Le fichier image n'a pas pu être chargé.
                            <br />
                            URL: {upr.profil_face_url || upr.profil_face}
                          </p>
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 rounded-lg transition-all duration-300"></div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="w-full h-96 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-yellow-300">
                        <div className="p-4 bg-yellow-100 rounded-full mb-4">
                          <UserSearch className="w-16 h-16 text-yellow-600" />
                        </div>
                        <p className="text-gray-700 font-semibold mb-2">Photo de face manquante</p>
                        <p className="text-sm text-gray-600 text-center px-4 mb-4 max-w-md">
                          La photo de face n'a pas été correctement enregistrée lors de la création de l'UPR.
                          <br />
                          Le fichier image est invalide ou n'existe pas.
                        </p>
                        <button
                          onClick={() => navigate(`/upr/${id}/modifier`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier l'UPR pour ajouter une photo
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Empreinte digitale */}
            {upr.empreinte_digitale_url || upr.empreinte_digitale ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-blue-600" />
                    Empreinte digitale
                  </h2>
                </div>
                <div className="p-6">
                  <img
                    src={normalizeImageUrl(upr.empreinte_digitale_url || upr.empreinte_digitale)}
                    alt="Empreinte digitale"
                    className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 shadow-md"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Face Embedding Info */}
            {upr.face_embedding && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Embedding ArcFace
                  </h2>
                </div>
                <div className="p-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          Embedding facial disponible
                        </p>
                        <p className="text-xs text-gray-600">
                          Vecteur de 512 dimensions pour la reconnaissance faciale
                        </p>
                      </div>
                    </div>
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Voir les détails techniques
                      </summary>
                      <pre className="mt-3 text-xs bg-white p-4 rounded-lg border border-gray-200 overflow-auto max-h-64 shadow-inner">
                        {JSON.stringify(upr.face_embedding, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Information */}
          <div className="space-y-6">
            {/* Informations principales */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Informations
                </h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Date d'enregistrement</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(upr.date_enregistrement || upr.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                {upr.context_location && (
                  <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Lieu de découverte</p>
                      <p className="text-sm font-medium text-gray-900">{upr.context_location}</p>
                    </div>
                  </div>
                )}
                {upr.discovered_date && (
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Date de découverte</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(upr.discovered_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {upr.notes && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    Notes et observations
                  </h2>
                </div>
                <div className="p-6">
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{upr.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Correspondances */}
            {matches.length > 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-pink-600" />
                    Correspondances
                    <span className="ml-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                      {matches.length}
                    </span>
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  {matches.map((match, index) => {
                    const isStrictMatch = match.distance !== undefined && match.distance < 0.5;
                    const isWeakMatch = match.distance !== undefined && match.distance < 0.7;
                    
                    return (
                      <div
                        key={match.id || index}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
                          isStrictMatch 
                            ? 'bg-green-50 border-green-300 hover:border-green-400 hover:shadow-md' 
                            : isWeakMatch
                            ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                        onClick={() => {
                          if (match.type === 'UPR' && match.id) {
                            navigate(`/upr/${match.id}`);
                          } else if (match.type === 'CRIMINEL' && match.id) {
                            navigate(`/fiches-criminelles/${match.id}`);
                          } else if (match.upr_target) {
                            navigate(`/upr/${match.upr_target}`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-base">
                              {match.type === 'CRIMINEL' 
                                ? `${match.nom || ''} ${match.prenom || ''}`.trim() || match.numero_fiche || 'Fiche criminelle'
                                : match.code_upr || match.upr_target || 'UPR inconnu'
                              }
                            </p>
                            {match.type === 'CRIMINEL' && match.numero_fiche && (
                              <p className="text-xs text-gray-500 mt-1">Fiche: {match.numero_fiche}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isStrictMatch && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                Forte
                              </span>
                            )}
                            <Eye className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                        {match.distance !== undefined && (
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600 font-medium">Distance de similarité:</span>
                            <span className={`font-bold text-lg ${
                              isStrictMatch ? 'text-green-600' :
                              isWeakMatch ? 'text-yellow-600' : 'text-orange-600'
                            }`}>
                              {match.distance.toFixed(4)}
                            </span>
                          </div>
                        )}
                        {match.match_date && (
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(match.match_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune correspondance</h3>
                  <p className="text-sm text-gray-600">
                    Aucune correspondance trouvée pour le moment avec d'autres UPR ou fiches criminelles
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
