"""
Commande Django pour supprimer un utilisateur par email
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection, transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Supprime un utilisateur par email'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email de l\'utilisateur à supprimer'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force la suppression même avec des relations'
        )

    def handle(self, *args, **options):
        email = options['email']
        force = options.get('force', False)
        
        try:
            user = User.objects.get(email=email)
            
            # Afficher les informations de l'utilisateur avant suppression
            self.stdout.write(self.style.WARNING(f'\nUtilisateur trouvé:'))
            self.stdout.write(f'  ID: {user.id}')
            self.stdout.write(f'  Username: {user.username}')
            self.stdout.write(f'  Email: {user.email}')
            self.stdout.write(f'  Nom: {user.nom or "null"}')
            self.stdout.write(f'  Prénom: {user.prenom or "null"}')
            self.stdout.write(f'  Rôle: {user.role or "Aucun rôle"}')
            self.stdout.write(f'  Statut: {user.statut or "actif"}')
            
            username = user.username
            user_id = user.id
            
            if force:
                # Suppression SQL directe pour contourner les contraintes
                self.stdout.write(self.style.WARNING(f'\n⚠️  Suppression forcée en cours...'))
                
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        # Mettre à NULL les références dans les tables qui le permettent
                        # InvestigationAssignment
                        try:
                            cursor.execute(
                                "UPDATE investigation_assignment SET assigned_investigator_id = NULL WHERE assigned_investigator_id = %s",
                                [user_id]
                            )
                            cursor.execute(
                                "UPDATE investigation_assignment SET assigned_by_id = NULL WHERE assigned_by_id = %s",
                                [user_id]
                            )
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f'  Note: {e}'))
                        
                        # Supprimer l'utilisateur directement
                        # Utiliser le nom de table réel du modèle
                        table_name = User._meta.db_table
                        cursor.execute(
                            f"DELETE FROM {table_name} WHERE id = %s",
                            [user_id]
                        )
                        
                        # Supprimer aussi de la table auth_user si elle existe
                        try:
                            cursor.execute(
                                "DELETE FROM auth_user WHERE id = %s",
                                [user_id]
                            )
                        except Exception:
                            pass
                
                self.stdout.write(self.style.SUCCESS(f'\n✅ Utilisateur "{username}" ({email}) supprimé avec succès (mode forcé)!'))
            else:
                # Tentative de suppression normale
                self.stdout.write(self.style.WARNING(f'\n⚠️  ATTENTION: Cette action est irréversible!'))
                user.delete()
                self.stdout.write(self.style.SUCCESS(f'\n✅ Utilisateur "{username}" ({email}) supprimé avec succès!'))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'\n❌ Aucun utilisateur trouvé avec l\'email: {email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Erreur lors de la suppression: {e}'))
            self.stdout.write(self.style.WARNING(f'\n💡 Essayez avec --force pour forcer la suppression'))

