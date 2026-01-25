"""
Commande pour vérifier et nettoyer les rôles des utilisateurs
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from utilisateur.permissions import ROLES_PREDEFINIS

User = get_user_model()


class Command(BaseCommand):
    help = 'Vérifie les rôles des utilisateurs et les met à jour si nécessaire'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Corriger automatiquement les rôles invalides',
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='Lister tous les utilisateurs avec leurs rôles',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(' Vérification des rôles utilisateurs...\n'))

        # Rôles valides définis dans le système
        valid_roles = list(ROLES_PREDEFINIS.keys())
        
        # Afficher les rôles valides
        self.stdout.write(self.style.SUCCESS(' Rôles valides définis dans le système:'))
        for role in valid_roles:
            self.stdout.write(f'  - {role}')
        self.stdout.write('')

        # Récupérer tous les utilisateurs
        users = User.objects.all()
        
        if options['list']:
            self.stdout.write(self.style.SUCCESS(f'\n Liste des {users.count()} utilisateurs:\n'))
            for user in users:
                role_status = '' if user.role in valid_roles else ''
                self.stdout.write(f'{role_status} {user.email:40} | Rôle: {user.role or "NON DÉFINI"}')
            return

        # Statistiques
        roles_used = {}
        invalid_users = []
        users_without_role = []

        for user in users:
            if not user.role:
                users_without_role.append(user)
            elif user.role not in valid_roles:
                invalid_users.append(user)
                roles_used[user.role] = roles_used.get(user.role, 0) + 1
            else:
                roles_used[user.role] = roles_used.get(user.role, 0) + 1

        # Afficher les statistiques
        self.stdout.write(self.style.SUCCESS('\n Statistiques des rôles:'))
        for role, count in sorted(roles_used.items()):
            status = '' if role in valid_roles else ''
            self.stdout.write(f'{status} {role:30} : {count} utilisateur(s)')

        # Utilisateurs sans rôle
        if users_without_role:
            self.stdout.write(self.style.WARNING(f'\n  {len(users_without_role)} utilisateur(s) sans rôle défini:'))
            for user in users_without_role:
                self.stdout.write(f'  - {user.email}')

        # Utilisateurs avec rôles invalides
        if invalid_users:
            self.stdout.write(self.style.ERROR(f'\n {len(invalid_users)} utilisateur(s) avec rôle invalide:'))
            for user in invalid_users:
                self.stdout.write(f'  - {user.email} -> Rôle: "{user.role}"')

            # Proposer des corrections
            if options['fix']:
                self.stdout.write(self.style.WARNING('\n Correction des rôles invalides...'))
                
                # Mapping des corrections possibles
                role_mapping = {
                    'Administrateur': 'Administrateur Système',
                    'Enqueteur': 'Enquêteur',
                    'Enquêteur principal': 'Enquêteur Principal',
                    'Enquêteur junior': 'Enquêteur Junior',
                    'Observateur': 'Analyste',  # Ou un autre mapping selon votre besoin
                }

                for user in invalid_users:
                    old_role = user.role
                    new_role = role_mapping.get(old_role)
                    
                    if new_role:
                        user.role = new_role
                        user.save()
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'   {user.email}: "{old_role}" → "{new_role}"'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'    {user.email}: Aucune correction automatique pour "{old_role}"'
                            )
                        )
                        self.stdout.write(
                            self.style.WARNING(
                                f'     Suggestion: Attribuer manuellement un des rôles valides'
                            )
                        )
                
                # Corriger les utilisateurs sans rôle
                if users_without_role:
                    self.stdout.write(self.style.WARNING('\n Attribution de rôle par défaut...'))
                    for user in users_without_role:
                        # Attribuer "Enquêteur" par défaut aux utilisateurs sans rôle
                        user.role = 'Enquêteur'
                        user.save()
                        self.stdout.write(
                            self.style.SUCCESS(f'   {user.email}: Rôle "Enquêteur" attribué')
                        )

                self.stdout.write(self.style.SUCCESS('\n Corrections terminées!'))
            else:
                self.stdout.write(
                    self.style.WARNING(
                        '\n Utilisez --fix pour corriger automatiquement les rôles'
                    )
                )

        if not invalid_users and not users_without_role:
            self.stdout.write(self.style.SUCCESS('\n Tous les rôles sont valides!'))

