from rest_framework.routers import DefaultRouter
from django.urls import path, include

from .views import (
    CriminalCaseViewSet,
    StatisticsAnalysisView,
    MonthlyCurveView,
    MonthlyEvolutionView,
    CaseTrendView,
    ProvinceDistributionView,
    RealtimeActivityView,
)

router = DefaultRouter()
router.register('cases', CriminalCaseViewSet, basename='criminal-case')

urlpatterns = [
    path('analysis/', StatisticsAnalysisView.as_view(), name='statistics-analysis'),
    path('monthly-curve/', MonthlyCurveView.as_view(), name='statistics-monthly-curve'),
    path('monthly-evolution/', MonthlyEvolutionView.as_view(), name='statistics-monthly-evolution'),
    path('case-trend/', CaseTrendView.as_view(), name='statistics-case-trend'),
    path('province-distribution/', ProvinceDistributionView.as_view(), name='statistics-province-distribution'),
    path('realtime-activity/', RealtimeActivityView.as_view(), name='statistics-realtime-activity'),
    path('', include(router.urls)),
]

