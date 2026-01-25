"""
Modèles complets pour le module de versement des dossiers d'enquête
Conforme aux pratiques judiciaires
"""
import uuid
import hashlib
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from django.conf import settings
from criminel.models import CriminalFicheCriminelle
from .models import Enquete


class PersonneEnquete(models.Model):
    """
    Personnes concernées par l'enquête (Suspect, Victime, Témoin, UPR)
    """
    ROLE_CHOICES = [
        ('suspect', 'Suspect'),
        ('victime', 'Victime'),
        ('temoin', 'Témoin'),
        ('plaignant', 'Plaignant'),
        ('autre', 'Autre'),
    ]

    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='personnes',
        verbose_name="Enquête"
    )

    # Lien avec fiche criminelle (si personne identifiée)
    fiche_criminelle = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='personnes_enquetes',
        verbose_name="Fiche criminelle"
    )

    # Lien avec UPR (si personne non identifiée) - Optionnel
    upr = models.ForeignKey(
        'upr.UnidentifiedPerson',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='personnes_enquetes',
        verbose_name="Personne non identifiée (UPR)"
    )

    role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        verbose_name="Rôle dans l'enquête"
    )

    # Informations si personne non liée à une fiche
    nom = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Nom"
    )
    prenom = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Prénom"
    )
    date_naissance = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de naissance"
    )
    lieu_naissance = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Lieu de naissance"
    )
    nationalite = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Nationalité"
    )
    numero_identite = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Numéro d'identité"
    )

    # Coordonnées
    adresse = models.TextField(
        blank=True,
        null=True,
        verbose_name="Adresse"
    )
    telephone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Téléphone"
    )
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="Email"
    )

    # Lien avec l'enquête
    lien_enquete = models.TextField(
        blank=True,
        null=True,
        verbose_name="Lien avec l'enquête",
        help_text="Décrire le lien de cette personne avec l'enquête"
    )

    # Métadonnées
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='personnes_enquetes_ajoutees',
        verbose_name="Ajouté par"
    )
    date_ajout = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ajout"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )

    class Meta:
        db_table = 'enquete_personne_enquete'
        verbose_name = "Personne liée à l'enquête"
        verbose_name_plural = "Personnes liées aux enquêtes"
        ordering = ['-date_ajout']
        indexes = [
            models.Index(fields=['enquete', 'role']),
            models.Index(fields=['fiche_criminelle']),
            models.Index(fields=['upr']),
        ]

    def clean(self):
        """Validation: au moins fiche_criminelle OU (nom/prenom) OU upr doit être renseigné"""
        if not self.fiche_criminelle and not self.upr:
            if not (self.nom or self.prenom):
                raise ValidationError(
                    "Une personne doit être liée à une fiche criminelle, un UPR, ou avoir au moins un nom ou prénom."
                )

    def __str__(self):
        if self.fiche_criminelle:
            return f"{self.fiche_criminelle.nom} {self.fiche_criminelle.prenom or ''} - {self.get_role_display()}"
        elif self.upr:
            return f"{self.upr.code_upr if hasattr(self.upr, 'code_upr') else str(self.upr)} - {self.get_role_display()}"
        else:
            nom_complet = f"{self.nom or ''} {self.prenom or ''}".strip() or "Personne inconnue"
            return f"{nom_complet} - {self.get_role_display()}"


class InfractionEnquete(models.Model):
    """
    Infractions liées à l'enquête
    """
    GRAVITE_CHOICES = [
        ('contravention', 'Contravention'),
        ('delit', 'Délit'),
        ('crime', 'Crime'),
    ]

    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='infractions',
        verbose_name="Enquête"
    )

    qualification_juridique = models.CharField(
        max_length=500,
        verbose_name="Qualification juridique",
        help_text="Ex: Vol aggravé, Homicide volontaire, etc."
    )

    articles_loi = models.TextField(
        verbose_name="Articles de loi",
        help_text="Articles de loi applicables (Code pénal, Code de procédure pénale, etc.)"
    )

    date_faits = models.DateTimeField(
        verbose_name="Date des faits"
    )

    lieu_faits = models.CharField(
        max_length=500,
        verbose_name="Lieu des faits",
        help_text="Lieu précis où les faits se sont déroulés"
    )

    description_faits = models.TextField(
        verbose_name="Description des faits",
        help_text="Description détaillée des faits"
    )

    degre_gravite = models.CharField(
        max_length=50,
        choices=GRAVITE_CHOICES,
        default='delit',
        verbose_name="Degré de gravité"
    )

    # Métadonnées
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='infractions_enquetes_ajoutees',
        verbose_name="Ajouté par"
    )
    date_ajout = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ajout"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )

    class Meta:
        db_table = 'enquete_infraction_enquete'
        verbose_name = "Infraction liée à l'enquête"
        verbose_name_plural = "Infractions liées aux enquêtes"
        ordering = ['-date_faits']
        indexes = [
            models.Index(fields=['enquete', '-date_faits']),
            models.Index(fields=['degre_gravite']),
        ]

    def __str__(self):
        return f"{self.qualification_juridique} - {self.enquete.numero_enquete}"


class PreuveEnquete(models.Model):
    """
    Preuves de l'enquête avec chaîne de conservation
    """
    TYPE_PREUVE_CHOICES = [
        ('photo', 'Photo'),
        ('video', 'Vidéo'),
        ('audio', 'Audio'),
        ('document', 'Document'),
        ('objet', 'Objet'),
        ('autre', 'Autre'),
    ]

    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='preuves_enquete',
        verbose_name="Enquête"
    )

    numero_scelle = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Numéro de scellé",
        help_text="Numéro unique de scellé généré automatiquement"
    )

    type_preuve = models.CharField(
        max_length=50,
        choices=TYPE_PREUVE_CHOICES,
        verbose_name="Type de preuve"
    )

    description = models.TextField(
        verbose_name="Description"
    )

    date_collecte = models.DateTimeField(
        verbose_name="Date et heure de collecte"
    )

    lieu_collecte = models.CharField(
        max_length=500,
        verbose_name="Lieu de collecte"
    )

    agent_collecteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preuves_collectees',
        verbose_name="Agent collecteur"
    )

    # Fichier (pour preuves numériques)
    fichier = models.FileField(
        upload_to='enquetes/preuves/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Fichier"
    )

    # Chaîne de conservation
    hash_sha256 = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        verbose_name="Hash SHA256",
        help_text="Hash du fichier pour vérification d'intégrité"
    )

    est_scelle = models.BooleanField(
        default=False,
        verbose_name="Scellé",
        help_text="Indique si la preuve est scellée"
    )

    # Métadonnées
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preuves_enquetes_ajoutees',
        verbose_name="Ajouté par"
    )
    date_ajout = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ajout"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )

    class Meta:
        db_table = 'enquete_preuve_enquete'
        verbose_name = "Preuve d'enquête"
        verbose_name_plural = "Preuves d'enquête"
        ordering = ['-date_collecte']
        indexes = [
            models.Index(fields=['enquete', '-date_collecte']),
            models.Index(fields=['numero_scelle']),
            models.Index(fields=['type_preuve']),
            models.Index(fields=['hash_sha256']),
        ]

    def save(self, *args, **kwargs):
        """Génère automatiquement le numéro de scellé et calcule le hash si fichier"""
        if not self.numero_scelle:
            self.numero_scelle = self.generer_numero_scelle()

        # Calculer le hash si fichier présent
        if self.fichier and not self.hash_sha256:
            self.hash_sha256 = self.calculer_hash()

        super().save(*args, **kwargs)

    @staticmethod
    def generer_numero_scelle():
        """Génère un numéro de scellé unique"""
        from django.db import transaction
        annee = timezone.now().year
        prefixe = f"SC-{annee}-"

        dernier = PreuveEnquete.objects.filter(
            numero_scelle__startswith=prefixe
        ).order_by('-numero_scelle').first()

        if dernier:
            try:
                numero_seq = int(dernier.numero_scelle.split('-')[-1]) + 1
            except (ValueError, IndexError):
                numero_seq = 1
        else:
            numero_seq = 1

        nouveau_numero = f"{prefixe}{numero_seq:06d}"

        max_tentatives = 100
        tentative = 0
        while PreuveEnquete.objects.filter(numero_scelle=nouveau_numero).exists() and tentative < max_tentatives:
            numero_seq += 1
            nouveau_numero = f"{prefixe}{numero_seq:06d}"
            tentative += 1

        return nouveau_numero

    def calculer_hash(self):
        """Calcule le hash SHA256 du fichier"""
        if not self.fichier:
            return None

        sha256_hash = hashlib.sha256()
        self.fichier.seek(0)
        for chunk in self.fichier.chunks():
            sha256_hash.update(chunk)
        self.fichier.seek(0)

        return sha256_hash.hexdigest()

    def __str__(self):
        return f"{self.numero_scelle} - {self.get_type_preuve_display()}"


class RapportType(models.Model):
    """
    Types de rapports (PV d'audition, Rapport d'intervention, etc.)
    """
    code = models.CharField(max_length=50, unique=True, verbose_name="Code")
    libelle = models.CharField(max_length=200, verbose_name="Libellé")
    description = models.TextField(blank=True, null=True, verbose_name="Description")

    class Meta:
        db_table = 'enquete_rapport_type'
        verbose_name = "Type de rapport"
        verbose_name_plural = "Types de rapport"

    def __str__(self):
        return self.libelle


class RapportEnqueteComplet(models.Model):
    """
    Rapports et procès-verbaux de l'enquête
    """
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('soumis', 'Soumis'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    ]

    TYPE_RAPPORT_CHOICES = [
        ('pv_audition', 'PV d\'audition'),
        ('rapport_intervention', 'Rapport d\'intervention'),
        ('rapport_technique', 'Rapport technique'),
        ('rapport_analyse_ia', 'Rapport d\'analyse IA'),
        ('autre', 'Autre'),
    ]

    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='rapports_complets',
        verbose_name="Enquête"
    )

    type_rapport = models.CharField(
        max_length=50,
        choices=TYPE_RAPPORT_CHOICES,
        verbose_name="Type de rapport"
    )

    type_rapport_detail = models.ForeignKey(
        RapportType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rapports',
        verbose_name="Type de rapport (détaillé)"
    )

    titre = models.CharField(
        max_length=500,
        verbose_name="Titre"
    )

    contenu = models.TextField(
        verbose_name="Contenu",
        help_text="Contenu du rapport ou PV"
    )

    # Fichier associé (optionnel)
    fichier = models.FileField(
        upload_to='enquetes/rapports/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Fichier"
    )

    statut = models.CharField(
        max_length=50,
        choices=STATUT_CHOICES,
        default='brouillon',
        verbose_name="Statut"
    )

    # Métadonnées
    redacteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rapports_enquetes_rediges',
        verbose_name="Rédacteur"
    )
    date_redaction = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de rédaction"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rapports_enquetes_valides',
        verbose_name="Validé par"
    )
    date_validation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de validation"
    )

    class Meta:
        db_table = 'enquete_rapport_enquete_complet'
        verbose_name = "Rapport d'enquête"
        verbose_name_plural = "Rapports d'enquête"
        ordering = ['-date_redaction']
        indexes = [
            models.Index(fields=['enquete', '-date_redaction']),
            models.Index(fields=['type_rapport']),
            models.Index(fields=['statut']),
        ]

    def __str__(self):
        return f"{self.get_type_rapport_display()} - {self.titre}"


class BiometrieEnquete(models.Model):
    """
    Données biométriques liées à l'enquête
    """
    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='donnees_biometriques',
        verbose_name="Enquête"
    )

    # Lien avec personne
    personne_enquete = models.ForeignKey(
        PersonneEnquete,
        on_delete=models.CASCADE,
        related_name='donnees_biometriques',
        verbose_name="Personne"
    )

    # Photo judiciaire
    photo_judiciaire = models.ImageField(
        upload_to='enquetes/biometrie/photos/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Photo judiciaire"
    )

    # Empreintes digitales
    empreintes_digitales = models.FileField(
        upload_to='enquetes/biometrie/empreintes/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Empreintes digitales"
    )

    # Résultat reconnaissance faciale
    resultat_reconnaissance = models.JSONField(
        blank=True,
        null=True,
        verbose_name="Résultat reconnaissance faciale",
        help_text="Résultats de la reconnaissance faciale (matches, scores, etc.)"
    )

    score_similarite_ia = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="Score de similarité IA (%)"
    )

    # Métadonnées
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='biometrie_enquetes_ajoutee',
        verbose_name="Ajouté par"
    )
    date_ajout = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ajout"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )

    class Meta:
        db_table = 'enquete_biometrie_enquete'
        verbose_name = "Données biométriques d'enquête"
        verbose_name_plural = "Données biométriques d'enquête"
        ordering = ['-date_ajout']
        indexes = [
            models.Index(fields=['enquete', '-date_ajout']),
            models.Index(fields=['personne_enquete']),
        ]

    def __str__(self):
        return f"Biométrie - {self.personne_enquete} - {self.enquete.numero_enquete}"


class AuditLogEnquete(models.Model):
    """
    Journal d'audit pour traçabilité complète des actions sur l'enquête
    """
    ACTION_CHOICES = [
        ('creation', 'Création'),
        ('modification', 'Modification'),
        ('suppression', 'Suppression'),
        ('consultation', 'Consultation'),
        ('cloture', 'Clôture'),
        ('reouverture', 'Réouverture'),
        ('ajout_preuve', 'Ajout de preuve'),
        ('suppression_preuve', 'Suppression de preuve'),
        ('ajout_rapport', 'Ajout de rapport'),
        ('validation_rapport', 'Validation de rapport'),
        ('ajout_personne', 'Ajout de personne'),
        ('ajout_infraction', 'Ajout d\'infraction'),
        ('modification_statut', 'Modification de statut'),
        ('export', 'Export'),
        ('impression', 'Impression'),
        ('autre', 'Autre'),
    ]

    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        verbose_name="Enquête"
    )

    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        verbose_name="Action"
    )

    description = models.TextField(
        verbose_name="Description",
        help_text="Description détaillée de l'action"
    )

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs_enquetes',
        verbose_name="Utilisateur"
    )

    date_action = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de l'action"
    )

    # Détails supplémentaires (JSON)
    details = models.JSONField(
        blank=True,
        null=True,
        verbose_name="Détails supplémentaires",
        help_text="Détails supplémentaires de l'action au format JSON"
    )

    # Adresse IP
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Adresse IP"
    )

    class Meta:
        db_table = 'enquete_audit_log_enquete'
        verbose_name = "Journal d'audit d'enquête"
        verbose_name_plural = "Journaux d'audit d'enquête"
        ordering = ['-date_action']
        indexes = [
            models.Index(fields=['enquete', '-date_action']),
            models.Index(fields=['utilisateur', '-date_action']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.enquete.numero_enquete} - {self.get_action_display()} - {self.date_action}"


class DecisionCloture(models.Model):
    """
    Décision et clôture de l'enquête
    """
    enquete = models.OneToOneField(
        Enquete,
        on_delete=models.CASCADE,
        related_name='decision_cloture',
        verbose_name="Enquête"
    )

    conclusion = models.TextField(
        verbose_name="Conclusion de l'enquête",
        help_text="Conclusion et résumé de l'enquête"
    )

    decision_judiciaire = models.TextField(
        blank=True,
        null=True,
        verbose_name="Décision judiciaire",
        help_text="Décision prise par l'autorité judiciaire"
    )

    date_cloture = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de clôture"
    )

    autorite_validatrice = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decisions_cloture_validees',
        verbose_name="Autorité validatrice"
    )

    # Fichier de décision (optionnel)
    fichier_decision = models.FileField(
        upload_to='enquetes/decisions/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Fichier de décision"
    )

    # Métadonnées
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decisions_cloture_creees',
        verbose_name="Créé par"
    )
    date_creation = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )

    class Meta:
        db_table = 'enquete_decision_cloture'
        verbose_name = "Décision de clôture"
        verbose_name_plural = "Décisions de clôture"

    def __str__(self):
        return f"Décision - {self.enquete.numero_enquete}"

