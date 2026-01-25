"""
MultiCameraService
------------------
Fichier : multi_camera_service/main.py

But: module autonome pour détecter, sélectionner et démarrer la reconnaissance faciale

Conçu pour être intégré dans ton projet Django.

Fonctionnalités :
 - list_cameras(): retourne la liste des caméras disponibles (id, name, status)
 - select_camera(camera_id): réserve / prépare la caméra choisie
 - start_recognition(callback=None, face_threshold=0.7): lance la boucle de lecture et reconnaisances
 - release(): libère la caméra et ressources

Notes :
 - Utilise OpenCV pour l'acquisition vidéo.
 - Si insightface est installé, essaie d'utiliser FaceAnalysis d'insightface (optionnel).
 - Si insightface absent, utilise un détecteur Haar cascade pour démo.

Usage :
    python -m multi_camera_service.main
"""

import cv2
import json
import logging
import threading
import time
from typing import List, Dict, Optional, Callable

# Logging professionnel
logger = logging.getLogger("MultiCameraService")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
formatter = logging.Formatter("[%(levelname)s] %(asctime)s %(name)s %(message)s")
ch.setFormatter(formatter)
logger.addHandler(ch)

# Try to import insightface if available
FaceAnalysis = None
INSIGHTFACE_AVAILABLE = False

try:
    from insightface import FaceAnalysis as _FaceAnalysis
    FaceAnalysis = _FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
    logger.info("InsightFace détecté — mode reconnaissance activé")
except Exception:
    logger.info("InsightFace non installé — mode fallback activé")


class MultiCameraService:
    def __init__(self, max_test_devices: int = 10):
        """
        Initialise le service multi-caméras.
        
        Args:
            max_test_devices: Nombre maximum de caméras à scanner (défaut: 10)
                            Augmentez cette valeur si vous avez plus de caméras USB
        """
        self.max_test_devices = max_test_devices
        self._cap: Optional[cv2.VideoCapture] = None
        self._cap_id: Optional[int] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._face_analyzer = None

        # Initialize face analyzer lazily
        if INSIGHTFACE_AVAILABLE and FaceAnalysis is not None:
            try:
                import os
                os.environ["ORT_LOG_SEVERITY_LEVEL"] = "4"
                # Force CPU uniquement pour éviter les avertissements CUDA
                self._face_analyzer = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
                # configure minimal settings, CPU by default
                self._face_analyzer.prepare(ctx_id=-1, det_size=(640, 640))
                logger.info("FaceAnalysis (insightface) initialisé")
            except Exception as e:
                logger.exception("Impossible d'initialiser FaceAnalysis: %s", e)
                self._face_analyzer = None

    def list_cameras(self) -> List[Dict]:
        """Scanne les devices de 0..max_test_devices et retourne la liste des devices ouverts"""
        devices = []
        import platform
        
        logger.info("🔍 Scan des caméras (0 à %d)...", self.max_test_devices - 1)
        
        for i in range(self.max_test_devices):
            cap = None
            device_info = {
                "id": i,
                "name": f"VideoDevice_{i}",
                "width": None,
                "height": None,
                "status": "unavailable",
                "backend": None,
                "error": None
            }
            
            # Essayer différents backends selon l'OS
            backends_to_try = []
            if platform.system() == 'Windows':
                # Sur Windows, essayer DirectShow en premier (meilleur pour caméras externes)
                backends_to_try = [
                    (cv2.CAP_DSHOW, 'DirectShow'),
                    (cv2.CAP_MSMF, 'Media Foundation'),
                    (cv2.CAP_ANY, 'Any'),
                ]
            else:
                # Sur Linux/Mac
                backends_to_try = [
                    (cv2.CAP_V4L2, 'V4L2'),
                    (cv2.CAP_ANY, 'Any'),
                ]
            
            camera_found = False
            for backend_id, backend_name in backends_to_try:
                try:
                    logger.debug("  Test caméra %d avec backend %s...", i, backend_name)
                    
                    if hasattr(cv2, 'CAP_DSHOW') and backend_id == cv2.CAP_DSHOW:
                        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
                    elif hasattr(cv2, 'CAP_MSMF') and backend_id == cv2.CAP_MSMF:
                        cap = cv2.VideoCapture(i, cv2.CAP_MSMF)
                    else:
                        cap = cv2.VideoCapture(i, backend_id)
                    
                    if cap is None:
                        logger.debug("    VideoCapture retourne None")
                        continue
                    
                    if not cap.isOpened():
                        logger.debug("    Caméra %d non ouverte avec %s", i, backend_name)
                        if cap:
                            cap.release()
                        cap = None
                        continue
                    
                    # Attendre un peu pour que la caméra s'initialise (important pour USB)
                    time.sleep(0.3)
                    
                    # Tester la lecture d'une frame (plusieurs tentatives)
                    ret = False
                    frame = None
                    for attempt in range(5):  # Augmenté à 5 tentatives
                        ret, frame = cap.read()
                        if ret and frame is not None and frame.size > 0:
                            break
                        time.sleep(0.2)  # Délai plus long entre les tentatives
                    
                    if ret and frame is not None and frame.size > 0:
                        height, width = frame.shape[0], frame.shape[1]
                        
                        # Tester une deuxième frame pour confirmer
                        ret2, frame2 = cap.read()
                        if ret2 and frame2 is not None:
                            device_info.update({
                                "name": f"Caméra {i} ({backend_name})",
                                "width": width,
                                "height": height,
                                "status": "available",
                                "backend": backend_name
                            })
                            devices.append(device_info)
                            logger.info("✅ Caméra %d détectée: %s (%dx%d) via %s", 
                                      i, device_info['name'], width, height, backend_name)
                            camera_found = True
                            break  # Succès, ne pas essayer d'autres backends
                        else:
                            logger.debug("    Caméra %d: première frame OK mais deuxième échoue", i)
                    else:
                        logger.debug("    Caméra %d: impossible de lire une frame valide", i)
                    
                    if cap:
                        cap.release()
                    cap = None
                    
                except cv2.error as e:
                    logger.debug("    Erreur OpenCV caméra %d avec backend %s: %s", i, backend_name, e)
                    if cap:
                        try:
                            cap.release()
                        except:
                            pass
                    cap = None
                    device_info['error'] = str(e)
                except Exception as e:
                    logger.debug("    Erreur test caméra %d avec backend %s: %s", i, backend_name, e)
                    if cap:
                        try:
                            cap.release()
                        except:
                            pass
                    cap = None
                    device_info['error'] = str(e)
            
            if not camera_found:
                logger.debug("  ❌ Caméra %d non détectée", i)
            
            # Délai plus long entre les tests pour éviter les conflits (important pour USB)
            time.sleep(0.3)
        
        logger.info("📊 Scan terminé: %d caméra(s) détectée(s) sur %d testées", len(devices), self.max_test_devices)
        if devices:
            logger.info("   Caméras trouvées: %s", [f"ID {d['id']} ({d['name']})" for d in devices])
        else:
            logger.warning("⚠️  Aucune caméra détectée. Vérifiez que:")
            logger.warning("   - Les caméras sont branchées et allumées")
            logger.warning("   - Aucune autre application n'utilise les caméras")
            logger.warning("   - Les drivers sont installés")
            logger.warning("   - Essayez d'augmenter max_test_devices si vous avez plus de caméras")
        
        return devices

    def select_camera(self, camera_id: int) -> bool:
        """Ouvre et réserve une caméra. Si une caméra est déjà ouverte, la libère d'abord."""
        if self._cap is not None:
            logger.info("Libération de la caméra actuelle avant d'ouvrir la nouvelle")
            self.release()
            # Attendre un peu pour que la libération soit complète
            time.sleep(0.5)

        import platform
        
        # Essayer différents backends pour la caméra externe
        backends_to_try = []
        if platform.system() == 'Windows':
            # Sur Windows, DirectShow est meilleur pour les caméras externes
            backends_to_try = [
                (cv2.CAP_DSHOW, 'DirectShow'),
                (cv2.CAP_ANY, 'Any'),
            ]
        else:
            backends_to_try = [
                (cv2.CAP_V4L2, 'V4L2'),
                (cv2.CAP_ANY, 'Any'),
            ]
        
        for backend_id, backend_name in backends_to_try:
            cap = None
            try:
                logger.info("Tentative d'ouverture caméra %s avec backend %s...", camera_id, backend_name)
                
                if hasattr(cv2, 'CAP_DSHOW') and backend_id == cv2.CAP_DSHOW:
                    cap = cv2.VideoCapture(camera_id, cv2.CAP_DSHOW)
                else:
                    cap = cv2.VideoCapture(camera_id, backend_id)
                
                if cap is None:
                    logger.warning("VideoCapture retourne None pour caméra %s (backend: %s)", camera_id, backend_name)
                    continue
                
                if not cap.isOpened():
                    logger.warning("Caméra %s non ouverte avec backend %s", camera_id, backend_name)
                    if cap:
                        cap.release()
                    continue
                
                # Attendre un peu pour que la caméra s'initialise
                time.sleep(0.2)
                
                # Tester la lecture d'une frame (plusieurs tentatives)
                ret = False
                frame = None
                for attempt in range(5):
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        break
                    logger.debug("Tentative %d/5 de lecture frame...", attempt + 1)
                    time.sleep(0.1)
                
                if not ret or frame is None:
                    logger.warning("Caméra %s ouverte mais ne peut pas lire de frame après 5 tentatives (backend: %s)", camera_id, backend_name)
                    cap.release()
                    continue
                
                # Vérifier que la frame est valide
                if frame.size == 0:
                    logger.warning("Frame vide reçue de la caméra %s", camera_id)
                    cap.release()
                    continue
                
                # Configurer la résolution (optionnel, peut échouer)
                try:
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                except:
                    pass  # Certaines caméras ne supportent pas le changement de résolution
                
                # Obtenir la résolution réelle
                actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                
                # Tester une deuxième frame pour confirmer
                ret2, frame2 = cap.read()
                if not ret2 or frame2 is None:
                    logger.warning("Caméra %s ne peut pas lire de deuxième frame", camera_id)
                    cap.release()
                    continue
                
                self._cap = cap
                self._cap_id = camera_id
                logger.info("✅ Caméra %s ouverte et réservée via %s (%dx%d)", camera_id, backend_name, actual_width, actual_height)
                return True
                
            except cv2.error as e:
                logger.warning("Erreur OpenCV ouverture caméra %s avec backend %s: %s", camera_id, backend_name, e)
                if cap:
                    try:
                        cap.release()
                    except:
                        pass
                continue
            except Exception as e:
                logger.warning("Erreur ouverture caméra %s avec backend %s: %s", camera_id, backend_name, e, exc_info=True)
                if cap:
                    try:
                        cap.release()
                    except:
                        pass
                continue
        
        logger.error("❌ Impossible d'ouvrir la caméra id=%s avec aucun backend", camera_id)
        logger.info("💡 Solutions:")
        logger.info("   1. Vérifier que la webcam A03 est branchée et allumée")
        logger.info("   2. Fermer toutes les applications qui utilisent la caméra (Zoom, Teams, etc.)")
        logger.info("   3. Vérifier les drivers dans le Gestionnaire de périphériques")
        logger.info("   4. Redémarrer l'ordinateur")
        logger.info("   5. Essayer un autre port USB")
        logger.info("   6. Exécuter: python scripts/test_camera_a03.py pour diagnostiquer")
        return False

    def _frame_loop(self, callback: Optional[Callable] = None, face_threshold: float = 0.7):
        """Boucle interne pour lire des frames et exécuter la reconnaissance faciale.

        callback(frame, result) -> appelé à chaque face reconnue (ou chaque frame si callback attend)
        result: dictionnaire avec clés (faces: [ {bbox, score, embedding(optional), label(optional)} ])
        """
        logger.info("Démarrage de la boucle frame (camera id=%s)", self._cap_id)
        last_time = time.time()
        consecutive_errors = 0
        max_consecutive_errors = 10
        
        while self._running:
            try:
                # Vérifier que la caméra est toujours disponible
                if self._cap is None:
                    logger.error("❌ Caméra %s n'est plus disponible — arrêt de la boucle", self._cap_id)
                    break
                
                if not self._cap.isOpened():
                    logger.error("❌ Caméra %s n'est plus ouverte — arrêt de la boucle", self._cap_id)
                    logger.info("💡 La caméra peut avoir été déconnectée ou utilisée par une autre application")
                    break
                
                ret, frame = self._cap.read()
                if not ret or frame is None:
                    consecutive_errors += 1
                    if consecutive_errors >= max_consecutive_errors:
                        logger.error("❌ Trop d'erreurs consécutives (%d) — arrêt de la boucle", consecutive_errors)
                        logger.info("💡 La caméra peut avoir été déconnectée ou utilisée par une autre application")
                        break
                    logger.warning("Frame non lue correctement (erreur %d/%d) — tentative de récupération", 
                                  consecutive_errors, max_consecutive_errors)
                    time.sleep(0.1)
                    continue
                
                # Réinitialiser le compteur d'erreurs si succès
                consecutive_errors = 0

                result = {"faces": []}

                try:
                    if self._face_analyzer:
                        # InsightFace path
                        faces = self._face_analyzer.get(frame)
                        for f in faces:
                            bbox = [int(x) for x in f.bbox.tolist()]
                            score = float(f.det_score) if hasattr(f, 'det_score') else 0.0
                            emb = f.embedding.tolist() if hasattr(f, 'embedding') else None
                            result['faces'].append({
                                'bbox': bbox,
                                'score': score,
                                'embedding': emb,
                            })
                    else:
                        # Fallback: Haar cascade face detector (démo uniquement)
                        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                        rects = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                        for (x, y, w, h) in rects:
                            result['faces'].append({
                                'bbox': [int(x), int(y), int(x + w), int(y + h)],
                                'score': 1.0,
                                'embedding': None,
                            })
                except Exception as e:
                    logger.exception("Erreur dans l'analyse faciale: %s", e)
                    result = {"faces": []}  # Retourner un résultat vide en cas d'erreur

                # Appel du callback si fourni
                if callback:
                    try:
                        callback(frame, result)
                    except Exception as e:
                        logger.exception("Erreur dans le callback utilisateur: %s", e)

                # petit sleep pour laisser la CPU respirer — adaptatif
                elapsed = time.time() - last_time
                if elapsed < 0.01:
                    time.sleep(0.01 - elapsed)
                last_time = time.time()
                
            except Exception as e:
                logger.error("Erreur critique dans la boucle frame: %s", e, exc_info=True)
                consecutive_errors += 1
                if consecutive_errors >= max_consecutive_errors:
                    logger.error("❌ Trop d'erreurs critiques — arrêt de la boucle")
                    break
                time.sleep(0.5)

        logger.info("Boucle frame terminée (camera id=%s)", self._cap_id)

    def start_recognition(self, callback: Optional[Callable] = None, face_threshold: float = 0.7) -> bool:
        """Démarre la lecture en thread et la reconnaissance faciale.

        callback(frame, result) sera appelé pour chaque frame.
        """
        if self._cap is None:
            logger.error("❌ Aucune caméra sélectionnée — appeler select_camera(camera_id) d'abord")
            return False

        try:
            if not self._cap.isOpened():
                logger.error("❌ Caméra %s n'est pas ouverte — réessayez select_camera()", self._cap_id)
                logger.info("💡 La caméra peut avoir été déconnectée ou utilisée par une autre application")
                return False
        except Exception as e:
            logger.error("❌ Erreur lors de la vérification de la caméra: %s", e)
            return False

        if self._running:
            logger.warning("⚠️ Le service est déjà en cours")
            return False

        try:
            self._running = True
            self._thread = threading.Thread(target=self._frame_loop, args=(callback, face_threshold), daemon=True)
            self._thread.start()
            # Attendre un peu pour vérifier que le thread démarre correctement
            time.sleep(0.1)
            if not self._thread.is_alive():
                logger.error("❌ Le thread de reconnaissance n'a pas démarré correctement")
                self._running = False
                return False
            logger.info("✅ Service de reconnaissance démarré (thread lancé)")
            return True
        except Exception as e:
            logger.error("❌ Erreur lors du démarrage du service: %s", e, exc_info=True)
            self._running = False
            return False

    def stop(self):
        """Arrête la boucle proprement"""
        logger.info("Demande d'arrêt du service")
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
            logger.info("Thread terminé")
        self.release()

    def release(self):
        """Libère la caméra et les ressources"""
        if self._cap is not None:
            try:
                if self._cap.isOpened():
                    self._cap.release()
                logger.info("Caméra %s libérée", self._cap_id)
            except Exception as e:
                logger.exception("Erreur lors de la libération de la caméra: %s", e)
        self._cap = None
        self._cap_id = None


# --- CLI / exemple d'utilisation ---

def demo_callback(frame, result):
    # Fonction de demo: affiche la frame avec bbox et print JSON minimal
    try:
        frame_disp = frame.copy()
        for f in result.get('faces', []):
            x1, y1, x2, y2 = f['bbox'] if len(f['bbox']) == 4 else (0, 0, 0, 0)
            cv2.rectangle(frame_disp, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.imshow('MultiCameraService - Preview (q to quit)', frame_disp)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            # Si l'utilisateur ferme, on arrête le service
            raise KeyboardInterrupt()
    except KeyboardInterrupt:
        raise
    except Exception:
        # pas fatal
        pass


def run_demo():
    svc = MultiCameraService(max_test_devices=8)
    cams = svc.list_cameras()
    if not cams:
        logger.error("Aucune caméra détectée. Branche une webcam puis réessaye.")
        return

    print("Caméras détectées :")
    for d in cams:
        print(f"  ID={d['id']}  - {d['name']}  ({d['width']}x{d['height']})")

    try:
        choix = int(input("Choisissez l'ID de la caméra à utiliser : "))
    except Exception:
        choix = cams[0]['id']

    ok = svc.select_camera(choix)
    if not ok:
        logger.error("Impossible d'ouvrir la caméra choisie")
        return

    try:
        svc.start_recognition(callback=demo_callback)
        # boucle principale: attend l'interruption
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        logger.info("Interruption clavier reçue — arrêt propre")
    finally:
        svc.stop()
        cv2.destroyAllWindows()


if __name__ == '__main__':
    run_demo()
