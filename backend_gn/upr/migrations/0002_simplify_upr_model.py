# Generated migration to simplify UPR model

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('upr', '0001_initial'),
    ]

    operations = [
        # Supprimer les anciens champs
        migrations.RemoveField(
            model_name='unidentifiedperson',
            name='profil_face',
        ),
        migrations.RemoveField(
            model_name='unidentifiedperson',
            name='profil_left',
        ),
        migrations.RemoveField(
            model_name='unidentifiedperson',
            name='profil_right',
        ),
        migrations.RemoveField(
            model_name='unidentifiedperson',
            name='landmarks_106',
        ),
        migrations.RemoveField(
            model_name='unidentifiedperson',
            name='context_location',
        ),
        migrations.RemoveField(
            model_name='unidentifiedperson',
            name='discovered_date',
        ),
        
        # Ajouter les nouveaux champs
        migrations.AddField(
            model_name='unidentifiedperson',
            name='nom_temporaire',
            field=models.CharField(max_length=100, verbose_name='Nom temporaire', help_text='Nom généré automatiquement (ex: Individu Non Identifié #0001)'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='unidentifiedperson',
            name='photo_face',
            field=models.ImageField(help_text="Photo obligatoire du visage de face", upload_to='upr/', verbose_name='Photo de face', validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])]),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='unidentifiedperson',
            name='date_enregistrement',
            field=models.DateTimeField(auto_now_add=True, verbose_name='Date d\'enregistrement'),
            preserve_default=False,
        ),
        
        # Modifier code_upr pour être non-éditable
        migrations.AlterField(
            model_name='unidentifiedperson',
            name='code_upr',
            field=models.CharField(editable=False, help_text='Code unique généré automatiquement (ex: UPR-0001)', max_length=20, unique=True, verbose_name='Code UPR'),
        ),
        
        # Modifier face_embedding pour être JSONField (déjà le cas, mais on s'assure)
        migrations.AlterField(
            model_name='unidentifiedperson',
            name='face_embedding',
            field=models.JSONField(blank=True, help_text='Vecteur d\'embedding ArcFace (106 points) pour la reconnaissance faciale', null=True, verbose_name='Embedding ArcFace'),
        ),
        
        # Supprimer le modèle UPRMatchLog (optionnel, on peut le garder pour l'instant)
        # migrations.DeleteModel(
        #     name='UPRMatchLog',
        # ),
    ]







