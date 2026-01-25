"""
Migration pour ajouter les champs légaux et de conformité
Conformité INTERPOL - Respect vie privée et législation
"""

from django.db import migrations, models
from django.utils import timezone
from dateutil.relativedelta import relativedelta


class Migration(migrations.Migration):

    dependencies = [
        ('biometrie', '0003_biometriepaume'),
    ]

    operations = [
        # Ajout de champs légaux à BiometriePhoto
        migrations.AddField(
            model_name='biometriephoto',
            name='base_legale',
            field=models.CharField(
                max_length=100,
                choices=[
                    ('mandat_judiciaire', 'Mandat judiciaire'),
                    ('flagrant_delit', 'Flagrant délit'),
                    ('enquete_preliminaire', 'Enquête préliminaire'),
                    ('commission_rogatoire', 'Commission rogatoire'),
                    ('consentement', 'Consentement explicite'),
                ],
                default='mandat_judiciaire',
                verbose_name='Base légale de collecte',
                help_text='Justification légale pour la collecte de cette donnée biométrique'
            ),
        ),
        migrations.AddField(
            model_name='biometriephoto',
            name='numero_procedure',
            field=models.CharField(
                max_length=100,
                blank=True,
                null=True,
                verbose_name='Numéro de procédure',
                help_text='Référence de la procédure judiciaire'
            ),
        ),
        migrations.AddField(
            model_name='biometriephoto',
            name='date_expiration',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Date d\'expiration',
                help_text='Date à laquelle cette donnée doit être supprimée (5 ans par défaut)'
            ),
        ),
        migrations.AddField(
            model_name='biometriephoto',
            name='statut_legal',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('actif', 'Actif - Utilisable'),
                    ('archive', 'Archivé - Conservation légale'),
                    ('a_supprimer', 'À supprimer - Fin de rétention'),
                    ('supprime', 'Supprimé - Trace conservée'),
                ],
                default='actif',
                verbose_name='Statut légal'
            ),
        ),
        migrations.AddField(
            model_name='biometriephoto',
            name='consentement_obtenu',
            field=models.BooleanField(
                default=False,
                verbose_name='Consentement obtenu',
                help_text='Consentement explicite pour les non-criminels (témoins, victimes)'
            ),
        ),
        migrations.AddField(
            model_name='biometriephoto',
            name='date_consentement',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Date du consentement'
            ),
        ),
        migrations.AddField(
            model_name='biometriephoto',
            name='finalite_traitement',
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name='Finalité du traitement',
                help_text='But précis de la collecte et du traitement de cette donnée'
            ),
        ),
        
        # Mêmes champs pour BiometrieEmpreinte
        migrations.AddField(
            model_name='biometrieempreinte',
            name='base_legale',
            field=models.CharField(
                max_length=100,
                choices=[
                    ('mandat_judiciaire', 'Mandat judiciaire'),
                    ('flagrant_delit', 'Flagrant délit'),
                    ('enquete_preliminaire', 'Enquête préliminaire'),
                    ('commission_rogatoire', 'Commission rogatoire'),
                    ('consentement', 'Consentement explicite'),
                ],
                default='mandat_judiciaire',
                verbose_name='Base légale de collecte'
            ),
        ),
        migrations.AddField(
            model_name='biometrieempreinte',
            name='numero_procedure',
            field=models.CharField(
                max_length=100,
                blank=True,
                null=True,
                verbose_name='Numéro de procédure'
            ),
        ),
        migrations.AddField(
            model_name='biometrieempreinte',
            name='date_expiration',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Date d\'expiration'
            ),
        ),
        migrations.AddField(
            model_name='biometrieempreinte',
            name='statut_legal',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('actif', 'Actif - Utilisable'),
                    ('archive', 'Archivé - Conservation légale'),
                    ('a_supprimer', 'À supprimer - Fin de rétention'),
                    ('supprime', 'Supprimé - Trace conservée'),
                ],
                default='actif',
                verbose_name='Statut légal'
            ),
        ),
        
        # Champs pour BiometrieScanResultat
        migrations.AddField(
            model_name='biometriescanresultat',
            name='justification_recherche',
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name='Justification de la recherche',
                help_text='Raison et base légale de cette recherche biométrique'
            ),
        ),
        migrations.AddField(
            model_name='biometriescanresultat',
            name='validation_hierarchique',
            field=models.BooleanField(
                default=False,
                verbose_name='Validation hiérarchique obtenue',
                help_text='Validation du supérieur pour les recherches sensibles'
            ),
        ),
    ]

