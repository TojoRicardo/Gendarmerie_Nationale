"""
Fonction principale pour enregistrer les actions d'audit avec le nouveau format professionnel.
"""

from django.utils import timezone
from .models import AuditLog, UserSession
from .reference_generator import generate_audit_reference
from .middleware import get_role
from .user_agent_parser import get_ip_from_request, parse_user_agent
import logging

logger = logging.getLogger(__name__)


def register_audit(request, action_type, resource, before=None, after=None, **kwargs):
    """
    Enregistre une action d'audit avec le nouveau format professionnel.
    
    Args:
        request: Objet HttpRequest Django
        action_type: Type d'action (ex: 'PIN_VALIDATION', 'UPDATE', 'DELETE')
        resource: Description de la ressource (ex: 'Système #34', 'Fiche Criminelle #216')
        before: Description ou données avant l'action (optionnel)
        after: Description ou données après l'action (optionnel)
        **kwargs: Arguments supplémentaires (content_type, object_id, etc.)
        
    Returns:
        AuditLog: Instance créée ou None en cas d'erreur
    """
    try:
        # Vérifier que l'utilisateur est authentifié
        if not request.user or not request.user.is_authenticated:
            logger.debug("Tentative d'enregistrement d'audit pour un utilisateur non authentifié")
            return None
        
        # Récupérer la session utilisateur
        session = getattr(request, 'current_user_session', None)
        
        # Générer la référence audit professionnelle
        audit_ref, op_index = generate_audit_reference(request.user)
        
        # Obtenir le rôle de l'utilisateur
        user_role = get_role(request.user)
        
        # Extraire les informations du navigateur
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        ip_address = get_ip_from_request(request)
        
        browser = None
        os_info = None
        if user_agent:
            try:
                ua_info = parse_user_agent(user_agent)
                browser = ua_info.get('navigateur', '')
                os_info = ua_info.get('systeme', '')
            except Exception as e:
                logger.debug(f"Erreur lors du parsing user-agent: {e}")
        
        # Préparer les données de description
        description_before = None
        description_after = None
        
        if before:
            if isinstance(before, dict):
                import json
                description_before = json.dumps(before, ensure_ascii=False, indent=2)
            else:
                description_before = str(before)
        
        if after:
            if isinstance(after, dict):
                import json
                description_after = json.dumps(after, ensure_ascii=False, indent=2)
            else:
                description_after = str(after)
        
        # Créer l'entrée d'audit
        audit_entry = AuditLog.objects.create(
            user=request.user,
            session=session,
            action=action_type,
            user_role=user_role,
            resource_type=kwargs.get('resource_type'),
            resource_id=kwargs.get('resource_id'),
            content_type=kwargs.get('content_type'),
            object_id=kwargs.get('object_id'),
            endpoint=kwargs.get('endpoint') or request.path,
            method=kwargs.get('method') or request.method,
            ip_address=ip_address,
            user_agent=user_agent,
            browser=browser,
            os=os_info,
            before=kwargs.get('before_data'),
            after=kwargs.get('after_data'),
            description_before=description_before,
            description_after=description_after,
            reference=audit_ref,
            operation_index=op_index,
            start_time=session.start_time if session else timezone.now(),
            end_time=session.end_time if session and session.end_time else None,
            reussi=kwargs.get('reussi', True),
            message_erreur=kwargs.get('message_erreur'),
        )
        
        logger.debug(f"Audit enregistré: {audit_ref} - {action_type} - {resource}")
        return audit_entry
    
    except Exception as e:
        logger.exception(f"Erreur lors de l'enregistrement de l'audit: {e}")
        return None

