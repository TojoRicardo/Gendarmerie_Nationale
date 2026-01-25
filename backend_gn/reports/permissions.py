"""
Permissions personnalisées pour les rapports PDF
"""

from rest_framework.permissions import BasePermission
from utilisateur.permissions import has_permission


class CanGeneratePDF(BasePermission):
    """
    Permission pour générer des PDFs de fiches criminelles.
    Autorise les utilisateurs ayant la permission 'reports.create' ou 'reports.export'
    """
    message = "Vous n'avez pas la permission de générer des PDFs. Permission requise: reports.create ou reports.export"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superuser et admin système ont tous les droits
        if request.user.is_superuser:
            return True
        
        # Vérifier les permissions spécifiques
        # Un utilisateur peut générer un PDF s'il a reports.create OU reports.export
        can_create = has_permission(request.user, 'reports.create')
        can_export = has_permission(request.user, 'reports.export')
        
        return can_create or can_export

