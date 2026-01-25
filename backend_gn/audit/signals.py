"""
Signals Django pour enregistrer automatiquement les actions dans le Journal d'Audit
"""

import logging
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.db.models.signals import post_save, post_delete, pre_save, pre_delete
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from django.utils import timezone
from .models import AuditLog, JournalAudit
from .middleware import get_current_user, get_current_request, get_role

logger = logging.getLogger(__name__)



def _serialize_field_value(field, value):
    """
    Sérialise une valeur de champ pour l'audit.
    Gère les types spéciaux (dates, ForeignKey, etc.)
    """
    if value is None:
        return None
    
    # Gérer les dates/datetimes
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    
    if hasattr(field, 'related_model'):
        return value.pk if hasattr(value, 'pk') else str(value)
    
    if hasattr(value, 'all'):
        return [item.pk if hasattr(item, 'pk') else str(item) for item in value.all()]
    
    # Gérer les booléens, nombres, chaînes
    if isinstance(value, (bool, int, float, str)):
        return value
    
    # Par défaut, convertir en string
    return str(value)


# Préparer l'état avant modification/suppression
@receiver(pre_save)
def pre_save_audit(sender, instance, **kwargs):
    """Stocke l'état avant modification pour comparaison avec introspection automatique."""
    # Ignorer les modifications sur AuditLog lui-même pour éviter les boucles
    if sender == AuditLog:
        return
    
    # Stocker l'état avant modification si l'objet existe déjà
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            # Stocker tous les champs dans un dictionnaire avec sérialisation appropriée
            before_data = {}
            for f in sender._meta.fields:
                if not f.primary_key:  # Exclure la clé primaire
                    try:
                        value = getattr(old_instance, f.name, None)
                        before_data[f.name] = _serialize_field_value(f, value)
                    except Exception as e:
                        # En cas d'erreur, stocker None
                        logger.debug(f"Erreur lors de la sérialisation du champ {f.name}: {e}")
                        before_data[f.name] = None
            instance._audit_before = before_data
        except sender.DoesNotExist:
            instance._audit_before = None
    else:
        instance._audit_before = None


@receiver(post_save)
def post_save_audit(sender, instance, created, **kwargs):
    """Enregistre la création ou modification d'un objet."""
    # Ignorer les modifications sur AuditLog lui-même pour éviter les boucles
    if sender == AuditLog:
        return
    
    user = get_current_user()
    if user is None or not user.is_authenticated:
        # Logger pour debug si nécessaire
        logger.debug(f"Signal post_save ignoré pour {sender.__name__}#{instance.pk}: utilisateur non authentifié")
        return
    
    before = getattr(instance, '_audit_before', None)
    
    # Construire l'état après modification avec sérialisation appropriée
    after = {}
    for f in sender._meta.fields:
        if not f.primary_key:  # Exclure la clé primaire
            try:
                value = getattr(instance, f.name, None)
                after[f.name] = _serialize_field_value(f, value)
            except Exception as e:
                # En cas d'erreur, stocker None
                logger.debug(f"Erreur lors de la sérialisation du champ {f.name}: {e}")
                after[f.name] = None
    
    # Déterminer l'action
    action = 'CREATE' if created else 'UPDATE'
    
    # Vérifier si le middleware a déjà logué cette action
    # Pour VIEW, on évite le doublon
    request = get_current_request()
    middleware_logged = getattr(request, '_audit_logged', False) if request else False
    middleware_action = getattr(request, '_audit_action', None) if request else None
    
    # Si le middleware a déjà logué une action VIEW, ne pas créer de doublon
    if middleware_logged and middleware_action == 'VIEW' and action == 'VIEW':
        return
    
    # Pour CREATE/UPDATE/DELETE, vérifier s'il existe déjà un log similaire très récent
    if middleware_logged and action in ['CREATE', 'UPDATE', 'DELETE']:
        # Vérifier s'il existe un log très récent avec les mêmes caractéristiques
        from django.utils import timezone
        from datetime import timedelta
        
        recent_logs = AuditLog.objects.filter(
            user=user,
            action=action,
            endpoint=request.path if request else None,
            timestamp__gte=timezone.now() - timedelta(seconds=2)
        ).order_by('-timestamp')[:1]
        
        if recent_logs.exists():
            recent_log = recent_logs.first()
            # Si le log récent n'a pas de données before/after, le mettre à jour
            if not recent_log.before and not recent_log.changes_before and not recent_log.data_before:
                recent_log.before = before
                recent_log.after = after
                recent_log.changes_before = before
                recent_log.changes_after = after
                recent_log.data_before = before
                recent_log.data_after = after
                recent_log.save()
            # Ne pas créer de nouveau log
            return
    
    # Construire l'état après modification avec sérialisation appropriée
    after = {}
    for f in sender._meta.fields:
        if not f.primary_key:  # Exclure la clé primaire
            try:
                value = getattr(instance, f.name, None)
                after[f.name] = _serialize_field_value(f, value)
            except Exception as e:
                # En cas d'erreur, stocker None
                logger.debug(f"Erreur lors de la sérialisation du champ {f.name}: {e}")
                after[f.name] = None
    
    changed_fields = []
    if not created and before:
        for field_name in after:
            if field_name in before and before[field_name] != after[field_name]:
                changed_fields.append(field_name)
    
    # Déterminer l'action
    action = 'CREATE' if created else 'UPDATE'
    
    # Créer l'entrée d'audit
    try:
        request = get_current_request()
        endpoint = request.path if request else None
        method = request.method if request else None
        
        # Extraire IP et User-Agent depuis la requête
        ip_address = None
        user_agent = None
        if request:
            from .user_agent_parser import get_ip_from_request
            ip_address = get_ip_from_request(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Construire la description avec les champs modifiés
        additional_info = None
        if changed_fields:
            additional_info = f"Champs modifiés: {', '.join(changed_fields)}"
        
        # Capturer les détails supplémentaires de la requête
        request_details = {}
        if request:
            # Paramètres de requête
            if request.GET:
                request_details['query_params'] = dict(request.GET)
            
            # Body pour POST/PUT/PATCH
            if method in ['POST', 'PUT', 'PATCH']:
                try:
                    if hasattr(request, 'body') and request.body:
                        try:
                            import json
                            body_data = json.loads(request.body.decode('utf-8'))
                            # Filtrer les données sensibles
                            if isinstance(body_data, dict):
                                filtered_body = {}
                                for key, value in body_data.items():
                                    key_lower = key.lower()
                                    if any(sensitive in key_lower for sensitive in ['password', 'token', 'secret', 'key', 'auth']):
                                        filtered_body[key] = '***MASQUÉ***'
                                    else:
                                        filtered_body[key] = value
                                request_details['request_body'] = filtered_body
                        except (json.JSONDecodeError, UnicodeDecodeError):
                            request_details['request_body'] = {'type': 'non_json', 'size': len(request.body)}
                    
                    # Données de formulaire
                    if request.POST:
                        form_data = {}
                        for key, value in request.POST.items():
                            key_lower = key.lower()
                            if any(sensitive in key_lower for sensitive in ['password', 'token', 'secret', 'key', 'auth']):
                                form_data[key] = '***MASQUÉ***'
                            else:
                                form_data[key] = value
                        request_details['form_data'] = form_data
                except Exception as e:
                    logger.debug(f"Erreur lors de la capture du body: {e}")
            
            # Headers importants
            request_details['headers'] = {
                'referer': request.META.get('HTTP_REFERER', ''),
                'origin': request.META.get('HTTP_ORIGIN', ''),
                'content_type': request.META.get('CONTENT_TYPE', ''),
            }
        
        # Enrichir les données after avec les détails de la requête
        after_enriched = after.copy() if after else {}
        if request_details:
            after_enriched['_request_details'] = request_details
        
        audit_log = AuditLog.objects.create(
            user=user,
            user_role=get_role(user),
            action=action,
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.pk,
            before=before,
            after=after_enriched,  # Données enrichies avec détails de la requête
            # Compatibilité avec ancien format
            changes_before=before,
            changes_after=after_enriched,
            data_before=before,
            data_after=after_enriched,
            endpoint=endpoint,
            method=method,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_info=additional_info
        )
        
        # Ajouter l'action au journal narratif si une session existe
        if request and hasattr(request, 'current_user_session') and request.current_user_session:
            try:
                from .narrative_audit_service import ajouter_action_narrative
                
                # Extraire les détails pour le journal narratif
                model_name = sender.__name__.lower()
                resource_type = model_name.replace('model', '').strip()
                
                # Mapper les types de modèles vers des noms lisibles
                resource_type_map = {
                    'fichecriminelle': 'fiche_criminelle',
                    'dossiersuspect': 'dossier_criminel',
                    'enquete': 'enquete',
                    'rapport': 'rapport',
                    'preuve': 'preuve',
                    'piecejointe': 'piece_jointe',
                    'utilisateur': 'utilisateur',
                }
                
                resource_type = resource_type_map.get(resource_type, resource_type)
                
                # Extraire le nom de la ressource si possible
                resource_name = None
                if hasattr(instance, 'nom'):
                    resource_name = getattr(instance, 'nom', None)
                elif hasattr(instance, 'titre'):
                    resource_name = getattr(instance, 'titre', None)
                elif hasattr(instance, 'reference'):
                    resource_name = getattr(instance, 'reference', None)
                elif hasattr(instance, 'username'):
                    resource_name = getattr(instance, 'username', None)
                
                details = {
                    'resource_type': resource_type,
                    'resource_id': str(instance.pk),
                    'resource_name': resource_name,
                }
                
                action_type = 'creation' if created else 'modification'
                ajouter_action_narrative(
                    request.current_user_session,
                    action_type,
                    details,
                    request
                )
            except Exception as narrative_error:
                # Ne pas bloquer l'audit principal en cas d'erreur du journal narratif
                logger.warning(f"Erreur lors de l'ajout au journal narratif: {narrative_error}")
                
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de l'audit post_save: {e}", exc_info=True)


@receiver(pre_delete)
def pre_delete_audit(sender, instance, **kwargs):
    """Stocke l'état avant suppression."""
    # Ignorer les suppressions sur AuditLog lui-même pour éviter les boucles
    if sender == AuditLog:
        return
    
    # Stocker l'état avant suppression avec sérialisation appropriée
    before_data = {}
    for f in sender._meta.fields:
        if not f.primary_key:  # Exclure la clé primaire
            try:
                value = getattr(instance, f.name, None)
                before_data[f.name] = _serialize_field_value(f, value)
            except Exception as e:
                # En cas d'erreur, stocker None
                logger.debug(f"Erreur lors de la sérialisation du champ {f.name}: {e}")
                before_data[f.name] = None
    instance._audit_before = before_data


@receiver(post_delete)
def post_delete_audit(sender, instance, **kwargs):
    """Enregistre la suppression d'un objet."""
    # Ignorer les suppressions sur AuditLog lui-même pour éviter les boucles
    if sender == AuditLog:
        return
    
    user = get_current_user()
    if user is None or not user.is_authenticated:
        return
    
    # Vérifier s'il existe déjà un log très récent pour éviter les doublons
    request = get_current_request()
    if request:
        from django.utils import timezone
        from datetime import timedelta
        
        endpoint = request.path if request else None
        recent_logs = AuditLog.objects.filter(
            user=user,
            action='DELETE',
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.pk,
            endpoint=endpoint,
            timestamp__gte=timezone.now() - timedelta(seconds=2)
        ).order_by('-timestamp')[:1]
        
        if recent_logs.exists():
            # Un log existe déjà, ne pas créer de doublon
            logger.debug(f"Signal post_delete ignoré pour {sender.__name__}#{instance.pk}: log déjà existant")
            return
    
    # Créer l'entrée d'audit
    try:
        endpoint = request.path if request else None
        method = request.method if request else None
        
        # Extraire IP et User-Agent depuis la requête
        ip_address = None
        user_agent = None
        if request:
            from .user_agent_parser import get_ip_from_request
            ip_address = get_ip_from_request(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        before_data = getattr(instance, '_audit_before', None)
        
        # Capturer les détails supplémentaires de la requête
        request_details = {}
        if request:
            # Paramètres de requête
            if request.GET:
                request_details['query_params'] = dict(request.GET)
            
            # Body pour DELETE (peut contenir des paramètres)
            if method == 'DELETE':
                try:
                    if hasattr(request, 'body') and request.body:
                        try:
                            import json
                            body_data = json.loads(request.body.decode('utf-8'))
                            if isinstance(body_data, dict):
                                filtered_body = {}
                                for key, value in body_data.items():
                                    key_lower = key.lower()
                                    if any(sensitive in key_lower for sensitive in ['password', 'token', 'secret', 'key', 'auth']):
                                        filtered_body[key] = '***MASQUÉ***'
                                    else:
                                        filtered_body[key] = value
                                request_details['request_body'] = filtered_body
                        except (json.JSONDecodeError, UnicodeDecodeError):
                            request_details['request_body'] = {'type': 'non_json', 'size': len(request.body)}
                except Exception as e:
                    logger.debug(f"Erreur lors de la capture du body DELETE: {e}")
            
            # Headers importants
            request_details['headers'] = {
                'referer': request.META.get('HTTP_REFERER', ''),
                'origin': request.META.get('HTTP_ORIGIN', ''),
                'content_type': request.META.get('CONTENT_TYPE', ''),
            }
        
        # Enrichir les données before avec les détails de la requête
        before_enriched = before_data.copy() if before_data else {}
        if request_details:
            before_enriched['_request_details'] = request_details
        
        audit_log = AuditLog.objects.create(
            user=user,
            user_role=get_role(user),
            action='DELETE',
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.pk,
            before=before_enriched,  # Données enrichies avec détails de la requête
            after={},  # Pas d'état après suppression
            # Compatibilité avec ancien format
            changes_before=before_enriched,
            changes_after={},
            data_before=before_enriched,
            data_after={},
            endpoint=endpoint,
            method=method,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        # Ajouter l'action au journal narratif si une session existe
        if request and hasattr(request, 'current_user_session') and request.current_user_session:
            try:
                from .narrative_audit_service import ajouter_action_narrative
                
                # Extraire les détails pour le journal narratif
                model_name = sender.__name__.lower()
                resource_type = model_name.replace('model', '').strip()
                
                # Mapper les types de modèles vers des noms lisibles
                resource_type_map = {
                    'fichecriminelle': 'fiche_criminelle',
                    'dossiersuspect': 'dossier_criminel',
                    'enquete': 'enquete',
                    'rapport': 'rapport',
                    'preuve': 'preuve',
                    'piecejointe': 'piece_jointe',
                    'utilisateur': 'utilisateur',
                }
                
                resource_type = resource_type_map.get(resource_type, resource_type)
                
                # Extraire le nom de la ressource si possible
                resource_name = None
                if hasattr(instance, 'nom'):
                    resource_name = getattr(instance, 'nom', None)
                elif hasattr(instance, 'titre'):
                    resource_name = getattr(instance, 'titre', None)
                elif hasattr(instance, 'reference'):
                    resource_name = getattr(instance, 'reference', None)
                elif hasattr(instance, 'username'):
                    resource_name = getattr(instance, 'username', None)
                
                details = {
                    'resource_type': resource_type,
                    'resource_id': str(instance.pk),
                    'resource_name': resource_name,
                }
                
                ajouter_action_narrative(
                    request.current_user_session,
                    'suppression',
                    details,
                    request
                )
            except Exception as narrative_error:
                # Ne pas bloquer l'audit principal en cas d'erreur du journal narratif
                logger.warning(f"Erreur lors de l'ajout au journal narratif: {narrative_error}")
                
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de l'audit post_delete: {e}", exc_info=True)


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Enregistre la connexion d'un utilisateur (format SGIC Niveau 1)."""
    try:
        if not user or not user.is_authenticated:
            return
        
        from .utils import log_action
        
        # Extraire le rôle de l'utilisateur
        role = None
        if hasattr(user, 'role'):
            role = getattr(user, 'role', None)
        elif hasattr(user, 'groups'):
            role = ", ".join([g.name for g in user.groups.all()]) if user.groups.exists() else None
        
        log_action(
            request=request,
            user=user,
            action='LOGIN',
            resource_type='Système',
            endpoint=request.path if request else '/api/auth/login/',
            method='POST',
            user_role=role
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de la connexion: {e}")


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Enregistre la déconnexion d'un utilisateur (format SGIC Niveau 1)."""
    try:
        if not user or not user.is_authenticated:
            return
        
        from .utils import log_action
        
        # Extraire le rôle de l'utilisateur
        role = None
        if hasattr(user, 'role'):
            role = getattr(user, 'role', None)
        elif hasattr(user, 'groups'):
            role = ", ".join([g.name for g in user.groups.all()]) if user.groups.exists() else None
        
        log_action(
            request=request,
            user=user,
            action='LOGOUT',
            resource_type='Système',
            endpoint=request.path if request else '/api/auth/logout/',
            method='POST',
            user_role=role
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de la déconnexion: {e}")


# Signal pour les tentatives de connexion échouées

@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    """Enregistre une tentative de connexion échouée (format SGIC Niveau 1)."""
    try:
        from .utils import log_action
        
        # Extraire le username/email depuis les credentials
        username = None
        email = None
        if isinstance(credentials, dict):
            username = credentials.get('username', '') or credentials.get('email', '')
            email = credentials.get('email', '')
        else:
            username = str(credentials)
        
        username = username or 'Inconnu'
        
        # Déterminer la raison de l'échec
        reason = 'Identifiants invalides'
        
        # Vérifier d'abord dans les credentials
        if isinstance(credentials, dict):
            if 'password' not in credentials or not credentials.get('password') or not str(credentials.get('password', '')).strip():
                reason = 'Mot de passe requis'
            elif ('username' not in credentials or not credentials.get('username')) and ('email' not in credentials or not credentials.get('email')):
                reason = 'Identifiant requis'
        
        # Vérifier dans la requête si disponible
        if request:
            if hasattr(request, 'data'):
                data = request.data if hasattr(request.data, 'get') else {}
                if not data.get('password') or not str(data.get('password', '')).strip():
                    reason = 'Mot de passe requis'
                elif (not data.get('username') and not data.get('email')):
                    reason = 'Identifiant requis'
            # Vérifier les erreurs dans la session ou les headers
            if hasattr(request, 'session'):
                error_msg = request.session.get('login_error', '')
                if 'mot de passe' in error_msg.lower() and 'requis' in error_msg.lower():
                    reason = 'Mot de passe requis'
                elif 'identifiant' in error_msg.lower() and 'requis' in error_msg.lower():
                    reason = 'Identifiant requis'
        
        log_action(
            request=request,
            user=None,  # Pas d'utilisateur pour une connexion échouée
            action='FAILED_LOGIN',
            resource_type='Système',
            resource_id=username,
            endpoint=request.path if request else '/api/auth/login/',
            method='POST'
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de la tentative de connexion échouée: {e}")


def enregistrer_action_audit(
    user=None,
    action=None,
    ressource=None,
    ressource_id=None,
    ip_address=None,
    user_agent=None,
    details=None,
    reussi=True,
    message_erreur=None,
    old_values=None,
    new_values=None
):
    """
    Fonction utilitaire pour enregistrer une action dans le Journal d'Audit.
    (Alias pour compatibilité avec l'ancien code - utilise log_action en interne)
    
    Si user, ip_address ou user_agent ne sont pas fournis, ils seront récupérés
    automatiquement depuis le thread local (via le middleware).
    
    Usage:
        from audit.signals import enregistrer_action_audit
        
        enregistrer_action_audit(
            action='CREATE',
            ressource='Fiche Criminelle',
            ressource_id='123',
            details={'nom': 'John Doe'},
            old_values={'nom': 'Ancien Nom'},
            new_values={'nom': 'Nouveau Nom'}
        )
    """
    try:
        from .utils import log_action
        
        # Récupérer la requête pour IP, User-Agent, endpoint, méthode HTTP si non fournis
        request = get_current_request()
        
        # Mapper les actions vers le nouveau format
        action_map = {
            'creation': 'CREATE',
            'modification': 'UPDATE',
            'suppression': 'DELETE',
            'consultation': 'VIEW',
            'connexion': 'LOGIN',
            'deconnexion': 'LOGOUT',
        }
        mapped_action = action_map.get(action, action)
        
        # Utiliser log_action avec les nouveaux paramètres
        log_action(
            request=request,
            user=user,
            action=mapped_action,
            resource_type=ressource or 'Ressource',
            resource_id=ressource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            data_before=old_values,
            data_after=new_values,
            reussi=reussi,
            message_erreur=message_erreur
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement de l'action d'audit: {e}", exc_info=True)



# Signal pour les Fiches Criminelles
try:
    from criminel.models import CriminalFicheCriminelle
    
    # Stocker les valeurs avant modification
    _fiche_pre_save_data = {}
    
    @receiver(pre_save, sender=CriminalFicheCriminelle)
    def store_fiche_pre_save(sender, instance, **kwargs):
        """Stocke les valeurs avant modification pour comparaison."""
        if instance.pk:
            try:
                old_instance = CriminalFicheCriminelle.objects.get(pk=instance.pk)
                _fiche_pre_save_data[instance.pk] = {
                    'numero_fiche': old_instance.numero_fiche or '',
                    'nom': old_instance.nom or '',
                    'prenom': old_instance.prenom or '',
                    'statut': getattr(old_instance, 'statut', ''),
                }
            except CriminalFicheCriminelle.DoesNotExist:
                pass
    
    @receiver(post_save, sender=CriminalFicheCriminelle)
    def log_fiche_criminelle_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'une fiche criminelle avec détails complets."""
        try:
            action = 'creation' if created else 'modification'
            
            # Préparer les détails
            details = {
                'numero_fiche': instance.numero_fiche or '',
                'nom': instance.nom or '',
                'prenom': instance.prenom or '',
                'surnom': instance.surnom or '',
                'statut': getattr(instance, 'statut', ''),
            }
            
            # Pour les modifications, ajouter old_values et new_values
            if not created and instance.pk in _fiche_pre_save_data:
                old_data = _fiche_pre_save_data[instance.pk]
                details['old_values'] = old_data
                details['new_values'] = {
                    'numero_fiche': instance.numero_fiche or '',
                    'nom': instance.nom or '',
                    'prenom': instance.prenom or '',
                    'statut': getattr(instance, 'statut', ''),
                }
                # Identifier les champs modifiés
                changed_fields = []
                for key in old_data:
                    if old_data.get(key) != details['new_values'].get(key):
                        changed_fields.append(key)
                if changed_fields:
                    details['changed_fields'] = changed_fields
                # Nettoyer après utilisation
                del _fiche_pre_save_data[instance.pk]
            
            enregistrer_action_audit(
                action=action,
                ressource='Fiche Criminelle',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour fiche criminelle: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module criminel non disponible, signals d'audit pour fiches criminelles désactivés")


# Signals pour les Photos Biométriques
try:
    from biometrie.models import BiometriePhoto
    
    @receiver(post_save, sender=BiometriePhoto)
    def log_photo_biometrique_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'une photo biométrique."""
        try:
            action = 'creation' if created else 'modification'
            details = {
                'type_photo': instance.type_photo or '',
                'criminel_id': instance.criminel.id if instance.criminel else None,
                'criminel_nom': f"{instance.criminel.nom} {instance.criminel.prenom}" if instance.criminel else '',
                'taille_fichier': instance.taille_fichier or 0,
            }
            
            enregistrer_action_audit(
                action=action,
                ressource='Photo Biométrique',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour photo biométrique: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module biometrie non disponible, signals d'audit pour photos biométriques désactivés")


# Signals pour les Empreintes Digitales
try:
    from biometrie.models import BiometrieEmpreinte
    
    @receiver(post_save, sender=BiometrieEmpreinte)
    def log_empreinte_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'une empreinte digitale."""
        try:
            action = 'creation' if created else 'modification'
            details = {
                'doigt': instance.doigt or '',
                'type_empreinte': instance.type_empreinte or '',
                'criminel_id': instance.criminel.id if instance.criminel else None,
                'taille_fichier': instance.taille_fichier or 0,
            }
            
            enregistrer_action_audit(
                action=action,
                ressource='Empreinte Digitale',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour empreinte: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module biometrie non disponible, signals d'audit pour empreintes désactivés")


# Signals pour les Utilisateurs
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    @receiver(post_save, sender=User)
    def log_utilisateur_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'un utilisateur."""
        try:
            current_user = get_current_user()
            if current_user and current_user.id == instance.id and not created:
                return
            
            action = 'creation' if created else 'modification'
            details = {
                'username': instance.username or '',
                'email': instance.email or '',
                'statut': getattr(instance, 'statut', 'actif'),
            }
            
            enregistrer_action_audit(
                action=action,
                ressource='Utilisateur',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour utilisateur: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except Exception as e:
    logger.warning(f"Erreur lors de l'enregistrement des signals pour utilisateurs: {e}")



# Signals pour les Preuves
try:
    from enquete.models import Preuve
    
    @receiver(post_save, sender=Preuve)
    def log_preuve_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'une preuve."""
        try:
            action = 'creation' if created else 'modification'
            details = {
                'type_preuve': instance.get_type_preuve_display() or '',
                'description': instance.description or '',
                'dossier_numero': instance.dossier.numero_fiche if instance.dossier else '',
                'dossier_nom': f"{instance.dossier.nom} {instance.dossier.prenom}" if instance.dossier else '',
                'enqueteur': instance.enqueteur.username if instance.enqueteur else '',
            }
            
            enregistrer_action_audit(
                action=action,
                ressource='Preuve',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour preuve: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module enquete non disponible, signals d'audit pour preuves désactivés")


# Signals pour les Rapports d'Enquête
try:
    from enquete.models import RapportEnquete
    
    @receiver(post_save, sender=RapportEnquete)
    def log_rapport_enquete_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'un rapport d'enquête."""
        try:
            action = 'creation' if created else 'modification'
            details = {
                'titre': instance.titre or '',
                'statut': instance.get_statut_display() or '',
                'dossier_numero': instance.dossier.numero_fiche if instance.dossier else '',
                'dossier_nom': f"{instance.dossier.nom} {instance.dossier.prenom}" if instance.dossier else '',
                'enqueteur': instance.enqueteur.username if instance.enqueteur else '',
                'contenu_preview': (instance.contenu[:200] + '...') if len(instance.contenu) > 200 else instance.contenu,
            }
            
            enregistrer_action_audit(
                action=action,
                ressource='Rapport d\'Enquête',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour rapport enquête: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module enquete non disponible, signals d'audit pour rapports désactivés")


# Signals pour les Observations
try:
    from enquete.models import Observation
    
    @receiver(post_save, sender=Observation)
    def log_observation_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'une observation."""
        try:
            action = 'creation' if created else 'modification'
            details = {
                'texte_preview': (instance.texte[:200] + '...') if len(instance.texte) > 200 else instance.texte,
                'dossier_numero': instance.dossier.numero_fiche if instance.dossier else '',
                'dossier_nom': f"{instance.dossier.nom} {instance.dossier.prenom}" if instance.dossier else '',
                'enqueteur': instance.enqueteur.username if instance.enqueteur else '',
            }
            
            enregistrer_action_audit(
                action=action,
                ressource='Observation',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour observation: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module enquete non disponible, signals d'audit pour observations désactivés")


# Signals pour les Avancements
try:
    from enquete.models import Avancement
    
    # Stocker les valeurs avant modification
    _avancement_pre_save_data = {}
    
    @receiver(pre_save, sender=Avancement)
    def store_avancement_pre_save(sender, instance, **kwargs):
        """Stocke les valeurs avant modification pour comparaison."""
        if instance.pk:
            try:
                old_instance = Avancement.objects.get(pk=instance.pk)
                _avancement_pre_save_data[instance.pk] = {
                    'pourcentage': old_instance.pourcentage,
                    'commentaire': old_instance.commentaire or '',
                }
            except Avancement.DoesNotExist:
                pass
    
    @receiver(post_save, sender=Avancement)
    def log_avancement_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'un avancement."""
        try:
            action = 'creation' if created else 'modification'
            details = {
                'pourcentage': instance.pourcentage,
                'commentaire': instance.commentaire or '',
                'dossier_numero': instance.dossier.numero_fiche if instance.dossier else '',
                'dossier_nom': f"{instance.dossier.nom} {instance.dossier.prenom}" if instance.dossier else '',
                'enqueteur': instance.enqueteur.username if instance.enqueteur else '',
            }
            
            # Pour les modifications, ajouter old_values et new_values
            if not created and instance.pk in _avancement_pre_save_data:
                old_data = _avancement_pre_save_data[instance.pk]
                details['old_values'] = old_data
                details['new_values'] = {
                    'pourcentage': instance.pourcentage,
                    'commentaire': instance.commentaire or '',
                }
                # Identifier les champs modifiés
                changed_fields = []
                if old_data.get('pourcentage') != instance.pourcentage:
                    changed_fields.append('pourcentage')
                if old_data.get('commentaire') != instance.commentaire:
                    changed_fields.append('commentaire')
                if changed_fields:
                    details['changed_fields'] = changed_fields
                # Nettoyer après utilisation
                del _avancement_pre_save_data[instance.pk]
            
            enregistrer_action_audit(
                action=action,
                ressource='Avancement d\'Enquête',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour avancement: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module enquete non disponible, signals d'audit pour avancements désactivés")


# Signals pour les Assignations d'Enquête
try:
    from criminel.models import InvestigationAssignment
    
    # Stocker les valeurs avant modification
    _assignment_pre_save_data = {}
    
    @receiver(pre_save, sender=InvestigationAssignment)
    def store_assignment_pre_save(sender, instance, **kwargs):
        """Stocke les valeurs avant modification pour comparaison."""
        if instance.pk:
            try:
                old_instance = InvestigationAssignment.objects.get(pk=instance.pk)
                _assignment_pre_save_data[instance.pk] = {
                    'status': old_instance.status,
                    'instructions': old_instance.instructions or '',
                    'priority': old_instance.priority or '',
                }
            except InvestigationAssignment.DoesNotExist:
                pass
    
    @receiver(post_save, sender=InvestigationAssignment)
    def log_assignment_action(sender, instance, created, **kwargs):
        """Enregistre la création ou modification d'une assignation d'enquête."""
        try:
            action = 'creation' if created else 'modification'
            details = {
                'status': instance.get_status_display() or '',
                'priority': instance.priority or '',
                'instructions_preview': (instance.instructions[:200] + '...') if instance.instructions and len(instance.instructions) > 200 else (instance.instructions or ''),
                'fiche_numero': instance.fiche.numero_fiche if instance.fiche else '',
                'fiche_nom': f"{instance.fiche.nom} {instance.fiche.prenom}" if instance.fiche else '',
                'enqueteur_assigné': instance.assigned_investigator.username if instance.assigned_investigator else '',
                'assigné_par': instance.assigned_by.username if instance.assigned_by else '',
            }
            
            # Pour les modifications, ajouter old_values et new_values
            if not created and instance.pk in _assignment_pre_save_data:
                old_data = _assignment_pre_save_data[instance.pk]
                details['old_values'] = old_data
                details['new_values'] = {
                    'status': instance.status,
                    'instructions': instance.instructions or '',
                    'priority': instance.priority or '',
                }
                # Identifier les champs modifiés
                changed_fields = []
                if old_data.get('status') != instance.status:
                    changed_fields.append('status')
                if old_data.get('instructions') != instance.instructions:
                    changed_fields.append('instructions')
                if old_data.get('priority') != instance.priority:
                    changed_fields.append('priority')
                if changed_fields:
                    details['changed_fields'] = changed_fields
                # Nettoyer après utilisation
                del _assignment_pre_save_data[instance.pk]
            
            enregistrer_action_audit(
                action=action,
                ressource='Assignation d\'Enquête',
                ressource_id=instance.id,
                details=details
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'audit pour assignation: {e}")
    
    # NOTE: Le signal générique post_delete_audit capture déjà les suppressions
    # avec les données before/after. Pas besoin de signal spécifique pour DELETE.
    #     """Désactivé - le signal générique post_delete_audit gère déjà les suppressions."""
except ImportError:
    logger.warning("Module criminel non disponible, signals d'audit pour assignations désactivés")

