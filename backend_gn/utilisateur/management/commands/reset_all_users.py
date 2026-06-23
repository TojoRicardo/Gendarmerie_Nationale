"""
Supprime tous les utilisateurs et recree un jeu de comptes demo avec PIN.
Usage: python manage.py reset_all_users --confirm
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from utilisateur.pin_utils import set_user_pin

User = get_user_model()

NEW_USERS = [
    {
        'username': 'admin',
        'email': 'admin@gendarmerie.dz',
        'password': 'Admin123!',
        'pin': '847291',
        'role': 'Administrateur Système',
        'nom': 'Admin',
        'prenom': 'Système',
        'matricule': 'ADM001',
        'grade': 'Colonel',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'username': 'enqueteur1',
        'email': 'enqueteur@gendarmerie.dz',
        'password': 'Enqueteur123!',
        'pin': '563847',
        'role': 'Enquêteur Principal',
        'nom': 'Rakoto',
        'prenom': 'Jean',
        'matricule': 'ENQ001',
        'grade': 'Capitaine',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'enqueteur2',
        'email': 'enqueteur2@gendarmerie.dz',
        'password': 'Enqueteur2123!',
        'pin': '928374',
        'role': 'Enquêteur',
        'nom': 'Rabe',
        'prenom': 'Paul',
        'matricule': 'ENQ002',
        'grade': 'Lieutenant',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'analyste1',
        'email': 'analyste@gendarmerie.dz',
        'password': 'Analyste123!',
        'pin': '475829',
        'role': 'Analyste',
        'nom': 'Andria',
        'prenom': 'Marie',
        'matricule': 'ANA001',
        'grade': 'Adjudant',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'observateur1',
        'email': 'observateur@gendarmerie.dz',
        'password': 'Observateur123!',
        'pin': '638475',
        'role': 'Observateur',
        'nom': 'Rasoa',
        'prenom': 'Luc',
        'matricule': 'OBS001',
        'grade': 'Gendarme',
        'is_staff': False,
        'is_superuser': False,
    },
]


class Command(BaseCommand):
    help = 'Supprime tous les utilisateurs et recree des comptes demo avec email, mot de passe et PIN'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression de TOUS les utilisateurs',
        )

    def _delete_all_users(self):
        user_ids = list(User.objects.values_list('id', flat=True))
        if not user_ids:
            return 0

        table_name = User._meta.db_table
        user_owned = [
            'utilisateur_pinauditlog',
            'utilisateur_userprofile',
            'utilisateur_usermfa',
            'utilisateur_utilisateurmodel_groups',
            'utilisateur_utilisateurmodel_user_permissions',
            'token_blacklist_blacklistedtoken',
            'token_blacklist_outstandingtoken',
            'authtoken_token',
            'audit_journalauditnarratif',
            'audit_journal_audit_narratif',
            'audit_usersession',
        ]

        with transaction.atomic():
            with connection.cursor() as cursor:
                for tbl in user_owned:
                    try:
                        cursor.execute(f'DELETE FROM "{tbl}"')
                    except Exception:
                        pass

                cursor.execute("SET session_replication_role = 'replica'")
                try:
                    cursor.execute(f'DELETE FROM "{table_name}"')
                    deleted = cursor.rowcount
                finally:
                    cursor.execute("SET session_replication_role = 'origin'")

        return deleted

    def handle(self, *args, **options):
        if not options.get('confirm'):
            raise CommandError(
                'Action destructive. Relancez avec --confirm pour supprimer tous les utilisateurs.'
            )

        count_before = User.objects.count()
        self.stdout.write(self.style.WARNING(f'Suppression de {count_before} utilisateur(s)...'))
        deleted = self._delete_all_users()
        self.stdout.write(self.style.SUCCESS(f'{deleted} utilisateur(s) supprime(s).'))

        self.stdout.write(self.style.WARNING('Creation des nouveaux comptes...'))
        created = []

        for spec in NEW_USERS:
            user = User.objects.create_user(
                username=spec['username'],
                email=spec['email'],
                password=spec['password'],
                role=spec['role'],
                nom=spec['nom'],
                prenom=spec['prenom'],
                matricule=spec['matricule'],
                grade=spec['grade'],
                statut='actif',
                is_active=True,
                is_staff=spec['is_staff'],
                is_superuser=spec['is_superuser'],
            )
            set_user_pin(user, spec['pin'])
            created.append(spec)
            self.stdout.write(self.style.SUCCESS(f'  + {spec["email"]} ({spec["role"]})'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 72))
        self.stdout.write(self.style.SUCCESS('COMPTES CREES - CONSERVEZ CES IDENTIFIANTS'))
        self.stdout.write(self.style.SUCCESS('=' * 72))
        for spec in created:
            self.stdout.write(f"Role       : {spec['role']}")
            self.stdout.write(f"Email      : {spec['email']}")
            self.stdout.write(f"Username   : {spec['username']}")
            self.stdout.write(f"Mot de passe : {spec['password']}")
            self.stdout.write(f"PIN (6 chiffres) : {spec['pin']}")
            self.stdout.write('-' * 72)

        self.stdout.write(self.style.SUCCESS(f'\nTotal: {len(created)} comptes crees avec PIN actif.'))
