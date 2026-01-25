"""
Commande de gestion Django pour supprimer toutes les notifications
Usage: python manage.py supprimer_notifications
"""
from django.core.management.base import BaseCommand
from notification.models import Notification


class Command(BaseCommand):
    help = 'Supprime toutes les notifications de la base de données'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression sans demander',
        )

    def handle(self, *args, **options):
        # Compter les notifications
        count = Notification.objects.count()
        
        if count == 0:
            self.stdout.write(
                self.style.WARNING('Aucune notification à supprimer.')
            )
            return

        self.stdout.write(
            self.style.WARNING(f'[INFO] {count} notification(s) trouvee(s).')
        )

        # Demander confirmation si --confirm n'est pas passé
        if not options['confirm']:
            confirmation = input(
                f'\n[ATTENTION] Voulez-vous vraiment supprimer TOUTES les {count} notifications ? (oui/non): '
            )
            if confirmation.lower() not in ['oui', 'yes', 'o', 'y']:
                self.stdout.write(
                    self.style.ERROR('[ERREUR] Suppression annulee.')
                )
                return

        # Supprimer toutes les notifications
        deleted_count, _ = Notification.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'[SUCCES] {deleted_count} notification(s) supprimee(s) avec succes!'
            )
        )

