"""
Commande Django pour supprimer tous les UPR de la base de données.

Usage:
    python manage.py clear_upr
    python manage.py clear_upr --confirm
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from upr.models import UnidentifiedPerson, UPRMatchLog, CriminelMatchLog
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Supprime tous les UPR de la base de données'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression (obligatoire pour exécuter)',
        )
        parser.add_argument(
            '--keep-files',
            action='store_true',
            help='Conserver les fichiers images sur le disque (par défaut, les fichiers sont aussi supprimés)',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    '\n⚠️  ATTENTION: Cette commande va supprimer TOUS les UPR de la base de données!\n'
                    'Pour confirmer, utilisez: python manage.py clear_upr --confirm\n'
                )
            )
            return

        # Compter les UPR avant suppression
        upr_count = UnidentifiedPerson.objects.count()
        match_log_count = UPRMatchLog.objects.count()
        criminel_match_count = CriminelMatchLog.objects.count()

        if upr_count == 0:
            self.stdout.write(self.style.SUCCESS('Aucun UPR à supprimer.'))
            return

        self.stdout.write(
            self.style.WARNING(
                f'\n⚠️  Suppression de {upr_count} UPR(s), '
                f'{match_log_count} log(s) de correspondance UPR, '
                f'et {criminel_match_count} log(s) de correspondance Criminel...\n'
            )
        )

        try:
            with transaction.atomic():
                self.stdout.write('Suppression des logs de correspondances...')
                UPRMatchLog.objects.all().delete()
                CriminelMatchLog.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f'✓ {match_log_count + criminel_match_count} log(s) supprimé(s)'))

                # Supprimer les UPR
                self.stdout.write('Suppression des UPR...')
                
                # Si on ne garde pas les fichiers, Django les supprimera automatiquement
                # Sinon, on doit les supprimer manuellement
                if not options['keep_files']:
                    # Supprimer les fichiers images
                    for upr in UnidentifiedPerson.objects.all():
                        if upr.profil_face:
                            try:
                                upr.profil_face.delete(save=False)
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(f'  ⚠️  Impossible de supprimer profil_face de UPR {upr.id}: {e}')
                                )
                        if upr.profil_left:
                            try:
                                upr.profil_left.delete(save=False)
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(f'  ⚠️  Impossible de supprimer profil_left de UPR {upr.id}: {e}')
                                )
                        if upr.profil_right:
                            try:
                                upr.profil_right.delete(save=False)
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(f'  ⚠️  Impossible de supprimer profil_right de UPR {upr.id}: {e}')
                                )
                        if upr.empreinte_digitale:
                            try:
                                upr.empreinte_digitale.delete(save=False)
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(f'  ⚠️  Impossible de supprimer empreinte_digitale de UPR {upr.id}: {e}')
                                )

                # Supprimer tous les UPR
                deleted_count = UnidentifiedPerson.objects.all().delete()[0]
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✓ {deleted_count} UPR(s) supprimé(s) avec succès!\n'
                    )
                )

        except Exception as e:
            raise CommandError(f'Erreur lors de la suppression: {e}')

