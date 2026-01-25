"""
Configuration de l'application face_recognition.
"""

from django.apps import AppConfig


class FaceRecognitionConfig(AppConfig):
    """Configuration pour l'application face_recognition"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'face_recognition'
    verbose_name = "Reconnaissance Faciale ArcFace"
