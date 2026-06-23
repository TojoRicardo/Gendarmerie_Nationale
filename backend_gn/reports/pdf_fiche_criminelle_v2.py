"""
Génération PDF de la fiche criminelle selon format Gendarmerie Nationale.
Format conforme au formulaire officiel "FICHIER CRIMINELLE".

Layout:
- PAGE 1: En-tête + Infraction + Identité (2 col.) + Photos + Empreintes digitales
- PAGE 2: Empreintes palmaires + Empreintes de contrôle
- PAGE 3: Informations complémentaires (2 col.) + Signature
"""

import os
import logging
from io import BytesIO
from datetime import datetime
from PIL import Image
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, Image as RLImage, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)

GENDARMERIE_LOGO_PATH = os.path.join(os.path.dirname(__file__), 'assets', 'logo_gendarmerie.png')


class FicheCriminellePDFGeneratorV2:
    """
    Générateur PDF version 2 avec layout conforme au formulaire officiel Gendarmerie Nationale.
    """
    
    def __init__(self, criminel, request=None):
        self.criminel = criminel
        self.request = request
        
        # Recharger le modèle depuis la base de données pour avoir les données à jour
        # Cela garantit que toutes les modifications récentes sont prises en compte
        # IMPORTANT: On recharge toujours depuis la DB pour avoir les données les plus récentes
        try:
            if hasattr(self.criminel, 'refresh_from_db'):
                # Sauvegarder l'ID avant le rechargement
                criminel_id = getattr(self.criminel, 'id', None)
                
                self.criminel.refresh_from_db()
                
                # Recharger à nouveau depuis la DB pour être sûr d'avoir les dernières données
                # Parfois nécessaire si la transaction n'est pas encore commitée
                from criminel.models import CriminalFicheCriminelle  # type: ignore
                self.criminel = CriminalFicheCriminelle.objects.select_related().prefetch_related().get(id=criminel_id)  # type: ignore[attr-defined]
                
                # Logger quelques champs clés pour vérifier que les données sont bien chargées
                logger.info(f"Modèle rechargé dans générateur PDF: ID={criminel_id}")
                logger.info(f"  - Adresse: {getattr(self.criminel, 'adresse', 'N/A')[:50] if getattr(self.criminel, 'adresse', None) else 'VIDE'}")
                logger.info(f"  - Contact: {getattr(self.criminel, 'contact', 'N/A')[:50] if getattr(self.criminel, 'contact', None) else 'VIDE'}")
                logger.info(f"  - Anciennes adresses: {getattr(self.criminel, 'anciennes_adresses', 'N/A')[:50] if getattr(self.criminel, 'anciennes_adresses', None) else 'VIDE'}")
                logger.info(f"  - Adresses secondaires: {getattr(self.criminel, 'adresses_secondaires', 'N/A')[:50] if getattr(self.criminel, 'adresses_secondaires', None) else 'VIDE'}")
                logger.info(f"  - Lieux visités: {getattr(self.criminel, 'lieux_visites_frequemment', 'N/A')[:50] if getattr(self.criminel, 'lieux_visites_frequemment', None) else 'VIDE'}")
                logger.info(f"  - Véhicules: {getattr(self.criminel, 'vehicules_associes', 'N/A')[:50] if getattr(self.criminel, 'vehicules_associes', None) else 'VIDE'}")
                logger.info(f"  - Spouse: {getattr(self.criminel, 'spouse', 'N/A')[:50] if getattr(self.criminel, 'spouse', None) else 'VIDE'}")
                logger.info(f"  - Children: {getattr(self.criminel, 'children', 'N/A')[:50] if getattr(self.criminel, 'children', None) else 'VIDE'}")
        except Exception as e:
            logger.error(f"Impossible de recharger le modèle depuis la DB: {e}", exc_info=True)
        
        self.buffer = BytesIO()
        self.doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=1.0*cm,
            leftMargin=1.0*cm,
            topMargin=1.0*cm,
            bottomMargin=2.2*cm
        )
        self.page_width = 19*cm
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Configure les styles personnalisés professionnels pour le PDF."""
        # Palette de couleurs sobre et professionnelle
        self.colors = {
            'primary': colors.HexColor('#1a1a1a'),  # Noir/gris très foncé pour header
            'primary_light': colors.HexColor('#2d2d2d'),
            'secondary': colors.HexColor('#F5F5F5'),
            'accent': colors.HexColor('#FFFFFF'),  # Blanc pour infraction (bordure seulement)
            'accent_border': colors.HexColor('#d4af37'),  # Bordure dorée subtile
            'text': colors.HexColor('#000000'),
            'text_light': colors.HexColor('#555555'),  # Gris plus foncé
            'background': colors.HexColor('#FFFFFF'),
            'background_section': colors.HexColor('#F9F9F9'),  # Très léger
            'border': colors.HexColor('#E0E0E0'),  # Gris clair
            'border_dark': colors.HexColor('#1a1a1a'),  # Noir
            'white': colors.white,
            'section_header_bg': colors.HexColor('#1a1a1a'),  # Noir pour titres de section
            'header_bg': colors.HexColor('#2d2d2d'),  # Gris foncé pour header
        }
        
        # Styles normalisés professionnels - Hiérarchie cohérente
        
        # Style pour les titres principaux
        self.title_style = ParagraphStyle(
            'MainTitle',
            parent=self.styles['Title'],
            fontSize=20,
            fontName='Helvetica-Bold',
            textColor=self.colors['primary'],
            alignment=TA_CENTER,
            spaceAfter=20,
            leading=24
        )
        
        # Style pour les titres de section principales
        self.section_style = ParagraphStyle(
            'SectionTitle',
            parent=self.styles['Heading1'],
                    fontSize=15,
            fontName='Helvetica-Bold',
            textColor=self.colors['primary'],
            spaceAfter=10,
            spaceBefore=14,
            alignment=TA_LEFT,
            leading=16
        )
        
        # Style pour les sous-titres
        self.subsection_style = ParagraphStyle(
            'SubsectionTitle',
            parent=self.styles['Heading2'],
            fontSize=12,
            fontName='Helvetica-Bold',
            textColor=self.colors['text'],
            spaceAfter=8,
            spaceBefore=10,
            alignment=TA_LEFT,
            leading=14
        )
        
        # Style pour les labels - Normalisé à 11pt
        self.label_style = ParagraphStyle(
            'Label',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            textColor=self.colors['text'],
            alignment=TA_LEFT,
            leading=13
        )
        
        # Style pour les valeurs - Normalisé à 10pt
        self.value_style = ParagraphStyle(
            'Value',
            parent=self.styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            textColor=self.colors['text'],
            alignment=TA_LEFT,
            leading=12
        )
        
        # Style pour les notes et footer
        self.conformity_style = ParagraphStyle(
            'Conformity',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Oblique',
            textColor=self.colors['text_light'],
            alignment=TA_CENTER,
            leading=11
        )
        
        # Style pour la section AGRESSION
        self.agression_style = ParagraphStyle(
            'Agression',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            textColor=self.colors['text'],
            alignment=TA_LEFT,
            leading=13
        )
    
    def _format_value(self, value, default=''):
        """Formate une valeur pour l'affichage dans le PDF avec les données réelles."""
        if value is None:
            return default
        value_str = str(value).strip()
        if value_str == '':
            return default
        return value_str
    
    def _get_field_value(self, field_name, default=''):
        """Récupère directement la valeur d'un champ du modèle avec les données réelles.
        
        IMPORTANT: Cette fonction récupère toujours les données directement depuis l'objet modèle
        qui a été rechargé depuis la base de données dans __init__.
        """
        try:
            # Vérifier que le champ existe dans le modèle
            if not hasattr(self.criminel, field_name):
                logger.warning(f"[WARNING] Champ {field_name} n'existe pas dans le modèle")
                return default
            
            # Récupérer la valeur directement depuis l'objet modèle
            # L'objet a été rechargé depuis la DB dans __init__, donc on a les données à jour
            value = getattr(self.criminel, field_name)
            
            # Si c'est un TextField ou CharField, vérifier même les chaînes avec espaces
            if isinstance(value, str):
                value_stripped = value.strip()
                if value_stripped:
                    logger.debug(f"[OK] Champ {field_name} trouvé avec valeur: {value_stripped[:50]}...")
                    return value_stripped
                logger.debug(f"Champ {field_name} est vide ou contient seulement des espaces")
                return default
            
            if value is not None and value != '':
                formatted = self._format_value(value, default)
                logger.debug(f"[OK] Champ {field_name} trouvé avec valeur: {formatted[:50]}...")
                return formatted
            else:
                logger.debug(f"Champ {field_name} est None ou vide")
                return default
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du champ {field_name}: {e}", exc_info=True)
        return default
    
    def _get_choice_display_safe(self, field_name, value):
        """Récupère le libellé affichable d'un champ à choix (ex: statut matrimonial)."""
        if not value:
            return ''
        try:
            display_method = getattr(self.criminel, f'get_{field_name}_display', None)
            if callable(display_method):
                return display_method() or str(value)

            model_class = self.criminel.__class__
            choices_attr = f'{field_name.upper()}_CHOICES'
            if hasattr(model_class, choices_attr):
                choices = getattr(model_class, choices_attr)
                if choices and isinstance(choices, (list, tuple)):
                    return dict(choices).get(value, str(value))
        except Exception as e:
            logger.warning(f"Erreur lors de la récupération du choix {field_name}: {e}")
        return str(value) if value else ''
    
    def _format_date(self, date_value, format_str='%d %B %Y'):
        """Formate une date pour l'affichage avec les données réelles."""
        if date_value:
            try:
                if hasattr(date_value, 'strftime'):
                    return date_value.strftime(format_str)
                return str(date_value)
            except Exception as e:
                logger.warning(f"Erreur lors du formatage de la date: {e}")
                return str(date_value)
        return ''
        
    def optimize_image_for_pdf(self, image_path, max_width=None, max_height=None):
        """
        Optimise une image pour l'inclusion dans le PDF.
        Retourne un BytesIO avec l'image optimisée.
        """
        try:
            if not os.path.exists(image_path):
                return None
                
            img = Image.open(image_path)
            
            # Convertir en RGB si nécessaire
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Redimensionner si nécessaire
            if max_width or max_height:
                img.thumbnail(
                    (max_width or img.width, max_height or img.height),
                    Image.Resampling.LANCZOS
                )
            
            # Sauvegarder dans un buffer
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=95, optimize=True)
            buffer.seek(0)
            return buffer
            
        except Exception as e:
            logger.error(f"Erreur lors de l'optimisation de l'image {image_path}: {e}")
            return None
    
    def get_image_path(self, image_field):
        """
        Récupère le chemin d'un fichier image depuis un ImageField Django.
        Gère les cas où l'image est en mémoire ou sur disque.
        """
        if not image_field:
            return None
        
        try:
            if hasattr(image_field, 'path'):
                path = image_field.path
                if os.path.exists(path):
                    return path
            
            if hasattr(image_field, 'url'):
                url = image_field.url
                # Construire le chemin complet depuis MEDIA_ROOT
                if url.startswith('/'):
                    url = url[1:]
                full_path = os.path.join(settings.MEDIA_ROOT, url)
                if os.path.exists(full_path):
                    return full_path
            
            if hasattr(image_field, 'file'):
                file_obj = image_field.file
                if hasattr(file_obj, 'name') and os.path.exists(file_obj.name):
                    return file_obj.name
                
                # Si le fichier est en mémoire, le sauvegarder temporairement
                if hasattr(file_obj, 'read'):
                    import tempfile
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    temp_file.write(file_obj.read())
                    temp_file.close()
                    return temp_file.name
                
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du chemin de l'image: {e}")
        
        return None
    
    def _create_section_header(self, title, width=None, bilingual=False):
        """Crée un en-tête de section avec fond gris foncé et texte blanc centré (comme capture)."""
        if width is None:
            width = self.page_width
        
        header_style = ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#FFFFFF'),  # Texte blanc
            alignment=TA_CENTER,
            spaceAfter=0,
            spaceBefore=0
        )
        
        header_text = Paragraph(title.upper(), header_style)
        
        header_table = Table([[header_text]], colWidths=[width])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#4A4A4A')),  # Fond gris foncé comme capture
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#2A2A2A')),  # Bordure plus foncée
        ]))
        
        return header_table

    def _create_header_logo_cell(self, cell_width=1.3*cm, cell_height=1.6*cm):
        """Logo Zandarimaria dans l'en-tête, sans cadre ni contour."""
        logo_content = Paragraph("", self.styles['Normal'])
        logo_path = GENDARMERIE_LOGO_PATH

        if os.path.exists(logo_path):
            try:
                optimized = self.optimize_image_for_pdf(
                    logo_path,
                    max_width=int(cell_width / cm * 120),
                    max_height=int(cell_height / cm * 120),
                )
                if optimized:
                    logo_content = RLImage(
                        optimized,
                        width=cell_width,
                        height=cell_height,
                    )
            except Exception as e:
                logger.warning(f"Impossible de charger le logo Gendarmerie: {e}")

        logo_cell = Table([[logo_content]], colWidths=[cell_width], rowHeights=[cell_height])
        logo_cell.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['header_bg']),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        return logo_cell

    def _empty_fingerprint_placeholder(self):
        """Case d'empreinte vide sans code R1/L1."""
        return Paragraph(
            '',
            ParagraphStyle('EmptyFinger', parent=self.styles['Normal'], fontSize=1)
        )

    def _format_field_display(self, value, empty='—'):
        text = self._format_value(value, '')
        return text if text else empty

    def _create_form_table(self, data, width):
        """Tableau label/valeur aligné — style fiche administrative."""
        label_style = ParagraphStyle(
            'FormLabel', parent=self.styles['Normal'],
            fontSize=8, fontName='Helvetica-Bold',
            textColor=self.colors['text_light'], alignment=TA_LEFT,
        )
        value_style = ParagraphStyle(
            'FormValue', parent=self.styles['Normal'],
            fontSize=10, fontName='Helvetica-Bold',
            textColor=self.colors['text'], alignment=TA_LEFT, leading=12,
        )
        rows = []
        for label, value in data:
            rows.append([
                Paragraph(str(label).upper(), label_style),
                Paragraph(self._format_field_display(value), value_style),
            ])
        if not rows:
            return None
        label_width = min(4.0 * cm, width * 0.40)
        table = Table(rows, colWidths=[label_width, width - label_width])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, self.colors['border']),
            ('LINEAFTER', (0, 0), (0, -1), 0.5, self.colors['border']),
            ('BACKGROUND', (0, 0), (0, -1), self.colors['background_section']),
        ]))
        return table

    def _append_no_data_block(self, elements, width):
        no_data = Table(
            [[self._no_data_paragraph()]],
            colWidths=[width],
        )
        no_data.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 0.5, self.colors['border']),
        ]))
        elements.append(no_data)

    def _no_data_paragraph(self):
        return Paragraph(
            '<i>Aucune information disponible</i>',
            ParagraphStyle(
                'NoData', parent=self.styles['Normal'], fontSize=9,
                textColor=self.colors['text_light'], fontName='Helvetica-Oblique',
                alignment=TA_CENTER,
            ),
        )

    def _create_subsection_bar(self, title):
        bar = Paragraph(
            f'<b>{title}</b>',
            ParagraphStyle(
                'SubBar', parent=self.styles['Normal'], fontSize=9,
                fontName='Helvetica-Bold', textColor=self.colors['text'],
                alignment=TA_CENTER,
            ),
        )
        table = Table([[bar]], colWidths=[self.page_width])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background_section']),
            ('BOX', (0, 0), (-1, -1), 0.5, self.colors['border']),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        return table

    def _build_fingerprint_hand(self, empreintes, doigts, finger_names):
        """Grille de 5 empreintes centrée avec cadre propre."""
        finger_gap = 0.15 * cm
        box_size = (self.page_width - 4 * finger_gap) / 5
        imprint_row, label_row = [], []

        for doigt, name in zip(doigts, finger_names):
            cell_content = self._empty_fingerprint_placeholder()
            empreinte = empreintes.filter(doigt=doigt).first()
            if (
                empreinte and empreinte.image
                and hasattr(empreinte.image, 'path')
                and os.path.exists(empreinte.image.path)
            ):
                try:
                    optimized = self.optimize_image_for_pdf(
                        empreinte.image.path, max_width=2000, max_height=2000,
                    )
                    if optimized:
                        pad = 0.12 * cm
                        cell_content = RLImage(
                            optimized,
                            width=box_size - pad,
                            height=box_size - pad,
                        )
                except Exception as e:
                    logger.error(f"Erreur empreinte {doigt}: {e}")

            frame = Table([[cell_content]], colWidths=[box_size], rowHeights=[box_size])
            frame.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BACKGROUND', (0, 0), (-1, -1), self.colors['white']),
            ]))
            imprint_row.append(frame)
            label_row.append(Paragraph(
                f'<font size=7>{name}</font>',
                ParagraphStyle(
                    'FingerLabel', parent=self.styles['Normal'],
                    alignment=TA_CENTER, fontSize=7,
                    textColor=self.colors['text_light'],
                ),
            ))

        inner = Table([imprint_row, label_row], colWidths=[box_size] * 5)
        inner.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), finger_gap / 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), finger_gap / 2),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
        ]))
        outer = Table([[inner]], colWidths=[self.page_width])
        outer.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['white']),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        return outer

    def _draw_page_footer(self, canvas, doc):
        """Pied de page : date, numéro de fiche, pagination."""
        canvas.saveState()
        page_num = canvas.getPageNumber()
        gen_date = datetime.now().strftime('%d/%m/%Y')
        footer_y = 1.1 * cm
        canvas.setStrokeColor(self.colors['border'])
        canvas.setLineWidth(0.5)
        canvas.line(1.5 * cm, footer_y + 0.5 * cm, A4[0] - 1.5 * cm, footer_y + 0.5 * cm)
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(colors.HexColor('#555555'))
        canvas.drawString(
            1.5 * cm, footer_y,
            f"Gendarmerie Nationale Malagasy — Fiche N° {self.criminel.numero_fiche or 'N/A'}",
        )
        canvas.drawCentredString(A4[0] / 2, footer_y, f"Document généré le {gen_date}")
        canvas.drawRightString(A4[0] - 1.5 * cm, footer_y, f"Page {page_num}")
        canvas.restoreState()

    def _append_signature_footer(self, elements):
        """Bloc signature officiel en fin de document."""
        elements.append(Spacer(1, 0.8 * cm))
        sig_date = datetime.now().strftime('%d/%m/%Y')
        sig_table = Table(
            [[
                Paragraph(
                    f'<b>Date :</b> {sig_date}',
                    ParagraphStyle('SigDate', parent=self.styles['Normal'], fontSize=9, alignment=TA_LEFT),
                ),
                Paragraph(
                    "<b>Signature et cachet de l'officier</b><br/><br/>______________________________",
                    ParagraphStyle('SigLine', parent=self.styles['Normal'], fontSize=9, alignment=TA_RIGHT),
                ),
            ]],
            colWidths=[self.page_width / 2, self.page_width / 2],
        )
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LINEABOVE', (0, 0), (-1, 0), 1, self.colors['border']),
        ]))
        elements.append(sig_table)
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(Paragraph(
            "<i>Gendarmerie Nationale — Service d'Identification Criminelle</i>",
            self.conformity_style,
        ))

    def generate_page_1(self, elements):
        """
        PAGE 1: En-tête + AGRESSION + Identité + Filiation + Coordonnées + Description + Dossier judiciaire + Photos + Empreintes digitales
        """
        # En-tête optimisé selon nouveau design HTML
        logo_cell = self._create_header_logo_cell()
        
        header_center = Paragraph(
            "<b><font size=14 color='white'>GENDARMERIE NATIONALE MALAGASY</font></b><br/>"
            "<font size=10 color='white'><i>Direction Centrale de la Police Judiciaire</i></font>",
            ParagraphStyle(
                'HeaderCenter',
                parent=self.styles['Normal'],
                alignment=TA_CENTER,
                textColor=colors.HexColor('#FFFFFF'),
                fontSize=14,
                fontName='Helvetica-Bold',
                spaceAfter=2
            )
        )
        
        header_right = Paragraph(
            f"<font size=8 color='white'>FICHIER CRIMINEL</font><br/>"
            f"<b><font size=11 color='white'>N° {self.criminel.numero_fiche or 'N/A'}</font></b><br/>"
            f"<font size=8 color='white'>{self._format_date(datetime.now(), '%d %b %Y')}</font>",
            ParagraphStyle(
                'HeaderRight',
                parent=self.styles['Normal'],
                alignment=TA_RIGHT,
                textColor=colors.HexColor('#FFFFFF'),
                fontSize=11,
                fontName='Helvetica-Bold'
            )
        )
        
        header_data = [[logo_cell, header_center, header_right]]
        header_table = Table(header_data, colWidths=[1.5*cm, 12*cm, 4.5*cm])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['header_bg']),  # Gris foncé sobre
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, 0), 8),
            ('RIGHTPADDING', (2, 0), (2, 0), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border_dark']),  # Bordure subtile
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.3*cm))
        
        premiere_infraction = None
        try:
            if hasattr(self.criminel, 'infractions') and self.criminel.infractions.exists():
                premiere_infraction = self.criminel.infractions.all().order_by('date_infraction').first()
        except Exception as e:
            logger.warning(f"Erreur lors de la récupération des infractions: {e}")
            premiere_infraction = None
        
        try:
            date_agression = premiere_infraction.date_infraction.strftime('%d %B %Y') if premiere_infraction and premiere_infraction.date_infraction else ''
        except Exception:
            date_agression = ''
        
        lieu_agression = premiere_infraction.lieu if premiere_infraction and premiere_infraction.lieu else ''
        
        try:
            infraction_type = premiere_infraction.type_infraction.libelle if premiere_infraction and hasattr(premiere_infraction, 'type_infraction') and premiere_infraction.type_infraction and hasattr(premiere_infraction.type_infraction, 'libelle') else 'AGRESSION'
        except Exception:
            infraction_type = 'AGRESSION'
        
        agression_header = Paragraph(
            f"<b>{infraction_type}</b>",
            ParagraphStyle(
                'AgressionHeader',
                parent=self.styles['Normal'],
                fontSize=10,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#000000'),
                alignment=TA_LEFT,
                spaceAfter=3
            )
        )
        agression_content = Paragraph(
            f"Date: {date_agression} | Lieu: {lieu_agression}",
            ParagraphStyle(
                'AgressionContent',
                parent=self.styles['Normal'],
                fontSize=9,
                alignment=TA_LEFT
            )
        )
        agression_data = [[agression_header], [agression_content]]
        agression_table = Table(agression_data, colWidths=[self.page_width])
        agression_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background']),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(agression_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Créer le layout en 2 colonnes côte à côte
        # Colonne gauche : IDENTITÉ + DESCRIPTION PHYSIQUE
        # Colonne droite : FILIATION + COORDONNÉES + DOSSIER JUDICIAIRE
        
        column_gap = 1.5*cm  # Espacement important entre les colonnes
        total_columns_width = self.page_width - column_gap
        column_width = total_columns_width / 2  # Chaque colonne prend la moitié de l'espace disponible
        
        # === PRÉPARATION DES DONNÉES ===
        
        # IDENTITÉ - Récupérer toutes les valeurs réelles avec _get_field_value
        identity_data = [
            ['NOM', self._get_field_value('nom')],
            ['PRÉNOM', self._get_field_value('prenom')],
            ['SURNOM', self._get_field_value('surnom')],
            ['SEXE', self._get_choice_display_safe('sexe', getattr(self.criminel, 'sexe', None))],
            ['DATE DE NAISSANCE', self._format_date(getattr(self.criminel, 'date_naissance', None), '%d %B %Y')],
            ['LIEU DE NAISSANCE', self._get_field_value('lieu_naissance')],
            ['NATIONALITÉ', self._get_field_value('nationalite')],
            ['N° IDENTITÉ', self._get_field_value('cin')],
        ]
        
        # DESCRIPTION PHYSIQUE - Utiliser les données réelles
        corpulence_value = self._get_choice_display_safe('corpulence', self.criminel.corpulence)
        cheveux_value = self._get_choice_display_safe('cheveux', self.criminel.cheveux)
        visage_value = self._get_choice_display_safe('visage', self.criminel.visage)
        barbe_value = self._get_choice_display_safe('barbe', self.criminel.barbe)
        
        physical_data = [
            ['CORPULENCE', corpulence_value],
            ['CHEVEUX', cheveux_value],
            ['VISAGE', visage_value],
            ['BARBE', barbe_value],
        ]
        # Récupérer les marques particulières avec _get_field_value pour avoir les données réelles
        marques_value = self._get_field_value('marques_particulieres')
        if not marques_value:
            # Essayer aussi distinguishing_marks si marques_particulieres est vide
            marques_value = self._get_field_value('distinguishing_marks')
        if marques_value:
            physical_data.append(['SIGNES PARTICULIERS', marques_value])
        
        # FILIATION - Récupérer les valeurs réelles
        filiation_data = [
            ['PÈRE', self._get_field_value('nom_pere')],
            ['MÈRE', self._get_field_value('nom_mere')],
        ]
        
        # COORDONNÉES - Récupérer les valeurs réelles
        adresse_value = self._get_field_value('adresse')
        contact_value = self._get_field_value('contact')
        profession_value = self._get_field_value('profession')
        service_militaire_value = self._get_field_value('service_militaire')
        contact_data = [
            ['ADRESSE', adresse_value if adresse_value else ''],
            ['CONTACT', contact_value if contact_value else ''],
            ['PROFESSION', profession_value if profession_value else ''],
            ['SERVICE MILITAIRE', service_militaire_value if service_militaire_value else ''],
        ]
        
        # DOSSIER JUDICIAIRE
        judicial_data = [
            ['MOTIF ARRESTATION', self._format_value(self.criminel.motif_arrestation)],
            ['DATE ARRESTATION', self._format_date(self.criminel.date_arrestation, '%d %B %Y')],
            ['LIEU ARRESTATION', self._format_value(self.criminel.lieu_arrestation)],
            ['UNITÉ', self._format_value(self.criminel.unite_saisie)],
            ['RÉFÉRENCE P.V', self._format_value(self.criminel.reference_pv)],
            ['SUITE JUDICIAIRE', self._format_value(self.criminel.suite_judiciaire)],
            ['PEINE ENCOURUE', self._format_value(self.criminel.peine_encourue)],
            ['ANTÉCÉDENT', self._format_value(self.criminel.antecedent_judiciaire)],
        ]
        
        # === CRÉER LES TABLEAUX POUR CHAQUE SECTION ===
        
        def create_data_table(data, header_title, width):
            """Crée un tableau de données avec titre de section."""
            section_header = self._create_section_header(header_title, width)
            data_table = self._create_form_table(data, width)
            if data_table:
                return [section_header, Spacer(1, 0.12 * cm), data_table]
            return [section_header, Spacer(1, 0.12 * cm)]
        
        # Colonne gauche - IDENTITÉ
        identity_elements = create_data_table(identity_data, "IDENTITÉ / IDENTITY", column_width)
        
        # Colonne gauche - DESCRIPTION PHYSIQUE
        physical_elements = create_data_table(physical_data, "DESCRIPTION PHYSIQUE / PHYSICAL DESCRIPTION", column_width)
        
        # Colonne droite - FILIATION
        filiation_elements = create_data_table(filiation_data, "FILIATION / FAMILY", column_width)
        
        # Colonne droite - COORDONNÉES
        contact_elements = create_data_table(contact_data, "COORDONNÉES / CONTACT INFORMATION", column_width)
        
        # Colonne droite - DOSSIER JUDICIAIRE
        judicial_elements = create_data_table(judicial_data, "DOSSIER JUDICIAIRE / JUDICIAL RECORD", column_width)
        
        # === CRÉER LE LAYOUT EN 2 COLONNES CÔTE À CÔTE ===
        # Fonction helper pour créer une cellule de colonne
        def create_column_cell(elements_list):
            """Crée une cellule avec plusieurs éléments empilés."""
            cell_table = Table([[e] for e in elements_list], colWidths=[column_width])
            cell_table.setStyle(TableStyle([
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            return cell_table
        
        # Layout selon capture :
        
        # Colonne gauche : IDENTITÉ + DESCRIPTION PHYSIQUE
        left_col_elements = identity_elements + [Spacer(1, 0.2*cm)] + physical_elements
        left_col_cell = create_column_cell(left_col_elements)
        
        # Colonne droite : FILIATION + COORDONNÉES + DOSSIER JUDICIAIRE
        right_col_elements = filiation_elements + [Spacer(1, 0.2*cm)] + contact_elements + [Spacer(1, 0.2*cm)] + judicial_elements
        right_col_cell = create_column_cell(right_col_elements)
        
        # Créer le tableau principal avec 1 ligne en 2 colonnes
        two_column_layout = Table([
            [left_col_cell, right_col_cell]
        ], colWidths=[column_width, column_width])
        
        two_column_layout.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (0, -1), 0),  # Pas de padding gauche pour colonne gauche
            ('RIGHTPADDING', (0, 0), (0, -1), column_gap/2),  # Espacement à droite de la colonne gauche
            ('LEFTPADDING', (1, 0), (1, -1), column_gap/2),  # Espacement à gauche de la colonne droite
            ('RIGHTPADDING', (1, 0), (1, -1), 0),  # Pas de padding droite pour colonne droite
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LINEAFTER', (0, 0), (0, -1), 0.5, self.colors['border']),
        ]))
        
        elements.append(two_column_layout)
        elements.append(Spacer(1, 0.25*cm))
        
        photos_header = self._create_section_header("PHOTOS BIOMÉTRIQUES / BIOMETRIC PHOTOS", self.page_width)
        elements.append(photos_header)
        elements.append(Spacer(1, 0.2*cm))
        
        # Récupérer les 3 photos principales
        from biometrie.models import BiometriePhoto
        try:
            photos = BiometriePhoto.objects.filter(
                criminel=self.criminel,
                est_active=True
            )
            
            photo_face = photos.filter(type_photo='face').order_by('-qualite').first()
            photo_gauche = photos.filter(type_photo='profil_gauche').order_by('-qualite').first()
            photo_droite = photos.filter(type_photo='profil_droit').order_by('-qualite').first()
        except Exception as e:
            logger.warning(f"Erreur lors de la récupération des photos: {e}")
            photos = BiometriePhoto.objects.none()
            photo_face = None
            photo_gauche = None
            photo_droite = None
        
        # Calculer les largeurs avec espacement bien séparé entre les photos
        photo_gap = 0.6*cm  # Espacement entre les photos
        total_photo_width = self.page_width - 2*photo_gap
        photo_width = total_photo_width / 3
        photo_height = photo_width * 1.2  # Ratio 120%
        
        # Reconstruire avec les bonnes tailles
        photo_row = []
        label_row = []
        
        for photo_obj, label_text in [
            (photo_gauche, 'PROFIL GAUCHE'),
            (photo_face, 'FACE'),
            (photo_droite, 'PROFIL DROIT')
        ]:
            if (photo_obj and photo_obj.image and 
                    hasattr(photo_obj.image, 'path') and 
                    os.path.exists(photo_obj.image.path)):
                try:
                    optimized_img = self.optimize_image_for_pdf(
                        photo_obj.image.path,
                    max_width=800,
                    max_height=1000
                    )
                    if optimized_img:
                        img = RLImage(optimized_img, width=photo_width, height=photo_height)
                        photo_row.append(img)
                    else:
                        empty_photo = Table([[Paragraph("", self.styles['Normal'])]], colWidths=[photo_width], rowHeights=[photo_height])
                        empty_photo.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, self.colors['border'])]))
                        photo_row.append(empty_photo)
                except Exception as e:
                    logger.error(f"Erreur photo: {e}")
                    empty_photo = Table([[Paragraph("", self.styles['Normal'])]], colWidths=[photo_width], rowHeights=[photo_height])
                    empty_photo.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, self.colors['border'])]))
                    photo_row.append(empty_photo)
            else:
                empty_photo = Table([[Paragraph("", self.styles['Normal'])]], colWidths=[photo_width], rowHeights=[photo_height])
                empty_photo.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, self.colors['border'])]))
                photo_row.append(empty_photo)
            
            label_row.append(Paragraph(
                f"<b>{label_text}</b>", 
                ParagraphStyle(
                'PhotoLabel',
                    parent=self.styles['Normal'],
                alignment=TA_CENTER,
                    fontSize=8,
                    fontName='Helvetica-Bold',
                    textColor=self.colors['text']
                )
            ))
        
        photos_table = Table([photo_row, label_row], colWidths=[photo_width, photo_width, photo_width])
        photos_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, 0), 1, self.colors['border']),  # Grille subtile
            ('BOX', (0, 0), (-1, 0), 1, self.colors['border']),  # Bordure extérieure
            ('LEFTPADDING', (0, 0), (0, -1), photo_gap/2),  # Espacement gauche
            ('RIGHTPADDING', (0, 0), (0, -1), photo_gap/2),  # Espacement entre photos
            ('LEFTPADDING', (1, 0), (1, -1), photo_gap/2),
            ('RIGHTPADDING', (1, 0), (1, -1), photo_gap/2),
            ('LEFTPADDING', (2, 0), (2, -1), photo_gap/2),
            ('RIGHTPADDING', (2, 0), (2, -1), photo_gap/2),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 1), (-1, 1), 3),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 3),
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['white']),
        ]))
        elements.append(photos_table)
        elements.append(Spacer(1, 0.2*cm))
        
        elements.append(Spacer(1, 0.4*cm))
        
        # En-tête principal
        fiche_header = self._create_section_header("FICHE DACTYLOSCOPIQUE / FINGERPRINT RECORD", self.page_width)
        elements.append(fiche_header)
        elements.append(Spacer(1, 0.4*cm))
        
        
        from biometrie.models import BiometrieEmpreinte
        try:
            empreintes = BiometrieEmpreinte.objects.filter(
                criminel=self.criminel,
                est_active=True
            )
        except Exception as e:
            logger.warning(f"Erreur lors de la récupération des empreintes: {e}")
            empreintes = BiometrieEmpreinte.objects.none()
        
        finger_names = ['POUCE', 'INDEX', 'MAJEUR', 'ANNULAIRE', 'AURICULAIRE']
        doigts_droits = ['pouce_droit', 'index_droit', 'majeur_droit', 'annulaire_droit', 'auriculaire_droit']
        doigts_gauches = ['pouce_gauche', 'index_gauche', 'majeur_gauche', 'annulaire_gauche', 'auriculaire_gauche']

        elements.append(Paragraph(
            '<b>EMPREINTES DIGITALES / FINGERPRINTS</b>',
            ParagraphStyle(
                'EmpreintesTitle', parent=self.styles['Normal'],
                fontSize=10, fontName='Helvetica-Bold',
                textColor=self.colors['text'], alignment=TA_CENTER, spaceAfter=6,
            ),
        ))
        elements.append(Spacer(1, 0.15 * cm))
        elements.append(self._create_subsection_bar('MAIN DROITE / RIGHT HAND'))
        elements.append(Spacer(1, 0.12 * cm))
        elements.append(self._build_fingerprint_hand(empreintes, doigts_droits, finger_names))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(self._create_subsection_bar('MAIN GAUCHE / LEFT HAND'))
        elements.append(Spacer(1, 0.12 * cm))
        elements.append(self._build_fingerprint_hand(empreintes, doigts_gauches, finger_names))
        elements.append(Spacer(1, 0.2 * cm))
    
    def _collect_complementary_data(self):
        """Regroupe les données complémentaires du formulaire."""
        social_data = []
        statut_mat = self._get_choice_display_safe(
            'statut_matrimonial', getattr(self.criminel, 'statut_matrimonial', None),
        )
        if statut_mat:
            social_data.append(['Statut matrimonial', statut_mat])
        for label, field in [
            ('Partenaire / Conjoint(e)', 'spouse'),
            ('Enfants', 'children'),
            ('Personnes proches', 'personnes_proches'),
            ('Dépendants', 'dependants'),
            ('Fréquentations connues', 'frequentations_connues'),
            ('Endroits fréquentés', 'endroits_frequentes'),
        ]:
            val = self._get_field_value(field)
            if val:
                social_data.append([label, val])

        reseaux = []
        for prefix, field in [
            ('Facebook', 'facebook'), ('Instagram', 'instagram'), ('TikTok', 'tiktok'),
            ('X (Twitter)', 'twitter_x'), ('WhatsApp', 'whatsapp'), ('Telegram', 'telegram'),
            ('Email', 'email'),
        ]:
            val = self._get_field_value(field)
            if val:
                reseaux.append(f'{prefix}: {val}')
        autres = self._get_field_value('autres_reseaux')
        if autres:
            reseaux.append(f'Autres: {autres}')
        if reseaux:
            social_data.append(['Réseaux sociaux', ' | '.join(reseaux)])

        habitudes = []
        if getattr(self.criminel, 'consommation_alcool', False):
            habitudes.append("Consommation d'alcool")
        if getattr(self.criminel, 'consommation_drogues', False):
            habitudes.append('Consommation de drogues')
        if habitudes:
            social_data.append(['Habitudes', ', '.join(habitudes)])

        deplacements_data = []
        for label, field in [
            ('Adresse actuelle', 'adresse'),
            ('Anciennes adresses', 'anciennes_adresses'),
            ('Adresses secondaires', 'adresses_secondaires'),
            ('Lieux visités fréquemment', 'lieux_visites_frequemment'),
            ('Véhicules associés', 'vehicules_associes'),
            ("Plaques d'immatriculation", 'plaques_immatriculation'),
            ('Permis de conduire', 'permis_conduire'),
            ('Trajets habituels', 'trajets_habituels'),
        ]:
            val = self._get_field_value(field)
            if val:
                deplacements_data.append([label, val])

        profession_data = []
        for label, field in [
            ('Emploi actuel', 'profession'),
            ('Service militaire', 'service_militaire'),
            ('Emplois précédents', 'emplois_precedents'),
            ('Sources de revenus', 'sources_revenus'),
            ('Entreprises associées', 'entreprises_associees'),
            ('Comptes bancaires', 'comptes_bancaires'),
            ('Biens ou propriétés', 'biens_proprietes'),
            ('Dettes importantes', 'dettes_importantes'),
            ('Transactions suspectes', 'transactions_suspectes'),
        ]:
            val = self._get_field_value(field)
            if val:
                profession_data.append([label, val])

        reseau_data = []
        for label, field in [
            ('Partenaire affectif', 'partenaire_affectif'),
            ('Famille proche', 'famille_proche'),
            ('Amis proches', 'amis_proches'),
            ('Relations à risque', 'relations_risque'),
            ('Suspects associés', 'suspects_associes'),
            ("Membres d'un réseau criminel", 'membres_reseau_criminel'),
            ('Complices potentiels', 'complices_potentiels'),
            ('Contacts récurrents', 'contacts_recurrents'),
        ]:
            val = self._get_field_value(field)
            if val:
                reseau_data.append([label, val])

        return {
            'social': social_data,
            'deplacements': deplacements_data,
            'profession': profession_data,
            'reseau': reseau_data,
        }

    def _append_complementary_section(self, elements, title, data, width):
        elements.append(self._create_section_header(title, width))
        elements.append(Spacer(1, 0.12 * cm))
        if data:
            table = self._create_form_table(data, width)
            if table:
                elements.append(table)
            else:
                self._append_no_data_block(elements, width)
        else:
            self._append_no_data_block(elements, width)
        elements.append(Spacer(1, 0.22 * cm))

    def _build_column_cell(self, sections, width):
        """Empile des sections dans une colonne."""
        cell_table = Table([[item] for item in sections], colWidths=[width])
        cell_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        return cell_table

    def _compute_page2_box_heights(self):
        """Hauteurs palmaire et contrôle pour tenir sur une seule page A4."""
        usable_h = A4[1] - self.doc.topMargin - self.doc.bottomMargin
        overhead = (
            1.0 * cm    # en-tête palmaire
            + 0.15 * cm
            + 0.45 * cm # labels paumes
            + 0.15 * cm
            + 0.65 * cm # titre contrôle
            + 0.55 * cm # labels contrôle
            + 0.7 * cm  # paddings tableaux
        )
        remaining = max((usable_h - overhead) * 0.97, 12 * cm)
        paume_h = remaining * 0.54
        control_h = remaining * 0.46
        return paume_h, control_h

    def _build_paumes_table(self, paume_droite, paume_gauche, paume_width, paume_height, paume_gap):
        """Tableau palmaire avec une seule bordure par case (sans cadre doublé)."""
        empty_cell = Paragraph('', self.value_style)
        paume_row = []
        label_row = []

        for paume_obj, label_text in [
            (paume_droite, 'PAUME DROITE'),
            (paume_gauche, 'PAUME GAUCHE'),
        ]:
            cell_content = empty_cell
            if paume_obj and paume_obj.image:
                try:
                    image_path = self.get_image_path(paume_obj.image)
                    if image_path:
                        optimized_img = self.optimize_image_for_pdf(
                            image_path, max_width=1500, max_height=1800,
                        )
                        if optimized_img:
                            cell_content = RLImage(
                                optimized_img, width=paume_width, height=paume_height,
                            )
                except Exception as e:
                    logger.error(f"Erreur paume {label_text}: {e}")

            paume_row.append(cell_content)
            label_row.append(Paragraph(
                f'<b><font size=8>{label_text}</font></b>',
                ParagraphStyle(
                    'PaumeLabel', parent=self.styles['Normal'],
                    alignment=TA_CENTER, fontSize=8,
                    fontName='Helvetica-Bold', textColor=self.colors['text'],
                ),
            ))

        paumes_table = Table(
            [paume_row, label_row],
            colWidths=[paume_width, paume_width],
            rowHeights=[paume_height, 0.45 * cm],
        )
        paumes_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, self.colors['border']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
            ('VALIGN', (0, 1), (-1, 1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, -1), 0),
            ('RIGHTPADDING', (0, 0), (0, -1), paume_gap / 2),
            ('LEFTPADDING', (1, 0), (1, -1), paume_gap / 2),
            ('RIGHTPADDING', (1, 0), (1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
        ]))
        return paumes_table

    def _build_control_prints_table(self, box_h):
        """Grille contrôle : MAIN GAUCHE | POUCE G | POUCE D | MAIN DROITE — bordure unique."""
        main_w = self.page_width * 0.40
        pouce_w = self.page_width * 0.10
        header_h = 0.65 * cm
        footer_h = 0.55 * cm

        control_title_style = ParagraphStyle(
            'ControlTitle', parent=self.styles['Normal'],
            fontSize=10, fontName='Helvetica-Bold',
            textColor=self.colors['text'], alignment=TA_CENTER,
        )
        control_label_style = ParagraphStyle(
            'ControlFooterLabel', parent=self.label_style,
            fontSize=9, fontName='Helvetica-Bold', alignment=TA_CENTER,
        )
        empty_cell = Paragraph('', self.value_style)

        control_data = [
            [Paragraph('<b>EMPREINTES DE CONTRÔLE</b>', control_title_style), '', '', ''],
            [empty_cell, empty_cell, empty_cell, empty_cell],
            [
                Paragraph('<b>MAIN GAUCHE</b>', control_label_style),
                Paragraph('<b>POUCES</b>', control_label_style),
                '',
                Paragraph('<b>MAIN DROITE</b>', control_label_style),
            ],
        ]
        control_table = Table(
            control_data,
            colWidths=[main_w, pouce_w, pouce_w, main_w],
            rowHeights=[header_h, box_h, footer_h],
        )
        control_table.setStyle(TableStyle([
            ('SPAN', (0, 0), (3, 0)),
            ('SPAN', (1, 2), (2, 2)),
            ('GRID', (0, 0), (-1, -1), 1, self.colors['border']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['background_section']),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        return control_table

    def generate_page_2(self, elements):
        """
        PAGE 2: Empreintes palmaires + Empreintes de contrôle sur une seule page.
        """
        from biometrie.models import BiometriePaume

        paumes = BiometriePaume.objects.filter(criminel=self.criminel, est_active=True)
        paume_droite = paumes.filter(paume='paume_droite').first()
        paume_gauche = paumes.filter(paume='paume_gauche').first()

        paume_height, control_box_h = self._compute_page2_box_heights()
        paume_gap = 0.6 * cm
        paume_width = (self.page_width - paume_gap) / 2

        page2_blocks = [
            self._create_section_header("EMPREINTES PALMAIRES / PALM PRINTS", self.page_width),
            Spacer(1, 0.15 * cm),
            self._build_paumes_table(
                paume_droite, paume_gauche, paume_width, paume_height, paume_gap,
            ),
            Spacer(1, 0.15 * cm),
            self._build_control_prints_table(control_box_h),
        ]

        elements.append(PageBreak())
        elements.append(KeepTogether(page2_blocks))
    
    def generate_page_3(self, elements):
        """PAGE 3 : Informations complémentaires en 2 colonnes + signature."""
        elements.append(PageBreak())
        elements.append(self._create_section_header("INFORMATIONS COMPLÉMENTAIRES", self.page_width))
        elements.append(Spacer(1, 0.25 * cm))

        data = self._collect_complementary_data()
        col_gap = 0.6 * cm
        col_width = (self.page_width - col_gap) / 2

        left_sections = []
        right_sections = []

        for title, key in [
            ("INFORMATIONS PERSONNELLES / SOCIALES", 'social'),
            ("INFORMATIONS PROFESSIONNELLES / FINANCIÈRES", 'profession'),
        ]:
            left_sections.append(self._create_section_header(title, col_width))
            left_sections.append(Spacer(1, 0.1 * cm))
            table = self._create_form_table(data[key], col_width)
            if table:
                left_sections.append(table)
            else:
                left_sections.append(self._no_data_paragraph())
            left_sections.append(Spacer(1, 0.18 * cm))

        for title, key in [
            ("ADRESSE ET DÉPLACEMENTS", 'deplacements'),
            ("RÉSEAU RELATIONNEL", 'reseau'),
        ]:
            right_sections.append(self._create_section_header(title, col_width))
            right_sections.append(Spacer(1, 0.1 * cm))
            table = self._create_form_table(data[key], col_width)
            if table:
                right_sections.append(table)
            else:
                right_sections.append(self._no_data_paragraph())
            right_sections.append(Spacer(1, 0.18 * cm))

        two_col = Table(
            [[self._build_column_cell(left_sections, col_width),
              self._build_column_cell(right_sections, col_width)]],
            colWidths=[col_width, col_width],
        )
        two_col.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (0, -1), 0),
            ('RIGHTPADDING', (0, 0), (0, -1), col_gap / 2),
            ('LEFTPADDING', (1, 0), (1, -1), col_gap / 2),
            ('RIGHTPADDING', (1, 0), (1, -1), 0),
            ('LINEAFTER', (0, 0), (0, -1), 0.5, self.colors['border']),
        ]))
        elements.append(two_col)
        self._append_signature_footer(elements)

    def generate(self):
        """Génère le PDF complet en 3 pages (dossier dactyloscopique officiel)."""
        elements = []
        
        try:
            # Vérifier que le criminel existe et est valide
            if not self.criminel:
                raise ValueError("L'objet criminel est None")
            
            # PAGE 1
            try:
                self.generate_page_1(elements)
            except Exception as e:
                logger.error(f"Erreur lors de la génération de la page 1: {e}", exc_info=True)
                # Ajouter un message d'erreur dans le PDF au lieu de planter
                error_msg = Paragraph(
                    f"<b>Erreur lors de la génération de la page 1:</b> {str(e)}",
                    self.styles['Normal']
                )
                elements.append(error_msg)
            
            # PAGE 2
            try:
                self.generate_page_2(elements)
            except Exception as e:
                logger.error(f"Erreur lors de la génération de la page 2: {e}", exc_info=True)

            # PAGE 3 — Informations complémentaires
            try:
                self.generate_page_3(elements)
            except Exception as e:
                logger.error(f"Erreur lors de la génération de la page 3: {e}", exc_info=True)
            
            # Construire le PDF
            try:
                if not elements:
                    # Si aucun élément n'a été généré, créer un PDF minimal
                    error_para = Paragraph(
                        "<b>Erreur:</b> Impossible de générer le contenu du PDF. Veuillez vérifier les données de la fiche criminelle.",
                        self.styles['Normal']
                    )
                    elements.append(error_para)
                
                self.doc.build(
                    elements,
                    onFirstPage=self._draw_page_footer,
                    onLaterPages=self._draw_page_footer,
                )
            except Exception as e:
                logger.error(f"Erreur lors de la construction du PDF: {e}", exc_info=True)
                raise
            
            # Préparer la réponse
            self.buffer.seek(0)
            
            # Vérifier que le buffer contient des données
            if self.buffer.getvalue() is None or len(self.buffer.getvalue()) == 0:
                raise ValueError("Le buffer PDF est vide")
            
            return self.buffer
            
        except Exception as e:
            logger.error(f"Erreur critique lors de la génération du PDF pour criminel {getattr(self.criminel, 'id', 'N/A')}: {e}", exc_info=True)
            raise


def generate_fiche_criminelle_pdf_v2(criminel, request=None):
    """
    Fonction helper pour générer le PDF version 2.
    
    Args:
        criminel: Instance de CriminalFicheCriminelle
        request: Objet request Django (optionnel)
    
    Returns:
        BytesIO: Buffer contenant le PDF
    
    Raises:
        ValueError: Si le criminel est None ou invalide
        Exception: Pour toute autre erreur lors de la génération
    """
    try:
        if criminel is None:
            raise ValueError("L'objet criminel ne peut pas être None")
        
        if not hasattr(criminel, 'id'):
            raise ValueError("L'objet criminel n'est pas une instance valide de CriminalFicheCriminelle")
        
        generator = FicheCriminellePDFGeneratorV2(criminel, request)
        return generator.generate()
    except Exception as e:
        logger.error(f"Erreur dans generate_fiche_criminelle_pdf_v2: {e}", exc_info=True)
        raise
