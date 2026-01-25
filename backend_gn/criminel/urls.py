from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RefStatutFicheViewSet,
    RefTypeInfractionViewSet,
    RefStatutAffaireViewSet,
    CriminalFicheCriminelleViewSet,
    CriminalTypeInfractionViewSet,
    CriminalInfractionViewSet,
    InvestigationAssignmentViewSet,
)

router = DefaultRouter()

# Routes pour les modèles de référence
router.register(r'ref-statut-fiche', RefStatutFicheViewSet)
router.register(r'ref-type-infraction', RefTypeInfractionViewSet)
router.register(r'ref-statut-affaire', RefStatutAffaireViewSet)

# Routes pour les modèles criminels
router.register(r'fiches-criminelles', CriminalFicheCriminelleViewSet)
router.register(r'types-infractions', CriminalTypeInfractionViewSet)
router.register(r'infractions', CriminalInfractionViewSet)
router.register(r'assignations', InvestigationAssignmentViewSet, basename='assignation')

urlpatterns = [
    path('', include(router.urls)),
]

