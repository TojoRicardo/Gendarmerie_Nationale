# pylint: disable=import-error
from rest_framework import serializers
from .models import (
    IAReconnaissanceFaciale, IAAnalyseStatistique, IAMatchBiometrique, 
    IAPrediction, IAPattern, IACorrelation
)
from criminel.serializers import CriminalFicheCriminelleSerializer, CriminalInfractionSerializer
from utilisateur.serializers import UtilisateurReadSerializer


class IAReconnaissanceFacialeSerializer(serializers.ModelSerializer):
    """Serializer pour la reconnaissance faciale IA"""
    criminel_identifie_details = CriminalFicheCriminelleSerializer(
        source='criminel_identifie', read_only=True
    )
    analyse_par_details = UtilisateurReadSerializer(
        source='analyse_par', read_only=True
    )
    
    class Meta:
        model = IAReconnaissanceFaciale
        fields = [
            'id', 'image_analysee', 'criminel_identifie', 'criminel_identifie_details',
            'score_confiance', 'date_analyse', 'analyse_par', 'analyse_par_details', 'statut'
        ]
        read_only_fields = ['date_analyse']


class IAReconnaissanceFacialeCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une analyse de reconnaissance faciale"""
    
    class Meta:
        model = IAReconnaissanceFaciale
        fields = [
            'image_analysee', 'criminel_identifie', 'score_confiance', 
            'analyse_par', 'statut'
        ]


class IAAnalyseStatistiqueSerializer(serializers.ModelSerializer):
    """Serializer pour les analyses statistiques IA"""
    genere_par_details = UtilisateurReadSerializer(
        source='genere_par', read_only=True
    )
    
    class Meta:
        model = IAAnalyseStatistique
        fields = [
            'id', 'titre', 'description', 'date_generation', 
            'donnees_source', 'resultat', 'genere_par', 'genere_par_details'
        ]
        read_only_fields = ['date_generation']


class IAAnalyseStatistiqueCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une analyse statistique"""
    
    class Meta:
        model = IAAnalyseStatistique
        fields = [
            'titre', 'description', 'donnees_source', 
            'resultat', 'genere_par'
        ]


class IAMatchBiometriqueSerializer(serializers.ModelSerializer):
    """Serializer pour les correspondances biométriques IA"""
    criminel_source_details = CriminalFicheCriminelleSerializer(
        source='criminel_source', read_only=True
    )
    criminel_correspondant_details = CriminalFicheCriminelleSerializer(
        source='criminel_correspondant', read_only=True
    )
    valide_par_details = UtilisateurReadSerializer(
        source='valide_par', read_only=True
    )
    
    class Meta:
        model = IAMatchBiometrique
        fields = [
            'id', 'type_match', 'criminel_source', 'criminel_source_details',
            'criminel_correspondant', 'criminel_correspondant_details',
            'pourcentage_similarite', 'date_detection', 'valide_par', 
            'valide_par_details', 'statut_validation'
        ]
        read_only_fields = ['date_detection']


class IAMatchBiometriqueCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une correspondance biométrique"""
    
    class Meta:
        model = IAMatchBiometrique
        fields = [
            'type_match', 'criminel_source', 'criminel_correspondant',
            'pourcentage_similarite', 'valide_par', 'statut_validation'
        ]


class IAPredictionSerializer(serializers.ModelSerializer):
    """Serializer pour les prédictions IA"""
    fiche_criminelle_details = CriminalFicheCriminelleSerializer(
        source='fiche_criminelle', read_only=True
    )
    genere_par_details = UtilisateurReadSerializer(
        source='genere_par', read_only=True
    )
    
    class Meta:
        model = IAPrediction
        fields = [
            'id', 'uuid', 'fiche_criminelle', 'fiche_criminelle_details',
            'type_prediction', 'resultat_prediction', 'score_confiance',
            'date_generation', 'genere_par', 'genere_par_details', 'observations'
        ]
        read_only_fields = ['uuid', 'date_generation']


class IAPredictionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une prédiction IA"""
    
    class Meta:
        model = IAPrediction
        fields = [
            'fiche_criminelle', 'type_prediction', 'resultat_prediction',
            'score_confiance', 'genere_par', 'observations'
        ]


class IAPatternSerializer(serializers.ModelSerializer):
    """Serializer pour les schémas criminels détectés"""
    detecte_par_details = UtilisateurReadSerializer(
        source='detecte_par', read_only=True
    )
    nb_correlations = serializers.SerializerMethodField()
    
    class Meta:
        model = IAPattern
        fields = [
            'id', 'uuid', 'nom_pattern', 'description', 'type_pattern',
            'frequence', 'niveau_risque', 'donnees_sources', 'date_detection',
            'detecte_par', 'detecte_par_details', 'nb_correlations'
        ]
        read_only_fields = ['uuid', 'date_detection']
    
    def get_nb_correlations(self, obj):
        """Retourne le nombre de corrélations associées à ce pattern"""
        return obj.correlations.count()


class IAPatternCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un schéma criminel"""
    
    class Meta:
        model = IAPattern
        fields = [
            'nom_pattern', 'description', 'type_pattern', 'frequence',
            'niveau_risque', 'donnees_sources', 'detecte_par'
        ]


class IACorrelationSerializer(serializers.ModelSerializer):
    """Serializer pour les corrélations IA"""
    criminels_details = CriminalFicheCriminelleSerializer(
        source='criminels', many=True, read_only=True
    )
    infractions_details = CriminalInfractionSerializer(
        source='infractions', many=True, read_only=True
    )
    pattern_associe_details = IAPatternSerializer(
        source='pattern_associe', read_only=True
    )
    analyse_par_details = UtilisateurReadSerializer(
        source='analyse_par', read_only=True
    )
    nb_criminels = serializers.SerializerMethodField()
    nb_infractions = serializers.SerializerMethodField()
    
    class Meta:
        model = IACorrelation
        fields = [
            'id', 'uuid', 'criminels', 'criminels_details', 'nb_criminels',
            'infractions', 'infractions_details', 'nb_infractions',
            'pattern_associe', 'pattern_associe_details', 'type_correlation',
            'degre_correlation', 'resume', 'date_detection', 
            'analyse_par', 'analyse_par_details'
        ]
        read_only_fields = ['uuid', 'date_detection']
    
    def get_nb_criminels(self, obj):
        """Retourne le nombre de criminels dans la corrélation"""
        return obj.criminels.count()
    
    def get_nb_infractions(self, obj):
        """Retourne le nombre d'infractions dans la corrélation"""
        return obj.infractions.count()


class IACorrelationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une corrélation IA"""
    
    class Meta:
        model = IACorrelation
        fields = [
            'criminels', 'infractions', 'pattern_associe', 'type_correlation',
            'degre_correlation', 'resume', 'analyse_par'
        ]
