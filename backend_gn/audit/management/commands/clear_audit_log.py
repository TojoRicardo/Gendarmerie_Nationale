"""
Commande de gestion Django pour effacer toutes les données du journal d'audit.
Usage: python manage.py clear_audit_log
"""

from django.core.management.base import BaseCommand
from audit.models import JournalAudit, AuditEvent
from django.db import transaction


class Command(BaseCommand):
    help = 'Efface toutes les données du journal d\'audit (JournalAudit et AuditEvent)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression sans prompt interactif',
        )
        parser.add_argument(
            '--keep-recent',
            type=int,
            default=0,
            help='Conserver les N dernières entrées (par défaut: 0 = tout supprimer)',
        )

    def handle(self, *args, **options):
        confirm = options['confirm']
        keep_recent = options['keep_recent']

        # Compter les entrées existantes
        journal_count = JournalAudit.objects.count()
        event_count = AuditEvent.objects.count()
        total_count = journal_count + event_count

        if total_count == 0:
            self.stdout.write(
                self.style.SUCCESS('Le journal d\'audit est déjà vide.')
            )
            return

        self.stdout.write(
            self.style.WARNING(
                f'\n⚠️  ATTENTION: Cette opération va supprimer toutes les données du journal d\'audit.\n'
                f'   - Entrées JournalAudit: {journal_count}\n'
                f'   - Entrées AuditEvent: {event_count}\n'
                f'   - Total: {total_count} entrées\n'
            )
        )

        if keep_recent > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'   Les {keep_recent} entrées les plus récentes seront conservées.\n'
                )
            )

        if not confirm:
            self.stdout.write(
                self.style.ERROR(
                    '\nPour confirmer la suppression, utilisez: python manage.py clear_audit_log --confirm\n'
                    'Ou avec conservation des N dernières entrées: python manage.py clear_audit_log --confirm --keep-recent 100\n'
                )
            )
            return

        try:
            with transaction.atomic():
                if keep_recent > 0:
                    # Conserver les N dernières entrées de JournalAudit
                    if journal_count > keep_recent:
                        entries_to_keep = JournalAudit.objects.order_by('-date_action')[:keep_recent]
                        ids_to_keep = list(entries_to_keep.values_list('id', flat=True))
                        deleted_journal = JournalAudit.objects.exclude(id__in=ids_to_keep).delete()
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ {deleted_journal[0]} entrées JournalAudit supprimées ({keep_recent} conservées)'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Toutes les {journal_count} entrées JournalAudit sont conservées (moins que {keep_recent})'
                            )
                        )

                    # Conserver les N dernières entrées de AuditEvent
                    if event_count > keep_recent:
                        events_to_keep = AuditEvent.objects.order_by('-date_action')[:keep_recent]
                        ids_to_keep = list(events_to_keep.values_list('id', flat=True))
                        deleted_events = AuditEvent.objects.exclude(id__in=ids_to_keep).delete()
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ {deleted_events[0]} entrées AuditEvent supprimées ({keep_recent} conservées)'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Toutes les {event_count} entrées AuditEvent sont conservées (moins que {keep_recent})'
                            )
                        )
                else:
                    # Supprimer toutes les entrées
                    deleted_journal = JournalAudit.objects.all().delete()
                    deleted_events = AuditEvent.objects.all().delete()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'\n✓ Suppression réussie:\n'
                            f'   - {deleted_journal[0]} entrées JournalAudit supprimées\n'
                            f'   - {deleted_events[0]} entrées AuditEvent supprimées\n'
                            f'   - Total: {deleted_journal[0] + deleted_events[0]} entrées supprimées'
                        )
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n✗ Erreur lors de la suppression: {str(e)}')
            )
            raise

