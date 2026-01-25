"""
Services pour la reconnaissance faciale avec ArcFace.
"""

import uuid
import numpy as np
import logging
from typing import Optional, List, Dict, Tuple
from django.core.files.uploadedfile import InMemoryUploadedFile

from intelligence_artificielle.utils.face_recognition_arcface import get_arcface_instance
from .models import Person, FaceEmbedding, FaceRecognitionLog

logger = logging.getLogger(__name__)


def extract_embedding_from_image(image_file) -> Tuple[Optional[np.ndarray], float]:
    """
    Extrait l'embedding facial d'une image uploadée.
    
    Args:
        image_file: Fichier image (UploadedFile, InMemoryUploadedFile, ou bytes)
    
    Returns:
        tuple: (embedding numpy array, confidence_score) ou (None, 0.0)
    """
    try:
        arcface = get_arcface_instance()
        if arcface is None:
            logger.error("ArcFace n'est pas disponible")
            return None, 0.0
        
        # Convertir le fichier en bytes si nécessaire
        if isinstance(image_file, InMemoryUploadedFile):
            image_bytes = image_file.read()
            image_file.seek(0)  # Remettre le curseur au début
        elif hasattr(image_file, 'read'):
            image_bytes = image_file.read()
        elif isinstance(image_file, bytes):
            image_bytes = image_file
        else:
            logger.error(f"Type de fichier non supporté: {type(image_file)}")
            return None, 0.0
        
        # Extraire l'embedding
        embedding = arcface.extract_embedding_from_bytes(image_bytes)
        
        if embedding is None:
            return None, 0.0
        
        # Calculer un score de confiance basique
        confidence_score = 0.95  # Score par défaut
        
        return embedding, confidence_score
        
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction de l'embedding: {str(e)}")
        return None, 0.0


def save_face_embedding(
    person: Person,
    embedding: np.ndarray,
    image_path: str,
    confidence_score: float = 0.0,
    image_width: Optional[int] = None,
    image_height: Optional[int] = None
) -> FaceEmbedding:
    """
    Sauvegarde un embedding facial pour une personne.
    
    Args:
        person: Instance Person
        embedding: Vecteur d'embedding (numpy array de 512 dimensions)
        image_path: Chemin vers l'image
        confidence_score: Score de confiance
        image_width: Largeur de l'image (optionnel)
        image_height: Hauteur de l'image (optionnel)
    
    Returns:
        FaceEmbedding: Instance créée
    """
    # Convertir numpy array en liste pour stockage JSON
    embedding_list = embedding.tolist()
    
    face_embedding = FaceEmbedding.objects.create(  # type: ignore[attr-defined]
        person=person,
        embedding=embedding_list,
        image_path=image_path,
        confidence_score=confidence_score,
        image_width=image_width,
        image_height=image_height
    )
    
    logger.info(f"Embedding facial sauvegardé pour {person.name} (ID: {face_embedding.id})")
    return face_embedding


def recognize_person(
    query_embedding: np.ndarray,
    threshold: float = 0.6,
    top_k: int = 1
) -> List[Dict]:
    """
    Reconnaît une personne à partir d'un embedding.
    
    Args:
        query_embedding: Embedding à rechercher
        threshold: Seuil de confiance minimum
        top_k: Nombre de résultats à retourner
    
    Returns:
        Liste de dictionnaires avec les correspondances trouvées
    """
    try:
        arcface = get_arcface_instance()
        if arcface is None:
            logger.error("ArcFace n'est pas disponible")
            return []
        
        # Récupérer tous les embeddings de la base de données
        all_embeddings = FaceEmbedding.objects.select_related('person').all()  # type: ignore[attr-defined]
        
        matches = []
        
        for face_embedding in all_embeddings:
            # Convertir l'embedding JSON en numpy array
            db_embedding = np.array(face_embedding.embedding)
            
            # Comparer les embeddings
            similarity_score = arcface.compare_embeddings(query_embedding, db_embedding)
            
            # Vérifier le seuil
            if similarity_score >= threshold:
                matches.append({
                    'person': face_embedding.person,
                    'face_embedding_id': str(face_embedding.id),
                    'confidence_score': float(similarity_score),
                    'embedding_id': str(face_embedding.id)
                })
        
        # Trier par score décroissant
        matches.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        # Retourner les top_k résultats
        return matches[:top_k]
        
    except Exception as e:
        logger.error(f"Erreur lors de la reconnaissance: {str(e)}")
        return []


def verify_person(
    query_embedding: np.ndarray,
    person_id: uuid.UUID,
    threshold: float = 0.6
) -> Tuple[bool, float]:
    """
    Vérifie si une image correspond à une personne spécifique.
    
    Args:
        query_embedding: Embedding à vérifier
        person_id: ID de la personne à vérifier
        threshold: Seuil de confiance minimum
    
    Returns:
        tuple: (verified: bool, confidence_score: float)
    """
    try:
        arcface = get_arcface_instance()
        if arcface is None:
            logger.error("ArcFace n'est pas disponible")
            return False, 0.0
        
        # Récupérer les embeddings de la personne
        person_embeddings = FaceEmbedding.objects.filter(person_id=person_id)  # type: ignore[attr-defined]
        
        if not person_embeddings.exists():
            logger.warning(f"Aucun embedding trouvé pour la personne {person_id}")
            return False, 0.0
        
        best_score = 0.0
        
        # Comparer avec tous les embeddings de la personne
        for face_embedding in person_embeddings:
            db_embedding = np.array(face_embedding.embedding)
            similarity_score = arcface.compare_embeddings(query_embedding, db_embedding)
            
            if similarity_score > best_score:
                best_score = similarity_score
        
        # Vérifier si le meilleur score dépasse le seuil
        verified = best_score >= threshold
        
        return verified, float(best_score)
        
    except Exception as e:
        logger.error(f"Erreur lors de la vérification: {str(e)}")
        return False, 0.0


def save_recognition_log(
    embedding: np.ndarray,
    image_path: str,
    detected_person: Optional[Person] = None,
    confidence_score: float = 0.0,
    threshold_used: float = 0.6,
    processing_time_ms: Optional[float] = None,
    created_by=None
) -> FaceRecognitionLog:
    """
    Sauvegarde un log de reconnaissance.
    
    Args:
        embedding: Vecteur d'embedding extrait
        image_path: Chemin vers l'image
        detected_person: Personne détectée (None si inconnue)
        confidence_score: Score de confiance
        threshold_used: Seuil utilisé
        processing_time_ms: Temps de traitement en ms
        created_by: Utilisateur ayant effectué la reconnaissance
    
    Returns:
        FaceRecognitionLog: Instance créée
    """
    status = 'recognized' if detected_person else 'unknown'
    
    log = FaceRecognitionLog.objects.create(  # type: ignore[attr-defined]
        detected_person=detected_person,
        embedding_vector=embedding.tolist(),
        confidence_score=confidence_score,
        image_path=image_path,
        status=status,
        threshold_used=threshold_used,
        processing_time_ms=processing_time_ms,
        created_by=created_by
    )
    
    logger.info(f"Log de reconnaissance sauvegardé: {status} - Score: {confidence_score:.2f}")
    return log

