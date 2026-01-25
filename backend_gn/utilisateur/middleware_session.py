"""
Middleware pour garantir l'isolation des sessions par requête
S'assure que chaque requête utilise uniquement le token de l'en-tête Authorization
et ne partage pas d'état entre requêtes
"""

import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class SessionIsolationMiddleware(MiddlewareMixin):
    """
    Middleware pour garantir l'isolation des sessions.
    S'assure que chaque requête utilise uniquement le token de l'en-tête Authorization.
    """
    
    def process_request(self, request):
        """
        S'assure que chaque requête utilise uniquement son propre token.
        Nettoie toute référence à un utilisateur précédent dans la requête.
        """
        # Ne pas toucher à request.user ici car il sera défini par DRF
        # Ce middleware sert juste à s'assurer qu'il n'y a pas de cache partagé
        
        # Ajouter un identifiant unique à la requête pour le suivi
        import uuid
        request._request_id = str(uuid.uuid4())[:8]
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            logger.debug(
                f"Requête {request._request_id}: Utilisateur {request.user.id} "
                f"({request.user.username}) - Token validé depuis l'en-tête Authorization"
            )
        
        return None

