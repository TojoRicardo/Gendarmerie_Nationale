"""
Routes API pour les analyses sur DONNÉES RÉELLES.
Ces endpoints analysent directement CriminalFicheCriminelle.

Structure des URLs:
    /api/ai-analysis/real/evolution_mensuelle/    - Évolution mensuelle réelle
    /api/ai-analysis/real/par_motif/              - Analyse par motif d'arrestation
    /api/ai-analysis/real/repartition_geo/        - Répartition géographique réelle
    /api/ai-analysis/real/activite_temps_reel/    - Activité récente réelle
    /api/ai-analysis/real/statistiques/           - Statistiques globales
    
    /api/ai-analysis/statistiques/region/         - Statistiques par région (GET)
    /api/ai-analysis/statistiques/sexe/           - Statistiques par sexe (GET)
    /api/ai-analysis/statistiques/statut-enquete/ - Statistiques par statut d'enquête (GET)
    /api/ai-analysis/statistiques/gravite/        - Statistiques par gravité (GET)
    /api/ai-analysis/statistiques/evolution-enquetes-resolues/ - Évolution enquêtes résolues (GET)
    /api/ai-analysis/statistiques/type-infraction/ - Statistiques par type d'infraction (GET)
    /api/ai-analysis/statistiques/globales/       - Toutes les statistiques (GET)
"""

from django.urls import path
from .views_donnees_reelles import (
    AnalyseEvolutionMensuelleReelleView,
    AnalyseParMotifReelleView,
    AnalyseRepartitionGeoReelleView,
    AnalyseActiviteTempsReelReelleView,
    StatistiquesFichesCriminellesView,
    RecherchePhotoReelleView,
)
from .views_statistiques import (
    StatistiquesParRegionView,
    StatistiquesParSexeView,
    StatistiquesParStatutEnqueteView,
    StatistiquesParGraviteView,
    EvolutionEnquetesResoluesView,
    StatistiquesParTypeInfractionView,
    StatistiquesGlobalesView
)

urlpatterns = [
    path('real/evolution_mensuelle/', AnalyseEvolutionMensuelleReelleView.as_view(), name='analyse-evolution-reelle'),
    path('real/par_motif/', AnalyseParMotifReelleView.as_view(), name='analyse-motif-reel'),
    path('real/repartition_geo/', AnalyseRepartitionGeoReelleView.as_view(), name='analyse-geo-reelle'),
    path('real/activite_temps_reel/', AnalyseActiviteTempsReelReelleView.as_view(), name='analyse-temps-reel-reel'),
    path('real/recherche_photo/', RecherchePhotoReelleView.as_view(), name='analyse-recherche-photo-reelle'),
    path('real/statistiques/', StatistiquesFichesCriminellesView.as_view(), name='statistiques-reelles'),
    
    path('statistiques/region/', StatistiquesParRegionView.as_view(), name='stats-region'),
    path('statistiques/sexe/', StatistiquesParSexeView.as_view(), name='stats-sexe'),
    path('statistiques/statut-enquete/', StatistiquesParStatutEnqueteView.as_view(), name='stats-statut-enquete'),
    path('statistiques/gravite/', StatistiquesParGraviteView.as_view(), name='stats-gravite'),
    path('statistiques/evolution-enquetes-resolues/', EvolutionEnquetesResoluesView.as_view(), name='stats-evolution-enquetes'),
    path('statistiques/type-infraction/', StatistiquesParTypeInfractionView.as_view(), name='stats-type-infraction'),
    path('statistiques/globales/', StatistiquesGlobalesView.as_view(), name='stats-globales'),
]

