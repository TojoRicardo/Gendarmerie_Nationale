"""
Commande Django pour réinitialiser le mot de passe d'un utilisateur
Usage: python manage.py reset_user_password <email_ou_username> [nouveau_mot_de_passe]
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class Command(BaseCommand):
    help = 'Réinitialise le mot de passe d\'un utilisateur'

    def add_arguments(self, parser):
        parser.add_argument(
            'identifier',
            type=str,
            help='Email ou nom d\'utilisateur de l\'utilisateur'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Nouveau mot de passe (si non fourni, sera généré automatiquement)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forcer la réinitialisation même si l\'utilisateur est suspendu'
        )

    def handle(self, *args, **options):
        identifier = options['identifier']
        new_password = options.get('password')
        force = options.get('force', False)
        
        # Chercher l'utilisateur
        try:
            if '@' in identifier:
                user = User.objects.get(email__iexact=identifier)
            else:
                user = User.objects.get(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        except User.DoesNotExist:
            raise CommandError(f"Aucun utilisateur trouvé avec l'identifiant '{identifier}'")
        except User.MultipleObjectsReturned:
            users = User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier))
            self.stdout.write(self.style.WARNING(f"Plusieurs utilisateurs trouvés avec '{identifier}':"))
            for u in users:
                self.stdout.write(f"  - {u.username} ({u.email})")
            raise CommandError("Plusieurs utilisateurs trouvés. Utilisez l'email exact.")
        
        # Vérifier le statut de l'utilisateur
        if not force:
            if user.statut == 'suspendu':
                raise CommandError(f"L'utilisateur {user.username} est suspendu. Utilisez --force pour forcer la réinitialisation.")
            if not user.is_active:
                raise CommandError(f"L'utilisateur {user.username} est inactif. Utilisez --force pour forcer la réinitialisation.")
        
        # Générer un mot de passe si non fourni
        if not new_password:
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            new_password = ''.join(secrets.choice(alphabet) for i in range(12))
            self.stdout.write(self.style.WARNING(f"Mot de passe généré automatiquement: {new_password}"))
        
        # Réinitialiser le mot de passe
        user.set_password(new_password)
        user.save()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Mot de passe réinitialisé avec succès pour {user.username} ({user.email})'
            )
        )
        
        if not options.get('password'):
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️ IMPORTANT: Notez ce mot de passe, il ne sera plus affiché: {new_password}'
                )
            )

