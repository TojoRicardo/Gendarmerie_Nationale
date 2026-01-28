import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { MapPin, Calendar, UserSearch, Eye, Loader2, Plus } from "lucide-react";
import Button from "../components/commun/Button";

export default function UPRList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUPR();
  }, []);

  const loadUPR = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/upr/');
      setData(res.data);
    } catch (err) {
      // Ne pas logger les erreurs de connexion réseau (serveur non démarré)
      const isNetworkError = 
        err.code === 'ERR_NETWORK' || 
        err.code === 'ERR_CONNECTION_REFUSED' ||
        err.message?.includes('ERR_CONNECTION_REFUSED') ||
        (!err.response && err.request);
      
      if (!isNetworkError) {
        console.error("Erreur lors du chargement des UPR:", err);
      }
      
      // Utiliser le gestionnaire d'erreurs centralisé
      const { getErrorMessage, isNetworkError: checkNetworkError } = await import('../utils/errorHandler')
      const errorInfo = getErrorMessage(err)
      
      if (err.response?.status === 401) {
        setError("Vous n'êtes pas autorisé à accéder à cette ressource. Veuillez vous reconnecter.");
      } else if (checkNetworkError(err)) {
        setError(errorInfo.message);
      } else {
        setError(errorInfo.message || "Impossible de charger les données UPR");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id) => {
    navigate(`/upr/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des UPR...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Unidentified Person Registry
          </h1>
          <p className="text-gray-600">
            Registre des personnes non identifiées avec reconnaissance faciale
          </p>
        </div>
        <Button
          onClick={() => navigate('/ajouter-photo-criminelle')}
          icon={Plus}
          variant="primary"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Ajouter un UPR
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total UPR</p>
              <p className="text-2xl font-bold text-gray-900">{data.length}</p>
            </div>
            <UserSearch className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avec correspondances</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.filter(p => p.face_embedding).length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avec landmarks</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.filter(p => p.landmarks_106).length}
              </p>
            </div>
            <MapPin className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* UPR Grid */}
      {data.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <UserSearch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun UPR enregistré
          </h3>
          <p className="text-gray-600">
            Aucun individu non identifié enregistré pour le moment
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.map((upr) => (
            <div
              key={upr.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleView(upr.id)}
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {upr.profil_face_url || upr.profil_face ? (
                  <img
                    src={(() => {
                      const imgUrl = upr.profil_face_url || upr.profil_face;
                      if (!imgUrl) return null;
                      
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
                      if (!imgUrl.startsWith('/') && !imgUrl.startsWith('http')) {
                        return `/media/${imgUrl}`;
                      }
                      
                      return imgUrl;
                    })()}
                    alt={upr.code_upr}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/placeholder-person.png';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <UserSearch className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                {/* Badge Code UPR */}
                <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold">
                  {upr.code_upr}
                </div>
                {/* Badge Embedding */}
                {upr.face_embedding && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs">
                    ✓ Embedding
                  </div>
                )}
                {/* Badge Archivé */}
                {upr.is_archived && (
                  <div className="absolute bottom-2 left-2 bg-gray-600 text-white px-2 py-1 rounded-md text-xs font-semibold">
                    📦 Archivé
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {upr.context_location && (
                  <div className="flex items-center gap-2 mb-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm truncate">{upr.context_location}</span>
                  </div>
                )}
                {upr.discovered_date && (
                  <div className="flex items-center gap-2 mb-3 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(upr.discovered_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {upr.notes && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {upr.notes}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    {upr.landmarks_106 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        106 pts
                      </span>
                    )}
                    {upr.profil_left && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        Profil G
                      </span>
                    )}
                    {upr.profil_right && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        Profil D
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(upr.id);
                    }}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
