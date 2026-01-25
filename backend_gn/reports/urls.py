from django.urls import path
from .views import FicheCriminellePDFView
from .views_v2 import FicheCriminellePDFViewV2
from rapports.views import GenerateReportView

urlpatterns = [
    path('fiche-criminelle-pdf/<int:criminel_id>/', FicheCriminellePDFView.as_view(), name='fiche-criminelle-pdf'),
    path('fiche-criminelle-pdf-v2/<int:criminel_id>/', FicheCriminellePDFViewV2.as_view(), name='fiche-criminelle-pdf-v2'),
    path('generate/', GenerateReportView.as_view(), name='generate-report'),
]

