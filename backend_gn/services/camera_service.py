"""
Service centralisé pour la gestion des caméras et captures d'images.

Ce service gère :
- La détection des caméras disponibles (intégrée index 0, USB index 1+)
- La capture d'images depuis une caméra spécifique
- La gestion des erreurs (caméra non disponible, non branchée)
- La libération des ressources

Intégré au système SGIC pour supporter les caméras intégrées et USB externes.
"""

import logging
import cv2
import numpy as np
from typing import Optional, Tuple, Dict, Any
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils import timezone

logger = logging.getLogger(__name__)


class CameraServiceError(Exception):
    """Exception de base pour les erreurs du service caméra."""
    pass


class CameraUnavailableError(CameraServiceError):
    """Exception levée quand une caméra n'est pas disponible."""
    pass


class CameraCaptureError(CameraServiceError):
    """Exception levée lors d'une erreur de capture."""
    pass


class CameraService:
    """
    Service pour gérer les opérations de caméra.
    
    Supporte les caméras intégrées (index 0) et USB externes (index 1+).
    """
    
    def __init__(self):
        """Initialise le service caméra."""
        self._camera_cache: Dict[int, cv2.VideoCapture] = {}
        self._max_test_index = 6  # Teste jusqu'à 6 caméras par défaut
    
    def list_available_cameras(self) -> list[Dict[str, Any]]:
        """
        Liste toutes les caméras disponibles.
        
        Returns:
            Liste de dictionnaires contenant les informations des caméras :
            [
                {
                    'index': 0,
                    'type': 'integree',
                    'name': 'Caméra intégrée',
                    'available': True
                },
                {
                    'index': 1,
                    'type': 'usb',
                    'name': 'Caméra USB externe',
                    'available': True
                },
                ...
            ]
        """
        available_cameras = []
        
        try:
            # Tester les indices de 0 à max_test_index
            for idx in range(self._max_test_index):
                camera_info = self._test_camera_index(idx)
                if camera_info['available']:
                    available_cameras.append(camera_info)
        except Exception as e:
            logger.error(f"Erreur lors de la détection des caméras: {e}", exc_info=True)
        
        return available_cameras
    
    def _test_camera_index(self, index: int) -> Dict[str, Any]:
        """
        Teste si une caméra à un index donné est disponible.
        
        Args:
            index: Index de la caméra à tester
            
        Returns:
            Dictionnaire avec les informations de la caméra
        """
        camera_info = {
            'index': index,
            'type': 'integree' if index == 0 else 'usb',
            'name': 'Caméra intégrée' if index == 0 else f'Caméra USB externe (index {index})',
            'available': False
        }
        
        try:
            cap = cv2.VideoCapture(index)
            if cap.isOpened():
                # Tenter de lire une frame pour vérifier que la caméra fonctionne vraiment
                ret, frame = cap.read()
                if ret and frame is not None:
                    camera_info['available'] = True
                    # Extraire quelques infos techniques si possible
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    camera_info['resolution'] = {'width': width, 'height': height}
                cap.release()
        except Exception as e:
            logger.debug(f"Caméra index {index} non disponible: {e}")
        
        return camera_info
    
    def capture_image(
        self,
        camera_index: int,
        timeout: float = 5.0
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Capture une image depuis une caméra spécifique.
        
        Args:
            camera_index: Index de la caméra (0 = intégrée, 1+ = USB)
            timeout: Timeout en secondes pour la capture
            
        Returns:
            Tuple (image_array, metadata) où :
            - image_array: Tableau numpy de l'image capturée (format BGR)
            - metadata: Dictionnaire avec métadonnées (résolution, timestamp, etc.)
            
        Raises:
            CameraUnavailableError: Si la caméra n'est pas disponible
            CameraCaptureError: Si la capture échoue
        """
        if camera_index < 0:
            raise CameraUnavailableError(f"Index de caméra invalide: {camera_index}")
        
        cap = None
        try:
            # Ouvrir la caméra
            cap = cv2.VideoCapture(camera_index)
            
            if not cap.isOpened():
                raise CameraUnavailableError(
                    f"Impossible d'ouvrir la caméra à l'index {camera_index}. "
                    f"Vérifiez que la caméra est branchée et disponible."
                )
            
            # Configurer la résolution si possible (optionnel)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            
            # Lire plusieurs frames pour laisser la caméra s'ajuster (surtout pour USB)
            for _ in range(5):
                cap.read()
            
            # Capturer la frame
            ret, frame = cap.read()
            
            if not ret or frame is None:
                raise CameraCaptureError(
                    f"Impossible de lire une image depuis la caméra à l'index {camera_index}. "
                    f"La caméra peut être occupée ou défectueuse."
                )
            
            # Extraire les métadonnées
            height, width = frame.shape[:2]
            metadata = {
                'camera_index': camera_index,
                'camera_type': 'integree' if camera_index == 0 else 'usb',
                'resolution': {'width': int(width), 'height': int(height)},
                'timestamp': timezone.now().isoformat(),
                'channels': int(frame.shape[2]) if len(frame.shape) > 2 else 1,
            }
            
            logger.info(
                f"Capture réussie depuis la caméra index {camera_index} "
                f"({metadata['resolution']['width']}x{metadata['resolution']['height']})"
            )
            
            return frame, metadata
            
        except CameraUnavailableError:
            raise
        except CameraCaptureError:
            raise
        except Exception as e:
            logger.error(f"Erreur inattendue lors de la capture: {e}", exc_info=True)
            raise CameraCaptureError(f"Erreur lors de la capture: {str(e)}")
        finally:
            # Toujours libérer la caméra
            if cap is not None:
                try:
                    cap.release()
                except Exception:
                    pass
    
    def capture_image_as_file(
        self,
        camera_index: int,
        filename: Optional[str] = None,
        quality: int = 85
    ) -> Tuple[InMemoryUploadedFile, Dict[str, Any]]:
        """
        Capture une image depuis une caméra et la retourne comme fichier Django.
        
        Args:
            camera_index: Index de la caméra (0 = intégrée, 1+ = USB)
            filename: Nom du fichier (généré automatiquement si None)
            quality: Qualité JPEG (1-100, défaut: 85)
            
        Returns:
            Tuple (image_file, metadata) où :
            - image_file: Fichier InMemoryUploadedFile prêt à être sauvegardé
            - metadata: Dictionnaire avec métadonnées
            
        Raises:
            CameraUnavailableError: Si la caméra n'est pas disponible
            CameraCaptureError: Si la capture échoue
        """
        # Capturer l'image
        frame, metadata = self.capture_image(camera_index)
        
        # Convertir BGR en RGB pour PIL
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Convertir en PIL Image
        pil_image = Image.fromarray(frame_rgb)
        
        # Générer le nom de fichier si non fourni
        if filename is None:
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            camera_type = 'integree' if camera_index == 0 else f'usb{camera_index}'
            filename = f'capture_{camera_type}_{timestamp}.jpg'
        
        # Convertir en BytesIO
        image_io = BytesIO()
        pil_image.save(image_io, format='JPEG', quality=quality)
        image_io.seek(0)
        
        # Créer le fichier Django
        image_file = InMemoryUploadedFile(
            image_io,
            None,
            filename,
            'image/jpeg',
            image_io.tell(),
            None
        )
        
        return image_file, metadata
    
    def get_camera_type_display(self, camera_index: int) -> str:
        """
        Retourne le type de caméra en français pour un index donné.
        
        Args:
            camera_index: Index de la caméra
            
        Returns:
            String descriptif du type de caméra
        """
        if camera_index == 0:
            return 'Caméra intégrée'
        else:
            return f'Caméra USB externe (index {camera_index})'
    
    @staticmethod
    def find_usb_camera(max_index: int = 5) -> int:
        """
        Recherche automatique d'une webcam USB externe.
        
        Commence la recherche à l'index 1 (index 0 = caméra intégrée).
        
        Args:
            max_index: Index maximum à tester (défaut: 5)
            
        Returns:
            Index de la première caméra USB trouvée
            
        Raises:
            CameraUnavailableError: Si aucune caméra USB n'est trouvée
        """
        for index in range(1, max_index + 1):
            try:
                cap = cv2.VideoCapture(index)
                if cap.isOpened():
                    # Tester si on peut vraiment lire une frame
                    ret, _ = cap.read()
                    cap.release()
                    if ret:
                        logger.info(f"Caméra USB trouvée à l'index {index}")
                        return index
            except Exception as e:
                logger.debug(f"Erreur test index {index}: {e}")
                continue
        
        raise CameraUnavailableError(
            f"Aucune webcam USB détectée (testé les index 1 à {max_index}). "
            f"Vérifiez que la caméra USB est branchée et allumée."
        )
    
    @staticmethod
    def capture_from_usb() -> Tuple[InMemoryUploadedFile, Dict[str, Any]]:
        """
        Capture une image depuis la première caméra USB disponible.
        
        Détecte automatiquement la caméra USB et capture une image.
        
        Returns:
            Tuple (image_file, metadata) où :
            - image_file: Fichier InMemoryUploadedFile prêt à être sauvegardé
            - metadata: Dictionnaire avec métadonnées
            
        Raises:
            CameraUnavailableError: Si aucune caméra USB n'est disponible
            CameraCaptureError: Si la capture échoue
        """
        # Trouver la caméra USB
        camera_index = CameraService.find_usb_camera()
        
        # Utiliser la méthode existante pour capturer
        service = CameraService()
        return service.capture_image_as_file(camera_index)
    
    def cleanup(self):
        """Libère toutes les ressources caméra (nettoyage)."""
        for index, cap in self._camera_cache.items():
            try:
                if cap.isOpened():
                    cap.release()
            except Exception:
                pass
        self._camera_cache.clear()
        logger.debug("Ressources caméra libérées")
