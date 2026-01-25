# pylint: disable=import-error
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IAReconnaissanceFacialeViewSet,
    IAAnalyseStatistiqueViewSet,
    IAMatchBiometriqueViewSet,
    IAPredictionViewSet,
    IAPatternViewSet,
    IACorrelationViewSet,
    # Nouveaux endpoints IA fonctionnels
    ReconnaissanceViewSet,
    RecherchePhotoAPIView,
    RecherchePhotoStreamAPIView,
    ReconnaissanceStreamingViewSet,
    RealtimeRecognitionView,
    PredictionViewSet,
    PatternsViewSet,
    StatistiquesIAViewSet,
    # Reconnaissance faciale ArcFace
    FaceRecognitionView,
    GenerateEmbeddingView
)
from .views_dashboard import (
    IAStatistiquesView,
    IAEvolutionView,
    IALocalisationsView,
    IATempsReelView
)
from .views_pattern_recognition import (
    CaseAnalysisAPIView,
    ModelTrainingAPIView
)

router = DefaultRouter()

router.register(r'reconnaissance-faciale', IAReconnaissanceFacialeViewSet, basename='reconnaissance-faciale')
router.register(r'analyses-statistiques', IAAnalyseStatistiqueViewSet, basename='analyses-statistiques')
router.register(r'matches-biometriques', IAMatchBiometriqueViewSet, basename='matches-biometriques')
router.register(r'predictions-db', IAPredictionViewSet, basename='predictions-db')
router.register(r'patterns-db', IAPatternViewSet, basename='patterns-db')
router.register(r'correlations-db', IACorrelationViewSet, basename='correlations-db')

urlpatterns = [
    path('', include(router.urls)),
    # Nouveaux endpoints IA
    path('reconnaissance/', ReconnaissanceViewSet.as_view(), name='reconnaissance'),
    path('recherche-photo/', RecherchePhotoAPIView.as_view(), name='ia-recherche-photo'),
    path('recherche-photo-stream/', RecherchePhotoStreamAPIView.as_view(), name='ia-recherche-photo-stream'),
    path('reconnaissance-streaming/', ReconnaissanceStreamingViewSet.as_view(), name='reconnaissance-streaming'),
    path('realtime-recognition/', RealtimeRecognitionView.as_view(), name='ia-realtime-recognition'),
    path('prediction/', PredictionViewSet.as_view(), name='prediction'),
    path('patterns/', PatternsViewSet.as_view(), name='patterns'),
    path('statistiques/', StatistiquesIAViewSet.as_view(), name='statistiques-ia'),
    
    #RECONNAISSANCE FACIALE ARCFACE
    path('arcface/reconnaître/', FaceRecognitionView.as_view(), name='arcface-reconnaissance'),
    path('arcface/reconnaissance/', FaceRecognitionView.as_view(), name='arcface-reconnaissance-ascii'),
    path('arcface/generer-embedding/<int:criminel_id>/', GenerateEmbeddingView.as_view(), name='arcface-generer-embedding'),
    
    #TABLEAU DE BORD IA - GRAPHIQUES AVANCÉS
    path('dashboard/statistiques/', IAStatistiquesView.as_view(), name='ia-dashboard-statistiques'),
    path('dashboard/evolution/', IAEvolutionView.as_view(), name='ia-dashboard-evolution'),
    path('dashboard/localisations/', IALocalisationsView.as_view(), name='ia-dashboard-localisations'),
    path('dashboard/temps-reel/', IATempsReelView.as_view(), name='ia-dashboard-temps-reel'),
    
    #ANALYSE PRÉDICTIVE ET PRÉDICTIONS
    # Case Analysis - routes séparées pour éviter les conflits d'URL
    path('case-analysis/create/', CaseAnalysisAPIView.as_view(), name='case-analysis-analyze'),  # POST pour créer
    path('case-analysis/list/', CaseAnalysisAPIView.as_view(), name='case-analysis-list'),  # GET pour lister
    path('model-training/train/', ModelTrainingAPIView.as_view(), name='model-training-train'),
    path('model-training/', ModelTrainingAPIView.as_view(), name='model-training-list'),
]
