#!/usr/bin/env python3
"""
Script de vérification de la configuration du système multi-caméras
"""

import os
import sys
from pathlib import Path

def check_python_version():
    """Vérifie la version de Python"""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 10:
        print(f"[OK] Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"[ERREUR] Python {version.major}.{version.minor}.{version.micro} (3.10+ requis)")
        return False

def check_imports():
    """Vérifie les imports essentiels"""
    print("\nVérification des imports...")
    
    modules = {
        'cv2': 'opencv-python-headless',
        'insightface': 'insightface',
        'numpy': 'numpy',
        'requests': 'requests',
    }
    
    all_ok = True
    for module, package in modules.items():
        try:
            __import__(module)
            print(f"  [OK] {module}")
        except ImportError:
            print(f"  [ERREUR] {module} (installer: pip install {package})")
            all_ok = False
    
    return all_ok

def check_env_file():
    """Vérifie le fichier .env"""
    print("\nVérification de la configuration...")
    
    env_file = Path('.env')
    env_example = Path('env.example')
    
    if not env_file.exists():
        print("  [ATTENTION] Fichier .env non trouvé")
        if env_example.exists():
            print("  Copier env.example vers .env: cp env.example .env")
        return False
    
    print("  [OK] Fichier .env trouvé")
    
    # Charger et vérifier les variables essentielles
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = {
        'UPR_API_URL': 'http://localhost:8000/api',
        'UPR_API_KEY': None,  # Doit être défini mais pas de valeur par défaut
        'CAMERAS_USB_MAX': '6',
        'SIMILARITY_THRESHOLD': '0.55',
    }
    
    all_ok = True
    for var, default in required_vars.items():
        value = os.getenv(var, default)
        if value and value != 'change-me-to-secure-key':
            print(f"  [OK] {var}: {value[:50]}...")
        else:
            print(f"  [ATTENTION] {var}: Non configuré ou valeur par défaut")
            if var == 'UPR_API_KEY':
                all_ok = False
    
    return all_ok

def check_django_models():
    """Vérifie les modèles Django"""
    print("\nVérification des modèles Django...")
    
    try:
        # Ajouter le chemin backend
        backend_path = Path('../backend_gn')
        if backend_path.exists():
            sys.path.insert(0, str(backend_path))
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_gn.settings')
            
            import django
            django.setup()
            
            from upr.models import Camera, UPRLog
            print(f"  [OK] Modèle Camera: {Camera}")
            print(f"  [OK] Modèle UPRLog: {UPRLog}")
            
            # Vérifier si les tables existent
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sgic_%'")
                tables = [row[0] for row in cursor.fetchall()]
                
                if 'sgic_camera' in tables:
                    print("  [OK] Table sgic_camera existe")
                else:
                    print("  [ATTENTION] Table sgic_camera n'existe pas (exécuter: python manage.py migrate)")
                
                if 'sgic_uprlog' in tables:
                    print("  [OK] Table sgic_uprlog existe")
                else:
                    print("  [ATTENTION] Table sgic_uprlog n'existe pas (exécuter: python manage.py migrate)")
            
            return True
        else:
            print("  [ATTENTION] Dossier backend_gn non trouvé")
            return False
            
    except Exception as e:
        print(f"  [ERREUR] Erreur: {e}")
        return False

def check_cameras():
    """Vérifie l'accès aux caméras"""
    print("\nVérification des caméras...")
    
    try:
        import cv2
        
        usb_max = int(os.getenv('CAMERAS_USB_MAX', '6'))
        cameras_found = []
        
        for idx in range(min(usb_max, 4)):  # Tester max 4 pour rapidité
            cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    cameras_found.append(idx)
                    print(f"  [OK] Caméra USB {idx} détectée")
                cap.release()
        
        if cameras_found:
            print(f"  [OK] {len(cameras_found)} caméra(s) USB trouvée(s)")
        else:
            print("  [ATTENTION] Aucune caméra USB détectée (normal si pas de caméra connectée)")
        
        return True
    except ImportError:
        print("  [ATTENTION] OpenCV non disponible")
        return False
    except Exception as e:
        print(f"  [ATTENTION] Erreur: {e}")
        return False

def main():
    """Fonction principale"""
    print("Vérification de la configuration du système multi-caméras\n")
    print("=" * 60)
    
    results = {
        'Python': check_python_version(),
        'Imports': check_imports(),
        'Configuration': check_env_file(),
        'Django': check_django_models(),
        'Caméras': check_cameras(),
    }
    
    print("\n" + "=" * 60)
    print("Résumé:")
    
    all_ok = True
    for check, result in results.items():
        status = "[OK]" if result else "[ERREUR]"
        print(f"  {status} {check}")
        if not result:
            all_ok = False
    
    print("\n" + "=" * 60)
    
    if all_ok:
        print("[OK] Toutes les vérifications sont passées!")
        print("Vous pouvez maintenant lancer: python multi_camera_service/main.py")
    else:
        print("[ATTENTION] Certaines vérifications ont échoué")
        print("Consultez TROUBLESHOOTING.md pour plus d'aide")
    
    return 0 if all_ok else 1

if __name__ == '__main__':
    sys.exit(main())

