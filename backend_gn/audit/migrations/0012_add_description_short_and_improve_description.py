# Migration pour ajouter description_short et améliorer le formatage

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0010_add_before_after_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditlog',
            name='description_short',
            field=models.CharField(
                blank=True,
                help_text='Description courte pour l\'affichage en liste',
                max_length=500,
                null=True,
                verbose_name='Description courte'
            ),
        ),
    ]

