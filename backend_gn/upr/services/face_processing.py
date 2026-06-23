"""
Service de traitement facial pour extraction biométrique complète.

Ce module extrait automatiquement :
- Détection du visage (RetinaFace/SCRFD via InsightFace)
- 106 landmarks faciaux
- Embedding ArcFace 512D

Gère les erreurs (pas de visage, plusieurs visages, qualité faible).
"""

import logging
import numpy as np
from typing import Optional, Dict, Any, Union, List
from PIL import Image, ImageOps
import io

from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile

# Import des services existants
from biometrie.arcface_service import ArcFaceService
from biometrie.face_106 import detect_106_landmarks

logger = logging.getLogger(__name__)

# Instance globale du service ArcFace
_arcface_service = None


def get_arcface_service() -> Optional[ArcFaceService]:
    """Obtient ou initialise le service ArcFace."""
    global _arcface_service
    if _arcface_service is None:
        try:
            _arcface_service = ArcFaceService()
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation d'ArcFaceService: {e}")
            return None
    return _arcface_service


UploadedImage = Union[
    str,
    bytes,
    InMemoryUploadedFile,
    TemporaryUploadedFile,
    Image.Image,
    np.ndarray,
]


def prepare_face_image(image: UploadedImage) -> Image.Image:
    """
    Normalise une image pour la détection faciale :
    correction EXIF, RGB, agrandissement des miniatures.
    """
    if isinstance(image, Image.Image):
        img = image.copy()
    elif isinstance(image, (InMemoryUploadedFile, TemporaryUploadedFile)):
        image.seek(0)
        data = image.read()
        image.seek(0)
        img = Image.open(io.BytesIO(data))
    elif isinstance(image, bytes):
        img = Image.open(io.BytesIO(image))
    elif isinstance(image, str):
        img = Image.open(image)
    elif isinstance(image, np.ndarray):
        if image.ndim == 3 and image.shape[2] >= 3:
            img = Image.fromarray(image[:, :, :3].astype(np.uint8))
        else:
            raise ValueError("Tableau numpy invalide pour une image")
    else:
        from django.core.files.base import File
        if isinstance(image, File):
            image.seek(0)
            data = image.read()
            image.seek(0)
            img = Image.open(io.BytesIO(data))
        else:
            raise TypeError(f"Type d'image non supporté: {type(image)}")

    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')
    w, h = img.size
    min_dim = min(w, h)
    if min_dim < 480:
        scale = 480 / min_dim
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return img


def extract_face_data(image: UploadedImage) -> Dict[str, Any]:
    """
    Extrait toutes les données faciales d'une image.
    
    Args:
        image: Source de l'image (chemin, bytes, UploadedFile, ndarray, etc.)
    
    Returns:
        Dict contenant:
            - success (bool): True si extraction réussie
            - landmarks (List[List[float]]): Liste de 106 points [x, y]
            - embedding (List[float]): Embedding ArcFace 512D
            - bbox (List[int]): Boîte englobante [x1, y1, x2, y2]
            - confidence (float): Score de confiance
            - error (str): Message d'erreur si success=False
    
    Raises:
        ValueError: Si l'image ne peut pas être chargée
        RuntimeError: Si les services ne sont pas disponibles
    """
    result = {
        "success": False,
        "landmarks": None,
        "embedding": None,
        "bbox": None,
        "confidence": None,
        "error": None
    }
    
    try:
        prepared = prepare_face_image(image)
        arcface_service = get_arcface_service()

        if arcface_service is None or not arcface_service.available:
            result["error"] = "Service ArcFace non disponible"
            logger.error(result["error"])
            return result

        # 1. Extraction ArcFace en priorité (plus fiable que landmarks 106 seuls)
        logger.info("Extraction embedding ArcFace (prioritaire)...")
        faces = arcface_service.encode_faces(image=prepared, limit=1)

        if faces:
            face = faces[0]
            embedding = face.embedding
            embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)

            if len(embedding_list) == 512:
                result["embedding"] = embedding_list
                result["bbox"] = list(face.bbox) if face.bbox else None
                result["confidence"] = float(face.confidence) if face.confidence else None
                result["success"] = True
                logger.info("Embedding ArcFace extrait avec succès")

                if face.landmarks is not None:
                    lm = np.asarray(face.landmarks, dtype=np.float32)
                    if lm.ndim == 2:
                        result["landmarks"] = lm.tolist()

        if result["success"]:
            return result

        # 2. Fallback landmarks 106
        logger.info("Fallback extraction landmarks 106 points...")
        landmarks_result: Dict[str, Any] = {"success": False, "error": "Aucun visage détecté dans l'image."}
        try:
            landmarks_result = detect_106_landmarks(prepared)
        except Exception as lm_exc:
            logger.warning("Fallback landmarks échoué: %s", lm_exc)
            landmarks_result = {"success": False, "error": str(lm_exc)}

        if landmarks_result.get("success", False):
            landmarks = landmarks_result.get("landmarks", [])
            if len(landmarks) == 106:
                result["landmarks"] = landmarks
                result["bbox"] = landmarks_result.get("bbox")
                result["confidence"] = landmarks_result.get("confidence")

        # 3. Dernière tentative encode sur image préparée
        if not result.get("embedding"):
            embedding = arcface_service.encode_image(prepared)
            if embedding is not None:
                embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)
                if len(embedding_list) == 512:
                    result["embedding"] = embedding_list
                    result["success"] = True
                    logger.info("Embedding ArcFace extrait via fallback encode_image")

        if result["success"]:
            return result

        result["error"] = landmarks_result.get("error", "Aucun visage détecté dans l'image.")
        logger.warning(result["error"])
        return result
        
    except ValueError as e:
        result["error"] = f"Erreur de validation: {str(e)}"
        logger.error(result["error"], exc_info=True)
        return result
    except RuntimeError as e:
        result["error"] = f"Erreur runtime: {str(e)}"
        logger.error(result["error"], exc_info=True)
        return result
    except Exception as e:
        result["error"] = f"Erreur inattendue lors de l'extraction: {str(e)}"
        logger.error(result["error"], exc_info=True)
        return result


def validate_face_quality(landmarks: List[List[float]], confidence: Optional[float] = None) -> Dict[str, Any]:
    """
    Valide la qualité du visage détecté.
    
    Args:
        landmarks: Liste des 106 landmarks
        confidence: Score de confiance (optionnel)
    
    Returns:
        Dict avec:
            - is_valid (bool): True si qualité acceptable
            - quality_score (float): Score de qualité (0-100)
            - warnings (List[str]): Liste des avertissements
    """
    warnings = []
    quality_score = 100.0
    
    # Vérifier le nombre de landmarks
    if len(landmarks) != 106:
        return {
            "is_valid": False,
            "quality_score": 0.0,
            "warnings": [f"Nombre de landmarks incorrect: {len(landmarks)}"]
        }
    
    # Vérifier la confiance
    if confidence is not None:
        if confidence < 0.5:
            warnings.append(f"Confiance de détection faible: {confidence:.2f}")
            quality_score -= 30
        elif confidence < 0.7:
            warnings.append(f"Confiance de détection modérée: {confidence:.2f}")
            quality_score -= 15
    
    if landmarks:
        x_coords = [point[0] for point in landmarks]
        y_coords = [point[1] for point in landmarks]
        
        x_range = max(x_coords) - min(x_coords) if x_coords else 0
        y_range = max(y_coords) - min(y_coords) if y_coords else 0
        
        if x_range < 50 or y_range < 50:
            warnings.append("Visage trop petit ou partiel détecté")
            quality_score -= 20
    
    quality_score = max(0, min(100, quality_score))
    is_valid = quality_score >= 50
    
    return {
        "is_valid": is_valid,
        "quality_score": quality_score,
        "warnings": warnings
    }

