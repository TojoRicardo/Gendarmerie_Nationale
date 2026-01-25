#!/usr/bin/env python3
"""
Script pour générer des liens directs vers PlantUML en ligne et créer un fichier HTML interactif
"""

import re
import os
import sys
import urllib.parse
from pathlib import Path

def extract_plantuml_blocks(markdown_file):
    """Extrait tous les blocs PlantUML du fichier Markdown avec leurs titres"""
    try:
        with open(markdown_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"ERREUR: Fichier '{markdown_file}' introuvable")
        return []
    
    # Pattern amélioré pour trouver les blocs PlantUML avec leurs titres
    # Cherche les titres de niveau 4 (####) qui précèdent les blocs plantuml
    pattern = r'(?:####\s+([^\n]+)\s*\n\s*)?```plantuml\n(.*?)\n```'
    matches = re.findall(pattern, content, re.DOTALL)
    
    # Si aucun titre n'est trouvé avec le pattern, chercher les titres avant les blocs
    if not matches or all(not m[0].strip() for m in matches):
        # Chercher tous les blocs plantuml
        plantuml_pattern = r'```plantuml\n(.*?)\n```'
        plantuml_blocks = re.findall(plantuml_pattern, content, re.DOTALL)
        
        # Pour chaque bloc, chercher le titre précédent (peut être ####, ###, ou ##)
        results = []
        for block in plantuml_blocks:
            # Trouver la position du bloc
            block_start = content.find(f'```plantuml\n{block}')
            if block_start == -1:
                continue
            
            # Chercher le titre précédent (dans les 500 caractères avant)
            before_block = content[max(0, block_start-500):block_start]
            
            # Chercher différents niveaux de titres
            title_match = None
            for level in ['####', '###', '##']:
                title_pattern = rf'{level}\s+([^\n]+)'
                title_matches = list(re.finditer(title_pattern, before_block))
                if title_matches:
                    # Prendre le dernier titre trouvé (le plus proche)
                    title_match = title_matches[-1].group(1).strip()
                    break
            
            title = title_match if title_match else "Diagramme sans titre"
            results.append((title, block.strip()))
        
        return results
    
    # Extraire les titres et les blocs
    results = []
    for match in matches:
        title = match[0].strip() if match[0] and match[0].strip() else None
        block_code = match[1].strip()
        
        # Si pas de titre dans le match, chercher avant
        if not title:
            # Trouver la position du bloc
            block_start = content.find(f'```plantuml\n{block_code}')
            if block_start != -1:
                before_block = content[max(0, block_start-500):block_start]
                for level in ['####', '###', '##']:
                    title_pattern = rf'{level}\s+([^\n]+)'
                    title_matches = list(re.finditer(title_pattern, before_block))
                    if title_matches:
                        title = title_matches[-1].group(1).strip()
                        break
        
        title = title if title else "Diagramme sans titre"
        results.append((title, block_code))
    
    return results

def encode_plantuml(code):
    """Encode le code PlantUML pour l'URL"""
    # PlantUML utilise un encodage spécial (compression)
    # Pour simplifier, on utilise l'encodage URL standard
    return urllib.parse.quote(code, safe='')

def generate_plantuml_url(code):
    """Génère l'URL directe vers PlantUML en ligne"""
    # PlantUML Server accepte le code directement dans l'URL
    encoded = encode_plantuml(code)
    return f"http://www.plantuml.com/plantuml/uml/{encoded}"

def generate_html_with_links(blocks, output_file='diagrams/ouvrir_plantuml.html'):
    """Génère un fichier HTML avec des boutons pour ouvrir chaque diagramme dans PlantUML"""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    html_content = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ouvrir les Diagrammes dans PlantUML</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 30px;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #7f8c8d;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .diagram-card {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            transition: all 0.3s ease;
        }
        .diagram-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }
        .diagram-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .button-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background: #5a6268;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .code-preview {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
            margin-top: 15px;
            max-height: 200px;
            overflow-y: auto;
        }
        .code-preview summary {
            cursor: pointer;
            color: #bd93f9;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .stats {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        .stats-number {
            font-size: 2em;
            font-weight: bold;
            color: #1976d2;
        }
        .instructions {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 4px;
        }
        .instructions h3 {
            color: #856404;
            margin-bottom: 10px;
        }
        .instructions ol {
            margin-left: 20px;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Diagrammes PlantUML - SGIC</h1>
        <p class="subtitle">Cliquez sur les boutons pour ouvrir chaque diagramme dans PlantUML en ligne</p>
        
        <div class="stats">
            <div class="stats-number">{count}</div>
            <div>diagramme(s) disponible(s)</div>
        </div>
        
        <div class="instructions">
            <h3>📝 Instructions :</h3>
            <ol>
                <li>Cliquez sur <strong>"Ouvrir dans PlantUML"</strong> pour visualiser le diagramme</li>
                <li>Dans PlantUML, vous pouvez :
                    <ul>
                        <li>Voir le diagramme en grand format</li>
                        <li>Télécharger en PNG (bouton "Download PNG")</li>
                        <li>Télécharger en SVG (bouton "Download SVG")</li>
                        <li>Modifier le code si nécessaire</li>
                    </ul>
                </li>
                <li>Utilisez <strong>"Copier le code"</strong> pour copier le code PlantUML</li>
            </ol>
        </div>
"""
    
    for i, (title, code) in enumerate(blocks, 1):
        url = generate_plantuml_url(code)
        # Encoder pour JavaScript
        code_js = code.replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$')
        
        html_content += f"""
        <div class="diagram-card">
            <div class="diagram-title">{i}. {title}</div>
            <div class="button-group">
                <a href="{url}" target="_blank" class="btn btn-primary">
                    🌐 Ouvrir dans PlantUML
                </a>
                <button onclick="copyCode({i})" class="btn btn-secondary">
                    📋 Copier le code
                </button>
                <button onclick="downloadAsPNG({i})" class="btn btn-success">
                    💾 Télécharger PNG
                </button>
            </div>
            <details class="code-preview">
                <summary>Voir le code PlantUML</summary>
                <pre id="code-{i}">{code}</pre>
            </details>
        </div>
"""
    
    html_content += """
    </div>
    
    <script>
        function copyCode(index) {
            const codeElement = document.getElementById('code-' + index);
            const code = codeElement.textContent;
            
            navigator.clipboard.writeText(code).then(() => {
                alert('Code copié dans le presse-papiers !');
            }).catch(err => {
                // Fallback pour les anciens navigateurs
                const textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Code copié dans le presse-papiers !');
            });
        }
        
        function downloadAsPNG(index) {
            const codeElement = document.getElementById('code-' + index);
            const code = codeElement.textContent;
            const encoded = encodeURIComponent(code);
            const url = 'http://www.plantuml.com/plantuml/png/' + encoded;
            
            // Ouvrir dans un nouvel onglet pour télécharger
            window.open(url, '_blank');
        }
    </script>
</body>
</html>
"""
    
    html_content = html_content.replace('{count}', str(len(blocks)))
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"OK: Fichier HTML avec liens cree : {output_file}")
    return output_file

def main():
    # Chemin du fichier Markdown
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    markdown_file = project_root / 'ANALYSE_PROJET_STAGE.md'
    
    if not markdown_file.exists():
        print(f"ERREUR: Fichier '{markdown_file}' introuvable")
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
    
    # Générer le fichier HTML avec liens
    print("Generation du fichier HTML avec liens PlantUML...")
    html_file = generate_html_with_links(blocks, str(output_dir / 'ouvrir_plantuml.html'))
    
    # Résumé
    print("\n" + "=" * 80)
    print("GENERATION TERMINEE")
    print("=" * 80)
    print(f"\n{len(blocks)} diagramme(s) traite(s)")
    print(f"\nFichier genere : {html_file}")
    print(f"\nPour utiliser :")
    print(f"   1. Ouvrez '{html_file}' dans votre navigateur")
    print(f"   2. Cliquez sur 'Ouvrir dans PlantUML' pour chaque diagramme")
    print(f"   3. Dans PlantUML, telechargez en PNG ou SVG")

if __name__ == '__main__':
    main()

