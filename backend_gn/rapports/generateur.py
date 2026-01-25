import os
import csv
import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.enums import TA_CENTER
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

logger = logging.getLogger(__name__)


class GenerateurRapport:
    
    def __init__(self, rapport):
        self.rapport = rapport
        self.output_dir = os.path.join(
            settings.MEDIA_ROOT,
            'rapports',
            datetime.now().strftime('%Y'),
            datetime.now().strftime('%m')
        )
        os.makedirs(self.output_dir, exist_ok=True)
    
    def generer(self):
        import time
        start_time = time.time()
        
        try:
            self.rapport.statut = 'en_cours'
            self.rapport.save(update_fields=['statut'])
            
            if self.rapport.type_rapport == 'statistique':
                fichier = self._generer_statistique()
            elif self.rapport.type_rapport == 'criminel':
                fichier = self._generer_criminel()
            elif self.rapport.type_rapport == 'enquete':
                fichier = self._generer_enquete()
            elif self.rapport.type_rapport == 'audit':
                fichier = self._generer_audit()
            else:
                raise ValueError(f"Type de rapport non supporté: {self.rapport.type_rapport}")
            
            if not os.path.exists(fichier):
                raise FileNotFoundError(f"Le fichier généré n'existe pas: {fichier}")
            
            file_size = os.path.getsize(fichier)
            logger.info(f"Fichier généré trouvé: {fichier}, taille: {file_size} bytes")
            logger.info(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
            logger.info(f"output_dir: {self.output_dir}")
            
            try:
                fichier_normalized = os.path.normpath(fichier)
                media_root_normalized = os.path.normpath(settings.MEDIA_ROOT)
                
                if not fichier_normalized.startswith(media_root_normalized):
                    logger.error(f"ERREUR: Le fichier généré n'est pas dans MEDIA_ROOT!")
                    logger.error(f"Fichier: {fichier_normalized}")
                    logger.error(f"MEDIA_ROOT: {media_root_normalized}")
                    raise ValueError(f"Le fichier généré doit être dans MEDIA_ROOT. Fichier: {fichier_normalized}, MEDIA_ROOT: {media_root_normalized}")
                
                rel_path = os.path.relpath(fichier_normalized, media_root_normalized)
                rel_path = rel_path.replace('\\', '/')
                
                logger.info(f"Chemin relatif calculé: {rel_path}")
                
            except (ValueError, OSError) as e:
                logger.error(f"Erreur lors du calcul du chemin relatif: {e}", exc_info=True)
                filename = os.path.basename(fichier)
                rel_path = os.path.join('rapports', datetime.now().strftime('%Y'), datetime.now().strftime('%m'), filename).replace('\\', '/')
                logger.warning(f"Utilisation du chemin de fallback: {rel_path}")
            
            if not rel_path or rel_path.startswith('..'):
                raise ValueError(f"Chemin relatif invalide: {rel_path}")
            
            # Calculer le chemin de destination attendu par Django
            expected_path = os.path.join(media_root_normalized, rel_path)
            expected_path = os.path.normpath(expected_path)
            
            # Si le fichier n'est pas déjà au bon endroit, s'assurer qu'il y est
            if fichier_normalized != expected_path:
                # Créer le répertoire de destination si nécessaire
                expected_dir = os.path.dirname(expected_path)
                os.makedirs(expected_dir, exist_ok=True)
                
                # Si le fichier existe déjà à la destination, le supprimer
                if os.path.exists(expected_path):
                    try:
                        os.remove(expected_path)
                        logger.info(f"Fichier existant supprimé: {expected_path}")
                    except Exception as e:
                        logger.warning(f"Impossible de supprimer le fichier existant: {e}")
                
                # Copier le fichier vers la destination
                import shutil
                try:
                    shutil.copy2(fichier_normalized, expected_path)
                    logger.info(f"Fichier copié de {fichier_normalized} vers {expected_path}")
                except Exception as e:
                    logger.error(f"Erreur lors de la copie du fichier: {e}", exc_info=True)
                    raise
            
            # Assigner le chemin relatif au champ fichier
            self.rapport.fichier.name = rel_path
            self.rapport.statut = 'termine'
            self.rapport.date_generation = timezone.now()
            self.rapport.duree_generation = time.time() - start_time
            self.rapport.taille_fichier = file_size
            
            self.rapport.save()
            
            logger.info(f"Rapport {self.rapport.id} sauvegardé avec succès: fichier={rel_path}, taille={self.rapport.taille_fichier} bytes, statut={self.rapport.statut}")
            
            try:
                test_path = self.rapport.fichier.path
                logger.info(f"Chemin calculé par Django (rapport.fichier.path): {test_path}")
                
                if not os.path.exists(test_path):
                    logger.error(f"ERREUR CRITIQUE: Fichier non accessible après sauvegarde!")
                    logger.error(f"Chemin attendu (rapport.fichier.path): {test_path}")
                    logger.error(f"Chemin original du fichier généré: {fichier}")
                    logger.error(f"Chemin relatif sauvegardé dans DB: {rel_path}")
                    logger.error(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
                    logger.error(f"Le fichier existe-t-il à l'emplacement original? {os.path.exists(fichier)}")
                    
                    if os.path.exists(fichier):
                        logger.error(f"Le fichier existe toujours à: {fichier}")
                        logger.error(f"Le fichier devrait être copié ou déplacé vers: {test_path}")
                else:
                    logger.info(f"[OK] Vérification OK: fichier accessible à {test_path}")
            except Exception as e:
                logger.error(f"Erreur lors de la vérification du fichier après sauvegarde: {e}", exc_info=True)
                logger.error(f"Type d'erreur: {type(e).__name__}")
                import traceback
                logger.error(traceback.format_exc())
            
            logger.info(f"Rapport {self.rapport.id} généré avec succès")
            
        except Exception as e:
            logger.error(f"Erreur génération rapport {self.rapport.id}: {e}")
            self.rapport.statut = 'erreur'
            self.rapport.message_erreur = str(e)[:500]
            self.rapport.save(update_fields=['statut', 'message_erreur'])
            raise
    
    def _generer_statistique(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab n'est pas installé")
        
        fichier = os.path.join(
            self.output_dir,
            f"statistique_{self.rapport.id}.pdf"
        )
        
        from .services.data_collector import DataCollectorService
        from datetime import datetime
        
        params = self.rapport.parametres
        date_debut = datetime.strptime(params.get('date_debut', ''), '%Y-%m-%d').date() if params.get('date_debut') else None
        date_fin = datetime.strptime(params.get('date_fin', ''), '%Y-%m-%d').date() if params.get('date_fin') else None
        
        if not date_debut or not date_fin:
            raise ValueError("Les dates de début et de fin sont requises")
        
        collector = DataCollectorService(
            type_rapport='resume_mensuel',
            date_debut=date_debut,
            date_fin=date_fin,
            filtres=params.get('filtres', {})
        )
        try:
            donnees = collector.collect_data()
        except Exception as e:
            error_msg = str(e)
            if 'not found' in error_msg.lower() or 'does not exist' in error_msg.lower() or 'pas trouvé' in error_msg.lower():
                raise ValueError(f"Aucune donnée trouvée pour la période du {date_debut} au {date_fin}. Vérifiez que des fiches criminelles existent dans cette période.")
            raise
        
        doc = SimpleDocTemplate(fichier, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        story.append(Paragraph("GENDARMERIE NATIONALE", title_style))
        story.append(Paragraph(self.rapport.titre, styles['Heading2']))
        story.append(Spacer(1, 0.3*inch))
        
        info_data = [
            ['Type', self.rapport.get_type_rapport_display()],
            ['Date de création', self.rapport.date_creation.strftime('%d/%m/%Y %H:%M')],
            ['Période', f"Du {params.get('date_debut', 'N/A')} au {params.get('date_fin', 'N/A')}"],
        ]
        
        if params.get('province'):
            info_data.append(['Province', params['province']])
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        story.append(info_table)
        
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Statistiques", styles['Heading2']))
        
        if 'statistiques' in donnees:
            stats_data = [['Indicateur', 'Valeur']]
            for key, value in donnees['statistiques'].items():
                stats_data.append([key, str(value)])
            
            stats_table = Table(stats_data, colWidths=[3*inch, 3*inch])
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
            ]))
            story.append(stats_table)
        
        if donnees.get('resume'):
            story.append(Spacer(1, 0.3*inch))
            story.append(Paragraph("Résumé", styles['Heading2']))
            story.append(Paragraph(donnees['resume'], styles['Normal']))
        
        if donnees.get('donnees') and len(donnees['donnees']) > 0:
            story.append(Spacer(1, 0.3*inch))
            story.append(Paragraph("Données détaillées", styles['Heading2']))
            
            donnees_display = donnees['donnees'][:50]
            
            if isinstance(donnees_display[0], dict):
                headers = list(donnees_display[0].keys())[:5]
                table_data = [headers]
                
                for item in donnees_display:
                    row = [str(item.get(key, ''))[:30] for key in headers]
                    table_data.append(row)
                
                if len(table_data) > 1:
                    data_table = Table(table_data, colWidths=[1.2*inch] * len(headers))
                    data_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
                    ]))
                    story.append(data_table)
        
        doc.build(story)
        logger.info(f"PDF statistique généré avec {len(donnees.get('donnees', []))} données")
        return fichier
    
    def _generer_criminel(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab n'est pas installé")
        
        fichier = os.path.join(
            self.output_dir,
            f"criminel_{self.rapport.id}.pdf"
        )
        
        doc = SimpleDocTemplate(fichier, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        story.append(Paragraph("GENDARMERIE NATIONALE", styles['Heading1']))
        story.append(Paragraph(self.rapport.titre, styles['Heading2']))
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Rapport criminel généré automatiquement", styles['Normal']))
        
        doc.build(story)
        return fichier
    
    def _generer_enquete(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab n'est pas installé")
        
        fichier = os.path.join(
            self.output_dir,
            f"enquete_{self.rapport.id}.pdf"
        )
        
        doc = SimpleDocTemplate(fichier, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        story.append(Paragraph("GENDARMERIE NATIONALE", styles['Heading1']))
        story.append(Paragraph(self.rapport.titre, styles['Heading2']))
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Rapport d'enquête généré automatiquement", styles['Normal']))
        
        doc.build(story)
        return fichier
    
    def _generer_audit(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab n'est pas installé")
        
        fichier = os.path.join(
            self.output_dir,
            f"audit_{self.rapport.id}.pdf"
        )
        
        doc = SimpleDocTemplate(fichier, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        story.append(Paragraph("GENDARMERIE NATIONALE", styles['Heading1']))
        story.append(Paragraph(self.rapport.titre, styles['Heading2']))
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Rapport d'audit généré automatiquement", styles['Normal']))
        
        doc.build(story)
        return fichier
