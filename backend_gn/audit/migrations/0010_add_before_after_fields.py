# Generated manually for audit improvements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0009_add_generic_foreign_key_and_changes_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditlog',
            name='before',
            field=models.JSONField(blank=True, help_text='État de la ressource avant modification (format JSON)', null=True, verbose_name='État avant'),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='after',
            field=models.JSONField(blank=True, help_text='État de la ressource après modification (format JSON)', null=True, verbose_name='État après'),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(
                choices=[
                    ('LOGIN', 'Connexion'),
                    ('LOGOUT', 'Déconnexion'),
                    ('FAILED_LOGIN', 'Échec de connexion'),
                    ('VIEW', 'Consultation'),
                    ('CREATE', 'Création'),
                    ('UPDATE', 'Modification'),
                    ('DELETE', 'Suppression'),
                    ('DOWNLOAD', 'Téléchargement'),
                    ('UPLOAD', 'Téléversement'),
                    ('SEARCH', 'Recherche'),
                    ('SUSPEND', 'Suspension'),
                    ('RESTORE', 'Restauration'),
                    ('PERMISSION_CHANGE', 'Changement de permissions'),
                    ('ROLE_CHANGE', 'Changement de rôle'),
                    ('PIN_VALIDATION', 'Validation de PIN'),
                    ('PIN_FAILED', 'Échec de validation PIN'),
                    ('ACCESS_DENIED', 'Accès refusé'),
                ],
                db_index=True,
                max_length=50,
                verbose_name='Action'
            ),
        ),
    ]

