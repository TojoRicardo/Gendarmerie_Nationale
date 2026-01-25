"""
Commande Django pour initialiser les permissions et créer des utilisateurs de test
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from utilisateur.permissions import ROLES_PREDEFINIS

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialise les permissions et crée des utilisateurs de test pour chaque rôle'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(' Initialisation du système de permissions...'))
        
        # Afficher les rôles disponibles
        self.stdout.write(self.style.WARNING('\n Rôles disponibles:'))
        for role_name, role_info in ROLES_PREDEFINIS.items():
            self.stdout.write(f'  - {role_name}: {len(role_info["permissions"])} permissions')
        
        # Créer des utilisateurs de test pour chaque rôle
        self.stdout.write(self.style.WARNING('\n Création des utilisateurs de test...'))
        
        test_users = [
            {
                'username': 'Ricardo',
                'email': 'admin@gendarmerie.dz',
                'password': '130905',
                'role': 'Administrateur Système',
                'nom': 'Admin',
                'prenom': 'Système',
                'grade': 'Colonel',
                'matricule': 'ADM001',
                'is_superuser': True,
                'is_staff': True,
            },
            {
                'username': 'enqueteur_principal1',
                'email': 'enqueteur.principal1@gendarmerie.dz',
                'password': 'Enqueteur123!',
                'role': 'Enquêteur Principal',
                'nom': 'Benali',
                'prenom': 'Ahmed',
                'grade': 'Capitaine',
                'matricule': 'ENQ001',
            },
            {
                'username': 'enqueteur_principal2',
                'email': 'enqueteur.principal2@gendarmerie.dz',
                'password': 'Enqueteur123!',
                'role': 'Enquêteur Principal',
                'nom': 'Meziane',
                'prenom': 'Fatima',
                'grade': 'Lieutenant',
                'matricule': 'ENQ002',
            },
            {
                'username': 'enqueteur',
                'email': 'enqueteur@gendarmerie.dz',
                'password': 'Enqueteur123!',
                'role': 'Enquêteur',
                'nom': 'Khelifa',
                'prenom': 'Youssef',
                'grade': 'Lieutenant',
                'matricule': 'ENQ003',
            },
            {
                'username': 'analyste',
                'email': 'analyste@gendarmerie.dz',
                'password': 'Analyste123!',
                'role': 'Analyste',
                'nom': 'Bouazza',
                'prenom': 'Samira',
                'grade': 'Ingénieur',
                'matricule': 'ANA001',
            },
            {
                'username': 'observateur',
                'email': 'observateur@gendarmerie.dz',
                'password': 'Observateur123!',
                'role': 'Observateur',
                'nom': 'Taleb',
                'prenom': 'Leila',
                'grade': 'Capitaine',
                'matricule': 'OBS001',
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for user_data in test_users:
            username = user_data.pop('username')
            email = user_data.pop('email')
            password = user_data.pop('password')
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={'email': email, **user_data}
            )
            
            if created:
                user.set_password(password)
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'   Créé: {username} ({user_data["role"]})')
                )
            else:
                # Mettre à jour le rôle et les infos si l'utilisateur existe déjà
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'  ℹ  Mis à jour: {username} ({user_data["role"]})')
                )
        
        # Résumé
        self.stdout.write(self.style.SUCCESS(f'\n Terminé!'))
        self.stdout.write(f'  - Utilisateurs créés: {created_count}')
        self.stdout.write(f'  - Utilisateurs mis à jour: {updated_count}')
        
        # Afficher les credentials
        self.stdout.write(self.style.WARNING('\n Identifiants de connexion:'))
        self.stdout.write(self.style.WARNING('' * 70))
        for user_data in test_users:
            self.stdout.write(
                f'  {user_data.get("role", "N/A"):25} | '
                f'{user_data.get("username", "N/A"):20} | '
                f'Password: [voir code]'
            )
        self.stdout.write(self.style.WARNING('' * 70))
        
        self.stdout.write(self.style.SUCCESS('\n Système de permissions initialisé avec succès!'))
        self.stdout.write(
            self.style.WARNING(
                '\n Pour tester, connectez-vous avec un des comptes ci-dessus.\n'
                '   Les permissions seront automatiquement appliquées selon le rôle.'
            )
        )

