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
from django.db.models import Q

from upr.models import UnidentifiedPerson
from biometrie.arcface_service import get_shared_arcface_service, ArcFaceService

logger = logging.getLogger(__name__)

# Seuil de similarité pour considérer qu'une photo existe déjà
SIMILARITY_THRESHOLD = 0.35  # 35% de similarité minimum

# Seuil pour afficher « personne déjà enregistrée » (visages identiques / doublon UPR)
STRICT_SIMILARITY_THRESHOLD = 0.75

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
            from .face_processing import prepare_face_image
            prepared_upload = prepare_face_image(uploaded_image)
            faces = arcface_service.encode_faces(image=prepared_upload, limit=1)
            
            if not faces or len(faces) == 0:
                logger.warning("Aucun visage détecté dans l'image uploadée")
                return None
            
            query_embedding = faces[0].embedding
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'embedding: {e}", exc_info=True)
            return None
        
        # Récupérer tous les UPR avec photo ou embedding (exclure les archivés)
        upr_query = UnidentifiedPerson.objects.filter(is_archived=False).filter(
            Q(face_embedding__isnull=False)
            | (Q(profil_face__isnull=False) & ~Q(profil_face=''))
        ).exclude(profil_face='1')
        
        # Exclure l'UPR spécifié si fourni
        if exclude_upr_id:
            upr_query = upr_query.exclude(id=exclude_upr_id)
        
        best_match = None
        best_score = 0.0
        
        # Comparer avec tous les UPR existants
        for upr in upr_query:
            try:
                stored_embedding = _get_or_create_upr_embedding(upr, save=True)
                if stored_embedding is None:
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


def _get_or_create_upr_embedding(upr: UnidentifiedPerson, save: bool = True) -> Optional[np.ndarray]:
    """
    Retourne l'embedding facial d'un UPR.
    Si absent en base mais photo présente, extrait ArcFace et sauvegarde (backfill automatique).
    """
    stored = upr.face_embedding
    if isinstance(stored, list) and len(stored) > 0:
        return np.array(stored, dtype=np.float32)

    if not upr.profil_face or not upr.profil_face.name or upr.profil_face.name == '1':
        return None

    try:
        from .face_processing import prepare_face_image, extract_face_data

        prepared = prepare_face_image(upr.profil_face)
        face_data = extract_face_data(prepared)
        if face_data.get('success') and face_data.get('embedding'):
            embedding_list = face_data['embedding']
            embedding = np.array(embedding_list, dtype=np.float32)
            if save:
                if face_data.get('landmarks'):
                    upr.landmarks_106 = face_data['landmarks']
                upr.face_embedding = embedding_list
                fields = ['face_embedding']
                if face_data.get('landmarks'):
                    fields.append('landmarks_106')
                upr.save(update_fields=fields)
                logger.info("Embedding UPR #%s (%s) généré et enregistré", upr.id, upr.code_upr)
            return embedding

        logger.warning(
            "Impossible d'extraire l'embedding UPR #%s: %s",
            upr.id,
            face_data.get('error', 'inconnu'),
        )
        return None
    except Exception as exc:
        logger.warning("Erreur extraction embedding UPR #%s: %s", upr.id, exc)
        return None


def _upr_profil_face_url(upr: UnidentifiedPerson) -> Optional[str]:
    """Construit l'URL relative de la photo de profil UPR."""
    if not upr.profil_face or not upr.profil_face.name or upr.profil_face.name == '1':
        return None
    try:
        if upr.profil_face.name.startswith('upr/'):
            return f"/media/{upr.profil_face.name}"
        return f"/media/upr/photos/{upr.profil_face.name.split('/')[-1]}"
    except Exception as exc:
        logger.warning("URL profil UPR #%s: %s", upr.id, exc)
        return None


def _search_upr_matches(
    query_embedding: np.ndarray,
    query_embedding_norm: np.ndarray,
    threshold: float,
    top_k: int,
) -> list:
    """
    Recherche des correspondances dans les UPR existants (visages identiques / doublons).
    """
    upr_matches = []
    try:
        upr_entries = (
            UnidentifiedPerson.objects.filter(is_archived=False)
            .filter(
                Q(face_embedding__isnull=False)
                | (Q(profil_face__isnull=False) & ~Q(profil_face=''))
            )
            .exclude(profil_face='1')
            .only(
                'id', 'code_upr', 'nom_temporaire', 'face_embedding', 'profil_face',
                'discovered_date', 'date_enregistrement', 'created_at',
            )
        )

        upr_data = []
        for upr in upr_entries:
            try:
                emb = _get_or_create_upr_embedding(upr, save=True)
                if emb is None or len(emb) != len(query_embedding):
                    continue
                upr_data.append((upr, emb))
            except Exception as exc:
                logger.warning("Embedding UPR #%s ignoré: %s", upr.id, exc)

        if not upr_data:
            logger.info("[search_by_photo] Aucun UPR avec embedding disponible")
            return []

        embeddings_array = np.array([item[1] for item in upr_data], dtype=np.float32)
        norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True) + 1e-12
        embeddings_norm = embeddings_array / norms
        similarities = np.dot(embeddings_norm, query_embedding_norm)

        best_by_upr: dict = {}
        for i, (upr, _) in enumerate(upr_data):
            similarity_score = float(similarities[i])
            if similarity_score < threshold:
                continue
            existing = best_by_upr.get(upr.id)
            if existing and existing['similarity_score'] >= similarity_score:
                continue
            photo_url = _upr_profil_face_url(upr)
            date_ref = upr.date_enregistrement or upr.created_at
            best_by_upr[upr.id] = {
                'type': 'UPR',
                'id': upr.id,
                'code_upr': upr.code_upr or '',
                'nom_temporaire': upr.nom_temporaire or '',
                'similarity_score': similarity_score,
                'is_strict_match': similarity_score >= STRICT_SIMILARITY_THRESHOLD,
                'is_duplicate': similarity_score >= STRICT_SIMILARITY_THRESHOLD,
                'profil_face_url': photo_url,
                'profil_face': photo_url,
                'photo': photo_url,
                'date_enregistrement': date_ref.isoformat() if date_ref else None,
            }

        upr_matches = list(best_by_upr.values())
        upr_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
        logger.info(
            "[search_by_photo] UPR: %s correspondance(s) (seuil %.2f, strict %.2f)",
            len(upr_matches), threshold, STRICT_SIMILARITY_THRESHOLD,
        )
        return upr_matches[:top_k]
    except Exception as exc:
        logger.error("Erreur recherche UPR: %s", exc, exc_info=True)
        return []


def _pick_best_person_match(upr_matches: list, criminal_matches: list) -> Optional[Dict[str, Any]]:
    """Retourne la meilleure correspondance « personne trouvée » (UPR ou criminel)."""
    candidates = []
    for match in upr_matches:
        if match.get('is_strict_match') or match.get('is_duplicate'):
            candidates.append(match)
    for match in criminal_matches:
        score = match.get('similarity_score', 0)
        if score >= STRICT_SIMILARITY_THRESHOLD:
            candidates.append({**match, 'is_strict_match': True})
    if not candidates:
        return None
    return max(candidates, key=lambda m: m.get('similarity_score', 0))


def search_by_photo(
    uploaded_image: UploadedFile,
    threshold: float = SIMILARITY_THRESHOLD,
    top_k: int = 10
) -> Dict[str, Any]:
    """
    Recherche par photo dans les UPR ET les tables biométriques (fiches criminelles).
    
    Sources de recherche:
    - UnidentifiedPerson (UPR avec face_embedding)
    - Biometrie, BiometriePhoto, IAFaceEmbedding (fiches criminelles)
    
    Utilisé pour la fonctionnalité de recherche par photo dans "Ajouter un UPR".
    
    Args:
        uploaded_image: Fichier image uploadé
        threshold: Seuil de similarité minimum (défaut: 0.35)
        top_k: Nombre maximum de résultats à retourner
    
    Returns:
        Dict contenant:
        {
            'upr_matches': [Liste des UPR correspondants],
            'criminal_matches': [Liste des fiches criminelles correspondantes],
            'criminel_matches': [Alias de criminal_matches pour compatibilité],
            'person_found': bool,
            'best_match': dict | null,
            'total_matches': int,
            'landmarks': landmarks extraits,
            'confidence': score de confiance
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
            from .face_processing import extract_face_data, prepare_face_image

            prepared = prepare_face_image(uploaded_image)
            face_data = extract_face_data(prepared)
            
            if face_data.get("success", False):
                query_embedding = np.array(face_data.get("embedding"), dtype=np.float32)
                landmarks = face_data.get("landmarks")
                confidence = face_data.get("confidence")
                logger.info("[OK] [search_by_photo] Extraction réussie via extract_face_data")
                logger.info(f"[search_by_photo] Embedding extrait: dimension={len(query_embedding)}, confidence={confidence}")
            else:
                error_msg = face_data.get("error", "Aucun visage détecté")
                logger.warning(f"Échec extraction via extract_face_data: {error_msg}")
                # Continuer avec les méthodes de fallback ci-dessous
            
            # Méthode 2: Si extract_face_data n'a pas fonctionné, essayer avec encode_faces
            if query_embedding is None or len(query_embedding) == 0:
                logger.info("Tentative d'extraction via encode_faces...")
                faces = arcface_service.encode_faces(image=prepared, limit=1)
                if faces and len(faces) > 0:
                    query_embedding = faces[0].embedding
                    logger.info("Extraction réussie via encode_faces")
                    # Si landmarks non extraits, essayer de les obtenir
                    if not landmarks:
                        try:
                            from biometrie.face_106 import detect_106_landmarks
                            landmarks_result = detect_106_landmarks(prepared)
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
        
        criminal_matches = []
        
        # Note: landmarks et confidence sont déjà définis dans le try ci-dessus
        # Si le try a réussi, ils contiennent les valeurs extraites
        # Si le try a échoué, la fonction a déjà retourné une erreur
        
        # Normaliser l'embedding de requête une seule fois
        query_embedding_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-12)

        # 0. Rechercher dans les UPR (doublons / personne déjà enregistrée)
        upr_matches = _search_upr_matches(query_embedding, query_embedding_norm, threshold, top_k)
        
        # 1. Rechercher dans les tables biométriques reliées aux fiches criminelles
        # Utiliser plusieurs sources d'embeddings pour maximiser les résultats
        
        # 1a. Rechercher dans Biometrie (table principale avec encodage_facial)
        try:
            from biometrie.models import Biometrie
            
            # Compter toutes les entrées Biometrie (pour diagnostic)
            total_biometrie = Biometrie.objects.filter(encodage_facial__isnull=False).exclude(encodage_facial=None).count()
            
            logger.info("[search_by_photo] Diagnostic Biometrie:")
            logger.info(f"   - Total entrées avec encodage_facial: {total_biometrie}")
            
            biometrie_entries = Biometrie.objects.filter(
                encodage_facial__isnull=False
            ).select_related('criminel').exclude(encodage_facial=None).only(
                'id', 'encodage_facial', 'photo', 'criminel__id', 'criminel__nom',
                'criminel__prenom', 'criminel__numero_fiche', 'criminel__surnom',
                'criminel__date_naissance', 'criminel__lieu_naissance'
            )
            
            logger.info(f"[search_by_photo] Recherche dans {biometrie_entries.count()} entrées Biometrie avec encodage_facial")
            
            # Charger tous les embeddings en une seule fois
            biometrie_data = []
            for biometrie in biometrie_entries:
                try:
                    stored_embedding_data = biometrie.encodage_facial
                    if not stored_embedding_data:
                        continue
                    
                    # Convertir en numpy array (peut être une liste ou déjà un array)
                    if isinstance(stored_embedding_data, list):
                        stored_embedding = np.array(stored_embedding_data, dtype=np.float32)
                    elif isinstance(stored_embedding_data, dict):
                        # Si c'est un dict avec une clé 'embedding' ou similaire
                        stored_embedding = np.array(stored_embedding_data.get('embedding', stored_embedding_data), dtype=np.float32)
                    else:
                        continue
                    
                    if len(stored_embedding) != len(query_embedding):
                        logger.warning(f"Dimension différente pour Biometrie #{biometrie.id}: {len(stored_embedding)} vs {len(query_embedding)}")
                        continue
                    
                    biometrie_data.append({
                        'biometrie': biometrie,
                        'embedding': stored_embedding
                    })
                except Exception as e:
                    logger.warning(f"Erreur lors du chargement de l'embedding Biometrie #{biometrie.id}: {e}")
                    continue
            
            # Comparaison vectorielle batch pour toutes les entrées Biometrie
            if biometrie_data:
                logger.info(f"[search_by_photo] Comparaison batch de {len(biometrie_data)} entrées Biometrie...")
                embeddings_array = np.array([item['embedding'] for item in biometrie_data], dtype=np.float32)
                
                # Normaliser tous les embeddings en une seule opération
                norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True) + 1e-12
                embeddings_norm = embeddings_array / norms
                
                # Calculer toutes les similarités en une seule opération vectorielle
                similarities = np.dot(embeddings_norm, query_embedding_norm)
                logger.info(f"[search_by_photo] Similarités Biometrie: min={float(np.min(similarities)):.4f}, max={float(np.max(similarities)):.4f}, mean={float(np.mean(similarities)):.4f}")
                
                # Dictionnaire pour garder la meilleure correspondance par fiche criminelle
                best_matches_by_criminel = {}
                
                # Filtrer et créer les résultats
                matches_found_biometrie = 0
                for i, item in enumerate(biometrie_data):
                    similarity_score = float(similarities[i])
                    
                    # Log pour les meilleures correspondances même si sous le seuil
                    if i < 5:  # Log les 5 premières pour diagnostic
                        biometrie = item['biometrie']
                        logger.debug(f"[search_by_photo] Biometrie #{biometrie.id} (Criminel #{biometrie.criminel.id}): similarity={similarity_score:.4f}, threshold={threshold}")
                    
                    if similarity_score >= threshold:
                        matches_found_biometrie += 1
                        biometrie = item['biometrie']
                        criminel_id = biometrie.criminel.id
                        
                        # Garder seulement la meilleure correspondance par fiche
                        if criminel_id not in best_matches_by_criminel or \
                           similarity_score > best_matches_by_criminel[criminel_id]['similarity_score']:
                            
                            photo_url = None
                            if biometrie.photo and biometrie.photo.name:
                                try:
                                    if biometrie.photo.name.startswith('biometrie/'):
                                        photo_url = f"/media/{biometrie.photo.name}"
                                    else:
                                        photo_url = f"/media/biometrie/photos/{biometrie.photo.name.split('/')[-1]}"
                                except Exception:
                                    pass
                            
                            nom_complet = f"{biometrie.criminel.nom or ''} {biometrie.criminel.prenom or ''}".strip()
                            if not nom_complet:
                                nom_complet = f"Fiche #{biometrie.criminel.numero_fiche}"
                            
                            best_matches_by_criminel[criminel_id] = {
                                'type': 'CRIMINEL',
                                'id': biometrie.criminel.id,
                                'numero_fiche': biometrie.criminel.numero_fiche or '',
                                'nom': biometrie.criminel.nom or '',
                                'prenom': biometrie.criminel.prenom or '',
                                'nom_complet': nom_complet,
                                'surnom': biometrie.criminel.surnom or '',
                                'date_naissance': biometrie.criminel.date_naissance.isoformat() if biometrie.criminel.date_naissance else None,
                                'lieu_naissance': biometrie.criminel.lieu_naissance or '',
                                'similarity_score': similarity_score,
                                'photo_url': photo_url,
                                'photo_profil': photo_url,
                                'photo': photo_url,
                                'source': 'Biometrie'
                            }
                
                # Ajouter toutes les meilleures correspondances
                criminal_matches.extend(best_matches_by_criminel.values())
                logger.info(f"[OK] [search_by_photo] Recherche Biometrie terminée: {len(best_matches_by_criminel)} fiches trouvées (sur {matches_found_biometrie} correspondances au total)")
                
                # Si aucune correspondance trouvée, logger les meilleures scores pour diagnostic
                if len(best_matches_by_criminel) == 0 and biometrie_data:
                    top_5_indices = np.argsort(similarities)[-5:][::-1]
                    logger.warning(f"[search_by_photo] Aucune correspondance trouvée dans Biometrie avec seuil {threshold}")
                    logger.warning("[search_by_photo] Top 5 meilleures similarités Biometrie:")
                    for idx in top_5_indices:
                        biometrie = biometrie_data[idx]['biometrie']
                        score = float(similarities[idx])
                        logger.warning(f"   - Biometrie #{biometrie.id} (Criminel #{biometrie.criminel.id}): {score:.4f}")
                    
        except ImportError:
            logger.warning("Biometrie n'est pas disponible, recherche ignorée")
        except Exception as e:
            logger.warning(f"Erreur lors de la recherche dans Biometrie: {e}")
        
        # 1b. Rechercher dans BiometriePhoto (photos biométriques avec embedding_512)
        try:
            from biometrie.models import BiometriePhoto
            
            # Compter toutes les photos biométriques (pour diagnostic)
            total_photos = BiometriePhoto.objects.filter(est_active=True).count()
            photos_with_embedding = BiometriePhoto.objects.filter(
                est_active=True,
                embedding_512__isnull=False
            ).exclude(embedding_512=None).count()
            
            logger.info("[search_by_photo] Diagnostic BiometriePhoto:")
            logger.info(f"   - Total photos actives: {total_photos}")
            logger.info(f"   - Photos avec embedding_512: {photos_with_embedding}")
            logger.info(f"   - Photos sans embedding: {total_photos - photos_with_embedding}")
            
            criminal_photos = BiometriePhoto.objects.filter(
                est_active=True,
                embedding_512__isnull=False
            ).select_related('criminel').exclude(embedding_512=None).only(
                'id', 'embedding_512', 'image', 'criminel__id', 'criminel__nom', 
                'criminel__prenom', 'criminel__numero_fiche', 'criminel__surnom',
                'criminel__date_naissance', 'criminel__lieu_naissance'
            )
            
            logger.info(f"[search_by_photo] Recherche dans {criminal_photos.count()} photos biométriques actives avec embedding")
            
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
                logger.info(f"[search_by_photo] Comparaison batch de {len(photo_data)} photos criminelles...")
                logger.info(f"[search_by_photo] Dimension embedding requête: {len(query_embedding)}")
                
                embeddings_array = np.array([item['embedding'] for item in photo_data], dtype=np.float32)
                logger.info(f"[search_by_photo] Shape embeddings_array: {embeddings_array.shape}")
                
                # Normaliser tous les embeddings en une seule opération
                norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True) + 1e-12
                embeddings_norm = embeddings_array / norms
                
                # Normaliser l'embedding de requête
                query_norm = query_embedding_norm
                
                # Calculer toutes les similarités en une seule opération vectorielle
                similarities = np.dot(embeddings_norm, query_norm)
                logger.info(f"[search_by_photo] Similarités calculées: min={float(np.min(similarities)):.4f}, max={float(np.max(similarities)):.4f}, mean={float(np.mean(similarities)):.4f}")
                logger.info(f"[search_by_photo] Seuil utilisé: {threshold}")
                
                # Dictionnaire pour garder la meilleure correspondance par fiche criminelle
                best_matches_by_criminel = {}
                
                # Filtrer et créer les résultats
                matches_found = 0
                for i, item in enumerate(photo_data):
                    similarity_score = float(similarities[i])
                    
                    # Log pour les meilleures correspondances même si sous le seuil
                    if i < 5:  # Log les 5 premières pour diagnostic
                        photo = item['photo']
                        logger.debug(f"[search_by_photo] Photo #{photo.id} (Criminel #{photo.criminel.id}): similarity={similarity_score:.4f}, threshold={threshold}")
                    
                    if similarity_score >= threshold:
                        matches_found += 1
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
                                except Exception:
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
                
                # Mettre à jour les meilleures correspondances (garder la meilleure par criminel)
                # Fusionner avec les résultats de Biometrie
                existing_criminel_ids = {m['id'] for m in criminal_matches}
                for criminel_id, match in best_matches_by_criminel.items():
                    if criminel_id not in existing_criminel_ids:
                        criminal_matches.append(match)
                    else:
                        # Remplacer si le nouveau score est meilleur
                        existing_match = next(m for m in criminal_matches if m['id'] == criminel_id)
                        if match['similarity_score'] > existing_match['similarity_score']:
                            criminal_matches.remove(existing_match)
                            criminal_matches.append(match)
                
                logger.info(f"[OK] [search_by_photo] Recherche BiometriePhoto terminée: {len(best_matches_by_criminel)} nouvelles fiches trouvées (sur {matches_found} correspondances au total)")
                
                # Si aucune correspondance trouvée, logger les meilleures scores pour diagnostic
                if len(best_matches_by_criminel) == 0 and photo_data:
                    top_5_indices = np.argsort(similarities)[-5:][::-1]
                    logger.warning(f"[search_by_photo] Aucune correspondance trouvée avec seuil {threshold}")
                    logger.warning("[search_by_photo] Top 5 meilleures similarités:")
                    for idx in top_5_indices:
                        photo = photo_data[idx]['photo']
                        score = float(similarities[idx])
                        logger.warning(f"   - Photo #{photo.id} (Criminel #{photo.criminel.id}): {score:.4f}")
                    
        except ImportError:
            logger.warning("BiometriePhoto n'est pas disponible, recherche dans les criminels ignorée")
        except Exception as e:
            logger.warning(f"Erreur lors de la recherche dans les photos criminelles: {e}")
        
        # 1c. Rechercher aussi dans IAFaceEmbedding (embeddings IA) avec comparaison batch
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
                                except Exception:
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
                                except Exception:
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
                
                # Mettre à jour les meilleures correspondances (garder la meilleure par criminel)
                # Fusionner avec les résultats existants
                existing_criminel_ids = {m['id'] for m in criminal_matches}
                for criminel_id, match in best_matches_by_criminel.items():
                    if criminel_id not in existing_criminel_ids:
                        criminal_matches.append(match)
                    else:
                        # Remplacer si le nouveau score est meilleur
                        existing_match = next(m for m in criminal_matches if m['id'] == criminel_id)
                        if match['similarity_score'] > existing_match['similarity_score']:
                            criminal_matches.remove(existing_match)
                            criminal_matches.append(match)
                
                logger.info(f"[OK] [search_by_photo] Recherche IAFaceEmbedding terminée: {len(best_matches_by_criminel)} nouvelles fiches trouvées au total")
                    
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
            f"Recherche terminée: {len(upr_matches)} UPR et {len(criminal_matches)} fiches criminelles "
            f"(seuil: {threshold})"
        )

        best_match = _pick_best_person_match(upr_matches, criminal_matches)
        person_found = best_match is not None

        warnings = []
        upr_sans_index = UnidentifiedPerson.objects.filter(
            is_archived=False,
            profil_face__isnull=False,
        ).exclude(profil_face='').exclude(profil_face='1').filter(
            Q(face_embedding__isnull=True) | Q(face_embedding=[])
        ).count()
        if upr_sans_index:
            warnings.append(
                f"{upr_sans_index} UPR ont une photo sans empreinte faciale indexée — "
                "la recherche ne peut pas les retrouver. Ré-enregistrez la photo ou lancez "
                "« python manage.py generer_embeddings_upr »."
            )

        # Secours : comparaison directe photo ↔ UPR (doublon / visage identique)
        if not person_found and not upr_matches:
            duplicate = check_existing_upr_photo(uploaded_image)
            if duplicate and duplicate.get('existing_upr'):
                dup_score = float(duplicate.get('similarity_score', 0))
                upr_id = duplicate.get('upr_id')
                try:
                    dup_upr = UnidentifiedPerson.objects.get(pk=upr_id)
                    photo_url = duplicate.get('profil_face_url') or _upr_profil_face_url(dup_upr)
                    dup_match = {
                        'type': 'UPR',
                        'id': upr_id,
                        'code_upr': duplicate.get('code_upr', ''),
                        'nom_temporaire': duplicate.get('nom_temporaire', ''),
                        'similarity_score': dup_score,
                        'is_strict_match': dup_score >= STRICT_SIMILARITY_THRESHOLD,
                        'is_duplicate': True,
                        'profil_face_url': photo_url,
                        'profil_face': photo_url,
                        'photo': photo_url,
                    }
                    upr_matches = [dup_match]
                    best_match = dup_match
                    person_found = dup_score >= STRICT_SIMILARITY_THRESHOLD
                except UnidentifiedPerson.DoesNotExist:
                    pass

        return {
            'upr_matches': upr_matches,
            'criminal_matches': criminal_matches,
            'criminel_matches': criminal_matches,
            'person_found': person_found,
            'best_match': best_match,
            'total_matches': len(upr_matches) + len(criminal_matches),
            'warnings': warnings,
            'landmarks': landmarks,
            'confidence': confidence,
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

