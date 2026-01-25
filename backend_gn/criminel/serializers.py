from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    RefStatutFiche,
    RefTypeInfraction,
    RefStatutAffaire,
    CriminalFicheCriminelle,
    CriminalTypeInfraction,
    CriminalInfraction,
    InvestigationAssignment,
    AssignmentStatus,
)

# Import des serializers biométriques
try:
    from biometrie.serializers import (
        BiometriePhotoSerializer,
        BiometrieEmpreinteSerializer,
    )
except ImportError:
    BiometriePhotoSerializer = None
    BiometrieEmpreinteSerializer = None

User = get_user_model()

class RefStatutFicheSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefStatutFiche
        fields = '__all__'


class RefTypeInfractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefTypeInfraction
        fields = '__all__'


class RefStatutAffaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefStatutAffaire
        fields = '__all__'


class CriminalTypeInfractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriminalTypeInfraction
        fields = '__all__'


class CriminalInfractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriminalInfraction
        fields = '__all__'


class CriminalInfractionListSerializer(serializers.ModelSerializer):
    """Serializer léger pour lister les infractions dans une fiche"""
    #  TEST: Utiliser SerializerMethodField pour éviter les erreurs avec relations null
    type_infraction_libelle = serializers.SerializerMethodField(read_only=True)
    statut_affaire_libelle = serializers.SerializerMethodField(read_only=True)
    
    def get_type_infraction_libelle(self, obj):
        """Récupérer le libellé du type d'infraction de manière sécurisée"""
        return obj.type_infraction.libelle if obj.type_infraction else None
    
    def get_statut_affaire_libelle(self, obj):
        """Récupérer le libellé du statut d'affaire de manière sécurisée"""
        return obj.statut_affaire.libelle if obj.statut_affaire else None
    
    class Meta:
        model = CriminalInfraction
        fields = ['id', 'type_infraction', 'type_infraction_libelle', 'date_infraction', 
                  'lieu', 'description', 'statut_affaire', 'statut_affaire_libelle']


class CriminalFicheCriminelleSerializer(serializers.ModelSerializer):
    numero_fiche = serializers.CharField(read_only=True)
    #  TEST: Désactiver temporairement les relations pour debug
    statut_fiche_display = serializers.SerializerMethodField(read_only=True)
    # Redéfinir les champs de date pour permettre les valeurs nulles
    date_naissance = serializers.DateField(required=False, allow_null=True)
    date_arrestation = serializers.DateField(required=False, allow_null=True)
    infractions = CriminalInfractionListSerializer(many=True, read_only=True)
    # Champ temporaire pour créer les infractions
    infractions_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Liste des infractions à créer"
    )
    # Nouveaux champs avec gestion sécurisée
    uuid = serializers.UUIDField(read_only=True, required=False)
    created_by_username = serializers.SerializerMethodField(read_only=True)
    pdf_exported_url = serializers.SerializerMethodField(read_only=True)
    
    def get_statut_fiche_display(self, obj):
        """Récupérer le libellé du statut de manière sécurisée"""
        return obj.statut_fiche.libelle if obj.statut_fiche else None
    
    def get_created_by_username(self, obj):
        """Récupérer le nom d'utilisateur de manière sécurisée"""
        return obj.created_by.username if obj.created_by else None
    
    def get_pdf_exported_url(self, obj):
        """Récupérer l'URL du PDF de manière sécurisée"""
        if obj.pdf_exported:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_exported.url)
            return obj.pdf_exported.url
        return None
    
    class Meta:
        model = CriminalFicheCriminelle
        fields = '__all__'
        read_only_fields = [
            'numero_fiche', 
            'date_creation', 
            'date_modification',
            'uuid',
            'created_by',
            'pdf_exported',
            'pdf_exported_at'
        ]
    
    def validate_nom(self, value):
        """Valider que le nom n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom est obligatoire et ne peut pas être vide")
        return value.strip()
    
    def validate_sexe(self, value):
        """Valider que le sexe est valide"""
        if value not in ['H', 'F']:
            raise serializers.ValidationError("Le sexe doit être 'H' (Homme) ou 'F' (Femme)")
        return value
    
    def validate_cin(self, value):
        """Valider le format du CIN si fourni"""
        if value and value.strip():
            # Enlever les espaces pour la validation
            cin_sans_espace = value.replace(' ', '')
            if not cin_sans_espace.isdigit():
                raise serializers.ValidationError("Le CIN doit contenir uniquement des chiffres")
            if len(cin_sans_espace) != 12:
                raise serializers.ValidationError("Le CIN doit contenir exactement 12 chiffres (format: XXX XXX XXX XXX)")
        return value if value and value.strip() else None
    
    def validate_prenom(self, value):
        """Valider que le prénom n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le prénom est obligatoire et ne peut pas être vide")
        return value.strip()
    
    def validate_date_naissance(self, value):
        """Valider la date de naissance - convertir les chaînes vides en None"""
        if not value or value == '':
            return None
        # Si c'est déjà un objet date, le retourner tel quel
        if hasattr(value, 'year'):
            return value
        return value
    
    def validate_date_arrestation(self, value):
        """Valider la date d'arrestation - convertir les chaînes vides en None"""
        if not value or value == '':
            return None
        # Si c'est déjà un objet date, le retourner tel quel
        if hasattr(value, 'year'):
            return value
        return value
    
    def validate(self, attrs):
        """Validation globale des données"""
        # S'assurer que les champs requis sont présents
        if 'nom' not in attrs or not attrs.get('nom'):
            raise serializers.ValidationError({"nom": "Le nom est obligatoire"})
        if 'prenom' not in attrs or not attrs.get('prenom'):
            raise serializers.ValidationError({"prenom": "Le prénom est obligatoire"})
        if 'sexe' not in attrs or not attrs.get('sexe'):
            raise serializers.ValidationError({"sexe": "Le sexe est obligatoire"})
        
        # Convertir les chaînes vides en None pour les champs optionnels
        champs_optionnels = [
            'surnom', 'date_naissance', 'lieu_naissance', 'nationalite', 'cin',
            'corpulence', 'cheveux', 'visage', 'barbe', 'marques_particulieres',
            'nom_pere', 'nom_mere', 'adresse', 'contact', 'profession', 'service_militaire',
            'motif_arrestation', 'date_arrestation', 'province', 'lieu_arrestation', 'unite_saisie',
            'reference_pv', 'suite_judiciaire', 'peine_encourue', 'antecedent_judiciaire'
        ]
        
        for champ in champs_optionnels:
            if champ in attrs and attrs[champ] == '':
                attrs[champ] = None
        
        return attrs
    
    def create(self, validated_data):
        """Créer la fiche et ses infractions associées"""
        # Extraire les données des infractions
        infractions_data = validated_data.pop('infractions_data', [])
        
        # Créer la fiche criminelle
        fiche = CriminalFicheCriminelle.objects.create(**validated_data)  # type: ignore
        
        # Créer les infractions associées
        if infractions_data:
            for infraction_data in infractions_data:
                # Récupérer ou créer le type d'infraction
                type_libelle = infraction_data.get('type', '').strip()
                if type_libelle:
                    # Chercher un type d'infraction existant
                    type_infraction, created = RefTypeInfraction.objects.get_or_create(  # type: ignore
                        libelle=type_libelle,
                        defaults={
                            'code': type_libelle.upper().replace(' ', '_')[:20],
                            'actif': True
                        }
                    )
                    
                    # Chercher ou créer le type détaillé
                    type_detail, created = CriminalTypeInfraction.objects.get_or_create(  # type: ignore
                        libelle=type_libelle,
                        defaults={
                            'code': type_libelle.upper().replace(' ', '_')[:20],
                            'type_infraction': type_infraction,
                            'gravite': 5,
                            'actif': True
                        }
                    )
                    
                    # Créer l'infraction
                    CriminalInfraction.objects.create(  # type: ignore
                        fiche=fiche,
                        type_infraction=type_detail,
                        date_infraction=infraction_data.get('date') or fiche.date_arrestation or fiche.date_creation.date(),
                        lieu=infraction_data.get('lieu', '') or fiche.lieu_arrestation or '',
                        description=infraction_data.get('description', '') or ''
                    )
        
        return fiche
    
    def update(self, instance, validated_data):
        """Mettre à jour la fiche et ses infractions associées"""
        # Extraire les données des infractions
        infractions_data = validated_data.pop('infractions_data', None)
        
        # Mettre à jour tous les champs de la fiche
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Gérer les infractions si fournies
        if infractions_data is not None:
            # Supprimer les anciennes infractions
            instance.infractions.all().delete()
            
            # Créer les nouvelles infractions
            for infraction_data in infractions_data:
                type_libelle = infraction_data.get('type', '').strip()
                if type_libelle:
                    # Récupérer ou créer le type d'infraction
                    type_infraction, created = RefTypeInfraction.objects.get_or_create(  # type: ignore
                        libelle=type_libelle,
                        defaults={
                            'code': type_libelle.upper().replace(' ', '_')[:20],
                            'actif': True
                        }
                    )
                    
                    # Chercher ou créer le type détaillé
                    type_detail, created = CriminalTypeInfraction.objects.get_or_create(  # type: ignore
                        libelle=type_libelle,
                        defaults={
                            'code': type_libelle.upper().replace(' ', '_')[:20],
                            'type_infraction': type_infraction,
                            'gravite': 5,
                            'actif': True
                        }
                    )
                    
                    # Créer l'infraction
                    CriminalInfraction.objects.create(  # type: ignore
                        fiche=instance,
                        type_infraction=type_detail,
                        date_infraction=infraction_data.get('date') or instance.date_arrestation or instance.date_creation.date(),
                        lieu=infraction_data.get('lieu', '') or instance.lieu_arrestation or '',
                        description=infraction_data.get('description', '') or ''
                    )
        
        return instance
    
    def to_representation(self, instance):
        """Personnaliser la représentation des données"""
        representation = super().to_representation(instance)
        
        # Ajouter les choix pour les champs avec choices
        representation['sexe_display'] = instance.get_sexe_display() if instance.sexe else None
        representation['corpulence_display'] = instance.get_corpulence_display() if instance.corpulence else None
        representation['cheveux_display'] = instance.get_cheveux_display() if instance.cheveux else None
        representation['visage_display'] = instance.get_visage_display() if instance.visage else None
        representation['barbe_display'] = instance.get_barbe_display() if instance.barbe else None
        representation['niveau_danger_display'] = instance.get_niveau_danger_display() if instance.niveau_danger else None
        
        return representation


class SimpleUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "full_name", "role")

    def get_full_name(self, obj):
        full_name_callable = getattr(obj, "get_full_name", None)
        if callable(full_name_callable):
            full_name = full_name_callable()
            if full_name:
                return full_name
        parts = [obj.first_name or "", obj.last_name or ""]
        combined = " ".join(part for part in parts if part).strip()
        if combined:
            return combined
        return obj.username or ''


class InvestigationAssignmentSerializer(serializers.ModelSerializer):
    INVESTIGATOR_ROLES = ("Enquêteur", "Enquêteur Junior", "Enquêteur Principal")

    dossier_id = serializers.PrimaryKeyRelatedField(
        source="fiche",
        queryset=CriminalFicheCriminelle.objects.all(),  # type: ignore
        write_only=True,
    )
    dossier = serializers.SerializerMethodField(read_only=True)
    assigned_investigator_id = serializers.PrimaryKeyRelatedField(
        source="assigned_investigator",
        queryset=User.objects.filter(role__in=INVESTIGATOR_ROLES),
        write_only=True,
    )
    assigned_investigator = SimpleUserSerializer(read_only=True)
    assigned_by = SimpleUserSerializer(read_only=True)
    status_display = serializers.SerializerMethodField(read_only=True)
    status = serializers.ChoiceField(
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.EN_ATTENTE,
        required=False,
    )

    class Meta:
        model = InvestigationAssignment
        fields = (
            "id",
            "dossier_id",
            "dossier",
            "assigned_investigator_id",
            "assigned_investigator",
            "assigned_by",
            "instructions",
            "status",
            "status_display",
            "priority",
            "assignment_date",
            "due_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "assignment_date",
            "created_at",
            "updated_at",
            "assigned_by",
        )

    def get_dossier(self, obj):
        fiche = obj.fiche
        return {
            "id": fiche.id,
            "numero_fiche": fiche.numero_fiche,
            "nom": fiche.nom,
            "prenom": fiche.prenom,
            "statut": getattr(fiche.statut_fiche, "libelle", None),
            "progression": getattr(fiche, "progression", 0),
        }

    def get_status_display(self, obj):
        return obj.get_status_display()

    def validate(self, attrs):
        fiche = attrs.get("fiche")
        if fiche and getattr(fiche, "is_archived", False):
            raise serializers.ValidationError(
                {"dossier_id": "Impossible d'assigner un dossier archivé."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        assigned_by = getattr(request, "user", None)
        return InvestigationAssignment.objects.create(  # type: ignore
            assigned_by=assigned_by, **validated_data
        )

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance

