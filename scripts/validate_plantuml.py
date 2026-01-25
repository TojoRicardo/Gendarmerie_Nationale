#!/usr/bin/env python3
"""
Script pour valider la syntaxe des diagrammes PlantUML
"""

import re
import os
import sys
from pathlib import Path

def validate_plantuml_syntax(code):
    """Valide la syntaxe de base d'un diagramme PlantUML"""
    errors = []
    warnings = []
    
    # Vérifier que le code commence par @startuml
    if not code.strip().startswith('@startuml'):
        errors.append("Le diagramme doit commencer par @startuml")
    
    # Vérifier que le code se termine par @enduml
    if not code.strip().endswith('@enduml'):
        errors.append("Le diagramme doit se terminer par @enduml")
    
    # Vérifier les balises @startuml/@enduml
    start_count = code.count('@startuml')
    end_count = code.count('@enduml')
    
    if start_count != 1:
        errors.append(f"Trouvé {start_count} @startuml, devrait être 1")
    
    if end_count != 1:
        errors.append(f"Trouvé {end_count} @enduml, devrait être 1")
    
    # Vérifier les participants dans les diagrammes de séquence
    if 'participant' in code or 'actor' in code:
        # Vérifier qu'il y a au moins un participant ou actor
        if 'participant' not in code and 'actor' not in code:
            warnings.append("Diagramme de séquence sans participant ou actor")
    
    # Vérifier les classes dans les diagrammes de classe
    if 'class ' in code:
        # Vérifier la syntaxe de base des classes
        class_pattern = r'class\s+\w+\s*\{'
        classes = re.findall(class_pattern, code)
        if not classes:
            warnings.append("Définition de classe trouvée mais syntaxe peut être incorrecte")
    
    # Vérifier les relations
    relation_patterns = [
        r'-->', r'->', r'..>', r'--', r'..',
        r'\*--', r'o--', r'<\|--', r'--\|>'
    ]
    has_relations = any(re.search(pattern, code) for pattern in relation_patterns)
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

def check_all_diagrams():
    """Vérifie tous les diagrammes PlantUML"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    puml_dir = project_root / 'diagrams' / 'plantuml'
    
    if not puml_dir.exists():
        print("ERREUR: Dossier plantuml/ introuvable")
        return
    
    puml_files = sorted(puml_dir.glob('*.puml'))
    
    if not puml_files:
        print("Aucun fichier .puml trouve")
        return
    
    print(f"Validation de {len(puml_files)} diagramme(s) PlantUML...")
    print("=" * 80)
    
    all_valid = True
    total_errors = 0
    total_warnings = 0
    
    for puml_file in puml_files:
        print(f"\n📄 {puml_file.name}")
        print("-" * 80)
        
        try:
            with open(puml_file, 'r', encoding='utf-8') as f:
                code = f.read()
            
            result = validate_plantuml_syntax(code)
            
            if result['valid']:
                print("✅ Syntaxe valide")
            else:
                all_valid = False
                print("❌ ERREURS DE SYNTAXE:")
                for error in result['errors']:
                    print(f"   - {error}")
                    total_errors += 1
            
            if result['warnings']:
                print("⚠️  AVERTISSEMENTS:")
                for warning in result['warnings']:
                    print(f"   - {warning}")
                    total_warnings += 1
            
        except Exception as e:
            print(f"❌ ERREUR lors de la lecture: {e}")
            all_valid = False
            total_errors += 1
    
    print("\n" + "=" * 80)
    print("RÉSUMÉ DE LA VALIDATION")
    print("=" * 80)
    print(f"Diagrammes valides: {len(puml_files) - total_errors}/{len(puml_files)}")
    print(f"Erreurs totales: {total_errors}")
    print(f"Avertissements: {total_warnings}")
    
    if all_valid:
        print("\n✅ TOUS LES DIAGRAMMES SONT VALIDES!")
    else:
        print("\n❌ CERTAINS DIAGRAMMES ONT DES ERREURS")
    
    return all_valid

if __name__ == '__main__':
    # Configurer l'encodage UTF-8 pour Windows
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    check_all_diagrams()

