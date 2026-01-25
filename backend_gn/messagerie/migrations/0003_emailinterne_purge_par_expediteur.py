from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messagerie", "0002_emailinternedestinataire_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailinterne",
            name="purge_par_expediteur",
            field=models.BooleanField(default=False),
        ),
    ]

