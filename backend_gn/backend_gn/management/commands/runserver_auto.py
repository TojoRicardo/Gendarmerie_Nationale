"""
Commande Django personnalisée pour démarrer le serveur sur un port disponible automatiquement.
Usage: python manage.py runserver_auto
"""
import socket
from django.core.management.commands.runserver import Command as RunserverCommand
from django.core.management.color import color_style


class Command(RunserverCommand):
    help = 'Démarre le serveur de développement sur un port disponible automatiquement'

    def is_port_available(self, host, port):
        """Vérifie si un port est disponible."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex((host, port))
                return result != 0  # Port disponible si connexion échoue
        except Exception:
            return False

    def find_available_port(self, start_port=8000, max_attempts=10):
        """Trouve un port disponible en commençant par start_port."""
        host = '127.0.0.1'
        
        for i in range(max_attempts):
            port = start_port + i
            if self.is_port_available(host, port):
                return port
        
        # Si aucun port n'est trouvé, retourner le dernier essayé
        return start_port + max_attempts - 1

    def add_arguments(self, parser):
        """Ajoute des arguments personnalisés."""
        super().add_arguments(parser)
        parser.add_argument(
            '--start-port',
            type=int,
            default=8000,
            help='Port de départ pour la recherche (défaut: 8000)',
        )

    def handle(self, *args, **options):
        """Gère la commande avec détection automatique du port."""
        style = color_style()
        
        # Récupérer le port de départ
        start_port = options.get('start_port', 8000)
        
        # Si aucun port n'est spécifié dans addrport, trouver un port disponible
        if not options.get('addrport'):
            available_port = self.find_available_port(start_port)
            
            if available_port != start_port:
                self.stdout.write(
                    style.WARNING(
                        f'\n[ATTENTION]  Le port {start_port} n\'est pas disponible.\n'
                        f' Utilisation du port {available_port} à la place.\n'
                    )
                )
            else:
                self.stdout.write(
                    style.SUCCESS(f'\n[OK] Port {available_port} disponible.\n')
                )
            
            # Définir le port trouvé
            options['addrport'] = f'127.0.0.1:{available_port}'
        
        # Appeler la méthode parente pour démarrer le serveur
        super().handle(*args, **options)
        
        # Afficher le message de succès après le démarrage
        if options.get('addrport'):
            addrport = options['addrport']
            if ':' in addrport:
                parts = addrport.split(':')
                host = parts[0] if len(parts) > 1 else '127.0.0.1'
                port = parts[-1]
                self.stdout.write(
                    style.SUCCESS(
                        f'\n[OK] Serveur démarré avec succès sur http://{host}:{port}\n'
                    )
                )

