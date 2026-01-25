from django.apps import AppConfig


class AiAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_analysis'
    verbose_name = 'AI Analysis'

    def ready(self):
        """
        Appelé quand l'application est prête.
        Utilisé pour importer les signaux ou effectuer une initialisation.
        """
        pass

