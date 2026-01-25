"""
Modèles Django pour le module UPR (Unidentified Person Registry).

Ce module gère les individus non identifiés avec extraction biométrique automatique,
comparaison avec la base criminelle et les autres UPR, et traçabilité complète.
"""

from django.db import models
from django.core.validators import FileExtensionValidator
from django.conf import settings
from django.utils import timezone
import os


def generate_upr_code():
    """
    Génère un code UPR unique sous la forme UPR-0001, UPR-0002, etc.
    Format séquentiel avec padding à 4 chiffres.
    """
    from .models import UnidentifiedPerson
    last_upr = UnidentifiedPerson.objects.order_by('-id').first()
    if last_upr and last_upr.code_upr:
        try:
            last_number = int(last_upr.code_upr.split('-')[1])
            next_number = last_number + 1
        except (ValueError, IndexError):
            next_number = 1
    else:
        next_number = 1
    
    return f"UPR-{str(next_number).zfill(4)}"


def generate_nom_temporaire(code_upr):
    """Génère un nom temporaire basé sur le code UPR."""
    try:
        number = code_upr.split('-')[1]
        return f"Individu Non Identifié #{number}"
    except (IndexError, ValueError):
        return "Individu Non Identifié #0001"


class UnidentifiedPerson(models.Model):
    """
    Modèle pour les personnes non identifiées (UPR).
    
    Chaque UPR contient :
    - Photos (face obligatoire, profils optionnels)
    - Landmarks 106 points extraits automatiquement
    - Embedding ArcFace 512D pour la reconnaissance
    - Informations contextuelles (lieu, date de découverte)
    """
    
    code_upr = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name="Code UPR",
        help_text="Code unique généré automatiquement (ex: UPR-0001)"
    )
    
    nom_temporaire = models.CharField(
        max_length=100,
        verbose_name="Nom temporaire",
        help_text="Nom généré automatiquement (ex: Individu Non Identifié #0001)"
    )
    
    # Photos
    profil_face = models.ImageField(
        upload_to="upr/photos/",
        null=False,
        blank=False,
        verbose_name="Photo de face",
        help_text="Photo obligatoire du visage de face",
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])]
    )
    
    profil_left = models.ImageField(
        upload_to="upr/photos/",
        null=True,
        blank=True,
        verbose_name="Photo profil gauche",
        help_text="Photo de profil gauche (optionnelle)"
    )
    
    profil_right = models.ImageField(
        upload_to="upr/photos/",
        null=True,
        blank=True,
        verbose_name="Photo profil droit",
        help_text="Photo de profil droit (optionnelle)"
    )
    
    # Données biométriques extraites automatiquement
    landmarks_106 = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Landmarks 106 points",
        help_text="Liste des 106 points de repère faciaux [[x, y], ...] extraits par InsightFace"
    )
    
    face_embedding = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Embedding ArcFace 512D",
        help_text="Vecteur d'embedding ArcFace de 512 dimensions (format JSON array de floats)"
    )
    
    face_encoding = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Encoding face_recognition 128D",
        help_text="Vecteur d'encoding face_recognition de 128 dimensions (format JSON array de floats) pour reconnaissance rapide"
    )
    
    empreinte_digitale = models.ImageField(
        upload_to="upr/empreintes/",
        null=True,
        blank=True,
        verbose_name="Empreinte digitale",
        help_text="Empreinte digitale (optionnelle) pour la reconnaissance dactyloscopique",
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])]
    )
    
    # Informations contextuelles
    context_location = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Lieu de découverte",
        help_text="Lieu où l'individu a été découvert ou trouvé"
    )
    
    discovered_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de découverte",
        help_text="Date et heure de découverte de l'individu"
    )
    
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Notes",
        help_text="Observations et informations complémentaires"
    )
    
    # Statut de résolution
    is_resolved = models.BooleanField(
        default=False,
        verbose_name="Résolu",
        help_text="Indique si l'UPR a été résolu (fusionné avec un criminel identifié)"
    )
    
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de résolution",
        help_text="Date à laquelle l'UPR a été résolu"
    )
    
    resolved_to_criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='upr_resolved',
        verbose_name="Résolu vers criminel",
        help_text="Criminel identifié vers lequel cet UPR a été fusionné"
    )
    
    # Métadonnées
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'enregistrement"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Utilisateur créateur
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='upr_created',
        verbose_name="Créé par",
        help_text="Utilisateur ayant créé cet UPR"
    )

    class Meta:
        db_table = 'sgic_unidentifiedperson'
        verbose_name = "Personne Non Identifiée"
        verbose_name_plural = "Personnes Non Identifiées"
        ordering = ['-date_enregistrement']
        indexes = [
            models.Index(fields=['code_upr']),
            models.Index(fields=['-date_enregistrement']),
            models.Index(fields=['is_resolved']),
            models.Index(fields=['created_by', '-date_enregistrement']),
        ]

    def save(self, *args, **kwargs):
        """Génère automatiquement code_upr et nom_temporaire si non définis."""
        if not self.code_upr:
            self.code_upr = generate_upr_code()
        if not self.nom_temporaire:
            self.nom_temporaire = generate_nom_temporaire(self.code_upr)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code_upr} - {self.nom_temporaire}"


class UPRMatchLog(models.Model):
    """
    Log des correspondances entre UPR.
    
    Enregistre toutes les correspondances trouvées entre deux UPR
    lors de la comparaison automatique des embeddings.
    """
    
    upr_source = models.ForeignKey(
        UnidentifiedPerson,
        on_delete=models.CASCADE,
        related_name='matches_upr_source',
        verbose_name="UPR source",
        help_text="UPR pour lequel la correspondance a été trouvée"
    )
    
    upr_target = models.ForeignKey(
        UnidentifiedPerson,
        on_delete=models.CASCADE,
        related_name='matches_upr_target',
        verbose_name="UPR cible",
        help_text="UPR avec lequel la correspondance a été détectée"
    )
    
    distance = models.FloatField(
        verbose_name="Distance L2",
        help_text="Distance L2 entre les embeddings (plus petit = plus similaire)"
    )
    
    match_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de correspondance"
    )
    
    # Seuils de correspondance
    is_strict_match = models.BooleanField(
        default=False,
        verbose_name="Correspondance stricte",
        help_text="True si distance < 0.90 (correspondance très probable)"
    )
    
    is_weak_match = models.BooleanField(
        default=False,
        verbose_name="Correspondance faible",
        help_text="True si distance < 1.20 (correspondance possible)"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sgic_uprmatchlog'
        verbose_name = "Correspondance UPR-UPR"
        verbose_name_plural = "Correspondances UPR-UPR"
        ordering = ['-match_date', 'distance']
        indexes = [
            models.Index(fields=['upr_source', '-match_date']),
            models.Index(fields=['upr_target', '-match_date']),
            models.Index(fields=['distance']),
            models.Index(fields=['is_strict_match']),
        ]
        # Éviter les doublons
        unique_together = [['upr_source', 'upr_target']]

    def __str__(self):
        return f"{self.upr_source.code_upr} ↔ {self.upr_target.code_upr} (distance: {self.distance:.4f})"


class CriminelMatchLog(models.Model):
    """
    Log des correspondances entre UPR et fiches criminelles.
    
    Enregistre toutes les correspondances trouvées entre un UPR
    et une fiche criminelle existante lors de la comparaison automatique.
    """
    
    upr_source = models.ForeignKey(
        UnidentifiedPerson,
        on_delete=models.CASCADE,
        related_name='matches_criminel',
        verbose_name="UPR source",
        help_text="UPR pour lequel la correspondance a été trouvée"
    )
    
    criminel_target = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='matches_upr',
        verbose_name="Criminel cible",
        help_text="Fiche criminelle avec laquelle la correspondance a été détectée"
    )
    
    distance = models.FloatField(
        verbose_name="Distance L2",
        help_text="Distance L2 entre les embeddings (plus petit = plus similaire)"
    )
    
    match_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de correspondance"
    )
    
    # Seuils de correspondance
    is_strict_match = models.BooleanField(
        default=False,
        verbose_name="Correspondance stricte",
        help_text="True si distance < 0.90 (correspondance très probable)"
    )
    
    is_weak_match = models.BooleanField(
        default=False,
        verbose_name="Correspondance faible",
        help_text="True si distance < 1.20 (correspondance possible)"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sgic_criminelmatchlog'
        verbose_name = "Correspondance UPR-Criminel"
        verbose_name_plural = "Correspondances UPR-Criminel"
        ordering = ['-match_date', 'distance']
        indexes = [
            models.Index(fields=['upr_source', '-match_date']),
            models.Index(fields=['criminel_target', '-match_date']),
            models.Index(fields=['distance']),
            models.Index(fields=['is_strict_match']),
        ]
        # Éviter les doublons
        unique_together = [['upr_source', 'criminel_target']]

    def __str__(self):
        return f"{self.upr_source.code_upr} ↔ {self.criminel_target.numero_fiche} (distance: {self.distance:.4f})"


class Camera(models.Model):
    """
    Modèle pour les caméras configurées dans le système multi-caméras.
    
    Enregistre les caméras USB et IP/RTSP utilisées pour la surveillance
    et la détection faciale en temps réel.
    """
    
    CAMERA_TYPE_CHOICES = [
        ('usb', 'USB'),
        ('ip', 'IP/RTSP'),
    ]
    
    camera_id = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="ID Caméra",
        help_text="Identifiant unique de la caméra (ex: usb_0, ip_1)"
    )
    
    name = models.CharField(
        max_length=255,
        verbose_name="Nom",
        help_text="Nom descriptif de la caméra"
    )
    
    source = models.CharField(
        max_length=500,
        verbose_name="Source",
        help_text="Index USB (0, 1, 2...) ou URL IP/RTSP"
    )
    
    camera_type = models.CharField(
        max_length=10,
        choices=CAMERA_TYPE_CHOICES,
        default='usb',
        verbose_name="Type",
        help_text="Type de caméra (USB ou IP/RTSP)"
    )
    
    active = models.BooleanField(
        default=False,
        verbose_name="Active",
        help_text="Indique si la caméra est actuellement active"
    )
    
    last_seen = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Dernière vue",
        help_text="Dernière fois que la caméra a été vue/activée"
    )
    
    frame_count = models.BigIntegerField(
        default=0,
        verbose_name="Nombre de frames",
        help_text="Nombre total de frames traitées"
    )
    
    detection_count = models.BigIntegerField(
        default=0,
        verbose_name="Nombre de détections",
        help_text="Nombre total de détections effectuées"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sgic_camera'
        verbose_name = "Caméra"
        verbose_name_plural = "Caméras"
        ordering = ['camera_id']
        indexes = [
            models.Index(fields=['camera_id']),
            models.Index(fields=['active', '-last_seen']),
            models.Index(fields=['camera_type']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.camera_id})"


class UPRLog(models.Model):
    """
    Log des détections et alertes du système multi-caméras.
    
    Enregistre toutes les détections de visages, correspondances avec UPR/criminels,
    et actions utilisateur (acceptation/rejet de correspondances).
    """
    
    ACTION_CHOICES = [
        ('detection', 'Détection'),
        ('match_certain', 'Correspondance certaine'),
        ('match_probable', 'Correspondance probable'),
        ('accepted', 'Correspondance acceptée'),
        ('rejected', 'Correspondance rejetée'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='upr_logs',
        verbose_name="Utilisateur",
        help_text="Utilisateur ayant effectué l'action (null si auto-détection)"
    )
    
    camera = models.ForeignKey(
        Camera,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs',
        verbose_name="Caméra",
        help_text="Caméra ayant généré la détection"
    )
    
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name="Action",
        help_text="Type d'action enregistrée"
    )
    
    details = models.JSONField(
        default=dict,
        verbose_name="Détails",
        help_text="Détails de la détection (matches, scores, frame info, etc.)"
    )
    
    criminal_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="ID Criminel",
        help_text="ID de la fiche criminelle si correspondance trouvée"
    )
    
    upr_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="ID UPR",
        help_text="ID de l'UPR si correspondance trouvée"
    )
    
    match_score = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Score de correspondance",
        help_text="Score de similarité (0.0-1.0)"
    )
    
    frame_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        verbose_name="URL Frame",
        help_text="URL signée vers l'image de détection (si stockée)"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sgic_uprlog'
        verbose_name = "Log UPR"
        verbose_name_plural = "Logs UPR"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['camera', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['criminal_id']),
            models.Index(fields=['upr_id']),
        ]
    
    def __str__(self):
        camera_name = self.camera.name if self.camera else "N/A"
        return f"{self.action} - {camera_name} - {self.created_at}"


class CameraCapture(models.Model):
    """
    Modèle pour stocker les captures d'images depuis les caméras (intégrée ou USB).
    
    Chaque capture est liée à :
    - L'utilisateur qui a effectué la capture
    - La caméra utilisée (intégrée index 0 ou USB index 1)
    - Optionnellement : une fiche criminelle ou un suspect (UPR)
    - La date, l'heure et les métadonnées de capture
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='camera_captures',
        verbose_name="Utilisateur",
        help_text="Enquêteur ayant effectué la capture"
    )
    
    camera = models.ForeignKey(
        Camera,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='captures',
        verbose_name="Caméra",
        help_text="Caméra utilisée pour la capture (intégrée ou USB)"
    )
    
    camera_index = models.IntegerField(
        verbose_name="Index caméra",
        help_text="Index de la caméra utilisée (0 = intégrée, 1 = USB externe)"
    )
    
    camera_type = models.CharField(
        max_length=20,
        choices=[
            ('integree', 'Caméra intégrée'),
            ('usb', 'Caméra USB externe'),
        ],
        default='integree',
        verbose_name="Type de caméra",
        help_text="Type de caméra utilisée pour la capture"
    )
    
    image = models.ImageField(
        upload_to='camera/captures/',
        null=False,
        blank=False,
        verbose_name="Image capturée",
        help_text="Image capturée depuis la caméra"
    )
    
    # Lien métier vers fiche criminelle ou suspect
    criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='camera_captures',
        verbose_name="Fiche criminelle",
        help_text="Fiche criminelle associée à cette capture (optionnel)"
    )
    
    suspect_upr = models.ForeignKey(
        UnidentifiedPerson,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='camera_captures',
        verbose_name="Suspect UPR",
        help_text="Personne non identifiée (UPR) associée à cette capture (optionnel)"
    )
    
    # Métadonnées de capture
    capture_metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Métadonnées",
        help_text="Métadonnées techniques de la capture (résolution, qualité, etc.)"
    )
    
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Notes",
        help_text="Notes et observations sur la capture"
    )
    
    # Date et heure de capture
    captured_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de capture",
        help_text="Date et heure exacte de la capture"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sgic_camera_capture'
        verbose_name = "Capture caméra"
        verbose_name_plural = "Captures caméra"
        ordering = ['-captured_at']
        indexes = [
            models.Index(fields=['-captured_at']),
            models.Index(fields=['user', '-captured_at']),
            models.Index(fields=['camera', '-captured_at']),
            models.Index(fields=['criminel', '-captured_at']),
            models.Index(fields=['suspect_upr', '-captured_at']),
            models.Index(fields=['camera_index', '-captured_at']),
        ]
    
    def __str__(self):
        user_display = self.user.username if self.user else "Inconnu"
        camera_display = f"{self.get_camera_type_display()}" if self.camera_type else "N/A"
        return f"Capture {camera_display} par {user_display} - {self.captured_at.strftime('%d/%m/%Y %H:%M')}"