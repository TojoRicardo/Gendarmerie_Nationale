from django.apps import AppConfig


class NotificationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = 'Gestion des Notifications'
    
    def ready(self):
        """Importer les signals lors du démarrage de l'application"""
        import notifications.signals  # noqa
        import notifications.signals_enqueteur  # noqa - Signals pour notifier les admins des modifications d'enquêteurs
