"""
Management command pour créer une notification de test pour les administrateurs
Usage: python manage.py creer_notif_admin
"""
from django.core.management.base import BaseCommand
from notification.utils import creer_notification_pour_role, creer_notification
from notification.models import Notification
from utilisateur.models import UtilisateurModel


class Command(BaseCommand):
    help = 'Crée une notification de test pour les administrateurs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--titre',
            type=str,
            default='Test de notification',
            help='Titre de la notification'
        )
        parser.add_argument(
            '--message',
            type=str,
            default='Votre système de notifications est maintenant actif ! ',
            help='Message de la notification'
        )
        parser.add_argument(
            '--type',
            type=str,
            default='success',
            choices=['info', 'success', 'warning', 'error'],
            help='Type de notification'
        )

    def handle(self, *args, **options):
        titre = options['titre']
        message = options['message']
        type_notif = options['type']

        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("CREATION DE NOTIFICATION POUR L'ADMIN"))
        self.stdout.write("="*60)

        try:
            # Créer des notifications pour tous les administrateurs
            self.stdout.write("\nEnvoi de notifications aux Administrateurs...")
            
            notifications = creer_notification_pour_role(
                role="Administrateur",
                titre=titre,
                message=message,
                type=type_notif,
                lien="/notifications"
            )
            
            self.stdout.write(self.style.SUCCESS(
                f"=> {len(notifications)} notification(s) creee(s)"
            ))
            
            for notif in notifications:
                email = notif.utilisateur.email or "pas d'email"
                self.stdout.write(
                    f"   -> Envoyee a: {notif.utilisateur.username} ({email})"
                )
            
            # Afficher les statistiques
            self.stdout.write("\nStatistiques des notifications:")
            admins = UtilisateurModel.objects.filter(role__icontains="admin")
            
            for admin in admins:
                notifs = Notification.objects.filter(utilisateur=admin)
                non_lues = notifs.filter(lue=False).count()
                
                self.stdout.write(f"\n   {admin.username}:")
                self.stdout.write(f"      - Total: {notifs.count()}")
                self.stdout.write(f"      - Non lues: {non_lues}")
                self.stdout.write(f"      - Lues: {notifs.count() - non_lues}")
                
                if non_lues > 0:
                    self.stdout.write("\n      Dernieres notifications non lues:")
                    for n in notifs.filter(lue=False).order_by('-date_creation')[:3]:
                        self.stdout.write(f"         - {n.titre}")
            
            self.stdout.write("\n" + "="*60)
            self.stdout.write(self.style.SUCCESS("TERMINE"))
            self.stdout.write("="*60)
            
            self.stdout.write("\nComment voir ces notifications:")
            self.stdout.write("   1. Frontend: http://localhost:3005/ -> Cliquez sur l'icone cloche")
            self.stdout.write("   2. Admin Django: http://localhost:8000/admin/Notification/notification/")
            self.stdout.write("   3. API: GET http://localhost:8000/api/notifications/")
            self.stdout.write("="*60 + "\n")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\nErreur: {e}"))
            import traceback
            traceback.print_exc()

