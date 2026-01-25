"""
Commande de gestion Django pour nettoyer les notifications anciennes
Usage: python manage.py nettoyer_notifications --days 30
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from notification.models import Notification


class Command(BaseCommand):
    help = 'Nettoie les notifications lues ou anciennes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Supprimer les notifications lues de plus de X jours (défaut: 30)',
        )
        parser.add_argument(
            '--all-read',
            action='store_true',
            help='Supprimer TOUTES les notifications lues (peu importe la date)',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression sans demander',
        )

    def handle(self, *args, **options):
        days = options['days']
        all_read = options['all_read']
        
        if all_read:
            # Supprimer toutes les notifications lues
            notifications = Notification.objects.filter(lue=True)
            message = 'TOUTES les notifications lues'
        else:
            # Supprimer les notifications lues de plus de X jours
            date_limite = timezone.now() - timedelta(days=days)
            notifications = Notification.objects.filter(
                lue=True,
                date_lecture__lt=date_limite
            )
            message = f'les notifications lues de plus de {days} jours'

        count = notifications.count()
        
        if count == 0:
            self.stdout.write(
                self.style.WARNING(f'Aucune notification à supprimer ({message}).')
            )
            return

        self.stdout.write(
            self.style.WARNING(f' {count} notification(s) trouvée(s) ({message}).')
        )

        # Demander confirmation si --confirm n'est pas passé
        if not options['confirm']:
            confirmation = input(
                f'\n  Voulez-vous supprimer ces {count} notifications ? (oui/non): '
            )
            if confirmation.lower() not in ['oui', 'yes', 'o', 'y']:
                self.stdout.write(
                    self.style.ERROR(' Suppression annulée.')
                )
                return

        # Supprimer les notifications
        deleted_count, _ = notifications.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f' {deleted_count} notification(s) nettoyée(s) avec succès!'
            )
        )

