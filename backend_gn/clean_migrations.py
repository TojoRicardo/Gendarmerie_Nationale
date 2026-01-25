"""
Script pour nettoyer les doublons et conflits de migrations Django
"""

import os
import sys
import django
from pathlib import Path

# Configuration Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_gn.settings')
django.setup()

from django.db import connection, transaction
from django.core.management import call_command
from django.apps import apps


def find_duplicate_migrations():
    """Trouve les migrations en double dans django_migrations"""
    print("\n" + "="*70)
    print("🔍 RECHERCHE DES DOUBLONS DE MIGRATIONS")
    print("="*70 + "\n")
    
    with connection.cursor() as cursor:
        query = """
            SELECT app, name, COUNT(*) as count, 
                   STRING_AGG(id::text, ', ' ORDER BY id) as ids
            FROM django_migrations
            GROUP BY app, name
            HAVING COUNT(*) > 1
            ORDER BY app, name
        """
        cursor.execute(query)
        duplicates = cursor.fetchall()
        
        if not duplicates:
            print("✅ Aucun doublon de migration trouvé dans la base de données.\n")
            return []
        
        print(f"⚠️  {len(duplicates)} migration(s) avec doublons trouvée(s):\n")
        for app, name, count, ids in duplicates:
            print(f"  - {app}.{name}: {count} entrée(s) (IDs: {ids})")
        
        return duplicates


def find_orphaned_migrations():
    """Trouve les migrations orphelines (dans la DB mais fichiers supprimés)"""
    print("\n" + "="*70)
    print("🔍 RECHERCHE DES MIGRATIONS ORPHELINES")
    print("="*70 + "\n")
    
    orphaned = []
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT DISTINCT app, name 
            FROM django_migrations
            ORDER BY app, name
        """)
        db_migrations = cursor.fetchall()
        
        for app_name, migration_name in db_migrations:
            try:
                app_config = apps.get_app_config(app_name)
                migrations_dir = Path(app_config.path) / 'migrations'
                migration_file = migrations_dir / f"{migration_name}.py"
                
                if not migration_file.exists():
                    orphaned.append((app_name, migration_name))
                    print(f"  ⚠️  {app_name}.{migration_name} (fichier manquant)")
            except Exception as e:
                print(f"  ❌ Erreur pour {app_name}.{migration_name}: {e}")
    
    if not orphaned:
        print("✅ Aucune migration orpheline trouvée.\n")
    else:
        print(f"\n⚠️  {len(orphaned)} migration(s) orpheline(s) trouvée(s).\n")
    
    return orphaned


def clean_duplicate_migrations(dry_run=True):
    """Nettoie les doublons de migrations"""
    duplicates = find_duplicate_migrations()
    
    if not duplicates:
        return
    
    if dry_run:
        print("\n🔍 Mode DRY-RUN: Aucune modification ne sera effectuée.")
        print("   Exécutez avec --apply pour supprimer les doublons.\n")
        return
    
    print("\n🗑️  Suppression des doublons...")
    with connection.cursor() as cursor:
        for app, name, count, ids in duplicates:
            # Garder la première entrée (ID minimum), supprimer les autres
            cursor.execute("""
                DELETE FROM django_migrations
                WHERE app = %s AND name = %s
                AND id NOT IN (
                    SELECT MIN(id) FROM django_migrations
                    WHERE app = %s AND name = %s
                )
            """, [app, name, app, name])
            deleted = cursor.rowcount
            print(f"  ✅ {app}.{name}: {deleted} doublon(s) supprimé(s)")
    
    connection.commit()
    print("\n✅ Nettoyage des doublons terminé.\n")


def clean_orphaned_migrations(dry_run=True):
    """Nettoie les migrations orphelines"""
    orphaned = find_orphaned_migrations()
    
    if not orphaned:
        return
    
    if dry_run:
        print("\n🔍 Mode DRY-RUN: Aucune modification ne sera effectuée.")
        print("   Exécutez avec --apply pour supprimer les orphelines.\n")
        return
    
    print("\n🗑️  Suppression des migrations orphelines...")
    with connection.cursor() as cursor:
        for app_name, migration_name in orphaned:
            cursor.execute("""
                DELETE FROM django_migrations
                WHERE app = %s AND name = %s
            """, [app_name, migration_name])
            print(f"  ✅ {app_name}.{migration_name} supprimée de la base")
    
    connection.commit()
    print("\n✅ Nettoyage des migrations orphelines terminé.\n")


def verify_migration_consistency():
    """Vérifie la cohérence des migrations"""
    print("\n" + "="*70)
    print("🔍 VÉRIFICATION DE LA COHÉRENCE DES MIGRATIONS")
    print("="*70 + "\n")
    
    try:
        # Vérifier les migrations non appliquées
        from django.db.migrations.executor import MigrationExecutor
        from django.db import connections
        
        executor = MigrationExecutor(connections['default'])
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        
        if plan:
            print(f"⚠️  {len(plan)} migration(s) en attente d'application:")
            for migration, backwards in plan:
                status = "← (rollback)" if backwards else "→ (forward)"
                print(f"  - {migration.app_label}.{migration.name} {status}")
        else:
            print("✅ Toutes les migrations sont appliquées.")
        
        print()
        return len(plan) == 0
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}\n")
        return False


def main():
    """Fonction principale"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Nettoie les doublons et conflits de migrations Django'
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Applique réellement les suppressions (sinon mode dry-run)'
    )
    parser.add_argument(
        '--duplicates-only',
        action='store_true',
        help='Nettoie uniquement les doublons'
    )
    parser.add_argument(
        '--orphaned-only',
        action='store_true',
        help='Nettoie uniquement les migrations orphelines'
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("🧹 NETTOYAGE DES MIGRATIONS DJANGO")
    print("="*70)
    
    dry_run = not args.apply
    
    if dry_run:
        print("\n⚠️  MODE DRY-RUN - Aucune modification ne sera effectuée")
        print("   Utilisez --apply pour appliquer les changements\n")
    
    # Nettoyer les doublons
    if not args.orphaned_only:
        clean_duplicate_migrations(dry_run=dry_run)
    
    # Nettoyer les orphelines
    if not args.duplicates_only:
        clean_orphaned_migrations(dry_run=dry_run)
    
    # Vérifier la cohérence
    verify_migration_consistency()
    
    print("="*70)
    print("✅ NETTOYAGE TERMINÉ")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
