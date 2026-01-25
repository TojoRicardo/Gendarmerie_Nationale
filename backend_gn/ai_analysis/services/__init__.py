"""Services pour l'analyse IA

Seuls les services basés sur les données réelles sont conservés.
"""

# Import des services d'analyse
from . import analyse_donnees_reelles
from . import analyse_statistiques_avancees
from . import recherche_biometrique

__all__ = [
    'analyse_donnees_reelles',
    'analyse_statistiques_avancees',
    'recherche_biometrique',
]

