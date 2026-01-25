from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from io import BytesIO
from PIL import Image  # type: ignore
from criminel.models import CriminalFicheCriminelle
from django.core.exceptions import ObjectDoesNotExist
from biometrie.models import BiometriePhoto, BiometrieEmpreinte, BiometriePaume
from reportlab.lib import colors  # type: ignore
from reportlab.lib.pagesizes import A4  # type: ignore
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.units import inch, cm  # type: ignore
from reportlab.platypus import (  # type: ignore
    SimpleDocTemplate, Table, TableStyle, Paragraph, 
    Spacer, Image as RLImage, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT  # type: ignore
from reportlab.lib.utils import ImageReader  # type: ignore
import os
from datetime import datetime


def add_cors_headers_to_pdf_response(response, request):
    """
    Ajoute les headers CORS à une réponse HTTP pour le téléchargement PDF.
    """
    origin = request.META.get('HTTP_ORIGIN', '')
    if not origin:
        # Essayer de récupérer depuis Referer
        referer = request.META.get('HTTP_REFERER', '')
        if referer:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
            except:
                pass
    
    # Autoriser toutes les origines locales
    # IMPORTANT: Si Access-Control-Allow-Credentials est true, on ne peut pas utiliser '*'
    if origin and ('localhost' in origin.lower() or '127.0.0.1' in origin.lower()):
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
    elif origin:
        # Pour les autres origines, utiliser l'origine spécifique
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
    else:
        # Si pas d'origine, autoriser toutes sans credentials
        response['Access-Control-Allow-Origin'] = '*'
        # Ne pas mettre credentials à true si on utilise '*'
    
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS, POST, HEAD'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Type, Content-Length'
    response['Access-Control-Max-Age'] = '86400'
    
    return response


class FicheCriminellePDFView(APIView):
    """
    Vue pour générer et télécharger un PDF complet de la fiche criminelle
    incluant la photo principale et toutes les photos biométriques
    """
    permission_classes = [IsAuthenticated]
    
    def options(self, request, criminel_id=None):
        """Gérer les requêtes OPTIONS pour CORS (preflight)"""
        response = Response(status=200)
        
        # Récupérer l'origine
        origin = request.META.get('HTTP_ORIGIN', '')
        if not origin:
            referer = request.META.get('HTTP_REFERER', '')
            if referer:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(referer)
                    origin = f"{parsed.scheme}://{parsed.netloc}"
                except:
                    pass
        
        # Ajouter tous les headers CORS nécessaires
        if origin and ('localhost' in origin.lower() or '127.0.0.1' in origin.lower()):
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        elif origin:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        else:
            response['Access-Control-Allow-Origin'] = '*'
        
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS, POST, HEAD'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRFToken'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Type, Content-Length'
        response['Access-Control-Max-Age'] = '86400'
        
        return response

    def optimize_image_for_pdf(self, image_path, max_width=None, max_height=None):
        """
        Optimise une image pour l'inclusion dans un PDF
        Améliore la qualité et redimensionne si nécessaire
        """
        try:
            img = Image.open(image_path)
            
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            
            # Redimensionner si des dimensions max sont spécifiées
            if max_width and max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Sauvegarder dans un buffer temporaire avec une bonne qualité
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=95, optimize=True)
            buffer.seek(0)
            
            return ImageReader(buffer)
        except Exception as e:
            print(f"Erreur lors de l'optimisation de l'image {image_path}: {str(e)}")
            # Retourner l'image originale en cas d'erreur
            return image_path
    
    def get_photo_principale(self, criminel):
        """Récupère la photo principale du criminel"""
        try:
            if criminel.photo and hasattr(criminel.photo, 'path') and os.path.exists(criminel.photo.path):
                return criminel.photo.path
        except:
            pass
        
        # Si pas de photo principale, essayer de récupérer la première photo biométrique de face
        photo_bio = BiometriePhoto.objects.filter(  # type: ignore
            criminel=criminel, 
            type_photo='face', 
            est_active=True
        ).first()
        
        if photo_bio and photo_bio.image and hasattr(photo_bio.image, 'path'):
            if os.path.exists(photo_bio.image.path):
                return photo_bio.image.path
        
        return None

    def get(self, request, criminel_id):  # type: ignore
        try:
            # Récupérer les informations du criminel
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)  # type: ignore
            
            # Récupérer les photos biométriques
            photos = BiometriePhoto.objects.filter(criminel=criminel, est_active=True)  # type: ignore
            
            # Récupérer les empreintes digitales
            empreintes = BiometrieEmpreinte.objects.filter(criminel=criminel, est_active=True)  # type: ignore
            
            # Récupérer les infractions
            infractions = criminel.infractions.all()
            
            # Créer le buffer pour le PDF
            buffer = BytesIO()
            
            # Créer le document PDF
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm,
                title=f"Fiche Criminelle - {criminel.nom} {criminel.prenom}"
            )
            
            # Container pour les éléments du document
            elements = []
            
            # Styles
            styles = getSampleStyleSheet()
            
            # Style pour le titre principal
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1a1a1a'),
                spaceAfter=12,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
            
            # Style pour les sous-titres
            subtitle_style = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Heading2'],
                fontSize=12,
                textColor=colors.HexColor('#666666'),
                spaceAfter=20,
                alignment=TA_CENTER,
                fontName='Helvetica'
            )
            
            section_style = ParagraphStyle(
                'SectionHeader',
                parent=styles['Heading2'],
                fontSize=15,
                textColor=colors.HexColor('#1a1a1a'),
                spaceAfter=12,
                spaceBefore=15,
                fontName='Helvetica-Bold',
                borderWidth=0,
                borderColor=colors.HexColor('#9ca3af'),
                borderPadding=10,
                backColor=colors.HexColor('#e5e7eb'),
                leftIndent=0,
                rightIndent=0
            )
            
            # Style pour le texte normal
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontSize=10,
                fontName='Helvetica'
            )
            
            # Bannière en-tête avec fond gris clair
            header_banner_style = ParagraphStyle(
                'HeaderBanner',
                parent=title_style,
                fontSize=26,
                textColor=colors.HexColor('#1a1a1a'),
                backColor=colors.HexColor('#DBDBDB'),
                spaceAfter=0,
                spaceBefore=0,
                borderPadding=15,
                leading=32
            )
            
            # Titre principal
            elements.append(Paragraph("FICHE CRIMINELLE", header_banner_style))
            
            # Sous-bannière avec informations
            sub_banner_style = ParagraphStyle(
                'SubBanner',
                parent=subtitle_style,
                fontSize=11,
                textColor=colors.HexColor('#1a1a1a'),
                backColor=colors.HexColor('#DBDBDB'),
                spaceAfter=0,
                borderPadding=10,
                leading=14
            )
            elements.append(Paragraph("Gendarmerie Nationale - Service d'Identification Criminelle", sub_banner_style))
            
            # Ligne de séparation décorative
            elements.append(Spacer(1, 0.05*inch))
            separator_line = Table([['']], colWidths=[16*cm])
            separator_line.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#DBDBDB')),
                ('LINEABOVE', (0, 0), (-1, 0), 4, colors.HexColor('#DBDBDB')),
            ]))
            elements.append(separator_line)
            elements.append(Spacer(1, 0.3*inch))
            
            #PHOTO PRINCIPALE ET INFORMATIONS DE BASE
            photo_principale_path = self.get_photo_principale(criminel)
            
            # Créer un tableau pour la photo et les infos principales
            main_data = []
            
            if photo_principale_path:
                try:
                    # Utiliser l'image optimisée
                    optimized_img = self.optimize_image_for_pdf(photo_principale_path, max_width=800, max_height=1000)
                    img = RLImage(optimized_img, width=4*cm, height=5*cm)
                    
                    # Informations à côté de la photo
                    info_data = [
                        [
                            Paragraph("<b>Numéro de fiche:</b>", normal_style), 
                            Paragraph(criminel.numero_fiche or 'N/A', normal_style)
                        ],
                        [
                            Paragraph("<b>Nom complet:</b>", normal_style), 
                            Paragraph(f"{criminel.nom} {criminel.prenom}", normal_style)
                        ],
                        [
                            Paragraph("<b>CIN:</b>", normal_style), 
                            Paragraph(criminel.cin or 'N/A', normal_style)
                        ],
                        [
                            Paragraph("<b>Date de naissance:</b>", normal_style), 
                            Paragraph(
                                criminel.date_naissance.strftime('%d/%m/%Y') 
                                if criminel.date_naissance else 'N/A', 
                                normal_style
                            )
                        ],
                        [
                            Paragraph("<b>Nationalité:</b>", normal_style), 
                            Paragraph(criminel.nationalite or 'N/A', normal_style)
                        ],
                        [
                            Paragraph("<b>Niveau de danger:</b>", normal_style), 
                            Paragraph(
                                self.get_niveau_danger_display(criminel.niveau_danger), 
                                normal_style
                            )
                        ],
                    ]
                    
                    info_table = Table(info_data, colWidths=[4*cm, 7*cm])
                    info_table.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 5),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    ]))
                    
                    # Tableau principal avec photo et infos
                    main_table = Table([[img, info_table]], colWidths=[4.5*cm, 11.5*cm])
                    main_table.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#9ca3af')),
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
                        ('LEFTPADDING', (0, 0), (-1, -1), 10),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                        ('TOPPADDING', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                    ]))
                    
                    elements.append(main_table)
                    
                except Exception as e:
                    print(f"Erreur lors de l'ajout de la photo principale: {str(e)}")
            
            elements.append(Spacer(1, 0.3*inch))
            
            #INFORMATIONS PERSONNELLES DÉTAILLÉES
            elements.append(Paragraph("INFORMATIONS PERSONNELLES", section_style))
            
            info_data = [
                ['Nom', criminel.nom or 'N/A', 
                 'Prénom', criminel.prenom or 'N/A'],
                ['Surnom/Alias', criminel.surnom or 'N/A', 
                 'Sexe', dict(criminel.SEXE_CHOICES).get(criminel.sexe, 'N/A')],
                ['Date de naissance', 
                 criminel.date_naissance.strftime('%d/%m/%Y') 
                 if criminel.date_naissance else 'N/A', 
                 'Lieu de naissance', criminel.lieu_naissance or 'N/A'],
                ['Nationalité', criminel.nationalite or 'N/A', 
                 'CIN', criminel.cin or 'N/A'],
                ['Nom du père', criminel.nom_pere or 'N/A', 
                 'Nom de la mère', criminel.nom_mere or 'N/A'],
                ['Adresse', criminel.adresse or 'N/A', 
                 'Contact', criminel.contact or 'N/A'],
                ['Profession', criminel.profession or 'N/A', 
                 'Service militaire', criminel.service_militaire or 'N/A'],
            ]
            
            info_table = Table(info_data, colWidths=[3.5*cm, 4.5*cm, 3.5*cm, 4.5*cm])
            info_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
                ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#e5e7eb')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#9ca3af')),
            ]))
            
            elements.append(info_table)
            elements.append(Spacer(1, 0.2*inch))
            
            #DESCRIPTION PHYSIQU
            elements.append(Paragraph("DESCRIPTION PHYSIQUE", section_style))
            
            phys_data = [
                [
                    'Corpulence', 
                    dict(criminel.CORPULENCE_CHOICES).get(
                        criminel.corpulence, 'N/A'
                    ) if criminel.corpulence else 'N/A',
                    'Cheveux', 
                    dict(criminel.CHEVEUX_CHOICES).get(
                        criminel.cheveux, 'N/A'
                    ) if criminel.cheveux else 'N/A'
                ],
                [
                    'Forme du visage', 
                    dict(criminel.VISAGE_CHOICES).get(
                        criminel.visage, 'N/A'
                    ) if criminel.visage else 'N/A',
                    'Barbe/Moustache', 
                    dict(criminel.BARBE_CHOICES).get(
                        criminel.barbe, 'N/A'
                    ) if criminel.barbe else 'N/A'
                ],
            ]
            
            phys_table = Table(phys_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
            phys_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
                ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#e5e7eb')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#9ca3af')),
            ]))
            
            elements.append(phys_table)
            
            if criminel.marques_particulieres:
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph("<b>Marques particulières:</b>", normal_style))
                elements.append(Paragraph(criminel.marques_particulieres, normal_style))
            
            elements.append(Spacer(1, 0.2*inch))
            
            # Style pour le titre bilingue AMÉLIORÉ
            biometric_title_style = ParagraphStyle(
                'BiometricTitle',
                parent=section_style,
                fontSize=16,
                textColor=colors.HexColor('#1a1a1a'),
                backColor=colors.HexColor('#e5e7eb'),
                alignment=TA_CENTER,
                borderPadding=12,
                fontName='Helvetica-Bold'
            )
            
            elements.append(Paragraph("PROFIL BIOMÉTRIQUE / BIOMETRIC PROFILE", biometric_title_style))
            elements.append(Spacer(1, 0.15*inch))
            
            # Note de conformité
            conformite_style = ParagraphStyle(
                'Conformite',
                parent=normal_style,
                fontSize=8,
                textColor=colors.HexColor('#555555'),
                alignment=TA_CENTER,
                fontName='Helvetica-Oblique'
            )
            elements.append(Paragraph(
                "Conforme aux normes Interpol, Europol et ISO/IEC 19794-5 (Facial Image Data)",
                conformite_style
            ))
            elements.append(Spacer(1, 0.15*inch))
            
            if photos.exists():
                # Récupérer les 3 photos principales selon les standards internationaux
                photo_face = photos.filter(type_photo='face', est_active=True).order_by('-qualite').first()
                photo_gauche = photos.filter(type_photo='profil_gauche', est_active=True).order_by('-qualite').first()
                photo_droite = photos.filter(type_photo='profil_droit', est_active=True).order_by('-qualite').first()
                
                # Vérification de la présence des photos
                photos_principales = [
                    ('profil_gauche', photo_gauche, 'Profil Gauche<br/>Left Profile'),
                    ('face', photo_face, 'Face<br/>Front View'),
                    ('profil_droit', photo_droite, 'Profil Droit<br/>Right Profile')
                ]
                
                table_rows = []
                
                for type_key, photo_obj, label_text in photos_principales:
                    if (photo_obj and photo_obj.image and 
                            hasattr(photo_obj.image, 'path') and 
                            os.path.exists(photo_obj.image.path)):
                        try:
                            optimized_img = self.optimize_image_for_pdf(
                                photo_obj.image.path, 
                                max_width=800, 
                                max_height=1000
                            )
                            img = RLImage(optimized_img, width=5*cm, height=6*cm)
                            
                            # Label bilingue
                            label = Paragraph(
                                f"<b>{label_text}</b>",
                                ParagraphStyle(
                                    'BiometricLabel', 
                                    fontSize=10, 
                                    alignment=TA_LEFT, 
                                    fontName='Helvetica-Bold', 
                                    leftIndent=10
                                )
                            )
                            
                            # Informations de qualité et métadonnées
                            if photo_obj.qualite >= 80:
                                qualite_couleur = colors.green
                            elif photo_obj.qualite >= 60:
                                qualite_couleur = colors.orange
                            else:
                                qualite_couleur = colors.red
                            
                            info_text = (
                                f"<font color='#{qualite_couleur.hexval()[2:]}'>"
                                f"<b>Qualité: {photo_obj.qualite}%</b></font><br/>"
                                f"<font size='8'>Date: "
                                f"{photo_obj.date_capture.strftime('%d/%m/%Y à %H:%M')}"
                                f"</font>"
                            )
                            if photo_obj.capture_par:
                                info_text += (
                                    f"<br/><font size='7'>Par: "
                                    f"{photo_obj.capture_par.username}</font>"
                                )
                            
                            info = Paragraph(
                                info_text, 
                                ParagraphStyle(
                                    'BiometricInfo', 
                                    fontSize=9, 
                                    alignment=TA_LEFT, 
                                    leftIndent=10
                                )
                            )
                            
                            table_rows.append([img, Table([[label], [info]], colWidths=[10*cm])])
                            
                        except Exception as e:
                            print(f"Erreur lors de l'ajout de la photo {type_key}: {str(e)}")
                            # Image de remplacement
                            placeholder = Paragraph(
                                "<b>IMAGE NON DISPONIBLE</b>",
                                ParagraphStyle(
                                    'NoImage', 
                                    fontSize=10, 
                                    alignment=TA_CENTER, 
                                    textColor=colors.grey
                                )
                            )
                            label = Paragraph(
                                label_text, 
                                ParagraphStyle(
                                    'Label', 
                                    fontSize=10, 
                                    alignment=TA_LEFT, 
                                    fontName='Helvetica-Bold', 
                                    leftIndent=10
                                )
                            )
                            info = Paragraph(
                                "N/A", 
                                ParagraphStyle(
                                    'Info', 
                                    fontSize=9, 
                                    alignment=TA_LEFT, 
                                    leftIndent=10
                                )
                            )
                            table_rows.append([
                                placeholder, 
                                Table([[label], [info]], colWidths=[10*cm])
                            ])
                    else:
                        # Photo manquante
                        placeholder = Paragraph(
                            "<b>PHOTO MANQUANTE</b>",
                            ParagraphStyle(
                                'Missing', 
                                fontSize=10, 
                                alignment=TA_CENTER, 
                                textColor=colors.HexColor('#d32f2f')
                            )
                        )
                        label = Paragraph(
                            label_text, 
                            ParagraphStyle(
                                'Label', 
                                fontSize=10, 
                                alignment=TA_LEFT, 
                                fontName='Helvetica-Bold', 
                                leftIndent=10
                            )
                        )
                        info = Paragraph(
                            "Non capturée", 
                            ParagraphStyle(
                                'Info', 
                                fontSize=8, 
                                alignment=TA_LEFT, 
                                textColor=colors.red, 
                                leftIndent=10
                            )
                        )
                        table_rows.append([
                            placeholder, 
                            Table([[label], [info]], colWidths=[10*cm])
                        ])
                
                main_biometric_table = Table(
                    table_rows,
                    colWidths=[5.5*cm, 10*cm]
                )
                main_biometric_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, -1), 'CENTER'),    # Photos centrées
                    ('ALIGN', (1, 0), (1, -1), 'LEFT'),       # Infos alignées à gauche
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),   # Tout aligné verticalement au centre
                    ('BOX', (0, 0), (-1, -1), 3, colors.HexColor('#9ca3af')),
                    ('GRID', (0, 0), (-1, -1), 1.5, colors.HexColor('#d1d5db')),
                    ('BACKGROUND', (0, 0), (0, -1), colors.white),  # Colonne photos: blanc
                    ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#f9fafb')),  # Colonne infos: gris très clair
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ]))
                
                elements.append(main_biometric_table)
                elements.append(Spacer(1, 0.15*inch))
                
                # Statistiques de conformité
                nb_photos_principales = sum(1 for _, p, _ in photos_principales if p is not None)
                conformite_text = ""
                
                if nb_photos_principales == 3:
                    conformite_text = " Profil biométrique COMPLET - Conforme aux standards internationaux"
                    conformite_color = colors.HexColor('#2e7d32')
                elif nb_photos_principales >= 2:
                    conformite_text = " Profil biométrique PARTIEL - Compléter les photos manquantes"
                    conformite_color = colors.HexColor('#f57c00')
                else:
                    conformite_text = " Profil biométrique INCOMPLET - Photos biométriques requises"
                    conformite_color = colors.HexColor('#c62828')
                
                status_style = ParagraphStyle(
                    'Status',
                    parent=normal_style,
                    fontSize=10,
                    textColor=conformite_color,
                    alignment=TA_CENTER,
                    fontName='Helvetica-Bold'
                )
                elements.append(Paragraph(conformite_text, status_style))
                elements.append(Spacer(1, 0.1*inch))
                
                autres_photos = photos.exclude(
                    id__in=[p.id for _, p, _ in photos_principales if p is not None]
                ).filter(est_active=True)
                
                if autres_photos.exists():
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(Paragraph(
                        "<b>Photos biométriques supplémentaires / Additional biometric photos:</b>",
                        ParagraphStyle('SubHeader', parent=normal_style, fontSize=11, fontName='Helvetica-Bold')
                    ))
                    elements.append(Spacer(1, 0.1*inch))
                    
                    # Afficher les photos supplémentaires par groupes de 3
                    for i in range(0, len(autres_photos), 3):
                        batch = list(autres_photos[i:i+3])
                        extra_photo_row = []
                        extra_label_row = []
                        
                        for photo in batch:
                            try:
                                if (photo.image and hasattr(photo.image, 'path') and 
                                        os.path.exists(photo.image.path)):
                                    optimized_img = self.optimize_image_for_pdf(
                                        photo.image.path, 
                                        max_width=700, 
                                        max_height=800
                                    )
                                    img = RLImage(optimized_img, width=3.5*cm, height=4*cm)
                                    extra_photo_row.append(img)
                                    
                                    type_display = {
                                        'face_3_4': 'Face 3/4',
                                        'face': 'Face',
                                        'profil_gauche': 'Profil Gauche',
                                        'profil_droit': 'Profil Droit'
                                    }.get(
                                        photo.type_photo, 
                                        photo.type_photo.replace('_', ' ').title()
                                    )
                                    
                                    label_text = (
                                        f"{type_display}<br/>"
                                        f"<font size='6'>"
                                        f"{photo.date_capture.strftime('%d/%m/%Y')}"
                                        f"</font>"
                                    )
                                    extra_label_row.append(
                                        Paragraph(
                                            label_text, 
                                            ParagraphStyle(
                                                'ExtraLabel', 
                                                fontSize=8, 
                                                alignment=TA_CENTER
                                            )
                                        )
                                    )
                            except Exception as e:
                                print(f"Erreur photo supplémentaire {photo.id}: {str(e)}")
                        
                        if extra_photo_row:
                            extra_table = Table(
                                [extra_photo_row, extra_label_row], 
                                colWidths=[4*cm] * len(extra_photo_row)
                            )
                            extra_table.setStyle(TableStyle([
                                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                ('BOX', (0, 0), (-1, -1), 1, colors.grey),
                                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#fafafa')),
                                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                                ('TOPPADDING', (0, 0), (-1, -1), 5),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                            ]))
                            elements.append(extra_table)
                            elements.append(Spacer(1, 0.1*inch))
                
            else:
                # Aucune photo biométrique
                warning_style = ParagraphStyle(
                    'Warning',
                    parent=normal_style,
                    fontSize=11,
                    textColor=colors.HexColor('#d32f2f'),
                    alignment=TA_CENTER,
                    fontName='Helvetica-Bold'
                )
                elements.append(Paragraph(
                    " AUCUNE PHOTO BIOMÉTRIQUE ENREGISTRÉE<br/>NO BIOMETRIC PHOTOS RECORDED",
                    warning_style
                ))
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(
                    "Les photos biométriques (face, profil gauche, profil droit) "
                    "sont requises pour l'identification conforme aux normes "
                    "internationales.",
                    conformite_style
                ))
            
            elements.append(Spacer(1, 0.2*inch))
            
            #EMPREINTES DIGITALES
            # Séparateur visuel avant la section
            elements.append(Spacer(1, 0.05*inch))
            separator = Table([['']], colWidths=[16*cm])
            separator.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e5e7eb')),
                ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#e5e7eb')),
            ]))
            elements.append(separator)
            elements.append(Spacer(1, 0.05*inch))
            
            elements.append(Paragraph("EMPREINTES DIGITALES", section_style))
            
            if empreintes.exists():
                # Créer un dictionnaire des empreintes par doigt
                empreintes_dict = {emp.doigt: emp for emp in empreintes}
                
                doigts_ordre = [
                    [
                        'pouce_gauche', 'index_gauche', 'majeur_gauche', 
                        'annulaire_gauche', 'auriculaire_gauche'
                    ],
                    [
                        'pouce_droit', 'index_droit', 'majeur_droit', 
                        'annulaire_droit', 'auriculaire_droit'
                    ]
                ]
                
                for main_doigts in doigts_ordre:
                    empreinte_row = []
                    label_row = []
                    
                    for doigt in main_doigts:
                        if doigt in empreintes_dict:
                            empreinte = empreintes_dict[doigt]
                            try:
                                if (empreinte.image and 
                                        hasattr(empreinte.image, 'path') and 
                                        os.path.exists(empreinte.image.path)):
                                    optimized_img = self.optimize_image_for_pdf(
                                        empreinte.image.path, 
                                        max_width=500, 
                                        max_height=500
                                    )
                                    img = RLImage(
                                        optimized_img, 
                                        width=2.5*cm, 
                                        height=2.5*cm
                                    )
                                    empreinte_row.append(img)
                                else:
                                    empreinte_row.append(
                                        Paragraph(
                                            "N/D", 
                                            ParagraphStyle(
                                                'Center', 
                                                alignment=TA_CENTER, 
                                                fontSize=8
                                            )
                                        )
                                    )
                            except Exception as e:
                                print(f"Erreur empreinte {doigt}: {str(e)}")
                                empreinte_row.append(
                                    Paragraph(
                                        "N/D", 
                                        ParagraphStyle(
                                            'Center', 
                                            alignment=TA_CENTER, 
                                            fontSize=8
                                        )
                                    )
                                )
                        else:
                            empreinte_row.append(
                                Paragraph(
                                    "N/D", 
                                    ParagraphStyle(
                                        'Center', 
                                        alignment=TA_CENTER, 
                                        fontSize=8
                                    )
                                )
                            )
                        
                        doigt_display = doigt.replace('_', ' ').title()
                        label_row.append(
                            Paragraph(
                                doigt_display, 
                                ParagraphStyle(
                                    'EmpreinteLabel', 
                                    fontSize=7, 
                                    alignment=TA_CENTER
                                )
                            )
                        )
                    
                    empreintes_table = Table([empreinte_row, label_row], colWidths=[3*cm] * 5)
                    empreintes_table.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#9ca3af')),
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#e5e7eb')),
                        ('LEFTPADDING', (0, 0), (-1, -1), 3),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ]))
                    elements.append(empreintes_table)
                    elements.append(Spacer(1, 0.1*inch))
            else:
                elements.append(Paragraph("Aucune empreinte digitale enregistrée.", normal_style))
            
            elements.append(Spacer(1, 0.3*inch))
            
            #EMPREINTES PALMAIRES
            # Séparateur visuel avant la section
            elements.append(Spacer(1, 0.05*inch))
            separator = Table([['']], colWidths=[16*cm])
            separator.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e5e7eb')),
                ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#e5e7eb')),
            ]))
            elements.append(separator)
            elements.append(Spacer(1, 0.05*inch))
            
            elements.append(Paragraph("EMPREINTES PALMAIRES / PALM PRINTS", section_style))
            elements.append(Spacer(1, 0.1*inch))
            
            # Récupérer les empreintes palmaires
            paumes = BiometriePaume.objects.filter(criminel=criminel, est_active=True)  # type: ignore
            
            if paumes.exists():
                paume_droite = paumes.filter(paume='paume_droite').first()
                paume_gauche = paumes.filter(paume='paume_gauche').first()
                
                # Créer le tableau pour les deux paumes côte à côte
                paume_row = []
                label_row = []
                spec_row = []
                qualite_row = []
                
                for paume_obj, label_text in [(paume_droite, 'PAUME DROITE / RIGHT PALM'), 
                                                (paume_gauche, 'PAUME GAUCHE / LEFT PALM')]:
                    # Titre de la paume
                    titre_style = ParagraphStyle(
                        'PaumeTitre',
                        parent=normal_style,
                        fontSize=12,
                        fontName='Helvetica-Bold',
                        alignment=TA_CENTER,
                        textColor=colors.HexColor('#1565c0'),
                        spaceAfter=8
                    )
                    
                    if (paume_obj and paume_obj.image and 
                            hasattr(paume_obj.image, 'path') and 
                            os.path.exists(paume_obj.image.path)):
                        try:
                            optimized_img = self.optimize_image_for_pdf(
                                paume_obj.image.path, 
                                max_width=1200, 
                                max_height=1600
                            )
                            img = RLImage(optimized_img, width=6*cm, height=8*cm)
                            paume_row.append(img)
                        except Exception as e:
                            print(f"Erreur chargement paume: {str(e)}")
                            # Placeholder si erreur
                            placeholder = Paragraph(
                                "<b>IMAGE<br/>NON DISPONIBLE</b>",
                                ParagraphStyle(
                                    'PlaceholderPaume', 
                                    fontSize=10, 
                                    alignment=TA_CENTER, 
                                    textColor=colors.grey
                                )
                            )
                            paume_row.append(placeholder)
                    else:
                        placeholder_style = ParagraphStyle(
                            'PlaceholderPaume',
                            fontSize=9,
                            alignment=TA_CENTER,
                            textColor=colors.HexColor('#cccccc'),
                            leading=20
                        )
                        placeholder_text = "<br/><br/><br/><i>Image 1500x2000px min.</i><br/><br/><br/><br/>"
                        paume_row.append(Paragraph(placeholder_text, placeholder_style))
                    
                    # Label bilingue
                    label_row.append(Paragraph(f"<b>{label_text}</b>", titre_style))
                    
                    # Spécifications
                    if paume_obj and paume_obj.resolution:
                        spec_text = f"<i>Résolution: {paume_obj.resolution}</i>"
                    else:
                        spec_text = "<i>Image 1500x2000px min.</i>"
                    spec_row.append(
                        Paragraph(
                            spec_text, 
                            ParagraphStyle(
                                'Spec', 
                                fontSize=8, 
                                alignment=TA_CENTER, 
                                textColor=colors.grey
                            )
                        )
                    )
                    
                    # Qualité
                    if paume_obj:
                        qualite_text = f"<b>Qualité: {paume_obj.qualite}/10</b>"
                        if paume_obj.qualite >= 7:
                            qualite_color = colors.HexColor('#2e7d32')
                        elif paume_obj.qualite >= 5:
                            qualite_color = colors.HexColor('#f57c00')
                        else:
                            qualite_color = colors.HexColor('#c62828')
                    else:
                        qualite_text = "Qualité: __/10"
                        qualite_color = colors.grey
                    
                    qualite_style = ParagraphStyle(
                        'Qualite', 
                        fontSize=9, 
                        alignment=TA_CENTER, 
                        textColor=qualite_color, 
                        fontName='Helvetica-Bold'
                    )
                    qualite_row.append(Paragraph(qualite_text, qualite_style))
                
                # Créer le tableau principal
                paumes_table = Table(
                    [label_row, paume_row, spec_row, qualite_row],
                    colWidths=[7.5*cm, 7.5*cm]
                )
                paumes_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('BOX', (0, 0), (-1, -1), 3, colors.HexColor('#9ca3af')),
                    ('GRID', (0, 0), (-1, -1), 1.5, colors.HexColor('#d1d5db')),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),  # Ligne des titres
                    ('BACKGROUND', (0, 1), (-1, 1), colors.white),  # Ligne des images
                    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#f3f4f6')),  # Ligne des specs
                    ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#f9fafb')),  # Ligne des qualités
                    ('LEFTPADDING', (0, 0), (-1, -1), 12),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                    ('TOPPADDING', (0, 0), (-1, -1), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                    ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#9ca3af')),
                ]))
                
                elements.append(paumes_table)
                
                # Note informative
                note_style = ParagraphStyle(
                    'NotePaume',
                    parent=normal_style,
                    fontSize=8,
                    textColor=colors.HexColor('#666666'),
                    alignment=TA_CENTER,
                    fontName='Helvetica-Oblique'
                )
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(
                    "Les empreintes palmaires complètent l'identification "
                    "dactyloscopique pour une reconnaissance biométrique avancée.",
                    note_style
                ))
                
            else:
                # Aucune empreinte palmaire
                warning_palmaire_style = ParagraphStyle(
                    'WarningPalmaire',
                    parent=normal_style,
                    fontSize=10,
                    textColor=colors.HexColor('#f57c00'),
                    alignment=TA_CENTER
                )
                elements.append(Paragraph(" Aucune empreinte palmaire enregistrée.", warning_palmaire_style))
            
            elements.append(Spacer(1, 0.3*inch))
            
            #INFORMATIONS JUDICIAIRES
            elements.append(Paragraph("INFORMATIONS JUDICIAIRES", section_style))
            
            jud_data = [
                [
                    'Date d\'arrestation', 
                    criminel.date_arrestation.strftime('%d/%m/%Y') 
                    if criminel.date_arrestation else 'N/A',
                    'Lieu d\'arrestation', 
                    criminel.lieu_arrestation or 'N/A'
                ],
                [
                    'Unité saisie', criminel.unite_saisie or 'N/A', 
                    'Référence P.V', criminel.reference_pv or 'N/A'
                ],
                [
                    'Peine encourue', criminel.peine_encourue or 'N/A', 
                    'Niveau de danger', 
                    self.get_niveau_danger_display(criminel.niveau_danger)
                ],
            ]
            
            jud_table = Table(jud_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
            jud_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
                ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#e5e7eb')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#9ca3af')),
            ]))
            
            elements.append(jud_table)
            
            if criminel.motif_arrestation:
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph("<b>Motif de l'arrestation:</b>", normal_style))
                elements.append(Paragraph(criminel.motif_arrestation, normal_style))
            
            if criminel.suite_judiciaire:
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph("<b>Suite judiciaire:</b>", normal_style))
                elements.append(Paragraph(criminel.suite_judiciaire, normal_style))
            
            if criminel.antecedent_judiciaire:
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph("<b>Antécédents judiciaires:</b>", normal_style))
                elements.append(Paragraph(criminel.antecedent_judiciaire, normal_style))
            
            #INFRACTIONS
            if infractions.exists():
                elements.append(PageBreak())
                elements.append(Paragraph("HISTORIQUE DES INFRACTIONS", section_style))
                
                for infraction in infractions:
                    infr_data = [
                        [
                            'Date', 
                            infraction.date_infraction.strftime('%d/%m/%Y'), 
                            'Lieu', 
                            infraction.lieu
                        ],
                        [
                            'Type', 
                            str(infraction.type_infraction), 
                            'Statut', 
                            str(infraction.statut_affaire) 
                            if infraction.statut_affaire else 'N/A'
                        ],
                    ]
                    
                    if infraction.description:
                        infr_data.append(['Description', infraction.description, '', ''])
                    
                    infr_table = Table(infr_data, colWidths=[3*cm, 5*cm, 3*cm, 5*cm])
                    infr_table.setStyle(TableStyle([
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
                        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#e5e7eb')),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('SPAN', (1, -1), (3, -1)),  # Merge cells for description
                        ('LEFTPADDING', (0, 0), (-1, -1), 5),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                        ('TOPPADDING', (0, 0), (-1, -1), 5),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#9ca3af')),
                    ]))
                    
                    elements.append(infr_table)
                    elements.append(Spacer(1, 0.15*inch))
            
            #FOOTER
            elements.append(Spacer(1, 0.3*inch))
            
            # Informations de génération avec utilisateur et rôle
            footer_info = []
            if request.user and request.user.is_authenticated:
                user = request.user
                user_name = user.get_full_name() or getattr(user, 'nom', '') or user.username
                user_role = getattr(user, 'role', '')
                
                # Formater le rôle pour l'affichage
                role_display = ''
                if user_role:
                    # Mapping des rôles actifs pour l'affichage
                    role_mapping = {
                        # Enquêteur Principal
                        'Enquêteur Principal': 'Enquêteur Principal',
                        'enqueteur': 'Enquêteur Principal',
                        # Analyste Judiciaire
                        'Analyste': 'Analyste Judiciaire',
                        'analyste': 'Analyste Judiciaire',
                        # Observateur Externe
                        'Observateur': 'Observateur Externe',
                        'observateur': 'Observateur Externe',
                        # Administrateur
                        'Administrateur Système': 'Administrateur Système',
                        'admin': 'Administrateur Système',
                    }
                    role_display = role_mapping.get(user_role, user_role)
                
                if user_name:
                    footer_info.append(f"Généré par: {user_name}")
                if role_display:
                    footer_info.append(f"Rôle: {role_display}")
            
            footer_info.append(f"Date de génération: {datetime.now().strftime('%d/%m/%Y à %H:%M')}")
            
            footer_text = "<b>Gendarmerie Nationale - Service d'Identification Criminelle</b>"
            if footer_info:
                footer_text += "<br/>" + "<br/>".join(footer_info)
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.grey,
                alignment=TA_CENTER
            )
            elements.append(Paragraph(footer_text, footer_style))
            
            # Construire le PDF
            doc.build(elements)
            
            # Préparer la réponse HTTP
            buffer.seek(0)
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            
            # Encoder le nom de fichier pour éviter les problèmes avec les caractères spéciaux
            filename = f'Fiche_Criminelle_{criminel.nom}_{criminel.prenom}.pdf'
            import urllib.parse
            encoded_filename = urllib.parse.quote(filename.encode('utf-8'))
            response['Content-Disposition'] = f'attachment; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}'
            
            # Ajouter les headers CORS pour permettre le téléchargement depuis le frontend
            response = add_cors_headers_to_pdf_response(response, request)
            
            # Enregistrer dans l'audit
            try:
                from audit.utils import log_action_simple
                log_action_simple(
                    action='DOWNLOAD',
                    obj=criminel,
                    additional_info=f"Téléchargement PDF - Fiche: {criminel.numero_fiche or criminel.id}"
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur lors de l'enregistrement dans l'audit: {e}")
            
            return response
            
        except ObjectDoesNotExist:
            error_response = Response(
                {'error': 'Criminel non trouvé'},
                status=404
            )
            # Ajouter les headers CORS à la réponse d'erreur
            for key, value in add_cors_headers_to_pdf_response(HttpResponse(), request).items():
                if key.startswith('Access-Control-'):
                    error_response[key] = value
            return error_response
        except Exception as e:
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur détaillée: {traceback.format_exc()}")
            error_response = Response(
                {'error': f'Erreur lors de la génération du PDF: {str(e)}'},
                status=500
            )
            # Ajouter les headers CORS à la réponse d'erreur
            for key, value in add_cors_headers_to_pdf_response(HttpResponse(), request).items():
                if key.startswith('Access-Control-'):
                    error_response[key] = value
            return error_response
    
    def get_niveau_danger_display(self, niveau):
        """Retourne l'affichage du niveau de danger"""
        niveaux = {
            1: 'Faible',
            2: 'Modéré',
            3: 'Élevé',
            4: 'Très Élevé',
            5: 'Extrême'
        }
        return niveaux.get(niveau, 'Non défini')
