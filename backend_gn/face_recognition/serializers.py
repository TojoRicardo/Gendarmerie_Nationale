"""
Serializers Django REST Framework pour l'API de reconnaissance faciale.
"""

from rest_framework import serializers
from .models import Person, FaceEmbedding, FaceRecognitionLog
import uuid


class PersonSerializer(serializers.ModelSerializer):
    """Serializer pour le modèle Person"""
    faces_count = serializers.IntegerField(source='faces_count', read_only=True)
    
    class Meta:
        model = Person
        fields = [
            'id',
            'name',
            'email',
            'created_at',
            'updated_at',
            'faces_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'faces_count']


class PersonCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une personne"""
    
    class Meta:
        model = Person
        fields = ['name', 'email']
    
    def validate_email(self, value):
        """Valider l'email si fourni"""
        if value and Person.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        return value


class FaceEmbeddingSerializer(serializers.ModelSerializer):
    """Serializer pour le modèle FaceEmbedding"""
    person_name = serializers.CharField(source='person.name', read_only=True)
    person_id = serializers.UUIDField(source='person.id', read_only=True)
    
    class Meta:
        model = FaceEmbedding
        fields = [
            'id',
            'person',
            'person_id',
            'person_name',
            'embedding',
            'image_path',
            'confidence_score',
            'image_width',
            'image_height',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FaceEmbeddingCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un embedding facial"""
    
    class Meta:
        model = FaceEmbedding
        fields = [
            'person',
            'embedding',
            'image_path',
            'confidence_score',
            'image_width',
            'image_height'
        ]
    
    def validate_embedding(self, value):
        """Valider que l'embedding est une liste de 512 éléments"""
        if not isinstance(value, list):
            raise serializers.ValidationError("L'embedding doit être une liste.")
        if len(value) != 512:
            raise serializers.ValidationError(f"L'embedding doit contenir 512 dimensions, reçu {len(value)}.")
        return value
    
    def validate_confidence_score(self, value):
        """Valider le score de confiance"""
        if not 0.0 <= value <= 1.0:
            raise serializers.ValidationError("Le score de confiance doit être entre 0.0 et 1.0.")
        return value


class FaceRecognitionLogSerializer(serializers.ModelSerializer):
    """Serializer pour le modèle FaceRecognitionLog"""
    detected_person_name = serializers.CharField(
        source='detected_person.name',
        read_only=True,
        allow_null=True
    )
    detected_person_id = serializers.UUIDField(
        source='detected_person.id',
        read_only=True,
        allow_null=True
    )
    created_by_username = serializers.CharField(
        source='created_by.username',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = FaceRecognitionLog
        fields = [
            'id',
            'detected_person',
            'detected_person_id',
            'detected_person_name',
            'embedding_vector',
            'confidence_score',
            'image_path',
            'timestamp',
            'status',
            'threshold_used',
            'processing_time_ms',
            'created_by',
            'created_by_username'
        ]
        read_only_fields = ['id', 'timestamp']


class RecognizeRequestSerializer(serializers.Serializer):
    """Serializer pour la requête de reconnaissance"""
    image = serializers.ImageField(
        help_text="Image à analyser (JPEG, PNG)"
    )
    threshold = serializers.FloatField(
        default=0.6,
        min_value=0.0,
        max_value=1.0,
        help_text="Seuil de confiance minimum (défaut: 0.6)"
    )
    top_k = serializers.IntegerField(
        default=1,
        min_value=1,
        max_value=10,
        help_text="Nombre de résultats à retourner (défaut: 1)"
    )
    include_embedding = serializers.BooleanField(
        default=False,
        help_text="Inclure le vecteur d'embedding dans la réponse"
    )


class RecognizeResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse de reconnaissance"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.DictField(required=False)
    timestamp = serializers.DateTimeField()


class VerifyRequestSerializer(serializers.Serializer):
    """Serializer pour la requête de vérification"""
    image = serializers.ImageField(
        help_text="Image à vérifier"
    )
    person_id = serializers.UUIDField(
        help_text="ID de la personne à vérifier"
    )
    threshold = serializers.FloatField(
        default=0.6,
        min_value=0.0,
        max_value=1.0,
        help_text="Seuil de confiance minimum (défaut: 0.6)"
    )


class VerifyResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse de vérification"""
    success = serializers.BooleanField()
    verified = serializers.BooleanField()
    confidence_score = serializers.FloatField()
    message = serializers.CharField()
    timestamp = serializers.DateTimeField()


class StatsResponseSerializer(serializers.Serializer):
    """Serializer pour les statistiques"""
    total_persons = serializers.IntegerField()
    total_embeddings = serializers.IntegerField()
    total_logs = serializers.IntegerField()
    recognized_count = serializers.IntegerField()
    unknown_count = serializers.IntegerField()
    average_confidence = serializers.FloatField()

