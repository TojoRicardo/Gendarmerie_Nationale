from django.db import models
from utilisateur.models import UtilisateurModel

class Notification(models.Model):
    """Modèle pour les notifications système"""
    
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Succès'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
    ]
    
    utilisateur = models.ForeignKey(
        UtilisateurModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Utilisateur'
    )
    
    titre = models.CharField(
        max_length=200,
        verbose_name='Titre'
    )
    
    message = models.TextField(
        verbose_name='Message'
    )
    
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='info',
        verbose_name='Type'
    )
    
    lue = models.BooleanField(
        default=False,
        verbose_name='Lue'
    )
    
    lien = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Lien vers la ressource'
    )
    
    date_creation = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    date_lecture = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de lecture'
    )
    
    class Meta:
        ordering = ['-date_creation']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['utilisateur', '-date_creation']),
            models.Index(fields=['utilisateur', 'lue']),
        ]
    
    def __str__(self):
        return f"{self.titre} - {self.utilisateur.username}"
    
    def marquer_comme_lue(self):
        """Marque la notification comme lue"""
        if not self.lue:
            self.lue = True
            from django.utils import timezone
            self.date_lecture = timezone.now()
            self.save()
