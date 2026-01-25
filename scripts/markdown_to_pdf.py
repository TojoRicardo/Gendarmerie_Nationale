#!/usr/bin/env python3
"""
Script de conversion Markdown vers PDF
Convertit PLAN_DEPLOIEMENT.md en PDF
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, inch
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak,
        Table, TableStyle, KeepTogether
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    print("Erreur: reportlab n'est pas installé.")
    print("Installez-le avec: pip install reportlab")
    sys.exit(1)

try:
    import markdown
except ImportError:
    print("Erreur: markdown n'est pas installé.")
    print("Installez-le avec: pip install markdown")
    sys.exit(1)


class MarkdownToPDF:
    def __init__(self, markdown_file, output_file):
        self.markdown_file = Path(markdown_file)
        self.output_file = Path(output_file)
        self.elements = []
        self.styles = getSampleStyleSheet()
        self._setup_styles()
        
    def _setup_styles(self):
        """Configure les styles personnalisés"""
        # Style pour le titre principal
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            spaceBefore=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        # Style pour H1
        self.h1_style = ParagraphStyle(
            'CustomH1',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        )
        
        # Style pour H2
        self.h2_style = ParagraphStyle(
            'CustomH2',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#34495e'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold'
        )
        
        # Style pour H3
        self.h3_style = ParagraphStyle(
            'CustomH3',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#34495e'),
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        # Style pour le texte normal
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=6,
            leading=14,
            alignment=TA_JUSTIFY
        )
        
        # Style pour le code
        self.code_style = ParagraphStyle(
            'CustomCode',
            parent=self.styles['Code'],
            fontSize=9,
            textColor=colors.HexColor('#27ae60'),
            backColor=colors.HexColor('#f8f9fa'),
            leftIndent=10,
            rightIndent=10,
            spaceAfter=6,
            fontName='Courier'
        )
        
    def _parse_markdown(self):
        """Parse le fichier Markdown"""
        with open(self.markdown_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convertir Markdown en HTML
        md = markdown.Markdown(extensions=['tables', 'fenced_code', 'codehilite'])
        html = md.convert(content)
        
        return html, content
    
    def _clean_text(self, text):
        """Nettoie le texte pour ReportLab"""
        # Échapper les caractères HTML
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        return text
    
    def _process_line(self, line):
        """Traite une ligne de Markdown"""
        line = line.rstrip()
        
        if not line:
            self.elements.append(Spacer(1, 0.2*cm))
            return
        
        # Titre H1 (# Titre)
        if line.startswith('# '):
            text = line[2:].strip()
            self.elements.append(Paragraph(self._clean_text(text), self.h1_style))
            self.elements.append(Spacer(1, 0.3*cm))
            return
        
        # Titre H2 (## Titre)
        if line.startswith('## '):
            text = line[3:].strip()
            self.elements.append(Paragraph(self._clean_text(text), self.h2_style))
            self.elements.append(Spacer(1, 0.2*cm))
            return
        
        # Titre H3 (### Titre)
        if line.startswith('### '):
            text = line[4:].strip()
            self.elements.append(Paragraph(self._clean_text(text), self.h3_style))
            self.elements.append(Spacer(1, 0.15*cm))
            return
        
        # Ligne horizontale (---)
        if line.strip() == '---':
            self.elements.append(Spacer(1, 0.3*cm))
            return
        
        # Liste à puces (- item)
        if line.strip().startswith('- '):
            text = line.strip()[2:]
            # Utiliser un style de liste
            list_style = ParagraphStyle(
                'ListStyle',
                parent=self.normal_style,
                leftIndent=20,
                bulletIndent=10,
                bulletText='•'
            )
            self.elements.append(Paragraph(f"• {self._clean_text(text)}", list_style))
            return
        
        # Liste numérotée (1. item)
        if re.match(r'^\d+\.\s', line.strip()):
            text = re.sub(r'^\d+\.\s', '', line.strip())
            list_style = ParagraphStyle(
                'ListStyle',
                parent=self.normal_style,
                leftIndent=20
            )
            self.elements.append(Paragraph(self._clean_text(text), list_style))
            return
        
        # Code block (```)
        if line.strip().startswith('```'):
            return  # Gérer les blocs de code séparément
        
        # Texte normal
        if line.strip():
            # Détecter le code inline
            if '`' in line:
                # Remplacer le code inline
                line = re.sub(r'`([^`]+)`', r'<font color="#27ae60">\1</font>', line)
            
            # Détecter les liens
            line = re.sub(
                r'\[([^\]]+)\]\([^\)]+\)',
                r'<font color="#3498db"><u>\1</u></font>',
                line
            )
            
            # Détecter le texte en gras
            line = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', line)
            line = re.sub(r'__([^_]+)__', r'<b>\1</b>', line)
            
            # Détecter le texte en italique
            line = re.sub(r'\*([^\*]+)\*', r'<i>\1</i>', line)
            line = re.sub(r'_([^_]+)_', r'<i>\1</i>', line)
            
            self.elements.append(Paragraph(line, self.normal_style))
    
    def _process_table(self, lines, start_idx):
        """Traite un tableau Markdown"""
        table_lines = []
        i = start_idx
        
        while i < len(lines) and '|' in lines[i]:
            table_lines.append(lines[i])
            i += 1
        
        if len(table_lines) < 2:
            return start_idx
        
        # Parser le tableau
        headers = [cell.strip() for cell in table_lines[0].split('|')[1:-1]]
        separator = table_lines[1]  # Ligne de séparation
        rows = []
        
        for line in table_lines[2:]:
            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            if cells:
                rows.append(cells)
        
        # Créer le tableau ReportLab
        table_data = [headers] + rows
        
        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecf0f1')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#2c3e50')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bdc3c7')),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ]))
        
        self.elements.append(Spacer(1, 0.2*cm))
        self.elements.append(table)
        self.elements.append(Spacer(1, 0.3*cm))
        
        return i - 1
    
    def convert(self):
        """Convertit le Markdown en PDF"""
        print(f"Lecture du fichier: {self.markdown_file}")
        
        with open(self.markdown_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Ajouter une page de titre
        title = self.markdown_file.stem.replace('_', ' ').title()
        self.elements.append(Spacer(1, 5*cm))
        self.elements.append(Paragraph(title, self.title_style))
        self.elements.append(Spacer(1, 1*cm))
        self.elements.append(Paragraph(
            f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
            ParagraphStyle('DateStyle', parent=self.normal_style, alignment=TA_CENTER)
        ))
        self.elements.append(PageBreak())
        
        # Traiter les lignes
        i = 0
        in_code_block = False
        code_block_lines = []
        
        while i < len(lines):
            line = lines[i]
            
            # Détecter les blocs de code
            if line.strip().startswith('```'):
                if in_code_block:
                    # Fin du bloc de code
                    code_text = '\n'.join(code_block_lines)
                    self.elements.append(Paragraph(
                        f'<font face="Courier" size="8" color="#27ae60">{self._clean_text(code_text)}</font>',
                        self.code_style
                    ))
                    code_block_lines = []
                    in_code_block = False
                else:
                    # Début du bloc de code
                    in_code_block = True
                i += 1
                continue
            
            if in_code_block:
                code_block_lines.append(line.rstrip())
                i += 1
                continue
            
            # Détecter les tableaux
            if '|' in line and i + 1 < len(lines) and '|' in lines[i + 1]:
                i = self._process_table(lines, i)
                i += 1
                continue
            
            # Traiter la ligne normalement
            self._process_line(line)
            i += 1
        
        # Créer le PDF
        print(f"Génération du PDF: {self.output_file}")
        doc = SimpleDocTemplate(
            str(self.output_file),
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        doc.build(self.elements)
        print(f"✓ PDF généré avec succès: {self.output_file}")


def main():
    # Chemins des fichiers
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    markdown_file = project_root / "PLAN_DEPLOIEMENT.md"
    output_file = project_root / "PLAN_DEPLOIEMENT.pdf"
    
    if not markdown_file.exists():
        print(f"Erreur: Fichier non trouvé: {markdown_file}")
        sys.exit(1)
    
    converter = MarkdownToPDF(markdown_file, output_file)
    converter.convert()
    
    print(f"\n✓ Conversion terminée!")
    print(f"  Fichier PDF: {output_file}")


if __name__ == "__main__":
    main()

