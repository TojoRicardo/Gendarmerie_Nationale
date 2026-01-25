from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from . import views_dossier

app_name = "enquete"

# Router pour les ViewSets du module de versement
router = DefaultRouter()
router.register(r'dossier/personnes', views_dossier.PersonneEnqueteViewSet, basename='personne-enquete')
router.register(r'dossier/infractions', views_dossier.InfractionEnqueteViewSet, basename='infraction-enquete')
router.register(r'dossier/preuves', views_dossier.PreuveEnqueteViewSet, basename='preuve-enquete')
router.register(r'dossier/rapports-types', views_dossier.RapportTypeViewSet, basename='rapport-type')
router.register(r'dossier/rapports', views_dossier.RapportEnqueteCompletViewSet, basename='rapport-enquete-complet')
router.register(r'dossier/biometrie', views_dossier.BiometrieEnqueteViewSet, basename='biometrie-enquete')
router.register(r'dossier/audit-logs', views_dossier.AuditLogEnqueteViewSet, basename='audit-log-enquete')
router.register(r'dossier/decisions', views_dossier.DecisionClotureViewSet, basename='decision-cloture')

urlpatterns = [
    path("preuves/create/", views.PreuveCreateView.as_view(), name="preuves-create"),
    path(
        "preuves/<int:dossier_id>/",
        views.PreuveListView.as_view(),
        name="preuves-list",
    ),
    path(
        "preuves/item/<int:pk>/",
        views.PreuveDetailView.as_view(),
        name="preuves-detail",
    ),
    path("rapports/create/", views.RapportCreateView.as_view(), name="rapports-create"),
    path(
        "rapports/<int:dossier_id>/",
        views.RapportListView.as_view(),
        name="rapports-list",
    ),
    path(
        "rapports/item/<int:pk>/",
        views.RapportDetailView.as_view(),
        name="rapports-detail",
    ),
    path(
        "observations/create/",
        views.ObservationCreateView.as_view(),
        name="observations-create",
    ),
    path(
        "observations/<int:dossier_id>/",
        views.ObservationListView.as_view(),
        name="observations-list",
    ),
    path(
        "observations/item/<int:pk>/",
        views.ObservationDetailView.as_view(),
        name="observations-detail",
    ),
    path(
        "avancement/update/",
        views.AvancementUpdateView.as_view(),
        name="avancement-update",
    ),
    path(
        "avancement/<int:dossier_id>/",
        views.AvancementListView.as_view(),
        name="avancement-list",
    ),
    path(
        "avancement/item/<int:pk>/",
        views.AvancementDetailView.as_view(),
        name="avancement-detail",
    ),
    # Types d'enquête
    path(
        "types/",
        views.TypeEnqueteListView.as_view(),
        name="types-list",
    ),
    path(
        "types/<int:pk>/",
        views.TypeEnqueteDetailView.as_view(),
        name="types-detail",
    ),
    # Enquêtes
    path(
        "create/",
        views.EnqueteCreateView.as_view(),
        name="enquetes-create",
    ),
    path(
        "list/",
        views.EnqueteListView.as_view(),
        name="enquetes-list",
    ),
    path(
        "<uuid:id>/",
        views.EnqueteDetailView.as_view(),
        name="enquetes-detail",
    ),
    path(
        "<uuid:id>/statut/",
        views.EnqueteStatutUpdateView.as_view(),
        name="enquetes-statut-update",
    ),
    path(
        "<uuid:id>/rapport/",
        views.EnqueteRapportListView.as_view(),
        name="enquetes-rapport-list",
    ),
    # Relations Enquête-Criminel
    path(
        "<uuid:id>/criminels/",
        views.EnqueteCriminelListView.as_view(),
        name="enquetes-criminels-list",
    ),
    path(
        "criminels/create/",
        views.EnqueteCriminelCreateView.as_view(),
        name="enquetes-criminels-create",
    ),
    path(
        "criminels/<int:pk>/",
        views.EnqueteCriminelDetailView.as_view(),
        name="enquetes-criminels-detail",
    ),
    # Module de versement des dossiers d'enquête
    path(
        "dossier/versement/",
        views_dossier.DossierEnqueteVersementView.as_view(),
        name="dossier-versement",
    ),
    path(
        "dossier/<uuid:enquete_id>/",
        views_dossier.DossierEnqueteDetailView.as_view(),
        name="dossier-detail",
    ),
    # Routes du router pour les ViewSets
    path('', include(router.urls)),
]


