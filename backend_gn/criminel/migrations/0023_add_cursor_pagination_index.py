"""
Migration pour créer l'index optimisé pour la pagination par curseur.

Cet index améliore significativement les performances de la pagination
par curseur en permettant à PostgreSQL d'utiliser un index couvrant
les champs de tri (date_creation DESC, id DESC).
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('criminel', '0022_add_comprehensive_fields_phase2'),
    ]

    operations = [
        migrations.RunSQL(
            # Créer l'index composite pour la pagination par curseur
            sql="""
            CREATE INDEX IF NOT EXISTS idx_criminal_fiche_criminelle_cursor_pagination
            ON criminal_fiche_criminelle (date_creation DESC, id DESC);
            """,
            # Rollback : supprimer l'index si nécessaire
            reverse_sql="""
            DROP INDEX IF EXISTS idx_criminal_fiche_criminelle_cursor_pagination;
            """
        ),
    ]

