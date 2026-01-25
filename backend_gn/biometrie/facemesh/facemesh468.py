"""Détection FaceMesh 468 points 3D avec MediaPipe (optionnel).

Ce module est optionnel et nécessite l'installation de mediapipe.
Si MediaPipe n'est pas disponible, les fonctions retournent des résultats vides.
"""

import logging
from typing import List, Optional, Dict, Any, Union
import numpy as np

logger = logging.getLogger(__name__)

_MEDIAPIPE_AVAILABLE = False
_MEDIAPIPE_IMPORT_ERROR = None

try:
    import mediapipe as mp
    _MEDIAPIPE_AVAILABLE = True
    _MEDIAPIPE_IMPORT_ERROR = None
except Exception as exc:
    mp = None
    _MEDIAPIPE_AVAILABLE = False
    _MEDIAPIPE_IMPORT_ERROR = exc


def detect_facemesh468(image: np.ndarray) -> Dict[str, Any]:
    """Détecte les 468 points FaceMesh 3D sur une image.
    
    Args:
        image: Image numpy en format BGR (H, W, 3).
    
    Returns:
        Dict contenant:
            - success (bool): True si MediaPipe est disponible et un visage détecté
            - landmarks (List[List[float]]): Liste de 468 points [x, y, z]
            - error (str): Message d'erreur si success=False
    """
    if not _MEDIAPIPE_AVAILABLE:
        return {
            "success": False,
            "error": "MediaPipe n'est pas disponible. Installation optionnelle: pip install mediapipe",
            "landmarks": []
        }

    try:
        mp_face_mesh = mp.solutions.face_mesh
        mp_drawing = mp.solutions.drawing_utils
        
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            # MediaPipe attend RGB
            rgb_image = image[:, :, ::-1]
            results = face_mesh.process(rgb_image)
            
            if not results.multi_face_landmarks:
                return {
                    "success": False,
                    "error": "Aucun visage détecté par MediaPipe.",
                    "landmarks": []
                }
            
            face_landmarks = results.multi_face_landmarks[0]
            h, w = image.shape[:2]
            
            landmarks_list = []
            for landmark in face_landmarks.landmark:
                x = float(landmark.x * w)
                y = float(landmark.y * h)
                z = float(landmark.z * w)  # z est normalisé par la largeur
                landmarks_list.append([x, y, z])
            
            return {
                "success": True,
                "landmarks": landmarks_list
            }
    except Exception as exc:
        logger.error("Erreur MediaPipe lors de la détection FaceMesh: %s", exc)
        return {
            "success": False,
            "error": f"Erreur MediaPipe: {str(exc)}",
            "landmarks": []
        }

