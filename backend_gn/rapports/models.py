import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

try:
    from django.db.models import JSONField
except ImportError:
    from django.contrib.postgres.fields import JSONField


class Rapport(models.Model):
    
    TYPE_CHOICES = [
        ('statistique', 'Rapport Statistique'),
        ('criminel', 'Rapport Criminel'),
        ('enquete', 'Rapport d\'Enquête'),
        ('audit', 'Rapport d\'Audit'),
    ]
    
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('erreur', 'Erreur'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    titre = models.CharField(max_length=255, verbose_name="Titre du rapport")
    type_rapport = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        verbose_name="Type de rapport",
        db_index=True
    )
    
    parametres = JSONField(
        default=dict,
        blank=True,
        verbose_name="Paramètres"
    )
    
    fichier = models.FileField(
        upload_to='rapports/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Fichier"
    )
    
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_attente',
        verbose_name="Statut",
        db_index=True
    )
    
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rapports_crees',
        verbose_name="Créé par"
    )
    
    date_creation = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création",
        db_index=True
    )
    date_generation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de génération"
    )
    
    taille_fichier = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="Taille (octets)"
    )
    duree_generation = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Durée (secondes)"
    )
    
    message_erreur = models.TextField(
        blank=True,
        verbose_name="Message d'erreur"
    )
    
    note = models.TextField(
        blank=True,
        verbose_name="Note"
    )
    
    class Meta:
        db_table = 'rapport'
        verbose_name = 'Rapport'
        verbose_name_plural = 'Rapports'
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['-date_creation']),
            models.Index(fields=['type_rapport', '-date_creation']),
            models.Index(fields=['statut']),
            models.Index(fields=['cree_par', '-date_creation']),
        ]
    
    def __str__(self):
        return f"{self.titre} - {self.get_type_rapport_display()}"
    
    def clean(self):
        if self.statut == 'termine' and not self.fichier:
            raise ValidationError("Un rapport terminé doit avoir un fichier")
    
    def save(self, *args, **kwargs):
        if self.fichier and self.fichier.size:
            self.taille_fichier = self.fichier.size
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        if self.fichier:
            self.fichier.delete(save=False)
        super().delete(*args, **kwargs)
    
    @property
    def url_fichier(self):
        if self.fichier:
            return self.fichier.url
        return None
    
    @property
    def est_termine(self):
        return self.statut == 'termine' and self.fichier is not None
