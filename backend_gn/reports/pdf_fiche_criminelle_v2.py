"""
Génération PDF de la fiche criminelle selon format Gendarmerie Nationale.
Format conforme au formulaire officiel "FICHIER CRIMINELLE".

Layout:
- PAGE 1: En-tête + AGRESSION + Identité + Filiation + Coordonnées + Description physique + Dossier judiciaire + Photos + Empreintes digitales
- PAGE 2: Empreintes palmaires + Empreintes de contrôle + Footer
- PAGE 3: Informations personnelles/sociales + Adresse et déplacements + Informations professionnelles/financières + Réseau relationnel
"""

import os
import logging
from io import BytesIO
from datetime import datetime
from PIL import Image
from django.http import HttpResponse
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, Image as RLImage, PageBreak, KeepTogether, Flowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)


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
            bottomMargin=1.0*cm
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
                logger.warning(f"⚠ Champ {field_name} n'existe pas dans le modèle")
                return default
            
            # Récupérer la valeur directement depuis l'objet modèle
            # L'objet a été rechargé depuis la DB dans __init__, donc on a les données à jour
            value = getattr(self.criminel, field_name)
            
            # Si c'est un TextField ou CharField, vérifier même les chaînes avec espaces
            if isinstance(value, str):
                value_stripped = value.strip()
                if value_stripped:
                    logger.debug(f"✓ Champ {field_name} trouvé avec valeur: {value_stripped[:50]}...")
                    return value_stripped
                logger.debug(f"✗ Champ {field_name} est vide ou contient seulement des espaces")
                return default
            
            if value is not None and value != '':
                formatted = self._format_value(value, default)
                logger.debug(f"✓ Champ {field_name} trouvé avec valeur: {formatted[:50]}...")
                return formatted
            else:
                logger.debug(f"✗ Champ {field_name} est None ou vide")
                return default
        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération du champ {field_name}: {e}", exc_info=True)
        return default
    
    def _get_choice_display_safe(self, choices_attr, value):
        """Récupère la valeur d'affichage d'un choix de manière sécurisée avec les données réelles."""
        if not value:
            return ''
        try:
            if hasattr(self.criminel, choices_attr):
                choices = getattr(self.criminel, choices_attr)
                if choices and isinstance(choices, (list, tuple)):
                    choices_dict = dict(choices)
                    return choices_dict.get(value, str(value))
        except Exception as e:
            logger.warning(f"Erreur lors de la récupération du choix {choices_attr}: {e}")
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
    
    def generate_page_1(self, elements):
        """
        PAGE 1: En-tête + AGRESSION + Identité + Filiation + Coordonnées + Description + Dossier judiciaire + Photos + Empreintes digitales
        """
        # En-tête optimisé selon nouveau design HTML
        logo_cell = Table([[Paragraph("", self.styles['Normal'])]], colWidths=[1.3*cm], rowHeights=[1.6*cm])
        logo_cell.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['white']),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#d4af37')),  # Bordure dorée
        ]))
        
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
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background']),  # Fond blanc
            ('LINEAFTER', (0, 0), (-1, -1), 3, self.colors['accent_border']),  # Bordure gauche dorée subtile
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),  # Bordure légère
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
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
            ['SEXE', self._get_choice_display_safe('SEXE_CHOICES', getattr(self.criminel, 'sexe', None))],
            ['DATE DE NAISSANCE', self._format_date(getattr(self.criminel, 'date_naissance', None), '%d %B %Y')],
            ['LIEU DE NAISSANCE', self._get_field_value('lieu_naissance')],
            ['NATIONALITÉ', self._get_field_value('nationalite')],
            ['N° IDENTITÉ', self._get_field_value('cin')],
        ]
        
        # DESCRIPTION PHYSIQUE - Utiliser les données réelles
        corpulence_value = self._get_choice_display_safe('CORPULENCE_CHOICES', self.criminel.corpulence)
        cheveux_value = self._get_choice_display_safe('CHEVEUX_CHOICES', self.criminel.cheveux)
        visage_value = self._get_choice_display_safe('VISAGE_CHOICES', self.criminel.visage)
        barbe_value = self._get_choice_display_safe('BARBE_CHOICES', self.criminel.barbe)
        
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
            table_data = []
            for label, value in data:
                label_cell = Paragraph(
                    f"<i>{label}</i>",
                    ParagraphStyle('Label', parent=self.styles['Normal'], fontSize=8, textColor=self.colors['text_light'], fontName='Helvetica-Oblique')
                )
                value_cell = Paragraph(
                    f"<b>{value}</b>",
                    ParagraphStyle('Value', parent=self.styles['Normal'], fontSize=10, textColor=self.colors['text'], fontName='Helvetica-Bold')
                )
                table_data.append([label_cell, value_cell])
            
            section_header = self._create_section_header(header_title, width)
            
            label_col_width = 3.7*cm  # 140px ≈ 3.7cm
            value_col_width = width - label_col_width
            data_table = Table(table_data, colWidths=[label_col_width, value_col_width])
            data_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1), [self.colors['white']] * len(table_data)),
                ('LINEBELOW', (0, 0), (-1, -1), 0.5, self.colors['border']),  # Ligne de séparation subtile
                # Séparation entre label et valeur
                ('LINEAFTER', (0, 0), (0, -1), 0.5, self.colors['border']),
            ]))
            
            return [section_header, data_table]
        
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
        
        # Section empreintes digitales avec fond clair
        empreintes_title = Paragraph(
            "<b>EMPREINTES DIGITALES / FINGERPRINTS</b>",
            ParagraphStyle(
                'EmpreintesTitle',
                parent=self.styles['Normal'],
                fontSize=10,
                fontName='Helvetica-Bold',
                textColor=self.colors['text'],
                alignment=TA_CENTER,
                spaceAfter=8
            )
        )
        
        main_droite_header = Paragraph(
            "<b>MAIN DROITE / RIGHT HAND</b>",
            ParagraphStyle(
                'MainHeader',
                parent=self.styles['Normal'],
                fontSize=8,
                fontName='Helvetica-Bold',
                textColor=self.colors['text'],
                alignment=TA_CENTER
            )
        )
        main_droite_header_table = Table([[main_droite_header]], colWidths=[self.page_width])
        main_droite_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background_section']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
        ]))
        elements.append(empreintes_title)
        elements.append(main_droite_header_table)
        elements.append(Spacer(1, 0.15*cm))
        doigts_droits = ['pouce_droit', 'index_droit', 'majeur_droit', 'annulaire_droit', 'auriculaire_droit']
        finger_names = ['POUCE', 'INDEX', 'MAJEUR', 'ANNULAIRE', 'AURICULAIRE']
        finger_codes = ['R1', 'R2', 'R3', 'R4', 'R5']  # Codes selon design HTML
        
        empreinte_row_droite = []
        label_row_droite = []
        
        # Calculer la taille des cases d'empreintes avec espacement bien séparé
        finger_gap = 0.5*cm  # Espacement entre chaque empreinte
        total_finger_width = self.page_width - 2*finger_gap  # Marges extérieures
        finger_box_size = (total_finger_width - 4*finger_gap) / 5  # 5 doigts avec espacement
        
        for doigt, finger_name, finger_code in zip(doigts_droits, finger_names, finger_codes):
            # Créer une case carrée avec l'empreinte à l'intérieur
            empreinte = empreintes.filter(doigt=doigt).first()
            
            # Case avec code du doigt au centre si pas d'image
            if (empreinte and empreinte.image and 
                    hasattr(empreinte.image, 'path') and 
                    os.path.exists(empreinte.image.path)):
                try:
                    optimized_img = self.optimize_image_for_pdf(
                        empreinte.image.path,
                        max_width=2000,
                        max_height=2000
                    )
                    if optimized_img:
                        img = RLImage(optimized_img, width=finger_box_size, height=finger_box_size)
                        cell_content = img
                    else:
                        cell_content = Paragraph(f"<font size=8 color='#999'>{finger_code}</font>", 
                            ParagraphStyle('FingerCode', parent=self.styles['Normal'], fontSize=8, alignment=TA_CENTER))
                except Exception as e:
                    logger.error(f"Erreur empreinte: {e}")
                    cell_content = Paragraph(f"<font size=9 color='#999'>{finger_code}</font>", 
                        ParagraphStyle('FingerCode', parent=self.styles['Normal'], alignment=TA_CENTER))
            else:
                cell_content = Paragraph(f"<font size=9 color='#999'>{finger_code}</font>", 
                    ParagraphStyle('FingerCode', parent=self.styles['Normal'], alignment=TA_CENTER))
            
            # Créer une case avec bordure
            finger_frame = Table([[cell_content]], colWidths=[finger_box_size], rowHeights=[finger_box_size])
            finger_frame.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BACKGROUND', (0, 0), (-1, -1), self.colors['background']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, self.colors['border']),  # Grille interne subtile
            ]))
            
            empreinte_row_droite.append(finger_frame)
            
            label_row_droite.append(Paragraph(
                f"<font size=7 color='#666'>{finger_name}</font>", 
                ParagraphStyle(
                    'FingerLabel',
                    parent=self.styles['Normal'],
                    alignment=TA_CENTER,
                    fontSize=7,
                    textColor=self.colors['text_light']
                )
            ))
        
        # Tableau avec empreintes en haut et labels en bas
        empreintes_table_droite = Table([empreinte_row_droite, label_row_droite], colWidths=[finger_box_size] * 5)
        empreintes_table_droite.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, -1), finger_gap),  # Espacement gauche
            ('RIGHTPADDING', (0, 0), (0, -1), finger_gap/2),  # Espacement entre empreintes
            ('LEFTPADDING', (1, 0), (1, -1), finger_gap/2),
            ('RIGHTPADDING', (1, 0), (1, -1), finger_gap/2),
            ('LEFTPADDING', (2, 0), (2, -1), finger_gap/2),
            ('RIGHTPADDING', (2, 0), (2, -1), finger_gap/2),
            ('LEFTPADDING', (3, 0), (3, -1), finger_gap/2),
            ('RIGHTPADDING', (3, 0), (3, -1), finger_gap/2),
            ('LEFTPADDING', (4, 0), (4, -1), finger_gap/2),
            ('RIGHTPADDING', (4, 0), (4, -1), finger_gap),  # Espacement droite
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
        ]))
        elements.append(empreintes_table_droite)
        elements.append(Spacer(1, 0.15*cm))
        
        main_gauche_header = Paragraph(
            "<b><font size=8 color='#000'>MAIN GAUCHE / LEFT HAND</font></b>",
            ParagraphStyle(
                'MainHeader',
                parent=self.styles['Normal'],
                fontSize=8,
                fontName='Helvetica-Bold',
                textColor=self.colors['white'],
                alignment=TA_CENTER
            )
        )
        main_gauche_header_table = Table([[main_gauche_header]], colWidths=[self.page_width])
        main_gauche_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background_section']),  # Fond léger au lieu de noir
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
        ]))
        elements.append(main_gauche_header_table)
        elements.append(Spacer(1, 0.15*cm))
        
        doigts_gauches = ['pouce_gauche', 'index_gauche', 'majeur_gauche', 'annulaire_gauche', 'auriculaire_gauche']
        finger_codes_gauche = ['L1', 'L2', 'L3', 'L4', 'L5']
        
        empreinte_row_gauche = []
        label_row_gauche = []
        
        for doigt, finger_name, finger_code in zip(doigts_gauches, finger_names, finger_codes_gauche):
            # Créer une case carrée avec l'empreinte à l'intérieur
            empreinte = empreintes.filter(doigt=doigt).first()
            
            if (empreinte and empreinte.image and 
                    hasattr(empreinte.image, 'path') and 
                    os.path.exists(empreinte.image.path)):
                try:
                    optimized_img = self.optimize_image_for_pdf(
                        empreinte.image.path,
                        max_width=2000,
                        max_height=2000
                    )
                    if optimized_img:
                        img = RLImage(optimized_img, width=finger_box_size, height=finger_box_size)
                        cell_content = img
                    else:
                        cell_content = Paragraph(f"<font size=8 color='#999'>{finger_code}</font>", 
                            ParagraphStyle('FingerCode', parent=self.styles['Normal'], fontSize=8, alignment=TA_CENTER))
                except Exception as e:
                    logger.error(f"Erreur empreinte: {e}")
                    cell_content = Paragraph(f"<font size=9 color='#999'>{finger_code}</font>", 
                        ParagraphStyle('FingerCode', parent=self.styles['Normal'], alignment=TA_CENTER))
            else:
                cell_content = Paragraph(f"<font size=9 color='#999'>{finger_code}</font>", 
                    ParagraphStyle('FingerCode', parent=self.styles['Normal'], alignment=TA_CENTER))
            
            # Créer une case avec bordure
            finger_frame = Table([[cell_content]], colWidths=[finger_box_size], rowHeights=[finger_box_size])
            finger_frame.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BACKGROUND', (0, 0), (-1, -1), self.colors['background']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, self.colors['border']),  # Grille interne subtile
            ]))
            
            empreinte_row_gauche.append(finger_frame)
            
            label_row_gauche.append(Paragraph(
                f"<font size=7 color='#666'>{finger_name}</font>", 
                ParagraphStyle(
                    'FingerLabel',
                    parent=self.styles['Normal'],
                    alignment=TA_CENTER,
                    fontSize=7,
                    textColor=self.colors['text_light']
                )
            ))
        
        # Tableau avec empreintes en haut et labels en bas
        empreintes_table_gauche = Table([empreinte_row_gauche, label_row_gauche], colWidths=[finger_box_size] * 5)
        empreintes_table_gauche.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, -1), finger_gap),  # Espacement gauche
            ('RIGHTPADDING', (0, 0), (0, -1), finger_gap/2),  # Espacement entre empreintes
            ('LEFTPADDING', (1, 0), (1, -1), finger_gap/2),
            ('RIGHTPADDING', (1, 0), (1, -1), finger_gap/2),
            ('LEFTPADDING', (2, 0), (2, -1), finger_gap/2),
            ('RIGHTPADDING', (2, 0), (2, -1), finger_gap/2),
            ('LEFTPADDING', (3, 0), (3, -1), finger_gap/2),
            ('RIGHTPADDING', (3, 0), (3, -1), finger_gap/2),
            ('LEFTPADDING', (4, 0), (4, -1), finger_gap/2),
            ('RIGHTPADDING', (4, 0), (4, -1), finger_gap),  # Espacement droite
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
        ]))
        elements.append(empreintes_table_gauche)
        elements.append(Spacer(1, 0.2*cm))
        
        # === INFORMATIONS COMPLÉMENTAIRES ===
        elements.append(Spacer(1, 0.3*cm))
        
        # En-tête principal avec style gris foncé comme les autres sections
        page3_header = self._create_section_header("INFORMATIONS COMPLÉMENTAIRES", self.page_width)
        elements.append(page3_header)
        elements.append(Spacer(1, 0.3*cm))
        
        def create_simple_data_table(data, width):
            """Crée un tableau de données simple."""
            table_data = []
            for label, value in data:
                label_cell = Paragraph(
                    f"<i>{label}</i>",
                    ParagraphStyle('Label', parent=self.styles['Normal'], fontSize=8, textColor=self.colors['text_light'], fontName='Helvetica-Oblique')
                )
                value_cell = Paragraph(
                    f"<b>{value}</b>",
                    ParagraphStyle('Value', parent=self.styles['Normal'], fontSize=10, textColor=self.colors['text'], fontName='Helvetica-Bold')
                )
                table_data.append([label_cell, value_cell])
            
            label_col_width = 3.7*cm
            value_col_width = width - label_col_width
            table = Table(table_data, colWidths=[label_col_width, value_col_width])
            table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LINEBELOW', (0, 0), (-1, -1), 0.5, self.colors['border']),
                ('LINEAFTER', (0, 0), (0, -1), 0.5, self.colors['border']),
            ]))
            return table
        
        # === INFORMATIONS PERSONNELLES / SOCIALES ===
        social_data = []
        
        # Situation familiale - Récupérer directement les valeurs réelles
        statut_mat = self._get_choice_display_safe('STATUT_MATRIMONIAL_CHOICES', getattr(self.criminel, 'statut_matrimonial', None))
        if statut_mat:
            social_data.append(['Statut matrimonial', statut_mat])
        
        spouse_value = self._get_field_value('spouse')
        if spouse_value:
            social_data.append(['Partenaire / Conjoint(e)', spouse_value])
        
        children_value = self._get_field_value('children')
        if children_value:
            social_data.append(['Enfants', children_value])
        
        personnes_proches_value = self._get_field_value('personnes_proches')
        if personnes_proches_value:
            social_data.append(['Personnes proches', personnes_proches_value])
        
        dependants_value = self._get_field_value('dependants')
        if dependants_value:
            social_data.append(['Dépendants', dependants_value])
        
        # Réseaux sociaux - Récupérer toutes les valeurs réelles
        reseaux_sociaux = []
        facebook_value = self._get_field_value('facebook')
        if facebook_value:
            reseaux_sociaux.append(f"Facebook: {facebook_value}")
        instagram_value = self._get_field_value('instagram')
        if instagram_value:
            reseaux_sociaux.append(f"Instagram: {instagram_value}")
        tiktok_value = self._get_field_value('tiktok')
        if tiktok_value:
            reseaux_sociaux.append(f"TikTok: {tiktok_value}")
        twitter_value = self._get_field_value('twitter_x')
        if twitter_value:
            reseaux_sociaux.append(f"X (Twitter): {twitter_value}")
        whatsapp_value = self._get_field_value('whatsapp')
        if whatsapp_value:
            reseaux_sociaux.append(f"WhatsApp: {whatsapp_value}")
        telegram_value = self._get_field_value('telegram')
        if telegram_value:
            reseaux_sociaux.append(f"Telegram: {telegram_value}")
        email_value = self._get_field_value('email')
        if email_value:
            reseaux_sociaux.append(f"Email: {email_value}")
        autres_reseaux_value = self._get_field_value('autres_reseaux')
        if autres_reseaux_value:
            reseaux_sociaux.append(f"Autres: {autres_reseaux_value}")
        
        if reseaux_sociaux:
            social_data.append(['Réseaux sociaux', ' | '.join(reseaux_sociaux)])
        
        # Habitudes - Récupérer les valeurs booléennes
        habitudes = []
        if getattr(self.criminel, 'consommation_alcool', False):
            habitudes.append('Consommation d\'alcool')
        if getattr(self.criminel, 'consommation_drogues', False):
            habitudes.append('Consommation de drogues')
        if habitudes:
            social_data.append(['Habitudes', ', '.join(habitudes)])
        
        frequentations_value = self._get_field_value('frequentations_connues')
        if frequentations_value:
            social_data.append(['Fréquentations connues', frequentations_value])
        
        endroits_value = self._get_field_value('endroits_frequentes')
        if endroits_value:
            social_data.append(['Endroits fréquentés', endroits_value])
        
        # Toujours afficher la section même si vide
        social_header = self._create_section_header("INFORMATIONS PERSONNELLES / SOCIALES", self.page_width)
        elements.append(social_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if social_data:
            social_table = create_simple_data_table(social_data, self.page_width)
            elements.append(social_table)
        else:
            # Afficher un message si aucune donnée
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # === ADRESSE ET DÉPLACEMENTS ===
        deplacements_data = []
        
        # Adresse actuelle
        adresse_actuelle_value = self._get_field_value('adresse')
        if adresse_actuelle_value:
            deplacements_data.append(['Adresse actuelle', adresse_actuelle_value])
        
        anciennes_adresses_value = self._get_field_value('anciennes_adresses')
        if anciennes_adresses_value:
            deplacements_data.append(['Anciennes adresses', anciennes_adresses_value])
        
        adresses_secondaires_value = self._get_field_value('adresses_secondaires')
        if adresses_secondaires_value:
            deplacements_data.append(['Adresses secondaires', adresses_secondaires_value])
        
        lieux_visites_value = self._get_field_value('lieux_visites_frequemment')
        if lieux_visites_value:
            deplacements_data.append(['Lieux visités fréquemment', lieux_visites_value])
        
        vehicules_value = self._get_field_value('vehicules_associes')
        if vehicules_value:
            deplacements_data.append(['Véhicules associés', vehicules_value])
        
        plaques_value = self._get_field_value('plaques_immatriculation')
        if plaques_value:
            deplacements_data.append(["Plaques d'immatriculation", plaques_value])
        
        permis_value = self._get_field_value('permis_conduire')
        if permis_value:
            deplacements_data.append(['Permis de conduire', permis_value])
        
        trajets_value = self._get_field_value('trajets_habituels')
        if trajets_value:
            deplacements_data.append(['Trajets habituels', trajets_value])
        
        # Toujours afficher la section
        logger.info(f"ADRESSE ET DÉPLACEMENTS: {len(deplacements_data)} données récupérées")
        deplacements_header = self._create_section_header("ADRESSE ET DÉPLACEMENTS", self.page_width)
        elements.append(deplacements_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if deplacements_data:
            deplacements_table = create_simple_data_table(deplacements_data, self.page_width)
            elements.append(deplacements_table)
        else:
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # === INFORMATIONS PROFESSIONNELLES / FINANCIÈRES ===
        profession_data = []
        
        emplois_value = self._get_field_value('emplois_precedents')
        if emplois_value:
            profession_data.append(['Emplois précédents', emplois_value])
        
        sources_revenus_value = self._get_field_value('sources_revenus')
        if sources_revenus_value:
            profession_data.append(['Sources de revenus', sources_revenus_value])
        
        entreprises_value = self._get_field_value('entreprises_associees')
        if entreprises_value:
            profession_data.append(['Entreprises associées', entreprises_value])
        
        comptes_value = self._get_field_value('comptes_bancaires')
        if comptes_value:
            profession_data.append(['Comptes bancaires', comptes_value])
        
        biens_value = self._get_field_value('biens_proprietes')
        if biens_value:
            profession_data.append(['Biens ou propriétés', biens_value])
        
        dettes_value = self._get_field_value('dettes_importantes')
        if dettes_value:
            profession_data.append(['Dettes importantes', dettes_value])
        
        transactions_value = self._get_field_value('transactions_suspectes')
        if transactions_value:
            profession_data.append(['Transactions suspectes', transactions_value])
        
        # Toujours afficher la section
        logger.info(f"INFORMATIONS PROFESSIONNELLES / FINANCIÈRES: {len(profession_data)} données récupérées")
        profession_header = self._create_section_header("INFORMATIONS PROFESSIONNELLES / FINANCIÈRES", self.page_width)
        elements.append(profession_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if profession_data:
            profession_table = create_simple_data_table(profession_data, self.page_width)
            elements.append(profession_table)
        else:
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # === RÉSEAU RELATIONNEL ===
        reseau_data = []
        
        partenaire_value = self._get_field_value('partenaire_affectif')
        if partenaire_value:
            reseau_data.append(['Partenaire affectif', partenaire_value])
        
        famille_value = self._get_field_value('famille_proche')
        if famille_value:
            reseau_data.append(['Famille proche', famille_value])
        
        amis_value = self._get_field_value('amis_proches')
        if amis_value:
            reseau_data.append(['Amis proches', amis_value])
        
        relations_risque_value = self._get_field_value('relations_risque')
        if relations_risque_value:
            reseau_data.append(['Relations à risque', relations_risque_value])
        
        suspects_value = self._get_field_value('suspects_associes')
        if suspects_value:
            reseau_data.append(['Suspects associés', suspects_value])
        
        membres_reseau_value = self._get_field_value('membres_reseau_criminel')
        if membres_reseau_value:
            reseau_data.append(["Membres d'un réseau criminel", membres_reseau_value])
        
        complices_value = self._get_field_value('complices_potentiels')
        if complices_value:
            reseau_data.append(['Complices potentiels', complices_value])
        
        contacts_value = self._get_field_value('contacts_recurrents')
        if contacts_value:
            reseau_data.append(['Contacts récurrents', contacts_value])
        
        # Toujours afficher la section
        logger.info(f"RÉSEAU RELATIONNEL: {len(reseau_data)} données récupérées")
        reseau_header = self._create_section_header("RÉSEAU RELATIONNEL", self.page_width)
        elements.append(reseau_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if reseau_data:
            reseau_table = create_simple_data_table(reseau_data, self.page_width)
            elements.append(reseau_table)
        else:
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
    
    def generate_page_2(self, elements):
        """
        PAGE 2: Empreintes palmaires + Empreintes de contrôle + Footer
        """
        elements.append(PageBreak())
        
        paumes_label = Paragraph(
            "<b>EMPREINTES PALMAIRES / PALM PRINTS</b>",
            ParagraphStyle(
                'PaumesLabel',
                parent=self.styles['Normal'],
                fontSize=8,
                fontName='Helvetica-Bold',
                textColor=self.colors['text'],
                alignment=TA_CENTER
            )
        )
        paumes_label_table = Table([[paumes_label]], colWidths=[self.page_width])
        paumes_label_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background_section']),  # Fond léger
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
        ]))
        elements.append(paumes_label_table)
        elements.append(Spacer(1, 0.2*cm))
        
        from biometrie.models import BiometriePaume
        paumes = BiometriePaume.objects.filter(
            criminel=self.criminel,
            est_active=True
        )
        
        paume_droite = paumes.filter(paume='paume_droite').first()
        paume_gauche = paumes.filter(paume='paume_gauche').first()
        
        # Ajuster les tailles pour ratio 120% avec espacement bien séparé
        paume_gap = 1*cm  # Espacement important entre les deux paumes
        total_paume_width = self.page_width - 2*0.5*cm  # Marges extérieures
        paume_width = (total_paume_width - paume_gap) / 2  # 2 paumes avec espacement
        paume_height = paume_width * 1.2  # Ratio 120%
        
        # Reconstruire avec les bonnes tailles
        paume_row = []
        label_row = []
        
        for paume_obj, label_text in [
            (paume_droite, 'PAUME DROITE'),
            (paume_gauche, 'PAUME GAUCHE')
        ]:
            image_added = False
            
            if paume_obj and paume_obj.image:
                try:
                    image_path = self.get_image_path(paume_obj.image)
                    if image_path:
                        optimized_img = self.optimize_image_for_pdf(
                            image_path,
                            max_width=1500,
                            max_height=1800
                        )
                        if optimized_img:
                            img = RLImage(optimized_img, width=paume_width, height=paume_height)
                            paume_row.append(img)
                            image_added = True
                except Exception as e:
                    logger.error(f"Erreur paume {label_text}: {e}", exc_info=True)
            
            if not image_added:
                # Case vide avec bordure
                empty_paume = Table([[Paragraph("", self.styles['Normal'])]], colWidths=[paume_width], rowHeights=[paume_height])
                empty_paume.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, self.colors['border'])]))
                paume_row.append(empty_paume)
            
            label_row.append(Paragraph(
                f"<b><font size=8>{label_text}</font></b>", 
                ParagraphStyle(
                    'PaumeLabel',
                    parent=self.styles['Normal'],
                    alignment=TA_CENTER,
                    fontSize=8,
                    fontName='Helvetica-Bold',
                    textColor=self.colors['text']
                )
            ))
        
        paumes_table = Table([paume_row, label_row], colWidths=[paume_width, paume_width])
        paumes_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, self.colors['border']),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
            ('LEFTPADDING', (0, 0), (0, -1), 0.5*cm),  # Marge gauche
            ('RIGHTPADDING', (0, 0), (0, -1), paume_gap/2),  # Espacement entre paumes
            ('LEFTPADDING', (1, 0), (1, -1), paume_gap/2),
            ('RIGHTPADDING', (1, 0), (1, -1), 0.5*cm),  # Marge droite
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 1), (-1, 1), 3),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 3),
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['background']),
        ]))
        elements.append(paumes_table)
        elements.append(Spacer(1, 0.2*cm))
        
        control_title = Paragraph(
            "<b><font size=9>EMPREINTES DE CONTRÔLE</font></b>",
            ParagraphStyle(
                'ControlTitle',
                parent=self.styles['Normal'],
                fontSize=9,
                fontName='Helvetica-Bold',
                textColor=self.colors['text'],
                alignment=TA_CENTER
            )
        )
        control_title_table = Table([[control_title]], colWidths=[self.page_width])
        control_title_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(control_title_table)
        elements.append(Spacer(1, 0.2*cm))
        
        # Structure en 3 colonnes selon le formulaire:
        
        col_width = 6*cm
        pouce_height = 4*cm
        index_height = 3*cm
        main_height = 7*cm
        
        # Créer les cellules pour chaque empreinte
        empty_cell = Paragraph("", self.value_style)
        
        left_col_data = [
            [Paragraph("<b>MAIN GAUCHE</b>", ParagraphStyle('ControlLabel', parent=self.label_style, fontSize=11, alignment=TA_CENTER))],
            [empty_cell],  # Grande case pour MAIN GAUCHE
            [empty_cell],
            [Paragraph("<b>INDEX GAUCHE</b>", ParagraphStyle('ControlLabel', parent=self.label_style, fontSize=11, alignment=TA_CENTER))],
            [empty_cell],  # Petite case pour INDEX GAUCHE
        ]
        left_col_table = Table(left_col_data, colWidths=[col_width])
        left_col_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 1), (0, 2), 1.5, self.colors['border']),  # MAIN GAUCHE
            ('BOX', (0, 4), (0, 4), 1.5, self.colors['border']),  # INDEX GAUCHE
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (0, 2), 50),  # Hauteur pour MAIN
            ('BOTTOMPADDING', (0, 1), (0, 2), 50),
            ('TOPPADDING', (0, 4), (0, 4), 25),  # Hauteur pour INDEX
            ('BOTTOMPADDING', (0, 4), (0, 4), 25),
            ('BACKGROUND', (0, 0), (0, 0), self.colors['background']),
            ('BACKGROUND', (0, 3), (0, 3), self.colors['background']),
        ]))
        
        center_col_data = [
            [Paragraph("<b>POUCES</b>", ParagraphStyle('ControlLabel', parent=self.label_style, fontSize=11, alignment=TA_CENTER))],
            [Paragraph("<b>GAUCHE</b>", ParagraphStyle('ControlLabel', parent=self.label_style, fontSize=11, alignment=TA_CENTER))],
            [empty_cell],  # Case pour POUCE GAUCHE
            [Paragraph("<b>DROITE</b>", ParagraphStyle('ControlLabel', parent=self.label_style, fontSize=11, alignment=TA_CENTER))],
            [empty_cell],  # Case pour POUCE DROITE
        ]
        center_col_table = Table(center_col_data, colWidths=[col_width])
        center_col_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 2), (0, 2), 1.5, self.colors['border']),  # POUCE GAUCHE
            ('BOX', (0, 4), (0, 4), 1.5, self.colors['border']),  # POUCE DROITE
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 2), (0, 2), 30),
            ('BOTTOMPADDING', (0, 2), (0, 2), 30),
            ('TOPPADDING', (0, 4), (0, 4), 30),
            ('BOTTOMPADDING', (0, 4), (0, 4), 30),
            ('BACKGROUND', (0, 0), (0, 0), self.colors['background']),
            ('BACKGROUND', (0, 1), (0, 1), self.colors['background']),
            ('BACKGROUND', (0, 3), (0, 3), self.colors['background']),
        ]))
        
        right_col_data = [
            [Paragraph("<b>MAIN DROITE</b>", ParagraphStyle('ControlLabel', parent=self.label_style, fontSize=11, alignment=TA_CENTER))],
            [empty_cell],  # Grande case pour MAIN DROITE
            [empty_cell],
            [Paragraph("<b>INDEX DROITE</b>", ParagraphStyle('ControlLabel', parent=self.label_style, fontSize=11, alignment=TA_CENTER))],
            [empty_cell],  # Petite case pour INDEX DROITE
        ]
        right_col_table = Table(right_col_data, colWidths=[col_width])
        right_col_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 1), (0, 2), 1.5, self.colors['border']),  # MAIN DROITE
            ('BOX', (0, 4), (0, 4), 1.5, self.colors['border']),  # INDEX DROITE
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (0, 2), 50),  # Hauteur pour MAIN
            ('BOTTOMPADDING', (0, 1), (0, 2), 50),
            ('TOPPADDING', (0, 4), (0, 4), 25),  # Hauteur pour INDEX
            ('BOTTOMPADDING', (0, 4), (0, 4), 25),
            ('BACKGROUND', (0, 0), (0, 0), self.colors['background']),
            ('BACKGROUND', (0, 3), (0, 3), self.colors['background']),
        ]))
        
        # Créer le tableau principal en 3 colonnes
        control_prints_table = Table([[left_col_table, center_col_table, right_col_table]], colWidths=[col_width, col_width, col_width])
        control_prints_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(control_prints_table)
        
        # Footer
        elements.append(Spacer(1, 0.6*cm))
        
        footer_para = Paragraph(
            "<b>Gendarmerie Nationale - Service d'Identification Criminelle</b>",
            ParagraphStyle(
                'Footer',
                parent=self.styles['Normal'],
                fontSize=8,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#000000'),
                alignment=TA_CENTER
            )
        )
        footer_table = Table([[footer_para]], colWidths=[self.page_width])
        footer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background_section']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEABOVE', (0, 0), (-1, 0), 1.5, self.colors['border']),  # Ligne plus subtile
        ]))
        elements.append(footer_table)
    
    def generate_page_3(self, elements):
        """
        PAGE 3: Informations personnelles/sociales + Adresse et déplacements + 
        Informations professionnelles/financières + Réseau relationnel
        """
        # Saut de page
        elements.append(PageBreak())
        
        page3_header = Paragraph(
            "<b><font size=12>INFORMATIONS COMPLÉMENTAIRES</font></b>",
            ParagraphStyle(
                'Page3Header',
                parent=self.styles['Normal'],
                fontSize=12,
                fontName='Helvetica-Bold',
                textColor=self.colors['primary'],
                alignment=TA_CENTER,
                spaceAfter=15
            )
        )
        elements.append(page3_header)
        elements.append(Spacer(1, 0.3*cm))
        
        # === INFORMATIONS PERSONNELLES / SOCIALES ===
        social_data = []
        
        # Situation familiale - Récupérer directement les valeurs réelles
        statut_mat = self._get_choice_display_safe('STATUT_MATRIMONIAL_CHOICES', getattr(self.criminel, 'statut_matrimonial', None))
        if statut_mat:
            social_data.append(['Statut matrimonial', statut_mat])
        
        spouse_value = self._get_field_value('spouse')
        if spouse_value:
            social_data.append(['Partenaire / Conjoint(e)', spouse_value])
        
        children_value = self._get_field_value('children')
        if children_value:
            social_data.append(['Enfants', children_value])
        
        personnes_proches_value = self._get_field_value('personnes_proches')
        if personnes_proches_value:
            social_data.append(['Personnes proches', personnes_proches_value])
        
        dependants_value = self._get_field_value('dependants')
        if dependants_value:
            social_data.append(['Dépendants', dependants_value])
        
        # Réseaux sociaux - Récupérer toutes les valeurs réelles
        reseaux_sociaux = []
        facebook_value = self._get_field_value('facebook')
        if facebook_value:
            reseaux_sociaux.append(f"Facebook: {facebook_value}")
        instagram_value = self._get_field_value('instagram')
        if instagram_value:
            reseaux_sociaux.append(f"Instagram: {instagram_value}")
        tiktok_value = self._get_field_value('tiktok')
        if tiktok_value:
            reseaux_sociaux.append(f"TikTok: {tiktok_value}")
        twitter_value = self._get_field_value('twitter_x')
        if twitter_value:
            reseaux_sociaux.append(f"X (Twitter): {twitter_value}")
        whatsapp_value = self._get_field_value('whatsapp')
        if whatsapp_value:
            reseaux_sociaux.append(f"WhatsApp: {whatsapp_value}")
        telegram_value = self._get_field_value('telegram')
        if telegram_value:
            reseaux_sociaux.append(f"Telegram: {telegram_value}")
        email_value = self._get_field_value('email')
        if email_value:
            reseaux_sociaux.append(f"Email: {email_value}")
        autres_reseaux_value = self._get_field_value('autres_reseaux')
        if autres_reseaux_value:
            reseaux_sociaux.append(f"Autres: {autres_reseaux_value}")
        
        if reseaux_sociaux:
            social_data.append(['Réseaux sociaux', ' | '.join(reseaux_sociaux)])
        
        # Habitudes - Récupérer les valeurs booléennes
        habitudes = []
        if getattr(self.criminel, 'consommation_alcool', False):
            habitudes.append('Consommation d\'alcool')
        if getattr(self.criminel, 'consommation_drogues', False):
            habitudes.append('Consommation de drogues')
        if habitudes:
            social_data.append(['Habitudes', ', '.join(habitudes)])
        
        frequentations_value = self._get_field_value('frequentations_connues')
        if frequentations_value:
            social_data.append(['Fréquentations connues', frequentations_value])
        
        endroits_value = self._get_field_value('endroits_frequentes')
        if endroits_value:
            social_data.append(['Endroits fréquentés', endroits_value])
        
        def create_simple_data_table(data, width):
            """Crée un tableau de données simple."""
            table_data = []
            for label, value in data:
                label_cell = Paragraph(
                    f"<i>{label}</i>",
                    ParagraphStyle('Label', parent=self.styles['Normal'], fontSize=8, textColor=self.colors['text_light'], fontName='Helvetica-Oblique')
                )
                value_cell = Paragraph(
                    f"<b>{value}</b>",
                    ParagraphStyle('Value', parent=self.styles['Normal'], fontSize=10, textColor=self.colors['text'], fontName='Helvetica-Bold')
                )
                table_data.append([label_cell, value_cell])
            
            label_col_width = 3.7*cm
            value_col_width = width - label_col_width
            table = Table(table_data, colWidths=[label_col_width, value_col_width])
            table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LINEBELOW', (0, 0), (-1, -1), 0.5, self.colors['border']),
                ('LINEAFTER', (0, 0), (0, -1), 0.5, self.colors['border']),
            ]))
            return table
        
        # Toujours afficher la section même si vide
        social_header = self._create_section_header("INFORMATIONS PERSONNELLES / SOCIALES", self.page_width)
        elements.append(social_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if social_data:
            social_table = create_simple_data_table(social_data, self.page_width)
            elements.append(social_table)
        else:
            # Afficher un message si aucune donnée
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
        elements.append(Spacer(1, 0.4*cm))
        
        # === ADRESSE ET DÉPLACEMENTS ===
        deplacements_data = []
        
        # Adresse actuelle
        adresse_actuelle_value = self._get_field_value('adresse')
        if adresse_actuelle_value:
            deplacements_data.append(['Adresse actuelle', adresse_actuelle_value])
        
        anciennes_adresses_value = self._get_field_value('anciennes_adresses')
        if anciennes_adresses_value:
            deplacements_data.append(['Anciennes adresses', anciennes_adresses_value])
        
        adresses_secondaires_value = self._get_field_value('adresses_secondaires')
        if adresses_secondaires_value:
            deplacements_data.append(['Adresses secondaires', adresses_secondaires_value])
        
        lieux_visites_value = self._get_field_value('lieux_visites_frequemment')
        if lieux_visites_value:
            deplacements_data.append(['Lieux visités fréquemment', lieux_visites_value])
        
        vehicules_value = self._get_field_value('vehicules_associes')
        if vehicules_value:
            deplacements_data.append(['Véhicules associés', vehicules_value])
        
        plaques_value = self._get_field_value('plaques_immatriculation')
        if plaques_value:
            deplacements_data.append(["Plaques d'immatriculation", plaques_value])
        
        permis_value = self._get_field_value('permis_conduire')
        if permis_value:
            deplacements_data.append(['Permis de conduire', permis_value])
        
        trajets_value = self._get_field_value('trajets_habituels')
        if trajets_value:
            deplacements_data.append(['Trajets habituels', trajets_value])
        
        # Toujours afficher la section
        logger.info(f"ADRESSE ET DÉPLACEMENTS: {len(deplacements_data)} données récupérées")
        deplacements_header = self._create_section_header("ADRESSE ET DÉPLACEMENTS", self.page_width)
        elements.append(deplacements_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if deplacements_data:
            deplacements_table = create_simple_data_table(deplacements_data, self.page_width)
            elements.append(deplacements_table)
        else:
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
        elements.append(Spacer(1, 0.4*cm))
        
        # === INFORMATIONS PROFESSIONNELLES / FINANCIÈRES ===
        profession_data = []
        
        emplois_value = self._get_field_value('emplois_precedents')
        if emplois_value:
            profession_data.append(['Emplois précédents', emplois_value])
        
        sources_revenus_value = self._get_field_value('sources_revenus')
        if sources_revenus_value:
            profession_data.append(['Sources de revenus', sources_revenus_value])
        
        entreprises_value = self._get_field_value('entreprises_associees')
        if entreprises_value:
            profession_data.append(['Entreprises associées', entreprises_value])
        
        comptes_value = self._get_field_value('comptes_bancaires')
        if comptes_value:
            profession_data.append(['Comptes bancaires', comptes_value])
        
        biens_value = self._get_field_value('biens_proprietes')
        if biens_value:
            profession_data.append(['Biens ou propriétés', biens_value])
        
        dettes_value = self._get_field_value('dettes_importantes')
        if dettes_value:
            profession_data.append(['Dettes importantes', dettes_value])
        
        transactions_value = self._get_field_value('transactions_suspectes')
        if transactions_value:
            profession_data.append(['Transactions suspectes', transactions_value])
        
        # Toujours afficher la section
        logger.info(f"INFORMATIONS PROFESSIONNELLES / FINANCIÈRES: {len(profession_data)} données récupérées")
        profession_header = self._create_section_header("INFORMATIONS PROFESSIONNELLES / FINANCIÈRES", self.page_width)
        elements.append(profession_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if profession_data:
            profession_table = create_simple_data_table(profession_data, self.page_width)
            elements.append(profession_table)
        else:
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
        elements.append(Spacer(1, 0.4*cm))
        
        # === RÉSEAU RELATIONNEL ===
        reseau_data = []
        
        partenaire_value = self._get_field_value('partenaire_affectif')
        if partenaire_value:
            reseau_data.append(['Partenaire affectif', partenaire_value])
        
        famille_value = self._get_field_value('famille_proche')
        if famille_value:
            reseau_data.append(['Famille proche', famille_value])
        
        amis_value = self._get_field_value('amis_proches')
        if amis_value:
            reseau_data.append(['Amis proches', amis_value])
        
        relations_risque_value = self._get_field_value('relations_risque')
        if relations_risque_value:
            reseau_data.append(['Relations à risque', relations_risque_value])
        
        suspects_value = self._get_field_value('suspects_associes')
        if suspects_value:
            reseau_data.append(['Suspects associés', suspects_value])
        
        membres_reseau_value = self._get_field_value('membres_reseau_criminel')
        if membres_reseau_value:
            reseau_data.append(["Membres d'un réseau criminel", membres_reseau_value])
        
        complices_value = self._get_field_value('complices_potentiels')
        if complices_value:
            reseau_data.append(['Complices potentiels', complices_value])
        
        contacts_value = self._get_field_value('contacts_recurrents')
        if contacts_value:
            reseau_data.append(['Contacts récurrents', contacts_value])
        
        # Toujours afficher la section
        logger.info(f"RÉSEAU RELATIONNEL: {len(reseau_data)} données récupérées")
        reseau_header = self._create_section_header("RÉSEAU RELATIONNEL", self.page_width)
        elements.append(reseau_header)
        elements.append(Spacer(1, 0.2*cm))
        
        if reseau_data:
            reseau_table = create_simple_data_table(reseau_data, self.page_width)
            elements.append(reseau_table)
        else:
            no_data_para = Paragraph(
                "<i>Aucune information disponible</i>",
                ParagraphStyle('NoData', parent=self.styles['Normal'], fontSize=9, textColor=self.colors['text_light'], fontName='Helvetica-Oblique', alignment=TA_CENTER)
            )
            no_data_table = Table([[no_data_para]], colWidths=[self.page_width])
            no_data_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(no_data_table)
        
        # Footer pour page 3
        elements.append(Spacer(1, 0.6*cm))
        footer_para = Paragraph(
            "<b>Gendarmerie Nationale - Service d'Identification Criminelle</b>",
            ParagraphStyle(
                'Footer',
                parent=self.styles['Normal'],
                fontSize=8,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#000000'),
                alignment=TA_CENTER
            )
        )
        footer_table = Table([[footer_para]], colWidths=[self.page_width])
        footer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['background_section']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEABOVE', (0, 0), (-1, 0), 1.5, self.colors['border']),
        ]))
        elements.append(footer_table)
    
    def generate(self):
        """Génère le PDF complet en 3 pages (ou plus si nécessaire)."""
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
                # Continuer même si la page 2 échoue
            
            # Construire le PDF
            try:
                if not elements:
                    # Si aucun élément n'a été généré, créer un PDF minimal
                    error_para = Paragraph(
                        "<b>Erreur:</b> Impossible de générer le contenu du PDF. Veuillez vérifier les données de la fiche criminelle.",
                        self.styles['Normal']
                    )
                    elements.append(error_para)
                
                self.doc.build(elements)
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
