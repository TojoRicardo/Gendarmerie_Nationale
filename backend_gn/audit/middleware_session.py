"""
Middleware pour gérer les sessions utilisateur avec horodatage.
"""

from django.utils import timezone
from .models import UserSession
from .user_agent_parser import get_ip_from_request
from .narrative_audit_service import initialiser_journal_narratif
import logging

logger = logging.getLogger(__name__)


class UserSessionMiddleware:
    """
    Middleware pour créer et gérer les sessions utilisateur.
    Assure qu'une session est créée pour chaque utilisateur authentifié.
    Initialise également le journal narratif si nécessaire.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Créer ou récupérer la session utilisateur si l'utilisateur est authentifié
        if request.user.is_authenticated:
            session_key = request.session.session_key
            
            if session_key:
                try:
                    user_session, created = UserSession.objects.get_or_create(
                        user=request.user,
                        session_key=session_key,
                        defaults={
                            "ip_address": get_ip_from_request(request),
                            "user_agent": request.META.get("HTTP_USER_AGENT", "")
                        }
                    )
                    
                    # Si la session existe déjà, mettre à jour l'IP si nécessaire
                    if not created and user_session.ip_address != get_ip_from_request(request):
                        user_session.ip_address = get_ip_from_request(request)
                        user_session.save(update_fields=['ip_address'])
                    
                    # Initialiser le journal narratif si la session vient d'être créée
                    # ou si elle n'a pas encore de journal narratif
                    if created or not hasattr(user_session, 'journal_narratif'):
                        try:
                            initialiser_journal_narratif(user_session, request)
                        except Exception as e:
                            logger.warning(f"Erreur lors de l'initialisation du journal narratif: {e}")
                    
                    # Attacher la session à la requête pour utilisation ultérieure
                    request.current_user_session = user_session
                except Exception as e:
                    logger.error(f"Erreur lors de la création/récupération de la session: {e}")
                    request.current_user_session = None
            else:
                request.current_user_session = None
        else:
            request.current_user_session = None
        
        response = self.get_response(request)
        return response

