"""
Commande Django pour nettoyer les doublons de migrations dans django_migrations
"""

from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = 'Supprime les doublons de migrations dans la table django_migrations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les doublons sans les supprimer',
        )
        parser.add_argument(
            '--app',
            type=str,
            help='Nettoyer uniquement les migrations d\'une app spécifique (ex: audit)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        app_filter = options.get('app')

        with connection.cursor() as cursor:
            # Trouver les doublons
            if app_filter:
                query = """
                    SELECT app, name, COUNT(*) as count, MIN(id) as keep_id
                    FROM django_migrations
                    WHERE app = %s
                    GROUP BY app, name
                    HAVING COUNT(*) > 1
                    ORDER BY app, name
                """
                cursor.execute(query, [app_filter])
            else:
                query = """
                    SELECT app, name, COUNT(*) as count, MIN(id) as keep_id
                    FROM django_migrations
                    GROUP BY app, name
                    HAVING COUNT(*) > 1
                    ORDER BY app, name
                """
                cursor.execute(query)

            duplicates = cursor.fetchall()

            if not duplicates:
                self.stdout.write(
                    self.style.SUCCESS('✓ Aucun doublon de migration trouvé.')
                )
                return

            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  {len(duplicates)} migration(s) avec doublons trouvée(s):\n'
                )
            )

            total_to_delete = 0
            for app, name, count, keep_id in duplicates:
                self.stdout.write(
                    f'  - {app}.{name}: {count} entrée(s) (garder ID: {keep_id})'
                )
                total_to_delete += count - 1

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f'\n🔍 Mode dry-run: {total_to_delete} entrée(s) seraient supprimées.'
                    )
                )
                return

            # Demander confirmation
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  Cette opération va supprimer {total_to_delete} entrée(s) dupliquée(s).'
                )
            )
            response = input('Continuer ? (oui/non): ')

            if response.lower() != 'oui':
                self.stdout.write(self.style.ERROR('Opération annulée.'))
                return

            deleted_count = 0
            with transaction.atomic():
                for app, name, count, keep_id in duplicates:
                    delete_query = """
                        DELETE FROM django_migrations
                        WHERE app = %s AND name = %s AND id != %s
                    """
                    cursor.execute(delete_query, [app, name, keep_id])
                    deleted = cursor.rowcount
                    deleted_count += deleted
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ {app}.{name}: {deleted} doublon(s) supprimé(s)'
                        )
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✓ Nettoyage terminé: {deleted_count} entrée(s) supprimée(s).'
                )
            )

