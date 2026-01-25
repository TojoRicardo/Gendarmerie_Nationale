"""
Commande Django pour vérifier et marquer les utilisateurs inactifs
"""
from django.core.management.base import BaseCommand
from utilisateur.middleware import check_inactive_users


class Command(BaseCommand):
    help = 'Vérifie et marque les utilisateurs inactifs après 30 minutes d\'inactivité'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Verification des utilisateurs inactifs...'))
        
        try:
            result = check_inactive_users()
            
            self.stdout.write(self.style.SUCCESS(
                f'\nResultats:'
            ))
            self.stdout.write(f'   Utilisateurs verifies: {result["checked"]}')
            self.stdout.write(f'   Marques comme inactifs: {result["marked_inactive"]}')
            
            if result["marked_inactive"] > 0:
                self.stdout.write(self.style.SUCCESS(
                    f'\n{result["marked_inactive"]} utilisateur(s) marque(s) comme inactif(s)'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    '\nTous les utilisateurs actifs sont toujours actifs'
                ))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erreur: {str(e)}'))

