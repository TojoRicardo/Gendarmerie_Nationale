"""
Commande Django pour créer un compte administrateur
"""
import getpass
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée un compte administrateur système'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin', help='Username (défaut: admin)')
        parser.add_argument('--email', type=str, required=True, help='Email de l\'administrateur')
        parser.add_argument('--password', type=str, help='Mot de passe (sera demandé si non fourni)')
        parser.add_argument('--nom', type=str, default='Admin', help='Nom (défaut: Admin)')
        parser.add_argument('--prenom', type=str, default='Système', help='Prénom (défaut: Système)')
        parser.add_argument('--grade', type=str, default='Colonel', help='Grade (défaut: Colonel)')
        parser.add_argument('--matricule', type=str, default='ADM001', help='Matricule (défaut: ADM001)')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options.get('password')

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'L\'utilisateur "{username}" existe déjà.'))
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'L\'email "{email}" est déjà utilisé.'))
            return

        if not password:
            password = getpass.getpass('Mot de passe: ')
            password_confirm = getpass.getpass('Confirmer le mot de passe: ')
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Les mots de passe ne correspondent pas.'))
                return

        if len(password) < 8:
            self.stdout.write(self.style.ERROR('Le mot de passe doit contenir au moins 8 caractères.'))
            return

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='Administrateur Système',
                nom=options['nom'],
                prenom=options['prenom'],
                grade=options['grade'],
                matricule=options['matricule'],
                is_superuser=True,
                is_staff=True,
                statut='actif',
            )
            self.stdout.write(self.style.SUCCESS('Compte administrateur créé avec succès!'))
            self.stdout.write(f'  Username : {user.username}')
            self.stdout.write(f'  Email    : {user.email}')
            self.stdout.write('  Role     : Administrateur Système')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erreur: {str(e)}'))
