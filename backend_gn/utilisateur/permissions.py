"""
Permissions personnalisées pour le système SGIC
Gestion des permissions par rôle
"""

from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model

from .models import ADMIN_ROLE_CODES, normalize_role_value

User = get_user_model()

# Cache pour stocker les permissions "gelées" des utilisateurs existants
# Utilisé pour conserver les permissions retirées d'un rôle pour les utilisateurs existants
USER_PERMISSIONS_CACHE = {}


def user_is_app_admin(user):
    """
    Vérifie si l'utilisateur possède un rôle administrateur
    (superuser, staff ou rôle applicatif admin).
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False

    if user.is_superuser or getattr(user, 'is_staff', False):
        return True

    role_value = normalize_role_value(getattr(user, 'role', None))
    role_code = normalize_role_value(getattr(user, 'role_code', None))
    return role_value in ADMIN_ROLE_CODES or role_code in ADMIN_ROLE_CODES


class IsAdminUserRole(BasePermission):
    """
    Permission simple basée sur le rôle applicatif.
    Autorise uniquement les utilisateurs dont le rôle est administrateur.
    """
    message = "Permission refusée : seuls les administrateurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        return user_is_app_admin(getattr(request, 'user', None))

ROLES_PREDEFINIS = {
    'admin': {
        'permissions': ['*'],
        'description': 'Administrateur applicatif avec tous les droits',
    },
    'Administrateur Système': {
        'permissions': ['*'],  # Tous les droits
        'description': 'Administrateur système avec tous les droits'
    },
    'Enquêteur Principal': {
        'permissions': [
            # Tableau de bord
            'dashboard.view',
            # Fiches criminelles
            'fiches.view',
            'fiches.create',
            'fiches.edit',
            'fiches.delete',
            # Biométrie
            'biometrie.view',
            'biometrie.add',
            'biometrie.edit',
            # Rapports
            'reports.view',
            'reports.create',
            'reports.export',
            # Intelligence Artificielle
            'ia.view_results',
            'ia.use_recognition',
            'ia.use_prediction',
            # Enquêtes
            'investigations.view',
            'investigations.create',
            'investigations.edit',
            'investigations.close',
            # Suspects
            'suspects.view',
            'suspects.create',
            'suspects.edit',
            # Preuves
            'evidence.view',
            'evidence.manage',
            # Analyses
            'analytics.view',
            # Notifications
            'notifications.view',
        ],
        'description': 'Enquêteur principal avec droits de modification'
    },
    'Enquêteur': {
        'permissions': [
            'dashboard.view',
            'fiches.view',
            'fiches.create',
            'fiches.edit',
            'biometrie.view',
            'biometrie.add',
            'reports.view',
            'reports.create',
            'ia.view_results',
            'ia.use_recognition',
            'investigations.view',
            'notifications.view',
        ],
        'description': 'Enquêteur avec droits de base'
    },
    'Enquêteur Junior': {
        'permissions': [
            'dashboard.view',
            'fiches.view',
            'biometrie.view',
            'reports.view',
            'ia.view_results',
            'investigations.view',
            'notifications.view',
        ],
        'description': 'Enquêteur junior avec droits de consultation'
    },
    'Analyste': {
        'permissions': [
            'dashboard.view',
            'fiches.view',
            'biometrie.view',
            'reports.view',
            'reports.create',
            'reports.export',
            'ia.view_results',
            'ia.use_prediction',
            'audit.view_own',
            'analytics.view',
            'evidence.view',
            'notifications.view',
        ],
        'description': 'Analyste avec droits d\'analyse'
    },
    'Observateur': {
        'permissions': [
            'dashboard.view',
            'fiches.view',
            'biometrie.view',
            'reports.view',
            'reports.export',
            'notifications.view',
            'ia.view_results',
            'investigations.view',
            'suspects.view',
            'evidence.view',
        ],
        'description': 'Observateur avec droits de consultation uniquement'
    },
}

PERMISSIONS = {
    'view_utilisateur': 'Voir les utilisateurs',
    'add_utilisateur': 'Créer des utilisateurs',
    'change_utilisateur': 'Modifier les utilisateurs',
    'delete_utilisateur': 'Supprimer les utilisateurs',
    'view_criminel': 'Voir les fiches criminelles',
    'add_criminel': 'Créer des fiches criminelles',
    'change_criminel': 'Modifier les fiches criminelles',
    'delete_criminel': 'Supprimer les fiches criminelles',
    'view_rapport': 'Voir les rapports',
    'add_rapport': 'Créer des rapports',
    'change_rapport': 'Modifier les rapports',
    'delete_rapport': 'Supprimer les rapports',
    
    'dashboard.view': 'Voir le tableau de bord',
    'fiches.view': 'Consulter les fiches criminelles',
    'fiches.create': 'Créer des fiches criminelles',
    'fiches.edit': 'Modifier les fiches criminelles',
    'fiches.delete': 'Supprimer les fiches criminelles',
    'biometrie.view': 'Consulter les données biométriques',
    'biometrie.add': 'Ajouter des données biométriques',
    'biometrie.edit': 'Modifier les données biométriques',
    'biometrie.delete': 'Supprimer les données biométriques',
    'reports.view': 'Consulter les rapports',
    'reports.create': 'Générer des rapports',
    'reports.export': 'Exporter des rapports',
    'notifications.view': 'Consulter les notifications',
    'ia.view_results': 'Voir les résultats IA',
    'ia.use_recognition': 'Utiliser la reconnaissance faciale',
    'ia.use_prediction': 'Utiliser l\'analyse prédictive',
    'audit.view': 'Consulter le journal d\'audit',
    'audit.view_own': 'Voir ses propres actions',
    'audit.view_all': 'Voir toutes les actions',
    'users.view': 'Consulter les utilisateurs',
    'users.create': 'Créer des utilisateurs',
    'users.edit': 'Modifier des utilisateurs',
    'users.delete': 'Supprimer des utilisateurs',
    'roles.view': 'Consulter les rôles',
    'roles.manage': 'Gérer les rôles et permissions',
    'investigations.view': 'Voir les enquêtes',
    'investigations.create': 'Créer des enquêtes',
    'investigations.edit': 'Modifier les enquêtes',
    'investigations.close': 'Clôturer les enquêtes',
    'suspects.view': 'Voir les suspects',
    'suspects.create': 'Créer des suspects',
    'suspects.edit': 'Modifier les suspects',
    'evidence.view': 'Voir les preuves',
    'evidence.manage': 'Gérer les preuves',
    'analytics.view': 'Voir les analyses',
}


def get_user_permissions(user):
    """
    Récupère les permissions d'un utilisateur selon son rôle
    Si l'utilisateur a des permissions "gelées" (stockées dans le cache),
    elles sont fusionnées avec les permissions actuelles du rôle
    """
    if not user or not user.is_authenticated:
        return []
    
    # Administrateur Système a tous les droits
    if user_is_app_admin(user):
        return ['*']
    
    # Récupérer les permissions selon le rôle
    role_value = (getattr(user, 'role', '') or '').strip()
    role_permissions = []
    if role_value and role_value in ROLES_PREDEFINIS:
        role_permissions = ROLES_PREDEFINIS[role_value].get('permissions', [])
    
    user_id = getattr(user, 'id', None)
    if user_id and user_id in USER_PERMISSIONS_CACHE:
        # Fusionner les permissions du rôle avec les permissions gelées
        frozen_permissions = USER_PERMISSIONS_CACHE[user_id]
        # Union des permissions : on garde les permissions gelées + les nouvelles permissions du rôle
        merged_permissions = set(role_permissions) | frozen_permissions
        return list(merged_permissions)
    
    return role_permissions


def freeze_user_permissions(user, permissions_to_freeze):
    """
    "Gèle" (conserve) certaines permissions pour un utilisateur
    Utilisé quand on retire une permission d'un rôle pour garder cette permission pour l'utilisateur existant
    """
    if not user or not hasattr(user, 'id'):
        return
    
    user_id = user.id
    if user_id not in USER_PERMISSIONS_CACHE:
        USER_PERMISSIONS_CACHE[user_id] = set()
    
    # Ajouter les permissions à conserver
    USER_PERMISSIONS_CACHE[user_id].update(permissions_to_freeze)


def clear_user_permissions_cache(user_id=None):
    """
    Nettoie le cache des permissions utilisateur
    Si user_id est fourni, nettoie uniquement pour cet utilisateur
    """
    global USER_PERMISSIONS_CACHE
    if user_id:
        USER_PERMISSIONS_CACHE.pop(user_id, None)
    else:
        USER_PERMISSIONS_CACHE.clear()


def has_permission(user, permission_code):
    """
    Vérifie si un utilisateur a une permission spécifique
    """
    permissions = get_user_permissions(user)
    
    # Si l'utilisateur a tous les droits
    if '*' in permissions:
        return True
    
    # Vérifier la permission spécifique
    return permission_code in permissions


def get_role_permissions(role_name):
    """
    Récupère les permissions d'un rôle
    """
    return ROLES_PREDEFINIS.get(role_name, {}).get('permissions', [])


def has_role_permission(user, permission_code):
    """
    Vérifie si un utilisateur a une permission spécifique liée aux rôles
    """
    if not user or not user.is_authenticated:
        return False
    
    # Superuser et admin système ont toutes les permissions
    if user_is_app_admin(user):
        return True
    
    # Vérifier les permissions selon le rôle
    user_permissions = get_user_permissions(user)
    if '*' in user_permissions:
        return True
    
    return permission_code in user_permissions
