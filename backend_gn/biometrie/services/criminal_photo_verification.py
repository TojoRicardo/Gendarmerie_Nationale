"""
Service de vérification de doublons pour les photos criminelles.
Compare automatiquement les nouvelles photos avec les existantes via ArcFace.
"""

import logging
import numpy as np
from typing import Optional, Dict, Any, List
from django.core.files.uploadedfile import UploadedFile
from django.core.files.base import File

from biometrie.models import BiometriePhoto
from biometrie.arcface_service import get_shared_arcface_service, ArcFaceService
from criminel.models import CriminalFicheCriminelle

logger = logging.getLogger(__name__)

# Seuil de similarité pour considérer qu'une photo existe déjà
SIMILARITY_THRESHOLD = 0.35


def check_existing_criminal_photo(
    uploaded_image: UploadedFile,
    exclude_criminel_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Vérifie si une photo criminelle correspond à un criminel déjà enregistré.
    
    Args:
        uploaded_image: Fichier image uploadé
        exclude_criminel_id: ID du criminel à exclure de la recherche (utile lors de la mise à jour)
    
    Returns:
        Dict avec les informations du criminel existant si trouvé, None sinon.
        Format:
        {
            'existing_criminal': True,
            'criminel_id': int,
            'nom_complet': str,
            'numero_fiche': str,
            'similarity_score': float,
            'photo_id': int
        }
    """
    try:
        # Obtenir le service ArcFace
        try:
            arcface_service = get_shared_arcface_service()
        except Exception as e:
            logger.error(f"Service ArcFace non disponible pour la vérification de doublons: {e}")
            return None
        
        # Générer l'embedding de la nouvelle image
        try:
            # Utiliser encode_faces pour obtenir l'embedding
            faces = arcface_service.encode_faces(image=uploaded_image, limit=1)
            
            if not faces or len(faces) == 0:
                logger.warning("Aucun visage détecté dans l'image uploadée")
                return None
            
            query_embedding = faces[0].embedding
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'embedding: {e}", exc_info=True)
            return None
        
        # Récupérer toutes les photos biométriques actives avec embeddings
        photos_query = BiometriePhoto.objects.filter(
            est_active=True,
            embedding_512__isnull=False
        ).select_related('criminel')
        
        # Exclure le criminel spécifié si fourni
        if exclude_criminel_id:
            photos_query = photos_query.exclude(criminel_id=exclude_criminel_id)
        
        best_match = None
        best_score = 0.0
        
        # Comparer avec toutes les photos existantes
        for photo in photos_query:
            try:
                # Récupérer l'embedding stocké
                stored_embedding_data = photo.embedding_512
                
                if not stored_embedding_data:
                    continue
                
                # Convertir en numpy array
                if isinstance(stored_embedding_data, list):
                    stored_embedding = np.array(stored_embedding_data, dtype=np.float32)
                else:
                    continue
                
                # Comparer les embeddings
                similarity_score = ArcFaceService.compare_embeddings(
                    query_embedding,
                    stored_embedding
                )
                
                # Mettre à jour la meilleure correspondance
                if similarity_score > best_score:
                    best_score = similarity_score
                    best_match = {
                        'photo': photo,
                        'criminel': photo.criminel,
                        'similarity_score': similarity_score
                    }
                    
            except Exception as e:
                logger.warning(f"Erreur lors de la comparaison avec photo #{photo.id}: {e}")
                continue
        
        # Vérifier si le meilleur score dépasse le seuil
        if best_match and best_score >= SIMILARITY_THRESHOLD:
            criminel = best_match['criminel']
            
            # Construire le nom complet
            nom_complet = f"{criminel.nom or ''} {criminel.prenom or ''}".strip()
            if not nom_complet:
                nom_complet = f"Criminel #{criminel.id}"
            
            logger.info(
                f"Photo dupliquée détectée: correspondance avec criminel #{criminel.id} "
                f"({nom_complet}) - Score: {best_score:.4f}"
            )
            
            return {
                'existing_criminal': True,
                'criminel_id': criminel.id,
                'nom_complet': nom_complet,
                'numero_fiche': criminel.numero_fiche or '',
                'similarity_score': float(best_score),
                'photo_id': best_match['photo'].id
            }
        
        logger.debug(f"Aucune correspondance trouvée (meilleur score: {best_score:.4f})")
        return None
        
    except Exception as e:
        logger.error(f"Erreur lors de la vérification de doublons: {e}", exc_info=True)
        return None


def check_existing_criminal_photo_from_path(
    image_path: str,
    exclude_criminel_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Vérifie si une photo criminelle (via chemin de fichier) correspond à un criminel déjà enregistré.
    
    Args:
        image_path: Chemin vers le fichier image
        exclude_criminel_id: ID du criminel à exclure de la recherche
    
    Returns:
        Dict avec les informations du criminel existant si trouvé, None sinon.
    """
    try:
        # Ouvrir le fichier
        with open(image_path, 'rb') as f:
            from django.core.files import File
            file_obj = File(f, name=image_path.split('/')[-1])
            return check_existing_criminal_photo(file_obj, exclude_criminel_id)
    except Exception as e:
        logger.error(f"Erreur lors de l'ouverture du fichier {image_path}: {e}")
        return None

