"""
Middleware pour gérer le statut actif/inactif des utilisateurs
"""

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class UserStatusMiddleware(MiddlewareMixin):
    """
    Middleware pour vérifier le statut de l'utilisateur.
    Empêche les utilisateurs inactifs ou suspendus d'accéder au système.
    """
    
    def process_request(self, request):
        """
        Vérifie le statut de l'utilisateur avant de traiter la requête.
        """
        public_paths = [
            '/api/utilisateur/login/',
            '/api/utilisateur/verify-pin/',
            '/api/auth/token/refresh/',
            '/api/auth/token/obtain/',
            '/admin/login/',
        ]
        
        # Vérifier si le chemin est public
        if any(request.path.startswith(path) for path in public_paths):
            return None
        
        # Si l'utilisateur est authentifié, vérifier son statut
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
            
            # Vérifier si l'utilisateur a un statut inactif ou suspendu
            if hasattr(user, 'statut'):
                user_statut = (user.statut or '').strip().lower()
                if user_statut == 'inactif':
                    return JsonResponse(
                        {
                            'error': 'Votre compte est inactif. Veuillez contacter l\'administrateur.',
                            'status': 'inactif'
                        },
                        status=403
                    )
                elif user_statut == 'suspendu':
                    return JsonResponse(
                        {
                            'error': 'Votre compte a été suspendu. Veuillez contacter l\'administrateur.',
                            'status': 'suspendu'
                        },
                        status=403
                    )
        
        return None


def check_inactive_users():
    """
    Ferme les sessions utilisateur ouvertes depuis plus de 30 minutes.
    """
    from datetime import timedelta
    from django.utils import timezone
    from audit.models import UserSession

    threshold = timezone.now() - timedelta(minutes=30)
    stale_sessions = UserSession.objects.filter(end_time__isnull=True, start_time__lt=threshold)
    checked = stale_sessions.count()
    marked = 0
    for session in stale_sessions:
        session.close()
        marked += 1
    return {'checked': checked, 'marked_inactive': marked}

