"""
Modèles améliorés pour la gestion des enquêtes
Conforme aux spécifications avec UUID, dates d'ouverture/clôture, et pièces d'enquête
"""
import uuid
import hashlib
import os
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

from criminel.models import CriminalFicheCriminelle


def piece_enquete_upload_path(instance, filename):
    """Génère le chemin de stockage pour les pièces d'enquête"""
    if instance.enquete:
        enquete_ref = instance.enquete.numero_enquete or str(instance.enquete.id)
    else:
        enquete_ref = 'sans-enquete'
    
    # Sécuriser le nom du fichier
    ext = os.path.splitext(filename)[1]
    safe_filename = f"{uuid.uuid4()}{ext}"
    
    return f"enquetes/pieces/{enquete_ref}/{safe_filename}"


def validate_file_size(value):
    """Valide la taille du fichier (max 10 MB)"""
    max_size = 10 * 1024 * 1024  # 10 MB
    if value.size > max_size:
        raise ValidationError(
            f'La taille du fichier ({value.size / (1024*1024):.1f} MB) dépasse la limite de 10 MB.'
        )


def validate_file_type(value):
    """Valide le type de fichier - Seulement Word, PDF et photos"""
    ext = os.path.splitext(value.name)[1].lower()
    
    # Extensions autorisées : Photos, Word, PDF uniquement
    allowed_extensions = [
        # Photos
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
        # Word
        '.doc', '.docx',
        # PDF
        '.pdf',
    ]
    
    if ext not in allowed_extensions:
        raise ValidationError(
            f'Format de fichier non autorisé. Formats acceptés : '
            f'Photos (JPG, PNG, GIF, BMP, WEBP), Word (DOC, DOCX), PDF'
        )


class Enquete(models.Model):
    """
    Modèle Enquête amélioré avec UUID et tous les champs requis
    """
    TYPE_ENQUETE_CHOICES = [
        ('penale', 'Pénale'),
        ('criminelle', 'Criminelle'),
        ('terrorisme', 'Terrorisme'),
        ('cybercriminalite', 'Cybercriminalité'),
        ('plainte', 'Plainte'),
        ('denonciation', 'Dénonciation'),
        ('constatation_directe', 'Constatation directe'),
    ]
    
    STATUT_CHOICES = [
        ('ouverte', 'Ouverte'),
        ('en_cours', 'En cours'),
        ('suspendue', 'Suspendue'),
        ('cloturee', 'Clôturée'),
    ]
    
    PRIORITE_CHOICES = [
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('elevee', 'Élevée'),
        ('critique', 'Critique'),
    ]
    
    # Identifiant UUID
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="ID"
    )
    
    # Numéro d'enquête (généré automatiquement)
    numero_enquete = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        verbose_name="Numéro d'enquête",
        help_text="Généré automatiquement"
    )
    
    # Informations de base
    titre = models.CharField(
        max_length=255,
        verbose_name="Titre"
    )
    description = models.TextField(
        verbose_name="Description"
    )
    type_enquete = models.CharField(
        max_length=50,
        choices=TYPE_ENQUETE_CHOICES,
        default='penale',
        verbose_name="Type d'enquête"
    )
    
    # Statut et priorité
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='ouverte',
        verbose_name="Statut"
    )
    niveau_priorite = models.CharField(
        max_length=20,
        choices=PRIORITE_CHOICES,
        default='moyen',
        verbose_name="Niveau de priorité"
    )
    
    # Dates
    date_ouverture = models.DateTimeField(
        default=timezone.now,
        verbose_name="Date d'ouverture"
    )
    date_cloture = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de clôture"
    )
    
    # Lieu
    lieu_faits = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Lieu des faits"
    )
    
    # Responsables
    enqueteur_responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquetes_responsables',
        verbose_name="Enquêteur responsable"
    )
    equipe_enquete = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='enquetes_equipe',
        blank=True,
        verbose_name="Équipe d'enquête"
    )
    
    # Lien avec fiche criminelle (optionnel)
    fiche_criminelle = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquetes_liees',
        verbose_name="Fiche criminelle associée"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )
    is_archived = models.BooleanField(
        default=False,
        verbose_name="Archivée"
    )
    
    class Meta:
        db_table = 'enquete_enquete_enhanced'
        verbose_name = "Enquête"
        verbose_name_plural = "Enquêtes"
        ordering = ['-date_ouverture']
        indexes = [
            models.Index(fields=['numero_enquete']),
            models.Index(fields=['statut', '-date_ouverture']),
            models.Index(fields=['type_enquete', '-date_ouverture']),
            models.Index(fields=['enqueteur_responsable', '-date_ouverture']),
            models.Index(fields=['is_archived']),
        ]
    
    def __str__(self):
        return f"{self.numero_enquete} - {self.titre}"
    
    def save(self, *args, **kwargs):
        """Génère automatiquement le numéro d'enquête si non défini"""
        if not self.numero_enquete:
            self.numero_enquete = self.generate_numero_enquete()
        
        # Si l'enquête est clôturée, définir la date de clôture
        if self.statut == 'cloturee' and not self.date_cloture:
            self.date_cloture = timezone.now()
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_numero_enquete():
        """Génère un numéro d'enquête unique"""
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


class PieceEnquete(models.Model):
    """
    Modèle pour les pièces d'enquête (preuves)
    """
    TYPE_PIECE_CHOICES = [
        ('photo', 'Photo'),
        ('document', 'Document'),
        ('video', 'Vidéo'),
        ('audio', 'Audio'),
        ('autre', 'Autre'),
    ]
    
    # Identifiant UUID
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="ID"
    )
    
    # Lien avec l'enquête
    enquete = models.ForeignKey(
        Enquete,
        on_delete=models.CASCADE,
        related_name='pieces',
        verbose_name="Enquête"
    )
    
    # Type et fichier
    type_piece = models.CharField(
        max_length=20,
        choices=TYPE_PIECE_CHOICES,
        verbose_name="Type de pièce"
    )
    fichier = models.FileField(
        upload_to=piece_enquete_upload_path,
        validators=[validate_file_size, validate_file_type],
        verbose_name="Fichier"
    )
    
    # Description
    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )
    
    # Métadonnées
    date_ajout = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ajout"
    )
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pieces_ajoutees',
        verbose_name="Ajouté par"
    )
    
    # Sécurité et intégrité
    hash_fichier = models.CharField(
        max_length=64,
        blank=True,
        verbose_name="Hash du fichier (SHA-256)",
        help_text="Hash SHA-256 pour vérifier l'intégrité"
    )
    est_confidentiel = models.BooleanField(
        default=False,
        verbose_name="Confidentiel"
    )
    commentaire_interne = models.TextField(
        blank=True,
        verbose_name="Commentaire interne"
    )
    
    class Meta:
        db_table = 'enquete_piece_enquete'
        verbose_name = "Pièce d'enquête"
        verbose_name_plural = "Pièces d'enquête"
        ordering = ['-date_ajout']
        indexes = [
            models.Index(fields=['enquete', '-date_ajout']),
            models.Index(fields=['type_piece']),
            models.Index(fields=['est_confidentiel']),
        ]
    
    def __str__(self):
        return f"{self.get_type_piece_display()} - {self.enquete.numero_enquete}"
    
    def save(self, *args, **kwargs):
        """Calcule le hash du fichier avant sauvegarde"""
        if self.fichier and not self.hash_fichier:
            self.hash_fichier = self.calculate_file_hash()
        super().save(*args, **kwargs)
    
    def calculate_file_hash(self):
        """Calcule le hash SHA-256 du fichier"""
        if not self.fichier:
            return ''
        
        try:
            self.fichier.seek(0)
            hash_obj = hashlib.sha256()
            for chunk in self.fichier.chunks():
                hash_obj.update(chunk)
            self.fichier.seek(0)
            return hash_obj.hexdigest()
        except Exception:
            return ''
    
    def verify_integrity(self):
        """Vérifie l'intégrité du fichier en comparant les hash"""
        if not self.fichier or not self.hash_fichier:
            return False
        
        current_hash = self.calculate_file_hash()
        return current_hash == self.hash_fichier

