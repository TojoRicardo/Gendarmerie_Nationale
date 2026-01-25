"""
URLs pour l'API de reconnaissance faciale.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PersonViewSet,
    FaceEmbeddingViewSet,
    RecognizeView,
    VerifyView,
    StatsView,
    RecognitionLogViewSet
)

router = DefaultRouter()
router.register(r'persons', PersonViewSet, basename='person')
router.register(r'faces', FaceEmbeddingViewSet, basename='face-embedding')
router.register(r'recognize', RecognizeView, basename='recognize')
router.register(r'verify', VerifyView, basename='verify')
router.register(r'stats', StatsView, basename='stats')
router.register(r'logs', RecognitionLogViewSet, basename='recognition-log')

urlpatterns = [
    path('', include(router.urls)),
]
