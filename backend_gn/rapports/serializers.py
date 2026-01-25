from rest_framework import serializers
from .models import Rapport


class RapportSerializer(serializers.ModelSerializer):
    type_rapport_display = serializers.CharField(source='get_type_rapport_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    cree_par_username = serializers.SerializerMethodField()
    url_fichier = serializers.SerializerMethodField()
    taille_mb = serializers.SerializerMethodField()
    est_termine = serializers.ReadOnlyField()
    
    class Meta:
        model = Rapport
        fields = [
            'id',
            'titre',
            'type_rapport',
            'type_rapport_display',
            'parametres',
            'fichier',
            'url_fichier',
            'statut',
            'statut_display',
            'cree_par',
            'cree_par_username',
            'date_creation',
            'date_generation',
            'taille_fichier',
            'taille_mb',
            'duree_generation',
            'message_erreur',
            'note',
            'est_termine',
        ]
        read_only_fields = [
            'id',
            'date_creation',
            'date_generation',
            'taille_fichier',
            'duree_generation',
            'url_fichier',
            'est_termine',
        ]
    
    def get_cree_par_username(self, obj):
        try:
            return obj.cree_par.username if obj.cree_par else None
        except Exception:
            return None
    
    def get_url_fichier(self, obj):
        if obj.fichier:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.fichier.url)
                return obj.fichier.url
            except (ValueError, AttributeError, Exception):
                return None
        return None
    
    def get_taille_mb(self, obj):
        try:
            if obj.taille_fichier:
                return round(obj.taille_fichier / (1024 * 1024), 2)
        except Exception:
            pass
        return None
    
    def to_representation(self, instance):
        try:
            data = super().to_representation(instance)
            if 'parametres' in data and data['parametres'] is None:
                data['parametres'] = {}
            return data
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de la sérialisation du rapport {instance.id}: {e}", exc_info=True)
            
            try:
                type_display = instance.get_type_rapport_display() if hasattr(instance, 'get_type_rapport_display') else 'Statistique'
                statut_display = instance.get_statut_display() if hasattr(instance, 'get_statut_display') else 'En attente'
            except:
                type_display = 'Statistique'
                statut_display = 'En attente'
            
            return {
                'id': str(instance.id),
                'titre': getattr(instance, 'titre', 'Rapport'),
                'type_rapport': getattr(instance, 'type_rapport', 'statistique'),
                'type_rapport_display': type_display,
                'statut': getattr(instance, 'statut', 'en_attente'),
                'statut_display': statut_display,
                'parametres': getattr(instance, 'parametres', {}) or {},
                'date_creation': instance.date_creation.isoformat() if hasattr(instance, 'date_creation') and instance.date_creation else None,
                'cree_par_username': instance.cree_par.username if hasattr(instance, 'cree_par') and instance.cree_par else None,
                'url_fichier': None,
                'taille_mb': None,
                'est_termine': False,
                'erreur_serialisation': str(e)
            }


class RapportCreateSerializer(serializers.Serializer):
    titre = serializers.CharField(max_length=255, required=False, allow_blank=True)
    type_rapport = serializers.ChoiceField(choices=Rapport.TYPE_CHOICES, required=True)
    parametres = serializers.JSONField(required=False, default=dict)
    periode_type = serializers.ChoiceField(
        choices=[
            ('journalier', 'Journalier'),
            ('mensuel', 'Mensuel'),
            ('3mois', 'Trimestriel'),
            ('6mois', 'Semestriel'),
            ('annuel', 'Annuel'),
            ('personnalise', 'Personnalisé'),
        ],
        required=False,
        allow_null=True
    )
    note = serializers.CharField(required=False, allow_blank=True)
    
    def validate_titre(self, value):
        if value and value.strip():
            return value.strip()
        return None
    
    def validate(self, attrs):
        from datetime import datetime, timedelta, date
        
        type_rapport = attrs.get('type_rapport')
        parametres = attrs.get('parametres', {})
        periode_type = attrs.get('periode_type')
        
        if periode_type and type_rapport == 'statistique':
            aujourd_hui = date.today()
            
            if periode_type == 'journalier':
                date_debut = aujourd_hui
                date_fin = aujourd_hui
            elif periode_type == 'mensuel':
                date_debut = date(aujourd_hui.year, aujourd_hui.month, 1)
                if aujourd_hui.month == 12:
                    date_fin = date(aujourd_hui.year + 1, 1, 1) - timedelta(days=1)
                else:
                    date_fin = date(aujourd_hui.year, aujourd_hui.month + 1, 1) - timedelta(days=1)
            elif periode_type == '3mois':
                # 3 derniers mois : du début du mois il y a 3 mois jusqu'à aujourd'hui
                mois_debut = aujourd_hui.month - 2
                annee_debut = aujourd_hui.year
                if mois_debut <= 0:
                    mois_debut += 12
                    annee_debut -= 1
                date_debut = date(annee_debut, mois_debut, 1)
                date_fin = aujourd_hui
            elif periode_type == '6mois':
                # 6 derniers mois : du début du mois il y a 6 mois jusqu'à aujourd'hui
                mois_debut = aujourd_hui.month - 5
                annee_debut = aujourd_hui.year
                if mois_debut <= 0:
                    mois_debut += 12
                    annee_debut -= 1
                date_debut = date(annee_debut, mois_debut, 1)
                date_fin = aujourd_hui
            elif periode_type == 'annuel':
                date_debut = date(aujourd_hui.year, 1, 1)
                date_fin = date(aujourd_hui.year, 12, 31)
            else:
                if 'date_debut' not in parametres or 'date_fin' not in parametres:
                    raise serializers.ValidationError(
                        "Les dates de début et de fin sont requises pour une période personnalisée"
                    )
                try:
                    date_debut = datetime.strptime(parametres['date_debut'], '%Y-%m-%d').date()
                    date_fin = datetime.strptime(parametres['date_fin'], '%Y-%m-%d').date()
                except (ValueError, KeyError):
                    raise serializers.ValidationError(
                        "Format de date invalide. Utilisez YYYY-MM-DD"
                    )
            
            if periode_type != 'personnalise':
                parametres['date_debut'] = date_debut.strftime('%Y-%m-%d')
                parametres['date_fin'] = date_fin.strftime('%Y-%m-%d')
                parametres['periode_type'] = periode_type
            
            attrs['parametres'] = parametres
        
        if type_rapport == 'statistique':
            if 'date_debut' not in parametres or 'date_fin' not in parametres:
                raise serializers.ValidationError(
                    "Les dates de début et de fin sont requises pour les rapports statistiques"
                )
            try:
                date_debut = datetime.strptime(parametres['date_debut'], '%Y-%m-%d').date()
                date_fin = datetime.strptime(parametres['date_fin'], '%Y-%m-%d').date()
                if date_debut > date_fin:
                    raise serializers.ValidationError(
                        "La date de début doit être antérieure ou égale à la date de fin"
                    )
            except (ValueError, KeyError):
                pass
        
        elif type_rapport == 'criminel':
            if 'criminel_id' not in parametres:
                raise serializers.ValidationError(
                    "L'ID du criminel est requis"
                )
        
        elif type_rapport == 'enquete':
            if 'enquete_id' not in parametres:
                raise serializers.ValidationError(
                    "L'ID de l'enquête est requis"
                )
        
        if not attrs.get('titre'):
            periode_str = periode_type or 'personnalise'
            attrs['titre'] = f"Rapport {type_rapport} - {periode_str.capitalize()} - {date.today().strftime('%d/%m/%Y')}"
        
        return attrs
