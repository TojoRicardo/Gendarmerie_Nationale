from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("criminel", "0014_add_overdue_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="criminalfichecriminelle",
            name="progression",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Progression calculée automatiquement selon les actions liées au dossier",
                verbose_name="Progression automatique (%)",
            ),
        ),
    ]

