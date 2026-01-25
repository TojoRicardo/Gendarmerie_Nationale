"""
Service pour la génération de descriptions narratives d'audit.
Fonctionnalité IA désactivée - utilise un mode de fallback simple.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def generate_narrative(event) -> Dict[str, Any]:
    """
    Génère une description narrative simple pour un événement d'audit (sans IA).
    
    Args:
        event: Instance de AuditEvent ou JournalAudit
        
    Returns:
        Dict avec:
        - narrative_public: Récit narratif simple
        - confidence: Score de confiance (toujours 50 pour fallback)
        - risk_level: Niveau de risque (toujours 'faible' pour fallback)
    """
    logger.debug("Utilisation du mode de fallback pour generate_narrative")
    
    # Générer une description simple sans IA
    user_name = "Système"
    if hasattr(event, 'utilisateur') and event.utilisateur:
        user_name = event.utilisateur.username
    
    action = getattr(event, 'action', 'VIEW')
    ressource = getattr(event, 'ressource', 'Ressource') or getattr(event, 'resource', 'Ressource')
    ip_adresse = getattr(event, 'ip_adresse', None) or getattr(event, 'ip_address', None)
    
    action_verb_map = {
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
    action_verb = action_verb_map.get(action, 'a effectué une action sur')
    
    date_action = getattr(event, 'date_action', None)
    if date_action:
        if isinstance(date_action, datetime):
            date_str = date_action.strftime("%d/%m/%Y à %H:%M:%S")
        else:
            date_str = str(date_action)
        else:
        date_str = datetime.now().strftime("%d/%m/%Y à %H:%M:%S")
    
    ip_info = f" depuis l'adresse IP {ip_adresse}" if ip_adresse else ""
    narrative = f"L'utilisateur {user_name} {action_verb} la ressource '{ressource}'{ip_info}."
    
    return {
        'narrative_public': narrative,
        'confidence': 50,
        'risk_level': 'faible'
    }
