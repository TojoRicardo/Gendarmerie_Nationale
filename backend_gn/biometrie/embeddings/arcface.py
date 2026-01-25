"""Génération d'embeddings ArcFace (512 dimensions).

Ce module utilise InsightFace (buffalo_l) pour générer des embeddings faciaux
normalisés de 512 dimensions.
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
import warnings

# Supprime complètement les avertissements ONNX Runtime (niveau 4 = FATAL uniquement)
os.environ["ORT_LOG_SEVERITY_LEVEL"] = "4"
# Supprime les avertissements ONNX Runtime pour CUDA
warnings.filterwarnings("ignore", category=UserWarning, module="onnxruntime")

logger = logging.getLogger(__name__)

# Réduire les logs InsightFace
logging.getLogger("insightface").setLevel(logging.WARNING)
logging.getLogger("onnxruntime").setLevel(logging.ERROR)

# Variables globales pour le modèle FaceAnalysis
_ARCFACE_LOCK = threading.Lock()
_ARCFACE_MODEL = None
_ARCFACE_ERROR: Optional[Exception] = None

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

    raise TypeError("Type d'image non supporté pour ArcFace")


def _get_arcface_model() -> Optional[Any]:
    """Obtient ou initialise le modèle FaceAnalysis global avec ArcFace."""
    global _ARCFACE_MODEL, _ARCFACE_ERROR

    if _ARCFACE_MODEL is not None:
        return _ARCFACE_MODEL

    if not _INSIGHTFACE_AVAILABLE:
        _ARCFACE_ERROR = _INSIGHTFACE_IMPORT_ERROR if '_INSIGHTFACE_IMPORT_ERROR' in globals() else None
        logger.error("InsightFace n'est pas disponible. ImportError: %s", _ARCFACE_ERROR)
        return None

    with _ARCFACE_LOCK:
        if _ARCFACE_MODEL is not None:
            return _ARCFACE_MODEL

        try:
            if not _INSIGHTFACE_AVAILABLE or FaceAnalysis is None:
                raise RuntimeError("FaceAnalysis n'est pas disponible")
            
            # ArcFace embedding est intégré dans buffalo_l
            model = FaceAnalysis(
                name="buffalo_l",
                allowed_modules=['detection', 'recognition'],
                providers=['CPUExecutionProvider']
            )
            model.prepare(ctx_id=-1, det_size=(640, 640))
            
            _ARCFACE_MODEL = model
            _ARCFACE_ERROR = None
            
            logger.info("Modèle ArcFace (512-d embeddings) initialisé avec succès (CPU)")
        except Exception as exc:
            _ARCFACE_MODEL = None
            _ARCFACE_ERROR = exc
            logger.error("Impossible d'initialiser ArcFace: %s", exc)
            return None

    return _ARCFACE_MODEL


def generate_embedding(image: UploadedImage) -> Dict[str, Any]:
    """Génère un embedding ArcFace de 512 dimensions.
    
    Args:
        image: Source de l'image (chemin, bytes, UploadedFile, ndarray, etc.).
    
    Returns:
        Dict contenant:
            - success (bool): True si un visage a été détecté
            - embedding (List[float]): Vecteur d'embedding de 512 dimensions
            - bbox (List[int]): Boîte englobante [x1, y1, x2, y2] (optionnel)
            - confidence (float): Score de confiance de détection (optionnel)
            - error (str): Message d'erreur si success=False
    
    Raises:
        ValueError: Si l'image ne peut pas être chargée.
        RuntimeError: Si ArcFace n'est pas disponible.
    """
    model = _get_arcface_model()
    
    if model is None:
        error_msg = "ArcFace n'est pas disponible. Vérifiez l'installation d'insightface."
        if _ARCFACE_ERROR:
            error_msg = f"{error_msg} Erreur: {_ARCFACE_ERROR}"
        raise RuntimeError(error_msg)

    frame = _load_image(image)
    if frame is None:
        raise ValueError("Impossible de charger l'image fournie.")

    try:
        faces = model.get(frame)
    except Exception as exc:
        logger.error("Erreur ArcFace lors de la détection des visages: %s", exc)
        raise RuntimeError("Le moteur ArcFace a rencontré une erreur pendant la détection.") from exc

    if not faces or len(faces) == 0:
        return {
            "success": False,
            "error": "Aucun visage détecté dans l'image.",
            "embedding": None
        }

    face = faces[0]
    
    embedding = getattr(face, "embedding", None)
    if embedding is None:
        return {
            "success": False,
            "error": "L'embedding n'a pas pu être extrait du visage détecté.",
            "embedding": None
        }

    # Normaliser l'embedding
    embedding_array = np.asarray(embedding, dtype=np.float32)
    norm = np.linalg.norm(embedding_array)
    if norm > 0:
        embedding_array = embedding_array / norm

    embedding_list = embedding_array.astype(float).tolist()

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
        "embedding": embedding_list,
        "bbox": bbox,
        "confidence": confidence
    }

