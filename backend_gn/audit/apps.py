from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'
    
    def ready(self):
        """Enregistre les signals lors du chargement de l'application."""
        import audit.signals  # noqa
        import audit.signals_session  # noqa - Enregistre les signals de session