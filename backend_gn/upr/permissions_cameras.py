"""
Permissions personnalisées pour les endpoints caméras.
Authentification par API key pour le service multi-caméras.
"""

from rest_framework import permissions
from django.conf import settings
import os


class APIKeyPermission(permissions.BasePermission):
    """
    Permission basée sur une clé API dans le header Authorization.
    Format: Bearer <api_key>
    """
    
    def has_permission(self, request, view):
        # Vérifier la clé API depuis les variables d'environnement
        api_key = os.getenv('UPR_API_KEY', getattr(settings, 'UPR_API_KEY', None))
        
        if not api_key:
            # Si pas de clé configurée, autoriser (mode dev)
            return True
        
        # Extraire le token du header Authorization
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return False
        
        token = auth_header.replace('Bearer ', '').strip()
        
        # Comparer avec la clé configurée
        return token == api_key

