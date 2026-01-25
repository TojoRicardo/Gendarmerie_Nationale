from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta, datetime

from .models import (
    Cas,
    EvolutionMensuelle,
    EvolutionDetaillee,
    RepartitionGeographique,
    ActiviteTempsReel
)
from .serializers import (
    CasSerializer,
    EvolutionMensuelleSerializer,
    EvolutionDetailleeSerializer,
    RepartitionGeographiqueSerializer,
    ActiviteTempsReelSerializer,
    MonthlyEvolutionRequestSerializer,
    DetailedAnalysisRequestSerializer,
    GeospatialRequestSerializer,
    RealtimeAnalysisRequestSerializer
)
from .services import evolution_mensuelle, evolution_detaillee, repartition_geo, activite_temps_reel

class CasListCreate(generics.ListCreateAPIView):
    """
    GET: Liste tous les cas avec filtres
    POST: Créer un nouveau cas
    """
    queryset = Cas.objects.all()
    serializer_class = CasSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtres
        categorie = self.request.query_params.get('categorie', None)
        statut = self.request.query_params.get('statut', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        lieu = self.request.query_params.get('lieu', None)
        
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        if statut:
            queryset = queryset.filter(statut=statut)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if lieu:
            queryset = queryset.filter(lieu__icontains=lieu)
        
        return queryset


class CasRetrieveUpdateDelete(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Récupérer un cas spécifique
    PUT/PATCH: Modifier un cas
    DELETE: Supprimer un cas
    """
    queryset = Cas.objects.all()
    serializer_class = CasSerializer
    permission_classes = [IsAuthenticated]

class EvolutionMensuelleView(APIView):
    """
    GET: Voir l'évolution mensuelle
    POST: Générer/Recalculer l'évolution mensuelle depuis les cas
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Liste toutes les évolutions mensuelles"""
        start_month = request.query_params.get('start_month', None)
        end_month = request.query_params.get('end_month', None)
        
        queryset = EvolutionMensuelle.objects.all()
        
        if start_month:
            queryset = queryset.filter(mois__gte=start_month)
        if end_month:
            queryset = queryset.filter(mois__lte=end_month)
        
        serializer = EvolutionMensuelleSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Générer l'évolution mensuelle avec prévisions"""
        serializer = MonthlyEvolutionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = evolution_mensuelle.analyze_monthly_evolution(
                start_date=serializer.validated_data['start_date'],
                end_date=serializer.validated_data['end_date'],
                category=serializer.validated_data.get('category'),
                forecast_periods=serializer.validated_data.get('forecast_periods', 12)
            )
            
            return Response({
                'success': True,
                'message': 'Évolution mensuelle calculée avec succès',
                'data': results
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """Supprimer une évolution mensuelle spécifique"""
        mois = request.query_params.get('mois', None)
        
        if not mois:
            return Response({
                'error': 'Le paramètre "mois" est requis (format: YYYY-MM-DD)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            evolution = EvolutionMensuelle.objects.get(mois=mois)
            evolution.delete()
            
            return Response({
                'success': True,
                'message': f'Évolution du mois {mois} supprimée'
            }, status=status.HTTP_200_OK)
        
        except EvolutionMensuelle.DoesNotExist:
            return Response({
                'error': f'Aucune évolution trouvée pour le mois {mois}'
            }, status=status.HTTP_404_NOT_FOUND)

class EvolutionDetailleeView(APIView):
    """
    GET: Voir l'évolution détaillée par catégorie
    POST: Générer/Recalculer l'évolution détaillée
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Liste toutes les évolutions détaillées"""
        categorie = request.query_params.get('categorie', None)
        mois = request.query_params.get('mois', None)
        
        queryset = EvolutionDetaillee.objects.all()
        
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        if mois:
            queryset = queryset.filter(mois=mois)
        
        serializer = EvolutionDetailleeSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Générer l'analyse détaillée par catégorie"""
        serializer = DetailedAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = evolution_detaillee.analyze_detailed_evolution(
                start_date=serializer.validated_data['start_date'],
                end_date=serializer.validated_data['end_date'],
                categories=serializer.validated_data.get('categories'),
                variables=serializer.validated_data.get('variables')
            )
            
            return Response({
                'success': True,
                'message': 'Analyse détaillée calculée avec succès',
                'data': results
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RepartitionGeoView(APIView):
    """
    GET: Voir la répartition géographique
    POST: Générer/Recalculer la répartition + heatmap
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Liste toutes les répartitions géographiques"""
        lieu = request.query_params.get('lieu', None)
        top_n = request.query_params.get('top_n', None)
        
        queryset = RepartitionGeographique.objects.all()
        
        if lieu:
            queryset = queryset.filter(lieu__icontains=lieu)
        
        if top_n:
            try:
                queryset = queryset[:int(top_n)]
            except ValueError:
                pass
        
        serializer = RepartitionGeographiqueSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Générer l'analyse géospatiale avec heatmap"""
        serializer = GeospatialRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = repartition_geo.analyze_geospatial_distribution(
                date=serializer.validated_data['date'],
                regions=serializer.validated_data.get('regions'),
                include_heatmap=serializer.validated_data.get('include_heatmap', True)
            )
            
            return Response({
                'success': True,
                'message': 'Analyse géospatiale calculée avec succès',
                'data': results
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """Supprimer une répartition géographique spécifique"""
        lieu = request.query_params.get('lieu', None)
        
        if not lieu:
            return Response({
                'error': 'Le paramètre "lieu" est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            repartition = RepartitionGeographique.objects.get(lieu=lieu)
            repartition.delete()
            
            return Response({
                'success': True,
                'message': f'Répartition pour {lieu} supprimée'
            }, status=status.HTTP_200_OK)
        
        except RepartitionGeographique.DoesNotExist:
            return Response({
                'error': f'Aucune répartition trouvée pour {lieu}'
            }, status=status.HTTP_404_NOT_FOUND)

class ActiviteTempsReelView(APIView):
    """
    GET: Voir toutes les activités temps réel avec filtres
    POST: Analyser et détecter les anomalies
    PUT: Marquer une anomalie comme résolue
    DELETE: Supprimer un événement
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Liste toutes les activités temps réel"""
        anomalie = request.query_params.get('anomalie', None)
        categorie = request.query_params.get('categorie', None)
        last_hours = request.query_params.get('last_hours', None)
        
        queryset = ActiviteTempsReel.objects.all()
        
        if anomalie is not None:
            queryset = queryset.filter(anomalie=anomalie.lower() == 'true')
        
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        
        if last_hours:
            try:
                cutoff = timezone.now() - timedelta(hours=int(last_hours))
                queryset = queryset.filter(timestamp__gte=cutoff)
            except ValueError:
                pass
        
        serializer = ActiviteTempsReelSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Analyser l'activité en temps réel et détecter les anomalies"""
        serializer = RealtimeAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = activite_temps_reel.analyze_realtime_activity(
                time_window=serializer.validated_data.get('time_window', 24),
                detection_types=serializer.validated_data.get('detection_types'),
                min_severity=serializer.validated_data.get('min_severity', 'low')
            )
            
            return Response({
                'success': True,
                'message': 'Analyse temps réel effectuée avec succès',
                'data': results
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """Supprimer un événement temps réel"""
        event_id = request.query_params.get('id', None)
        
        if not event_id:
            return Response({
                'error': 'Le paramètre "id" est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            event = ActiviteTempsReel.objects.get(id=event_id)
            event.delete()
            
            return Response({
                'success': True,
                'message': f'Événement {event_id} supprimé'
            }, status=status.HTTP_200_OK)
        
        except ActiviteTempsReel.DoesNotExist:
            return Response({
                'error': f'Aucun événement trouvé avec l\'id {event_id}'
            }, status=status.HTTP_404_NOT_FOUND)

class CasViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les cas criminels et incidents.
    """
    queryset = Cas.objects.all()
    serializer_class = CasSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrage par catégorie
        categorie = self.request.query_params.get('categorie', None)
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        
        # Filtrage par statut
        statut = self.request.query_params.get('statut', None)
        if statut:
            queryset = queryset.filter(statut=statut)
        
        # Filtrage par plage de dates
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset


class EvolutionMensuelleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter l'évolution mensuelle.
    """
    queryset = EvolutionMensuelle.objects.all()
    serializer_class = EvolutionMensuelleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrage par plage de mois
        start_month = self.request.query_params.get('start_month', None)
        end_month = self.request.query_params.get('end_month', None)
        if start_month:
            queryset = queryset.filter(mois__gte=start_month)
        if end_month:
            queryset = queryset.filter(mois__lte=end_month)
        
        return queryset


class EvolutionDetailleeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter l'évolution détaillée.
    """
    queryset = EvolutionDetaillee.objects.all()
    serializer_class = EvolutionDetailleeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrage par catégorie
        categorie = self.request.query_params.get('categorie', None)
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        
        # Filtrage par mois
        mois = self.request.query_params.get('mois', None)
        if mois:
            queryset = queryset.filter(mois=mois)
        
        return queryset


class RepartitionGeographiqueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter la répartition géographique.
    """
    queryset = RepartitionGeographique.objects.all()
    serializer_class = RepartitionGeographiqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrage par lieu
        lieu = self.request.query_params.get('lieu', None)
        if lieu:
            queryset = queryset.filter(lieu__icontains=lieu)
        
        # Top N lieux
        top_n = self.request.query_params.get('top_n', None)
        if top_n:
            try:
                queryset = queryset[:int(top_n)]
            except ValueError:
                pass
        
        return queryset


class ActiviteTempsReelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter l'activité temps réel.
    """
    queryset = ActiviteTempsReel.objects.all()
    serializer_class = ActiviteTempsReelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrage par anomalie
        anomalie = self.request.query_params.get('anomalie', None)
        if anomalie is not None:
            queryset = queryset.filter(anomalie=anomalie.lower() == 'true')
        
        # Filtrage par catégorie
        categorie = self.request.query_params.get('categorie', None)
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        
        # Dernières N heures
        hours = self.request.query_params.get('last_hours', None)
        if hours:
            try:
                cutoff = timezone.now() - timedelta(hours=int(hours))
                queryset = queryset.filter(timestamp__gte=cutoff)
            except ValueError:
                pass
        
        return queryset


class AIAnalysisViewSet(viewsets.ViewSet):
    """
    ViewSet pour les analyses IA personnalisées.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def monthly_evolution(self, request):
        """
        Générer une analyse d'évolution mensuelle avec prévisions.
        """
        serializer = MonthlyEvolutionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = evolution_mensuelle.analyze_monthly_evolution(
                start_date=serializer.validated_data['start_date'],
                end_date=serializer.validated_data['end_date'],
                category=serializer.validated_data.get('category'),
                forecast_periods=serializer.validated_data.get('forecast_periods', 12)
            )
            
            return Response(results, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def detailed_analysis(self, request):
        """
        Générer une analyse détaillée par catégorie et variable.
        """
        serializer = DetailedAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = evolution_detaillee.analyze_detailed_evolution(
                start_date=serializer.validated_data['start_date'],
                end_date=serializer.validated_data['end_date'],
                categories=serializer.validated_data.get('categories'),
                variables=serializer.validated_data.get('variables')
            )
            
            return Response(results, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def geospatial_analysis(self, request):
        """
        Générer une analyse géospatiale (heatmap incluse).
        """
        serializer = GeospatialRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = repartition_geo.analyze_geospatial_distribution(
                date=serializer.validated_data['date'],
                regions=serializer.validated_data.get('regions'),
                include_heatmap=serializer.validated_data.get('include_heatmap', True)
            )
            
            return Response(results, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def realtime_analysis(self, request):
        """
        Analyser l'activité en temps réel et détecter les anomalies.
        """
        serializer = RealtimeAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = activite_temps_reel.analyze_realtime_activity(
                time_window=serializer.validated_data.get('time_window', 24),
                detection_types=serializer.validated_data.get('detection_types'),
                min_severity=serializer.validated_data.get('min_severity', 'low')
            )
            
            return Response(results, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

