"""
Script de nettoyage complet du projet Django.
Supprime les fichiers temporaires, cache, et vérifie les conflits.
"""

import os
import shutil
import glob
from pathlib import Path

def nettoyer_pycache():
    """Supprime tous les dossiers __pycache__"""
    print("Suppression des dossiers __pycache__...")
    count = 0
    for root, dirs, files in os.walk('.'):
        if '__pycache__' in dirs:
            pycache_path = os.path.join(root, '__pycache__')
            try:
                shutil.rmtree(pycache_path)
                count += 1
                print(f"  OK: {pycache_path}")
            except Exception as e:
                print(f"  Erreur: {pycache_path} - {e}")
    print(f"[OK] {count} dossiers __pycache__ supprimes\n")
    return count

def nettoyer_pyc_files():
    """Supprime tous les fichiers .pyc"""
    print("Suppression des fichiers .pyc...")
    count = 0
    for pyc_file in glob.glob('**/*.pyc', recursive=True):
        try:
            os.remove(pyc_file)
            count += 1
        except Exception as e:
            print(f"  Erreur: {pyc_file} - {e}")
    print(f"[OK] {count} fichiers .pyc supprimes\n")
    return count

def nettoyer_migrations_pycache():
    """Supprime les __pycache__ dans les migrations"""
    print("Nettoyage des migrations...")
    count = 0
    for migrations_dir in glob.glob('**/migrations/__pycache__', recursive=True):
        try:
            shutil.rmtree(migrations_dir)
            count += 1
            print(f"  OK: {migrations_dir}")
        except Exception as e:
            print(f"  Erreur: {migrations_dir} - {e}")
    print(f"[OK] {count} caches de migrations supprimes\n")
    return count

def nettoyer_fichiers_temp():
    """Supprime les fichiers temporaires courants"""
    print("Suppression des fichiers temporaires...")
    patterns = [
        '**/*.pyc',
        '**/*.pyo',
        '**/*.log',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.swp',
        '**/*.swo',
        '**/*~',
    ]
    count = 0
    for pattern in patterns:
        for file_path in glob.glob(pattern, recursive=True):
            # Ne pas supprimer les fichiers dans venv
            if 'venv' not in file_path and '.git' not in file_path and '__pycache__' not in file_path:
                try:
                    os.remove(file_path)
                    count += 1
                except Exception as e:
                    pass
    print(f"[OK] Fichiers temporaires nettoyes\n")
    return count

def verifier_migrations():
    """Verifie l'integrite des migrations"""
    print("Verification des migrations...")
    
    migrations_audit = []
    for f in glob.glob('audit/migrations/0*.py'):
        if '__init__' not in f:
            num = f.split('_')[0].split(os.sep)[-1]
            try:
                migrations_audit.append(int(num))
            except ValueError:
                pass
    
    migrations_audit.sort()
    print(f"  Migrations audit trouvees: {migrations_audit}")
    
    # Verifier les numeros manquants
    if migrations_audit:
        premier = migrations_audit[0]
        dernier = migrations_audit[-1]
        manquantes = []
        for i in range(premier, dernier + 1):
            if i not in migrations_audit:
                manquantes.append(i)
        
        if manquantes:
            print(f"  [INFO] Migrations manquantes (pas critique): {manquantes}")
        else:
            print(f"  [OK] Toutes les migrations sont presentes")
    
    print()
    return True

def main():
    print("=" * 60)
    print("NETTOYAGE COMPLET DU PROJET DJANGO")
    print("=" * 60)
    print()
    
    # Changer vers le répertoire du script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    total = 0
    total += nettoyer_pycache()
    total += nettoyer_pyc_files()
    total += nettoyer_migrations_pycache()
    total += nettoyer_fichiers_temp()
    verifier_migrations()
    
    print("=" * 60)
    print(f"NETTOYAGE TERMINE - {total} elements supprimes")
    print("=" * 60)

if __name__ == '__main__':
    main()

