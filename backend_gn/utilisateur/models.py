from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from datetime import timedelta
import os


ADMIN_ROLE_CODES = {'ADMIN', 'ADMINISTRATEUR', 'ADMINISTRATEUR SYSTÈME'}


def normalize_role_value(value):
    return (value or '').strip().upper()


class UtilisateurModel(AbstractUser):
    """
    Modèle Utilisateur personnalisé pour le système SGIC
    """
    
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('enqueteur', 'Enquêteur'),
        ('analyste', 'Analyste'),
        ('operateur', 'Opérateur'),
        ('observateur', 'Observateur'),

        ('Administrateur Système', 'Administrateur Système'),
        ('Enquêteur Principal', 'Enquêteur Principal'),
        ('Enquêteur', 'Enquêteur'),
        ('Enquêteur Junior', 'Enquêteur Junior'),
        ('Analyste', 'Analyste'),
        ('Observateur', 'Observateur'),
    ]
    
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('inactif', 'Inactif'),
        ('suspendu', 'Suspendu'),
    ]
    
    email = models.EmailField(blank=True, null=True, unique=True)
    grade = models.CharField(max_length=100, blank=True, null=True)
    matricule = models.CharField(max_length=50, unique=True, null=True, blank=True)
    
    # Informations personnelles
    nom = models.CharField(max_length=100, blank=True, null=True)
    prenom = models.CharField(max_length=100, blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    dateNaissance = models.DateField(blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    photo_profil = models.ImageField(
        upload_to='photos_profil/',
        blank=True,
        null=True,
        verbose_name='Photo de profil',
        help_text='Photo de profil de l\'utilisateur'
    )
    
    # Rôle avec contraintes
    role = models.CharField(
        max_length=100, 
        choices=ROLE_CHOICES,
        blank=True, 
        null=True,
        help_text="Rôle de l'utilisateur dans le système"
    )
    
    # Statut avec contraintes
    statut = models.CharField(
        max_length=20, 
        choices=STATUT_CHOICES,
        default='actif',
        blank=True, 
        null=True
    )

    dateCreation = models.DateField(blank=True, null=True)
    derniereConnexion = models.DateTimeField(blank=True, null=True)
    suspension_date = models.DateTimeField(blank=True, null=True)
    is_archived = models.BooleanField(default=False, verbose_name='Archivé')  # type: ignore
    archived_date = models.DateTimeField(blank=True, null=True, verbose_name='Date d\'archivage')

    class Meta:  # type: ignore
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-dateCreation']

    def __str__(self) -> str:
        if self.role:
            return f"{self.email or ''} ({self.role})"
        return str(self.email or '')
    
    def get_full_name(self) -> str:
        """Retourne le nom complet de l'utilisateur"""
        if self.nom and self.prenom:
            return f"{self.prenom} {self.nom}"
        return str(self.username or self.email or '')

    @property
    def has_admin_role(self):
        """
        Indique si le rôle applicatif correspond à un rôle administrateur.
        Normalise la casse pour couvrir les variantes (ADMIN, Administrateur, etc.).
        """
        role_match = normalize_role_value(getattr(self, 'role', None)) in ADMIN_ROLE_CODES
        role_code_match = normalize_role_value(getattr(self, 'role_code', None)) in ADMIN_ROLE_CODES
        return role_match or role_code_match

    def is_application_admin(self):
        """
        Détermine si l'utilisateur doit être considéré comme administrateur applicatif.
        Combine les flags Django natifs et les rôles applicatifs.
        """
        if self.is_superuser or self.is_staff:
            return True
        return self.has_admin_role


class UserProfile(models.Model):
    """
    Profil utilisateur avec gestion du PIN à 6 chiffres
    """
    user = models.OneToOneField(
        UtilisateurModel,
        on_delete=models.CASCADE,
        related_name='userprofile',
        verbose_name='Utilisateur'
    )
    pin_hash = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        verbose_name='Hash du PIN',
        help_text='PIN haché avec Django password hasher'
    )
    pin_attempts = models.IntegerField(
        default=0,  # type: ignore
        verbose_name='Tentatives PIN échouées',
        help_text='Nombre de tentatives PIN échouées consécutives'
    )
    pin_blocked_until = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Blocage PIN jusqu\'à',
        help_text='Date/heure jusqu\'à laquelle le PIN est bloqué après trop d\'échecs'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Date de mise à jour'
    )

    class Meta:
        verbose_name = 'Profil Utilisateur'
        verbose_name_plural = 'Profils Utilisateurs'

    def __str__(self) -> str:
        username = getattr(self.user, 'username', 'Unknown')
        return f"Profil de {username}"

    def is_pin_blocked(self):
        """Vérifie si le PIN est actuellement bloqué"""
        if not self.pin_blocked_until:
            return False
        return timezone.now() < self.pin_blocked_until

    def get_block_remaining_time(self):
        """Retourne le temps restant avant déblocage en minutes"""
        if not self.is_pin_blocked():
            return 0
        remaining = self.pin_blocked_until - timezone.now()  # type: ignore
        return int(remaining.total_seconds() / 60)


class PinAuditLog(models.Model):
    """
    Journal d'audit pour les tentatives de PIN
    """
    user = models.ForeignKey(
        UtilisateurModel,
        on_delete=models.CASCADE,
        related_name='pin_audit_logs',
        verbose_name='Utilisateur'
    )
    success = models.BooleanField(
        verbose_name='Succès',
        help_text='True si la tentative de PIN a réussi'
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date/heure'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Adresse IP',
        help_text='Adresse IP de la tentative de connexion'
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent',
        help_text='User Agent du navigateur'
    )

    class Meta:
        verbose_name = 'Log Audit PIN'
        verbose_name_plural = 'Logs Audit PIN'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
        ]

    def __str__(self) -> str:
        status = "✓" if self.success else "✗"
        username = getattr(self.user, 'username', 'Unknown')
        timestamp_str = self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else 'N/A'  # type: ignore
        return f"{status} {username} - {timestamp_str}"


class PermissionSGIC(models.Model):
    """
    Modèle pour les permissions du système SGIC
    """
    CATEGORY_CHOICES = [
        ('Fiches', 'Fiches'),
        ('Utilisateurs', 'Utilisateurs'),
        ('Rôles', 'Rôles'),
        ('Biométrie', 'Biométrie'),
        ('IA', 'Intelligence Artificielle'),
        ('Rapports', 'Rapports'),
        ('Audit', 'Audit'),
    ]
    
    code = models.CharField(
        max_length=150,
        unique=True,
        verbose_name='Code de permission',
        help_text='Code unique de la permission (ex: fiches.consulter)'
    )
    label = models.CharField(
        max_length=200,
        verbose_name='Libellé',
        help_text='Libellé descriptif de la permission'
    )
    category = models.CharField(
        max_length=100,
        choices=CATEGORY_CHOICES,
        verbose_name='Catégorie',
        help_text='Catégorie de la permission'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Date de mise à jour'
    )
    
    class Meta:
        verbose_name = 'Permission SGIC'
        verbose_name_plural = 'Permissions SGIC'
        ordering = ['category', 'code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.label}"


class Role(models.Model):
    """
    Modèle pour les rôles du système SGIC
    """
    name = models.CharField(
        max_length=150,
        unique=True,
        verbose_name='Nom du rôle',
        help_text='Nom unique du rôle'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Description',
        help_text='Description détaillée du rôle'
    )
    permissions = models.ManyToManyField(
        PermissionSGIC,
        related_name='roles',
        verbose_name='Permissions',
        help_text='Permissions associées à ce rôle'
    )
    is_active = models.BooleanField(
        default=True,  # type: ignore
        verbose_name='Actif',
        help_text='Indique si le rôle est actif'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Date de mise à jour'
    )
    
    class Meta:
        verbose_name = 'Rôle'
        verbose_name_plural = 'Rôles'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self) -> str:
        return str(self.name)
    
    def get_permissions_list(self):
        """Retourne la liste des codes de permissions"""
        return list(self.permissions.values_list('code', flat=True))  # type: ignore
    
    def has_permission(self, permission_code):
        """Vérifie si le rôle a une permission spécifique"""
        return self.permissions.filter(code=permission_code).exists()  # type: ignore

