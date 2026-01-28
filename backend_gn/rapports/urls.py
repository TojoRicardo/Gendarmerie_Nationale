from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import RapportViewSet, GenerateReportView, TelechargerRapportPDFView

router = DefaultRouter()
# Utiliser 'reports' comme préfixe pour éviter les conflits avec les routes personnalisées
router.register(r'reports', RapportViewSet, basename='rapport')

urlpatterns = [
    # Route spécifique pour télécharger - DOIT être EN PREMIER avec préfixe pour éviter les conflits
    # Utiliser un préfixe très spécifique 'download-pdf' pour éviter tout conflit avec le router DRF
    # Le router DRF génère reports/{pk}/ qui pourrait capturer l'UUID si on utilise <uuid>/telecharger/
    path('download-pdf/<uuid:rapport_id>/', TelechargerRapportPDFView.as_view(), name='telecharger-rapport-pdf-alt'),
    # Route alternative avec préfixe telecharger/ pour compatibilité
    re_path(
        r'^telecharger/(?P<rapport_id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/$',
        TelechargerRapportPDFView.as_view(),
        name='telecharger-rapport-pdf'
    ),
    # Routes personnalisées - doivent être définies AVANT le router pour être prioritaires
    path('generate/', GenerateReportView.as_view(), name='generate-report'),
    # Routes de compatibilité pour les actions du ViewSet (detail=False)
    # Ces routes permettent d'accéder aux actions via /rapports/creer/ et /rapports/statistiques/
    path('creer/', RapportViewSet.as_view({'post': 'creer'}), name='rapport-creer-compat'),
    path('statistiques/', RapportViewSet.as_view({'get': 'statistiques'}), name='rapport-statistiques-compat'),
    # Router DRF - génère: /reports/, /reports/{pk}/, /reports/creer/, /reports/statistiques/, etc.
    # Les routes personnalisées ci-dessus sont testées EN PREMIER par Django dans l'ordre défini
    path('', include(router.urls)),
]
