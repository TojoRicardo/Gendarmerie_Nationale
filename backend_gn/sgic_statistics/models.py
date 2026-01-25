from django.db import models
from django.conf import settings


class CriminalCase(models.Model):
    """
    Représente un dossier criminel pour les analyses statistiques.
    """

    STATUS_CHOICES = [
        ('open', 'Ouvert'),
        ('in_progress', 'En cours'),
        ('closed', 'Clôturé'),
    ]

    province = models.CharField(max_length=100)
    date_created = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )

    class Meta:
        db_table = 'criminal_case'
        indexes = [
            models.Index(fields=['province']),
            models.Index(fields=['date_created']),
            models.Index(fields=['status']),
        ]
        ordering = ['-date_created']

    def __str__(self):
        return f"Dossier #{self.pk} - {self.province}"

# Create your models here.
