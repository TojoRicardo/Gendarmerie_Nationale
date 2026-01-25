"""
Commande de management pour assigner un statut par défaut aux fiches qui n'en ont pas
"""
from django.core.management.base import BaseCommand
from criminel.models import CriminalFicheCriminelle, RefStatutFiche


class Command(BaseCommand):
    help = 'Assigne un statut par défaut "en_cours" aux fiches criminelles qui n\'ont pas de statut'

    def add_arguments(self, parser):
        parser.add_argument(
            '--statut',
            type=str,
            default='en_cours',
            help='Code du statut à assigner par défaut (défaut: en_cours)',
        )

    def handle(self, *args, **options):
        statut_code = options['statut']
        
        self.stdout.write(self.style.SUCCESS(f'Assignation du statut "{statut_code}" aux fiches sans statut...\n'))
        
        try:
            statut = RefStatutFiche.objects.get(code=statut_code)
        except RefStatutFiche.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Le statut "{statut_code}" n\'existe pas.'))
            self.stdout.write(self.style.NOTICE('Statuts disponibles:'))
            for s in RefStatutFiche.objects.all():
                self.stdout.write(self.style.NOTICE(f'  - {s.code}: {s.libelle}'))
            return
        
        # Récupérer les fiches actives sans statut
        fiches_sans_statut = CriminalFicheCriminelle.objects.filter(
            is_archived=False,
            statut_fiche__isnull=True
        )
        
        count = fiches_sans_statut.count()
        
        if count == 0:
            self.stdout.write(self.style.NOTICE('Aucune fiche sans statut trouvée.'))
            return
        
        # Assigner le statut
        updated = fiches_sans_statut.update(statut_fiche=statut)
        
        self.stdout.write(self.style.SUCCESS(f'✅ {updated} fiche(s) mise(s) à jour avec le statut "{statut.libelle}".'))
        
        # Afficher un résumé
        self.stdout.write(self.style.NOTICE('\nRésumé des statuts:'))
        for s in RefStatutFiche.objects.filter(actif=True):
            count = CriminalFicheCriminelle.objects.filter(
                is_archived=False,
                statut_fiche=s
            ).count()
            self.stdout.write(self.style.NOTICE(f'  - {s.libelle}: {count} fiche(s)'))

