"""
Middleware pour capturer automatiquement toutes les actions pour l'audit professionnel
"""

import threading
import logging
from django.utils.deprecation import MiddlewareMixin
from .utils import log_action, _extract_resource_type_from_endpoint, _extract_resource_id_from_endpoint
import json

logger = logging.getLogger(__name__)

# Thread local storage pour stocker l'utilisateur et la requête actuels
_thread_locals = threading.local()


def get_current_user():
    """Récupère l'utilisateur actuel depuis le thread local."""
    return getattr(_thread_locals, 'user', None)


def set_current_user(user):
    """Définit l'utilisateur actuel dans le thread local."""
    _thread_locals.user = user


def get_current_request():
    """Récupère la requête actuelle depuis le thread local."""
    return getattr(_thread_locals, 'request', None)


def get_role(user):
    """
    Récupère le rôle de l'utilisateur.
    Priorité: champ 'role' du modèle > premier groupe Django > None
    """
    if not user:
        return None
    
    # 1. Vérifier le champ 'role' du modèle UtilisateurModel
    if hasattr(user, 'role'):
        role = getattr(user, 'role', None)
        if role:
            try:
                if hasattr(user, 'get_role_display'):
                    display = user.get_role_display()
                    if display and display != role:
                        return display
            except Exception:
                pass
            # Sinon, retourner la valeur brute
            return str(role).strip()
    
    # 2. Vérifier les groupes Django
    if hasattr(user, 'groups'):
        try:
            groups = user.groups.all()
            if groups.exists():
                # Prendre le premier groupe
                return groups.first().name
        except Exception:
            pass
    
    # 3. Aucun rôle trouvé
    return None


def _map_method_to_action(method):
    """Mappe la méthode HTTP vers une action d'audit."""
    method_map = {
        'GET': 'VIEW',
        'POST': 'CREATE',
        'PUT': 'UPDATE',
        'PATCH': 'UPDATE',
        'DELETE': 'DELETE',
    }
    return method_map.get(method.upper(), 'VIEW')


class CurrentUserMiddleware(MiddlewareMixin):
    """
    Middleware pour stocker l'utilisateur courant pour les signals.
    Doit être placé après AuthenticationMiddleware.
    """
    
    def __call__(self, request):
        if request.user.is_authenticated:
            set_current_user(request.user)
        response = self.get_response(request)
        # Nettoyer après la requête
        _thread_locals.user = None
        return response


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware pour capturer automatiquement toutes les actions pour l'audit professionnel.
    Enregistre chaque requête HTTP avec toutes les informations nécessaires.
    
    NOTE: Ce middleware enregistre uniquement les actions qui ne sont pas déjà capturées
    par les signals Django (post_save, post_delete, etc.) pour éviter les doublons.
    """
    
    def __call__(self, request):
        # Stocker l'utilisateur et la requête dans le thread local
        user = getattr(request, 'user', None)
        _thread_locals.user = user
        _thread_locals.request = request
        
        ignored_paths = [
            '/static/',
            '/media/',
            '/favicon.ico',
            '/robots.txt',
            '/admin/static/',
            '/api/auth/refresh/',  # Refresh token (trop fréquent)
            '/api/auth/token/refresh/',  # Refresh token alternatif
            '/api/audit/log-navigation/',  # Les navigations sont loguées par le frontend
        ]
        
        should_log = True
        path = request.path
        
        # Vérifier si le chemin doit être ignoré
        for ignored in ignored_paths:
            if path.startswith(ignored):
                should_log = False
                break
        
        # Le middleware capture toutes les actions HTTP
        # Pour éviter les doublons, on utilise un flag dans la requête
        if should_log:
            try:
                # Extraire les informations de la requête
                method = request.method.upper()
                action = _map_method_to_action(method)
                
                # Extraire la ressource et l'ID
                resource_type = _extract_resource_type_from_endpoint(path)
                resource_id = _extract_resource_id_from_endpoint(path)
                
                if action == 'VIEW' and ('search' in path.lower() or 'q=' in request.GET.urlencode()):
                    action = 'SEARCH'
                
                if action == 'VIEW' and ('download' in path.lower() or 
                                       request.GET.get('download') or
                                       'attachment' in request.META.get('HTTP_ACCEPT', '').lower()):
                    action = 'DOWNLOAD'
                
                if action == 'CREATE' and (request.FILES or 'upload' in path.lower()):
                    action = 'UPLOAD'
                
                # Marquer la requête pour indiquer qu'on a déjà logué cette action HTTP
                # Les signals pourront vérifier ce flag pour éviter les doublons
                request._audit_logged = True
                request._audit_action = action
                
                # Capturer les détails de la requête pour toutes les actions
                request_data = {}
                query_params = {}
                
                # Capturer les paramètres de requête (GET)
                if request.GET:
                    query_params = dict(request.GET)
                
                # Capturer le body pour POST/PUT/PATCH (sans les fichiers)
                if method in ['POST', 'PUT', 'PATCH']:
                    try:
                        # Essayer de lire le body JSON
                        if hasattr(request, 'body') and request.body:
                            try:
                                import json
                                body_data = json.loads(request.body.decode('utf-8'))
                                # Filtrer les données sensibles (mots de passe, tokens)
                                if isinstance(body_data, dict):
                                    filtered_body = {}
                                    for key, value in body_data.items():
                                        key_lower = key.lower()
                                        if any(sensitive in key_lower for sensitive in ['password', 'token', 'secret', 'key', 'auth']):
                                            filtered_body[key] = '***MASQUÉ***'
                                        else:
                                            filtered_body[key] = value
                                    request_data['body'] = filtered_body
                                else:
                                    request_data['body'] = body_data
                            except (json.JSONDecodeError, UnicodeDecodeError):
                                # Si ce n'est pas du JSON, stocker une indication
                                request_data['body'] = {'type': 'non_json', 'size': len(request.body)}
                        
                        # Capturer les données de formulaire (form data)
                        if request.POST:
                            form_data = {}
                            for key, value in request.POST.items():
                                key_lower = key.lower()
                                if any(sensitive in key_lower for sensitive in ['password', 'token', 'secret', 'key', 'auth']):
                                    form_data[key] = '***MASQUÉ***'
                                else:
                                    form_data[key] = value
                            request_data['form_data'] = form_data
                    except Exception as e:
                        logger.debug(f"Erreur lors de la capture du body de la requête: {e}")
                
                # Construire les données supplémentaires
                additional_data = {
                    'query_params': query_params,
                    'request_data': request_data,
                    'headers': {
                        'referer': request.META.get('HTTP_REFERER', ''),
                        'origin': request.META.get('HTTP_ORIGIN', ''),
                        'content_type': request.META.get('CONTENT_TYPE', ''),
                    }
                }
                
                # Pour CREATE/UPDATE/DELETE, ne pas logger ici car les signals le feront avec plus de détails
                # On logue seulement VIEW, SEARCH, DOWNLOAD, UPLOAD avec les détails supplémentaires
                if action in ['VIEW', 'SEARCH', 'DOWNLOAD', 'UPLOAD']:
                    log_action(
                        request=request,
                        user=user if user and user.is_authenticated else None,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        data_after=additional_data,  # Stocker les détails dans data_after pour VIEW
                    )
                # Pour CREATE/UPDATE/DELETE, on laisse les signals gérer avec before/after
            except Exception as e:
                # Ne pas bloquer la requête en cas d'erreur d'audit
                logger.error(f"Erreur lors de l'enregistrement automatique d'audit: {e}", exc_info=True)
        
        try:
            response = self.get_response(request)
            
            # Capturer les erreurs HTTP importantes pour l'audit
            if response.status_code in [403, 404, 500]:
                try:
                    error_action_map = {
                        403: 'ERROR_403',
                        404: 'ERROR_404',
                        500: 'ERROR_500',
                    }
                    action = error_action_map.get(response.status_code, 'ACCESS_DENIED')
                    
                    # Logger l'erreur seulement si l'utilisateur est authentifié
                    if user and user.is_authenticated:
                        log_action(
                            request=request,
                            user=user,
                            action=action,
                            resource_type=_extract_resource_type_from_endpoint(path),
                            resource_id=_extract_resource_id_from_endpoint(path),
                            reussi=False,
                            message_erreur=f'Erreur HTTP {response.status_code} sur {path}',
                        )
                except Exception as e:
                    # Ne pas bloquer la réponse en cas d'erreur d'audit
                    logger.debug(f"Erreur lors de l'enregistrement de l'erreur HTTP: {e}")
            
        finally:
            # Nettoyer après la requête
            _thread_locals.user = None
            _thread_locals.request = None
        
        return response
