"""
Routes API pour l'application ai_analysis

 DONNÉES RÉELLES (RECOMMANDÉ):
    /api/ai-analysis/real/evolution_mensuelle/    - Évolution mensuelle RÉELLE
    /api/ai-analysis/real/par_motif/              - Analyse par motif RÉEL
    /api/ai-analysis/real/repartition_geo/        - Répartition géo RÉELLE
    /api/ai-analysis/real/activite_temps_reel/    - Activité récente RÉELLE
    /api/ai-analysis/real/statistiques/           - Statistiques RÉELLES

Structure des URLs (legacy):
    /api/ai-analysis/cas/                    - CRUD des cas
    /api/ai-analysis/evolution_mensuelle/    - CRUD + IA évolution mensuelle
    /api/ai-analysis/evolution_detaillee/    - CRUD + IA évolution détaillée
    /api/ai-analysis/repartition_geo/        - CRUD + IA répartition géographique
    /api/ai-analysis/activite_temps_reel/    - CRUD + IA activité temps réel
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .urls_donnees_reelles import urlpatterns as real_urls

# Désactivation complète des routes DEMO: seules les routes RÉELLES sont exposées
urlpatterns = [
    *real_urls,
    # Alias simples demandés
    path('evolution_mensuelle/', __import__('ai_analysis.views_donnees_reelles', fromlist=['views_donnees_reelles']).AnalyseEvolutionMensuelleReelleView.as_view(), name='real-evolution-mensuelle'),
    path('evolution_detaillee/', __import__('ai_analysis.views_donnees_reelles', fromlist=['views_donnees_reelles']).AnalyseParMotifReelleView.as_view(), name='real-evolution-detaillee'),
    path('repartition_geo/', __import__('ai_analysis.views_donnees_reelles', fromlist=['views_donnees_reelles']).AnalyseRepartitionGeoReelleView.as_view(), name='real-repartition-geo'),
    path('activite_temps_reel/', __import__('ai_analysis.views_donnees_reelles', fromlist=['views_donnees_reelles']).AnalyseActiviteTempsReelReelleView.as_view(), name='real-activite-temps-reel'),
    path('recherche_photo/', __import__('ai_analysis.views_donnees_reelles', fromlist=['views_donnees_reelles']).RecherchePhotoReelleView.as_view(), name='real-recherche-photo'),
]

# Router pour les ViewSets
router = DefaultRouter()

