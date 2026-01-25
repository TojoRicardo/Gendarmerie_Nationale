"""
Configuration des URLs pour le module Biometrie
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BiometrieEnregistrementAPIView,
    BiometrieReconnaissanceAPIView,
    Landmarks106APIView,
    AnalyseBiometriqueAPIView,
    EncodeVisageAPIView,
    BiometriePhotoViewSet,
    BiometrieEmpreinteViewSet,
    BiometrieScanResultatViewSet,
    BiometrieHistoriqueViewSet,
)

# Router DRF pour les ViewSets
router = DefaultRouter()
router.register(r'photos', BiometriePhotoViewSet, basename='biometrie-photo')
router.register(r'empreintes', BiometrieEmpreinteViewSet, basename='biometrie-empreinte')
router.register(r'scans', BiometrieScanResultatViewSet, basename='biometrie-scan')
router.register(r'historique', BiometrieHistoriqueViewSet, basename='biometrie-historique')

urlpatterns = [
    path('', include(router.urls)),
    path('enregistrer/', BiometrieEnregistrementAPIView.as_view(), name='biometrie-enregistrer'),
    path('reconnaitre/', BiometrieReconnaissanceAPIView.as_view(), name='biometrie-reconnaitre'),
    path('landmarks106/', Landmarks106APIView.as_view(), name='biometrie-landmarks106'),
    path('analyse/', AnalyseBiometriqueAPIView.as_view(), name='biometrie-analyse'),
    path('encoder/', EncodeVisageAPIView.as_view(), name='biometrie-encoder'),
]
