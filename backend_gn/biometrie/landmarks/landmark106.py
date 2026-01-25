"""Détection des 106 landmarks faciaux avec InsightFace.

Ce module utilise InsightFace (buffalo_l) avec le module landmark_2d_106.
"""

import logging
import threading
from typing import List, Optional, Dict, Any, Union
import numpy as np
from PIL import Image, UnidentifiedImageError
import io

from django.core.files.base import File
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile

import os
os.environ.setdefault("ORT_LOG_SEVERITY_LEVEL", "2")

logger = logging.getLogger(__name__)

# Variables globales pour le modèle FaceAnalysis
_LANDMARK_106_LOCK = threading.Lock()
_LANDMARK_106_MODEL = None
_LANDMARK_106_ERROR: Optional[Exception] = None

try:
    from insightface.app import FaceAnalysis
    _INSIGHTFACE_AVAILABLE = True
    _INSIGHTFACE_IMPORT_ERROR = None
except Exception as exc:
    FaceAnalysis = None
    _INSIGHTFACE_AVAILABLE = False
    _INSIGHTFACE_IMPORT_ERROR = exc

UploadedImage = Union[
    str,
    bytes,
    InMemoryUploadedFile,
    TemporaryUploadedFile,
    Image.Image,
    np.ndarray,
]


def _pil_to_bgr(image: Image.Image) -> np.ndarray:
    """Convertit une image PIL RGB en tableau numpy BGR."""
    rgb = image.convert("RGB")
    array = np.asarray(rgb)
    return array[:, :, ::-1]


def _load_image(image: UploadedImage) -> Optional[np.ndarray]:
    """Charge une image depuis diverses sources vers un tableau numpy BGR."""
    if isinstance(image, str):
        try:
            with Image.open(image) as img:
                return _pil_to_bgr(img)
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("Le fichier image fourni est invalide ou corrompu.") from exc

    if isinstance(image, (InMemoryUploadedFile, TemporaryUploadedFile)):
        image.seek(0)
        data = image.read()
        image.seek(0)
        try:
            return _pil_to_bgr(Image.open(io.BytesIO(data)))
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("Le fichier téléchargé n'est pas une image valide.") from exc

    if isinstance(image, bytes):
        try:
            return _pil_to_bgr(Image.open(io.BytesIO(image)))
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("Le contenu binaire fourni n'est pas une image valide.") from exc

    if isinstance(image, Image.Image):
        return _pil_to_bgr(image)

    if isinstance(image, np.ndarray):
        if image.ndim == 3 and image.shape[2] >= 3:
            array = image.astype(np.uint8, copy=False)
            return array[:, :, :3]
        raise ValueError("Le tableau numpy doit être de forme (H, W, 3)")

    if isinstance(image, File):
        image.seek(0)
        data = image.read()
        image.seek(0)
        try:
            return _pil_to_bgr(Image.open(io.BytesIO(data)))
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("Le fichier fourni n'est pas une image valide.") from exc

    raise TypeError("Type d'image non supporté pour InsightFace")


def _get_landmark_106_model() -> Optional[Any]:
    """Obtient ou initialise le modèle FaceAnalysis global avec 106 landmarks."""
    global _LANDMARK_106_MODEL, _LANDMARK_106_ERROR

    if _LANDMARK_106_MODEL is not None:
        return _LANDMARK_106_MODEL

    if not _INSIGHTFACE_AVAILABLE:
        _LANDMARK_106_ERROR = _INSIGHTFACE_IMPORT_ERROR if '_INSIGHTFACE_IMPORT_ERROR' in globals() else None
        logger.error("InsightFace n'est pas disponible. ImportError: %s", _LANDMARK_106_ERROR)
        return None

    with _LANDMARK_106_LOCK:
        if _LANDMARK_106_MODEL is not None:
            return _LANDMARK_106_MODEL

        try:
            if not _INSIGHTFACE_AVAILABLE or FaceAnalysis is None:
                raise RuntimeError("FaceAnalysis n'est pas disponible")
            
            model = FaceAnalysis(
                name="buffalo_l",
                allowed_modules=['detection', 'landmark_2d_106'],
                providers=['CPUExecutionProvider']
            )
            model.prepare(ctx_id=-1, det_size=(640, 640))
            
            _LANDMARK_106_MODEL = model
            _LANDMARK_106_ERROR = None
            
            logger.info("Modèle FaceAnalysis (106 landmarks) initialisé avec succès (CPU)")
        except Exception as exc:
            _LANDMARK_106_MODEL = None
            _LANDMARK_106_ERROR = exc
            logger.error("Impossible d'initialiser FaceAnalysis (106 landmarks): %s", exc)
            return None

    return _LANDMARK_106_MODEL


def detect_106_landmarks(image: UploadedImage) -> Dict[str, Any]:
    """Détecte les 106 landmarks faciaux sur une image.
    
    Args:
        image: Source de l'image (chemin, bytes, UploadedFile, ndarray, etc.).
    
    Returns:
        Dict contenant:
            - success (bool): True si un visage a été détecté
            - landmarks (List[List[float]]): Liste de 106 points [x, y]
            - bbox (List[int]): Boîte englobante [x1, y1, x2, y2] (optionnel)
            - confidence (float): Score de confiance de détection (optionnel)
            - error (str): Message d'erreur si success=False
    
    Raises:
        ValueError: Si l'image ne peut pas être chargée.
        RuntimeError: Si InsightFace n'est pas disponible.
    """
    model = _get_landmark_106_model()
    
    if model is None:
        error_msg = "InsightFace n'est pas disponible. Vérifiez l'installation d'insightface."
        if _LANDMARK_106_ERROR:
            error_msg = f"{error_msg} Erreur: {_LANDMARK_106_ERROR}"
        raise RuntimeError(error_msg)

    frame = _load_image(image)
    if frame is None:
        raise ValueError("Impossible de charger l'image fournie.")

    try:
        faces = model.get(frame)
    except Exception as exc:
        logger.error("Erreur InsightFace lors de la détection des visages: %s", exc)
        raise RuntimeError("Le moteur InsightFace a rencontré une erreur pendant la détection.") from exc

    if not faces or len(faces) == 0:
        return {
            "success": False,
            "error": "Aucun visage détecté dans l'image.",
            "landmarks": []
        }

    face = faces[0]
    
    landmarks = getattr(face, "landmark_2d_106", None)
    if landmarks is None:
        landmarks = getattr(face, "landmark", None)
    
    if landmarks is None:
        return {
            "success": False,
            "error": "Les landmarks n'ont pas pu être extraits du visage détecté.",
            "landmarks": []
        }

    landmarks_list = []
    if isinstance(landmarks, np.ndarray):
        if landmarks.ndim == 2 and landmarks.shape[1] == 2:
            for point in landmarks:
                landmarks_list.append([float(point[0]), float(point[1])])
        elif landmarks.ndim == 1 and landmarks.size == 106 * 2:
            landmarks_reshaped = landmarks.reshape(106, 2)
            for point in landmarks_reshaped:
                landmarks_list.append([float(point[0]), float(point[1])])
    else:
        landmarks_list = [[float(p[0]), float(p[1])] for p in landmarks]

    bbox = None
    confidence = None
    
    if hasattr(face, "bbox"):
        bbox_array = face.bbox
        if isinstance(bbox_array, np.ndarray):
            bbox = [int(x) for x in bbox_array.tolist()]
        else:
            bbox = [int(x) for x in bbox_array]

    if hasattr(face, "det_score"):
        confidence = float(face.det_score)

    return {
        "success": True,
        "landmarks": landmarks_list,
        "bbox": bbox,
        "confidence": confidence
    }

