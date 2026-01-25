"""
Vues API GET pour les statistiques et graphiques depuis les DONNÉES RÉELLES PostgreSQL.
Endpoints optimisés pour le frontend React.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from .services.analyse_statistiques_avancees import (
    analyser_par_region,
    analyser_par_sexe,
    analyser_par_statut_enquete,
    analyser_par_gravite_crime,
    analyser_evolution_enquetes_resolues,
    analyser_par_type_infraction,
    obtenir_statistiques_globales
)
from .utils import generer_graphique


class StatistiquesParRegionView(APIView):
    """
    GET /api/ai-analysis/statistiques/region/
    
    Retourne les statistiques par région avec données pour graphique en barres.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer les statistiques par région"""
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            start = None
            end = None
            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            results = analyser_par_region(start, end)
            
            # Générer le graphique PNG
            graph_path = generer_graphique(
                'bar',
                results['donnees'],
                filename_prefix='stats_region',
                title='Répartition des criminels par région',
                xlabel='Région',
                ylabel='Nombre de fiches'
            )
            
            return Response({
                'success': True,
                'message': 'Statistiques par région générées depuis les DONNÉES RÉELLES',
                'data': results,
                'graph_path': graph_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StatistiquesParSexeView(APIView):
    """
    GET /api/ai-analysis/statistiques/sexe/
    
    Retourne les statistiques par sexe avec données pour graphique camembert.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer les statistiques par sexe"""
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            start = None
            end = None
            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            results = analyser_par_sexe(start, end)
            
            # Générer le graphique camembert PNG
            graph_path = generer_graphique(
                'pie',
                results['donnees'],
                filename_prefix='stats_sexe',
                title='Répartition des criminels par sexe'
            )
            
            return Response({
                'success': True,
                'message': 'Statistiques par sexe générées depuis les DONNÉES RÉELLES',
                'data': results,
                'graph_path': graph_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StatistiquesParStatutEnqueteView(APIView):
    """
    GET /api/ai-analysis/statistiques/statut-enquete/
    
    Retourne les statistiques par statut d'enquête avec données pour graphique camembert.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer les statistiques par statut d'enquête"""
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            start = None
            end = None
            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            results = analyser_par_statut_enquete(start, end)
            
            # Générer le graphique camembert PNG
            graph_path = generer_graphique(
                'pie',
                results['donnees'],
                filename_prefix='stats_statut',
                title='Répartition des fiches par statut d\'enquête'
            )
            
            return Response({
                'success': True,
                'message': "Statistiques par statut d'enquête générées depuis les DONNÉES RÉELLES",
                'data': results,
                'graph_path': graph_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StatistiquesParGraviteView(APIView):
    """
    GET /api/ai-analysis/statistiques/gravite/
    
    Retourne les statistiques par niveau de dangerosité (gravité).
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer les statistiques par gravité"""
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            start = None
            end = None
            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            results = analyser_par_gravite_crime(start, end)
            
            # Générer le graphique en barres PNG
            graph_path = generer_graphique(
                'bar',
                results['donnees'],
                filename_prefix='stats_gravite',
                title='Répartition des criminels par gravité',
                xlabel='Niveau de dangerosité',
                ylabel='Nombre de fiches'
            )
            
            return Response({
                'success': True,
                'message': 'Statistiques par gravité générées depuis les DONNÉES RÉELLES',
                'data': results,
                'graph_path': graph_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EvolutionEnquetesResoluesView(APIView):
    """
    GET /api/ai-analysis/statistiques/evolution-enquetes-resolues/
    
    Retourne l'évolution mensuelle du taux d'enquêtes résolues.
    Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer l'évolution du taux d'enquêtes résolues"""
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Par défaut: 12 derniers mois
            if not start_date or not end_date:
                end = timezone.now().date()
                start = end - relativedelta(months=12)
            else:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            results = analyser_evolution_enquetes_resolues(start, end)
            
            # Générer le graphique en lignes PNG
            graph_path = generer_graphique(
                'line',
                {
                    'labels': results['donnees']['labels'],
                    'values': results['donnees']['taux_resolution']
                },
                filename_prefix='evolution_enquetes_resolues',
                title='Évolution du taux d\'enquêtes résolues',
                xlabel='Mois',
                ylabel='Taux de résolution (%)'
            )
            
            return Response({
                'success': True,
                'message': "Évolution des enquêtes résolues générée depuis les DONNÉES RÉELLES",
                'data': results,
                'graph_path': graph_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StatistiquesParTypeInfractionView(APIView):
    """
    GET /api/ai-analysis/statistiques/type-infraction/
    
    Retourne les statistiques par type d'infraction (motif d'arrestation).
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer les statistiques par type d'infraction"""
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            start = None
            end = None
            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            results = analyser_par_type_infraction(start, end)
            
            # Générer le graphique en barres PNG
            graph_path = generer_graphique(
                'bar',
                results['donnees'],
                filename_prefix='stats_type_infraction',
                title='Répartition des criminels par type d\'infraction',
                xlabel='Type d\'infraction',
                ylabel='Nombre de fiches'
            )
            
            return Response({
                'success': True,
                'message': "Statistiques par type d'infraction générées depuis les DONNÉES RÉELLES",
                'data': results,
                'graph_path': graph_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StatistiquesGlobalesView(APIView):
    """
    GET /api/ai-analysis/statistiques/globales/
    
    Retourne toutes les statistiques globales consolidées.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer toutes les statistiques globales"""
        try:
            results = obtenir_statistiques_globales()
            
            return Response({
                'success': True,
                'message': 'Statistiques globales générées depuis les DONNÉES RÉELLES',
                'data': results
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

