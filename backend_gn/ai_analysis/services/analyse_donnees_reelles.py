"""
Service d'analyse IA utilisant les données RÉELLES du système criminel.
Utilise directement le modèle CriminalFicheCriminelle existant.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from django.db.models import Count, Avg, Q
from django.utils import timezone

# Import du modèle RÉEL existant
from criminel.models import CriminalFicheCriminelle, RefTypeInfraction



def analyser_evolution_mensuelle_reelle(start_date, end_date, motif=None, forecast_periods=12):
    """
    Analyse l'évolution mensuelle des fiches criminelles RÉELLES.
    Utilise date_arrestation ou date_creation comme référence.
    
    Args:
        start_date: Date de début
        end_date: Date de fin
        motif: Filtrer par motif d'arrestation (optionnel)
        forecast_periods: Nombre de mois à prévoir
    
    Returns:
        dict: Résultats de l'analyse avec prévisions
    """
    manager = CriminalFicheCriminelle.objects  # type: ignore[attr-defined]
    queryset = manager.all()
    
    queryset = queryset.filter(
        Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
        Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
    )
    
    if motif:
        queryset = queryset.filter(motif_arrestation__icontains=motif)
    
    # Agréger par mois
    monthly_data = []
    current_date = start_date.replace(day=1)
    end = end_date.replace(day=1)
    
    while current_date <= end:
        next_month = current_date + relativedelta(months=1)
        
        count = queryset.filter(
            Q(date_arrestation__gte=current_date, date_arrestation__lt=next_month) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=current_date, date_creation__date__lt=next_month)
        ).count()
        
        monthly_data.append({
            'mois': current_date.strftime('%Y-%m-%d'),
            'total_fiches': count
        })
        
        current_date = next_month
    
    # Créer un DataFrame
    df = pd.DataFrame(monthly_data)
    
    if df.empty or len(df) < 3:
        return {
            'error': 'Données insuffisantes pour l\'analyse',
            'min_required': 3,
            'found': len(df)
        }
    
    # Calculer la moyenne mobile
    df['moyenne_mobile'] = df['total_fiches'].rolling(window=3, min_periods=1).mean()
    
    # Statistiques
    stats = {
        'total_fiches': int(df['total_fiches'].sum()),
        'moyenne_mensuelle': float(df['total_fiches'].mean()),
        'max_fiches': int(df['total_fiches'].max()),
        'min_fiches': int(df['total_fiches'].min()),
        'ecart_type': float(df['total_fiches'].std()),
    }
    
    # Prévisions
    forecasts = generer_previsions_reelles(df, forecast_periods)
    
    # Tendance
    trend = calculer_tendance_reelle(df)
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'period': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d')
        },
        'motif': motif,
        'statistics': stats,
        'historical_data': df.to_dict('records'),
        'forecasts': forecasts,
        'trend': trend
    }


# ============================================================
# 2️⃣ ANALYSE DÉTAILLÉE PAR MOTIF/INFRACTION RÉELLE
# ============================================================

def analyser_par_motif_reel(start_date, end_date, motifs=None):
    """
    Analyse détaillée par motif d'arrestation RÉEL.
    """
    manager = CriminalFicheCriminelle.objects  # type: ignore[attr-defined]
    queryset = manager.filter(
        Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
        Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
    )
    
    if motifs:
        q_objects = Q()
        for m in motifs:
            q_objects.add(Q(motif_arrestation__icontains=m), Q.OR)
        if q_objects.children:
            queryset = queryset.filter(q_objects)
    
    # Obtenir les motifs distincts
    all_motifs = queryset.exclude(motif_arrestation__isnull=True).exclude(motif_arrestation='').values_list('motif_arrestation', flat=True).distinct()
    
    if not all_motifs:
        return {
            'error': 'Aucune fiche avec motif d\'arrestation trouvée'
        }
    
    # Analyser chaque motif
    motifs_analysis = []
    
    for motif in all_motifs:
        motif_data = analyser_motif_unique(queryset, motif, start_date, end_date)
        motifs_analysis.append(motif_data)
    
    # Comparaison
    comparison = comparer_motifs_reels(motifs_analysis)
    
    return {
        'source': 'DONNÉES RÉELLES - Motifs d\'arrestation',
        'period': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d')
        },
        'motifs': motifs_analysis,
        'comparison': comparison,
        'summary': {
            'nombre_motifs': len(motifs_analysis),
            'total_fiches': sum(m['statistics']['total'] for m in motifs_analysis)
        }
    }


def analyser_motif_unique(queryset, motif, start_date, end_date):
    """
    Analyse un seul motif d'arrestation.
    """
    motif_cases = queryset.filter(motif_arrestation__icontains=motif)
    
    # Données mensuelles
    monthly_data = []
    current_date = start_date.replace(day=1)
    end = end_date.replace(day=1)
    
    while current_date <= end:
        next_month = current_date + relativedelta(months=1)
        
        count = motif_cases.filter(
            Q(date_arrestation__gte=current_date, date_arrestation__lt=next_month) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=current_date, date_creation__date__lt=next_month)
        ).count()
        
        monthly_data.append({
            'mois': current_date.strftime('%Y-%m-%d'),
            'total': count
        })
        
        current_date = next_month
    
    total_cases = motif_cases.count()
    df = pd.DataFrame(monthly_data)
    
    stats = {
        'total': total_cases,
        'moyenne_mensuelle': float(df['total'].mean()) if len(df) > 0 else 0,
        'max_mensuel': int(df['total'].max()) if len(df) > 0 else 0,
        'min_mensuel': int(df['total'].min()) if len(df) > 0 else 0,
    }
    
    return {
        'motif': motif,
        'statistics': stats,
        'monthly_data': monthly_data
    }


def comparer_motifs_reels(motifs_analysis):
    """
    Compare les différents motifs entre eux.
    """
    if len(motifs_analysis) < 2:
        return {}
    
    sorted_motifs = sorted(motifs_analysis, key=lambda x: x['statistics']['total'], reverse=True)
    
    return {
        'plus_frequent': {
            'motif': sorted_motifs[0]['motif'],
            'total': sorted_motifs[0]['statistics']['total']
        },
        'moins_frequent': {
            'motif': sorted_motifs[-1]['motif'],
            'total': sorted_motifs[-1]['statistics']['total']
        }
    }


def analyser_repartition_geo_reelle(start_date, end_date, regions=None, include_heatmap=True):
    """
    Analyse la répartition géographique RÉELLE basée sur lieu_arrestation ou adresse.
    """
    manager = CriminalFicheCriminelle.objects  # type: ignore[attr-defined]
    queryset = manager.filter(
        Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
        Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
    )
    
    if regions:
        # OR dynamique via Q.add pour rester bien typé avec Pyright
        q_objects = Q()
        for region in regions:
            q_objects.add(Q(lieu_arrestation__icontains=region), Q.OR)
            q_objects.add(Q(adresse__icontains=region), Q.OR)
        if q_objects.children:
            queryset = queryset.filter(q_objects)
    
    # Agréger par lieu d'arrestation + coordonnées réelles si présentes
    lieux_arrestation = queryset.exclude(lieu_arrestation__isnull=True).exclude(lieu_arrestation='').values(
        'lieu_arrestation', 'latitude', 'longitude'
    ).annotate(
        total=Count('id')
    ).order_by('-total')

    provinces_canon = [
        'TOLIARA',
        'ANTANANARIVO',
        'MAHAJANGA',
        'ANTSIRANANA',
        'FIANARANTSOA',
        'TOAMASINA',
    ]
    province_counts = {p: 0 for p in provinces_canon}
    
    if not lieux_arrestation.exists():
        return {
            'error': 'Aucune donnée géographique disponible'
        }
    
    # Préparer les données géographiques
    geographic_data = []
    total_cases = 0
    
    for item in lieux_arrestation:
        lieu = (item['lieu_arrestation'] or '').strip()
        total = int(item['total'] or 0)
        total_cases += total
        # Comptage par province si correspondance
        lower = lieu.casefold()
        matched = False
        for p in provinces_canon:
            if p.casefold() in lower:
                province_counts[p] += total
                matched = True
                break
        # Collect brut pour retour éventuel
        geographic_data.append({
            'lieu': lieu,
            'total_fiches': total,
            'latitude': item.get('latitude'),
            'longitude': item.get('longitude'),
        })
    
    # Générer la heatmap si demandé et si des coordonnées réelles existent
    heatmap_data = None
    if include_heatmap and geographic_data and any(g.get('latitude') and g.get('longitude') for g in geographic_data):
        heatmap_data = generer_heatmap_reelle(geographic_data)
    
    # Construire distribution par province pour graphes barres horizontales
    provinces_distribution = [
        {'province': p, 'total': province_counts[p]} for p in provinces_canon
    ]

    return {
        'source': 'DONNÉES RÉELLES - Lieux d\'arrestation',
        'period': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d')
        },
        'total_fiches': total_cases,
        'nombre_lieux': len(geographic_data),
        'distribution': geographic_data,
        'provinces': provinces_distribution,
        'heatmap_data': heatmap_data
    }



def analyser_activite_temps_reel_reelle(time_window=24):
    """
    Analyse l'activité récente des fiches criminelles.
    """
    end_time = timezone.now()
    start_time = end_time - timedelta(hours=time_window)
    
    manager = CriminalFicheCriminelle.objects  # type: ignore[attr-defined]
    recent_fiches = manager.filter(
        date_creation__gte=start_time
    )
    
    if not recent_fiches.exists():
        return {
            'message': 'Aucune activité récente',
            'time_window': time_window,
            'anomalies': []
        }
    
    # Analyser par motif
    motif_activity = recent_fiches.exclude(motif_arrestation__isnull=True).exclude(motif_arrestation='').values('motif_arrestation').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Analyser par lieu
    lieu_activity = recent_fiches.exclude(lieu_arrestation__isnull=True).exclude(lieu_arrestation='').values('lieu_arrestation').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Détecter les anomalies
    anomalies = detecter_anomalies_reelles(recent_fiches, time_window)
    
    return {
        'source': 'DONNÉES RÉELLES - Activité récente',
        'time_window': time_window,
        'period': {
            'start': start_time.strftime('%Y-%m-%d %H:%M:%S'),
            'end': end_time.strftime('%Y-%m-%d %H:%M:%S')
        },
        'statistics': {
            'total_fiches_recentes': recent_fiches.count(),
            'nombre_motifs_distincts': motif_activity.count(),
            'nombre_lieux_distincts': lieu_activity.count()
        },
        'motif_activity': list(motif_activity),
        'lieu_activity': list(lieu_activity),
        'anomalies': anomalies
    }


def detecter_anomalies_reelles(recent_fiches, time_window):
    """
    Détecte les anomalies dans l'activité récente.
    """
    anomalies = []
    
    # Comparer avec la moyenne historique
    week_ago = timezone.now() - timedelta(days=7)
    # Pyright: annotate manager access explicitly
    manager = CriminalFicheCriminelle.objects  # type: ignore[attr-defined]
    historical_avg = manager.filter(
        date_creation__gte=week_ago,
        date_creation__lt=timezone.now() - timedelta(hours=time_window)
    ).count() / 7
    
    recent_count = recent_fiches.count()
    
    if historical_avg > 0:
        deviation = ((recent_count - historical_avg) / historical_avg * 100)
        
        if abs(deviation) > 100:  # Anomalie si + de 100% de différence
            anomalies.append({
                'type': 'pic_activite',
                'valeur_actuelle': recent_count,
                'valeur_attendue': round(historical_avg, 2),
                'deviation_pct': round(deviation, 2),
                'severity': 'high' if abs(deviation) > 200 else 'medium',
                'description': f"Pic d'activité détecté: {deviation:+.1f}% par rapport à la normale"
            })
    
    return anomalies


def generer_previsions_reelles(df, periods):
    """
    Génère des prévisions basées sur les données réelles.
    """
    if len(df) < 2:
        return []
    
    x = np.arange(len(df))
    y = df['total_fiches'].values
    
    coefficients = np.polyfit(x, y, 1)
    slope, intercept = coefficients
    
    forecasts = []
    last_date = datetime.strptime(df['mois'].iloc[-1], '%Y-%m-%d')
    
    for i in range(1, periods + 1):
        forecast_date = last_date + relativedelta(months=i)
        predicted_value = slope * (len(df) + i - 1) + intercept
        
        confidence_interval = abs(predicted_value * 0.2)
        
        forecasts.append({
            'mois': forecast_date.strftime('%Y-%m-%d'),
            'prevision': max(0, round(predicted_value, 2)),
            'intervalle_confiance': {
                'min': max(0, round(predicted_value - confidence_interval, 2)),
                'max': round(predicted_value + confidence_interval, 2)
            }
        })
    
    return forecasts


def calculer_tendance_reelle(df):
    """
    Calcule la tendance générale.
    """
    if len(df) < 2:
        return 'insufficient_data'
    
    x = np.arange(len(df))
    y = df['total_fiches'].values
    slope = np.polyfit(x, y, 1)[0]
    
    if slope > 0.5:
        return 'hausse'
    elif slope < -0.5:
        return 'baisse'
    else:
        return 'stable'


# Supprimé: aucune simulation des coordonnées n'est autorisée


def generer_heatmap_reelle(geographic_data):
    """
    Génère les données pour une heatmap.
    """
    heatmap_points = []
    
    for item in geographic_data:
        if item['latitude'] and item['longitude']:
            heatmap_points.append({
                'lat': item['latitude'],
                'lng': item['longitude'],
                'intensity': item['total_fiches']
            })
    
    if heatmap_points:
        lats = [p['lat'] for p in heatmap_points]
        lngs = [p['lng'] for p in heatmap_points]
        
        bounds = {
            'north': max(lats),
            'south': min(lats),
            'east': max(lngs),
            'west': min(lngs),
            'center': {
                'lat': sum(lats) / len(lats),
                'lng': sum(lngs) / len(lngs)
            }
        }
    else:
        bounds = None
    
    return {
        'points': heatmap_points,
        'bounds': bounds,
        'max_intensity': max((p['intensity'] for p in heatmap_points), default=0)
    }

