import os
import logging
from datetime import datetime, date, timedelta
from django.http import FileResponse, HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Rapport
from .serializers import RapportSerializer, RapportCreateSerializer
from .generateur import GenerateurRapport
from .services.data_collector import DataCollectorService

logger = logging.getLogger(__name__)

# Import ReportLab pour génération PDF
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab n'est pas installé. La génération PDF ne sera pas disponible.")


class RapportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class RapportViewSet(viewsets.ModelViewSet):
    queryset = Rapport.objects.all()
    serializer_class = RapportSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = RapportPagination
    lookup_field = 'id'
    lookup_url_kwarg = 'pk'
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        type_rapport = self.request.query_params.get('type')
        if type_rapport:
            queryset = queryset.filter(type_rapport=type_rapport)
        
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        if not self.request.user.is_staff:
            queryset = queryset.filter(cree_par=self.request.user)
        
        return queryset.order_by('-date_creation')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la liste des rapports: {e}", exc_info=True)
            return Response(
                {'erreur': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='creer')
    def creer(self, request):
        try:
            serializer = RapportCreateSerializer(data=request.data)
            
            if serializer.is_valid():
                # Générer un titre par défaut si non fourni
                titre = serializer.validated_data.get('titre') or serializer.validated_data.get('titre', '')
                if not titre or not titre.strip():
                    type_rapport = serializer.validated_data['type_rapport']
                    periode_type = serializer.validated_data.get('periode_type', 'personnalise')
                    parametres = serializer.validated_data.get('parametres', {})
                    
                    # Créer un titre descriptif
                    type_display_map = {
                        'statistique': 'Statistique',
                        'criminel': 'Criminel',
                        'enquete': 'Enquête',
                        'audit': 'Audit'
                    }
                    type_label = type_display_map.get(type_rapport, type_rapport.capitalize())
                    
                    periode_display_map = {
                        'journalier': 'Journalier',
                        'mensuel': 'Mensuel',
                        '3mois': 'Trimestriel',
                        '6mois': 'Semestriel',
                        'annuel': 'Annuel',
                        'personnalise': 'Personnalisé'
                    }
                    periode_label = periode_display_map.get(periode_type, 'Personnalisé')
                    
                    if parametres.get('date_debut') and parametres.get('date_fin'):
                        date_debut = parametres['date_debut']
                        date_fin = parametres['date_fin']
                        titre = f"Rapport {type_label} - {periode_label} ({date_debut} au {date_fin})"
                    else:
                        titre = f"Rapport {type_label} - {periode_label}"
                
                rapport = Rapport.objects.create(
                    titre=titre.strip() if titre else f"Rapport {serializer.validated_data['type_rapport']}",
                    type_rapport=serializer.validated_data['type_rapport'],
                    parametres=serializer.validated_data.get('parametres', {}),
                    note=serializer.validated_data.get('note', ''),
                    cree_par=request.user,
                    statut='en_attente'
                )
                
                try:
                    logger.info(f"Démarrage génération rapport {rapport.id}, type: {rapport.type_rapport}, paramètres: {rapport.parametres}")
                    generateur = GenerateurRapport(rapport)
                    generateur.generer()
                    logger.info(f"Génération terminée pour rapport {rapport.id}, statut: {rapport.statut}")
                    rapport.refresh_from_db()
                except Exception as e:
                    logger.error(f"Erreur génération rapport {rapport.id}: {e}", exc_info=True)
                    import traceback
                    error_traceback = traceback.format_exc()
                    logger.error(f"Traceback: {error_traceback}")
                    rapport.refresh_from_db()
                    rapport.statut = 'erreur'
                    # Améliorer le message d'erreur pour les erreurs "Not found"
                    error_msg = str(e)
                    error_lower = error_msg.lower()
                    
                    if any(phrase in error_lower for phrase in ['not found', 'pas trouvé', 'does not exist', 'n\'existe pas', 'introuvable']):
                        if rapport.type_rapport == 'statistique':
                            date_debut = rapport.parametres.get('date_debut', 'N/A') if isinstance(rapport.parametres, dict) else 'N/A'
                            date_fin = rapport.parametres.get('date_fin', 'N/A') if isinstance(rapport.parametres, dict) else 'N/A'
                            error_msg = f"Données non trouvées pour la période sélectionnée ({date_debut} au {date_fin}). Vérifiez que des données existent pour cette période."
                        elif rapport.type_rapport == 'criminel':
                            criminel_id = rapport.parametres.get('criminel_id', 'N/A') if isinstance(rapport.parametres, dict) else 'N/A'
                            error_msg = f"Fiche criminelle non trouvée avec l'ID: {criminel_id}"
                        elif rapport.type_rapport == 'enquete':
                            enquete_id = rapport.parametres.get('enquete_id', 'N/A') if isinstance(rapport.parametres, dict) else 'N/A'
                            error_msg = f"Enquête non trouvée avec l'ID: {enquete_id}"
                        else:
                            error_msg = f"Ressource non trouvée pour générer le rapport: {error_msg}"
                    else:
                        # Autres types d'erreurs
                        error_msg = f"Erreur lors de la génération du rapport: {error_msg}"
                    
                    rapport.message_erreur = error_msg[:500]
                    rapport.save()
                
                try:
                    response_serializer = RapportSerializer(rapport, context={'request': request})
                    return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                except Exception as e:
                    logger.error(f"Erreur sérialisation rapport {rapport.id}: {e}", exc_info=True)
                    return Response({
                        'id': str(rapport.id),
                        'titre': rapport.titre,
                        'type_rapport': rapport.type_rapport,
                        'statut': rapport.statut,
                        'message': 'Rapport créé mais erreur lors de la sérialisation'
                    }, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Erreur inattendue dans creer: {e}", exc_info=True)
            return Response(
                {
                    'erreur': f'Erreur serveur lors de la création du rapport: {str(e)}',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, pk=None):
        """
        Supprime un rapport. Seuls le créateur ou un administrateur peuvent supprimer.
        """
        try:
            rapport = self.get_object()
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du rapport {pk} pour suppression: {e}", exc_info=True)
            return Response(
                {'erreur': f'Rapport non trouvé avec l\'ID: {pk}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier les permissions : seuls le créateur ou un admin peuvent supprimer
        if not request.user.is_staff and rapport.cree_par != request.user:
            return Response(
                {'erreur': 'Vous n\'avez pas la permission de supprimer ce rapport'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            rapport_titre = rapport.titre
            rapport.delete()
            logger.info(f"Rapport {rapport_titre} (ID: {pk}) supprimé par {request.user.username}")
            return Response(
                {'message': f'Rapport "{rapport_titre}" supprimé avec succès'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du rapport {pk}: {e}", exc_info=True)
            return Response(
                {'erreur': f'Erreur lors de la suppression: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='statistiques')
    def statistiques(self, request):
        try:
            date_debut_str = request.query_params.get('date_debut')
            date_fin_str = request.query_params.get('date_fin')
            type_rapport = request.query_params.get('type_rapport', 'resume_mensuel')
            
            if not date_debut_str or not date_fin_str:
                return Response(
                    {
                        'success': False,
                        'erreur': 'Les paramètres date_debut et date_fin sont requis'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                date_debut = datetime.strptime(date_debut_str, '%Y-%m-%d').date()
                date_fin = datetime.strptime(date_fin_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {
                        'success': False,
                        'erreur': 'Format de date invalide. Utilisez YYYY-MM-DD'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if date_debut > date_fin:
                return Response(
                    {
                        'success': False,
                        'erreur': 'La date de début doit être antérieure ou égale à la date de fin'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                collector = DataCollectorService(
                    type_rapport=type_rapport,
                    date_debut=date_debut,
                    date_fin=date_fin,
                    filtres={}
                )
                data = collector.collect_data()
                
                return Response({
                    'success': True,
                    'donnees': data,
                    'date_debut': date_debut_str,
                    'date_fin': date_fin_str,
                    'type_rapport': type_rapport
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Erreur lors de la collecte des statistiques: {e}", exc_info=True)
                return Response(
                    {
                        'success': False,
                        'erreur': f'Erreur lors de la collecte des statistiques: {str(e)}',
                        'details': str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Erreur inattendue dans statistiques: {e}", exc_info=True)
            return Response(
                {
                    'success': False,
                    'erreur': 'Erreur serveur lors de la récupération des statistiques',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateReportView(APIView):
    """
    Vue pour générer des rapports avec différents types de périodes :
    - journalier
    - mensuel
    - trimestriel
    - semestriel
    - annuel
    - personnalisé (date_debut, date_fin)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            report_type = request.data.get("type")
            date_debut = request.data.get("dateDebut")
            date_fin = request.data.get("dateFin")
            
            # Vérifier que le type est fourni
            if not report_type:
                return Response(
                    {"message": "Type de rapport requis"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Types de rapports autorisés
            allowed_types = [
                "journalier",
                "mensuel",
                "trimestriel",
                "semestriel",
                "annuel",
                "personnalise"
            ]
            
            if report_type not in allowed_types:
                return Response(
                    {"message": f"Type de rapport invalide. Types autorisés: {', '.join(allowed_types)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculer les dates selon le type
            aujourd_hui = date.today()
            date_debut_calc = None
            date_fin_calc = None
            
            if report_type == "journalier":
                # Rapport du jour
                date_debut_calc = aujourd_hui
                date_fin_calc = aujourd_hui
                
            elif report_type == "mensuel":
                # Mois en cours
                date_debut_calc = date(aujourd_hui.year, aujourd_hui.month, 1)
                if aujourd_hui.month == 12:
                    date_fin_calc = date(aujourd_hui.year + 1, 1, 1) - timedelta(days=1)
                else:
                    date_fin_calc = date(aujourd_hui.year, aujourd_hui.month + 1, 1) - timedelta(days=1)
                    
            elif report_type == "trimestriel":
                # Trimestre en cours (3 mois)
                quarter = (aujourd_hui.month - 1) // 3
                mois_debut = quarter * 3 + 1
                date_debut_calc = date(aujourd_hui.year, mois_debut, 1)
                if mois_debut == 10:  # Q4
                    date_fin_calc = date(aujourd_hui.year, 12, 31)
                else:
                    date_fin_calc = date(aujourd_hui.year, mois_debut + 3, 1) - timedelta(days=1)
                    
            elif report_type == "semestriel":
                # Semestre en cours (6 mois)
                if aujourd_hui.month <= 6:
                    # Premier semestre
                    date_debut_calc = date(aujourd_hui.year, 1, 1)
                    date_fin_calc = date(aujourd_hui.year, 6, 30)
                else:
                    # Deuxième semestre
                    date_debut_calc = date(aujourd_hui.year, 7, 1)
                    date_fin_calc = date(aujourd_hui.year, 12, 31)
                    
            elif report_type == "annuel":
                # Année en cours
                date_debut_calc = date(aujourd_hui.year, 1, 1)
                date_fin_calc = date(aujourd_hui.year, 12, 31)
                
            elif report_type == "personnalise":
                # Dates personnalisées
                if not date_debut or not date_fin:
                    return Response(
                        {"message": "Les dates dateDebut et dateFin sont requises pour un rapport personnalisé"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    date_debut_calc = datetime.strptime(date_debut, '%Y-%m-%d').date()
                    date_fin_calc = datetime.strptime(date_fin, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {"message": "Format de date invalide. Utilisez YYYY-MM-DD"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if date_debut_calc > date_fin_calc:
                    return Response(
                        {"message": "La date de début doit être antérieure ou égale à la date de fin"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Créer le rapport
            try:
                titre = f"Rapport {report_type}"
                if report_type == "personnalise":
                    titre = f"Rapport personnalisé ({date_debut_calc} - {date_fin_calc})"
                
                rapport = Rapport.objects.create(
                    titre=titre,
                    type_rapport='statistique',  # Type par défaut
                    parametres={
                        'date_debut': date_debut_calc.strftime('%Y-%m-%d'),
                        'date_fin': date_fin_calc.strftime('%Y-%m-%d'),
                    },
                    cree_par=request.user,
                    statut='en_attente'
                )
                
                # Générer le rapport
                try:
                    logger.info(f"Démarrage génération rapport {rapport.id}, type: {report_type}, période: {date_debut_calc} - {date_fin_calc}")
                    generateur = GenerateurRapport(rapport)
                    generateur.generer()
                    logger.info(f"Génération terminée pour rapport {rapport.id}, statut: {rapport.statut}")
                    rapport.refresh_from_db()
                    
                    # Journaliser l'action de génération
                    try:
                        from audit.services import audit_log
                        audit_log(
                            request=request,
                            module="Rapports",
                            action="Génération de rapport",
                            ressource=f"Rapport #{rapport.id}",
                            narration=(
                                f"Un rapport officiel intitulé '{rapport.titre}' a été généré "
                                "automatiquement à partir des données du système SGIC."
                            )
                        )
                    except Exception as audit_error:
                        logger.warning(f"Erreur lors de l'enregistrement de l'audit pour génération de rapport: {audit_error}")
                except Exception as e:
                    logger.error(f"Erreur génération rapport {rapport.id}: {e}", exc_info=True)
                    rapport.refresh_from_db()
                    rapport.statut = 'erreur'
                    rapport.message_erreur = str(e)[:500]
                    rapport.save()
                
                # Préparer la réponse
                periode_info = {
                    "date_debut": date_debut_calc.strftime('%Y-%m-%d'),
                    "date_fin": date_fin_calc.strftime('%Y-%m-%d')
                } if report_type == "personnalise" else "période automatique"
                
                response_data = {
                    "message": "Rapport généré avec succès",
                    "data": {
                        "id": str(rapport.id),
                        "type": report_type,
                        "periode": periode_info,
                        "genere_le": datetime.now().isoformat(),
                        "status": rapport.statut,
                        "titre": rapport.titre
                    }
                }
                
                # Ajouter l'URL de téléchargement si le rapport est terminé
                if rapport.statut == 'termine' and rapport.fichier:
                    response_data["data"]["download_url"] = f"/api/rapports/{rapport.id}/telecharger/"
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Erreur lors de la création du rapport: {e}", exc_info=True)
                return Response(
                    {"message": f"Erreur lors de la création du rapport: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Erreur serveur lors de la génération du rapport: {e}", exc_info=True)
            return Response(
                {"message": "Erreur serveur lors de la génération du rapport"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TelechargerRapportPDFView(APIView):
    """
    Vue pour télécharger un rapport PDF.
    Si le fichier existe, le retourne directement.
    Sinon, génère un PDF avec ReportLab.
    
    URL: GET /api/rapports/<uuid:rapport_id>/telecharger/?format=pdf
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, rapport_id):
        try:
            # Récupérer le rapport par UUID
            try:
                rapport = Rapport.objects.get(id=rapport_id)
            except Rapport.DoesNotExist:
                return Response(
                    {'erreur': f'Rapport non trouvé avec l\'ID: {rapport_id}'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Vérifier les permissions
            if not request.user.is_staff and rapport.cree_par != request.user:
                return Response(
                    {'erreur': 'Vous n\'avez pas la permission de télécharger ce rapport'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Si le fichier existe, le retourner
            if rapport.fichier and rapport.fichier.name:
                try:
                    file_path = rapport.fichier.path
                    if os.path.exists(file_path):
                        format_demande = request.query_params.get('format', 'pdf').lower()
                        filename_base = os.path.splitext(os.path.basename(rapport.fichier.name))[0]
                        filename = f"{filename_base}.{format_demande}"
                        
                        file_handle = open(file_path, 'rb')
                        response = FileResponse(file_handle, content_type='application/pdf')
                        response['Content-Disposition'] = f'attachment; filename="{filename}"'
                        
                        # Journaliser l'action de téléchargement
                        try:
                            from audit.services import audit_log
                            audit_log(
                                request=request,
                                module="Rapports",
                                action="Téléchargement de rapport",
                                ressource=f"Rapport #{rapport.id}",
                                narration=(
                                    f"L'utilisateur {request.user.username} a téléchargé le rapport "
                                    f"'{rapport.titre}' au format PDF pour consultation externe."
                                )
                            )
                        except Exception as audit_error:
                            logger.warning(f"Erreur lors de l'enregistrement de l'audit pour téléchargement: {audit_error}")
                        
                        # Ajouter les headers CORS si nécessaire
                        from .views_telecharger import add_cors_headers_to_file_response
                        add_cors_headers_to_file_response(response, request)
                        
                        return response
                except Exception as e:
                    logger.warning(f"Erreur lors de l'ouverture du fichier existant: {e}. Génération d'un nouveau PDF.")
            
            # Si le fichier n'existe pas, générer un PDF avec ReportLab
            if not REPORTLAB_AVAILABLE:
                return Response(
                    {'erreur': 'ReportLab n\'est pas installé. Impossible de générer le PDF.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Générer le PDF
            response = HttpResponse(content_type='application/pdf')
            filename = f'rapport_{rapport_id}.pdf'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # Créer le canvas PDF
            p = canvas.Canvas(response, pagesize=A4)
            width, height = A4
            
            # En-tête
            p.setFont("Helvetica-Bold", 16)
            p.setFillColor(colors.HexColor('#1a1a1a'))
            p.drawString(50, height - 50, "GENDARMERIE NATIONALE")
            
            # Titre du rapport
            p.setFont("Helvetica-Bold", 14)
            p.drawString(50, height - 90, rapport.titre)
            
            # Ligne de séparation
            p.setStrokeColor(colors.HexColor('#cccccc'))
            p.line(50, height - 110, width - 50, height - 110)
            
            # Informations du rapport
            p.setFont("Helvetica", 12)
            y_position = height - 140
            
            p.drawString(50, y_position, f"ID du rapport : {rapport_id}")
            y_position -= 25
            
            p.drawString(50, y_position, f"Type : {rapport.get_type_rapport_display()}")
            y_position -= 25
            
            p.drawString(50, y_position, f"Statut : {rapport.get_statut_display()}")
            y_position -= 25
            
            if rapport.date_creation:
                p.drawString(50, y_position, f"Date de création : {rapport.date_creation.strftime('%d/%m/%Y %H:%M')}")
                y_position -= 25
            
            if rapport.date_generation:
                p.drawString(50, y_position, f"Date de génération : {rapport.date_generation.strftime('%d/%m/%Y %H:%M')}")
                y_position -= 25
            
            if rapport.cree_par:
                p.drawString(50, y_position, f"Créé par : {rapport.cree_par.username}")
                y_position -= 25
            
            # Paramètres du rapport
            if rapport.parametres:
                y_position -= 20
                p.setFont("Helvetica-Bold", 12)
                p.drawString(50, y_position, "Paramètres :")
                y_position -= 25
                p.setFont("Helvetica", 10)
                
                for key, value in rapport.parametres.items():
                    if value:
                        p.drawString(70, y_position, f"• {key}: {value}")
                        y_position -= 20
                        if y_position < 100:  # Nouvelle page si nécessaire
                            p.showPage()
                            y_position = height - 50
            
            # Note si présente
            if rapport.note:
                y_position -= 20
                p.setFont("Helvetica-Bold", 12)
                p.drawString(50, y_position, "Note :")
                y_position -= 25
                p.setFont("Helvetica", 10)
                # Découper la note en lignes si trop longue
                note_lines = rapport.note[:500].split('\n')  # Limiter à 500 caractères
                for line in note_lines[:10]:  # Maximum 10 lignes
                    if line:
                        p.drawString(70, y_position, line[:80])  # 80 caractères par ligne
                        y_position -= 20
                        if y_position < 100:
                            p.showPage()
                            y_position = height - 50
            
            # Message d'erreur si présent
            if rapport.message_erreur:
                y_position -= 20
                p.setFont("Helvetica-Bold", 12)
                p.setFillColor(colors.HexColor('#cc0000'))
                p.drawString(50, y_position, "Message d'erreur :")
                y_position -= 25
                p.setFont("Helvetica", 10)
                p.setFillColor(colors.HexColor('#1a1a1a'))
                error_lines = rapport.message_erreur[:300].split('\n')
                for line in error_lines[:5]:
                    if line:
                        p.drawString(70, y_position, line[:80])
                        y_position -= 20
                        if y_position < 100:
                            p.showPage()
                            y_position = height - 50
            
            # Pied de page
            p.setFont("Helvetica", 8)
            p.setFillColor(colors.HexColor('#666666'))
            p.drawString(50, 50, f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
            p.drawString(width - 200, 50, f"Page 1")
            
            # Finaliser le PDF
            p.showPage()
            p.save()
            
            # Journaliser l'action de téléchargement
            try:
                from audit.services import audit_log
                audit_log(
                    request=request,
                    module="Rapports",
                    action="Téléchargement de rapport",
                    ressource=f"Rapport #{rapport.id}",
                    narration=(
                        f"L'utilisateur {request.user.username} a téléchargé le rapport "
                        f"'{rapport.titre}' au format PDF pour consultation externe."
                    )
                )
            except Exception as audit_error:
                logger.warning(f"Erreur lors de l'enregistrement de l'audit pour téléchargement: {audit_error}")
            
            logger.info(f"PDF généré pour le rapport {rapport_id}")
            return response
            
        except Exception as e:
            logger.error(f"Erreur lors du téléchargement du rapport {rapport_id}: {e}", exc_info=True)
            return Response(
                {'erreur': f'Erreur lors du téléchargement: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
