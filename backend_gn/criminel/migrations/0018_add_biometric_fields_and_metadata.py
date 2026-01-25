# Generated manually for biometric fields and metadata

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('criminel', '0017_alter_investigationassignment_assigned_by_and_more'),
        ('utilisateur', '0001_initial'),
    ]

    operations = [
        # Champs physiques supplémentaires
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='height',
            field=models.PositiveIntegerField(blank=True, help_text='Taille en centimètres', null=True, validators=[django.core.validators.MinValueValidator(50), django.core.validators.MaxValueValidator(250)], verbose_name='Taille (cm)'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='weight',
            field=models.PositiveIntegerField(blank=True, help_text='Poids en kilogrammes', null=True, validators=[django.core.validators.MinValueValidator(20), django.core.validators.MaxValueValidator(300)], verbose_name='Poids (kg)'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='eye_color',
            field=models.CharField(blank=True, help_text='Ex: Brun, Bleu, Vert, Noir', max_length=50, null=True, verbose_name='Couleur des yeux'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='hair_color',
            field=models.CharField(blank=True, help_text='Détail de la couleur des cheveux', max_length=50, null=True, verbose_name='Couleur des cheveux'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='build',
            field=models.CharField(blank=True, help_text='Description de la morphologie (athlétique, mince, etc.)', max_length=50, null=True, verbose_name='Morphologie'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='face_shape',
            field=models.CharField(blank=True, help_text='Forme détaillée du visage', max_length=50, null=True, verbose_name='Forme du visage'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='tattoos',
            field=models.TextField(blank=True, help_text='Description des tatouages (localisation, description)', null=True, verbose_name='Tatouages'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='distinguishing_marks',
            field=models.TextField(blank=True, help_text='Marques, cicatrices, particularités physiques', null=True, verbose_name='Signes distinctifs'),
        ),
        
        # Filiation
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='spouse',
            field=models.CharField(blank=True, help_text='Nom du conjoint ou de la conjointe', max_length=200, null=True, verbose_name='Conjoint(e)'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='children',
            field=models.TextField(blank=True, help_text='Liste des enfants (noms, dates de naissance)', null=True, verbose_name='Enfants'),
        ),
        
        # Coordonnées
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='email',
            field=models.EmailField(blank=True, help_text='Adresse email (si disponible)', max_length=254, null=True, verbose_name='Email'),
        ),
        
        # Informations judiciaires
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='record_status',
            field=models.CharField(blank=True, help_text='Statut du dossier judiciaire (Actif, Clos, En cours, etc.)', max_length=50, null=True, verbose_name='Statut du dossier'),
        ),
        
        # Métadonnées et traçabilité
        # D'abord ajouter le champ UUID sans contrainte unique
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, help_text='Identifiant unique universel', null=True, verbose_name='UUID'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='created_by',
            field=models.ForeignKey(blank=True, help_text='Utilisateur ayant créé la fiche', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fiches_creees', to=settings.AUTH_USER_MODEL, verbose_name='Créé par'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='pdf_exported',
            field=models.FileField(blank=True, help_text='Fichier PDF généré de la fiche criminelle', null=True, upload_to='criminels/pdfs/', verbose_name='PDF exporté'),
        ),
        migrations.AddField(
            model_name='criminalfichecriminelle',
            name='pdf_exported_at',
            field=models.DateTimeField(blank=True, help_text="Date de dernière génération du PDF", null=True, verbose_name="Date d'export PDF"),
        ),
        
        # Générer des UUID pour les enregistrements existants
        migrations.RunPython(
            code=lambda apps, schema_editor: _generate_uuids(apps, schema_editor),
            reverse_code=migrations.RunPython.noop,
        ),
        
        # Maintenant ajouter la contrainte unique après avoir généré les UUID
        migrations.AlterField(
            model_name='criminalfichecriminelle',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, help_text='Identifiant unique universel', unique=True, verbose_name='UUID'),
        ),
    ]


def _generate_uuids(apps, schema_editor):
    """Génère des UUID uniques pour les enregistrements existants."""
    CriminalFicheCriminelle = apps.get_model('criminel', 'CriminalFicheCriminelle')
    existing_uuids = set()
    
    for record in CriminalFicheCriminelle.objects.all():
        if not record.uuid:
            # Générer un UUID unique
            new_uuid = uuid.uuid4()
            while new_uuid in existing_uuids:
                new_uuid = uuid.uuid4()
            existing_uuids.add(new_uuid)
            record.uuid = new_uuid
            record.save(update_fields=['uuid'])
        else:
            # Si un UUID existe déjà, vérifier qu'il est unique
            if record.uuid in existing_uuids:
                # Générer un nouveau UUID si doublon
                new_uuid = uuid.uuid4()
                while new_uuid in existing_uuids:
                    new_uuid = uuid.uuid4()
                existing_uuids.add(new_uuid)
                record.uuid = new_uuid
                record.save(update_fields=['uuid'])
            else:
                existing_uuids.add(record.uuid)

