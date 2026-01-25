"""
Commande personnalisée pour reconstruire l'index de recherche
Usage: python manage.py rebuild_index
"""

from haystack.management.commands.rebuild_index import Command as HaystackRebuildIndexCommand


class Command(HaystackRebuildIndexCommand):
    """
    Commande pour reconstruire l'index de recherche Whoosh
    Hérite de la commande Haystack standard
    """
    help = 'Reconstruit l\'index de recherche Whoosh pour tous les modèles indexés'

