from django.apps import AppConfig


class IntelligenceArtificielleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'intelligence_artificielle'
    verbose_name = 'Intelligence Artificielle'

    def ready(self):
        """
        Pré-initialise ArcFace pour éviter le délai important lors
        de la première requête de reconnaissance faciale.
        """
        from django.conf import settings

        if getattr(settings, 'ARC_FACE_AUTOWARM', True):
            try:
                from . import services

                services._get_face_service()
            except Exception:  # pragma: no cover - diagnostic de démarrage
                # On ne bloque pas le démarrage si ArcFace n'est pas dispo.
                pass

