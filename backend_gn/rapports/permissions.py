"""
Permissions personnalisées pour le module de rapports
"""
from rest_framework import permissions


class CanAddReport(permissions.BasePermission):
    """
    Permission pour créer un rapport
    Nécessite le rôle admin ou enquêteur
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin et superuser ont toujours accès
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Vérifier le rôle applicatif
        user_role = getattr(request.user, 'role', None)
        if user_role:
            role_lower = str(user_role).lower()
            if 'admin' in role_lower or 'enquêteur' in role_lower or 'enqueteur' in role_lower:
                return True
        
        # Vérifier les permissions Django
        return request.user.has_perm('rapports.add_report')


class CanViewReport(permissions.BasePermission):
    """
    Permission pour consulter un rapport
    Nécessite le rôle admin ou être le propriétaire
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return True  # Tous les utilisateurs authentifiés peuvent voir leurs rapports
    
    def has_object_permission(self, request, view, obj):
        # Admin peut tout voir
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Propriétaire peut voir son rapport
        if obj.generated_by == request.user:
            return True
        
        # Vérifier les permissions Django
        return request.user.has_perm('rapports.view_report')


class CanDeleteReport(permissions.BasePermission):
    """
    Permission pour supprimer un rapport
    Nécessite le rôle admin ou être le propriétaire
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return True  # Vérification au niveau objet
    
    def has_object_permission(self, request, view, obj):
        # Admin peut tout supprimer
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Propriétaire peut supprimer son rapport
        if obj.generated_by == request.user:
            return True
        
        # Vérifier les permissions Django
        return request.user.has_perm('rapports.delete_report')

