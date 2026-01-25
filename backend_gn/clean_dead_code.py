"""
Script pour nettoyer le code mort et les commentaires encadrés
"""

import os
import re
from pathlib import Path
from typing import List, Tuple


def find_commented_blocks(content: str) -> List[Tuple[int, int, str]]:
    """
    Trouve les blocs de code commentés encadrés (ex: ##########)
    Retourne une liste de tuples (start_line, end_line, block_type)
    """
    commented_blocks = []
    lines = content.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Détecter les lignes de séparation avec # (ex: ########## ou # =====)
        if re.match(r'^#+\s*$', stripped) or re.match(r'^#+\s*=+\s*$', stripped):
            # Chercher la fin du bloc encadré
            block_start = i
            j = i + 1
            
            # Chercher la ligne de fin (autre ligne de séparation)
            while j < len(lines):
                next_stripped = lines[j].strip()
                # Fin du bloc si on trouve une autre ligne de séparation
                if re.match(r'^#+\s*$', next_stripped) or re.match(r'^#+\s*=+\s*$', next_stripped):
                    # Vérifier que c'est bien un bloc encadré (au moins 3 lignes)
                    if j > block_start + 2:
                        # Vérifier que toutes les lignes entre sont commentées
                        all_commented = True
                        for k in range(block_start + 1, j):
                            if lines[k].strip() and not lines[k].strip().startswith('#'):
                                all_commented = False
                                break
                        
                        if all_commented:
                            commented_blocks.append((block_start, j, 'encadre'))
                            i = j + 1
                            continue
                    break
                j += 1
        
        # Détecter les blocs de code commenté (fonctions/classes entièrement commentées)
        if stripped.startswith('#') and re.search(r'^#\s*(def |class |import |from |if |for |while |try |except )', stripped):
            # Chercher la fin du bloc commenté
            block_start = i
            j = i + 1
            indent_level = len(line) - len(line.lstrip())
            
            while j < len(lines):
                next_line = lines[j]
                next_stripped = next_line.strip()
                
                # Si ligne vide commentée, continuer
                if not next_stripped or next_stripped.startswith('#'):
                    j += 1
                    continue
                
                # Si ligne non commentée avec même ou moins d'indentation, fin du bloc
                next_indent = len(next_line) - len(next_line.lstrip())
                if next_indent <= indent_level:
                    break
                j += 1
            
            # Si bloc de plus de 5 lignes, probablement du code mort
            if j > block_start + 5:
                commented_blocks.append((block_start, j - 1, 'code_commentee'))
            i = j
            continue
        
        i += 1
    
    return commented_blocks


def find_dead_code(content: str) -> List[Tuple[int, int, str]]:
    """
    Trouve le code mort (fonctions non utilisées, imports inutilisés, etc.)
    """
    dead_code = []
    lines = content.split('\n')
    
    # Pattern pour les fonctions/variables commentées
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Fonctions complètement commentées
        if re.match(r'^#\s*(def |class |import |from )', stripped):
            # Chercher la fin de la fonction/classe
            j = i + 1
            indent_level = len(line) - len(line.lstrip())
            while j < len(lines):
                next_line = lines[j]
                if next_line.strip() and not next_line.strip().startswith('#'):
                    next_indent = len(next_line) - len(next_line.lstrip())
                    if next_indent <= indent_level:
                        break
                j += 1
            if j > i + 1:
                dead_code.append((i, j - 1, 'fonction_commentee'))
    
    return dead_code


def clean_file(file_path: Path, dry_run: bool = True) -> Tuple[int, List[str]]:
    """
    Nettoie un fichier Python en supprimant le code mort
    Retourne (nombre_de_lignes_supprimees, liste_des_modifications)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return 0, [f"[ERROR] Erreur lecture: {e}"]
    
    original_lines = len(content.split('\n'))
    modifications = []
    lines = content.split('\n')
    
    # Trouver les blocs commentés
    commented_blocks = find_commented_blocks(content)
    dead_code_blocks = find_dead_code(content)
    
    # Combiner et trier par ligne de début (ordre décroissant pour supprimer de la fin)
    all_blocks = commented_blocks + dead_code_blocks
    all_blocks.sort(key=lambda x: x[0], reverse=True)
    
    if not all_blocks:
        return 0, []
    
    # Supprimer les blocs (de la fin vers le début pour préserver les indices)
    lines_to_remove = set()
    for start, end, block_type in all_blocks:
        for line_num in range(start, end + 1):
            lines_to_remove.add(line_num)
        modifications.append(
            f"  Lignes {start+1}-{end+1}: Bloc {block_type} ({end-start+1} lignes)"
        )
    
    if dry_run:
        return len(lines_to_remove), modifications
    
    # Créer le nouveau contenu sans les lignes à supprimer
    new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
    new_content = '\n'.join(new_lines)
    
    # Écrire le fichier nettoyé
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        lines_removed = original_lines - len(new_lines)
        return lines_removed, modifications
    except Exception as e:
        return 0, [f"[ERROR] Erreur ecriture: {e}"]


def find_python_files(directory: Path, exclude_dirs: List[str] = None) -> List[Path]:
    """Trouve tous les fichiers Python dans un répertoire"""
    if exclude_dirs is None:
        exclude_dirs = ['venv', '__pycache__', '.git', 'node_modules', 'migrations', 'staticfiles', 'media']
    
    python_files = []
    for root, dirs, files in os.walk(directory):
        # Exclure certains répertoires
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file.endswith('.py'):
                file_path = Path(root) / file
                python_files.append(file_path)
    
    return python_files


def main():
    """Fonction principale"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Nettoie le code mort et les commentaires encadrés'
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Applique réellement les suppressions (sinon mode dry-run)'
    )
    parser.add_argument(
        '--path',
        type=str,
        default='.',
        help='Répertoire à nettoyer (défaut: répertoire courant)'
    )
    parser.add_argument(
        '--app',
        type=str,
        help='Nettoyer uniquement une app spécifique (ex: enquete)'
    )
    
    args = parser.parse_args()
    
    base_dir = Path(args.path).resolve()
    if args.app:
        target_dir = base_dir / args.app
        if not target_dir.exists():
            print(f"[ERROR] Le repertoire {target_dir} n'existe pas.")
            return
    else:
        target_dir = base_dir
    
    print("\n" + "="*70)
    print("NETTOYAGE DU CODE MORT")
    print("="*70)
    
    dry_run = not args.apply
    if dry_run:
        print("\n[WARNING] MODE DRY-RUN - Aucune modification ne sera effectuee")
        print("   Utilisez --apply pour appliquer les changements\n")
    
    # Trouver tous les fichiers Python
    python_files = find_python_files(target_dir)
    
    print(f"\n[INFO] {len(python_files)} fichier(s) Python trouve(s)\n")
    
    total_lines_removed = 0
    files_modified = 0
    
    for file_path in python_files:
        lines_removed, modifications = clean_file(file_path, dry_run=dry_run)
        
        if modifications:
            print(f"\n[FILE] {file_path.relative_to(base_dir)}")
            for mod in modifications:
                print(mod)
            total_lines_removed += lines_removed
            files_modified += 1
    
    print("\n" + "="*70)
    if files_modified > 0:
        print(f"[OK] {files_modified} fichier(s) modifie(s)")
        print(f"[OK] {total_lines_removed} ligne(s) supprimee(s)")
    else:
        print("[OK] Aucun code mort trouve")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
