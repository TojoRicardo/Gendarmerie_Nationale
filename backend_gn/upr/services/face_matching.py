"""
Service de comparaison automatique des embeddings faciaux.

Compare un embedding UPR avec :
- Tous les autres UPR existants
- Toutes les fiches criminelles avec embeddings

Utilise la distance L2 pour calculer la similarité.
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from django.db.models import Q
from django.utils import timezone

from ..models import UnidentifiedPerson, UPRMatchLog, CriminelMatchLog
from criminel.models import CriminalFicheCriminelle

logger = logging.getLogger(__name__)

# Seuils de correspondance
SEUIL_STRICT = 0.90  # Correspondance très probable
SEUIL_FAIBLE = 1.20  # Correspondance possible


def compare_embeddings(embedding1: List[float], embedding2: List[float]) -> float:
    """
    Calcule la distance L2 entre deux embeddings.
    
    Args:
        embedding1: Premier embedding (liste de 512 floats)
        embedding2: Deuxième embedding (liste de 512 floats)
    
    Returns:
        Distance L2 (float). Plus petit = plus similaire.
    
    Raises:
        ValueError: Si les embeddings ont des dimensions différentes
    """
    if len(embedding1) != len(embedding2):
        raise ValueError(f"Dimensions d'embeddings différentes: {len(embedding1)} vs {len(embedding2)}")
    
    # Convertir en numpy arrays
    emb1 = np.array(embedding1, dtype=np.float32)
    emb2 = np.array(embedding2, dtype=np.float32)
    
    distance = np.linalg.norm(emb1 - emb2)
    
    return float(distance)


def find_matches_for_upr(upr: UnidentifiedPerson) -> Dict[str, Any]:
    """
    Trouve toutes les correspondances pour un UPR donné.
    
    Compare l'embedding du UPR avec :
    - Tous les autres UPR existants (non résolus)
    - Toutes les fiches criminelles avec embeddings
    
    Args:
        upr: Instance UnidentifiedPerson avec embedding
    
    Returns:
        Dict contenant:
            - upr_matches: Liste des correspondances UPR
            - criminel_matches: Liste des correspondances Criminel
            - total_matches: Nombre total de correspondances
    """
    if not upr.face_embedding:
        logger.warning(f"UPR {upr.code_upr} n'a pas d'embedding, impossible de faire la comparaison")
        return {
            "upr_matches": [],
            "criminel_matches": [],
            "total_matches": 0
        }
    
    source_embedding = upr.face_embedding
    matches_upr = []
    matches_criminel = []
    
    logger.info(f"Début recherche de correspondances pour UPR {upr.code_upr}...")
    
    try:
        # 1. Comparer avec les autres UPR
        logger.info("Comparaison avec les autres UPR...")
        other_uprs = UnidentifiedPerson.objects.filter(
            ~Q(id=upr.id),
            face_embedding__isnull=False,
            is_resolved=False
        ).exclude(face_embedding=None)
        
        upr_count = 0
        for target_upr in other_uprs:
            if not target_upr.face_embedding:
                continue
            
            try:
                distance = compare_embeddings(source_embedding, target_upr.face_embedding)
                
                # Enregistrer seulement si distance < seuil faible
                if distance < SEUIL_FAIBLE:
                    is_strict = distance < SEUIL_STRICT
                    is_weak = distance < SEUIL_FAIBLE
                    
                    # Créer ou mettre à jour le log de correspondance
                    match_log, created = UPRMatchLog.objects.update_or_create(
                        upr_source=upr,
                        upr_target=target_upr,
                        defaults={
                            'distance': distance,
                            'is_strict_match': is_strict,
                            'is_weak_match': is_weak,
                            'match_date': timezone.now()
                        }
                    )
                    
                    matches_upr.append({
                        "type": "UPR",
                        "id": target_upr.id,
                        "code_upr": target_upr.code_upr,
                        "nom_temporaire": target_upr.nom_temporaire,
                        "distance": distance,
                        "is_strict_match": is_strict,
                        "is_weak_match": is_weak,
                        "match_log_id": match_log.id
                    })
                    
                    upr_count += 1
                    logger.debug(f"Correspondance UPR trouvée: {target_upr.code_upr} (distance: {distance:.4f})")
                    
            except Exception as e:
                logger.warning(f"Erreur lors de la comparaison avec UPR {target_upr.code_upr}: {e}")
                continue
        
        logger.info(f"{upr_count} correspondance(s) UPR trouvée(s)")
        
        # 2. Comparer avec les fiches criminelles
        logger.info("Comparaison avec les fiches criminelles...")
        
        # Récupérer les embeddings depuis le module biometrie
        from biometrie.models import Biometrie
        
        biometries = Biometrie.objects.filter(
            encodage_facial__isnull=False
        ).select_related('criminel').exclude(encodage_facial=None)
        
        criminel_count = 0
        for biometrie in biometries:
            if not biometrie.encodage_facial or not biometrie.criminel:
                continue
            
            try:
                # Désérialiser l'embedding depuis le format JSON
                from biometrie.arcface_service import ArcFaceService
                arcface_service = ArcFaceService()
                
                target_embedding = arcface_service.deserialize_embedding(biometrie.encodage_facial)
                if target_embedding is None:
                    continue
                
                # Convertir en liste si nécessaire
                if isinstance(target_embedding, np.ndarray):
                    target_embedding = target_embedding.tolist()
                
                distance = compare_embeddings(source_embedding, target_embedding)
                
                # Enregistrer seulement si distance < seuil faible
                if distance < SEUIL_FAIBLE:
                    is_strict = distance < SEUIL_STRICT
                    is_weak = distance < SEUIL_FAIBLE
                    
                    # Créer ou mettre à jour le log de correspondance
                    match_log, created = CriminelMatchLog.objects.update_or_create(
                        upr_source=upr,
                        criminel_target=biometrie.criminel,
                        defaults={
                            'distance': distance,
                            'is_strict_match': is_strict,
                            'is_weak_match': is_weak,
                            'match_date': timezone.now()
                        }
                    )
                    
                    matches_criminel.append({
                        "type": "CRIMINEL",
                        "id": biometrie.criminel.id,
                        "numero_fiche": biometrie.criminel.numero_fiche,
                        "nom": biometrie.criminel.nom,
                        "prenom": biometrie.criminel.prenom,
                        "distance": distance,
                        "is_strict_match": is_strict,
                        "is_weak_match": is_weak,
                        "match_log_id": match_log.id
                    })
                    
                    criminel_count += 1
                    logger.debug(f"Correspondance Criminel trouvée: {biometrie.criminel.numero_fiche} (distance: {distance:.4f})")
                    
            except Exception as e:
                logger.warning(f"Erreur lors de la comparaison avec Criminel {biometrie.criminel_id}: {e}")
                continue
        
        logger.info(f"{criminel_count} correspondance(s) Criminel trouvée(s)")
        
        matches_upr.sort(key=lambda x: x['distance'])
        matches_criminel.sort(key=lambda x: x['distance'])
        
        total_matches = len(matches_upr) + len(matches_criminel)
        logger.info(f"Recherche terminée: {total_matches} correspondance(s) totale(s)")
        
        return {
            "upr_matches": matches_upr,
            "criminel_matches": matches_criminel,
            "total_matches": total_matches
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de correspondances pour UPR {upr.code_upr}: {e}", exc_info=True)
        return {
            "upr_matches": [],
            "criminel_matches": [],
            "total_matches": 0,
            "error": str(e)
        }







