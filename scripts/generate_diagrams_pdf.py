#!/usr/bin/env python3
"""
Script pour générer un PDF avec tous les diagrammes PlantUML
Utilise l'API PlantUML pour générer les images
"""

import re
import os
import sys
import urllib.request
import urllib.parse
import base64
import zlib
from pathlib import Path

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib import colors
except ImportError:
    print("ERREUR: reportlab n'est pas installe.")
    print("Installez-le avec: pip install reportlab")
    sys.exit(1)

try:
    from PIL import Image as PILImage
    from io import BytesIO
except ImportError:
    print("ERREUR: Pillow n'est pas installe.")
    print("Installez-le avec: pip install Pillow")
    sys.exit(1)

def extract_plantuml_blocks(markdown_file):
    """Extrait tous les blocs PlantUML du fichier Markdown avec leurs titres"""
    try:
        with open(markdown_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"ERREUR: Fichier '{markdown_file}' introuvable")
        return []
    
    # Chercher tous les blocs plantuml
    plantuml_pattern = r'```plantuml\n(.*?)\n```'
    plantuml_blocks = re.findall(plantuml_pattern, content, re.DOTALL)
    
    # Pour chaque bloc, chercher le titre précédent
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

def encode_plantuml(code):
    """Encode le code PlantUML selon le format PlantUML (compression)"""
    # PlantUML utilise une compression spéciale
    # Format: encodage base64 de la compression deflate
    compressed = zlib.compress(code.encode('utf-8'))
    encoded = base64.b64encode(compressed).decode('ascii')
    # PlantUML utilise un encodage spécial avec remplacement de caractères
    encoded = encoded.translate(str.maketrans(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
    ))
    return encoded

def download_plantuml_image(code, output_dir='diagrams/temp'):
    """Télécharge l'image PNG du diagramme depuis PlantUML Server"""
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Encoder le code PlantUML
        compressed = zlib.compress(code.encode('utf-8'))
        encoded = base64.b64encode(compressed).decode('ascii')
        # PlantUML utilise un encodage spécial
        encoded = encoded.translate(str.maketrans(
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
            '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
        ))
        
        url = f"http://www.plantuml.com/plantuml/png/{encoded}"
        
        print(f"  Telechargement de l'image depuis PlantUML...")
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        response = urllib.request.urlopen(req, timeout=30)
        image_data = response.read()
        
        # Vérifier si c'est une image valide
        img = PILImage.open(BytesIO(image_data))
        
        # Sauvegarder temporairement
        temp_file = os.path.join(output_dir, f"temp_{abs(hash(code))}.png")
        img.save(temp_file, 'PNG')
        
        return temp_file
    except Exception as e:
        print(f"  ERREUR lors du telechargement: {e}")
        print(f"  Tentative avec URL alternative...")
        # Essayer avec l'URL simple (moins fiable mais parfois ça marche)
        try:
            simple_url = f"http://www.plantuml.com/plantuml/png/" + urllib.parse.quote(code, safe='')
            req = urllib.request.Request(simple_url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            response = urllib.request.urlopen(req, timeout=30)
            image_data = response.read()
            img = PILImage.open(BytesIO(image_data))
            temp_file = os.path.join(output_dir, f"temp_{abs(hash(code))}.png")
            img.save(temp_file, 'PNG')
            return temp_file
        except:
            return None

def generate_pdf_with_diagrams(blocks, output_file='diagrams/diagrammes.pdf'):
    """Génère un PDF avec tous les diagrammes"""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Créer le document PDF
    doc = SimpleDocTemplate(
        str(output_file),
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    diagram_title_style = ParagraphStyle(
        'DiagramTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=10,
        spaceBefore=20
    )
    
    normal_style = styles['Normal']
    
    # Éléments du PDF
    elements = []
    
    # Page de titre
    elements.append(Spacer(1, 5*cm))
    elements.append(Paragraph("Diagrammes de Conception", title_style))
    elements.append(Paragraph("Système de Gestion Intelligente des Criminels", 
                             ParagraphStyle('Subtitle', parent=normal_style, 
                                           alignment=TA_CENTER, fontSize=12)))
    elements.append(Spacer(1, 2*cm))
    elements.append(Paragraph(f"Total: {len(blocks)} diagramme(s)", 
                             ParagraphStyle('Count', parent=normal_style, 
                                           alignment=TA_CENTER)))
    elements.append(PageBreak())
    
    # Ajouter chaque diagramme
    for i, (title, code) in enumerate(blocks, 1):
        print(f"\nTraitement du diagramme {i}/{len(blocks)}: {title}")
        
        # Titre du diagramme
        elements.append(Paragraph(f"{i}. {title}", diagram_title_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Télécharger l'image
        image_path = download_plantuml_image(code)
        
        if image_path and os.path.exists(image_path):
            try:
                # Charger et redimensionner l'image si nécessaire
                img = PILImage.open(image_path)
                width, height = img.size
                
                # Calculer la taille pour tenir dans la page (largeur max 16cm)
                max_width = 16 * cm
                max_height = 20 * cm
                
                if width > max_width:
                    ratio = max_width / width
                    width = max_width
                    height = height * ratio
                
                if height > max_height:
                    ratio = max_height / height
                    height = max_height
                    width = width * ratio
                
                # Ajouter l'image au PDF
                elements.append(Image(image_path, width=width, height=height))
                elements.append(Spacer(1, 1*cm))
                
                # Nettoyer le fichier temporaire
                try:
                    os.remove(image_path)
                except:
                    pass
                    
            except Exception as e:
                print(f"  ERREUR lors de l'ajout de l'image: {e}")
                elements.append(Paragraph(f"[Erreur: Impossible de charger l'image du diagramme]", 
                                         normal_style))
        else:
            elements.append(Paragraph(f"[Erreur: Impossible de télécharger l'image]", normal_style))
        
        # Saut de page sauf pour le dernier
        if i < len(blocks):
            elements.append(PageBreak())
    
    # Générer le PDF
    print(f"\nGeneration du PDF: {output_file}")
    doc.build(elements)
    
    print(f"OK: PDF genere avec succes: {output_file}")
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
    
    # Générer le PDF
    print("Generation du PDF avec les diagrammes...")
    print("(Cela peut prendre quelques minutes selon le nombre de diagrammes)")
    pdf_file = generate_pdf_with_diagrams(blocks, str(output_dir / 'diagrammes.pdf'))
    
    # Résumé
    print("\n" + "=" * 80)
    print("GENERATION TERMINEE")
    print("=" * 80)
    print(f"\n{len(blocks)} diagramme(s) traite(s)")
    print(f"\nFichier PDF genere : {pdf_file}")
    print(f"\nLe PDF contient tous les diagrammes avec leurs titres.")

if __name__ == '__main__':
    main()

