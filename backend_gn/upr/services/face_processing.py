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
from PIL import Image
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
        # 1. Extraction des landmarks 106 points
        logger.info("Début extraction landmarks 106 points...")
        landmarks_result = detect_106_landmarks(image)
        
        if not landmarks_result.get("success", False):
            error_msg = landmarks_result.get("error", "Échec extraction landmarks")
            result["error"] = error_msg
            logger.warning(f"Échec extraction landmarks: {error_msg}")
            
            # Si plusieurs visages détectés, informer l'utilisateur
            if "Plusieurs visages" in error_msg or "plusieurs visages" in error_msg.lower():
                result["error"] = f"{error_msg} Le système utilisera automatiquement le visage le plus grand."
                logger.info("Tentative avec le visage le plus grand...")
            
            return result
        
        landmarks = landmarks_result.get("landmarks", [])
        bbox = landmarks_result.get("bbox")
        confidence = landmarks_result.get("confidence")
        
        if len(landmarks) != 106:
            result["error"] = f"Nombre de landmarks incorrect: {len(landmarks)} au lieu de 106"
            logger.warning(result["error"])
            return result
        
        logger.info(f"Landmarks 106 points extraits avec succès (confiance: {confidence})")
        result["landmarks"] = landmarks
        result["bbox"] = bbox
        result["confidence"] = confidence
        
        # 2. Extraction de l'embedding ArcFace 512D
        logger.info("Début extraction embedding ArcFace 512D...")
        arcface_service = get_arcface_service()
        
        if arcface_service is None or not arcface_service.available:
            result["error"] = "Service ArcFace non disponible"
            logger.error(result["error"])
            return result
        
        # Encoder l'image pour obtenir l'embedding
        embedding = arcface_service.encode_image(image)
        
        if embedding is None:
            result["error"] = "Aucun visage détecté pour l'extraction d'embedding"
            logger.warning(result["error"])
            return result
        
        # Convertir numpy array en liste de floats
        if isinstance(embedding, np.ndarray):
            embedding_list = embedding.tolist()
        else:
            embedding_list = list(embedding)
        
        if len(embedding_list) != 512:
            result["error"] = f"Dimension d'embedding incorrecte: {len(embedding_list)} au lieu de 512"
            logger.warning(result["error"])
            return result
        
        logger.info(f"Embedding ArcFace 512D extrait avec succès")
        result["embedding"] = embedding_list
        result["success"] = True
        
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

