"""
Commande Django pour initialiser les permissions
"""
from django.core.management.base import BaseCommand
from utilisateur.permissions import ROLES_PREDEFINIS


class Command(BaseCommand):
    help = 'Initialise les permissions du système'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(' Initialisation du système de permissions...'))

        self.stdout.write(self.style.WARNING('\n Rôles disponibles:'))
        for role_name, role_info in ROLES_PREDEFINIS.items():
            self.stdout.write(f'  - {role_name}: {len(role_info["permissions"])} permissions')

        self.stdout.write(self.style.SUCCESS('\n Système de permissions initialisé avec succès!'))
