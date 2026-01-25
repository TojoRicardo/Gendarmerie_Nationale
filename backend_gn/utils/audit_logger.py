"""
Service de logging automatique pour le journal d'audit SGIC (Niveau 1).

Ce module capture automatiquement les actions utilisateur et les enregistre dans JournalAudit.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from django.contrib.auth import get_user_model
from django.db import transaction

logger = logging.getLogger(__name__)

# Importer les modèles et services
try:
    from audit.models import AuditEvent, JournalAudit
    MODELS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Modules d'audit non disponibles: {e}")
    MODELS_AVAILABLE = False


def log_action(
    user: Optional[Any] = None,
    action: str = 'autre',
    resource: str = 'Ressource',
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    endpoint: Optional[str] = None,
    methode_http: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    reussi: bool = True,
    generate_ai: bool = True,
    page_from: Optional[str] = None,
    page_to: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    request: Optional[Any] = None
) -> Optional[Any]:
    """
    Enregistre une action dans le journal d'audit.
    
    Args:
        user: Utilisateur Django (ou None pour système)
        action: Type d'action (login, creation, modification, suppression, etc.)
        resource: Type de ressource concernée
        resource_id: ID de la ressource (optionnel)
        ip_address: Adresse IP (optionnel)
        user_agent: User-Agent (optionnel)
        endpoint: Endpoint API (optionnel)
        methode_http: Méthode HTTP (optionnel)
        details: Détails supplémentaires (optionnel)
        reussi: Si l'action a réussi (défaut: True)
        generate_ai: (Déprécié, ignoré)
        page_from: Page précédente (optionnel)
        page_to: Page actuelle (optionnel)
        old_values: Valeurs avant modification (optionnel)
        new_values: Valeurs après modification (optionnel)
        request: Objet request Django pour extraire automatiquement les infos (optionnel)
    
    Returns:
        JournalAudit créé ou None en cas d'erreur
    """
    
    if not MODELS_AVAILABLE:
        logger.warning("Modèles d'audit non disponibles, action non enregistrée")
        return None
    
    try:
        # Extraire les informations depuis request si fourni
        if request:
            if ip_address is None:
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip_address = x_forwarded_for.split(',')[0]
                else:
                    ip_address = request.META.get('REMOTE_ADDR')
            
            if user_agent is None:
                user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            if endpoint is None:
                endpoint = request.path
            
            if methode_http is None:
                methode_http = request.method
            
            # Extraire page_from et page_to depuis les headers ou referer
            if page_from is None:
                page_from = request.META.get('HTTP_REFERER', '')
                if page_from:
                    # Extraire juste le chemin de la page
                    from urllib.parse import urlparse
                    parsed = urlparse(page_from)
                    page_from = parsed.path
            
            if page_to is None:
                page_to = request.path
        
        # Enrichir les détails avec les nouvelles informations
        enriched_details = details.copy() if details else {}
        if page_from:
            enriched_details['page_from'] = page_from
            enriched_details['previous_page'] = page_from
        if page_to:
            enriched_details['page_to'] = page_to
            enriched_details['current_page'] = page_to
        if old_values:
            enriched_details['old_values'] = old_values
            enriched_details['before'] = old_values
        if new_values:
            enriched_details['new_values'] = new_values
            enriched_details['after'] = new_values
        
        audit_entry = JournalAudit.objects.create(
            utilisateur=user,
            action=action,
            ressource=resource,
            ressource_id=resource_id,
            ip_adresse=ip_address,
            user_agent=user_agent,
            endpoint=endpoint,
            methode_http=methode_http,
            details=enriched_details,
            reussi=reussi,
            date_action=datetime.now()
        )
        
        logger.debug(f"Action enregistrée: {user} - {action} - {resource}")
        return audit_entry
            
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de l'action d'audit: {e}", exc_info=True)
        return None




def log_login(user: Any, ip_address: Optional[str] = None, user_agent: Optional[str] = None, request: Optional[Any] = None) -> Optional[Any]:
    """Enregistre une connexion."""
    return log_action(
        user=user,
        action='connexion',
        resource='Système',
        ip_address=ip_address,
        user_agent=user_agent,
        details={'type': 'login'}
    )


def log_logout(user: Any, ip_address: Optional[str] = None, request: Optional[Any] = None) -> Optional[Any]:
    """Enregistre une déconnexion."""
    return log_action(
        user=user,
        action='deconnexion',
        resource='Système',
        ip_address=ip_address,
        details={'type': 'logout'}
    )


def log_creation(
    user: Any,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    request: Optional[Any] = None
) -> Optional[Any]:
    """Enregistre une création."""
    return log_action(
        user=user,
        action='creation',
        resource=resource,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        old_values=old_values,
        new_values=new_values,
        request=request
    )


def log_modification(
    user: Any,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    request: Optional[Any] = None
) -> Optional[Any]:
    """Enregistre une modification."""
    return log_action(
        user=user,
        action='modification',
        resource=resource,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        old_values=old_values,
        new_values=new_values,
        request=request
    )


def log_suppression(
    user: Any,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> Optional[AuditEvent]:
    """Enregistre une suppression."""
    return log_action(
        user=user,
        action='suppression',
        resource=resource,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address
    )


def log_export(
    user: Any,
    resource: str,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> Optional[AuditEvent]:
    """Enregistre un export."""
    return log_action(
        user=user,
        action='export',
        resource=resource,
        details=details,
        ip_address=ip_address
    )


def log_biometrie(
    user: Any,
    action_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> Optional[AuditEvent]:
    """Enregistre une action biométrique."""
    return log_action(
        user=user,
        action=action_type,
        resource='Biométrie',
        resource_id=resource_id,
        details=details,
        ip_address=ip_address
    )

