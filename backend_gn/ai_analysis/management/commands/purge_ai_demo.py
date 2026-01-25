"""
Commande pour PURGER toutes les données DEMO de l'app ai_analysis

Supprime le contenu des tables:
- Cas
- EvolutionMensuelle
- EvolutionDetaillee
- RepartitionGeographique
- ActiviteTempsReel

Usage:
    python manage.py purge_ai_demo --yes
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Purge toutes les données DEMO des modèles ai_analysis (sans toucher aux données réelles criminel)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes', action='store_true', help="Confirmer la suppression sans demander"
        )

    def handle(self, *args, **options):
        from ai_analysis.models import (
            Cas,
            EvolutionMensuelle,
            EvolutionDetaillee,
            RepartitionGeographique,
            ActiviteTempsReel,
        )

        if not options['yes']:
            self.stdout.write(self.style.WARNING('Cette opération SUPPRIME toutes les données DEMO.'))
            self.stdout.write('Relancez avec --yes pour confirmer.')
            return

        models_to_purge = [
            ('Cas', Cas),
            ('EvolutionMensuelle', EvolutionMensuelle),
            ('EvolutionDetaillee', EvolutionDetaillee),
            ('RepartitionGeographique', RepartitionGeographique),
            ('ActiviteTempsReel', ActiviteTempsReel),
        ]

        total_deleted = 0
        for label, model in models_to_purge:
            count = model.objects.count()
            model.objects.all().delete()
            total_deleted += count
            self.stdout.write(self.style.SUCCESS(f'- {label}: {count} enregistrements supprimés'))

        self.stdout.write(self.style.SUCCESS(f'✓ Purge terminée. Total supprimé: {total_deleted}'))


