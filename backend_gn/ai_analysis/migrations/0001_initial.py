# Generated manually for ai_analysis

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Cas',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('categorie', models.CharField(max_length=100)),
                ('lieu', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('statut', models.CharField(default='ouvert', max_length=50)),
            ],
            options={
                'verbose_name': 'Cas',
                'verbose_name_plural': 'Cas',
                'ordering': ['-date'],
            },
        ),
        migrations.CreateModel(
            name='EvolutionMensuelle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mois', models.DateField()),
                ('total_cas', models.IntegerField()),
                ('moyenne_cas', models.FloatField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Évolution Mensuelle',
                'verbose_name_plural': 'Évolutions Mensuelles',
                'ordering': ['-mois'],
            },
        ),
        migrations.CreateModel(
            name='EvolutionDetaillee',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mois', models.DateField()),
                ('categorie', models.CharField(max_length=100)),
                ('total_cas', models.IntegerField()),
                ('moyenne_cas', models.FloatField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Évolution Détaillée',
                'verbose_name_plural': 'Évolutions Détaillées',
                'ordering': ['-mois', 'categorie'],
            },
        ),
        migrations.CreateModel(
            name='RepartitionGeographique',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('lieu', models.CharField(max_length=255)),
                ('total_cas', models.IntegerField()),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Répartition Géographique',
                'verbose_name_plural': 'Répartitions Géographiques',
                'ordering': ['-total_cas'],
            },
        ),
        migrations.CreateModel(
            name='ActiviteTempsReel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('categorie', models.CharField(max_length=100)),
                ('lieu', models.CharField(max_length=255)),
                ('valeur', models.FloatField()),
                ('anomalie', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Activité Temps Réel',
                'verbose_name_plural': 'Activités Temps Réel',
                'ordering': ['-timestamp'],
            },
        ),
    ]

