"""
Modèles Django pour le système de reconnaissance faciale avec ArcFace.
Utilise pgvector pour stocker les embeddings faciaux (vecteurs de 512 dimensions).
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Person(models.Model):
    """
    Modèle Personne - Stocke les informations d'une personne
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom complet")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    
    class Meta:
        db_table = 'face_recognition_person'
        verbose_name = "Personne"
        verbose_name_plural = "Personnes"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def faces_count(self):
        """Retourne le nombre d'embeddings faciaux associés"""
        return self.face_embeddings.count()


class FaceEmbedding(models.Model):
    """
    Modèle Embedding Facial - Stocke les embeddings ArcFace (512 dimensions) avec pgvector
    
    NOTE: Nécessite l'extension pgvector dans PostgreSQL
    Pour l'activer: CREATE EXTENSION IF NOT EXISTS vector;
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name='face_embeddings',
        verbose_name="Personne"
    )
    
    # Note: En attendant pgvector, on stocke en JSONB
    embedding = models.JSONField(
        verbose_name="Embedding facial",
        help_text="Vecteur d'embedding ArcFace (512 dimensions) au format JSON"
    )
    
    image_path = models.CharField(
        max_length=500,
        verbose_name="Chemin de l'image",
        help_text="Chemin vers le fichier image stocké"
    )
    
    confidence_score = models.FloatField(
        default=0.0,
        verbose_name="Score de confiance",
        help_text="Score de confiance de l'extraction (0.0 à 1.0)"
    )
    
    image_width = models.IntegerField(
        blank=True,
        null=True,
        verbose_name="Largeur de l'image"
    )
    
    image_height = models.IntegerField(
        blank=True,
        null=True,
        verbose_name="Hauteur de l'image"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    
    class Meta:
        db_table = 'face_recognition_face_embedding'
        verbose_name = "Embedding facial"
        verbose_name_plural = "Embeddings faciaux"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['person']),
            models.Index(fields=['confidence_score']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"Embedding de {self.person.name} (confiance: {self.confidence_score:.2f})"
    
    def get_embedding_array(self):
        """
        Retourne l'embedding sous forme de numpy array
        """
        import numpy as np
        return np.array(self.embedding)


class FaceRecognitionLog(models.Model):
    """
    Modèle Log de Reconnaissance - Stocke l'historique des reconnaissances faciales
    """
    STATUS_CHOICES = [
        ('recognized', 'Reconnu'),
        ('unknown', 'Inconnu'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    detected_person = models.ForeignKey(
        Person,
        on_delete=models.SET_NULL,
        related_name='recognition_logs',
        null=True,
        blank=True,
        verbose_name="Personne détectée"
    )
    
    embedding_vector = models.JSONField(
        verbose_name="Vecteur d'embedding",
        help_text="Embedding extrait de l'image de reconnaissance"
    )
    
    confidence_score = models.FloatField(
        verbose_name="Score de confiance",
        help_text="Score de confiance de la reconnaissance (0.0 à 1.0)"
    )
    
    image_path = models.CharField(
        max_length=500,
        verbose_name="Chemin de l'image",
        help_text="Chemin vers l'image utilisée pour la reconnaissance"
    )
    
    timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name="Horodatage"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        verbose_name="Statut",
        help_text="Statut de la reconnaissance"
    )
    
    # Informations supplémentaires
    threshold_used = models.FloatField(
        default=0.6,
        verbose_name="Seuil utilisé",
        help_text="Seuil de confiance utilisé pour cette reconnaissance"
    )
    
    processing_time_ms = models.FloatField(
        blank=True,
        null=True,
        verbose_name="Temps de traitement (ms)",
        help_text="Temps de traitement en millisecondes"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name="Créé par"
    )
    
    class Meta:
        db_table = 'face_recognition_log'
        verbose_name = "Log de reconnaissance"
        verbose_name_plural = "Logs de reconnaissance"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['detected_person']),
            models.Index(fields=['status']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['confidence_score']),
        ]
    
    def __str__(self):
        person_name = self.detected_person.name if self.detected_person else "Inconnu"
        return f"Reconnaissance: {person_name} ({self.status}) - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
