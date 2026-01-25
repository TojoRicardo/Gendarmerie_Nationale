#!/usr/bin/env python3
"""
Script pour extraire et générer les diagrammes PlantUML depuis le fichier Markdown
"""

import re
import os
import sys
from pathlib import Path

def extract_plantuml_blocks(markdown_file):
    """Extrait tous les blocs PlantUML du fichier Markdown"""
    try:
        with open(markdown_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Erreur : Fichier '{markdown_file}' introuvable")
        return []
    
    # Pattern pour trouver les blocs PlantUML
    pattern = r'```plantuml\n(.*?)\n```'
    matches = re.findall(pattern, content, re.DOTALL)
    
    return matches

def save_plantuml_files(blocks, output_dir='diagrams/plantuml'):
    """Sauvegarde les blocs PlantUML dans des fichiers .puml"""
    os.makedirs(output_dir, exist_ok=True)
    
    saved_files = []
    for i, block in enumerate(blocks, 1):
        filename = os.path.join(output_dir, f'diagram_{i:02d}.puml')
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(block.strip())
        saved_files.append(filename)
        print(f"OK: Diagramme {i} sauvegarde : {filename}")
    
    return saved_files

def generate_html_preview(blocks, output_file='diagrams/preview.html'):
    """Génère un fichier HTML pour prévisualiser tous les diagrammes"""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prévisualisation des Diagrammes PlantUML</title>
    <script src="https://cdn.jsdelivr.net/npm/plantuml-encoder@1.4.0/dist/plantuml-encoder.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .diagram-container {
            background: white;
            margin: 20px 0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .diagram-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
        }
        .diagram-image {
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .code-block {
            background: #f8f8f8;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>📊 Diagrammes PlantUML - SGIC</h1>
"""
    
    for i, block in enumerate(blocks, 1):
        # Encoder le code PlantUML pour l'URL
        encoded = f"<script>document.write(plantumlEncoder.encode(`{block.strip()}`));</script>"
        
        html_content += f"""
    <div class="diagram-container">
        <div class="diagram-title">Diagramme {i}</div>
        <img class="diagram-image" 
             src="http://www.plantuml.com/plantuml/png/{encoded}" 
             alt="Diagramme {i}"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5EaWFncmFtbWUgUGxhbnRVTEwgeyBpIH08L3RleHQ+PC9zdmc+'">
        <details style="margin-top: 10px;">
            <summary style="cursor: pointer; color: #666;">📝 Voir le code</summary>
            <pre class="code-block">{block.strip()}</pre>
        </details>
    </div>
"""
    
    html_content += """
</body>
</html>
"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"OK: Fichier HTML genere : {output_file}")
    return output_file

def create_plantuml_online_links(blocks, output_file='diagrams/liens_plantuml.txt'):
    """Crée un fichier avec les liens vers PlantUML en ligne"""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("LIENS POUR VISUALISER LES DIAGRAMMES SUR PLANTUML EN LIGNE\n")
        f.write("=" * 80 + "\n\n")
        f.write("Instructions :\n")
        f.write("1. Allez sur : http://www.plantuml.com/plantuml/uml/\n")
        f.write("2. Copiez-collez le code correspondant ci-dessous\n")
        f.write("3. Le diagramme s'affichera automatiquement\n")
        f.write("4. Cliquez sur 'Download PNG' ou 'Download SVG' pour sauvegarder\n\n")
        f.write("=" * 80 + "\n\n")
        
        for i, block in enumerate(blocks, 1):
            f.write(f"\n{'='*80}\n")
            f.write(f"DIAGRAMME {i}\n")
            f.write(f"{'='*80}\n\n")
            f.write(block.strip())
            f.write("\n\n")
    
    print(f"OK: Fichier de liens cree : {output_file}")
    return output_file

def main():
    # Chemin du fichier Markdown
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    markdown_file = project_root / 'ANALYSE_PROJET_STAGE.md'
    
    if not markdown_file.exists():
        print(f"ERREUR: Fichier '{markdown_file}' introuvable")
        print(f"   Cherche dans : {markdown_file.absolute()}")
        sys.exit(1)
    
    # Configurer l'encodage UTF-8 pour la console Windows
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    print(f"Lecture du fichier : {markdown_file}")
    print("-" * 80)
    
    # Extraire les blocs PlantUML
    blocks = extract_plantuml_blocks(str(markdown_file))
    
    if not blocks:
        print("Aucun diagramme PlantUML trouve dans le fichier")
        sys.exit(0)
    
    print(f"OK: {len(blocks)} diagramme(s) PlantUML trouve(s)\n")
    
    # Créer le dossier de sortie
    output_dir = project_root / 'diagrams'
    output_dir.mkdir(exist_ok=True)
    
    # Sauvegarder les fichiers .puml
    print("\nSauvegarde des fichiers .puml...")
    puml_dir = output_dir / 'plantuml'
    saved_files = save_plantuml_files(blocks, str(puml_dir))
    
    # Générer le fichier HTML de prévisualisation
    print("\nGeneration du fichier HTML de previsualisation...")
    html_file = generate_html_preview(blocks, str(output_dir / 'preview.html'))
    
    # Créer le fichier avec les liens
    print("\nCreation du fichier avec les liens PlantUML...")
    links_file = create_plantuml_online_links(blocks, str(output_dir / 'liens_plantuml.txt'))
    
    # Résumé
    print("\n" + "=" * 80)
    print("GENERATION TERMINEE")
    print("=" * 80)
    print(f"\n{len(blocks)} diagramme(s) traite(s)")
    print(f"\nFichiers generes :")
    print(f"   - Fichiers .puml : {puml_dir}/")
    print(f"   - Previsualisation HTML : {html_file}")
    print(f"   - Liens PlantUML : {links_file}")
    print(f"\nPour visualiser :")
    print(f"   1. Ouvrez '{html_file}' dans votre navigateur")
    print(f"   2. Ou utilisez les liens dans '{links_file}'")
    print(f"   3. Ou installez l'extension PlantUML dans Cursor/VS Code")

if __name__ == '__main__':
    main()

