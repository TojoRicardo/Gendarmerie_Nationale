#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import socket


def is_port_available(host, port):
    """Vérifie si un port est disponible."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex((host, port))
            return result != 0  # Port disponible si connexion échoue
    except Exception:
        return False


def find_available_port(start_port=8000, max_attempts=20, allow_reserved=False):
    """Trouve un port disponible en commençant par start_port.
    Évite les ports réservés par Windows (7901-8100) sauf si allow_reserved=True.
    """
    host = '127.0.0.1'
    
    reserved_ports = set(range(7901, 8101))  # 7901-8100
    
    # Si on demande le port 8000 spécifiquement, l'autoriser même s'il est dans la plage réservée
    if start_port == 8000 and allow_reserved:
        if is_port_available(host, 8000):
            return 8000
        if is_port_available(host, 8101):
            return 8101
    
    for i in range(max_attempts):
        port = start_port + i
        
        # Ignorer les ports réservés sauf si explicitement autorisé
        if port in reserved_ports and not allow_reserved:
            continue
            
        if is_port_available(host, port):
            return port
    
    # Si aucun port n'est trouvé dans la plage, essayer des ports alternatifs
    alternative_ports = [8101, 8080, 5000, 9000, 7000, 6000]  # 8101 en premier (juste après la plage réservée)
    for port in alternative_ports:
        if (port not in reserved_ports or allow_reserved) and is_port_available(host, port):
            return port
    
    # Dernier recours : retourner un port élevé
    return 9000


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_gn.settings')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    # Intercepter la commande runserver pour gérer automatiquement le port
    if len(sys.argv) >= 2 and sys.argv[1] == 'runserver':
        # Vérifier si un port est déjà spécifié
        port_specified = False
        port_index = -1
        
        for i, arg in enumerate(sys.argv[2:], start=2):
            if ':' in arg:
                port_specified = True
                port_index = i
                break
            elif arg.isdigit() and i == 2:
                # Si c'est juste un nombre en deuxième position, c'est probablement un port
                port_specified = True
                port_index = i
                break
        
        # Si aucun port n'est spécifié, trouver un port disponible
        if not port_specified:
            # Autoriser le port 8000 même s'il est dans la plage réservée Windows
            default_port = 8000
            available_port = find_available_port(default_port, allow_reserved=True)
            
            # Construire la nouvelle commande avec le port trouvé
            new_args = sys.argv[:]
            new_args.insert(2, f'127.0.0.1:{available_port}')
            sys.argv = new_args
            
            # Les messages d'avertissement sur les ports ont été supprimés
            # Le serveur utilise automatiquement un port disponible
        else:
            # Port spécifié, vérifier s'il est disponible et non réservé
            port_arg = sys.argv[port_index]
            
            if ':' in port_arg:
                host, port_str = port_arg.split(':')
            else:
                # Format juste le numéro de port
                host = '127.0.0.1'
                port_str = port_arg
            
            try:
                port = int(port_str)
                # Vérifier si le port est dans la plage réservée Windows
                # Exception : autoriser le port 8000 même s'il est dans la plage réservée
                if 7901 <= port <= 8100 and port != 8000:
                    available_port = find_available_port(8101)  # Utiliser 8101 (juste après la plage réservée)
                    sys.argv[port_index] = f'{host}:{available_port}'
                elif port == 8000:
                    # Port 8000 demandé explicitement, vérifier s'il est disponible
                    if not is_port_available(host, 8000):
                        # Si 8000 n'est pas disponible, essayer 8101
                        available_port = find_available_port(8101)
                        sys.argv[port_index] = f'{host}:{available_port}'
                elif not is_port_available(host, port):
                    # Port déjà utilisé, chercher un port disponible
                    next_port = port + 1
                    if 7901 <= next_port <= 8100:
                        next_port = 8101
                    available_port = find_available_port(next_port)
                    sys.argv[port_index] = f'{host}:{available_port}'
                else:
                    # Port valide, s'assurer qu'il est au format host:port
                    if ':' not in port_arg:
                        sys.argv[port_index] = f'{host}:{port}'
            except ValueError:
                # Si ce n'est pas un nombre, laisser Django gérer l'erreur
                pass
        
        # Exécuter la commande
        try:
            execute_from_command_line(sys.argv)
        except OSError as e:
            if "permission" in str(e).lower() or "access" in str(e).lower():
                # Si erreur de permission, essayer un autre port silencieusement
                # Extraire le port actuel
                current_port = 8000
                for arg in sys.argv[2:]:
                    if ':' in arg:
                        try:
                            current_port = int(arg.split(':')[-1])
                            break
                        except:
                            pass
                
                # Trouver un nouveau port
                new_port = find_available_port(8000)
                if new_port == current_port:
                    new_port = find_available_port(8080)
                
                # Reconstruire la commande avec le nouveau port
                new_args = [sys.argv[0], sys.argv[1], f'127.0.0.1:{new_port}']
                sys.argv = new_args
                
                # Réessayer silencieusement avec le nouveau port
                execute_from_command_line(sys.argv)
            else:
                raise
    else:
        # Pour toutes les autres commandes, exécuter normalement
        execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
