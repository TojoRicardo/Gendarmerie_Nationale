from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from criminel.models import CriminalFicheCriminelle
from sgic_statistics.models import CriminalCase


class Command(BaseCommand):
    help = "Importe les fiches criminelles existantes vers CriminalCase"

    def handle(self, *args, **options):
        fiches = CriminalFicheCriminelle.objects.all()
        created = 0

        for fiche in fiches:
            if not fiche.province:
                continue

            obj, was_created = CriminalCase.objects.get_or_create(
                province=fiche.province,
                date_created=fiche.date_creation or timezone.now().date(),
                defaults={
                    'status': 'closed' if fiche.statut == 'Clôturée' else 'open',
                    'created_by': getattr(fiche, 'created_by', None),
                },
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"{created} dossiers importés."))

