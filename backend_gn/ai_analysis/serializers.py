from rest_framework import serializers
from .models import (
    Cas,
    EvolutionMensuelle,
    EvolutionDetaillee,
    RepartitionGeographique,
    ActiviteTempsReel
)


class CasSerializer(serializers.ModelSerializer):
    """
    Serializer pour les cas criminels et incidents.
    """
    class Meta:
        model = Cas
        fields = ['id', 'date', 'categorie', 'lieu', 'description', 'statut']
        read_only_fields = ['id']


class EvolutionMensuelleSerializer(serializers.ModelSerializer):
    """
    Serializer pour l'évolution mensuelle.
    """
    class Meta:
        model = EvolutionMensuelle
        fields = ['id', 'mois', 'total_cas', 'moyenne_cas']
        read_only_fields = ['id']


class EvolutionDetailleeSerializer(serializers.ModelSerializer):
    """
    Serializer pour l'évolution détaillée.
    """
    class Meta:
        model = EvolutionDetaillee
        fields = ['id', 'mois', 'categorie', 'total_cas', 'moyenne_cas']
        read_only_fields = ['id']


class RepartitionGeographiqueSerializer(serializers.ModelSerializer):
    """
    Serializer pour la répartition géographique.
    """
    class Meta:
        model = RepartitionGeographique
        fields = ['id', 'lieu', 'total_cas', 'latitude', 'longitude']
        read_only_fields = ['id']


class ActiviteTempsReelSerializer(serializers.ModelSerializer):
    """
    Serializer pour l'activité en temps réel.
    """
    class Meta:
        model = ActiviteTempsReel
        fields = ['id', 'timestamp', 'categorie', 'lieu', 'valeur', 'anomalie']
        read_only_fields = ['id', 'timestamp']


class MonthlyEvolutionRequestSerializer(serializers.Serializer):
    """
    Serializer pour les requêtes d'évolution mensuelle.
    """
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    category = serializers.CharField(required=False, allow_blank=True)
    forecast_periods = serializers.IntegerField(default=12, min_value=1, max_value=36)


class DetailedAnalysisRequestSerializer(serializers.Serializer):
    """
    Serializer pour les requêtes d'analyse détaillée.
    """
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    categories = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    variables = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )


class GeospatialRequestSerializer(serializers.Serializer):
    """
    Serializer pour les requêtes d'analyse géospatiale.
    """
    date = serializers.DateField()
    regions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    include_heatmap = serializers.BooleanField(default=True)


class RealtimeAnalysisRequestSerializer(serializers.Serializer):
    """
    Serializer pour les requêtes d'analyse temps réel.
    """
    time_window = serializers.IntegerField(default=24, min_value=1, max_value=168)  # heures
    detection_types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    min_severity = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'critical'],
        default='low'
    )


class PhotoSearchRequestSerializer(serializers.Serializer):
    """
    Serializer pour la recherche biométrique (photo ou tapissage).
    """

    MODE_CHOICES = (
        ('search', 'Recherche par photo'),
        ('lineup', 'Tapissage'),
    )

    mode = serializers.ChoiceField(choices=MODE_CHOICES, default='search')
    image = serializers.ImageField(write_only=True)
    threshold = serializers.FloatField(default=0.6, min_value=0.0, max_value=1.0)
    top_k = serializers.IntegerField(default=3, min_value=1, max_value=20, required=False)
    lineup_ids = serializers.ListField(
        child=serializers.UUIDField(format='hex_verbose'),
        required=False,
        allow_empty=False,
    )
    include_embedding = serializers.BooleanField(default=False)

    def validate(self, attrs):
        mode = attrs.get('mode', 'search')
        if mode == 'lineup' and not attrs.get('lineup_ids'):
            raise serializers.ValidationError({
                'lineup_ids': 'La liste des suspects est requise pour le mode tapissage.'
            })
        return attrs

