"""
Permissions personnalisées pour les fiches criminelles
"""

from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from utilisateur.permissions import user_is_app_admin, has_permission


class CanModifyFicheCriminelle(BasePermission):
    """
    Permission pour modifier une fiche criminelle.
    Autorise :
    - Les administrateurs
    - Les Enquêteurs Principaux (toutes les fiches)
    - Les Enquêteurs (fiches assignées uniquement)
    Note : Enquêteur Junior = consultation uniquement, pas de modification.
    """
    message = "Vous n'êtes pas autorisé à modifier cette fiche criminelle."

    def has_permission(self, request, view):
        """Vérifie la permission au niveau de la vue"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Vérifier la permission fiches.edit
        return has_permission(request.user, 'fiches.edit')
    
    def has_object_permission(self, request, view, obj):
        """Vérifie la permission au niveau de l'objet"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Enquêteurs Principaux peuvent modifier toutes les fiches
        user_role = (getattr(request.user, 'role', '') or '').strip()
        if user_role == 'Enquêteur Principal':
            return has_permission(request.user, 'fiches.edit')
        
        # Enquêteurs peuvent modifier uniquement les fiches assignées (Junior = consultation seule)
        if user_role == 'Enquêteur':
            if not has_permission(request.user, 'fiches.edit'):
                return False
            
            # Vérifier si la fiche est assignée à cet enquêteur
            from criminel.models import InvestigationAssignment
            assignment = InvestigationAssignment.objects.filter(
                fiche=obj,
                assigned_investigator=request.user,
                status__in=['en_attente', 'en_cours', 'confirmee']
            ).first()
            
            if assignment:
                return True
            
            # Si pas d'assignation, vérifier si c'est le créateur
            if hasattr(obj, 'created_by') and obj.created_by == request.user:
                return True
            
            return False
        
        # Pour les autres rôles, vérifier uniquement la permission
        return has_permission(request.user, 'fiches.edit')


class CanDeleteFicheCriminelle(BasePermission):
    """
    Permission pour archiver une fiche criminelle (soft delete).
    Autorise :
    - Les administrateurs (toutes les fiches)
    - Les Enquêteurs Principaux (toutes les fiches)
    - Les Enquêteurs (leurs propres fiches ou fiches assignées uniquement)
    Note : Enquêteur Junior = consultation uniquement, pas d'archivage.
    """
    message = "Vous n'êtes pas autorisé à archiver cette fiche criminelle."

    def has_permission(self, request, view):
        """Vérifie la permission au niveau de la vue"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Vérifier la permission fiches.delete
        return has_permission(request.user, 'fiches.delete')
    
    def has_object_permission(self, request, view, obj):
        """Vérifie la permission au niveau de l'objet"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Enquêteurs Principaux peuvent archiver toutes les fiches
        user_role = (getattr(request.user, 'role', '') or '').strip()
        if user_role == 'Enquêteur Principal':
            return has_permission(request.user, 'fiches.delete')
        
        # Enquêteurs peuvent archiver uniquement leurs propres fiches ou fiches assignées (Junior = non)
        if user_role == 'Enquêteur':
            if not has_permission(request.user, 'fiches.delete'):
                return False
            
            # Vérifier si c'est le créateur de la fiche
            if hasattr(obj, 'created_by') and obj.created_by == request.user:
                return True
            
            # Vérifier si la fiche est assignée à cet enquêteur
            from criminel.models import InvestigationAssignment
            assignment = InvestigationAssignment.objects.filter(
                fiche=obj,
                assigned_investigator=request.user,
                status__in=['en_attente', 'en_cours', 'confirmee']
            ).first()
            
            if assignment:
                return True
            
            return False
        
        # Pour les autres rôles, vérifier uniquement la permission
        return has_permission(request.user, 'fiches.delete')

