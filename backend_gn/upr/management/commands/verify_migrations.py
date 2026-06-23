"""
Commande Django pour vérifier l'état des migrations et des modèles Camera/UPRLog
"""

from django.core.management.base import BaseCommand
from django.db import connection
from upr.models import Camera, UPRLog


class Command(BaseCommand):
    help = 'Vérifie l\'état des migrations pour les modèles Camera et UPRLog'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS(' VÉRIFICATION DES MIGRATIONS UPR'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

        # 1. Vérifier les migrations
        self.stdout.write(self.style.WARNING('1. Vérification des migrations...'))
        try:
            from django.db.migrations.executor import MigrationExecutor
            from django.db import connections
            executor = MigrationExecutor(connections['default'])
            plan = executor.migration_plan(executor.loader.graph.leaf_nodes('upr'))
            
            if plan:
                self.stdout.write(self.style.ERROR(f'  [ERREUR] {len(plan)} migration(s) en attente:'))
                for migration, backwards in plan:
                    self.stdout.write(self.style.ERROR(f'     - {migration}'))
            else:
                self.stdout.write(self.style.SUCCESS('  [OK] Toutes les migrations sont appliquées'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [ERREUR] Erreur: {e}'))

        # 2. Vérifier les tables dans la base de données
        self.stdout.write(self.style.WARNING('\n2. Vérification des tables...'))
        try:
            from django.conf import settings
            db_engine = settings.DATABASES['default']['ENGINE']
            
            with connection.cursor() as cursor:
                if 'sqlite' in db_engine:
                    cursor.execute(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sgic_%'"
                    )
                elif 'postgresql' in db_engine:
                    cursor.execute(
                        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'sgic_%'"
                    )
                else:
                    # MySQL
                    cursor.execute(
                        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 'sgic_%'"
                    )
                
                tables = [row[0] for row in cursor.fetchall()]
                
                required_tables = ['sgic_camera', 'sgic_uprlog']
                for table in required_tables:
                    if table in tables:
                        self.stdout.write(self.style.SUCCESS(f'  [OK] Table {table} existe'))
                    else:
                        self.stdout.write(self.style.ERROR(f'  [ERREUR] Table {table} manquante'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [ERREUR] Erreur: {e}'))

        # 3. Vérifier les modèles
        self.stdout.write(self.style.WARNING('\n3. Vérification des modèles...'))
        try:
            self.stdout.write(self.style.SUCCESS(f'  [OK] Modèle Camera: {Camera}'))
            self.stdout.write(self.style.SUCCESS(f'  [OK] Modèle UPRLog: {UPRLog}'))
            
            # Vérifier les champs
            camera_fields = [f.name for f in Camera._meta.get_fields()]
            uprlog_fields = [f.name for f in UPRLog._meta.get_fields()]
            
            required_camera_fields = ['camera_id', 'name', 'source', 'camera_type', 'active']
            required_uprlog_fields = ['action', 'details', 'camera', 'user']
            
            missing_camera = [f for f in required_camera_fields if f not in camera_fields]
            missing_uprlog = [f for f in required_uprlog_fields if f not in uprlog_fields]
            
            if missing_camera:
                self.stdout.write(self.style.ERROR(f'  [ERREUR] Champs manquants dans Camera: {missing_camera}'))
            else:
                self.stdout.write(self.style.SUCCESS('  [OK] Tous les champs requis sont présents dans Camera'))
            
            if missing_uprlog:
                self.stdout.write(self.style.ERROR(f'  [ERREUR] Champs manquants dans UPRLog: {missing_uprlog}'))
            else:
                self.stdout.write(self.style.SUCCESS('  [OK] Tous les champs requis sont présents dans UPRLog'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [ERREUR] Erreur: {e}'))

        # 4. Test de création d'objets
        self.stdout.write(self.style.WARNING('\n4. Test de création d\'objets...'))
        try:
            # Test Camera
            test_camera = Camera.objects.create(
                camera_id='test_verification',
                name='Caméra de test',
                source='0',
                camera_type='usb',
                active=False
            )
            self.stdout.write(self.style.SUCCESS(f'  [OK] Camera créée: {test_camera}'))
            
            # Test UPRLog
            test_log = UPRLog.objects.create(
                action='detection',
                details={'test': True},
                camera=test_camera
            )
            self.stdout.write(self.style.SUCCESS(f'  [OK] UPRLog créé: {test_log}'))
            
            # Nettoyer
            test_log.delete()
            test_camera.delete()
            self.stdout.write(self.style.SUCCESS('  [OK] Objets de test supprimés'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [ERREUR] Erreur lors de la création: {e}'))

        # 5. Statistiques
        self.stdout.write(self.style.WARNING('\n5. Statistiques...'))
        try:
            camera_count = Camera.objects.count()
            log_count = UPRLog.objects.count()
            self.stdout.write(self.style.SUCCESS(f'   Nombre de caméras: {camera_count}'))
            self.stdout.write(self.style.SUCCESS(f'   Nombre de logs: {log_count}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [ERREUR] Erreur: {e}'))

        # Résumé
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('[OK] VÉRIFICATION TERMINÉE'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

