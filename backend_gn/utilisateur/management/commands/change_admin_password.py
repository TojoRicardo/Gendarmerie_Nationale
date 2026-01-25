"""
Commande Django pour changer le mot de passe de l'administrateur
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Change le mot de passe de l\'administrateur'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Modification/Creation du mot de passe administrateur...'))
        
        try:
            # Récupérer ou créer l'utilisateur admin
            admin_user, created = User.objects.get_or_create(
                username='Ricardo',
                defaults={
                    'email': 'admin@gendarmerie.dz',
                    'role': 'Administrateur Système',
                    'nom': 'Admin',
                    'prenom': 'Système',
                    'grade': 'Colonel',
                    'matricule': 'ADM001',
                    'is_superuser': True,
                    'is_staff': True,
                    'statut': 'actif'
                }
            )
            
            # Changer le mot de passe
            new_password = '130905'
            admin_user.set_password(new_password)
            admin_user.save()
            
            if created:
                self.stdout.write(self.style.SUCCESS('Utilisateur administrateur cree avec succes!'))
            else:
                self.stdout.write(self.style.SUCCESS('Mot de passe administrateur modifie avec succes!'))
            
            self.stdout.write(self.style.SUCCESS(f'   Username: Ricardo'))
            self.stdout.write(self.style.SUCCESS(f'   Email: admin@gendarmerie.dz'))
            self.stdout.write(self.style.SUCCESS(f'   Nouveau mot de passe: {new_password}'))
            self.stdout.write(self.style.WARNING('\nImportant: Changez ce mot de passe apres la premiere connexion pour plus de securite.'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erreur lors de la modification: {str(e)}'))

