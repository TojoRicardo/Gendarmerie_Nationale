# pylint: disable=import-error
from django.apps import AppConfig


class BiometrieConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'biometrie'
    verbose_name = 'Biométrie'
    
    def ready(self):
        """
        Configuration lors du chargement de l'app
        
        NOTE: Les signals de reconnaissance faciale ont été supprimés.
        """
        pass

