from django.apps import AppConfig


class MessagerieConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "messagerie"
    verbose_name = "Messagerie interne"

    def ready(self):
        # Importer les signaux pour les événements automatiques
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Les signaux ne doivent jamais empêcher le démarrage du serveur
            pass

