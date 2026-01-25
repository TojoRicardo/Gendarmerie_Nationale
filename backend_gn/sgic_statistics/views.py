from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import CriminalCase
from .serializers import CriminalCaseSerializer
from .permissions import IsAdminOrAnalyst
from .analysis_service import (
    analyse_mensuelle,
    analyse_nombre_cas,
    analyse_par_province,
    analyse_temps_reel,
    analyse_fluctuations,
)
from .services.curve_service import get_monthly_curve
from .services.statistics_service import (
    get_monthly_evolution,
    get_case_trend,
    get_province_distribution,
    get_realtime_activity,
)
from .utils import plot_generator


class CriminalCaseViewSet(viewsets.ModelViewSet):
    queryset = CriminalCase.objects.all()
    serializer_class = CriminalCaseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]
    filterset_fields = ['province', 'status']
    search_fields = ['province']


class StatisticsAnalysisView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        monthly = analyse_mensuelle()
        number_cases = analyse_nombre_cas()
        geo = analyse_par_province()
        realtime = analyse_temps_reel()
        fluctuations = analyse_fluctuations()

        payload = {
            'monthly': monthly,
            'number_cases': number_cases,
            'geography': geo,
            'realtime': realtime,
            'fluctuations': fluctuations,
            'plots': {
                'monthly_line': plot_generator.evolution_line_chart(monthly),
                'number_bar': plot_generator.bar_cases_chart(number_cases),
                'geo_pie': plot_generator.pie_province_chart(geo),
            },
        }

        return Response(payload, status=status.HTTP_200_OK)


class MonthlyCurveView(APIView):
    """
    Retourne les données et le graphique Plotly pour l'évolution mensuelle.
    """

    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        data = get_monthly_curve()
        plot_json = plot_generator.generate_monthly_curve_plot(data)
        return Response(
            {'data': data, 'plot': plot_json},
            status=status.HTTP_200_OK,
        )


class MonthlyEvolutionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        data = get_monthly_evolution()
        plot_json = plot_generator.plot_monthly_evolution(data)
        return Response({'data': data, 'plot': plot_json}, status=status.HTTP_200_OK)


class CaseTrendView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        data = get_case_trend()
        plot_json = plot_generator.plot_case_trend(data)
        return Response({'data': data, 'plot': plot_json}, status=status.HTTP_200_OK)


class ProvinceDistributionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        data = get_province_distribution()
        plot_json = plot_generator.plot_province_distribution(data)
        return Response({'data': data, 'plot': plot_json}, status=status.HTTP_200_OK)


class RealtimeActivityView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        data = get_realtime_activity()
        plot_json = plot_generator.plot_realtime_activity(data)
        return Response({'data': data, 'plot': plot_json}, status=status.HTTP_200_OK)

# Create your views here.
