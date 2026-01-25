"""
Permissions personnalisées pour les actions sur les rôles et permissions
"""

from rest_framework.permissions import BasePermission
from .permissions import has_role_permission


class CanManageRoles(BasePermission):
    """
    Permission pour gérer les rôles (créer, modifier, supprimer)
    Nécessite la permission 'roles.gerer'
    """
    message = "Vous n'avez pas la permission de gérer les rôles."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role_permission(request.user, 'roles.gerer')


class CanViewRoles(BasePermission):
    """
    Permission pour consulter les rôles
    Nécessite la permission 'roles.consulter'
    """
    message = "Vous n'avez pas la permission de consulter les rôles."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role_permission(request.user, 'roles.consulter')


class CanViewPermissions(BasePermission):
    """
    Permission pour consulter les permissions
    Tous les utilisateurs authentifiés peuvent consulter les permissions
    """
    message = "Vous devez être authentifié pour consulter les permissions."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

