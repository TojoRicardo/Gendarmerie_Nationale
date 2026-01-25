"""
Générateur de référence audit professionnel.
Format: SGIC-AUD/YYYY/MM/DD/ROLE-NOM/000001
"""

from django.utils import timezone
from django.db.models import Max
from .models import AuditLog
import logging

logger = logging.getLogger(__name__)


def get_role_code(user):
    """
    Convertit le rôle de l'utilisateur en code professionnel.
    
    Args:
        user: Instance de l'utilisateur
        
    Returns:
        str: Code du rôle (ADM, ENQ, ANL, TEC, OBS, USR)
    """
    if not user or not hasattr(user, 'role'):
        return "USR"
    
    role = (user.role or "").lower().strip()
    
    if "admin" in role or "administrateur" in role:
        return "ADM"
    elif "enqu" in role:
        return "ENQ"
    elif "anal" in role:
        return "ANL"
    elif "techn" in role:
        return "TEC"
    elif "obs" in role:
        return "OBS"
    else:
        return "USR"


def generate_audit_reference(user):
    """
    Génère une référence audit professionnelle unique.
    
    Format: SGIC-AUD/YYYY/MM/DD/ROLE-NOM/000001
    
    Args:
        user: Instance de l'utilisateur
        
    Returns:
        tuple: (reference, operation_index)
            - reference: Référence complète (ex: SGIC-AUD/2025/11/26/ADM-TOJO/000142)
            - operation_index: Index de l'opération pour le jour
    """
    try:
        now = timezone.now()
        date_str = now.strftime("%Y/%m/%d")
        
        # Obtenir le code du rôle
        role_code = get_role_code(user)
        
        if hasattr(user, 'last_name') and user.last_name:
            user_name = user.last_name.upper()
        elif hasattr(user, 'username'):
            user_name = user.username.upper()
        else:
            user_name = "USER"
        
        user_code = f"{role_code}-{user_name}"
        
        # Obtenir le dernier index d'opération du jour
        last_op = AuditLog.objects.filter(
            created_at__date=now.date()
        ).aggregate(Max("operation_index"))["operation_index__max"]
        
        # Calculer le prochain index
        next_op = (last_op or 0) + 1
        index_str = str(next_op).zfill(6)
        
        # Générer la référence complète
        reference = f"SGIC-AUD/{date_str}/{user_code}/{index_str}"
        
        return reference, next_op
    
    except Exception as e:
        logger.error(f"Erreur lors de la génération de la référence audit: {e}")
        # En cas d'erreur, retourner une référence par défaut
        now = timezone.now()
        date_str = now.strftime("%Y/%m/%d")
        default_ref = f"SGIC-AUD/{date_str}/ERR-USER/000001"
        return default_ref, 1

