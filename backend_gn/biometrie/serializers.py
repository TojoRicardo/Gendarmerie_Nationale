from rest_framework import serializers
from .models import Biometrie, BiometriePhoto, BiometrieEmpreinte, BiometrieScanResultat, BiometrieHistorique


class BiometriePhotoSerializer(serializers.ModelSerializer):
    capture_par_nom = serializers.SerializerMethodField()
    criminel_nom = serializers.CharField(source='criminel.nom', read_only=True)
    criminel_prenom = serializers.CharField(source='criminel.prenom', read_only=True)
    criminel_numero_fiche = serializers.CharField(source='criminel.numero_fiche', read_only=True)
    file_extension = serializers.SerializerMethodField()
    taille_fichier_kb = serializers.SerializerMethodField()
    
    class Meta:
        model = BiometriePhoto
        fields = [
            'id', 
            'criminel', 
            'criminel_nom',
            'criminel_prenom',
            'criminel_numero_fiche',
            'image',
            'type_photo',
            'qualite',
            'encodage_facial',
            'taille_fichier',
            'taille_fichier_kb',
            'file_extension',
            'notes',
            'date_capture',
            'capture_par',
            'capture_par_nom',
            'est_principale',
            'est_active'
        ]
        read_only_fields = ['date_capture', 'taille_fichier']
    
    def get_capture_par_nom(self, obj):
        if obj.capture_par:
            return f"{obj.capture_par.nom} {obj.capture_par.prenom}" if hasattr(obj.capture_par, 'nom') else obj.capture_par.username
        return None
    
    def get_file_extension(self, obj):
        return obj.get_file_extension()
    
    def get_taille_fichier_kb(self, obj):
        if obj.taille_fichier:
            return round(obj.taille_fichier / 1024, 2)
        return None


class BiometrieEmpreinteSerializer(serializers.ModelSerializer):
    enregistre_par_nom = serializers.SerializerMethodField()
    criminel_nom = serializers.CharField(source='criminel.nom', read_only=True)
    criminel_prenom = serializers.CharField(source='criminel.prenom', read_only=True)
    criminel_numero_fiche = serializers.CharField(source='criminel.numero_fiche', read_only=True)
    main = serializers.SerializerMethodField()
    taille_fichier_kb = serializers.SerializerMethodField()
    
    class Meta:
        model = BiometrieEmpreinte
        fields = [
            'id',
            'criminel',
            'criminel_nom',
            'criminel_prenom',
            'criminel_numero_fiche',
            'image',
            'doigt',
            'main',
            'type_empreinte',
            'qualite',
            'minuties',
            'nombre_minuties',
            'encodage_empreinte',
            'taille_fichier',
            'taille_fichier_kb',
            'notes',
            'date_enregistrement',
            'enregistre_par',
            'enregistre_par_nom',
            'est_active'
        ]
        read_only_fields = ['date_enregistrement', 'taille_fichier']
    
    def get_enregistre_par_nom(self, obj):
        if obj.enregistre_par:
            return f"{obj.enregistre_par.nom} {obj.enregistre_par.prenom}" if hasattr(obj.enregistre_par, 'nom') else obj.enregistre_par.username
        return None
    
    def get_main(self, obj):
        return obj.get_main()
    
    def get_taille_fichier_kb(self, obj):
        if obj.taille_fichier:
            return round(obj.taille_fichier / 1024, 2)
        return None


class BiometriePhotoCreateSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la création de photos biométriques"""
    class Meta:
        model = BiometriePhoto
        fields = [
            'criminel',
            'type_photo',
            'image',
            'qualite',
            'notes',
            'est_principale',
            'est_active'
        ]


class BiometrieEmpreinteCreateSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la création d'empreintes digitales"""
    class Meta:
        model = BiometrieEmpreinte
        fields = [
            'criminel',
            'doigt',
            'image',
            'type_empreinte',
            'qualite',
            'notes',
            'est_active'
        ]


class BiometrieScanResultatSerializer(serializers.ModelSerializer):
    """Serializer pour les résultats de scan biométrique"""
    execute_par_nom = serializers.SerializerMethodField()
    criminel_correspondant_nom = serializers.CharField(
        source='criminel_correspondant.nom', 
        read_only=True
    )
    criminel_correspondant_prenom = serializers.CharField(
        source='criminel_correspondant.prenom', 
        read_only=True
    )
    criminel_correspondant_numero_fiche = serializers.CharField(
        source='criminel_correspondant.numero_fiche', 
        read_only=True
    )
    est_valide = serializers.SerializerMethodField()
    score_pourcentage = serializers.SerializerMethodField()
    moyenne_par_comparaison = serializers.SerializerMethodField()
    
    class Meta:
        model = BiometrieScanResultat
        fields = [
            'id',
            'type_scan',
            'image_source',
            'criminel_correspondant',
            'criminel_correspondant_nom',
            'criminel_correspondant_prenom',
            'criminel_correspondant_numero_fiche',
            'score_correspondance',
            'score_pourcentage',
            'seuil_confiance',
            'est_valide',
            'resultats_json',
            'nombre_comparaisons',
            'temps_execution',
            'moyenne_par_comparaison',
            'statut',
            'date_scan',
            'execute_par',
            'execute_par_nom',
            'notes'
        ]
        read_only_fields = ['date_scan']
    
    def get_execute_par_nom(self, obj):
        if obj.execute_par:
            return f"{obj.execute_par.nom} {obj.execute_par.prenom}" if hasattr(obj.execute_par, 'nom') else obj.execute_par.username
        return None
    
    def get_est_valide(self, obj):
        return obj.est_correspondance_valide()
    
    def get_score_pourcentage(self, obj):
        return round(obj.score_correspondance * 100, 2)
    
    def get_moyenne_par_comparaison(self, obj):
        if obj.nombre_comparaisons > 0:
            return round(obj.temps_execution / obj.nombre_comparaisons, 4)
        return 0


class BiometrieScanResultatCreateSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la création de résultats de scan"""
    class Meta:
        model = BiometrieScanResultat
        fields = [
            'type_scan',
            'image_source',
            'criminel_correspondant',
            'score_correspondance',
            'seuil_confiance',
            'resultats_json',
            'nombre_comparaisons',
            'temps_execution',
            'statut',
            'notes'
        ]


class BiometrieStatistiquesSerializer(serializers.Serializer):
    """Serializer pour les statistiques biométriques"""
    total_photos = serializers.IntegerField()
    total_empreintes = serializers.IntegerField()
    total_scans = serializers.IntegerField()
    scans_reussis = serializers.IntegerField()
    scans_echoues = serializers.IntegerField()
    taux_reussite = serializers.FloatField()
    temps_moyen_scan = serializers.FloatField()


class BiometrieHistoriqueSerializer(serializers.ModelSerializer):
    """Serializer pour l'historique biométrique"""
    effectue_par_nom = serializers.SerializerMethodField()
    criminel_nom = serializers.CharField(source='criminel.nom', read_only=True)
    criminel_prenom = serializers.CharField(source='criminel.prenom', read_only=True)
    criminel_numero_fiche = serializers.CharField(source='criminel.numero_fiche', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    type_objet_display = serializers.CharField(source='get_type_objet_display', read_only=True)
    
    class Meta:
        model = BiometrieHistorique
        fields = [
            'id',
            'type_objet',
            'type_objet_display',
            'objet_id',
            'criminel',
            'criminel_nom',
            'criminel_prenom',
            'criminel_numero_fiche',
            'action',
            'action_display',
            'description',
            'donnees_avant',
            'donnees_apres',
            'date_action',
            'effectue_par',
            'effectue_par_nom',
            'adresse_ip',
            'user_agent'
        ]
        read_only_fields = ['date_action']
    
    def get_effectue_par_nom(self, obj):
        if obj.effectue_par:
            return f"{obj.effectue_par.nom} {obj.effectue_par.prenom}" if hasattr(obj.effectue_par, 'nom') else obj.effectue_par.username
        return 'Système'


class ReconnaissanceFacialeUploadSerializer(serializers.Serializer):
    """Serializer pour l'upload d'une photo pour reconnaissance faciale"""
    image = serializers.ImageField(required=True, help_text='Image contenant un visage à rechercher')
    seuil_confiance = serializers.FloatField(
        required=False, 
        default=0.6, 
        min_value=0.0, 
        max_value=1.0,
        help_text='Seuil minimal pour considérer une correspondance valide (0.0 à 1.0)'
    )
    limite_resultats = serializers.IntegerField(
        required=False, 
        default=10, 
        min_value=1, 
        max_value=100,
        help_text='Nombre maximum de résultats à retourner'
    )
    sauvegarder_resultat = serializers.BooleanField(
        required=False,
        default=True,
        help_text='Sauvegarder le résultat de la recherche dans la BD'
    )


class ReconnaissanceFacialeResultatSerializer(serializers.Serializer):
    """Serializer pour les résultats de reconnaissance faciale"""
    succes = serializers.BooleanField()
    erreur = serializers.CharField(required=False, allow_null=True)
    nombre_comparaisons = serializers.IntegerField(required=False)
    temps_execution = serializers.FloatField()
    seuil_confiance = serializers.FloatField(required=False)
    meilleure_correspondance = serializers.DictField(required=False, allow_null=True)
    correspondances_valides = serializers.ListField(required=False)
    tous_resultats = serializers.ListField(required=False)


class ComparaisonCriminelSerializer(serializers.Serializer):
    """Serializer pour comparer une image avec un criminel spécifique"""
    image = serializers.ImageField(required=True, help_text='Image à comparer')
    criminel_id = serializers.IntegerField(required=True, help_text='ID du criminel')
    seuil_confiance = serializers.FloatField(
        required=False, 
        default=0.6, 
        min_value=0.0, 
        max_value=1.0
    )


class MiseAJourEncodagesSerializer(serializers.Serializer):
    """Serializer pour la mise à jour des encodages"""
    criminel_id = serializers.IntegerField(
        required=False, 
        allow_null=True,
        help_text='ID du criminel (si None, recalcule tous les encodages)'
    )


class SuppressionSecuriseSerializer(serializers.Serializer):
    """Serializer pour la suppression sécurisée avec confirmation"""
    confirmation = serializers.CharField(
        required=True,
        help_text='Tapez "CONFIRMER" pour valider la suppression'
    )
    raison = serializers.CharField(
        required=True,
        help_text='Raison de la suppression (obligatoire pour l\'audit)'
    )
    
    def validate_confirmation(self, value):
        if value != "CONFIRMER":
            raise serializers.ValidationError(
                'Vous devez taper "CONFIRMER" pour valider la suppression'
            )
        return value
    
    def validate_raison(self, value):
        if len(value) < 10:
            raise serializers.ValidationError(
                'La raison doit contenir au moins 10 caractères'
            )
        return value


class BiometrieSerializer(serializers.ModelSerializer):
    criminel_numero_fiche = serializers.CharField(source='criminel.numero_fiche', read_only=True)
    criminel_nom = serializers.CharField(source='criminel.nom', read_only=True)
    criminel_prenom = serializers.CharField(source='criminel.prenom', read_only=True)

    class Meta:
        model = Biometrie
        fields = ['id', 'criminel', 'criminel_numero_fiche', 'criminel_nom', 'criminel_prenom', 'photo', 'encodage_facial', 'date_enregistrement']
        read_only_fields = ['encodage_facial', 'date_enregistrement']


class BiometrieEnregistrementSerializer(serializers.Serializer):
    criminel_id = serializers.IntegerField()
    photo = serializers.ImageField()


class BiometrieReconnaissanceSerializer(serializers.Serializer):
    photo = serializers.ImageField()
    seuil = serializers.FloatField(required=False, default=0.6, min_value=0.0, max_value=1.0)

