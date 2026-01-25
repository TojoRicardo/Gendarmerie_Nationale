# Generated manually to remove UserMFA model
# Migration vide car le modèle UserMFA n'existe plus dans le code

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('utilisateur', '0017_add_user_archive_fields'),
    ]

    operations = [
        # Migration vide - le modèle UserMFA a déjà été supprimé du code
        # Si la table existe encore en base, elle sera supprimée manuellement
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS utilisateur_usermfa;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

