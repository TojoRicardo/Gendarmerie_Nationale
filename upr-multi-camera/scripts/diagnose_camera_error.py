"""
Script de diagnostic pour l'erreur "Could not start video source"
Teste tous les aspects de l'accès à la caméra pour identifier le problème.
"""

import cv2
import logging
import time
import sys
import os
import platform

# Ajouter le répertoire parent au path pour importer le module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(message)s'
)
logger = logging.getLogger(__name__)


def check_camera_availability(camera_id: int = 0):
    """Vérifie si une caméra est disponible et peut être ouverte."""
    logger.info("=" * 60)
    logger.info(f"Diagnostic de la caméra ID {camera_id}")
    logger.info("=" * 60)
    
    # 1. Vérifier les backends disponibles
    logger.info("\n1. Vérification des backends OpenCV...")
    backends = []
    if platform.system() == 'Windows':
        if hasattr(cv2, 'CAP_DSHOW'):
            backends.append(('DirectShow', cv2.CAP_DSHOW))
        if hasattr(cv2, 'CAP_MSMF'):
            backends.append(('Media Foundation', cv2.CAP_MSMF))
        backends.append(('Any', cv2.CAP_ANY))
    else:
        if hasattr(cv2, 'CAP_V4L2'):
            backends.append(('V4L2', cv2.CAP_V4L2))
        backends.append(('Any', cv2.CAP_ANY))
    
    logger.info(f"   Backends disponibles: {[b[0] for b in backends]}")
    
    # 2. Tester chaque backend
    logger.info("\n2. Test d'ouverture de la caméra avec chaque backend...")
    successful_backend = None
    
    for backend_name, backend_id in backends:
        logger.info(f"\n   Test avec {backend_name} (ID: {backend_id})...")
        cap = None
        try:
            cap = cv2.VideoCapture(camera_id, backend_id)
            
            if cap is None:
                logger.warning("      [ERREUR] VideoCapture retourne None")
                continue
            
            if not cap.isOpened():
                logger.warning("      [ERREUR] Caméra non ouverte")
                if cap:
                    cap.release()
                continue
            
            logger.info("      [OK] Caméra ouverte")
            
            # Attendre un peu pour l'initialisation
            time.sleep(0.3)
            
            # Tester la lecture de frames
            logger.info("      Test de lecture de frames...")
            frames_read = 0
            for attempt in range(10):
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    frames_read += 1
                    if attempt == 0:
                        height, width = frame.shape[0], frame.shape[1]
                        logger.info(f"      [OK] Frame lue: {width}x{height}")
                else:
                    logger.warning(f"      [ATTENTION] Échec lecture frame (tentative {attempt + 1}/10)")
                time.sleep(0.1)
            
            if frames_read > 0:
                logger.info(f"      [OK] {frames_read}/10 frames lues avec succès")
                successful_backend = (backend_name, backend_id)
                
                # Obtenir les propriétés de la caméra
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                logger.info(f"      Propriétés: {width}x{height} @ {fps} FPS")
                
                cap.release()
                break
            else:
                logger.error("      [ERREUR] Aucune frame lue après 10 tentatives")
                cap.release()
                
        except cv2.error as e:
            logger.error(f"      [ERREUR] Erreur OpenCV: {e}")
            if cap:
                try:
                    cap.release()
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"      [ERREUR] Erreur inattendue: {e}", exc_info=True)
            if cap:
                try:
                    cap.release()
                except Exception:
                    pass
    
    # 3. Résumé et recommandations
    logger.info("\n" + "=" * 60)
    if successful_backend:
        logger.info(f"[OK] SUCCÈS: Caméra fonctionne avec {successful_backend[0]}")
        logger.info(f"   Utilisez ce backend dans votre code: cv2.CAP_{successful_backend[0].upper().replace(' ', '_')}")
    else:
        logger.error("[ERREUR] ÉCHEC: Aucun backend n'a réussi à ouvrir la caméra")
        logger.info("\nSolutions à essayer:")
        logger.info("   1. Vérifier que la webcam A03 est branchée et allumée")
        logger.info("   2. Fermer TOUTES les applications qui utilisent la caméra:")
        logger.info("      - Zoom, Teams, Skype, Discord")
        logger.info("      - Applications de streaming (OBS, etc.)")
        logger.info("      - Autres applications Python qui utilisent OpenCV")
        logger.info("   3. Vérifier dans le Gestionnaire de périphériques Windows:")
        logger.info("      - Démarrer > Gestionnaire de périphériques")
        logger.info("      - Chercher 'Caméras' ou 'Imaging devices'")
        logger.info("      - Vérifier qu'il n'y a pas de point d'exclamation jaune")
        logger.info("   4. Redémarrer l'ordinateur")
        logger.info("   5. Essayer un autre port USB")
        logger.info("   6. Vérifier les drivers de la webcam A03")
        logger.info("   7. Tester avec une autre application (ex: Caméra Windows)")
    
    logger.info("=" * 60)
    return successful_backend is not None


def test_multi_camera_service():
    """Teste l'intégration avec MultiCameraService."""
    logger.info("\n" + "=" * 60)
    logger.info("3. Test avec MultiCameraService...")
    logger.info("=" * 60)
    
    try:
        from multi_camera_service.main import MultiCameraService
        
        service = MultiCameraService(max_test_devices=10)
        
        # Lister les caméras
        logger.info("\n   Scan des caméras...")
        cameras = service.list_cameras()
        logger.info(f"   Caméras détectées: {len(cameras)}")
        for cam in cameras:
            logger.info(f"      - ID {cam['id']}: {cam.get('name', 'N/A')} ({cam.get('width', 0)}x{cam.get('height', 0)})")
        
        if not cameras:
            logger.error("   [ERREUR] Aucune caméra détectée par MultiCameraService")
            return False
        
        # Sélectionner la première caméra
        camera_id = cameras[0]['id']
        logger.info(f"\n   Sélection de la caméra ID {camera_id}...")
        if not service.select_camera(camera_id):
            logger.error("   [ERREUR] Échec de sélection de la caméra")
            return False
        
        logger.info("   [OK] Caméra sélectionnée avec succès")
        
        # Tester le démarrage (sans callback pour éviter les erreurs d'affichage)
        logger.info("\n   Test de démarrage de la reconnaissance (5 secondes)...")
        frame_count = [0]
        
        def test_callback(frame, result):
            frame_count[0] += 1
            if frame_count[0] % 30 == 0:
                logger.info(f"      Frames traitées: {frame_count[0]}")
        
        if service.start_recognition(callback=test_callback):
            logger.info("   [OK] Service démarré")
            time.sleep(5)
            service.stop()
            logger.info(f"   [OK] Service arrêté après {frame_count[0]} frames")
            return True
        else:
            logger.error("   [ERREUR] Échec du démarrage du service")
            return False
            
    except ImportError as e:
        logger.error(f"   [ERREUR] Impossible d'importer MultiCameraService: {e}")
        return False
    except Exception as e:
        logger.error(f"   [ERREUR] Erreur lors du test: {e}", exc_info=True)
        return False


if __name__ == '__main__':
    camera_id = 0
    if len(sys.argv) > 1:
        try:
            camera_id = int(sys.argv[1])
        except ValueError:
            logger.error("ID de caméra invalide. Utilisation de l'ID 0 par défaut.")
    
    # Test 1: Vérification de base
    success = check_camera_availability(camera_id)
    
    # Test 2: Test avec MultiCameraService
    if success:
        test_multi_camera_service()
    
    sys.exit(0 if success else 1)

