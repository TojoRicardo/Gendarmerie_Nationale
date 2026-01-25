"""
Configuration des URLs pour le module Biometrie (Production)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
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
]
