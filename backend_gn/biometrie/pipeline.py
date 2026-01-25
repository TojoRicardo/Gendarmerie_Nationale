"""Pipeline complet d'enrôlement biométrique SGIC.

Ce module orchestre l'ensemble du pipeline biométrique :
1. Détection de visage (SCRFD)
2. Extraction du face crop
3. Détection des 106 landmarks
4. Alignement de l'image
5. Génération de l'embedding ArcFace (512-d)
6. (Optionnel) Extraction FaceMesh 468 points
7. (Optionnel) Extraction modèle 3D Morphable
"""

import logging
from typing import Dict, Any, Optional, Union, List, Tuple
import numpy as np
from PIL import Image
import cv2
import json

from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from django.db import transaction

from .detectors.scrfd_detector import detect_face
from .detectors.scrfd_detector import UploadedImage
from .landmarks.landmark106 import detect_106_landmarks
from .embeddings.arcface import generate_embedding
from .facemesh.facemesh468 import detect_facemesh468
from .facemodels.morphable_3d import extract_3dmm
from .models import BiometriePhoto, Biometrie

logger = logging.getLogger(__name__)


def _align_face(image: np.ndarray, landmarks: List[List[float]], 
                target_size: tuple = (112, 112)) -> Optional[np.ndarray]:
    """Aligne l'image du visage selon 5 points clés.
    
    Utilise les points des yeux et du nez pour l'alignement.
    """
    if len(landmarks) < 5:
        return None
    
    # Indices approximatifs pour les 106 landmarks :
    # - Oeil gauche: ~36-41
    # - Oeil droit: ~42-47
    # - Nez: ~30, 33, 51
    # - Bouche: ~48-67
    
    try:
        # Pour 106 landmarks, on utilise les centres des yeux et du nez
        left_eye_center = np.mean([landmarks[i] for i in range(36, 42) if i < len(landmarks)], axis=0)
        right_eye_center = np.mean([landmarks[i] for i in range(42, 48) if i < len(landmarks)], axis=0)
        nose_tip = landmarks[30] if len(landmarks) > 30 else landmarks[0]
        left_mouth = landmarks[48] if len(landmarks) > 48 else landmarks[0]
        right_mouth = landmarks[54] if len(landmarks) > 54 else landmarks[0]
        
        src_points = np.float32([
            left_eye_center,
            right_eye_center,
            nose_tip,
            left_mouth,
            right_mouth
        ])
        
        dst_points = np.float32([
            [38.2946, 51.6963],  # Oeil gauche
            [73.5318, 51.5014],  # Oeil droit
            [56.0252, 71.7366],  # Nez
            [39.5172, 92.3655],  # Bouche gauche
            [72.0205, 92.2041]  # Bouche droite
        ])
        
        # Calculer la matrice de transformation
        M = cv2.getAffineTransform(src_points[:3], dst_points[:3])
        
        # Appliquer la transformation
        aligned = cv2.warpAffine(image, M, target_size, flags=cv2.INTER_LINEAR)
        
        return aligned
    except Exception as exc:
        logger.warning("Erreur lors de l'alignement du visage: %s", exc)
        return None


def enrollement_pipeline(image: UploadedImage) -> Dict[str, Any]:
    """Pipeline complet d'enrôlement biométrique SGIC.
    
    Args:
        image: Source de l'image (chemin, bytes, UploadedFile, ndarray, etc.).
    
    Returns:
        Dict JSON complet contenant:
            - success (bool): True si le pipeline a réussi
            - bbox (List[int]): Boîte englobante [x1, y1, x2, y2]
            - face_crop (str): Image recadrée encodée en base64 (optionnel)
            - landmarks106 (List[List[float]]): 106 points de repère [x, y]
            - embedding512 (List[float]): Vecteur d'embedding de 512 dimensions
            - facemesh468 (List[List[float]]): 468 points 3D [x, y, z] (optionnel)
            - morphable3d (Dict): Paramètres du modèle 3D (optionnel)
            - error (str): Message d'erreur si success=False
            - warnings (List[str]): Avertissements non bloquants
    """
    warnings = []
    result = {
        "success": False,
        "bbox": None,
        "face_crop": None,
        "landmarks106": [],
        "embedding512": [],
        "facemesh468": [],
        "morphable3d": {},
        "error": None,
        "warnings": []
    }
    
    try:
        # 1. Détection de visage avec SCRFD
        logger.info("Étape 1: Détection SCRFD...")
        detection_result = detect_face(image)
        
        if not detection_result.get("success", False):
            result["error"] = detection_result.get("error", "Aucun visage détecté")
            return result
        
        bbox = detection_result.get("bbox")
        face_crop = detection_result.get("face_crop")
        confidence = detection_result.get("confidence", 0.0)
        
        result["bbox"] = bbox
        
        # Vérifier la qualité
        if confidence < 0.5:
            warnings.append(f"Confiance de détection faible: {confidence:.2f}")
        
        if face_crop is None or face_crop.size == 0:
            result["error"] = "Impossible d'extraire le face crop"
            return result
        
        # Encoder le face crop en base64 pour le retour
        try:
            import base64
            from io import BytesIO
            face_crop_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(face_crop_rgb)
            buffer = BytesIO()
            pil_image.save(buffer, format='JPEG')
            face_crop_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            result["face_crop"] = f"data:image/jpeg;base64,{face_crop_base64}"
        except Exception as exc:
            logger.warning("Impossible d'encoder le face crop en base64: %s", exc)
            warnings.append("Face crop non encodé")
        
        # 2. Détection des 106 landmarks
        logger.info("Étape 2: Détection 106 landmarks...")
        landmarks_result = detect_106_landmarks(image)
        
        if not landmarks_result.get("success", False):
            result["error"] = landmarks_result.get("error", "Impossible de détecter les landmarks")
            return result
        
        landmarks106 = landmarks_result.get("landmarks", [])
        result["landmarks106"] = landmarks106
        
        if len(landmarks106) != 106:
            warnings.append(f"Nombre de landmarks inattendu: {len(landmarks106)} au lieu de 106")
        
        aligned_face = None
        if landmarks106 and len(landmarks106) >= 5:
            try:
                # Charger l'image complète pour l'alignement
                if isinstance(image, np.ndarray):
                    full_image = image
                else:
                    from .detectors.scrfd_detector import _load_image
                    full_image = _load_image(image)
                
                if full_image is not None:
                    aligned_face = _align_face(full_image, landmarks106)
            except Exception as exc:
                logger.warning("Erreur lors de l'alignement: %s", exc)
                warnings.append("Alignement du visage échoué")
        
        logger.info("Étape 3: Génération embedding ArcFace...")
        embedding_result = generate_embedding(image)
        
        if not embedding_result.get("success", False):
            result["error"] = embedding_result.get("error", "Impossible de générer l'embedding")
            return result
        
        embedding512 = embedding_result.get("embedding", [])
        result["embedding512"] = embedding512
        
        if len(embedding512) != 512:
            warnings.append(f"Dimension d'embedding inattendue: {len(embedding512)} au lieu de 512")
        
        logger.info("Étape 4: Extraction FaceMesh 468 (optionnel)...")
        try:
            if isinstance(image, np.ndarray):
                facemesh_image = image
            else:
                from .detectors.scrfd_detector import _load_image
                facemesh_image = _load_image(image)
            
            if facemesh_image is not None:
                facemesh_result = detect_facemesh468(facemesh_image)
                if facemesh_result.get("success", False):
                    result["facemesh468"] = facemesh_result.get("landmarks", [])
                else:
                    warnings.append(f"FaceMesh non disponible: {facemesh_result.get('error', 'N/A')}")
        except Exception as exc:
            logger.warning("Erreur lors de l'extraction FaceMesh: %s", exc)
            warnings.append("Extraction FaceMesh échouée")
        
        logger.info("Étape 5: Extraction 3DMM (optionnel)...")
        try:
            if isinstance(image, np.ndarray):
                morphable_image = image
            else:
                from .detectors.scrfd_detector import _load_image
                morphable_image = _load_image(image)
            
            if morphable_image is not None:
                morphable_result = extract_3dmm(morphable_image, landmarks106)
                result["morphable3d"] = {
                    "vertices": morphable_result.get("vertices", []),
                    "shape_params": morphable_result.get("shape_params", []),
                    "expression_params": morphable_result.get("expression_params", []),
                    "texture_params": morphable_result.get("texture_params", [])
                }
                if not morphable_result.get("success", False):
                    warnings.append(f"3DMM non disponible: {morphable_result.get('error', 'N/A')}")
        except Exception as exc:
            logger.warning("Erreur lors de l'extraction 3DMM: %s", exc)
            warnings.append("Extraction 3DMM échouée")
        
        result["success"] = True
        result["warnings"] = warnings
        
        logger.info("Pipeline d'enrôlement terminé avec succès")
        return result
        
    except Exception as exc:
        logger.error("Erreur dans le pipeline d'enrôlement: %s", exc, exc_info=True)
        result["error"] = f"Erreur dans le pipeline: {str(exc)}"
        return result


def save_enrollement_to_biometrie_photo(
    photo: BiometriePhoto,
    pipeline_result: Dict[str, Any],
    save_all: bool = True
) -> BiometriePhoto:
    """Sauvegarde les résultats du pipeline dans une BiometriePhoto.
    
    Args:
        photo: Instance de BiometriePhoto à mettre à jour
        pipeline_result: Résultat du pipeline enrollement_pipeline()
        save_all: Si True, sauvegarde tous les champs (embedding, landmarks, facemesh, 3dmm)
                  Si False, sauvegarde uniquement l'embedding 512-d
    
    Returns:
        BiometriePhoto mise à jour
    """
    if not pipeline_result.get("success", False):
        raise ValueError(f"Le pipeline n'a pas réussi: {pipeline_result.get('error', 'Erreur inconnue')}")
    
    with transaction.atomic():
        embedding512 = pipeline_result.get("embedding512", [])
        if embedding512 and len(embedding512) == 512:
            photo.embedding_512 = embedding512
            # Garder aussi l'ancien format pour compatibilité
            photo.encodage_facial = json.dumps(embedding512)
        
        if save_all:
            # Sauvegarder les landmarks 106
            landmarks106 = pipeline_result.get("landmarks106", [])
            if landmarks106:
                photo.landmarks_106 = landmarks106
            
            facemesh468 = pipeline_result.get("facemesh468", [])
            if facemesh468 and len(facemesh468) > 0:
                photo.facemesh_468 = facemesh468
            
            morphable3d = pipeline_result.get("morphable3d", {})
            if morphable3d and any(morphable3d.values()):
                photo.morphable_3d = morphable3d
        
        photo.save()
        logger.info(f"Résultats du pipeline sauvegardés dans BiometriePhoto #{photo.pk}")
    
    return photo


def save_enrollement_to_biometrie(
    criminel,
    image: UploadedImage,
    utilisateur=None,
    request=None,
    save_all: bool = True
) -> Optional[Tuple[Biometrie, Dict[str, Any]]]:
    """Encode et sauvegarde un visage dans la table Biometrie avec le pipeline complet.
    
    Args:
        criminel: Instance de CriminalFicheCriminelle
        image: Source de l'image (chemin, bytes, UploadedFile, ndarray, etc.)
        utilisateur: Utilisateur effectuant l'opération (optionnel)
        request: Requête HTTP pour l'audit (optionnel)
        save_all: Si True, sauvegarde tous les résultats du pipeline
    
    Returns:
        Tuple (Biometrie, pipeline_result) ou None si échec
    """
    # Exécuter le pipeline
    pipeline_result = enrollement_pipeline(image)
    
    if not pipeline_result.get("success", False):
        logger.warning(f"Pipeline échoué pour criminel #{criminel.pk}: {pipeline_result.get('error')}")
        return None
    
    embedding512 = pipeline_result.get("embedding512", [])
    if not embedding512 or len(embedding512) != 512:
        logger.warning(f"Embedding invalide pour criminel #{criminel.pk}")
        return None
    
    with transaction.atomic():
        # Créer l'entrée Biometrie
        biometrie = Biometrie.objects.create(
            criminel=criminel,
            photo=image,
            encodage_facial=embedding512
        )
        
        logger.info(f"Encodage facial sauvegardé dans Biometrie #{biometrie.pk} pour criminel #{criminel.pk}")
        
        # Enregistrer dans l'historique
        from .arcface_service import BiometrieAuditService
        BiometrieAuditService.enregistrer_action(
            type_objet="encodage",
            objet_id=biometrie.pk,
            action="encodage",
            criminel=criminel,
            utilisateur=utilisateur,
            description="Encodage facial via pipeline complet d'enrôlement",
            donnees_apres={
                "biometrie_id": biometrie.pk,
                "embedding_512": True,
                "landmarks_106": bool(pipeline_result.get("landmarks106")),
                "facemesh_468": bool(pipeline_result.get("facemesh468")),
                "morphable_3d": bool(pipeline_result.get("morphable3d"))
            },
            request=request,
        )
    
    return biometrie, pipeline_result
