"""
Service pour l'analyse des actions d'audit.
Fonctionnalité IA désactivée - utilise un mode de fallback simple.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def analyze_action(
    user: str,
    action: str,
    metadata: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analyse une action utilisateur et retourne un résumé narratif structuré (sans IA).
    
    Args:
        user: Nom d'utilisateur
        action: Type d'action (login, creation, modification, suppression, etc.)
        metadata: Dictionnaire contenant les métadonnées de l'action
    
    Returns:
        Dict avec:
        - narrative_public: Phrase narrative simple
        - narrative_admin: Même phrase narrative
        - confidence: Score de confiance (toujours 50 pour fallback)
        - risk_level: Niveau de risque calculé
        - missing_fields: Liste des champs manquants
    """
    logger.debug("Utilisation du mode de fallback pour analyze_action")
    
    resource = metadata.get('resource', 'la ressource')
    date_action = metadata.get('date_action', datetime.now())
    
    if isinstance(date_action, datetime):
        date_str = date_action.strftime("%d/%m/%Y")
        time_str = date_action.strftime("%H:%M:%S")
    else:
        date_str = datetime.now().strftime("%d/%m/%Y")
        time_str = datetime.now().strftime("%H:%M:%S")
    
    action_map = {
        'LOGIN': 's\'est connecté',
        'LOGOUT': 's\'est déconnecté',
        'FAILED_LOGIN': 'tentative de connexion échouée',
        'VIEW': 'a consulté',
        'CREATE': 'a créé',
        'UPDATE': 'a modifié',
        'DELETE': 'a supprimé',
        'DOWNLOAD': 'a téléchargé',
        'SUSPEND': 'a suspendu',
        'RESTORE': 'a restauré',
        'PERMISSION_CHANGE': 'a modifié les permissions',
        'ACCESS_DENIED': 'accès refusé',
        # Compatibilité anciennes actions
        'connexion': 's\'est connecté',
        'deconnexion': 's\'est déconnecté',
        'creation': 'a créé',
        'modification': 'a modifié',
        'suppression': 'a supprimé',
        'consultation': 'a consulté',
    }
    action_verb = action_map.get(action, f'a effectué une action sur')
    
    narrative = f"L'utilisateur {user} {action_verb} {resource} le {date_str} à {time_str}."
    
    # Ajouter l'IP si disponible
    if metadata.get('ip_address'):
        narrative = narrative.rstrip('.') + f" depuis l'adresse IP {metadata['ip_address']}."
    
    # Calculer le niveau de risque
    action_lower = action.lower()
    if action_lower in ['suppression', 'delete', 'deconnexion', 'logout']:
        risk_level = 'élevé'
    elif action_lower in ['modification', 'update', 'creation', 'create']:
        resource_lower = resource.lower()
        if any(keyword in resource_lower for keyword in ['utilisateur', 'admin', 'permission', 'role']):
            risk_level = 'élevé'
        else:
            risk_level = 'moyen'
    else:
        risk_level = 'faible'
    
    # Identifier les champs manquants
    missing = []
    if not metadata.get('ip_address'):
        missing.append('ip_address')
    if not metadata.get('user_agent'):
        missing.append('user_agent')
    if not metadata.get('resource_id'):
        missing.append('resource_id')
    if not metadata.get('details'):
        missing.append('details')
    
    return {
        'narrative_public': narrative,
        'narrative_admin': narrative,
        'confidence': 50
        'risk_level': risk_level,
        'missing_fields': missing
    }
