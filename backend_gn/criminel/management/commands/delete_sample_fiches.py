"""
Script de suppression des fiches criminelles de démonstration
"""
from django.core.management.base import BaseCommand
from criminel.models import (
    CriminalFicheCriminelle,
    CriminalInfraction,
    CriminalTypeInfraction
)


class Command(BaseCommand):
    help = 'Supprimer toutes les fiches criminelles de demonstration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Supprimer TOUTES les fiches criminelles (y compris les vraies)',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression sans demander',
        )

    def handle(self, *args, **options):
        delete_all = options['all']
        confirm = options['confirm']
        
        # Compter les fiches
        total_fiches = CriminalFicheCriminelle.objects.count()
        total_infractions = CriminalInfraction.objects.count()
        
        if total_fiches == 0:
            self.stdout.write(self.style.SUCCESS('Aucune fiche criminelle a supprimer.'))
            return
        
        # Afficher les statistiques
        self.stdout.write(self.style.WARNING(f'\nStatistiques actuelles:'))
        self.stdout.write(f'  - Fiches criminelles: {total_fiches}')
        self.stdout.write(f'  - Infractions: {total_infractions}')
        
        # Demander confirmation
        if not confirm:
            self.stdout.write(self.style.WARNING(f'\nATTENTION: Cette operation va supprimer:'))
            self.stdout.write(f'  - {total_fiches} fiche(s) criminelle(s)')
            self.stdout.write(f'  - {total_infractions} infraction(s)')
            
            reponse = input('\nEtes-vous sur de vouloir continuer? (oui/non): ')
            if reponse.lower() not in ['oui', 'yes', 'o', 'y']:
                self.stdout.write(self.style.ERROR('Operation annulee.'))
                return
        
        self.stdout.write('\nSuppression des infractions...')
        infractions_supprimees = CriminalInfraction.objects.all().delete()[0]
        
        # Supprimer les fiches
        self.stdout.write('Suppression des fiches criminelles...')
        fiches_supprimees = CriminalFicheCriminelle.objects.all().delete()[0]
        
        # Confirmation
        self.stdout.write(self.style.SUCCESS(f'\nSuppression terminee:'))
        self.stdout.write(f'  - {fiches_supprimees} fiche(s) criminelle(s) supprimee(s)')
        self.stdout.write(f'  - {infractions_supprimees} infraction(s) supprimee(s)')
        
        # Afficher les nouvelles statistiques
        nouveau_total = CriminalFicheCriminelle.objects.count()
        self.stdout.write(self.style.SUCCESS(f'\nNouveau total: {nouveau_total} fiche(s)'))

