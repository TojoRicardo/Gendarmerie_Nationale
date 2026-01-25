"""
Serializers pour le module de versement des dossiers d'enquête
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from criminel.models import CriminalFicheCriminelle
from .models import Enquete, TypeEnquete
from .models_dossier import (
    PersonneEnquete,
    InfractionEnquete,
    PreuveEnquete,
    RapportType,
    RapportEnqueteComplet,
    BiometrieEnquete,
    AuditLogEnquete,
    DecisionCloture,
)

User = get_user_model()


class PersonneEnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les personnes liées à l'enquête"""
    fiche_criminelle_detail = serializers.SerializerMethodField()
    upr_detail = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = PersonneEnquete
        fields = [
            'id', 'enquete', 'fiche_criminelle', 'upr', 'role', 'role_display',
            'nom', 'prenom', 'date_naissance', 'lieu_naissance', 'nationalite',
            'numero_identite', 'adresse', 'telephone', 'email', 'lien_enquete',
            'ajoute_par', 'date_ajout', 'date_modification',
            'fiche_criminelle_detail', 'upr_detail',
        ]
        read_only_fields = ['date_ajout', 'date_modification', 'ajoute_par']

    def get_fiche_criminelle_detail(self, obj):
        if obj.fiche_criminelle:
            return {
                'id': obj.fiche_criminelle.id,
                'numero_fiche': obj.fiche_criminelle.numero_fiche,
                'nom': obj.fiche_criminelle.nom,
                'prenom': obj.fiche_criminelle.prenom,
            }
        return None

    def get_upr_detail(self, obj):
        if obj.upr:
            return {
                'id': obj.upr.id,
                'code_upr': obj.upr.code_upr,
            }
        return None


class InfractionEnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les infractions liées à l'enquête"""
    degre_gravite_display = serializers.CharField(source='get_degre_gravite_display', read_only=True)

    class Meta:
        model = InfractionEnquete
        fields = [
            'id', 'enquete', 'qualification_juridique', 'articles_loi',
            'date_faits', 'lieu_faits', 'description_faits', 'degre_gravite',
            'degre_gravite_display', 'ajoute_par', 'date_ajout', 'date_modification',
        ]
        read_only_fields = ['date_ajout', 'date_modification', 'ajoute_par']


class PreuveEnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les preuves d'enquête"""
    type_preuve_display = serializers.CharField(source='get_type_preuve_display', read_only=True)
    agent_collecteur_detail = serializers.SerializerMethodField()

    class Meta:
        model = PreuveEnquete
        fields = [
            'id', 'enquete', 'numero_scelle', 'type_preuve', 'type_preuve_display',
            'description', 'date_collecte', 'lieu_collecte', 'agent_collecteur',
            'agent_collecteur_detail', 'fichier', 'hash_sha256', 'est_scelle',
            'ajoute_par', 'date_ajout', 'date_modification',
        ]
        read_only_fields = [
            'numero_scelle', 'hash_sha256', 'date_ajout', 'date_modification', 'ajoute_par'
        ]

    def get_agent_collecteur_detail(self, obj):
        if obj.agent_collecteur:
            return {
                'id': obj.agent_collecteur.id,
                'full_name': obj.agent_collecteur.get_full_name() or obj.agent_collecteur.username,
            }
        return None


class RapportTypeSerializer(serializers.ModelSerializer):
    """Serializer pour les types de rapports"""

    class Meta:
        model = RapportType
        fields = ['id', 'code', 'libelle', 'description']


class RapportEnqueteCompletSerializer(serializers.ModelSerializer):
    """Serializer pour les rapports d'enquête"""
    type_rapport_display = serializers.CharField(source='get_type_rapport_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    redacteur_detail = serializers.SerializerMethodField()
    valide_par_detail = serializers.SerializerMethodField()

    class Meta:
        model = RapportEnqueteComplet
        fields = [
            'id', 'enquete', 'type_rapport', 'type_rapport_display', 'type_rapport_detail',
            'titre', 'contenu', 'fichier', 'statut', 'statut_display',
            'redacteur', 'redacteur_detail', 'date_redaction', 'date_modification',
            'valide_par', 'valide_par_detail', 'date_validation',
        ]
        read_only_fields = [
            'date_redaction', 'date_modification', 'date_validation', 'redacteur'
        ]

    def get_redacteur_detail(self, obj):
        if obj.redacteur:
            return {
                'id': obj.redacteur.id,
                'full_name': obj.redacteur.get_full_name() or obj.redacteur.username,
            }
        return None

    def get_valide_par_detail(self, obj):
        if obj.valide_par:
            return {
                'id': obj.valide_par.id,
                'full_name': obj.valide_par.get_full_name() or obj.valide_par.username,
            }
        return None


class BiometrieEnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les données biométriques d'enquête"""
    personne_enquete_detail = serializers.SerializerMethodField()

    class Meta:
        model = BiometrieEnquete
        fields = [
            'id', 'enquete', 'personne_enquete', 'personne_enquete_detail',
            'photo_judiciaire', 'empreintes_digitales', 'resultat_reconnaissance',
            'score_similarite_ia', 'ajoute_par', 'date_ajout', 'date_modification',
        ]
        read_only_fields = ['date_ajout', 'date_modification', 'ajoute_par']

    def get_personne_enquete_detail(self, obj):
        if obj.personne_enquete:
            return {
                'id': obj.personne_enquete.id,
                'nom': obj.personne_enquete.nom or (obj.personne_enquete.fiche_criminelle.nom if obj.personne_enquete.fiche_criminelle else None),
                'prenom': obj.personne_enquete.prenom or (obj.personne_enquete.fiche_criminelle.prenom if obj.personne_enquete.fiche_criminelle else None),
                'role': obj.personne_enquete.role,
            }
        return None


class AuditLogEnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les journaux d'audit"""
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    utilisateur_detail = serializers.SerializerMethodField()

    class Meta:
        model = AuditLogEnquete
        fields = [
            'id', 'enquete', 'action', 'action_display', 'description',
            'utilisateur', 'utilisateur_detail', 'date_action', 'details', 'ip_address',
        ]
        read_only_fields = ['date_action', 'utilisateur']

    def get_utilisateur_detail(self, obj):
        if obj.utilisateur:
            return {
                'id': obj.utilisateur.id,
                'full_name': obj.utilisateur.get_full_name() or obj.utilisateur.username,
            }
        return None


class DecisionClotureSerializer(serializers.ModelSerializer):
    """Serializer pour les décisions de clôture"""
    autorite_validatrice_detail = serializers.SerializerMethodField()

    class Meta:
        model = DecisionCloture
        fields = [
            'id', 'enquete', 'conclusion', 'decision_judiciaire', 'date_cloture',
            'autorite_validatrice', 'autorite_validatrice_detail', 'fichier_decision',
            'cree_par', 'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_cloture', 'date_creation', 'date_modification', 'cree_par']

    def get_autorite_validatrice_detail(self, obj):
        if obj.autorite_validatrice:
            return {
                'id': obj.autorite_validatrice.id,
                'full_name': obj.autorite_validatrice.get_full_name() or obj.autorite_validatrice.username,
            }
        return None


class DossierEnqueteCompletSerializer(serializers.ModelSerializer):
    """
    Serializer complet pour le dossier d'enquête avec toutes les sections
    """
    # Informations générales
    type_enquete_detail = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    priorite_display = serializers.CharField(source='get_priorite_display', read_only=True)
    enqueteur_responsable_detail = serializers.SerializerMethodField()
    enqueteurs_associes_detail = serializers.SerializerMethodField()

    # Sections du dossier
    personnes = PersonneEnqueteSerializer(many=True, read_only=True)
    infractions = InfractionEnqueteSerializer(many=True, read_only=True)
    preuves = PreuveEnqueteSerializer(many=True, read_only=True)
    rapports = RapportEnqueteCompletSerializer(many=True, read_only=True)
    donnees_biometriques = BiometrieEnqueteSerializer(many=True, read_only=True)
    audit_logs = AuditLogEnqueteSerializer(many=True, read_only=True)
    decision_cloture = DecisionClotureSerializer(read_only=True)

    class Meta:
        model = Enquete
        fields = [
            # Informations générales
            'id', 'numero_enquete', 'titre', 'description',
            'type_enquete', 'type_enquete_detail', 'type_enquete_code',
            'date_ouverture', 'date_cloture', 'statut', 'statut_display',
            'niveau_priorite', 'priorite_display', 'lieu',
            'enqueteur_responsable', 'enqueteur_responsable_detail',
            'enqueteurs_associes', 'enqueteurs_associes_detail',
            # Sections du dossier
            'personnes', 'infractions', 'preuves', 'rapports',
            'donnees_biometriques', 'audit_logs', 'decision_cloture',
            # Métadonnées
            'date_enregistrement', 'date_modification',
        ]
        read_only_fields = [
            'numero_enquete', 'date_enregistrement', 'date_modification',
        ]

    def get_type_enquete_detail(self, obj):
        if obj.type_enquete:
            return {
                'id': obj.type_enquete.id,
                'code': obj.type_enquete.code,
                'libelle': obj.type_enquete.libelle,
            }
        return None

    def get_enqueteur_responsable_detail(self, obj):
        if obj.enqueteur_responsable:
            return {
                'id': obj.enqueteur_responsable.id,
                'full_name': obj.enqueteur_responsable.get_full_name() or obj.enqueteur_responsable.username,
            }
        return None

    def get_enqueteurs_associes_detail(self, obj):
        return [
            {
                'id': user.id,
                'full_name': user.get_full_name() or user.username,
            }
            for user in obj.enqueteurs_associes.all()
        ]

