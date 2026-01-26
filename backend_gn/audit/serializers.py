"""
Serializers pour le Journal d'Audit Professionnel
"""

from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import AuditLog, JournalAudit, UserSession, JournalAuditNarratif  # JournalAudit est un alias
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class UserAuditSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour l'utilisateur dans l'audit."""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
    
    def get_full_name(self, obj):
        """Retourne le nom complet de l'utilisateur."""
        try:
            if obj is None:
                return 'Système'
            # Vérifier que obj est bien un objet User
            if isinstance(obj, str):
                return obj
            if not hasattr(obj, '_meta'):
                return 'Système'
            # Utiliser get_full_name si disponible, sinon construire manuellement
            if hasattr(obj, 'get_full_name'):
                full_name = obj.get_full_name()
                if full_name:
                    return full_name
            # Fallback sur first_name et last_name
            first_name = getattr(obj, 'first_name', '') or getattr(obj, 'prenom', '')
            last_name = getattr(obj, 'last_name', '') or getattr(obj, 'nom', '')
            full_name = f"{first_name} {last_name}".strip()
            return full_name or getattr(obj, 'username', 'Système')
        except Exception as e:
            logger.error(f"Erreur dans UserAuditSerializer.get_full_name: {e}")
            return 'Système'
    
    def to_representation(self, instance):
        """Surcharge pour gérer les cas où instance pourrait être None ou une chaîne."""
        try:
            if instance is None:
                return None
            
            # Vérifier si c'est une chaîne (ne pas utiliser hasattr car les chaînes ont aussi des attributs)
            if isinstance(instance, str):
                return {
                    'id': None,
                    'username': instance,
                    'email': None,
                    'first_name': None,
                    'last_name': None,
                    'full_name': instance
                }
            
            # Vérifier que instance est bien un objet modèle Django
            # Utiliser isinstance pour vérifier si c'est une instance de modèle
            try:
                # Tenter d'accéder à _meta de manière sûre
                if not hasattr(instance, '_meta') or not hasattr(instance._meta, 'model'):
                    # Ce n'est pas un modèle Django valide
                    if hasattr(instance, 'username'):
                        # Peut-être un objet user-like mais pas un modèle
                        return {
                            'id': getattr(instance, 'id', None),
                            'username': getattr(instance, 'username', 'Système'),
                            'email': getattr(instance, 'email', None),
                            'first_name': getattr(instance, 'first_name', None) or getattr(instance, 'prenom', None),
                            'last_name': getattr(instance, 'last_name', None) or getattr(instance, 'nom', None),
                            'full_name': self.get_full_name(instance)
                        }
                    return {
                        'id': None,
                        'username': str(instance),
                        'email': None,
                        'first_name': None,
                        'last_name': None,
                        'full_name': str(instance)
                    }
                
                # Si on arrive ici, c'est un modèle Django valide, utiliser la méthode parente
                try:
                    return super().to_representation(instance)
                except (AttributeError, TypeError) as e:
                    # Si super() échoue (par exemple si instance n'est pas vraiment un modèle),
                    # construire manuellement
                    logger.debug(f"Super().to_representation() a échoué, construction manuelle: {e}")
                    return {
                        'id': getattr(instance, 'id', None),
                        'username': getattr(instance, 'username', 'Système'),
                        'email': getattr(instance, 'email', None),
                        'first_name': getattr(instance, 'first_name', None) or getattr(instance, 'prenom', None),
                        'last_name': getattr(instance, 'last_name', None) or getattr(instance, 'nom', None),
                        'full_name': self.get_full_name(instance)
                    }
            except AttributeError:
                # Si _meta n'existe pas ou n'a pas d'attribut model, construire manuellement
                return {
                    'id': getattr(instance, 'id', None),
                    'username': getattr(instance, 'username', 'Système'),
                    'email': getattr(instance, 'email', None),
                    'first_name': getattr(instance, 'first_name', None) or getattr(instance, 'prenom', None),
                    'last_name': getattr(instance, 'last_name', None) or getattr(instance, 'nom', None),
                    'full_name': self.get_full_name(instance)
                }
        except Exception as e:
            logger.error(f"Erreur dans UserAuditSerializer.to_representation: {e}", exc_info=True)
            # Retourner une représentation minimale en cas d'erreur
            try:
                return {
                    'id': getattr(instance, 'id', None) if instance else None,
                    'username': str(instance) if instance else 'Système',
                    'email': None,
                    'first_name': None,
                    'last_name': None,
                    'full_name': str(instance) if instance else 'Système'
                }
            except Exception:
                return None


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer pour les entrées du Journal d'Audit Professionnel."""
    
    user_info = UserAuditSerializer(source='user', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_display = serializers.SerializerMethodField()
    # Format JSON standardisé
    json_format = serializers.SerializerMethodField()
    # Champs before/after en SerializerMethodField pour compatibilité avec migration non appliquée
    before = serializers.SerializerMethodField()
    after = serializers.SerializerMethodField()
    
    # Nouveaux champs pour le format professionnel
    session_info = serializers.SerializerMethodField()
    session_display = serializers.SerializerMethodField()
    reference = serializers.CharField(read_only=True, allow_null=True)
    operation_index = serializers.IntegerField(read_only=True, allow_null=True)
    start_time = serializers.DateTimeField(read_only=True, allow_null=True)
    end_time = serializers.DateTimeField(read_only=True, allow_null=True)
    description_before = serializers.CharField(read_only=True, allow_null=True)
    description_after = serializers.CharField(read_only=True, allow_null=True)
    narrative_text = serializers.CharField(read_only=True, allow_null=True)
    # Texte narratif avec gestion d'erreur pour compatibilité
    narrative_text = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_info',
            'user_display',
            'user_role',
            'session_info',
            'session_display',
            'action',
            'action_display',
            'resource_type',
            'resource_id',
            'endpoint',
            'method',
            'ip_address',
            'user_agent',
            'browser',
            'os',
            'before',
            'after',
            'data_before',
            'data_after',
            'changes_before',
            'changes_after',
            'description',
            'description_short',
            'narrative_text',
            'description_before',
            'description_after',
            'timestamp',
            'start_time',
            'end_time',
            'reference',
            'operation_index',
            'reussi',
            'message_erreur',
            'json_format',
        ]
        read_only_fields = ['timestamp', 'description', 'description_short', 'narrative_text', 'json_format', 'before', 'after', 'session_info', 'session_display', 'reference', 'operation_index', 'start_time', 'end_time', 'description_before', 'description_after']
    
    def get_before(self, obj):
        """Récupère les données avant modification (compatible avec migration non appliquée)."""
        # Essayer d'abord le nouveau champ, puis les anciens pour compatibilité
        if hasattr(obj, 'before') and obj.before is not None:
            return obj.before
        if hasattr(obj, 'changes_before') and obj.changes_before is not None:
            return obj.changes_before
        if hasattr(obj, 'data_before') and obj.data_before:
            return obj.data_before
        return {}
    
    def get_after(self, obj):
        """Récupère les données après modification (compatible avec migration non appliquée)."""
        # Essayer d'abord le nouveau champ, puis les anciens pour compatibilité
        if hasattr(obj, 'after') and obj.after is not None:
            return obj.after
        if hasattr(obj, 'changes_after') and obj.changes_after is not None:
            return obj.changes_after
        if hasattr(obj, 'data_after') and obj.data_after:
            return obj.data_after
        return {}
    
    def get_user_display(self, obj):
        """Retourne le nom d'utilisateur ou 'Système'."""
        try:
            if obj.user:
                # Vérifier que obj.user est bien un objet User et non une chaîne
                if hasattr(obj.user, 'username'):
                    full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
                    return full_name or obj.user.username
                elif isinstance(obj.user, str):
                    return obj.user
            return 'Système'
        except Exception as e:
            logger.error(f"Erreur dans get_user_display: {e}")
            return 'Système'
    
    def get_session_info(self, obj):
        """Retourne les informations de la session."""
        try:
            if hasattr(obj, 'session') and obj.session:
                return {
                    'id': obj.session.id,
                    'session_key': obj.session.session_key,
                    'start_time': obj.session.start_time,
                    'end_time': obj.session.end_time,
                    'ip_address': str(obj.session.ip_address) if obj.session.ip_address else None,
                }
        except Exception:
            pass
        return None
    
    def get_session_display(self, obj):
        """Retourne l'affichage de la session (heures de début/fin)."""
        try:
            if hasattr(obj, 'session') and obj.session:
                start = obj.session.start_time.strftime('%H:%M:%S') if obj.session.start_time else 'N/A'
                end = obj.session.end_time.strftime('%H:%M:%S') if obj.session.end_time else 'En cours'
                return f"{start} → {end}"
        except Exception:
            pass
        
        # Fallback sur start_time/end_time de l'audit log
        try:
            if hasattr(obj, 'start_time') and obj.start_time:
                start = obj.start_time.strftime('%H:%M:%S')
                if hasattr(obj, 'end_time') and obj.end_time:
                    end = obj.end_time.strftime('%H:%M:%S')
                    return f"{start} → {end}"
                return f"{start} → En cours"
        except Exception:
            pass
        return None
    
    def get_narrative_text(self, obj):
        """Retourne le texte narratif avec gestion d'erreur pour compatibilité."""
        try:
            # Essayer d'accéder au champ directement
            if hasattr(obj, 'narrative_text'):
                return obj.narrative_text
            # Si le champ n'existe pas encore, générer le texte narratif
            if hasattr(obj, '_generate_narrative_text'):
                return obj._generate_narrative_text()
            return None
        except Exception as e:
            logger.debug(f"Erreur lors de la récupération du narrative_text: {e}")
            return None
    
    def get_json_format(self, obj):
        """Retourne le format JSON standardisé."""
        try:
            return obj.to_json()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de la génération du format JSON: {e}")
            return {}
    
    def to_representation(self, instance):
        """Surcharge pour gérer les erreurs de sérialisation et compatibilité."""
        try:
            if isinstance(instance, dict):
                data = instance.copy()
                # Ajouter les alias pour compatibilité
                data['utilisateur'] = data.get('user')
                data['utilisateur_info'] = data.get('user_info')
                data['utilisateur_display'] = data.get('user_info', {}).get('full_name') if isinstance(data.get('user_info'), dict) else data.get('user_display')
                data['ressource'] = data.get('resource_type')
                data['ressource_id'] = data.get('resource_id')
                data['ip_adresse'] = data.get('ip_address')
                data['methode_http'] = data.get('method')
                data['date_action'] = data.get('timestamp')
                data['description_narrative'] = data.get('description')
                return data
            
            # Sinon, traitement normal - gérer le cas où session n'existe pas encore
            try:
                data = super().to_representation(instance)
            except Exception as db_error:
                # Si erreur liée à session_id, narrative_text ou autre champ manquant, essayer sans
                error_str = str(db_error).lower()
                if 'session_id' in error_str or 'session' in error_str or 'narrative_text' in error_str:
                    # Créer une représentation manuelle sans les champs problématiques
                    data = {
                        'id': instance.id,
                        'user': instance.user_id if hasattr(instance, 'user_id') else None,
                        'action': instance.action,
                        'resource_type': instance.resource_type,
                        'resource_id': instance.resource_id,
                        'timestamp': instance.timestamp.isoformat() if instance.timestamp else None,
                        'ip_address': str(instance.ip_address) if instance.ip_address else None,
                        'browser': instance.browser,
                        'os': instance.os,
                        'description': instance.description,
                        'description_short': getattr(instance, 'description_short', None),
                        'narrative_text': None,  # Sera généré côté frontend si nécessaire
                        'session': None,
                        'session_info': None,
                        'session_display': None,
                    }
                    # Ajouter les autres champs si disponibles
                    for field in ['user_role', 'endpoint', 'method', 'reussi', 'message_erreur']:
                        if hasattr(instance, field):
                            data[field] = getattr(instance, field)
                else:
                    raise
            
            # Ajouter des alias pour compatibilité avec l'ancien code frontend
            data['utilisateur'] = data.get('user')
            data['utilisateur_info'] = data.get('user_info')
            data['utilisateur_display'] = data.get('user_display')
            data['ressource'] = data.get('resource_type')
            data['ressource_id'] = data.get('resource_id')
            data['ip_adresse'] = data.get('ip_address')
            data['methode_http'] = data.get('method')
            data['date_action'] = data.get('timestamp')
            data['description_narrative'] = data.get('description')
            
            # Gérer narrative_text avec fallback si le champ n'existe pas encore
            if 'narrative_text' not in data:
                try:
                    # Essayer de générer le narrative_text si le champ existe dans le modèle
                    if hasattr(instance, 'narrative_text'):
                        data['narrative_text'] = instance.narrative_text
                    elif hasattr(instance, '_generate_narrative_text'):
                        data['narrative_text'] = instance._generate_narrative_text()
                    else:
                        data['narrative_text'] = None
                except Exception:
                    data['narrative_text'] = None
            
            return data
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de la sérialisation de l'entrée d'audit {getattr(instance, 'id', 'unknown')}: {e}")
            
            # Représentation minimale en cas d'erreur
            if isinstance(instance, dict):
                return instance
            
            # Gérer le cas où user pourrait être une chaîne ou None
            user_display = 'Système'
            user_id = None
            try:
                if hasattr(instance, 'user') and instance.user:
                    if hasattr(instance.user, 'username'):
                        # C'est un objet User
                        user_id = instance.user.id if hasattr(instance.user, 'id') else None
                        user_display = instance.user.username
                    elif isinstance(instance.user, str):
                        user_display = instance.user
                    elif hasattr(instance, 'user_id'):
                        user_id = instance.user_id
            except Exception:
                pass
            
            return {
                'id': getattr(instance, 'id', None),
                'user': user_id,
                'user_info': None,
                'user_display': user_display,
                'action': getattr(instance, 'action', ''),
                'action_display': instance.get_action_display() if hasattr(instance, 'get_action_display') and hasattr(instance, 'action') and instance.action else '',
                'resource_type': getattr(instance, 'resource_type', '') or '',
                'resource_id': getattr(instance, 'resource_id', None),
                'description': getattr(instance, 'description', '') or '',
                'ip_address': str(instance.ip_address) if hasattr(instance, 'ip_address') and instance.ip_address else None,
                'timestamp': instance.timestamp.isoformat() if hasattr(instance, 'timestamp') and instance.timestamp else None,
                'reussi': getattr(instance, 'reussi', True),
                'json_format': instance.to_json() if hasattr(instance, 'to_json') else {},
            }


# Alias pour compatibilité avec l'ancien code
JournalAuditSerializer = AuditLogSerializer


class AuditLogCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une entrée d'audit."""
    
    class Meta:
        model = AuditLog
        fields = [
            'action',
            'resource_type',
            'resource_id',
            'endpoint',
            'method',
            'ip_address',
            'user_agent',
            'browser',
            'os',
            'before',
            'after',
            'data_before',
            'data_after',
            'reussi',
            'message_erreur',
        ]
    
    def create(self, validated_data):
        from .utils import log_action
        
        request = self.context.get('request')
        
        # Utiliser log_action pour créer l'entrée avec toutes les informations
        audit_entry = log_action(
            request=request,
            action=validated_data.get('action', 'VIEW'),
            resource_type=validated_data.get('resource_type', 'Ressource'),
            resource_id=validated_data.get('resource_id'),
            endpoint=validated_data.get('endpoint'),
            method=validated_data.get('method'),
            ip_address=validated_data.get('ip_address'),
            user_agent=validated_data.get('user_agent'),
            browser=validated_data.get('browser'),
            os=validated_data.get('os'),
            before=validated_data.get('before') or validated_data.get('data_before'),
            after=validated_data.get('after') or validated_data.get('data_after'),
            data_before=validated_data.get('data_before'),
            data_after=validated_data.get('data_after'),
            reussi=validated_data.get('reussi', True),
            message_erreur=validated_data.get('message_erreur'),
        )
        
        return audit_entry


# Alias pour compatibilité
JournalAuditCreateSerializer = AuditLogCreateSerializer


class SessionAuditSerializer(serializers.Serializer):
    """
    Serializer pour une session d'audit groupée contenant toutes les actions.
    """
    session_id = serializers.CharField(read_only=True)
    user = serializers.IntegerField(source='user_id', read_only=True)
    user_info = UserAuditSerializer(source='user', read_only=True, allow_null=True)
    user_display = serializers.SerializerMethodField()
    user_role = serializers.CharField(read_only=True)
    ip_address = serializers.CharField(read_only=True)
    browser = serializers.CharField(read_only=True)
    os = serializers.CharField(read_only=True)
    start_time = serializers.DateTimeField(read_only=True)
    end_time = serializers.DateTimeField(read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    actions_count = serializers.IntegerField(read_only=True)
    actions = AuditLogSerializer(many=True, read_only=True)
    actions_summary = serializers.SerializerMethodField()
    description_short = serializers.SerializerMethodField()
    
    def get_user_display(self, obj):
        """Retourne le nom d'affichage de l'utilisateur."""
        if obj.get('user'):
            user = obj['user']
            if hasattr(user, 'first_name') and hasattr(user, 'last_name'):
                full_name = f"{user.first_name} {user.last_name}".strip()
                if full_name:
                    return full_name
            return user.username if hasattr(user, 'username') else str(user)
        return "Système"
    
    def get_actions_summary(self, obj):
        """Retourne un résumé des actions de la session."""
        actions = obj.get('actions', [])
        summary = {}
        for action in actions:
            action_type = action.action if hasattr(action, 'action') else action.get('action', 'UNKNOWN')
            summary[action_type] = summary.get(action_type, 0) + 1
        return summary
    
    def get_description_short(self, obj):
        """Retourne une description courte de la session."""
        user_display = self.get_user_display(obj)
        start_time = obj.get('start_time')
        actions_count = obj.get('actions_count', 0)
        
        if start_time:
            date_str = start_time.strftime('%d/%m/%Y %H:%M')
            return f"Session de {user_display} - {actions_count} action(s) le {date_str}"
        return f"Session de {user_display} - {actions_count} action(s)"


class AuditLogStatistiquesSerializer(serializers.Serializer):
    """Serializer pour les statistiques du Journal d'Audit."""
    
    total_actions = serializers.IntegerField()
    actions_aujourdhui = serializers.IntegerField()
    actions_7_jours = serializers.IntegerField()
    actions_30_jours = serializers.IntegerField()
    
    par_action = serializers.DictField()
    par_ressource = serializers.DictField()
    par_utilisateur = serializers.DictField()
    
    actions_reussies = serializers.IntegerField()
    actions_echouees = serializers.IntegerField()
    taux_reussite = serializers.FloatField()


# Alias pour compatibilité
JournalAuditStatistiquesSerializer = AuditLogStatistiquesSerializer


class JournalAuditNarratifSerializer(serializers.ModelSerializer):
    """Serializer pour le journal d'audit narratif."""
    
    user_info = UserAuditSerializer(source='user', read_only=True)
    user_display = serializers.SerializerMethodField()
    duree_session_str = serializers.SerializerMethodField()
    session_key = serializers.CharField(source='session.session_key', read_only=True)
    
    class Meta:
        model = JournalAuditNarratif
        fields = [
            'id',
            'session',
            'session_key',
            'user',
            'user_info',
            'user_display',
            'date_debut',
            'date_fin',
            'description_narrative',
            'est_cloture',
            'ip_address',
            'user_agent',
            'browser',
            'os',
            'derniere_mise_a_jour',
            'duree_session_str',
        ]
        read_only_fields = [
            'id',
            'date_debut',
            'description_narrative',
            'est_cloture',
            'derniere_mise_a_jour',
        ]
    
    def get_user_display(self, obj):
        """Retourne le nom d'affichage de l'utilisateur."""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name or obj.user.username
        return "Système"
    
    def get_duree_session_str(self, obj):
        """Retourne la durée de la session formatée."""
        duree = obj.duree_session
        if not duree:
            return "En cours"
        
        total_seconds = int(duree.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        
        if hours > 0:
            return f"{hours}h {minutes}min {seconds}s"
        elif minutes > 0:
            return f"{minutes}min {seconds}s"
        else:
            return f"{seconds}s"


class JournalAuditNarratifListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des journaux narratifs."""
    
    user_display = serializers.SerializerMethodField()
    resume_narratif = serializers.SerializerMethodField()
    duree_session_str = serializers.SerializerMethodField()
    
    class Meta:
        model = JournalAuditNarratif
        fields = [
            'id',
            'user_display',
            'date_debut',
            'date_fin',
            'est_cloture',
            'resume_narratif',
            'duree_session_str',
            'ip_address',
            'browser',
        ]
    
    def get_user_display(self, obj):
        """Retourne le nom d'affichage de l'utilisateur."""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name or obj.user.username
        return "Système"
    
    def get_resume_narratif(self, obj):
        """Retourne un résumé du journal narratif (premières lignes)."""
        if not obj.description_narrative:
            return "Aucune action enregistrée."
        
        # Prendre les 200 premiers caractères
        resume = obj.description_narrative[:200]
        if len(obj.description_narrative) > 200:
            resume += "..."
        
        return resume
    
    def get_duree_session_str(self, obj):
        """Retourne la durée de la session formatée."""
        duree = obj.duree_session
        if not duree:
            return "En cours"
        
        total_seconds = int(duree.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        
        if hours > 0:
            return f"{hours}h {minutes}min"
        elif minutes > 0:
            return f"{minutes}min"
        else:
            return "< 1min"
