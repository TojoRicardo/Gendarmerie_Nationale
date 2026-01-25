# backend_gn/utilisateur/signals.py
# Signaux pour l'application utilisateur

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.utils import ProgrammingError, OperationalError
from .models import UserProfile
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Créer automatiquement un profil utilisateur pour chaque nouvel utilisateur"""
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(pre_delete, sender=User)
def handle_user_deletion_with_missing_tables(sender, instance, **kwargs):
    """
    Gère la suppression d'un utilisateur en vérifiant si les tables référencées existent.
    Si la table biometrie_scan_resultat n'existe pas, on met à jour manuellement
    les références dans les autres tables avant la suppression.
    """
    try:
        # Vérifier si la table biometrie_scan_resultat existe
        table_exists = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'biometrie_scan_resultat'
                    );
                """)
                table_exists = cursor.fetchone()[0]
        except (ProgrammingError, OperationalError) as e:
            logger.warning(f"Erreur lors de la vérification de l'existence de la table biometrie_scan_resultat: {e}")
            table_exists = False
        
        # Si la table n'existe pas, on n'a rien à faire
        # Django gérera automatiquement les autres ForeignKey avec SET_NULL
        if not table_exists:
            logger.info(f"Table biometrie_scan_resultat n'existe pas, suppression de l'utilisateur {instance.id} sans mise à jour de cette table")
            # Ne rien faire, la suppression continuera normalement
            # Les autres tables seront mises à jour automatiquement par Django
    except Exception as e:
        # En cas d'erreur, logger mais ne pas bloquer la suppression
        logger.warning(f"Erreur dans le signal pre_delete pour l'utilisateur {instance.id}: {e}")

