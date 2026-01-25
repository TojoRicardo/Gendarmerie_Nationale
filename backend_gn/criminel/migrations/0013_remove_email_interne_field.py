# Generated migration to remove email_interne field from CriminalFicheCriminelle

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('criminel', '0012_investigationassignment'),
    ]

    operations = [
        # Supprimer le champ email_interne de la table criminal_fiche_criminelle
        # Cette migration supprime la colonne directement de la base de données
        # même si le champ n'existe pas dans le modèle actuel
        migrations.RunSQL(
            # SQL pour supprimer la colonne (PostgreSQL)
            sql="ALTER TABLE criminal_fiche_criminelle DROP COLUMN IF EXISTS email_interne;",
            # SQL de rollback (ne peut pas être annulé car les données sont perdues)
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
