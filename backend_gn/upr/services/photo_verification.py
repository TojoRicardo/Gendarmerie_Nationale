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
        
        # Récupérer tous les UPR avec embeddings (exclure les archivés)
        upr_query = UnidentifiedPerson.objects.filter(
            face_embedding__isnull=False,
            is_archived=False
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
        query_embedding = None
        landmarks = None
        confidence = None
        
        try:
            # Méthode 1: Utiliser extract_face_data pour obtenir landmarks, embedding et confidence
            from .face_processing import extract_face_data
            
            face_data = extract_face_data(uploaded_image)
            
            if face_data.get("success", False):
                query_embedding = np.array(face_data.get("embedding"), dtype=np.float32)
                landmarks = face_data.get("landmarks")
                confidence = face_data.get("confidence")
                logger.info("Extraction réussie via extract_face_data")
            else:
                error_msg = face_data.get("error", "Aucun visage détecté")
                logger.warning(f"Échec extraction via extract_face_data: {error_msg}")
                # Continuer avec les méthodes de fallback ci-dessous
            
            # Méthode 2: Si extract_face_data n'a pas fonctionné, essayer avec encode_faces
            if query_embedding is None or len(query_embedding) == 0:
                logger.info("Tentative d'extraction via encode_faces...")
                faces = arcface_service.encode_faces(image=uploaded_image, limit=1)
                if faces and len(faces) > 0:
                    query_embedding = faces[0].embedding
                    logger.info("Extraction réussie via encode_faces")
                    # Si landmarks non extraits, essayer de les obtenir
                    if not landmarks:
                        try:
                            from biometrie.face_106 import detect_106_landmarks
                            landmarks_result = detect_106_landmarks(uploaded_image)
                            if landmarks_result.get("success"):
                                landmarks = landmarks_result.get("landmarks")
                                confidence = landmarks_result.get("confidence")
                                logger.info("Landmarks extraits avec succès via fallback")
                        except Exception as e:
                            logger.warning(f"Échec extraction landmarks via fallback: {e}")
                else:
                    logger.warning("Aucun visage détecté via encode_faces")
            
            # Si toujours aucun embedding, retourner une erreur
            if query_embedding is None or len(query_embedding) == 0:
                logger.warning("Aucun visage détecté dans l'image uploadée après toutes les tentatives")
                return {
                    'upr_matches': [],
                    'criminal_matches': [],
                    'total_matches': 0,
                    'error': 'Aucun visage détecté dans l\'image. Veuillez utiliser une image avec un visage clairement visible.',
                    'landmarks': None,
                    'confidence': None
                }
            
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
        
        # Normaliser l'embedding de requête une seule fois
        query_embedding_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-12)
        
        # 1. Rechercher dans les UPR avec comparaison vectorielle batch (exclure les archivés)
        logger.info("Début recherche dans les UPR...")
        upr_query = UnidentifiedPerson.objects.filter(
            face_embedding__isnull=False,
            is_archived=False
        ).exclude(face_embedding=None).only(
            'id', 'code_upr', 'nom_temporaire', 'face_embedding', 'profil_face'
        )
        
        # Charger tous les embeddings en une seule fois
        upr_data = []
        for upr in upr_query:
            try:
                stored_embedding_data = upr.face_embedding
                if not stored_embedding_data or not isinstance(stored_embedding_data, list):
                    continue
                
                stored_embedding = np.array(stored_embedding_data, dtype=np.float32)
                if len(stored_embedding) != len(query_embedding):
                    continue
                
                upr_data.append({
                    'upr': upr,
                    'embedding': stored_embedding
                })
            except Exception as e:
                logger.warning(f"Erreur lors du chargement de l'embedding UPR #{upr.id}: {e}")
                continue
        
        # Comparaison vectorielle batch pour tous les UPR
        if upr_data:
            logger.info(f"Comparaison batch de {len(upr_data)} UPR...")
            embeddings_array = np.array([item['embedding'] for item in upr_data], dtype=np.float32)
            
            # Normaliser tous les embeddings en une seule opération
            norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True) + 1e-12
            embeddings_norm = embeddings_array / norms
            
            # Calculer toutes les similarités en une seule opération vectorielle
            similarities = np.dot(embeddings_norm, query_embedding_norm)
            
            # Filtrer et créer les résultats
            for i, item in enumerate(upr_data):
                similarity_score = float(similarities[i])
                
                if similarity_score >= threshold:
                    upr = item['upr']
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
                        'similarity_score': similarity_score,
                        'profil_face_url': profil_face_url
                    })
        
        logger.info(f"Recherche UPR terminée: {len(upr_matches)} correspondances trouvées")
        
        # 2. Rechercher dans les photos criminelles avec comparaison vectorielle batch
        # Utiliser plusieurs sources d'embeddings pour maximiser les résultats
        
        # 2a. Rechercher dans BiometriePhoto (photos biométriques avec embedding_512)
        try:
            from biometrie.models import BiometriePhoto
            
            criminal_photos = BiometriePhoto.objects.filter(
                est_active=True,
                embedding_512__isnull=False
            ).select_related('criminel').exclude(embedding_512=None).only(
                'id', 'embedding_512', 'image', 'criminel__id', 'criminel__nom', 
                'criminel__prenom', 'criminel__numero_fiche', 'criminel__surnom',
                'criminel__date_naissance', 'criminel__lieu_naissance'
            )
            
            logger.info(f"Recherche dans {criminal_photos.count()} photos biométriques actives avec embedding")
            
            # Charger tous les embeddings en une seule fois
            photo_data = []
            for photo in criminal_photos:
                try:
                    stored_embedding_data = photo.embedding_512
                    if not stored_embedding_data or not isinstance(stored_embedding_data, list):
                        continue
                    
                    stored_embedding = np.array(stored_embedding_data, dtype=np.float32)
                    if len(stored_embedding) != len(query_embedding):
                        continue
                    
                    photo_data.append({
                        'photo': photo,
                        'embedding': stored_embedding
                    })
                except Exception as e:
                    logger.warning(f"Erreur lors du chargement de l'embedding photo #{photo.id}: {e}")
                    continue
            
            # Comparaison vectorielle batch pour toutes les photos
            if photo_data:
                logger.info(f"Comparaison batch de {len(photo_data)} photos criminelles...")
                embeddings_array = np.array([item['embedding'] for item in photo_data], dtype=np.float32)
                
                # Normaliser tous les embeddings en une seule opération
                norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True) + 1e-12
                embeddings_norm = embeddings_array / norms
                
                # Calculer toutes les similarités en une seule opération vectorielle
                similarities = np.dot(embeddings_norm, query_embedding_norm)
                
                # Dictionnaire pour garder la meilleure correspondance par fiche criminelle
                best_matches_by_criminel = {}
                
                # Filtrer et créer les résultats
                for i, item in enumerate(photo_data):
                    similarity_score = float(similarities[i])
                    
                    if similarity_score >= threshold:
                        photo = item['photo']
                        criminel_id = photo.criminel.id
                        
                        # Garder seulement la meilleure correspondance par fiche
                        if criminel_id not in best_matches_by_criminel or \
                           similarity_score > best_matches_by_criminel[criminel_id]['similarity_score']:
                            
                            photo_url = None
                            if photo.image and photo.image.name:
                                try:
                                    if photo.image.name.startswith('biometrie/'):
                                        photo_url = f"/media/{photo.image.name}"
                                    else:
                                        photo_url = f"/media/biometrie/photos/{photo.image.name.split('/')[-1]}"
                                except:
                                    pass
                            
                            # Construire le nom complet pour compatibilité
                            nom_complet = f"{photo.criminel.nom or ''} {photo.criminel.prenom or ''}".strip()
                            if not nom_complet:
                                nom_complet = f"Fiche #{photo.criminel.numero_fiche}"
                            
                            best_matches_by_criminel[criminel_id] = {
                                'type': 'CRIMINEL',
                                'id': photo.criminel.id,
                                'numero_fiche': photo.criminel.numero_fiche or '',
                                'nom': photo.criminel.nom or '',
                                'prenom': photo.criminel.prenom or '',
                                'nom_complet': nom_complet,
                                'surnom': photo.criminel.surnom or '',
                                'date_naissance': photo.criminel.date_naissance.isoformat() if photo.criminel.date_naissance else None,
                                'lieu_naissance': photo.criminel.lieu_naissance or '',
                                'similarity_score': similarity_score,
                                'photo_url': photo_url,
                                'photo_profil': photo_url,
                                'photo': photo_url,
                                'photo_id': photo.id
                            }
                
                # Ajouter toutes les meilleures correspondances
                criminal_matches.extend(best_matches_by_criminel.values())
                logger.info(f"Recherche BiometriePhoto terminée: {len(best_matches_by_criminel)} fiches trouvées")
                    
        except ImportError:
            logger.warning("BiometriePhoto n'est pas disponible, recherche dans les criminels ignorée")
        except Exception as e:
            logger.warning(f"Erreur lors de la recherche dans les photos criminelles: {e}")
        
        # 2b. Rechercher aussi dans IAFaceEmbedding (embeddings IA) avec comparaison batch
        try:
            from intelligence_artificielle.models import IAFaceEmbedding
            
            ia_embeddings = IAFaceEmbedding.objects.filter(
                actif=True,
                embedding_vector__isnull=False
            ).select_related('criminel').exclude(embedding_vector=None).only(
                'id', 'embedding_vector', 'image_capture', 'criminel__id', 'criminel__nom',
                'criminel__prenom', 'criminel__numero_fiche', 'criminel__surnom',
                'criminel__date_naissance', 'criminel__lieu_naissance'
            )
            
            logger.info(f"Recherche dans {ia_embeddings.count()} embeddings IA actifs")
            
            # Charger tous les embeddings en une seule fois
            ia_data = []
            for ia_embedding in ia_embeddings:
                try:
                    stored_embedding_data = ia_embedding.embedding_vector
                    if not stored_embedding_data or not isinstance(stored_embedding_data, list):
                        continue
                    
                    stored_embedding = np.array(stored_embedding_data, dtype=np.float32)
                    if len(stored_embedding) != len(query_embedding):
                        continue
                    
                    ia_data.append({
                        'ia_embedding': ia_embedding,
                        'embedding': stored_embedding
                    })
                except Exception as e:
                    logger.warning(f"Erreur lors du chargement de l'embedding IA #{ia_embedding.id}: {e}")
                    continue
            
            # Comparaison vectorielle batch pour tous les embeddings IA
            if ia_data:
                logger.info(f"Comparaison batch de {len(ia_data)} embeddings IA...")
                embeddings_array = np.array([item['embedding'] for item in ia_data], dtype=np.float32)
                
                # Normaliser tous les embeddings en une seule opération
                norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True) + 1e-12
                embeddings_norm = embeddings_array / norms
                
                # Calculer toutes les similarités en une seule opération vectorielle
                similarities = np.dot(embeddings_norm, query_embedding_norm)
                
                # Créer un dictionnaire des meilleures correspondances par fiche (mise à jour de criminal_matches)
                best_matches_by_criminel = {m['id']: m for m in criminal_matches}
                
                # Filtrer et créer/mettre à jour les résultats
                for i, item in enumerate(ia_data):
                    similarity_score = float(similarities[i])
                    
                    if similarity_score >= threshold:
                        ia_embedding = item['ia_embedding']
                        criminel_id = ia_embedding.criminel.id
                        
                        # Garder seulement la meilleure correspondance par fiche
                        if criminel_id not in best_matches_by_criminel or \
                           similarity_score > best_matches_by_criminel[criminel_id]['similarity_score']:
                            
                            # Obtenir l'URL de la photo si disponible
                            photo_url = None
                            if ia_embedding.image_capture and ia_embedding.image_capture.name:
                                try:
                                    if ia_embedding.image_capture.name.startswith('ia/'):
                                        photo_url = f"/media/{ia_embedding.image_capture.name}"
                                    else:
                                        photo_url = f"/media/ia/embeddings/{ia_embedding.image_capture.name.split('/')[-1]}"
                                except:
                                    pass
                            
                            # Si pas de photo dans IAFaceEmbedding, essayer de trouver une photo dans BiometriePhoto
                            if not photo_url:
                                try:
                                    from biometrie.models import BiometriePhoto
                                    biometrie_photo = BiometriePhoto.objects.filter(
                                        criminel=ia_embedding.criminel,
                                        est_active=True
                                    ).only('image').first()
                                    if biometrie_photo and biometrie_photo.image:
                                        if biometrie_photo.image.name.startswith('biometrie/'):
                                            photo_url = f"/media/{biometrie_photo.image.name}"
                                        else:
                                            photo_url = f"/media/biometrie/photos/{biometrie_photo.image.name.split('/')[-1]}"
                                except:
                                    pass
                            
                            nom_complet = f"{ia_embedding.criminel.nom or ''} {ia_embedding.criminel.prenom or ''}".strip()
                            if not nom_complet:
                                nom_complet = f"Fiche #{ia_embedding.criminel.numero_fiche}"
                            
                            best_matches_by_criminel[criminel_id] = {
                                'type': 'CRIMINEL',
                                'id': ia_embedding.criminel.id,
                                'numero_fiche': ia_embedding.criminel.numero_fiche or '',
                                'nom': ia_embedding.criminel.nom or '',
                                'prenom': ia_embedding.criminel.prenom or '',
                                'nom_complet': nom_complet,
                                'surnom': ia_embedding.criminel.surnom or '',
                                'date_naissance': ia_embedding.criminel.date_naissance.isoformat() if ia_embedding.criminel.date_naissance else None,
                                'lieu_naissance': ia_embedding.criminel.lieu_naissance or '',
                                'similarity_score': similarity_score,
                                'photo_url': photo_url,
                                'photo_profil': photo_url,
                                'photo': photo_url,
                                'photo_id': None  # Pas de photo_id pour IAFaceEmbedding
                            }
                
                # Mettre à jour criminal_matches avec les meilleures correspondances
                criminal_matches = list(best_matches_by_criminel.values())
                logger.info(f"Recherche IAFaceEmbedding terminée: {len(best_matches_by_criminel)} fiches trouvées au total")
                    
        except ImportError:
            logger.debug("IAFaceEmbedding n'est pas disponible, recherche ignorée")
        except Exception as e:
            logger.warning(f"Erreur lors de la recherche dans les embeddings IA: {e}")
        
        # Trier par score de similarité décroissant
        upr_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
        criminal_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        # Limiter aux top_k meilleurs résultats
        upr_matches = upr_matches[:top_k]
        criminal_matches = criminal_matches[:top_k]
        
        logger.info(
            f"Recherche terminée: {len(upr_matches)} UPR et {len(criminal_matches)} fiches criminelles trouvées "
            f"(seuil: {threshold})"
        )
        
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

