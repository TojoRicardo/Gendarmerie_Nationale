import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from criminel.models import CriminalFicheCriminelle
from .validators import validate_preuve_file_size, validate_preuve_file_type


def preuve_upload_path(instance, filename):
    # Si lié à une enquête, utiliser le numéro d'enquête
    if instance.enquete and instance.enquete.numero_enquete:
        ref = instance.enquete.numero_enquete
    elif instance.dossier and instance.dossier.numero_fiche:
        ref = instance.dossier.numero_fiche
    else:
        ref = instance.id or instance.dossier_id if instance.dossier else 'unknown'
    return f"enquetes/preuves/{ref}/{filename}"


class TypeEnquete(models.Model):
    """
    Table de référence pour les types d'enquête
    Exemples: Plainte, Dénonciation, Constatation directe
    """
    code = models.CharField(max_length=50, unique=True, verbose_name="Code")
    libelle = models.CharField(max_length=100, verbose_name="Libellé")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    ordre = models.IntegerField(default=0, verbose_name="Ordre d'affichage")
    couleur = models.CharField(
        max_length=7, 
        default='#6c757d', 
        help_text="Couleur hexadécimale pour l'affichage"
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'enquete_type_enquete'
        verbose_name = "Type d'enquête"
        verbose_name_plural = "Types d'enquête"
        ordering = ['ordre', 'libelle']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['actif']),
        ]
    
    def __str__(self):
        return self.libelle


class Enquete(models.Model):
    """
    Modèle principal pour les enquêtes avec type spécifique
    (Plainte, Dénonciation, Constatation directe)
    """
    TYPE_ENQUETE_CHOICES = [
        ('plainte', 'Plainte'),
        ('denonciation', 'Dénonciation'),
        ('constatation_directe', 'Constatation directe'),
    ]
    
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('suspendue', 'Suspendue'),
        ('cloturee', 'Clôturée'),
        ('classee', 'Classée'),
    ]
    
    PRIORITE_CHOICES = [
        ('faible', 'Faible'),
        ('normale', 'Normale'),
        ('elevee', 'Élevée'),
        ('urgente', 'Urgente'),
    ]
    
    # UUID pour identifiant unique
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="ID unique"
    )
    
    # Informations de base
    numero_enquete = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name="Numéro d'enquête",
        help_text="Numéro unique généré automatiquement"
    )
    
    # Type d'infraction (ajout pour répondre aux besoins)
    type_infraction = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Type d'infraction",
        help_text="Type d'infraction concernée par l'enquête"
    )
    type_enquete = models.ForeignKey(
        TypeEnquete,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquetes',
        verbose_name="Type d'enquête"
    )
    type_enquete_code = models.CharField(
        max_length=50,
        choices=TYPE_ENQUETE_CHOICES,
        verbose_name="Type d'enquête (code)",
        help_text="Type d'enquête: Plainte, Dénonciation ou Constatation directe"
    )
    
    # Lien avec le dossier criminel (peut être null si enquête indépendante)
    dossier = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquetes',
        verbose_name="Dossier criminel associé"
    )
    
    # Informations sur l'enquête
    titre = models.CharField(max_length=255, verbose_name="Titre de l'enquête")
    description = models.TextField(verbose_name="Description détaillée")
    lieu = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        verbose_name="Lieu de l'incident"
    )
    date_incident = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date de l'incident"
    )
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'enregistrement"
    )
    # Dates d'ouverture et de clôture (ajout pour répondre aux besoins)
    date_ouverture = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ouverture",
        help_text="Date d'ouverture de l'enquête"
    )
    date_cloture = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date de clôture",
        help_text="Date de clôture de l'enquête (si clôturée)"
    )
    
    # Statut et priorité
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_cours',
        verbose_name="Statut"
    )
    priorite = models.CharField(
        max_length=20,
        choices=PRIORITE_CHOICES,
        default='normale',
        verbose_name="Priorité"
    )
    
    # Responsables
    enqueteur_responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquetes_responsables',
        verbose_name="Enquêteur responsable",
        help_text="Enquêteur responsable de l'enquête (alias enqueteur_principal)"
    )
    enqueteur_principal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquetes_principales',
        verbose_name="Enquêteur principal",
        help_text="Enquêteur principal (synonyme de enqueteur_responsable)"
    )
    enqueteurs_associes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='enquetes_associees',
        blank=True,
        verbose_name="Enquêteurs associés"
    )
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquetes_creees',
        verbose_name="Créé par"
    )
    
    # Informations spécifiques selon le type
    # Pour Plainte
    plaignant_nom = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Nom du plaignant"
    )
    plaignant_contact = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Contact du plaignant"
    )
    
    # Pour Dénonciation
    denonciateur_nom = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Nom du dénonciateur"
    )
    denonciateur_contact = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Contact du dénonciateur"
    )
    source_denonciation = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Source de la dénonciation"
    )
    
    # Pour Constatation directe
    constatateur_nom = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Nom du constatateur"
    )
    unite_constatation = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Unité de constatation"
    )
    circonstances = models.TextField(
        blank=True,
        null=True,
        verbose_name="Circonstances de la constatation"
    )
    
    # Métadonnées
    date_modification = models.DateTimeField(auto_now=True)
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notes complémentaires"
    )
    
    class Meta:
        db_table = 'enquete_enquete'
        verbose_name = "Enquête"
        verbose_name_plural = "Enquêtes"
        ordering = ['-date_enregistrement']
        indexes = [
            models.Index(fields=['numero_enquete']),
            models.Index(fields=['type_enquete_code', '-date_enregistrement']),
            models.Index(fields=['statut', '-date_enregistrement']),
            models.Index(fields=['enqueteur_principal', '-date_enregistrement']),
        ]
    
    def __str__(self):
        return f"{self.numero_enquete} - {self.get_type_enquete_code_display()}"
    
    def save(self, *args, **kwargs):
        """Génère automatiquement le numéro d'enquête si non défini et synchronise enqueteur_responsable/enqueteur_principal"""
        if not self.numero_enquete:
            self.numero_enquete = self.generer_numero_enquete()
        
        # Synchroniser enqueteur_responsable et enqueteur_principal
        # Si enqueteur_responsable est renseigné mais pas enqueteur_principal, copier
        if self.enqueteur_responsable and not self.enqueteur_principal:
            self.enqueteur_principal = self.enqueteur_responsable
        # Si enqueteur_principal est renseigné mais pas enqueteur_responsable, copier
        elif self.enqueteur_principal and not self.enqueteur_responsable:
            self.enqueteur_responsable = self.enqueteur_principal
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def generer_numero_enquete():
        """Génère un numéro d'enquête unique"""
        from django.db import transaction
        annee = timezone.now().year
        prefixe = f"ENQ-{annee}-"
        
        # Trouver le dernier numéro de l'année
        dernier = Enquete.objects.filter(
            numero_enquete__startswith=prefixe
        ).order_by('-numero_enquete').first()
        
        if dernier:
            try:
                numero_seq = int(dernier.numero_enquete.split('-')[-1]) + 1
            except (ValueError, IndexError):
                numero_seq = 1
        else:
            numero_seq = 1
        
        nouveau_numero = f"{prefixe}{numero_seq:04d}"
        
        # Vérifier l'unicité
        max_tentatives = 100
        tentative = 0
        while Enquete.objects.filter(numero_enquete=nouveau_numero).exists() and tentative < max_tentatives:
            numero_seq += 1
            nouveau_numero = f"{prefixe}{numero_seq:04d}"
            tentative += 1
        
        return nouveau_numero
    
    def clore_enquete(self):
        """Clôture une enquête en mettant à jour la date de clôture"""
        if self.statut != 'cloturee':
            self.statut = 'cloturee'
            self.date_cloture = timezone.now()
            self.save(update_fields=['statut', 'date_cloture', 'date_modification'])


class EnqueteCriminel(models.Model):
    """
    Modèle de relation many-to-many entre Enquête et Criminel (FicheCriminelle)
    Permet de lier plusieurs criminels à une enquête et vice versa
    """
    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='criminels_lies',
        verbose_name="Enquête"
    )
    criminel = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.CASCADE,
        related_name='enquetes_liees',
        verbose_name="Criminel (Fiche criminelle)"
    )
    role = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Rôle",
        help_text="Rôle du criminel dans l'enquête (ex: suspect, témoin, victime)"
    )
    date_ajout = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ajout"
    )
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name="Ajouté par"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notes",
        help_text="Notes complémentaires sur le lien entre l'enquête et le criminel"
    )
    
    class Meta:
        db_table = 'enquete_enquete_criminel'
        verbose_name = "Relation Enquête-Criminel"
        verbose_name_plural = "Relations Enquête-Criminel"
        unique_together = [['enquete', 'criminel']]
        indexes = [
            models.Index(fields=['enquete', 'criminel']),
            models.Index(fields=['-date_ajout']),
        ]
    
    def __str__(self):
        return f"{self.enquete.numero_enquete} - {self.criminel.nom} {self.criminel.prenom or ''}"


class Preuve(models.Model):
    TYPE_PREUVE_CHOICES = [
        ("photo", "Photo"),
        ("document", "Document"),
    ]

    # Lien avec enquête (nouveau champ - optionnel pour compatibilité)
    enquete = models.ForeignKey(
        'Enquete',
        on_delete=models.CASCADE,
        related_name="preuves",
        null=True,
        blank=True,
        verbose_name="Enquête",
        help_text="Enquête associée à cette preuve"
    )
    # Lien avec dossier criminel (conservé pour compatibilité)
    dossier = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.CASCADE,
        related_name="preuves",
        null=True,
        blank=True,
        verbose_name="Dossier criminel",
        help_text="Dossier criminel associé (si pas lié à une enquête)"
    )
    enqueteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    type_preuve = models.CharField(max_length=20, choices=TYPE_PREUVE_CHOICES)
    fichier = models.FileField(
        upload_to=preuve_upload_path,
        validators=[validate_preuve_file_size, validate_preuve_file_type]
    )
    description = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date_ajout",)
        indexes = [
            models.Index(fields=['enquete', '-date_ajout']),
            models.Index(fields=['dossier', '-date_ajout']),
        ]

    def clean(self):
        """Validation: au moins enquete OU dossier doit être renseigné"""
        from django.core.exceptions import ValidationError
        if not self.enquete and not self.dossier:
            raise ValidationError("Une preuve doit être liée à une enquête OU à un dossier criminel.")

    def __str__(self):
        ref = self.enquete.numero_enquete if self.enquete else (self.dossier.numero_fiche if self.dossier else 'N/A')
        return f"Preuve {self.get_type_preuve_display()} - {ref}"


class RapportEnquete(models.Model):
    STATUT_CHOICES = [
        ("brouillon", "Brouillon"),
        ("soumis", "Soumis"),
        ("valide", "Validé"),
    ]

    # Lien avec enquête (nouveau champ - optionnel pour compatibilité)
    enquete = models.ForeignKey(
        'Enquete',
        on_delete=models.CASCADE,
        related_name="rapports_enquete",
        null=True,
        blank=True,
        verbose_name="Enquête",
        help_text="Enquête associée à ce rapport"
    )
    # Lien avec dossier criminel (conservé pour compatibilité)
    dossier = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.CASCADE,
        related_name="rapports_enquete",
        null=True,
        blank=True,
        verbose_name="Dossier criminel",
        help_text="Dossier criminel associé (si pas lié à une enquête)"
    )
    enqueteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    titre = models.CharField(max_length=255)
    contenu = models.TextField()
    date_redaction = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default="brouillon")

    class Meta:
        ordering = ("-date_redaction",)
        indexes = [
            models.Index(fields=['enquete', '-date_redaction']),
            models.Index(fields=['dossier', '-date_redaction']),
        ]

    def clean(self):
        """Validation: au moins enquete OU dossier doit être renseigné"""
        from django.core.exceptions import ValidationError
        if not self.enquete and not self.dossier:
            raise ValidationError("Un rapport doit être lié à une enquête OU à un dossier criminel.")

    def __str__(self):
        ref = self.enquete.numero_enquete if self.enquete else (self.dossier.numero_fiche if self.dossier else 'N/A')
        return f"Rapport {self.titre} - {ref}"


class Observation(models.Model):
    dossier = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.CASCADE,
        related_name="observations_enquete",
    )
    enqueteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    texte = models.TextField()
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date",)

    def __str__(self):
        return f"Observation {self.enqueteur} - {self.dossier}"


class Avancement(models.Model):
    dossier = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.CASCADE,
        related_name="avancement_enquete",
    )
    enqueteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    pourcentage = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    commentaire = models.TextField(blank=True)
    date_mise_a_jour = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date_mise_a_jour",)

    def __str__(self):
        return f"Avancement {self.pourcentage}% - {self.dossier}"

