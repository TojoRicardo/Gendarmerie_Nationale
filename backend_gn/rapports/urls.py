from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RapportViewSet, GenerateReportView, TelechargerRapportPDFView

router = DefaultRouter()
# Enregistrer sans préfixe 'rapports' car il est déjà dans le path principal (api/rapports/)
router.register(r'', RapportViewSet, basename='rapport')

urlpatterns = [
    # Routes personnalisées AVANT le router (ordre CRITIQUE pour éviter que le router capture les UUIDs)
    path('generate/', GenerateReportView.as_view(), name='generate-report'),
    path('<uuid:rapport_id>/telecharger/', TelechargerRapportPDFView.as_view(), name='telecharger-rapport-pdf'),
    # Router DRF en dernier - il génère: /, /{pk}/, /{pk}/action/, etc.
    # Mais nos routes personnalisées sont testées EN PREMIER
    path('', include(router.urls)),
]
