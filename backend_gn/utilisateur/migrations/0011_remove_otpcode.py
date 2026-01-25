# Generated manually to remove OTPCode model and table

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('utilisateur', '0010_add_mfa_otp_models'),
    ]

    operations = [
        # Supprimer directement la table de la base de données
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS utilisateur_otpcode CASCADE;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

