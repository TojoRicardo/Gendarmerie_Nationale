"""
Serializers complets pour le module UPR avec nested objects.
"""

from rest_framework import serializers
from .models import UnidentifiedPerson, UPRMatchLog, CriminelMatchLog, Camera, UPRLog, CameraCapture
from criminel.models import CriminalFicheCriminelle
import logging

logger = logging.getLogger(__name__)


class CriminelMatchSerializer(serializers.ModelSerializer):
    """Serializer pour les correspondances avec les fiches criminelles."""
    
    numero_fiche = serializers.CharField(source='criminel_target.numero_fiche', read_only=True)
    nom = serializers.CharField(source='criminel_target.nom', read_only=True)
    prenom = serializers.CharField(source='criminel_target.prenom', read_only=True)
    
    class Meta:
        model = CriminelMatchLog
        fields = [
            'id',
            'criminel_target',
            'numero_fiche',
            'nom',
            'prenom',
            'distance',
            'is_strict_match',
            'is_weak_match',
            'match_date'
        ]


class UPRMatchSerializer(serializers.ModelSerializer):
    """Serializer pour les correspondances entre UPR."""
    
    code_upr_target = serializers.CharField(source='upr_target.code_upr', read_only=True)
    nom_temporaire_target = serializers.CharField(source='upr_target.nom_temporaire', read_only=True)
    
    class Meta:
        model = UPRMatchLog
        fields = [
            'id',
            'upr_target',
            'code_upr_target',
            'nom_temporaire_target',
            'distance',
            'is_strict_match',
            'is_weak_match',
            'match_date'
        ]


class UnidentifiedPersonSerializer(serializers.ModelSerializer):
    """Serializer principal pour les personnes non identifiées."""
    
    # URLs des images
    profil_face_url = serializers.SerializerMethodField()
    profil_left_url = serializers.SerializerMethodField()
    profil_right_url = serializers.SerializerMethodField()
    empreinte_digitale_url = serializers.SerializerMethodField()
    
    # Informations du créateur
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    matches_upr = UPRMatchSerializer(many=True, read_only=True, source='matches_upr_source')
    matches_criminel = CriminelMatchSerializer(many=True, read_only=True)
    
    class Meta:
        model = UnidentifiedPerson
        fields = [
            'id',
            'code_upr',
            'nom_temporaire',
            'profil_face',
            'profil_face_url',
            'profil_left',
            'profil_left_url',
            'profil_right',
            'profil_right_url',
            'landmarks_106',
            'face_embedding',
            'face_encoding',
            'empreinte_digitale',
            'empreinte_digitale_url',
            'context_location',
            'discovered_date',
            'notes',
            'is_resolved',
            'is_archived',
            'archived_at',
            'archived_by',
            'resolved_at',
            'resolved_to_criminel',
            'date_enregistrement',
            'created_by',
            'created_by_username',
            'created_at',
            'updated_at',
            'matches_upr',
            'matches_criminel'
        ]
        read_only_fields = [
            'id',
            'code_upr',
            'nom_temporaire',
            'landmarks_106',
            'face_embedding',
            'face_encoding',
            'is_resolved',
            'is_archived',
            'archived_at',
            'archived_by',
            'resolved_at',
            'resolved_to_criminel',
            'date_enregistrement',
            'created_at',
            'updated_at',
            'matches_upr',
            'matches_criminel'
        ]
    
    def get_profil_face_url(self, obj):
        """Retourne l'URL complète de la photo de face."""
        if obj.profil_face:
            try:
                # Vérifier que le fichier existe et a un nom valide
                if hasattr(obj.profil_face, 'url') and obj.profil_face.name and obj.profil_face.name != '1':
                    url = obj.profil_face.url
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(url)
                    return url
            except (ValueError, AttributeError) as e:
                logger.warning(f"Impossible de générer l'URL pour profil_face de UPR {obj.id}: {e}")
                return None
        return None
    
    def get_profil_left_url(self, obj):
        """Retourne l'URL complète de la photo de profil gauche."""
        if obj.profil_left:
            try:
                if hasattr(obj.profil_left, 'url') and obj.profil_left.name:
                    url = obj.profil_left.url
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(url)
                    return url
            except (ValueError, AttributeError) as e:
                logger.warning(f"Impossible de générer l'URL pour profil_left de UPR {obj.id}: {e}")
                return None
        return None
    
    def get_profil_right_url(self, obj):
        """Retourne l'URL complète de la photo de profil droit."""
        if obj.profil_right:
            try:
                if hasattr(obj.profil_right, 'url') and obj.profil_right.name:
                    url = obj.profil_right.url
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(url)
                    return url
            except (ValueError, AttributeError) as e:
                logger.warning(f"Impossible de générer l'URL pour profil_right de UPR {obj.id}: {e}")
                return None
        return None
    
    def get_empreinte_digitale_url(self, obj):
        """Retourne l'URL complète de l'empreinte digitale."""
        if obj.empreinte_digitale:
            try:
                if hasattr(obj.empreinte_digitale, 'url') and obj.empreinte_digitale.name:
                    url = obj.empreinte_digitale.url
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(url)
                    return url
            except (ValueError, AttributeError) as e:
                logger.warning(f"Impossible de générer l'URL pour empreinte_digitale de UPR {obj.id}: {e}")
                return None
        return None


class UnidentifiedPersonCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'un UPR avec extraction automatique."""
    
    class Meta:
        model = UnidentifiedPerson
        fields = [
            'profil_face',
            'profil_left',
            'profil_right',
            'empreinte_digitale',
            'context_location',
            'discovered_date',
            'notes'
        ]
        # Les champs d'archivage ne doivent pas être modifiables lors de la création
        read_only_fields = ['is_archived', 'archived_at', 'archived_by']
    
    def create(self, validated_data):
        """Crée un UPR avec les fichiers uploadés."""
        # Récupérer created_by depuis le contexte si disponible
        created_by = self.context.get('created_by')
        if created_by:
            validated_data['created_by'] = created_by
        
        # Vérifier que les fichiers sont bien présents dans validated_data
        logger.info(f"Création UPR avec données: {list(validated_data.keys())}")
        if 'profil_face' in validated_data:
            file_obj = validated_data['profil_face']
            logger.info(f"Fichier profil_face: type={type(file_obj)}, name={getattr(file_obj, 'name', 'N/A')}")
        
        upr = UnidentifiedPerson.objects.create(**validated_data)
        
        # Vérifier après création
        if upr.profil_face:
            logger.info(f"UPR créé - profil_face.name: {upr.profil_face.name}, profil_face.url: {upr.profil_face.url}")
        else:
            logger.error(f"UPR créé SANS profil_face!")
        
        return upr


class UnidentifiedPersonListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des UPR."""
    
    profil_face_url = serializers.SerializerMethodField()
    has_matches = serializers.SerializerMethodField()
    
    class Meta:
        model = UnidentifiedPerson
        fields = [
            'id',
            'code_upr',
            'nom_temporaire',
            'profil_face_url',
            'context_location',
            'discovered_date',
            'date_enregistrement',
            'is_resolved',
            'is_archived',
            'archived_at',
            'archived_by',
            'has_matches'
        ]
    
    def get_profil_face_url(self, obj):
        """Retourne l'URL complète de la photo de face."""
        if obj.profil_face:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profil_face.url)
            return obj.profil_face.url
        return None
    
    def get_has_matches(self, obj):
        """Indique si l'UPR a des correspondances."""
        return (
            obj.matches_upr_source.exists() or
            obj.matches_criminel.exists()
        )


class MatchResultSerializer(serializers.Serializer):
    """Serializer pour les résultats de correspondance."""
    
    type = serializers.CharField()  # "UPR" ou "CRIMINEL"
    id = serializers.IntegerField()
    code_upr = serializers.CharField(required=False, allow_null=True)
    numero_fiche = serializers.CharField(required=False, allow_null=True)
    nom = serializers.CharField(required=False, allow_null=True)
    prenom = serializers.CharField(required=False, allow_null=True)
    nom_temporaire = serializers.CharField(required=False, allow_null=True)
    distance = serializers.FloatField()
    is_strict_match = serializers.BooleanField()
    is_weak_match = serializers.BooleanField()
    match_log_id = serializers.IntegerField(required=False, allow_null=True)


class CameraSerializer(serializers.ModelSerializer):
    """Serializer pour les caméras."""
    
    class Meta:
        model = Camera
        fields = [
            'id',
            'camera_id',
            'name',
            'source',
            'camera_type',
            'active',
            'last_seen',
            'frame_count',
            'detection_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'active',
            'last_seen',
            'frame_count',
            'detection_count',
            'created_at',
            'updated_at'
        ]


class UPRLogSerializer(serializers.ModelSerializer):
    """Serializer pour les logs UPR."""
    
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True, allow_null=True)
    
    class Meta:
        model = UPRLog
        fields = [
            'id',
            'user',
            'user_username',
            'camera',
            'camera_name',
            'action',
            'details',
            'criminal_id',
            'upr_id',
            'match_score',
            'frame_url',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'created_at'
        ]


class AlertDetectionSerializer(serializers.Serializer):
    """Serializer pour les alertes de détection depuis multi_camera_service."""
    
    camera_id = serializers.CharField(required=True)
    timestamp = serializers.DateTimeField(required=True)
    matches = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    best_match = serializers.DictField(required=False, allow_null=True)
    frame_base64 = serializers.CharField(required=False, allow_blank=True)
    detection_info = serializers.DictField(required=False, default=dict)


class CompareEmbeddingSerializer(serializers.Serializer):
    """Serializer pour la comparaison d'embedding avec UPR."""
    
    embedding = serializers.ListField(
        child=serializers.FloatField(),
        required=True,
        help_text="Vecteur d'embedding facial normalisé (512 dimensions)"
    )
    top_k = serializers.IntegerField(
        default=3,
        min_value=1,
        max_value=10,
        help_text="Nombre de correspondances à retourner"
    )


class CameraCaptureSerializer(serializers.ModelSerializer):
    """Serializer pour les captures caméra."""
    
    user_username = serializers.CharField(source='user.username', read_only=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True, allow_null=True)
    image_url = serializers.SerializerMethodField()
    criminel_numero_fiche = serializers.CharField(source='criminel.numero_fiche', read_only=True, allow_null=True)
    suspect_upr_code = serializers.CharField(source='suspect_upr.code_upr', read_only=True, allow_null=True)
    
    class Meta:
        model = CameraCapture
        fields = [
            'id',
            'user',
            'user_username',
            'camera',
            'camera_name',
            'camera_index',
            'camera_type',
            'image',
            'image_url',
            'criminel',
            'criminel_numero_fiche',
            'suspect_upr',
            'suspect_upr_code',
            'capture_metadata',
            'notes',
            'captured_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'user',
            'captured_at',
            'created_at',
            'updated_at'
        ]
    
    def get_image_url(self, obj):
        """Retourne l'URL complète de l'image."""
        if obj.image:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
            except (ValueError, AttributeError):
                return None
        return None


class CameraCaptureCreateSerializer(serializers.Serializer):
    """Serializer pour créer une capture caméra."""
    
    camera_index = serializers.IntegerField(
        required=True,
        min_value=0,
        help_text="Index de la caméra (0 = intégrée, 1 = USB externe)"
    )
    criminel_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID de la fiche criminelle associée (optionnel)"
    )
    suspect_upr_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID du suspect UPR associé (optionnel)"
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notes et observations sur la capture"
    )
