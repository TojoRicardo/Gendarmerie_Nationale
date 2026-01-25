"""
Commande Django pour nettoyer les migrations orphelines (marquées comme appliquées dans la base mais fichiers supprimés)
"""

from django.core.management.base import BaseCommand
from django.db import connection, transaction
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Supprime les migrations orphelines de la table django_migrations (fichiers supprimés)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les migrations orphelines sans les supprimer',
        )
        parser.add_argument(
            '--app',
            type=str,
            help='Nettoyer uniquement les migrations d\'une app spécifique (ex: audit)',
        )
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Supprime sans confirmation',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        app_filter = options.get('app')

        # Récupérer toutes les apps installées
        installed_apps = settings.INSTALLED_APPS
        
        if app_filter:
            installed_apps = [app for app in installed_apps if app == app_filter]

        orphaned_migrations = []

        with connection.cursor() as cursor:
            for app_name in installed_apps:
                # Ignorer les apps Django et tiers
                if app_name.startswith('django.') or app_name.startswith('rest_framework'):
                    continue

                try:
                    # Trouver le chemin du dossier migrations
                    import importlib
                    app_module = importlib.import_module(app_name)
                    app_path = os.path.dirname(app_module.__file__)
                    migrations_path = os.path.join(app_path, 'migrations')
                    
                    if not os.path.exists(migrations_path):
                        continue

                    # Lister tous les fichiers de migration existants
                    migration_files = set()
                    for filename in os.listdir(migrations_path):
                        if filename.endswith('.py') and filename != '__init__.py':
                            migration_name = filename.replace('.py', '')
                            migration_files.add(migration_name)

                    # Récupérer les migrations marquées comme appliquées dans la base
                    cursor.execute("""
                        SELECT name FROM django_migrations
                        WHERE app = %s
                    """, [app_name])

                    db_migrations = [row[0] for row in cursor.fetchall()]

                    # Trouver les orphelines
                    for migration_name in db_migrations:
                        if migration_name not in migration_files:
                            orphaned_migrations.append((app_name, migration_name))

                except (ImportError, AttributeError, ModuleNotFoundError):
                    # App non trouvée, ignorer
                    continue

        if not orphaned_migrations:
            self.stdout.write(
                self.style.SUCCESS('✓ Aucune migration orpheline trouvée.')
            )
            return

        self.stdout.write(
            self.style.WARNING(
                f'\n⚠️  {len(orphaned_migrations)} migration(s) orpheline(s) trouvée(s):\n'
            )
        )

        for app, name in orphaned_migrations:
            self.stdout.write(f'  - {app}.{name}')

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\n🔍 Mode dry-run: {len(orphaned_migrations)} entrée(s) seraient supprimées.'
                )
            )
            return

        # Demander confirmation sauf si --yes est utilisé
        if not options.get('yes', False):
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  Cette opération va supprimer {len(orphaned_migrations)} entrée(s) orpheline(s) de la base de données.'
                )
            )
            response = input('Continuer ? (oui/non): ')

            if response.lower() != 'oui':
                self.stdout.write(self.style.ERROR('Opération annulée.'))
                return

        deleted_count = 0
        with transaction.atomic():
            with connection.cursor() as cursor:
                for app, name in orphaned_migrations:
                    delete_query = """
                        DELETE FROM django_migrations
                        WHERE app = %s AND name = %s
                    """
                    cursor.execute(delete_query, [app, name])
                    deleted = cursor.rowcount
                    deleted_count += deleted
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ {app}.{name}: supprimée'
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Nettoyage terminé: {deleted_count} migration(s) orpheline(s) supprimée(s).'
            )
        )

