"""
Signaux Django pour le module de reconnaissance faciale.
"""

from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.core.files.storage import default_storage
from .models import FaceEmbedding


@receiver(pre_delete, sender=FaceEmbedding)
def delete_face_embedding_image(sender, instance, **kwargs):
    """
    Supprime l'image associée lorsqu'un embedding est supprimé.
    """
    if instance.image_path:
        try:
            default_storage.delete(instance.image_path)
        except Exception:
            # Ignorer les erreurs si le fichier n'existe pas
            pass

