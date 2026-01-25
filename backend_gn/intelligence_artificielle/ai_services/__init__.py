"""
Services IA pour le module Intelligence Artificielle
====================================================

Ce package contient tous les services d'intelligence artificielle.
"""

from .analyse_predictive import AnalysePredictiveService
from .pattern_correlation import PatternCorrelationService
from .analyse_statistique import AnalyseStatistiqueService
from .prediction_recherche import PredictionRechercheService
from .matching_intelligent import MatchingIntelligentService
from .alert_system import AlertSystemService

__all__ = [
    'AnalysePredictiveService',
    'PatternCorrelationService',
    'AnalyseStatistiqueService',
    'PredictionRechercheService',
    'MatchingIntelligentService',
    'AlertSystemService'
]
