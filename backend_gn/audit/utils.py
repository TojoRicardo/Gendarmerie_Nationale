"""
Utilitaires pour le Journal d'Audit Professionnel
"""

from .models import AuditLog
from .user_agent_parser import parse_user_agent, get_ip_from_request
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
import logging
import json

logger = logging.getLogger(__name__)


def log_action_simple(action, obj=None, additional_info=None):
    """
    Permet de logger manuellement une action spéciale de manière simplifiée :
    SEARCH, DOWNLOAD, ACCESS_DENIED, LOGIN, LOGOUT, etc.
    
    Cette fonction utilise GenericForeignKey pour lier l'action à n'importe quel modèle.
    
    Args:
        action: Type d'action (SEARCH, DOWNLOAD, ACCESS_DENIED, etc.)
        obj: Objet concerné (optionnel)
        additional_info: Informations supplémentaires (optionnel)
    
    Returns:
        Instance AuditLog créée ou None en cas d'erreur
    
    Exemple d'usage:
        from audit.utils import log_action_simple
        
        # Dans une vue pour téléchargement
        def download_fiche(request, fiche_id):
            fiche = get_object_or_404(FicheCriminelle, pk=fiche_id)
            log_action_simple('DOWNLOAD', obj=fiche, additional_info="Téléchargement PDF")
            ...
    """
    try:
        # Import local pour éviter les imports circulaires
        from .middleware import get_current_user, get_role
        
        user = get_current_user()
        if user is None or not user.is_authenticated:
            return None
        
        # Déterminer le content_type et object_id si un objet est fourni
        content_type = None
        object_id = None
        if obj:
            content_type = ContentType.objects.get_for_model(obj)
            object_id = obj.pk
        
        # Récupérer la requête pour IP, User-Agent, endpoint, méthode HTTP
        request = get_current_request()
        endpoint = None
        method = None
        ip_address = None
        user_agent = None
        browser = None
        os = None
        
        if request:
            endpoint = request.path
            method = request.method
            ip_address = get_ip_from_request(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            if user_agent:
                try:
                    ua_info = parse_user_agent(user_agent)
                    browser = ua_info.get('navigateur')
                    os = ua_info.get('systeme')
                except Exception:
                    pass
        
        # Déterminer resource_type depuis l'objet ou l'endpoint
        resource_type = None
        resource_id = None
        if obj:
            resource_type = obj.__class__.__name__
            resource_id = str(obj.pk) if hasattr(obj, 'pk') else None
        elif endpoint:
            resource_type = _extract_resource_type_from_endpoint(endpoint)
            resource_id = _extract_resource_id_from_endpoint(endpoint)
        
        # Créer l'entrée d'audit
        audit_entry = AuditLog.objects.create(
            user=user,
            user_role=get_role(user),
            action=action,
            content_type=content_type,
            object_id=object_id,
            resource_type=resource_type,
            resource_id=resource_id,
            endpoint=endpoint,
            method=method,
            ip_address=ip_address,
            user_agent=user_agent,
            browser=browser,
            os=os,
            additional_info=str(additional_info) if additional_info else None
        )
        
        return audit_entry
        
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de l'action d'audit: {e}", exc_info=True)
        return None


# Alias pour compatibilité avec le code fourni par l'utilisateur
def log_action(
    action=None,
    obj=None,
    additional_info=None,
    request=None,
    user=None,
    resource_type=None,
    resource_id=None,
    endpoint=None,
    method=None,
    ip_address=None,
    user_agent=None,
    browser=None,
    os=None,
    data_before=None,
    data_after=None,
    user_role=None,
    reussi=True,
    message_erreur=None
):
    """
    Enregistre une action dans le journal d'audit professionnel.
    
    Format simple (nouveau):
        log_action('DOWNLOAD', obj=fiche, additional_info="Téléchargement PDF")
    
    Format détaillé (ancien système, pour compatibilité):
        log_action(request=request, action='VIEW', resource_type='Fiche Criminelle', ...)
    
    Args:
        action: Type d'action (LOGIN, LOGOUT, VIEW, CREATE, UPDATE, DELETE, etc.)
        obj: Objet concerné (pour format simple)
        additional_info: Informations supplémentaires (pour format simple)
        request: Objet requête Django (format détaillé)
        user: Utilisateur Django (format détaillé)
        resource_type: Type de ressource (format détaillé)
        resource_id: ID de la ressource (format détaillé)
        ... (autres paramètres pour format détaillé)
    
    Returns:
        Instance AuditLog créée ou None en cas d'erreur
    """
    # Détecter le format utilisé
    # Si action est fourni sans request et sans resource_type, utiliser le format simple
    if action and not request and not resource_type:
        return log_action_simple(action, obj, additional_info)
    
    return log_action_detailed(
        request=request,
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        endpoint=endpoint,
        method=method,
        ip_address=ip_address,
        user_agent=user_agent,
        browser=browser,
        os=os,
        data_before=data_before,
        data_after=data_after,
        user_role=user_role,
        reussi=reussi,
        message_erreur=message_erreur
    )


def log_action_detailed(
    request=None,
    user=None,
    action='VIEW',
    resource_type=None,
    resource_id=None,
    endpoint=None,
    method=None,
    ip_address=None,
    user_agent=None,
    browser=None,
    os=None,
    data_before=None,
    data_after=None,
    user_role=None,
    reussi=True,
    message_erreur=None
):
    """
    Enregistre une action dans le journal d'audit professionnel.
    
    Args:
        request: Objet requête Django (optionnel)
        user: Utilisateur Django (optionnel)
        action: Type d'action (LOGIN, LOGOUT, VIEW, CREATE, UPDATE, DELETE, etc.)
        resource_type: Type de ressource (ex: "Utilisateur", "DossierCriminel")
        resource_id: ID de la ressource (optionnel)
        endpoint: Endpoint/URL appelé (optionnel, extrait depuis request si fourni)
        method: Méthode HTTP (optionnel, extrait depuis request si fourni)
        ip_address: Adresse IP (optionnel, extrait depuis request si fourni)
        user_agent: User-Agent complet (optionnel, extrait depuis request si fourni)
        browser: Nom du navigateur (optionnel, extrait depuis user_agent si fourni)
        os: Système d'exploitation (optionnel, extrait depuis user_agent si fourni)
        data_before: Données avant modification (dict, pour UPDATE uniquement)
        data_after: Données après modification (dict, pour UPDATE uniquement)
        user_role: Rôle de l'utilisateur (optionnel, extrait depuis user si fourni)
        reussi: Indique si l'action a réussi (défaut: True)
        message_erreur: Message d'erreur si l'action a échoué (optionnel)
    
    Returns:
        Instance AuditLog créée ou None en cas d'erreur
    """
    try:
        # Extraire les informations depuis la requête si fournie
        if request:
            if not user:
                req_user = getattr(request, "user", None)
                # Vérifier que l'utilisateur est authentifié et n'est pas AnonymousUser
                if req_user and hasattr(req_user, 'is_authenticated') and req_user.is_authenticated:
                    # Vérifier que ce n'est pas AnonymousUser
                    from django.contrib.auth.models import AnonymousUser
                    if not isinstance(req_user, AnonymousUser):
                        user = req_user
                
                # Si toujours pas d'utilisateur, essayer depuis le thread local
                if not user:
                    from .middleware import get_current_user
                    thread_user = get_current_user()
                    if thread_user and hasattr(thread_user, 'is_authenticated') and thread_user.is_authenticated:
                        from django.contrib.auth.models import AnonymousUser
                        if not isinstance(thread_user, AnonymousUser):
                            user = thread_user
            
            # IP
            if not ip_address:
                ip_address = get_ip_from_request(request)
            
            # User-Agent
            if not user_agent:
                user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Endpoint
            if not endpoint:
                endpoint = request.path
            
            # Méthode HTTP
            if not method:
                method = request.method
        else:
            # Si pas de request, essayer depuis le thread local
            if not user:
                from .middleware import get_current_user
                thread_user = get_current_user()
                if thread_user and hasattr(thread_user, 'is_authenticated') and thread_user.is_authenticated:
                    from django.contrib.auth.models import AnonymousUser
                    if not isinstance(thread_user, AnonymousUser):
                        user = thread_user
        
        # Vérifier que l'utilisateur est valide avant de créer le log
        if not user:
            logger.debug("Aucun utilisateur authentifié pour créer un log d'audit")
            return None
        
        # Vérifier une dernière fois que ce n'est pas AnonymousUser
        from django.contrib.auth.models import AnonymousUser
        if isinstance(user, AnonymousUser):
            logger.debug("Tentative de créer un log d'audit avec AnonymousUser - ignoré")
            return None
        
        # Extraire le rôle de l'utilisateur avec la fonction améliorée
        if not user_role and user:
            from .middleware import get_role
            user_role = get_role(user)
        
        # Extraire browser et OS depuis user_agent si non fournis
        if user_agent and (not browser or not os):
            try:
                ua_info = parse_user_agent(user_agent)
                if not browser and ua_info.get('navigateur'):
                    browser = ua_info['navigateur']
                if not os and ua_info.get('systeme'):
                    os = ua_info['systeme']
            except Exception as e:
                logger.debug(f"Erreur lors du parsing user-agent: {e}")
        
        # Déterminer resource_type si non fourni
        if not resource_type:
            if endpoint:
                # Essayer d'extraire depuis l'endpoint
                resource_type = _extract_resource_type_from_endpoint(endpoint)
            else:
                resource_type = "Ressource"
        
        # Normaliser les données avant/après
        before_normalized = data_before if isinstance(data_before, dict) else ({} if data_before is None else {})
        after_normalized = data_after if isinstance(data_after, dict) else ({} if data_after is None else {})
        
        # Créer l'entrée d'audit avec le nouveau format unifié
        audit_entry = AuditLog.objects.create(
            user=user,
            user_role=user_role,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            endpoint=endpoint,
            method=method,
            ip_address=ip_address,
            user_agent=user_agent,
            browser=browser,
            os=os,
            # Nouveau format unifié
            before=before_normalized,
            after=after_normalized,
            # Compatibilité avec ancien format
            changes_before=before_normalized,
            changes_after=after_normalized,
            data_before=before_normalized,
            data_after=after_normalized,
            reussi=reussi,
            message_erreur=message_erreur,
            timestamp=timezone.now()
        )
        
        return audit_entry
        
    except Exception as e:
        # Ne pas lever d'exception en production ; logger pour debug
        logger.exception("Failed to write audit log: %s", e)
        return None


def _extract_resource_type_from_endpoint(endpoint):
    """
    Extrait le type de ressource depuis l'endpoint.
    
    Args:
        endpoint: Chemin de l'endpoint (ex: "/api/criminel/fiches/123/")
    
    Returns:
        Type de ressource (ex: "Fiche Criminelle")
    """
    if not endpoint:
        return "Ressource"
    
    # Enlever les préfixes
    path = endpoint.replace('/api/', '').replace('/v1/', '').replace('/v2/', '').strip('/')
    
    # Mapping des chemins vers ressources
    resource_mapping = {
        'fiches-criminelles': 'DossierCriminel',
        'fiche-criminelle': 'DossierCriminel',
        'criminel': 'DossierCriminel',
        'criminels': 'DossierCriminel',
        'utilisateurs': 'Utilisateur',
        'utilisateur': 'Utilisateur',
        'preuves': 'Preuve',
        'preuve': 'Preuve',
        'rapports': 'Rapport d\'Enquête',
        'rapport': 'Rapport d\'Enquête',
        'observations': 'Observation',
        'observation': 'Observation',
        'avancements': 'Avancement d\'Enquête',
        'avancement': 'Avancement d\'Enquête',
        'assignations': 'Assignation d\'Enquête',
        'assignation': 'Assignation d\'Enquête',
        'biometrie': 'Biométrie',
        'photos': 'Photo Biométrique',
        'empreintes': 'Empreinte Digitale',
        'audit': 'Journal d\'Audit',
        'reports': 'Rapport PDF',
    }
    
    # Extraire la première partie du chemin
    parts = path.split('/')
    if parts and parts[0]:
        resource_key = parts[0].lower()
        if resource_key in resource_mapping:
            return resource_mapping[resource_key]
    
    # Par défaut, capitaliser la première partie
    if parts and parts[0]:
        return parts[0].replace('-', ' ').title()
    
    return "Ressource"


def _extract_resource_id_from_endpoint(endpoint):
    """
    Extrait l'ID de la ressource depuis l'endpoint.
    
    Args:
        endpoint: Chemin de l'endpoint (ex: "/api/criminel/fiches/123/")
    
    Returns:
        ID de la ressource (ex: "123") ou None
    """
    if not endpoint:
        return None
    
    parts = endpoint.strip('/').split('/')
    # Chercher un ID numérique dans le chemin
    for part in parts:
        if part.isdigit():
            return part
    
    return None
