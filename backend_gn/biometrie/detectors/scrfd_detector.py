"""Détecteur de visages SCRFD via InsightFace.

Ce module utilise InsightFace avec le modèle SCRFD pour la détection de visages.
SCRFD est intégré dans InsightFace buffalo_l.
"""

import logging
import threading
from typing import List, Optional, Dict, Any, Union, Tuple
import numpy as np
from PIL import Image, UnidentifiedImageError
import io

from django.core.files.base import File
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile

import os
import warnings

# Supprime complètement les avertissements ONNX Runtime (niveau 4 = FATAL uniquement)
os.environ["ORT_LOG_SEVERITY_LEVEL"] = "4"
# Supprime les avertissements ONNX Runtime pour CUDA
warnings.filterwarnings("ignore", category=UserWarning, module="onnxruntime")

logger = logging.getLogger(__name__)

# Réduire les logs InsightFace
logging.getLogger("insightface").setLevel(logging.WARNING)
logging.getLogger("onnxruntime").setLevel(logging.ERROR)

_SCRFD_LOCK = threading.Lock()
_SCRFD_MODEL = None
_SCRFD_ERROR: Optional[Exception] = None

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

    raise TypeError("Type d'image non supporté pour SCRFD")


def _get_scrfd_model() -> Optional[Any]:
    """Obtient ou initialise le modèle FaceAnalysis global avec SCRFD."""
    global _SCRFD_MODEL, _SCRFD_ERROR

    if _SCRFD_MODEL is not None:
        return _SCRFD_MODEL

    if not _INSIGHTFACE_AVAILABLE:
        _SCRFD_ERROR = _INSIGHTFACE_IMPORT_ERROR if '_INSIGHTFACE_IMPORT_ERROR' in globals() else None
        logger.error("InsightFace n'est pas disponible. ImportError: %s", _SCRFD_ERROR)
        return None

    with _SCRFD_LOCK:
        if _SCRFD_MODEL is not None:
            return _SCRFD_MODEL

        try:
            if not _INSIGHTFACE_AVAILABLE or FaceAnalysis is None:
                raise RuntimeError("FaceAnalysis n'est pas disponible")
            
            # SCRFD est intégré dans buffalo_l via le module 'detection'
            model = FaceAnalysis(
                name="buffalo_l",
                allowed_modules=['detection'],
                providers=['CPUExecutionProvider']
            )
            model.prepare(ctx_id=-1, det_size=(640, 640))
            
            _SCRFD_MODEL = model
            _SCRFD_ERROR = None
            
            logger.info("Modèle SCRFD (via InsightFace) initialisé avec succès (CPU)")
        except Exception as exc:
            _SCRFD_MODEL = None
            _SCRFD_ERROR = exc
            logger.error("Impossible d'initialiser SCRFD: %s", exc)
            return None

    return _SCRFD_MODEL


def detect_face(image: UploadedImage) -> Dict[str, Any]:
    """Détecte un visage avec SCRFD.
    
    Args:
        image: Source de l'image (chemin, bytes, UploadedFile, ndarray, etc.).
    
    Returns:
        Dict contenant:
            - success (bool): True si un visage a été détecté
            - bbox (List[int]): Boîte englobante [x1, y1, x2, y2]
            - confidence (float): Score de confiance de détection
            - face_crop (np.ndarray): Image recadrée du visage (optionnel)
            - error (str): Message d'erreur si success=False
    
    Raises:
        ValueError: Si l'image ne peut pas être chargée.
        RuntimeError: Si SCRFD n'est pas disponible.
    """
    model = _get_scrfd_model()
    
    if model is None:
        error_msg = "SCRFD n'est pas disponible. Vérifiez l'installation d'insightface."
        if _SCRFD_ERROR:
            error_msg = f"{error_msg} Erreur: {_SCRFD_ERROR}"
        raise RuntimeError(error_msg)

    frame = _load_image(image)
    if frame is None:
        raise ValueError("Impossible de charger l'image fournie.")

    try:
        faces = model.get(frame)
    except Exception as exc:
        logger.error("Erreur SCRFD lors de la détection des visages: %s", exc)
        raise RuntimeError("Le moteur SCRFD a rencontré une erreur pendant la détection.") from exc

    if not faces or len(faces) == 0:
        return {
            "success": False,
            "error": "Aucun visage détecté dans l'image.",
            "bbox": None,
            "confidence": None,
            "face_crop": None
        }

    if len(faces) > 1:
        logger.warning(f"{len(faces)} visages détectés dans l'image. Utilisation du visage le plus grand.")
        faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)

    face = faces[0]
    
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

    # Extraire le face crop
    face_crop = None
    if bbox and len(bbox) >= 4:
        x1, y1, x2, y2 = bbox[:4]
        # Ajouter une marge de sécurité
        margin = 0.1
        h, w = frame.shape[:2]
        x1 = max(0, int(x1 - (x2 - x1) * margin))
        y1 = max(0, int(y1 - (y2 - y1) * margin))
        x2 = min(w, int(x2 + (x2 - x1) * margin))
        y2 = min(h, int(y2 + (y2 - y1) * margin))
        face_crop = frame[y1:y2, x1:x2].copy()

    return {
        "success": True,
        "bbox": bbox,
        "confidence": confidence,
        "face_crop": face_crop
    }

