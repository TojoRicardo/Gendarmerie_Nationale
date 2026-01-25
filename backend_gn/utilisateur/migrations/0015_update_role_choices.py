from django.db import migrations, models


def noop(apps, schema_editor):
    """Placeholder migration since we only alter field choices."""


class Migration(migrations.Migration):

    dependencies = [
        ('utilisateur', '0014_remove_mfa_enabled_field'),
    ]

    operations = [
        migrations.AlterField(
            model_name='utilisateurmodel',
            name='role',
            field=models.CharField(
                blank=True,
                choices=[
                    ('admin', 'Administrateur'),
                    ('enqueteur', 'Enquêteur'),
                    ('analyste', 'Analyste'),
                    ('operateur', 'Opérateur'),
                    ('observateur', 'Observateur'),
                    ('Administrateur Système', 'Administrateur Système'),
                    ('Enquêteur Principal', 'Enquêteur Principal'),
                    ('Enquêteur', 'Enquêteur'),
                    ('Enquêteur Junior', 'Enquêteur Junior'),
                    ('Analyste', 'Analyste'),
                    ('Observateur', 'Observateur'),
                ],
                help_text="Rôle de l'utilisateur dans le système",
                max_length=100,
                null=True,
            ),
        ),
    ]

