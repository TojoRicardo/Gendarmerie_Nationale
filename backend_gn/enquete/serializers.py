from django.utils import timezone
from rest_framework import serializers

from criminel.models import (
    AssignmentStatus,
    CriminalFicheCriminelle,
    InvestigationAssignment,
)

from .models import Avancement, Enquete, EnqueteCriminel, Observation, Preuve, RapportEnquete, TypeEnquete

SUPERVISOR_ROLES = {"Administrateur Système", "Enquêteur Principal"}


def _user_can_supervise(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return getattr(user, "role", None) in SUPERVISOR_ROLES


def _validate_assignment(dossier, user):
    if not user or not user.is_authenticated:
        raise serializers.ValidationError("Authentification requise.")

    if user.is_superuser or _user_can_supervise(user):
        return None

    assignment = (
        InvestigationAssignment.objects.filter(
            fiche=dossier,
            assigned_investigator=user,
        )
        .order_by("-assignment_date")
        .first()
    )

    if not assignment or assignment.status != AssignmentStatus.EN_COURS:
        raise serializers.ValidationError(
            "Aucune assignation confirmée n'est active pour ce dossier."
        )

    if assignment.due_date and assignment.due_date < timezone.now().date():
        assignment.check_and_update_status()
        raise serializers.ValidationError(
            "La date limite de l'assignation est dépassée. Action impossible."
        )

    return assignment


class BaseEnqueteSerializer(serializers.ModelSerializer):
    dossier = serializers.PrimaryKeyRelatedField(
        queryset=CriminalFicheCriminelle.objects.all()
    )
    enqueteur = serializers.SerializerMethodField()

    def get_enqueteur(self, obj):
        if not obj.enqueteur:
            return None
        return {
            "id": obj.enqueteur_id,
            "full_name": obj.enqueteur.get_full_name()
            or obj.enqueteur.username,
        }

    def validate(self, attrs):
        request = self.context.get("request")
        dossier = attrs.get("dossier")
        if request and dossier:
            _validate_assignment(dossier, request.user)
        return attrs

    def assign_enqueteur(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["enqueteur"] = request.user
        return validated_data


class PreuveSerializer(BaseEnqueteSerializer):
    # Adapter pour supporter enquete ET dossier
    dossier = serializers.PrimaryKeyRelatedField(
        queryset=CriminalFicheCriminelle.objects.all(),
        required=False,
        allow_null=True
    )
    enquete = serializers.PrimaryKeyRelatedField(
        queryset=Enquete.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Preuve
        fields = [
            "id",
            "enquete",
            "dossier",
            "enqueteur",
            "type_preuve",
            "fichier",
            "description",
            "date_ajout",
        ]
        read_only_fields = ["enqueteur", "date_ajout"]

    def validate(self, attrs):
        """Vérifier qu'au moins enquete OU dossier est renseigné"""
        enquete = attrs.get('enquete')
        dossier = attrs.get('dossier')
        
        if not enquete and not dossier:
            raise serializers.ValidationError(
                "Une preuve doit être liée à une enquête OU à un dossier criminel."
            )
        
        # Appeler la validation de base pour l'assignation si dossier
        if dossier:
            request = self.context.get("request")
            if request and dossier:
                _validate_assignment(dossier, request.user)
        
        return attrs

    def create(self, validated_data):
        self.assign_enqueteur(validated_data)
        return super().create(validated_data)


class RapportEnqueteSerializer(BaseEnqueteSerializer):
    # Adapter pour supporter enquete ET dossier
    dossier = serializers.PrimaryKeyRelatedField(
        queryset=CriminalFicheCriminelle.objects.all(),
        required=False,
        allow_null=True
    )
    enquete = serializers.PrimaryKeyRelatedField(
        queryset=Enquete.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = RapportEnquete
        fields = [
            "id",
            "enquete",
            "dossier",
            "enqueteur",
            "titre",
            "contenu",
            "date_redaction",
            "statut",
        ]
        read_only_fields = ["enqueteur", "date_redaction"]

    def validate(self, attrs):
        """Vérifier qu'au moins enquete OU dossier est renseigné"""
        enquete = attrs.get('enquete')
        dossier = attrs.get('dossier')
        
        if not enquete and not dossier:
            raise serializers.ValidationError(
                "Un rapport doit être lié à une enquête OU à un dossier criminel."
            )
        
        # Appeler la validation de base pour l'assignation si dossier
        if dossier:
            request = self.context.get("request")
            if request and dossier:
                _validate_assignment(dossier, request.user)
        
        return attrs

    def create(self, validated_data):
        self.assign_enqueteur(validated_data)
        return super().create(validated_data)


class ObservationSerializer(BaseEnqueteSerializer):
    class Meta:
        model = Observation
        fields = ["id", "dossier", "enqueteur", "texte", "date"]
        read_only_fields = ["enqueteur", "date"]

    def create(self, validated_data):
        self.assign_enqueteur(validated_data)
        return super().create(validated_data)


class AvancementSerializer(BaseEnqueteSerializer):
    progression_auto = serializers.SerializerMethodField()

    class Meta:
        model = Avancement
        fields = [
            "id",
            "dossier",
            "enqueteur",
            "pourcentage",
            "commentaire",
            "date_mise_a_jour",
            "progression_auto",
        ]
        read_only_fields = ["enqueteur", "date_mise_a_jour"]

    def create(self, validated_data):
        self.assign_enqueteur(validated_data)
        return super().create(validated_data)

    def get_progression_auto(self, obj):
        dossier = getattr(obj, "dossier", None)
        return getattr(dossier, "progression", 0) if dossier else 0


class TypeEnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les types d'enquête"""
    class Meta:
        model = TypeEnquete
        fields = [
            'id',
            'code',
            'libelle',
            'description',
            'actif',
            'ordre',
            'couleur',
            'date_creation',
            'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']


class EnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les enquêtes avec types spécifiques"""
    type_enquete_detail = TypeEnqueteSerializer(
        source='type_enquete',
        read_only=True
    )
    enqueteur_principal_detail = serializers.SerializerMethodField()
    enqueteur_responsable_detail = serializers.SerializerMethodField()
    dossier_detail = serializers.SerializerMethodField()
    criminels_lies = serializers.SerializerMethodField()
    type_enquete_code_display = serializers.CharField(
        source='get_type_enquete_code_display',
        read_only=True
    )
    statut_display = serializers.CharField(
        source='get_statut_display',
        read_only=True
    )
    priorite_display = serializers.CharField(
        source='get_priorite_display',
        read_only=True
    )
    
    class Meta:
        model = Enquete
        fields = [
            'id',
            'numero_enquete',
            'type_enquete',
            'type_enquete_detail',
            'type_enquete_code',
            'type_enquete_code_display',
            'dossier',
            'dossier_detail',
            'titre',
            'description',
            'type_infraction',
            'lieu',
            'date_incident',
            'date_enregistrement',
            'date_ouverture',
            'date_cloture',
            'statut',
            'statut_display',
            'priorite',
            'priorite_display',
            'enqueteur_principal',
            'enqueteur_principal_detail',
            'enqueteur_responsable',
            'enqueteur_responsable_detail',
            'enqueteurs_associes',
            'cree_par',
            'criminels_lies',
            # Champs spécifiques Plainte
            'plaignant_nom',
            'plaignant_contact',
            # Champs spécifiques Dénonciation
            'denonciateur_nom',
            'denonciateur_contact',
            'source_denonciation',
            # Champs spécifiques Constatation directe
            'constatateur_nom',
            'unite_constatation',
            'circonstances',
            # Métadonnées
            'date_modification',
            'notes',
        ]
        read_only_fields = [
            'numero_enquete',
            'date_enregistrement',
            'date_modification',
            'cree_par',
        ]
    
    def get_enqueteur_principal_detail(self, obj):
        if not obj.enqueteur_principal:
            return None
        return {
            'id': obj.enqueteur_principal.id,
            'full_name': obj.enqueteur_principal.get_full_name() or obj.enqueteur_principal.username,
        }
    
    def get_enqueteur_responsable_detail(self, obj):
        # Si enqueteur_responsable n'est pas défini, utiliser enqueteur_principal
        responsable = obj.enqueteur_responsable or obj.enqueteur_principal
        if not responsable:
            return None
        return {
            'id': responsable.id,
            'full_name': responsable.get_full_name() or responsable.username,
        }
    
    def get_dossier_detail(self, obj):
        if not obj.dossier:
            return None
        return {
            'id': obj.dossier.id,
            'numero_fiche': obj.dossier.numero_fiche,
            'nom': obj.dossier.nom,
            'prenom': obj.dossier.prenom,
        }
    
    def get_criminels_lies(self, obj):
        """Retourne la liste des criminels liés à l'enquête"""
        criminels_lies = obj.criminels_lies.select_related('criminel', 'ajoute_par').all()
        return [
            {
                'id': ec.id,
                'criminel_id': ec.criminel.id,
                'numero_fiche': ec.criminel.numero_fiche,
                'nom': ec.criminel.nom,
                'prenom': ec.criminel.prenom,
                'role': ec.role,
                'date_ajout': ec.date_ajout,
            }
            for ec in criminels_lies
        ]
    
    def validate(self, attrs):
        """Validation selon le type d'enquête"""
        type_code = attrs.get('type_enquete_code')
        type_enquete_fk = attrs.get('type_enquete')
        
        # Si on utilise le nouveau système avec TypeEnquete (ForeignKey),
        # on ne force pas les validations strictes pour les champs spécifiques
        # Ces champs peuvent être remplis plus tard ou sont optionnels
        if type_enquete_fk:
            # Utilisation du nouveau système avec TypeEnquete
            # Les champs spécifiques (plaignant_nom, etc.) sont optionnels
            return attrs
        
        # Si on utilise l'ancien système avec type_enquete_code uniquement,
        # on applique les validations strictes
        if type_code == 'plainte':
            if not attrs.get('plaignant_nom'):
                raise serializers.ValidationError({
                    'plaignant_nom': 'Le nom du plaignant est requis pour une plainte.'
                })
        
        # Validation pour Dénonciation
        elif type_code == 'denonciation':
            if not attrs.get('denonciateur_nom'):
                raise serializers.ValidationError({
                    'denonciateur_nom': 'Le nom du dénonciateur est requis pour une dénonciation.'
                })
        
        # Validation pour Constatation directe
        elif type_code == 'constatation_directe':
            if not attrs.get('constatateur_nom'):
                raise serializers.ValidationError({
                    'constatateur_nom': 'Le nom du constatateur est requis pour une constatation directe.'
                })
            if not attrs.get('unite_constatation'):
                raise serializers.ValidationError({
                    'unite_constatation': "L'unité de constatation est requise pour une constatation directe."
                })
        
        return attrs
    
    def create(self, validated_data):
        """Création avec assignation automatique du créateur"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['cree_par'] = request.user
            # Si enqueteur_responsable n'est pas renseigné, utiliser le créateur
            if not validated_data.get('enqueteur_responsable'):
                validated_data['enqueteur_responsable'] = request.user
            if not validated_data.get('enqueteur_principal'):
                validated_data['enqueteur_principal'] = request.user
        return super().create(validated_data)


class EnqueteCriminelSerializer(serializers.ModelSerializer):
    """Serializer pour la relation Enquête-Criminel"""
    enquete_detail = serializers.SerializerMethodField()
    criminel_detail = serializers.SerializerMethodField()
    ajoute_par_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = EnqueteCriminel
        fields = [
            'id',
            'enquete',
            'enquete_detail',
            'criminel',
            'criminel_detail',
            'role',
            'date_ajout',
            'ajoute_par',
            'ajoute_par_detail',
            'notes',
        ]
        read_only_fields = ['date_ajout', 'ajoute_par']
    
    def get_enquete_detail(self, obj):
        if not obj.enquete:
            return None
        return {
            'id': str(obj.enquete.id),
            'numero_enquete': obj.enquete.numero_enquete,
            'titre': obj.enquete.titre,
        }
    
    def get_criminel_detail(self, obj):
        if not obj.criminel:
            return None
        return {
            'id': obj.criminel.id,
            'numero_fiche': obj.criminel.numero_fiche,
            'nom': obj.criminel.nom,
            'prenom': obj.criminel.prenom,
        }
    
    def get_ajoute_par_detail(self, obj):
        if not obj.ajoute_par:
            return None
        return {
            'id': obj.ajoute_par.id,
            'full_name': obj.ajoute_par.get_full_name() or obj.ajoute_par.username,
        }
    
    def create(self, validated_data):
        """Assignation automatique de l'utilisateur qui ajoute"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['ajoute_par'] = request.user
        return super().create(validated_data)

