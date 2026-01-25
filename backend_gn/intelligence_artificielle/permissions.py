"""
Permissions pour le module d'intelligence artificielle
Gestion des accès basée sur les rôles (Admin, Enquêteur, Analyste)
"""

from rest_framework import permissions


class IsAdminOrAnalyst(permissions.BasePermission):
    """
    Permission pour les administrateurs et analystes
    """
    allowed_roles = {
        'admin',
        'analyste',
        'Administrateur Système',
        'Analyste',
        'Enquêteur Principal'
    }
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        return user_role in self.allowed_roles or request.user.is_superuser


class IsAdminOnly(permissions.BasePermission):
    """
    Permission uniquement pour les administrateurs
    """
    allowed_roles = {
        'admin',
        'Administrateur Système'
    }
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        return user_role in self.allowed_roles or request.user.is_superuser


class IsInvestigatorOrAnalyst(permissions.BasePermission):
    """
    Permission pour les enquêteurs et analystes
    """
    allowed_roles = {
        'admin',
        'enqueteur',
        'analyste',
        'Administrateur Système',
        'Enquêteur Principal',
        'Enquêteur',
        'Analyste'
    }
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        return user_role in self.allowed_roles or request.user.is_superuser


class CanViewAIResults(permissions.BasePermission):
    """
    Permission pour visualiser les résultats IA
    Tous les utilisateurs authentifiés peuvent voir les résultats
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class CanTrainModels(permissions.BasePermission):
    """
    Permission pour entraîner les modèles IA
    Uniquement les administrateurs
    """
    allowed_roles = {
        'admin',
        'Administrateur Système'
    }
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        return user_role in self.allowed_roles or request.user.is_superuser

