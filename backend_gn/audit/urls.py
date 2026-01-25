"""
URLs pour le module Audit
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .views import JournalAuditViewSet, JournalAuditNarratifViewSet

router = DefaultRouter()
router.register(r'', JournalAuditViewSet, basename='audit')
router.register(r'narratifs', JournalAuditNarratifViewSet, basename='audit-narratifs')


class StatutIAView(APIView):
    """
    Vue pour récupérer le statut de la configuration IA (Ollama).
    Retourne toujours un statut par défaut car le module LLaMA a été supprimé.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            'disponible': False,
            'message': 'Module IA locale désactivé',
            'ollama_configure': False,
            'model_charge': None
        }, status=200)


urlpatterns = [
    path('statut_ia/', StatutIAView.as_view(), name='audit-statut-ia'),
] + router.urls

