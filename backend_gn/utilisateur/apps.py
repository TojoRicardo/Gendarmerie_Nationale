from django.apps import AppConfig


class UtilisateurConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'utilisateur'
    
    def ready(self):
        """Enregistre les signals lors du chargement de l'application."""
        import utilisateur.signals  # noqa