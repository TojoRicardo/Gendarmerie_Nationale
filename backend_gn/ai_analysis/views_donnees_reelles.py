"""
Views API utilisant les DONNÉES RÉELLES du système criminel.
Ces views analysent directement CriminalFicheCriminelle sans créer de nouveaux modèles.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime, timedelta
from django.utils import timezone

from .services import analyse_donnees_reelles, recherche_biometrique
from .serializers import (
    MonthlyEvolutionRequestSerializer,
    DetailedAnalysisRequestSerializer,
    GeospatialRequestSerializer,
    RealtimeAnalysisRequestSerializer,
    PhotoSearchRequestSerializer,
)
from .utils import generer_graphique


class AnalyseEvolutionMensuelleReelleView(APIView):
    """
    Analyse l'évolution mensuelle des FICHES CRIMINELLES RÉELLES.
    
    GET: N/A - Utiliser POST pour générer l'analyse
    POST: Générer l'analyse avec prévisions IA
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Générer l'analyse d'évolution mensuelle sur les données réelles.
        
        Body:
        {
            "start_date": "2024-01-01",
            "end_date": "2024-03-31",
            "motif": "Vol",  # optionnel
            "forecast_periods": 6
        }
        """
        serializer = MonthlyEvolutionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Utiliser 'motif' au lieu de 'category' pour les données réelles
            motif = request.data.get('motif') or serializer.validated_data.get('category')
            
            results = analyse_donnees_reelles.analyser_evolution_mensuelle_reelle(
                start_date=serializer.validated_data['start_date'],
                end_date=serializer.validated_data['end_date'],
                motif=motif,
                forecast_periods=serializer.validated_data.get('forecast_periods', 12)
            )
            historical = results.get('historical_data', [])
            labels = [item.get('mois') for item in historical]
            values = [item.get('total_fiches', item.get('total_cas', 0)) for item in historical]
            graph_path = generer_graphique('line', {
                'labels': labels,
                'values': values
            }, filename_prefix='evolution_mensuelle')
            
            return Response({
                'success': True,
                'message': 'Analyse générée depuis les DONNÉES RÉELLES (CriminalFicheCriminelle)',
                'data': {**results, 'graph_path': graph_path}
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyseParMotifReelleView(APIView):
    """
    Analyse détaillée par MOTIF D'ARRESTATION RÉEL.
    
    POST: Analyser les données par motif
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Analyser par motif d'arrestation.
        
        Body:
        {
            "start_date": "2024-01-01",
            "end_date": "2024-03-31",
            "motifs": ["Vol", "Agression"]  # optionnel
        }
        """
        serializer = DetailedAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Utiliser 'motifs' au lieu de 'categories' pour les données réelles
            motifs = request.data.get('motifs') or serializer.validated_data.get('categories')
            
            results = analyse_donnees_reelles.analyser_par_motif_reel(
                start_date=serializer.validated_data['start_date'],
                end_date=serializer.validated_data['end_date'],
                motifs=motifs
            )
            # Générer PNG multi-séries par motif
            motifs_data = results.get('motifs', [])
            months = sorted({m['mois'] for mot in motifs_data for m in mot.get('monthly_data', [])})
            series = []
            for mot in motifs_data:
                by_month = {m['mois']: m['total'] for m in mot.get('monthly_data', [])}
                series.append({
                    'name': mot.get('motif', ''),
                    'values': [by_month.get(month, 0) for month in months]
                })
            graph_path = generer_graphique('multi_line', {
                'labels': months,
                'series': series
            }, filename_prefix='evolution_detaillee')
            
            return Response({
                'success': True,
                'message': "Analyse générée depuis les MOTIFS D'ARRESTATION RÉELS",
                'data': {**results, 'graph_path': graph_path}
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyseRepartitionGeoReelleView(APIView):
    """
    Analyse la répartition géographique RÉELLE (lieux d'arrestation).
    
    POST: Générer l'analyse géospatiale avec heatmap
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Analyser la répartition géographique.
        
        Body:
        {
            "start_date": "2024-01-01",
            "end_date": "2024-03-31",
            "regions": ["Alger", "Oran"],  # optionnel
            "include_heatmap": true
        }
        """
        # Adapter le serializer pour accepter start_date et end_date
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date or not end_date:
            return Response({
                'error': 'start_date et end_date sont requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            results = analyse_donnees_reelles.analyser_repartition_geo_reelle(
                start_date=start_date,
                end_date=end_date,
                regions=request.data.get('regions'),
                include_heatmap=request.data.get('include_heatmap', True)
            )
            # Générer PNG heatmap
            heatmap = results.get('heatmap_data') or {}
            points = heatmap.get('points') or [
                {'lat': item.get('latitude'), 'lng': item.get('longitude'), 'intensity': item.get('total_fiches', 1)}
                for item in results.get('distribution', []) if item.get('latitude') and item.get('longitude')
            ]
            graph_path = generer_graphique('heatmap', {
                'points': points
            }, filename_prefix='repartition_geo')
            
            return Response({
                'success': True,
                'message': "Analyse générée depuis les LIEUX D'ARRESTATION RÉELS",
                'data': {**results, 'graph_path': graph_path}
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyseActiviteTempsReelReelleView(APIView):
    """
    Analyse l'activité récente RÉELLE des fiches criminelles.
    
    POST: Analyser l'activité récente et détecter les anomalies
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Analyser l'activité temps réel.
        
        Body:
        {
            "time_window": 24  # heures
        }
        """
        time_window = request.data.get('time_window', 24)
        
        try:
            results = analyse_donnees_reelles.analyser_activite_temps_reel_reelle(
                time_window=time_window
            )
            # Générer PNG bar par motif récent
            motif_activity = results.get('motif_activity', [])
            labels = [m.get('motif_arrestation', 'N/A') for m in motif_activity]
            values = [m.get('count', 0) for m in motif_activity]
            graph_path = generer_graphique('bar', {
                'labels': labels,
                'values': values
            }, filename_prefix='activite_temps_reel')
            
            return Response({
                'success': True,
                'message': "Analyse générée depuis l'ACTIVITÉ RÉCENTE RÉELLE",
                'data': {**results, 'graph_path': graph_path}
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RecherchePhotoReelleView(APIView):
    """
    Recherche biométrique (photo ou tapissage) connectée au moteur ArcFace.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """
        Rechercher des correspondances à partir d'une photo.

        Mode `search` (défaut):
            - image: fichier image (obligatoire)
            - threshold: float (0.0 - 1.0)
            - top_k: nombre de correspondances à retourner

        Mode `lineup`:
            - mode: "lineup"
            - image: fichier image
            - lineup_ids: liste d'UUID des suspects à comparer
            - threshold: seuil de validation pour marquer `verified`
        """

        serializer = PhotoSearchRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        image_file = validated['image']

        try:
            results = recherche_biometrique.effectuer_recherche_biometrique(
                image_file=image_file,
                mode=validated.get('mode', 'search'),
                threshold=validated.get('threshold', 0.6),
                top_k=validated.get('top_k', 3),
                lineup_ids=validated.get('lineup_ids'),
                include_embedding=validated.get('include_embedding', False),
                requested_by=request.user,
            )

            message = "Recherche biométrique effectuée avec succès"
            if results.get('mode') == 'lineup':
                message = "Analyse de tapissage effectuée avec succès"

            return Response({
                'success': True,
                'message': message,
                'data': results,
            }, status=status.HTTP_200_OK)

        except ValueError as exc:
            return Response({
                'success': False,
                'error': str(exc),
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({
                'success': False,
                'error': str(exc),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StatistiquesFichesCriminellesView(APIView):
    """
    Statistiques globales sur les fiches criminelles réelles.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Obtenir les statistiques globales.
        """
        from criminel.models import CriminalFicheCriminelle, RefStatutFiche
        
        try:
            total_fiches = CriminalFicheCriminelle.objects.count()
            now = timezone.now()
            start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            fiches_ce_mois = CriminalFicheCriminelle.objects.filter(
                date_creation__gte=start_month
            ).count()
            # Mois précédent
            # Trouver le premier jour du mois précédent
            if start_month.month == 1:
                prev_start = start_month.replace(year=start_month.year - 1, month=12)
            else:
                prev_start = start_month.replace(month=start_month.month - 1)
            prev_end = start_month
            fiches_mois_precedent = CriminalFicheCriminelle.objects.filter(
                date_creation__gte=prev_start,
                date_creation__lt=prev_end
            ).count()
            # Evolution en pourcentage par rapport au mois précédent
            if fiches_mois_precedent > 0:
                evolution_pct_mois = ((fiches_ce_mois - fiches_mois_precedent) / fiches_mois_precedent) * 100
            else:
                evolution_pct_mois = 100.0 if fiches_ce_mois > 0 else 0.0
            
            # Par statut
            par_statut = CriminalFicheCriminelle.objects.values('statut_fiche__libelle').annotate(
                count=Count('id')
            )
            
            # Par niveau de danger
            par_danger = CriminalFicheCriminelle.objects.values('niveau_danger').annotate(
                count=Count('id')
            )
            
            week_ago = timezone.now() - timedelta(days=7)
            fiches_recentes = CriminalFicheCriminelle.objects.filter(
                date_creation__gte=week_ago
            ).count()
            
            # Avec motif d'arrestation
            avec_motif = CriminalFicheCriminelle.objects.exclude(
                motif_arrestation__isnull=True
            ).exclude(motif_arrestation='').count()
            
            # Avec lieu d'arrestation
            avec_lieu = CriminalFicheCriminelle.objects.exclude(
                lieu_arrestation__isnull=True
            ).exclude(lieu_arrestation='').count()
            
            return Response({
                'success': True,
                'message': 'Statistiques depuis les DONNÉES RÉELLES',
                'data': {
                    'total_fiches': total_fiches,
                    'total_fiches_ce_mois': fiches_ce_mois,
                    'total_fiches_mois_precedent': fiches_mois_precedent,
                    'evolution_pct_mois': round(evolution_pct_mois, 2),
                    'fiches_recentes_7j': fiches_recentes,
                    'avec_motif_arrestation': avec_motif,
                    'avec_lieu_arrestation': avec_lieu,
                    'par_statut': list(par_statut),
                    'par_niveau_danger': list(par_danger)
                }
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

