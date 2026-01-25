"""
Vues pour le tableau de bord IA - Graphiques Avancés
Endpoints pour les statistiques en temps réel
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Count, Q, Avg, Max, Min
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils import timezone
from datetime import datetime, timedelta
from .models import (
    IAReconnaissanceFaciale, IAPrediction, IAPattern, IACorrelation
)
from criminel.models import CriminalFicheCriminelle


class IAStatistiquesView(APIView):
    """
    Endpoint pour les statistiques générales IA
    GET /api/ia/statistiques/
    
    Retourne les statistiques globales des reconnaissances faciales et analyses IA
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Période par défaut : 30 derniers jours
            periode_jours = int(request.query_params.get('jours', 30))
            date_debut = timezone.now() - timedelta(days=periode_jours)
            
            # Statistiques des reconnaissances faciales
            reconnaissances = IAReconnaissanceFaciale.objects.filter(
                date_analyse__gte=date_debut
            )
            
            total_reconnaissances = reconnaissances.count()
            reussies = reconnaissances.filter(
                statut='correspondance_trouvee'
            ).count()
            echecs = reconnaissances.filter(
                statut='aucune_correspondance'
            ).count()
            en_attente = reconnaissances.filter(
                statut='en_attente'
            ).count()
            
            # Score de confiance moyen
            score_moyen = reconnaissances.aggregate(
                avg_score=Avg('score_confiance')
            )['avg_score'] or 0
            
            # Statistiques des prédictions
            predictions = IAPrediction.objects.filter(
                date_generation__gte=date_debut
            )
            total_predictions = predictions.count()
            
            # Statistiques des patterns détectés
            patterns = IAPattern.objects.filter(
                date_detection__gte=date_debut
            )
            total_patterns = patterns.count()
            
            # Statistiques des corrélations
            correlations = IACorrelation.objects.filter(
                date_detection__gte=date_debut
            )
            total_correlations = correlations.count()
            
            evolution_quotidienne = []
            for i in range(periode_jours):
                date_jour = timezone.now() - timedelta(days=periode_jours - i - 1)
                date_jour_debut = date_jour.replace(hour=0, minute=0, second=0, microsecond=0)
                date_jour_fin = date_jour.replace(hour=23, minute=59, second=59, microsecond=999999)
                
                nb_reconnaissances = IAReconnaissanceFaciale.objects.filter(
                    date_analyse__gte=date_jour_debut,
                    date_analyse__lte=date_jour_fin
                ).count()
                
                nb_reussies = IAReconnaissanceFaciale.objects.filter(
                    date_analyse__gte=date_jour_debut,
                    date_analyse__lte=date_jour_fin,
                    statut='correspondance_trouvee'
                ).count()
                
                evolution_quotidienne.append({
                    'date': date_jour_debut.strftime('%Y-%m-%d'),
                    'jour': date_jour_debut.strftime('%d/%m'),
                    'total': nb_reconnaissances,
                    'reussies': nb_reussies,
                    'echecs': nb_reconnaissances - nb_reussies
                })
            
            return Response({
                'success': True,
                'periode_jours': periode_jours,
                'statistiques': {
                    'total_reconnaissances': total_reconnaissances,
                    'reussies': reussies,
                    'echecs': echecs,
                    'en_attente': en_attente,
                    'taux_reussite': round((reussies / total_reconnaissances * 100) if total_reconnaissances > 0 else 0, 2),
                    'score_confiance_moyen': round(score_moyen, 2),
                    'total_predictions': total_predictions,
                    'total_patterns': total_patterns,
                    'total_correlations': total_correlations
                },
                'evolution': evolution_quotidienne
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class IAEvolutionView(APIView):
    """
    Endpoint pour l'évolution des détections IA
    GET /api/ia/evolution/?periode=30j
    
    Retourne l'évolution des détections IA par jour/semaine/mois
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            periode = request.query_params.get('periode', '30j')
            
            # Déterminer la période et la granularité
            if periode == '7j':
                jours = 7
                granularite = 'jour'
            elif periode == '30j':
                jours = 30
                granularite = 'jour'
            elif periode == '3m':
                jours = 90
                granularite = 'semaine'
            elif periode == '1a':
                jours = 365
                granularite = 'mois'
            else:
                jours = 30
                granularite = 'jour'
            
            date_debut = timezone.now() - timedelta(days=jours)
            
            # Récupérer les données selon la granularité
            if granularite == 'jour':
                evolution = IAReconnaissanceFaciale.objects.filter(
                    date_analyse__gte=date_debut
                ).annotate(
                    jour=TruncDay('date_analyse')
                ).values('jour').annotate(
                    total=Count('id'),
                    reussies=Count('id', filter=Q(statut='correspondance_trouvee')),
                    echecs=Count('id', filter=Q(statut='aucune_correspondance')),
                    score_moyen=Avg('score_confiance')
                ).order_by('jour')
            elif granularite == 'semaine':
                evolution = IAReconnaissanceFaciale.objects.filter(
                    date_analyse__gte=date_debut
                ).annotate(
                    semaine=TruncWeek('date_analyse')
                ).values('semaine').annotate(
                    total=Count('id'),
                    reussies=Count('id', filter=Q(statut='correspondance_trouvee')),
                    echecs=Count('id', filter=Q(statut='aucune_correspondance')),
                    score_moyen=Avg('score_confiance')
                ).order_by('semaine')
            else:  # mois
                evolution = IAReconnaissanceFaciale.objects.filter(
                    date_analyse__gte=date_debut
                ).annotate(
                    mois=TruncMonth('date_analyse')
                ).values('mois').annotate(
                    total=Count('id'),
                    reussies=Count('id', filter=Q(statut='correspondance_trouvee')),
                    echecs=Count('id', filter=Q(statut='aucune_correspondance')),
                    score_moyen=Avg('score_confiance')
                ).order_by('mois')
            
            # Formater les données
            donnees_evolution = []
            for item in evolution:
                date_key = 'jour' if granularite == 'jour' else ('semaine' if granularite == 'semaine' else 'mois')
                date_value = item[date_key]
                
                if granularite == 'jour':
                    label = date_value.strftime('%d/%m')
                elif granularite == 'semaine':
                    label = f"Sem {date_value.strftime('%U')}"
                else:
                    label = date_value.strftime('%b %Y')
                
                donnees_evolution.append({
                    'periode': label,
                    'date': date_value.strftime('%Y-%m-%d'),
                    'total': item['total'],
                    'reussies': item['reussies'],
                    'echecs': item['echecs'],
                    'score_moyen': round(item['score_moyen'] or 0, 2),
                    'taux_reussite': round((item['reussies'] / item['total'] * 100) if item['total'] > 0 else 0, 2)
                })
            
            return Response({
                'success': True,
                'periode': periode,
                'granularite': granularite,
                'donnees': donnees_evolution
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class IALocalisationsView(APIView):
    """
    Endpoint pour les localisations des détections IA
    GET /api/ia/localisations/
    
    Retourne les coordonnées GPS ou villes où l'IA a reconnu des criminels
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Récupérer les reconnaissances avec localisations
            reconnaissances = IAReconnaissanceFaciale.objects.filter(
                criminel_identifie__isnull=False
            ).select_related('criminel_identifie')
            
            localisations = []
            for rec in reconnaissances:
                criminel = rec.criminel_identifie
                if criminel:
                    # Récupérer la localisation depuis la fiche criminelle
                    lieu_arrestation = criminel.lieu_arrestation or ''
                    province = criminel.province or ''
                    latitude = getattr(criminel, 'latitude', None)
                    longitude = getattr(criminel, 'longitude', None)
                    
                    if lieu_arrestation or province or (latitude and longitude):
                        localisations.append({
                            'id': rec.id,
                            'criminel_id': criminel.id,
                            'criminel_nom': f"{criminel.nom} {criminel.prenom or ''}".strip(),
                            'numero_fiche': criminel.numero_fiche or '',
                            'lieu': lieu_arrestation,
                            'province': province,
                            'latitude': float(latitude) if latitude else None,
                            'longitude': float(longitude) if longitude else None,
                            'score_confiance': float(rec.score_confiance),
                            'date_analyse': rec.date_analyse.isoformat()
                        })
            
            return Response({
                'success': True,
                'localisations': localisations,
                'total': len(localisations)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class IATempsReelView(APIView):
    """
    Endpoint pour les données en temps réel
    GET /api/ia/temps-reel/
    
    Retourne le nombre de reconnaissances faciales réussies/échecs en direct
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Dernières 24 heures
            date_debut = timezone.now() - timedelta(hours=24)
            
            # Reconnaissances par heure
            reconnaissances_par_heure = IAReconnaissanceFaciale.objects.filter(
                date_analyse__gte=date_debut
            ).extra(
                select={'heure': "EXTRACT(HOUR FROM date_analyse)"}
            ).values('heure').annotate(
                total=Count('id'),
                reussies=Count('id', filter=Q(statut='correspondance_trouvee')),
                echecs=Count('id', filter=Q(statut='aucune_correspondance'))
            ).order_by('heure')
            
            # Formater les données
            donnees_temps_reel = []
            for item in reconnaissances_par_heure:
                heure = int(item['heure'])
                donnees_temps_reel.append({
                    'heure': f"{heure:02d}:00",
                    'total': item['total'],
                    'reussies': item['reussies'],
                    'echecs': item['echecs']
                })
            
            # Statistiques globales des dernières 24h
            total_24h = IAReconnaissanceFaciale.objects.filter(
                date_analyse__gte=date_debut
            ).count()
            
            reussies_24h = IAReconnaissanceFaciale.objects.filter(
                date_analyse__gte=date_debut,
                statut='correspondance_trouvee'
            ).count()
            
            echecs_24h = IAReconnaissanceFaciale.objects.filter(
                date_analyse__gte=date_debut,
                statut='aucune_correspondance'
            ).count()
            
            dernieres = IAReconnaissanceFaciale.objects.filter(
                date_analyse__gte=date_debut
            ).select_related('criminel_identifie').order_by('-date_analyse')[:10]
            
            dernieres_liste = []
            for rec in dernieres:
                dernieres_liste.append({
                    'id': rec.id,
                    'statut': rec.statut,
                    'score_confiance': float(rec.score_confiance),
                    'criminel_nom': f"{rec.criminel_identifie.nom} {rec.criminel_identifie.prenom or ''}".strip() if rec.criminel_identifie else 'Inconnu',
                    'date_analyse': rec.date_analyse.isoformat()
                })
            
            return Response({
                'success': True,
                'periode': '24h',
                'statistiques': {
                    'total_24h': total_24h,
                    'reussies_24h': reussies_24h,
                    'echecs_24h': echecs_24h,
                    'taux_reussite': round((reussies_24h / total_24h * 100) if total_24h > 0 else 0, 2)
                },
                'par_heure': donnees_temps_reel,
                'dernieres': dernieres_liste,
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

