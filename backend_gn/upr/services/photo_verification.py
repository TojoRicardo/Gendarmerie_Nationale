"""
Service de vérification de doublons pour les photos UPR.
Compare automatiquement les nouvelles photos avec les existantes via ArcFace.
- check_existing_upr_photo: Vérifie uniquement les autres UPR (utilisé lors de la création)
- search_by_photo: Recherche dans les UPR ET les photos criminelles (utilisé pour la recherche)
"""

import logging
import numpy as np
from typing import Optional, Dict, Any
from django.core.files.uploadedfile import UploadedFile

from upr.models import UnidentifiedPerson
from biometrie.arcface_service import get_shared_arcface_service, ArcFaceService

logger = logging.getLogger(__name__)

# Seuil de similarité pour considérer qu'une photo existe déjà
SIMILARITY_THRESHOLD = 0.35  # 35% de similarité minimum

# Seuil équivalent en distance L2 pour cohérence avec le système de correspondances
# On utilise un seuil plus permissif pour la détection de doublons
L2_DISTANCE_THRESHOLD = 1.30  # Distance L2 maximale pour considérer un doublon


def check_existing_upr_photo(
    uploaded_image: UploadedFile,
    exclude_upr_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Vérifie si une photo UPR correspond à un UPR déjà enregistré.
    Utilisé lors de la création d'un UPR pour éviter les doublons.
    
    Args:
        uploaded_image: Fichier image uploadé
        exclude_upr_id: ID de l'UPR à exclure de la recherche (utile lors de la mise à jour)
    
    Returns:
        Dict avec les informations de l'UPR existant si trouvé, None sinon.
        Format:
        {
            'existing_upr': True,
            'upr_id': int,
            'code_upr': str,
            'nom_temporaire': str,
            'similarity_score': float,
            'profil_face_url': str
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
        
        # Récupérer tous les UPR avec embeddings
        upr_query = UnidentifiedPerson.objects.filter(
            face_embedding__isnull=False
        )
        
        # Exclure l'UPR spécifié si fourni
        if exclude_upr_id:
            upr_query = upr_query.exclude(id=exclude_upr_id)
        
        best_match = None
        best_score = 0.0
        
        # Comparer avec tous les UPR existants
        for upr in upr_query:
            try:
                # Récupérer l'embedding stocké
                stored_embedding_data = upr.face_embedding
                
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
                
                # Calculer aussi la distance L2 pour cohérence
                distance_l2 = float(np.linalg.norm(query_embedding - stored_embedding))
                
                # Mettre à jour la meilleure correspondance
                if similarity_score > best_score:
                    best_score = similarity_score
                    best_match = {
                        'upr': upr,
                        'similarity_score': similarity_score,
                        'distance_l2': distance_l2
                    }
                    
            except Exception as e:
                logger.warning(f"Erreur lors de la comparaison avec UPR #{upr.id}: {e}")
                continue
        
        # Vérifier si le meilleur score dépasse le seuil
        # Utiliser soit la similarité cosinus, soit la distance L2
        is_match = False
        if best_match:
            if best_score >= SIMILARITY_THRESHOLD:
                is_match = True
            # Vérifier aussi la distance L2 pour cohérence
            elif best_match.get('distance_l2', float('inf')) <= L2_DISTANCE_THRESHOLD:
                is_match = True
        
        if is_match and best_match:
            upr = best_match['upr']
            
            logger.info(
                f"Photo UPR dupliquée détectée: correspondance avec UPR #{upr.id} "
                f"({upr.code_upr}) - Score: {best_score:.4f}"
            )
            
            # Construire l'URL de la photo
            profil_face_url = None
            if upr.profil_face and upr.profil_face.name and upr.profil_face.name != '1':
                try:
                    # Utiliser l'URL relative pour que le frontend puisse utiliser le proxy Vite
                    if upr.profil_face.name.startswith('upr/photos/'):
                        profil_face_url = f"/media/{upr.profil_face.name}"
                    else:
                        profil_face_url = f"/media/upr/photos/{upr.profil_face.name.split('/')[-1]}"
                except Exception as e:
                    logger.warning(f"Erreur lors de la construction de l'URL pour UPR #{upr.id}: {e}")
                    profil_face_url = None
            
            return {
                'existing_upr': True,
                'upr_id': upr.id,
                'code_upr': upr.code_upr or '',
                'nom_temporaire': upr.nom_temporaire or '',
                'similarity_score': float(best_score),
                'profil_face_url': profil_face_url,
                'context_location': upr.context_location or '',
                'discovered_date': upr.discovered_date.isoformat() if upr.discovered_date else None
            }
        
        logger.debug(f"Aucune correspondance UPR trouvée (meilleur score: {best_score:.4f})")
        return None
        
    except Exception as e:
        logger.error(f"Erreur lors de la vérification de doublons UPR: {e}", exc_info=True)
        return None


def search_by_photo(
    uploaded_image: UploadedFile,
    threshold: float = SIMILARITY_THRESHOLD,
    top_k: int = 10
) -> Dict[str, Any]:
    """
    Recherche par photo dans les UPR ET les photos criminelles.
    Utilisé pour la fonctionnalité de recherche par photo.
    
    Args:
        uploaded_image: Fichier image uploadé
        threshold: Seuil de similarité minimum (défaut: 0.35)
        top_k: Nombre maximum de résultats à retourner
    
    Returns:
        Dict contenant:
        {
            'upr_matches': [Liste des UPR correspondants],
            'criminal_matches': [Liste des criminels correspondants],
            'total_matches': int
        }
    """
    try:
        # Obtenir le service ArcFace
        try:
            arcface_service = get_shared_arcface_service()
        except Exception as e:
            logger.error(f"Service ArcFace non disponible pour la recherche: {e}")
            return {
                'upr_matches': [],
                'criminal_matches': [],
                'total_matches': 0,
                'error': 'Service ArcFace non disponible'
            }
        
        # Générer l'embedding et extraire les landmarks de la nouvelle image
        try:
            # Utiliser extract_face_data pour obtenir landmarks, embedding et confidence
            from .face_processing import extract_face_data
            
            face_data = extract_face_data(uploaded_image)
            
            if not face_data.get("success", False):
                error_msg = face_data.get("error", "Aucun visage détecté")
                logger.warning(f"Échec extraction: {error_msg}")
                return {
                    'upr_matches': [],
                    'criminal_matches': [],
                    'total_matches': 0,
                    'error': error_msg,
                    'landmarks': None,
                    'confidence': None
                }
            
            query_embedding = np.array(face_data.get("embedding"), dtype=np.float32)
            landmarks = face_data.get("landmarks")
            confidence = face_data.get("confidence")
            
            # Si extract_face_data n'a pas fonctionné, essayer avec encode_faces
            if query_embedding is None or len(query_embedding) == 0:
                faces = arcface_service.encode_faces(image=uploaded_image, limit=1)
                if not faces or len(faces) == 0:
                    logger.warning("Aucun visage détecté dans l'image uploadée")
                    return {
                        'upr_matches': [],
                        'criminal_matches': [],
                        'total_matches': 0,
                        'error': 'Aucun visage détecté',
                        'landmarks': None,
                        'confidence': None
                    }
                query_embedding = faces[0].embedding
                # Si landmarks non extraits, essayer de les obtenir
                if not landmarks:
                    try:
                        from biometrie.face_106 import detect_106_landmarks
                        landmarks_result = detect_106_landmarks(uploaded_image)
                        if landmarks_result.get("success"):
                            landmarks = landmarks_result.get("landmarks")
                            confidence = landmarks_result.get("confidence")
                    except:
                        pass
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'embedding: {e}", exc_info=True)
            return {
                'upr_matches': [],
                'criminal_matches': [],
                'total_matches': 0,
                'error': str(e),
                'landmarks': None,
                'confidence': None
            }
        
        upr_matches = []
        criminal_matches = []
        
        # Note: landmarks et confidence sont déjà définis dans le try ci-dessus
        # Si le try a réussi, ils contiennent les valeurs extraites
        # Si le try a échoué, la fonction a déjà retourné une erreur
        
        # 1. Rechercher dans les UPR
        upr_query = UnidentifiedPerson.objects.filter(
            face_embedding__isnull=False
        ).exclude(face_embedding=None)
        
        for upr in upr_query:
            try:
                stored_embedding_data = upr.face_embedding
                if not stored_embedding_data:
                    continue
                
                if isinstance(stored_embedding_data, list):
                    stored_embedding = np.array(stored_embedding_data, dtype=np.float32)
                else:
                    continue
                
                similarity_score = ArcFaceService.compare_embeddings(
                    query_embedding,
                    stored_embedding
                )
                
                if similarity_score >= threshold:
                    profil_face_url = None
                    if upr.profil_face and upr.profil_face.name and upr.profil_face.name != '1':
                        try:
                            if upr.profil_face.name.startswith('upr/photos/'):
                                profil_face_url = f"/media/{upr.profil_face.name}"
                            else:
                                profil_face_url = f"/media/upr/photos/{upr.profil_face.name.split('/')[-1]}"
                        except:
                            pass
                    
                    upr_matches.append({
                        'type': 'UPR',
                        'id': upr.id,
                        'code_upr': upr.code_upr or '',
                        'nom_temporaire': upr.nom_temporaire or '',
                        'similarity_score': float(similarity_score),
                        'profil_face_url': profil_face_url
                    })
                    
            except Exception as e:
                logger.warning(f"Erreur lors de la comparaison avec UPR #{upr.id}: {e}")
                continue
        
        # 2. Rechercher dans les photos criminelles
        try:
            from biometrie.models import BiometriePhoto
            
            criminal_photos = BiometriePhoto.objects.filter(
                est_active=True,
                embedding_512__isnull=False
            ).select_related('criminel').exclude(embedding_512=None)
            
            for photo in criminal_photos:
                try:
                    stored_embedding_data = photo.embedding_512
                    if not stored_embedding_data:
                        continue
                    
                    if isinstance(stored_embedding_data, list):
                        stored_embedding = np.array(stored_embedding_data, dtype=np.float32)
                    else:
                        continue
                    
                    similarity_score = ArcFaceService.compare_embeddings(
                        query_embedding,
                        stored_embedding
                    )
                    
                    if similarity_score >= threshold:
                        photo_url = None
                        if photo.image and photo.image.name:
                            try:
                                if photo.image.name.startswith('biometrie/'):
                                    photo_url = f"/media/{photo.image.name}"
                                else:
                                    photo_url = f"/media/biometrie/photos/{photo.image.name.split('/')[-1]}"
                            except:
                                pass
                        
                        nom_complet = f"{photo.criminel.nom or ''} {photo.criminel.prenom or ''}".strip()
                        if not nom_complet:
                            nom_complet = f"Fiche #{photo.criminel.numero_fiche}"
                        
                        criminal_matches.append({
                            'type': 'CRIMINEL',
                            'id': photo.criminel.id,
                            'numero_fiche': photo.criminel.numero_fiche or '',
                            'nom_complet': nom_complet,
                            'similarity_score': float(similarity_score),
                            'photo_url': photo_url,
                            'photo_id': photo.id
                        })
                        
                except Exception as e:
                    logger.warning(f"Erreur lors de la comparaison avec photo criminelle #{photo.id}: {e}")
                    continue
                    
        except ImportError:
            logger.warning("BiometriePhoto n'est pas disponible, recherche dans les criminels ignorée")
        except Exception as e:
            logger.warning(f"Erreur lors de la recherche dans les photos criminelles: {e}")
        
        # Trier par score de similarité décroissant
        upr_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
        criminal_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        # Limiter aux top_k meilleurs résultats
        upr_matches = upr_matches[:top_k]
        criminal_matches = criminal_matches[:top_k]
        
        return {
            'upr_matches': upr_matches,
            'criminal_matches': criminal_matches,
            'total_matches': len(upr_matches) + len(criminal_matches),
            'landmarks': landmarks,
            'confidence': confidence
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche par photo: {e}", exc_info=True)
        return {
            'upr_matches': [],
            'criminal_matches': [],
            'total_matches': 0,
            'error': str(e),
            'landmarks': None,
            'confidence': None
        }

