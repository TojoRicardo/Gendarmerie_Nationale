# Generated migration to sync timestamp with date_action

from django.db import migrations, models


def sync_timestamp(apps, schema_editor):
    """Synchronise timestamp avec date_action pour les enregistrements existants."""
    JournalAudit = apps.get_model('audit', 'JournalAudit')
    JournalAudit.objects.all().update(timestamp=models.F('date_action'))


def reverse_sync_timestamp(apps, schema_editor):
    """Ne rien faire lors de la réversion."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0005_add_sgic_niveau1_fields'),
    ]

    operations = [
        migrations.RunPython(sync_timestamp, reverse_sync_timestamp),
    ]

