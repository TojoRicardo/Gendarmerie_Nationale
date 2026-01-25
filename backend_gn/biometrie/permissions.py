"""
Permissions personnalisées pour le module Biometrie
"""
from rest_framework import permissions


class BiometrieBasePermission(permissions.BasePermission):
    """
    Permission de base pour la biométrie
    """
    
    def has_permission(self, request, view):
        # Les utilisateurs non authentifiés n'ont aucun accès
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Les superutilisateurs ont tous les droits
        if request.user.is_superuser:
            return True
        
        # Vérifier que l'utilisateur est actif
        if not request.user.is_active:
            return False
        
        return True


class CanViewBiometrie(BiometrieBasePermission):
    """
    Permission pour consulter les données biométriques
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Lecture seule pour les méthodes GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            # Tous les utilisateurs authentifiés peuvent voir les données biométriques
            role = getattr(request.user, 'role', None)
            if role:  # Si l'utilisateur a un rôle, il peut lire
                return True
            return request.user.has_perm('biometrie.view_biometriephoto') or \
                   request.user.has_perm('biometrie.view_biometrieempreinte')
        
        return False


class CanAddBiometrie(BiometrieBasePermission):
    """
    Permission pour ajouter des données biométriques
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        if request.method == 'POST':
            # Autoriser les rôles qui peuvent ajouter des données biométriques
            role = getattr(request.user, 'role', None)
            allowed_roles = ['Administrateur Système', 'Enquêteur Principal', 'Analyste']
            return role in allowed_roles or request.user.has_perm('biometrie.add_biometriephoto') or \
                   request.user.has_perm('biometrie.add_biometrieempreinte')
        
        return True


class CanChangeBiometrie(BiometrieBasePermission):
    """
    Permission pour modifier des données biométriques
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        if request.method in ['PUT', 'PATCH']:
            return request.user.has_perm('biometrie.change_biometriephoto') or \
                   request.user.has_perm('biometrie.change_biometrieempreinte')
        
        return True


class CanDeleteBiometrie(BiometrieBasePermission):
    """
    Permission pour supprimer des données biométriques
    Nécessite des permissions spéciales
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Seuls les utilisateurs avec permission explicite peuvent supprimer
        if request.method == 'DELETE' or view.action in ['supprimer', 'supprimer_securise']:
            # Vérifier les permissions Django
            can_delete = request.user.has_perm('biometrie.delete_biometriephoto') or \
                        request.user.has_perm('biometrie.delete_biometrieempreinte')
            
            if hasattr(request.user, 'role'):
                # Seuls les administrateurs et les superviseurs peuvent supprimer
                can_delete = can_delete and request.user.role in ['ADMIN', 'SUPERVISEUR']
            
            return can_delete
        
        return True


class CanUseReconnaissanceFaciale(BiometrieBasePermission):
    """
    Permission pour utiliser la reconnaissance faciale
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Vérifier la permission spécifique pour la reconnaissance faciale
        if hasattr(request.user, 'role'):
            # Rôles autorisés pour la reconnaissance faciale
            roles_autorises = ['ADMIN', 'SUPERVISEUR', 'ENQUETEUR', 'ANALYSTE']
            return request.user.role in roles_autorises
        
        # Si pas de système de rôles, vérifier les permissions Django
        return request.user.has_perm('biometrie.can_use_facial_recognition')


class CanViewHistorique(BiometrieBasePermission):
    """
    Permission pour consulter l'historique et l'audit
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # L'historique est sensible, seuls certains rôles peuvent y accéder
        if hasattr(request.user, 'role'):
            roles_autorises = ['ADMIN', 'SUPERVISEUR', 'AUDITEUR']
            return request.user.role in roles_autorises
        
        # Ou avoir la permission Django
        return request.user.has_perm('biometrie.view_biometriehistorique')


class CanManageEncodages(BiometrieBasePermission):
    """
    Permission pour gérer les encodages faciaux (recalcul, etc.)
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Actions sensibles réservées aux administrateurs et techniciens
        if hasattr(request.user, 'role'):
            roles_autorises = ['ADMIN', 'TECHNICIEN']
            return request.user.role in roles_autorises
        
        return request.user.is_superuser


class BiometriePermissions(permissions.BasePermission):
    """
    Permission combinée qui gère tous les cas d'usage
    """
    
    def has_permission(self, request, view):
        # Vérifier l'authentification de base
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superutilisateurs ont tous les droits
        if request.user.is_superuser:
            return True
        
        # Utilisateur doit être actif
        if not request.user.is_active:
            return False
        
        # Mapper les actions aux permissions
        action_permissions = {
            # Lecture
            'list': CanViewBiometrie(),
            'retrieve': CanViewBiometrie(),
            'par_criminel': CanViewBiometrie(),
            
            # Création
            'create': CanAddBiometrie(),
            
            # Modification
            'update': CanChangeBiometrie(),
            'partial_update': CanChangeBiometrie(),
            'definir_principale': CanChangeBiometrie(),
            'activer': CanChangeBiometrie(),
            'desactiver': CanChangeBiometrie(),
            
            # Suppression
            'destroy': CanDeleteBiometrie(),
            'supprimer': CanDeleteBiometrie(),
            'supprimer_securise': CanDeleteBiometrie(),
            
            # Reconnaissance faciale
            'rechercher': CanUseReconnaissanceFaciale(),
            'comparer_avec_criminel': CanUseReconnaissanceFaciale(),
            'generer_encodage': CanUseReconnaissanceFaciale(),
            
            # Encodages
            'mettre_a_jour_encodages': CanManageEncodages(),
            
            # Historique
            'historique': CanViewHistorique(),
            'par_utilisateur': CanViewHistorique(),
            'statistiques': CanViewHistorique(),
        }
        
        # Obtenir l'action courante
        action = view.action if hasattr(view, 'action') else None
        
        # Appliquer la permission correspondante
        if action in action_permissions:
            permission_class = action_permissions[action]
            return permission_class.has_permission(request, view)
        
        # Par défaut, nécessite au moins la permission de lecture
        return CanViewBiometrie().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        """
        Permission au niveau objet
        """
        # Superutilisateurs ont tous les droits
        if request.user.is_superuser:
            return True
        
        # Les utilisateurs ne peuvent voir que les données de leur juridiction
        if hasattr(request.user, 'juridiction') and hasattr(obj, 'criminel'):
            if hasattr(obj.criminel, 'juridiction'):
                return request.user.juridiction == obj.criminel.juridiction
        
        # Par défaut, autoriser si la permission de base est OK
        return True


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission personnalisée pour autoriser uniquement le créateur à modifier
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Écriture uniquement pour le créateur ou les admins
        if hasattr(obj, 'capture_par'):
            return obj.capture_par == request.user or request.user.is_superuser
        
        if hasattr(obj, 'enregistre_par'):
            return obj.enregistre_par == request.user or request.user.is_superuser
        
        if hasattr(obj, 'execute_par'):
            return obj.execute_par == request.user or request.user.is_superuser
        
        return request.user.is_superuser

