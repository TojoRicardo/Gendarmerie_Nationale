"""
Utilitaires pour la génération automatique des codes UPR.

Génère des codes séquentiels au format UPR-0001, UPR-0002, etc.
"""

from django.db import transaction
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def generate_upr_code() -> str:
    """
    Génère un code UPR unique sous la forme UPR-0001, UPR-0002, etc.
    
    Format séquentiel avec padding à 4 chiffres.
    Utilise une transaction pour éviter les doublons en cas de création simultanée.
    
    Returns:
        Code UPR unique (ex: "UPR-0001")
    """
    from ..models import UnidentifiedPerson
    
    with transaction.atomic():
        # Récupérer le dernier UPR avec un verrou de ligne
        last_upr = UnidentifiedPerson.objects.select_for_update().order_by('-id').first()
        
        if last_upr and last_upr.code_upr:
            try:
                last_number = int(last_upr.code_upr.split('-')[1])
                next_number = last_number + 1
            except (ValueError, IndexError):
                logger.warning(f"Code UPR invalide trouvé: {last_upr.code_upr}, réinitialisation à 1")
                next_number = 1
        else:
            next_number = 1
        
        # Générer le nouveau code avec padding à 4 chiffres
        new_code = f"UPR-{str(next_number).zfill(4)}"
        
        max_attempts = 100
        attempt = 0
        
        while attempt < max_attempts:
            if not UnidentifiedPerson.objects.filter(code_upr=new_code).exists():
                logger.info(f"Code UPR généré: {new_code}")
                return new_code
            
            # Si le code existe déjà, incrémenter
            next_number += 1
            new_code = f"UPR-{str(next_number).zfill(4)}"
            attempt += 1
        
        # En cas d'échec après toutes les tentatives, utiliser un timestamp
        import time
        timestamp = int(time.time()) % 10000
        fallback_code = f"UPR-{str(timestamp).zfill(4)}"
        logger.warning(f"Utilisation d'un code de secours: {fallback_code}")
        return fallback_code


def generate_nom_temporaire(code_upr: str) -> str:
    """
    Génère un nom temporaire basé sur le code UPR.
    
    Args:
        code_upr: Code UPR (ex: "UPR-0001")
    
    Returns:
        Nom temporaire (ex: "Individu Non Identifié #0001")
    """
    try:
        number = code_upr.split('-')[1]
        return f"Individu Non Identifié #{number}"
    except (IndexError, ValueError):
        logger.warning(f"Code UPR invalide pour génération nom: {code_upr}")
        return "Individu Non Identifié #0001"







