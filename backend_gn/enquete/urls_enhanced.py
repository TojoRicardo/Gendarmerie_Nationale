"""
URLs pour les viewsets améliorés des enquêtes
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .viewsets_enhanced import EnqueteViewSet, PieceEnqueteViewSet

router = DefaultRouter()
router.register(r'enquetes', EnqueteViewSet, basename='enquete')
router.register(r'pieces-enquete', PieceEnqueteViewSet, basename='piece-enquete')

urlpatterns = [
    path('api/enquetes/', include(router.urls)),
]

