import { useState, useEffect, useRef } from 'react';
import { Camera, AlertCircle, Play, Square, RefreshCw, Settings, X, Monitor, Usb } from 'lucide-react';
import api from '../../services/api';
import SpinnerChargement from '../../../components/commun/SpinnerChargement';
import Bouton from '../../../components/commun/Bouton';

const MultiCameraDashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [activeCameras, setActiveCameras] = useState(new Set());
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const handleNewAlertRef = useRef(null);
  const pollAlertsRef = useRef(null);
  const alertsRef = useRef([]);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/cameras/');
      // Le ViewSet retourne {count, results}
      const camerasList = response.data.results || response.data || [];
      setCameras(camerasList);
      
      // Mettre à jour les caméras actives
      const activeIds = new Set(
        camerasList.filter(c => c.active).map(c => c.id)
      );
      setActiveCameras(activeIds);
    } catch (error) {
      console.error('Erreur chargement caméras:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollAlerts = async () => {
    try {
      const response = await api.get('/upr/logs/?action=match_certain&limit=5');
      const logs = response.data.results || response.data || [];
      if (logs.length > 0) {
        const latest = logs[0];
        if (!alertsRef.current.find((a) => a.id === latest.id)) {
          handleNewAlertRef.current?.({ data: latest });
        }
      }
    } catch (error) {
      console.error('Erreur polling alerts:', error);
    }
  };

  const handleNewAlert = (alertData) => {
    const alert = alertData.data || alertData;
    setAlerts(prev => [alert, ...prev].slice(0, 20)); // Garder les 20 dernières
    
    // Afficher notification toast
    showToast(alert);
    
    // Ouvrir modal si correspondance certaine
    if (alert.action === 'match_certain') {
      setSelectedAlert(alert);
      setShowAlertModal(true);
    }
  };

  const showToast = (alert) => {
    // Créer un élément toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    toast.innerHTML = `
      <AlertCircle size={20} />
      <div>
        <div class="font-bold">🚨 Détection faciale</div>
        <div class="text-sm">Caméra: ${alert.camera_name || 'N/A'}</div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  };

  handleNewAlertRef.current = handleNewAlert;
  pollAlertsRef.current = pollAlerts;
  alertsRef.current = alerts;

  useEffect(() => {
    loadCameras();
    scanAvailableCameras();

    const connectWebSocket = () => {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/alerts/';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[OK] WebSocket connecté');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'alert') {
              handleNewAlertRef.current?.(data);
            }
          } catch (error) {
            console.error('Erreur parsing WebSocket:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('Erreur WebSocket:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket fermé, reconnexion dans 5s...');
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Impossible de se connecter au WebSocket:', error);
        setInterval(() => pollAlertsRef.current?.(), 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const scanAvailableCameras = async () => {
    try {
      setScanning(true);
      const response = await api.post('/api/cameras/scan/');
      if (response.data.success) {
        setAvailableCameras(response.data.cameras || []);
      }
    } catch (error) {
      console.error('Erreur scan caméras disponibles:', error);
    } finally {
      setScanning(false);
    }
  };

  const scanCameras = async () => {
    try {
      setLoading(true);
      await scanAvailableCameras();
      await loadCameras();
    } catch (error) {
      console.error('Erreur scan caméras:', error);
      alert('Erreur lors du scan des caméras');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async (cameraId, cameraType, source) => {
    try {
      // Créer ou mettre à jour la caméra
      const cameraData = {
        camera_id: cameraId,
        name: cameraType === 'usb' 
          ? `Caméra USB ${source}` 
          : `Caméra IP ${source}`,
        source: source,
        camera_type: cameraType,
        active: true
      };

      const response = await api.post('/api/cameras/', cameraData);
      const camera = response.data;
      
      // Marquer comme active
      setActiveCameras(prev => new Set([...prev, camera.id]));
      
      // Recharger la liste
      await loadCameras();
      
      alert(`[OK] Caméra ${camera.name} démarrée avec succès`);
    } catch (error) {
      console.error('Erreur démarrage caméra:', error);
      if (error.response?.status === 400) {
        // Caméra existe déjà, essayer de l'activer
        try {
          const cameras = await api.get('/api/cameras/');
          const existing = cameras.data.results?.find(c => c.camera_id === cameraId);
          if (existing) {
            await api.patch(`/api/cameras/${existing.id}/`, { active: true });
            setActiveCameras(prev => new Set([...prev, existing.id]));
            await loadCameras();
            alert(`[OK] Caméra ${existing.name} activée`);
          }
        } catch (_e) {
          alert('Erreur lors de l\'activation de la caméra');
        }
      } else {
        alert('Erreur lors du démarrage de la caméra');
      }
    }
  };

  const stopCamera = async (cameraId) => {
    try {
      await api.patch(`/api/cameras/${cameraId}/`, { active: false });
      setActiveCameras(prev => {
        const newSet = new Set(prev);
        newSet.delete(cameraId);
        return newSet;
      });
      await loadCameras();
      alert('[OK] Caméra arrêtée');
    } catch (error) {
      console.error('Erreur arrêt caméra:', error);
      alert('Erreur lors de l\'arrêt de la caméra');
    }
  };

  const handleAcceptMatch = async (alert) => {
    try {
      await api.post(`/upr/logs/${alert.id}/accept/`);
      setShowAlertModal(false);
      setSelectedAlert(null);
      alert('Correspondance acceptée');
    } catch (error) {
      console.error('Erreur acceptation:', error);
      alert('Erreur lors de l\'acceptation');
    }
  };

  const handleRejectMatch = async (alert) => {
    try {
      await api.post(`/upr/logs/${alert.id}/reject/`);
      setShowAlertModal(false);
      setSelectedAlert(null);
      alert('Correspondance rejetée');
    } catch (error) {
      console.error('Erreur rejet:', error);
      alert('Erreur lors du rejet');
    }
  };

  if (loading && cameras.length === 0) {
    return <SpinnerChargement />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Camera className="text-blue-600" size={32} />
            <span>Dashboard Multi-Caméras</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Surveillance en temps réel avec reconnaissance faciale
          </p>
        </div>
        <div className="flex space-x-2">
          <Bouton
            onClick={scanCameras}
            variant="secondary"
            icon={<RefreshCw size={18} />}
          >
            Scanner
          </Bouton>
          <Bouton
            onClick={loadCameras}
            variant="primary"
            icon={<Settings size={18} />}
          >
            Actualiser
          </Bouton>
        </div>
      </div>

      {/* Section de sélection de caméra */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Camera className="text-blue-600" size={24} />
          <span>Sélectionner une caméra</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Caméra intégrée */}
          <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
            <div className="flex items-center space-x-3 mb-3">
              <Monitor className="text-blue-600" size={24} />
              <div>
                <h3 className="font-bold text-lg">Caméra intégrée</h3>
                <p className="text-sm text-gray-600">Caméra intégrée à votre machine</p>
              </div>
            </div>
            <Bouton
              onClick={() => startCamera('usb_1', 'usb', '1')}
              variant="primary"
              icon={<Play size={18} />}
              className="w-full"
              disabled={scanning || activeCameras.has('usb_1')}
            >
              {activeCameras.has('usb_1') ? 'Déjà active' : 'Démarrer la caméra intégrée'}
            </Bouton>
          </div>

          {/* Caméra USB externe */}
          <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
            <div className="flex items-center space-x-3 mb-3">
              <Usb className="text-green-600" size={24} />
              <div>
                <h3 className="font-bold text-lg">Webcam USB externe</h3>
                <p className="text-sm text-gray-600">Caméra branchée via USB (A03)</p>
              </div>
            </div>
            <Bouton
              onClick={() => startCamera('usb_2', 'usb', '2')}
              variant="primary"
              icon={<Play size={18} />}
              className="w-full"
              disabled={scanning || activeCameras.has('usb_2')}
            >
              {activeCameras.has('usb_2') ? 'Déjà active' : 'Démarrer la webcam USB'}
            </Bouton>
          </div>
        </div>

        {/* Liste des caméras disponibles après scan */}
        {availableCameras.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">Caméras détectées ({availableCameras.length})</h3>
              <Bouton
                onClick={scanAvailableCameras}
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={16} />}
                disabled={scanning}
              >
                {scanning ? 'Scan en cours...' : 'Actualiser'}
              </Bouton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableCameras.map((cam) => {
                const isActive = activeCameras.has(cam.id);
                return (
                  <div
                    key={cam.id || cam.camera_id}
                    className={`p-3 rounded border ${
                      isActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {cam.camera_type === 'usb' ? (
                          <Usb className="text-green-600" size={18} />
                        ) : (
                          <Monitor className="text-blue-600" size={18} />
                        )}
                        <span className="font-semibold text-sm">{cam.name}</span>
                      </div>
                      {isActive && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      ID: {cam.camera_id || cam.source} | Type: {cam.camera_type?.toUpperCase()}
                    </div>
                    <Bouton
                      onClick={() =>
                        isActive
                          ? stopCamera(cam.id)
                          : startCamera(cam.camera_id, cam.camera_type, cam.source)
                      }
                      variant={isActive ? 'danger' : 'primary'}
                      size="sm"
                      icon={isActive ? <Square size={14} /> : <Play size={14} />}
                      className="w-full"
                    >
                      {isActive ? 'Arrêter' : 'Démarrer'}
                    </Bouton>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {availableCameras.length === 0 && !scanning && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Aucune caméra détectée. Cliquez sur "Scanner" pour détecter les caméras.</p>
          </div>
        )}
      </div>

      {/* Alertes actives */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="font-bold text-red-900">
              {alerts.length} alerte(s) récente(s)
            </span>
          </div>
        </div>
      )}

      {/* Grille de caméras actives */}
      {cameras.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Settings className="text-gray-600" size={24} />
            <span>Caméras actives ({cameras.filter(c => c.active).length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onRefresh={loadCameras}
                onStart={() => startCamera(camera.camera_id, camera.camera_type, camera.source)}
                onStop={() => stopCamera(camera.id)}
                isActive={activeCameras.has(camera.id) || camera.active}
              />
            ))}
          </div>
        </div>
      )}

      {cameras.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Camera className="mx-auto text-gray-400" size={64} />
          <p className="text-gray-600 mt-4">
            Aucune caméra configurée. Utilisez les boutons ci-dessus pour démarrer une caméra.
          </p>
        </div>
      )}

      {/* Modal d'alerte */}
      {showAlertModal && selectedAlert && (
        <AlertModal
          alert={selectedAlert}
          onClose={() => {
            setShowAlertModal(false);
            setSelectedAlert(null);
          }}
          onAccept={() => handleAcceptMatch(selectedAlert)}
          onReject={() => handleRejectMatch(selectedAlert)}
        />
      )}
    </div>
  );
};

const CameraCard = ({ camera, onRefresh, onStart, onStop, isActive }) => {
  const [status, setStatus] = useState(camera.active || isActive ? 'active' : 'inactive');

  useEffect(() => {
    setStatus(camera.active || isActive ? 'active' : 'inactive');
  }, [camera.active, isActive]);

  const toggleCamera = async () => {
    try {
      if (status === 'active') {
        if (onStop) {
          await onStop();
        }
        setStatus('inactive');
      } else {
        if (onStart) {
          await onStart();
        }
        setStatus('active');
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Erreur toggle caméra:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{camera.name}</h3>
          <p className="text-sm text-gray-600">{camera.camera_id}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="mb-4 bg-gray-100 rounded aspect-video flex items-center justify-center">
        <Camera className="text-gray-400" size={48} />
        {/* TODO: Afficher le flux vidéo réel */}
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="font-semibold">{camera.camera_type.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Frames:</span>
          <span className="font-semibold">{camera.frame_count || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Détections:</span>
          <span className="font-semibold">{camera.detection_count || 0}</span>
        </div>
      </div>

      <div className="mt-4 flex space-x-2">
        <Bouton
          onClick={toggleCamera}
          variant={status === 'active' ? 'danger' : 'primary'}
          size="sm"
          icon={status === 'active' ? <Square size={16} /> : <Play size={16} />}
          className="flex-1"
        >
          {status === 'active' ? 'Arrêter' : 'Démarrer'}
        </Bouton>
      </div>
    </div>
  );
};

const AlertModal = ({ alert, onClose, onAccept, onReject }) => {
  const matches = alert.details?.matches || [];
  const bestMatch = alert.details?.best_match || alert.details?.matches?.[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="bg-red-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <AlertCircle size={24} />
            <h2 className="text-xl font-bold">🚨 Détection faciale</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2">Informations de détection</h3>
            <div className="bg-gray-50 p-4 rounded space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Caméra:</span>
                <span className="font-semibold">{alert.camera_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Score:</span>
                <span className="font-semibold">{(alert.match_score || 0).toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold">
                  {new Date(alert.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          </div>

          {bestMatch && (
            <div>
              <h3 className="font-bold text-lg mb-2">Meilleure correspondance</h3>
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                {bestMatch.criminal_id && (
                  <div>
                    <div className="font-semibold text-blue-900">
                      Fiche Criminelle #{bestMatch.criminal_id}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      {bestMatch.nom || ''} {bestMatch.prenom || ''}
                    </div>
                    <a
                      href={`/fiches-criminelles/voir/${bestMatch.criminal_id}`}
                      className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                    >
                      Voir la fiche →
                    </a>
                  </div>
                )}
                {bestMatch.upr_id && (
                  <div>
                    <div className="font-semibold text-blue-900">
                      UPR: {bestMatch.code_upr || bestMatch.upr_id}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      {bestMatch.nom_temporaire || 'Personne non identifiée'}
                    </div>
                  </div>
                )}
                <div className="mt-2 text-sm text-gray-600">
                  Score: {(bestMatch.score || 0).toFixed(3)}
                </div>
              </div>
            </div>
          )}

          {matches.length > 1 && (
            <div>
              <h3 className="font-bold text-lg mb-2">Autres correspondances (Top 3)</h3>
              <div className="space-y-2">
                {matches.slice(1, 4).map((match, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                    <div className="flex justify-between">
                      <span>
                        {match.criminal_id ? `Criminel #${match.criminal_id}` : `UPR ${match.code_upr}`}
                      </span>
                      <span className="font-semibold">{(match.score || 0).toFixed(3)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alert.frame_url && (
            <div>
              <h3 className="font-bold text-lg mb-2">Image de détection</h3>
              <img
                src={alert.frame_url}
                alt="Détection"
                className="w-full rounded border border-gray-200"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-50 p-4 rounded-b-lg flex justify-end space-x-2">
          <Bouton onClick={onReject} variant="secondary">
            Rejeter
          </Bouton>
          <Bouton onClick={onAccept} variant="primary">
            Accepter
          </Bouton>
        </div>
      </div>
    </div>
  );
};

export default MultiCameraDashboard;

