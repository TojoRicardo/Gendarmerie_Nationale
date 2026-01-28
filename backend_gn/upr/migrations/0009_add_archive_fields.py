# Generated migration for adding archive fields to UPR

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('upr', '0008_add_face_encoding_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='unidentifiedperson',
            name='is_archived',
            field=models.BooleanField(default=False, verbose_name='Archivé', help_text="Indique si l'UPR est archivé (suppression douce)"),
        ),
        migrations.AddField(
            model_name='unidentifiedperson',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name="Date d'archivage", help_text="Date à laquelle l'UPR a été archivé"),
        ),
        migrations.AddField(
            model_name='unidentifiedperson',
            name='archived_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='upr_archived', to=settings.AUTH_USER_MODEL, verbose_name='Archivé par', help_text="Utilisateur ayant archivé cet UPR"),
        ),
        migrations.AddIndex(
            model_name='unidentifiedperson',
            index=models.Index(fields=['is_archived'], name='sgic_uniden_is_arch_abc123_idx'),
        ),
    ]
