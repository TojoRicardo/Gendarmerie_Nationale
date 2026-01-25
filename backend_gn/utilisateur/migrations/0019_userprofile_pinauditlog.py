# Generated manually for PIN authentication system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('utilisateur', '0018_remove_usermfa'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pin_hash', models.CharField(blank=True, help_text='PIN haché avec Django password hasher', max_length=128, null=True, verbose_name='Hash du PIN')),
                ('pin_attempts', models.IntegerField(default=0, help_text='Nombre de tentatives PIN échouées consécutives', verbose_name='Tentatives PIN échouées')),
                ('pin_blocked_until', models.DateTimeField(blank=True, help_text="Date/heure jusqu'à laquelle le PIN est bloqué après trop d'échecs", null=True, verbose_name='Blocage PIN jusqu\'à')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de mise à jour')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='userprofile', to=settings.AUTH_USER_MODEL, verbose_name='Utilisateur')),
            ],
            options={
                'verbose_name': 'Profil Utilisateur',
                'verbose_name_plural': 'Profils Utilisateurs',
            },
        ),
        migrations.CreateModel(
            name='PinAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('success', models.BooleanField(help_text='True si la tentative de PIN a réussi', verbose_name='Succès')),
                ('timestamp', models.DateTimeField(auto_now_add=True, verbose_name='Date/heure')),
                ('ip_address', models.GenericIPAddressField(blank=True, help_text='Adresse IP de la tentative de connexion', null=True, verbose_name='Adresse IP')),
                ('user_agent', models.TextField(blank=True, help_text='User Agent du navigateur', null=True, verbose_name='User Agent')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pin_audit_logs', to=settings.AUTH_USER_MODEL, verbose_name='Utilisateur')),
            ],
            options={
                'verbose_name': 'Log Audit PIN',
                'verbose_name_plural': 'Logs Audit PIN',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='pinauditlog',
            index=models.Index(fields=['-timestamp'], name='utilisateur_timesta_idx'),
        ),
        migrations.AddIndex(
            model_name='pinauditlog',
            index=models.Index(fields=['user', '-timestamp'], name='utilisateur_user_id_idx'),
        ),
    ]


