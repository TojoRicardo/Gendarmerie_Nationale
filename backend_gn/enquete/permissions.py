"""
Permissions personnalisées pour les enquêtes par rôle
ADMIN : accès total
ENQUETEUR : créer, modifier, clôturer ses enquêtes
ANALYSTE : lecture + statistiques
OBSERVATEUR : lecture seule
"""

from rest_framework.permissions import BasePermission
from utilisateur.permissions import user_is_app_admin, has_permission


def _get_user_role(user):
    """Normalise le rôle de l'utilisateur"""
    if not user or not user.is_authenticated:
        return None
    role = getattr(user, 'role', None) or ''
    role_upper = role.strip().upper()
    
    # Mapping des rôles
    if 'ADMIN' in role_upper or user.is_superuser or user.is_staff:
        return 'ADMIN'
    if 'ENQUETEUR' in role_upper or 'ENQUÊTEUR' in role_upper:
        return 'ENQUETEUR'
    if 'ANALYSTE' in role_upper:
        return 'ANALYSTE'
    if 'OBSERVATEUR' in role_upper:
        return 'OBSERVATEUR'
    
    # Par défaut, considérer comme OBSERVATEUR pour la sécurité
    return 'OBSERVATEUR'


class HasEnquetePermission(BasePermission):
    """
    Permission de base pour les enquêtes selon les rôles
    """
    action = None  # 'read', 'create', 'update', 'delete', 'cloture'
    
    def has_permission(self, request, view):
        """Vérifie la permission au niveau de la vue"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = _get_user_role(request.user)
        
        # ADMIN : accès total
        if user_role == 'ADMIN':
            return True
        
        # Permissions selon le rôle
        if self.action == 'read':
            # Tous les rôles peuvent lire
            return True
        elif self.action == 'create':
            # ENQUETEUR et ADMIN peuvent créer
            return user_role == 'ENQUETEUR'
        elif self.action in ['update', 'cloture']:
            # ENQUETEUR et ADMIN peuvent modifier/clôturer
            return user_role == 'ENQUETEUR'
        elif self.action == 'delete':
            # Seul ADMIN peut supprimer
            return user_role == 'ADMIN'
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Vérifie la permission au niveau de l'objet"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = _get_user_role(request.user)
        
        # ADMIN : accès total
        if user_role == 'ADMIN':
            return True
        
        # ENQUETEUR : seulement ses enquêtes
        if user_role == 'ENQUETEUR':
            # Vérifier si l'utilisateur est l'enquêteur responsable ou principal
            responsable = getattr(obj, 'enqueteur_responsable', None) or getattr(obj, 'enqueteur_principal', None)
            if responsable == request.user:
                return True
            
            # Vérifier si l'utilisateur est dans les enquêteurs associés
            enqueteurs_associes = getattr(obj, 'enqueteurs_associes', None)
            if enqueteurs_associes and hasattr(enqueteurs_associes, 'all'):
                if request.user in enqueteurs_associes.all():
                    return True
            
            # Vérifier si c'est le créateur
            cree_par = getattr(obj, 'cree_par', None)
            if cree_par == request.user:
                return True
            
            return False
        
        # ANALYSTE et OBSERVATEUR : lecture seule
        if user_role in ['ANALYSTE', 'OBSERVATEUR']:
            return self.action == 'read'
        
        return False


class CanReadEnquete(HasEnquetePermission):
    """Permission pour lire les enquêtes (tous les rôles)"""
    action = 'read'


class CanCreateEnquete(HasEnquetePermission):
    """Permission pour créer des enquêtes (ADMIN, ENQUETEUR)"""
    action = 'create'


class CanUpdateEnquete(HasEnquetePermission):
    """Permission pour modifier des enquêtes (ADMIN, ENQUETEUR sur ses enquêtes)"""
    action = 'update'


class CanClotureEnquete(HasEnquetePermission):
    """Permission pour clôturer des enquêtes (ADMIN, ENQUETEUR sur ses enquêtes)"""
    action = 'cloture'


class CanDeleteEnquete(HasEnquetePermission):
    """Permission pour supprimer des enquêtes (ADMIN uniquement)"""
    action = 'delete'


class CanModifyEnquete(BasePermission):
    """
    Permission pour modifier une enquête.
    Autorise :
    - Les administrateurs
    - Les Enquêteurs Principaux (toutes les enquêtes)
    - Les Enquêteurs (enquêtes assignées uniquement)
    """
    message = "Vous n'êtes pas autorisé à modifier cette enquête."

    def has_permission(self, request, view):
        """Vérifie la permission au niveau de la vue"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Vérifier la permission investigations.edit
        return has_permission(request.user, 'investigations.edit')
    
    def has_object_permission(self, request, view, obj):
        """Vérifie la permission au niveau de l'objet"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Enquêteurs Principaux peuvent modifier toutes les enquêtes
        user_role = (getattr(request.user, 'role', '') or '').strip()
        if user_role == 'Enquêteur Principal':
            return has_permission(request.user, 'investigations.edit')
        
        # Enquêteurs peuvent modifier uniquement les enquêtes assignées
        if user_role in ['Enquêteur', 'Enquêteur Junior']:
            if not has_permission(request.user, 'investigations.edit'):
                return False
            
            # Vérifier si l'enquête est liée à une fiche assignée
            if hasattr(obj, 'dossier'):
                from criminel.models import InvestigationAssignment
                assignment = InvestigationAssignment.objects.filter(
                    fiche=obj.dossier,
                    assigned_investigator=request.user,
                    status__in=['en_attente', 'en_cours', 'confirmee']
                ).first()
                
                if assignment:
                    return True
            
            # Si pas d'assignation, vérifier si c'est le créateur
            if hasattr(obj, 'enqueteur') and obj.enqueteur == request.user:
                return True
            
            return False
        
        # Pour les autres rôles, vérifier uniquement la permission
        return has_permission(request.user, 'investigations.edit')


class CanModifyPreuve(BasePermission):
    """
    Permission pour modifier une preuve.
    Autorise :
    - Les administrateurs
    - Les Enquêteurs Principaux (toutes les preuves)
    - Les Enquêteurs (preuves liées à leurs enquêtes assignées)
    """
    message = "Vous n'êtes pas autorisé à modifier cette preuve."

    def has_permission(self, request, view):
        """Vérifie la permission au niveau de la vue"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Vérifier la permission evidence.manage
        return has_permission(request.user, 'evidence.manage')
    
    def has_object_permission(self, request, view, obj):
        """Vérifie la permission au niveau de l'objet"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Administrateurs ont tous les droits
        if user_is_app_admin(request.user):
            return True
        
        # Enquêteurs Principaux peuvent modifier toutes les preuves
        user_role = (getattr(request.user, 'role', '') or '').strip()
        if user_role == 'Enquêteur Principal':
            return has_permission(request.user, 'evidence.manage')
        
        # Enquêteurs peuvent modifier uniquement les preuves liées à leurs enquêtes
        if user_role in ['Enquêteur', 'Enquêteur Junior']:
            if not has_permission(request.user, 'evidence.manage'):
                return False
            
            # Vérifier si la preuve est liée à une fiche assignée
            if hasattr(obj, 'dossier'):
                from criminel.models import InvestigationAssignment
                assignment = InvestigationAssignment.objects.filter(
                    fiche=obj.dossier,
                    assigned_investigator=request.user,
                    status__in=['en_attente', 'en_cours', 'confirmee']
                ).first()
                
                if assignment:
                    return True
            
            # Si pas d'assignation, vérifier si c'est le créateur
            if hasattr(obj, 'enqueteur') and obj.enqueteur == request.user:
                return True
            
            return False
        
        # Pour les autres rôles, vérifier uniquement la permission
        return has_permission(request.user, 'evidence.manage')

