# Generated migration for adding embedding_facial field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('criminel', '0006_criminalfichecriminelle_date_enregistrement_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='embedding_facial',
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name='Embedding facial (ArcFace)',
                help_text='Vecteur d\'embedding facial généré par le modèle ArcFace pour la reconnaissance faciale'
            ),
        ),
    ]

