from django.db import migrations, models
import django.db.models.deletion
import biometrie.models


class Migration(migrations.Migration):

    dependencies = [
        ('criminel', '0011_add_is_archived_field'),
        ('biometrie', '0006_alter_biometrieempreinte_image_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Biometrie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('photo', models.ImageField(upload_to='biometrie/photos/', validators=[biometrie.models.validate_image_file], verbose_name='Photo source')),
                ('encodage_facial', models.JSONField(help_text="Vecteur d'encodage facial généré par ArcFace", verbose_name='Encodage facial')),
                ('date_enregistrement', models.DateTimeField(auto_now_add=True, verbose_name="Date d'enregistrement")),
                ('criminel', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='encodages_biometriques', to='criminel.criminalfichecriminelle', verbose_name='Criminel')),
            ],
            options={
                'verbose_name': 'Encodage biométrique',
                'verbose_name_plural': 'Encodages biométriques',
                'db_table': 'biometrie_encodage',
                'ordering': ['-date_enregistrement'],
            },
        ),
        migrations.AddIndex(
            model_name='biometrie',
            index=models.Index(fields=['criminel', '-date_enregistrement'], name='biometrie_e_crimine_a8960f_idx'),
        ),
    ]

