"""
Service de reconnaissance faciale utilisant face_recognition (128D).

Ce service permet :
- Capture d'image depuis une caméra USB
- Extraction d'encodings faciaux (128 dimensions)
- Comparaison avec les UPR existants
- Détection de visages

Utilise la bibliothèque face_recognition (basée sur dlib) pour une reconnaissance rapide
et précise. Les encodings sont stockés en base de données pour comparaison ultérieure.
"""

import logging
import os
import uuid
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime

import cv2
import numpy as np
import face_recognition
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from ..models import UnidentifiedPerson

logger = logging.getLogger(__name__)

# Seuil de reconnaissance configurable (distance euclidienne)
# Plus petit = plus strict (0.4 = très strict, 0.6 = modéré, 0.7 = permissif)
DEFAULT_RECOGNITION_THRESHOLD = getattr(
    settings, 
    'UPR_FACE_RECOGNITION_THRESHOLD', 
    0.6
)

# Index de caméra USB par défaut
DEFAULT_CAMERA_INDEX = int(os.getenv('UPR_CAMERA_INDEX', '0'))


def capture_face_from_camera(camera_index: Optional[int] = None) -> np.ndarray:
    """
    Capture une image depuis une caméra USB.
    
    Args:
        camera_index: Index de la caméra (défaut: 0 pour la première caméra USB)
    
    Returns:
        numpy.ndarray: Image capturée au format BGR (OpenCV)
    
    Raises:
        Exception: Si la caméra n'est pas accessible ou si la capture échoue
    """
    if camera_index is None:
        camera_index = DEFAULT_CAMERA_INDEX
    
    logger.info(f"Tentative de capture depuis la caméra USB index {camera_index}...")
    
    try:
        # Ouvrir la caméra
        cam = cv2.VideoCapture(camera_index)
        
        if not cam.isOpened():
            raise Exception(f"Impossible d'ouvrir la caméra USB index {camera_index}")
        
        # Lire une frame
        ret, frame = cam.read()
        
        # Fermer la caméra immédiatement
        cam.release()
        
        if not ret:
            raise Exception(f"Impossible de capturer une image depuis la caméra {camera_index}")
        
        if frame is None or frame.size == 0:
            raise Exception(f"Image capturée vide depuis la caméra {camera_index}")
        
        logger.info(f"Capture réussie: résolution {frame.shape[1]}x{frame.shape[0]}")
        return frame
        
    except Exception as e:
        logger.error(f"Erreur lors de la capture depuis la caméra {camera_index}: {e}")
        raise Exception(f"Erreur de capture caméra: {str(e)}")


def extract_face_encoding(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Extrait l'encoding facial (128D) depuis une image.
    
    Args:
        image: Image au format BGR (numpy array) ou RGB (PIL Image)
    
    Returns:
        numpy.ndarray: Encoding facial de 128 dimensions, ou None si aucun visage détecté
    
    Raises:
        ValueError: Si l'image est invalide
        RuntimeError: Si face_recognition n'est pas disponible
    """
    try:
        # Convertir BGR (OpenCV) vers RGB (face_recognition)
        if len(image.shape) == 3 and image.shape[2] == 3:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb_image = image
        
        logger.info("Recherche de visages dans l'image...")
        
        # Détecter les emplacements des visages
        face_locations = face_recognition.face_locations(rgb_image)
        
        if not face_locations:
            logger.warning("Aucun visage détecté dans l'image")
            return None
        
        if len(face_locations) > 1:
            logger.warning(f"Plusieurs visages détectés ({len(face_locations)}). Utilisation du premier.")
        
        # Extraire l'encoding du premier visage détecté
        encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        if not encodings:
            logger.warning("Impossible d'extraire l'encoding du visage détecté")
            return None
        
        encoding = encodings[0]  # Prendre le premier visage
        
        # Vérifier la dimension (face_recognition produit toujours 128 dimensions)
        if len(encoding) != 128:
            logger.error(f"Dimension d'encoding incorrecte: {len(encoding)} au lieu de 128")
            return None
        
        logger.info(f"Encoding facial extrait avec succès (128 dimensions)")
        return encoding
        
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction de l'encoding facial: {e}", exc_info=True)
        raise RuntimeError(f"Erreur d'extraction d'encoding: {str(e)}")


def compare_with_existing_faces(
    new_encoding: np.ndarray, 
    threshold: Optional[float] = None
) -> Optional[UnidentifiedPerson]:
    """
    Compare un nouvel encoding avec tous les encodings UPR existants.
    
    Args:
        new_encoding: Nouvel encoding facial (128 dimensions)
        threshold: Seuil de distance (défaut: DEFAULT_RECOGNITION_THRESHOLD)
                  Plus petit = plus strict
    
    Returns:
        UnidentifiedPerson: UPR correspondant si trouvé, None sinon
    """
    if threshold is None:
        threshold = DEFAULT_RECOGNITION_THRESHOLD
    
    logger.info(f"Comparaison avec les UPR existants (seuil: {threshold})...")
    
    try:
        # Récupérer tous les UPR avec encodings face_recognition
        uprs = UnidentifiedPerson.objects.exclude(
            face_encoding__isnull=True
        ).exclude(
            face_encoding=[]
        ).exclude(
            is_resolved=True  # Ne pas comparer avec les UPR résolus
        ).exclude(
            is_archived=True  # Ne pas comparer avec les UPR archivés
        )
        
        best_match = None
        best_distance = float('inf')
        
        for upr in uprs:
            if not upr.face_encoding:
                continue
            
            try:
                # Convertir l'encoding JSON en numpy array
                known_encoding = np.array(upr.face_encoding, dtype=np.float32)
                
                # Vérifier la dimension
                if len(known_encoding) != 128:
                    logger.warning(f"UPR {upr.code_upr} a un encoding de dimension incorrecte: {len(known_encoding)}")
                    continue
                
                # Calculer la distance euclidienne entre les encodings
                # face_recognition.face_distance retourne un array de distances
                distances = face_recognition.face_distance([known_encoding], new_encoding)
                distance = distances[0]
                
                # Garder la meilleure correspondance (distance la plus petite)
                if distance < best_distance:
                    best_distance = distance
                    best_match = upr
                
                logger.debug(f"Distance avec UPR {upr.code_upr}: {distance:.4f}")
                
            except Exception as e:
                logger.warning(f"Erreur lors de la comparaison avec UPR {upr.code_upr}: {e}")
                continue
        
        # Vérifier si la meilleure correspondance est sous le seuil
        if best_match and best_distance < threshold:
            logger.info(
                f"Correspondance trouvée: UPR {best_match.code_upr} "
                f"(distance: {best_distance:.4f} < seuil: {threshold})"
            )
            return best_match
        elif best_match:
            logger.info(
                f"Meilleure correspondance: UPR {best_match.code_upr} "
                f"(distance: {best_distance:.4f} >= seuil: {threshold})"
            )
        
        logger.info("Aucune correspondance trouvée sous le seuil")
        return None
        
    except Exception as e:
        logger.error(f"Erreur lors de la comparaison avec les UPR existants: {e}", exc_info=True)
        raise RuntimeError(f"Erreur de comparaison: {str(e)}")


def save_image_to_storage(image: np.ndarray, subfolder: str = 'upr_faces') -> str:
    """
    Sauvegarde une image numpy array dans le stockage Django.
    
    Args:
        image: Image au format BGR (numpy array)
        subfolder: Sous-dossier dans media/ où sauvegarder
    
    Returns:
        str: Chemin relatif du fichier sauvegardé (ex: 'upr_faces/upr_capture_20250108_143022.jpg')
    """
    try:
        # Générer un nom de fichier unique
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        filename = f"upr_capture_{timestamp}_{unique_id}.jpg"
        
        # Encoder l'image en JPEG
        success, encoded_image = cv2.imencode('.jpg', image)
        
        if not success:
            raise Exception("Impossible d'encoder l'image en JPEG")
        
        # Créer un ContentFile Django
        image_content = ContentFile(encoded_image.tobytes(), name=filename)
        
        # Sauvegarder dans le stockage
        file_path = default_storage.save(f'{subfolder}/{filename}', image_content)
        
        logger.info(f"Image sauvegardée: {file_path}")
        return file_path
        
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde de l'image: {e}", exc_info=True)
        raise Exception(f"Erreur de sauvegarde d'image: {str(e)}")


def get_face_recognition_available() -> bool:
    """
    Vérifie si face_recognition est disponible.
    
    Returns:
        bool: True si face_recognition peut être utilisé
    """
    try:
        import face_recognition
        # Tester avec une petite image de test
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        _ = face_recognition.face_locations(test_image)
        return True
    except Exception as e:
        logger.warning(f"face_recognition non disponible: {e}")
        return False


def estimate_age_and_gender(image: np.ndarray) -> Dict[str, Any]:
    """
    Estime l'âge et le sexe depuis une image (placeholder pour extension future).
    
    Note: Cette fonction est un placeholder. Pour une implémentation réelle,
    utilisez des modèles comme AgeNet, GenderNet, ou des services cloud.
    
    Args:
        image: Image au format BGR (numpy array)
    
    Returns:
        Dict avec 'sexe_estime' et 'age_estime' (None si non disponible)
    """
    # TODO: Implémenter avec un modèle d'estimation d'âge/genre
    # Pour l'instant, retourner None
    return {
        'sexe_estime': None,
        'age_estime': None
    }

