# Generated migration for Role and PermissionSGIC models

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('utilisateur', '0020_rename_utilisateur_timesta_idx_utilisateur_timesta_af0fd2_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PermissionSGIC',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(help_text='Code unique de la permission (ex: fiches.consulter)', max_length=150, unique=True, verbose_name='Code de permission')),
                ('label', models.CharField(help_text='Libellé descriptif de la permission', max_length=200, verbose_name='Libellé')),
                ('category', models.CharField(choices=[('Fiches', 'Fiches'), ('Utilisateurs', 'Utilisateurs'), ('Rôles', 'Rôles'), ('Biométrie', 'Biométrie'), ('IA', 'Intelligence Artificielle'), ('Rapports', 'Rapports'), ('Audit', 'Audit')], help_text='Catégorie de la permission', max_length=100, verbose_name='Catégorie')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de mise à jour')),
            ],
            options={
                'verbose_name': 'Permission SGIC',
                'verbose_name_plural': 'Permissions SGIC',
                'ordering': ['category', 'code'],
            },
        ),
        migrations.CreateModel(
            name='Role',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Nom unique du rôle', max_length=150, unique=True, verbose_name='Nom du rôle')),
                ('description', models.TextField(blank=True, help_text='Description détaillée du rôle', verbose_name='Description')),
                ('is_active', models.BooleanField(default=True, help_text='Indique si le rôle est actif', verbose_name='Actif')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de mise à jour')),
                ('permissions', models.ManyToManyField(help_text='Permissions associées à ce rôle', related_name='roles', to='utilisateur.permissionsgic', verbose_name='Permissions')),
            ],
            options={
                'verbose_name': 'Rôle',
                'verbose_name_plural': 'Rôles',
                'ordering': ['name'],
            },
        ),
        migrations.AddIndex(
            model_name='permissionsgic',
            index=models.Index(fields=['code'], name='utilisateur_code_idx'),
        ),
        migrations.AddIndex(
            model_name='permissionsgic',
            index=models.Index(fields=['category'], name='utilisateur_category_idx'),
        ),
        migrations.AddIndex(
            model_name='role',
            index=models.Index(fields=['name'], name='utilisateur_name_idx'),
        ),
        migrations.AddIndex(
            model_name='role',
            index=models.Index(fields=['is_active'], name='utilisateur_is_active_idx'),
        ),
    ]

