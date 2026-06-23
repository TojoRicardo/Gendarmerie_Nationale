from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biometrie', '0013_alter_biometriehistorique_type_objet'),
    ]

    operations = [
        migrations.AlterField(
            model_name='biometrieempreinte',
            name='doigt',
            field=models.CharField(
                choices=[
                    ('pouce_droit', 'Pouce droit'),
                    ('index_droit', 'Index droit'),
                    ('majeur_droit', 'Majeur droit'),
                    ('annulaire_droit', 'Annulaire droit'),
                    ('auriculaire_droit', 'Auriculaire droit'),
                    ('pouce_gauche', 'Pouce gauche'),
                    ('index_gauche', 'Index gauche'),
                    ('majeur_gauche', 'Majeur gauche'),
                    ('annulaire_gauche', 'Annulaire gauche'),
                    ('auriculaire_gauche', 'Auriculaire gauche'),
                    ('simultanee_droite', 'Empreintes simultanées main droite'),
                    ('simultanee_gauche', 'Empreintes simultanées main gauche'),
                ],
                max_length=50,
                verbose_name='Doigt',
            ),
        ),
    ]
