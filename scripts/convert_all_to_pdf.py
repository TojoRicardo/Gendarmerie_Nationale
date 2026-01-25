#!/usr/bin/env python3
"""
Script pour convertir tous les documents Markdown en PDF
"""

import os
import sys
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, inch
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak,
        Table, TableStyle, KeepTogether, Image
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    print("ERREUR: reportlab n'est pas installe.")
    print("Installez-le avec: pip install reportlab")
    sys.exit(1)

try:
    import markdown
    from markdown.extensions import codehilite, tables
except ImportError:
    print("ERREUR: markdown n'est pas installe.")
    print("Installez-le avec: pip install markdown")
    sys.exit(1)


class MarkdownToPDF:
    def __init__(self, markdown_file, output_file):
        self.markdown_file = Path(markdown_file)
        self.output_file = Path(output_file)
        self.elements = []
        
        # Styles
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        self.heading1_style = ParagraphStyle(
            'CustomH1',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        )
        
        self.heading2_style = ParagraphStyle(
            'CustomH2',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold'
        )
        
        self.heading3_style = ParagraphStyle(
            'CustomH3',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#764ba2'),
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            spaceAfter=6
        )
        
        self.code_style = ParagraphStyle(
            'CodeStyle',
            parent=self.styles['Code'],
            fontSize=8,
            fontName='Courier',
            leftIndent=20,
            rightIndent=20,
            backColor=colors.HexColor('#f8f9fa'),
            borderColor=colors.HexColor('#dee2e6'),
            borderWidth=1,
            borderPadding=5
        )

    def _clean_text(self, text):
        """Nettoie le texte pour le PDF"""
        if not text:
            return ""
        # Remplacer les caractères spéciaux
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        return text

    def _process_line(self, line):
        """Traite une ligne de Markdown"""
        line = line.rstrip()
        if not line:
            self.elements.append(Spacer(1, 6))
            return
        
        # Titres
        if line.startswith('# '):
            self.elements.append(Paragraph(self._clean_text(line[2:]), self.title_style))
        elif line.startswith('## '):
            self.elements.append(Paragraph(self._clean_text(line[3:]), self.heading1_style))
        elif line.startswith('### '):
            self.elements.append(Paragraph(self._clean_text(line[4:]), self.heading2_style))
        elif line.startswith('#### '):
            self.elements.append(Paragraph(self._clean_text(line[5:]), self.heading3_style))
        # Liste
        elif line.startswith('- ') or line.startswith('* '):
            text = self._clean_text(line[2:])
            self.elements.append(Paragraph(f"• {text}", self.normal_style))
        elif line.startswith('  - ') or line.startswith('  * '):
            text = self._clean_text(line[4:])
            self.elements.append(Paragraph(f"  ◦ {text}", self.normal_style))
        # Texte normal
        else:
            # Vérifier si c'est du texte en gras
            if '**' in line:
                # Simple remplacement pour le gras
                line = line.replace('**', '<b>').replace('**', '</b>')
                # Compter les balises pour fermer correctement
                count = line.count('<b>')
                if count % 2 != 0:
                    line = line.replace('</b>', '', 1)
                    line += '</b>'
            self.elements.append(Paragraph(self._clean_text(line), self.normal_style))

    def convert(self):
        """Convertit le Markdown en PDF"""
        print(f"Lecture du fichier: {self.markdown_file}")
        
        with open(self.markdown_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Page de titre
        title = self.markdown_file.stem.replace('_', ' ').title()
        self.elements.append(Spacer(1, 8*cm))
        self.elements.append(Paragraph(title, self.title_style))
        self.elements.append(Spacer(1, 2*cm))
        self.elements.append(Paragraph(
            f"Généré le {self._get_date()}",
            ParagraphStyle('DateStyle', parent=self.normal_style, alignment=TA_CENTER)
        ))
        self.elements.append(PageBreak())
        
        # Traiter les lignes
        in_code_block = False
        code_block_lines = []
        code_language = ""
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Détecter les blocs de code
            if line.strip().startswith('```'):
                if in_code_block:
                    # Fin du bloc de code
                    code_text = '\n'.join(code_block_lines)
                    # Ignorer les blocs PlantUML dans le PDF (trop complexes)
                    if code_language != 'plantuml':
                        self.elements.append(Paragraph(
                            f'<font face="Courier" size="8" color="#27ae60">{self._clean_text(code_text)}</font>',
                            self.code_style
                        ))
                    code_block_lines = []
                    code_language = ""
                    in_code_block = False
                else:
                    # Début du bloc de code
                    in_code_block = True
                    code_language = line.strip()[3:].strip()
                i += 1
                continue
            
            if in_code_block:
                code_block_lines.append(line.rstrip())
                i += 1
                continue
            
            # Détecter les tableaux simples
            if '|' in line and i + 1 < len(lines) and '|' in lines[i + 1]:
                i = self._process_table(lines, i)
                i += 1
                continue
            
            # Traiter la ligne normalement
            self._process_line(line)
            i += 1
        
        # Créer le PDF
        print(f"Generation du PDF: {self.output_file}")
        doc = SimpleDocTemplate(
            str(self.output_file),
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        doc.build(self.elements)
        print(f"✓ PDF genere avec succes: {self.output_file}")

    def _process_table(self, lines, start_idx):
        """Traite un tableau Markdown"""
        table_data = []
        i = start_idx
        
        # Lire les lignes du tableau
        while i < len(lines) and '|' in lines[i]:
            line = lines[i].strip()
            if line.startswith('|') and line.endswith('|'):
                # Ignorer la ligne de séparation
                if not all(c in '|-: ' for c in line[1:-1]):
                    cells = [cell.strip() for cell in line[1:-1].split('|')]
                    table_data.append(cells)
            i += 1
        
        if len(table_data) < 2:
            return start_idx
        
        # Créer le tableau
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        
        self.elements.append(table)
        self.elements.append(Spacer(1, 0.5*cm))
        
        return i - 1

    def _get_date(self):
        """Retourne la date formatée"""
        from datetime import datetime
        return datetime.now().strftime('%d/%m/%Y à %H:%M')


def convert_file(markdown_file, output_dir='pdf'):
    """Convertit un fichier Markdown en PDF"""
    markdown_path = Path(markdown_file)
    if not markdown_path.exists():
        print(f"ERREUR: Fichier introuvable: {markdown_file}")
        return False
    
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    pdf_file = output_path / f"{markdown_path.stem}.pdf"
    
    try:
        converter = MarkdownToPDF(markdown_path, pdf_file)
        converter.convert()
        return True
    except Exception as e:
        print(f"ERREUR lors de la conversion de {markdown_file}: {e}")
        return False


def main():
    # Configurer l'encodage UTF-8 pour Windows
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Liste des fichiers à convertir
    files_to_convert = [
        'ANALYSE_PROJET_STAGE.md',
        'PARTIE_II_ANALYSE_CONCEPTION.md',
        'VERIFICATION_CONCEPTION_DETAILLEE.md',
        'VERIFICATION_COMPLETE_PARTIE_II.md',
        'GUIDE_VISUALISATION_DIAGRAMMES.md',
    ]
    
    print("=" * 80)
    print("CONVERSION DES DOCUMENTS MARKDOWN EN PDF")
    print("=" * 80)
    print()
    
    output_dir = project_root / 'pdf'
    output_dir.mkdir(exist_ok=True)
    
    success_count = 0
    error_count = 0
    
    for file_name in files_to_convert:
        file_path = project_root / file_name
        if file_path.exists():
            print(f"Conversion de: {file_name}")
            if convert_file(file_path, output_dir):
                success_count += 1
                print(f"✓ {file_name} converti avec succes\n")
            else:
                error_count += 1
                print(f"✗ Erreur lors de la conversion de {file_name}\n")
        else:
            print(f"⚠ Fichier introuvable: {file_name}\n")
            error_count += 1
    
    print("=" * 80)
    print("RESUME")
    print("=" * 80)
    print(f"Fichiers convertis avec succes: {success_count}")
    print(f"Erreurs: {error_count}")
    print(f"Total: {len(files_to_convert)}")
    print(f"\nFichiers PDF generes dans: {output_dir}")
    
    if success_count > 0:
        print("\n✓ Conversion terminee avec succes!")


if __name__ == '__main__':
    main()

