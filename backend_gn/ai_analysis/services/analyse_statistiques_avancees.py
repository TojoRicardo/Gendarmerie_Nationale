"""
Service d'analyse statistique avancée utilisant les DONNÉES RÉELLES PostgreSQL.
Analyse par région, sexe, statut d'enquête, gravité de crime, etc.
"""

from django.db.models import Count, Q, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import pandas as pd
import numpy as np

from criminel.models import CriminalFicheCriminelle, RefStatutFiche, RefTypeInfraction


def analyser_par_region(start_date=None, end_date=None):
    """
    Analyse la répartition des criminels par région (lieu_arrestation).
    
    Args:
        start_date: Date de début (optionnel)
        end_date: Date de fin (optionnel)
    
    Returns:
        dict: Statistiques par région avec données pour graphique en barres
    """
    queryset = CriminalFicheCriminelle.objects.all()
    
    # Filtrer par date si fourni
    if start_date and end_date:
        queryset = queryset.filter(
            Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
        )
    
    stats_region = queryset.exclude(
        lieu_arrestation__isnull=True
    ).exclude(
        lieu_arrestation=''
    ).values(
        'lieu_arrestation'
    ).annotate(
        count=Count('id')
    ).order_by('-count')[:15]  # Top 15 régions
    
    # Formater pour graphique
    regions = []
    counts = []
    
    for item in stats_region:
        regions.append(item['lieu_arrestation'])
        counts.append(item['count'])
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'type_analyse': 'Répartition par région',
        'total_fiches': sum(counts),
        'nombre_regions': len(regions),
        'donnees': {
            'labels': regions,
            'values': counts
        },
        'graphique_type': 'bar',
        'details': [
            {'region': region, 'nombre': count}
            for region, count in zip(regions, counts)
        ]
    }


def analyser_par_sexe(start_date=None, end_date=None):
    """
    Analyse la répartition des criminels par sexe.
    
    Args:
        start_date: Date de début (optionnel)
        end_date: Date de fin (optionnel)
    
    Returns:
        dict: Statistiques par sexe avec données pour graphique en camembert
    """
    queryset = CriminalFicheCriminelle.objects.all()
    
    # Filtrer par date si fourni
    if start_date and end_date:
        queryset = queryset.filter(
            Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
        )
    
    # Compter par sexe
    stats_sexe = queryset.exclude(
        sexe__isnull=True
    ).exclude(
        sexe=''
    ).values(
        'sexe'
    ).annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Formater pour graphique camembert
    sexes = []
    counts = []
    
    for item in stats_sexe:
        # Convertir code en libellé
        sexe_label = 'Homme' if item['sexe'] == 'H' else 'Femme'
        sexes.append(sexe_label)
        counts.append(item['count'])
    
    total = sum(counts)
    pourcentages = [(count / total * 100) if total > 0 else 0 for count in counts]
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'type_analyse': 'Répartition par sexe',
        'total_fiches': total,
        'donnees': {
            'labels': sexes,
            'values': counts,
            'pourcentages': pourcentages
        },
        'graphique_type': 'pie',  # Camembert
        'details': [
            {'sexe': sexe, 'nombre': count, 'pourcentage': round(pct, 2)}
            for sexe, count, pct in zip(sexes, counts, pourcentages)
        ]
    }


def analyser_par_statut_enquete(start_date=None, end_date=None):
    """
    Analyse la répartition des fiches par statut d'enquête (statut_fiche).
    
    Args:
        start_date: Date de début (optionnel)
        end_date: Date de fin (optionnel)
    
    Returns:
        dict: Statistiques par statut d'enquête avec données pour graphique
    """
    queryset = CriminalFicheCriminelle.objects.all()
    
    # Filtrer par date si fourni
    if start_date and end_date:
        queryset = queryset.filter(
            Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
        )
    
    # Compter par statut_fiche
    stats_statut = queryset.exclude(
        statut_fiche__isnull=True
    ).values(
        'statut_fiche__libelle'
    ).annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Si aucun statut_fiche n'est défini, compter les fiches sans statut
    total_avec_statut = sum(item['count'] for item in stats_statut)
    total_sans_statut = queryset.filter(statut_fiche__isnull=True).count()
    
    statuts = []
    counts = []
    
    for item in stats_statut:
        statuts.append(item['statut_fiche__libelle'] or 'Non défini')
        counts.append(item['count'])
    
    if total_sans_statut > 0:
        statuts.append('Non défini')
        counts.append(total_sans_statut)
    
    total = sum(counts)
    pourcentages = [(count / total * 100) if total > 0 else 0 for count in counts]
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'type_analyse': 'Répartition par statut d\'enquête',
        'total_fiches': total,
        'donnees': {
            'labels': statuts,
            'values': counts,
            'pourcentages': pourcentages
        },
        'graphique_type': 'pie',  # Camembert
        'details': [
            {'statut': statut, 'nombre': count, 'pourcentage': round(pct, 2)}
            for statut, count, pct in zip(statuts, counts, pourcentages)
        ]
    }


def analyser_par_gravite_crime(start_date=None, end_date=None):
    """
    Analyse la répartition des criminels par niveau de dangerosité (gravité).
    
    Args:
        start_date: Date de début (optionnel)
        end_date: Date de fin (optionnel)
    
    Returns:
        dict: Statistiques par niveau de dangerosité
    """
    queryset = CriminalFicheCriminelle.objects.all()
    
    # Filtrer par date si fourni
    if start_date and end_date:
        queryset = queryset.filter(
            Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
        )
    
    # Compter par niveau_danger
    stats_gravite = queryset.values(
        'niveau_danger'
    ).annotate(
        count=Count('id')
    ).order_by('niveau_danger')
    
    # Convertir niveau_danger en libellé
    niveau_labels = {
        1: 'Faible',
        2: 'Modéré',
        3: 'Élevé',
        4: 'Très Élevé',
        5: 'Extrême'
    }
    
    niveaux = []
    counts = []
    
    for item in stats_gravite:
        niveau = item['niveau_danger']
        label = niveau_labels.get(niveau, f'Niveau {niveau}')
        niveaux.append(label)
        counts.append(item['count'])
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'type_analyse': 'Répartition par gravité de crime',
        'total_fiches': sum(counts),
        'donnees': {
            'labels': niveaux,
            'values': counts
        },
        'graphique_type': 'bar',
        'details': [
            {'niveau': niveau, 'nombre': count}
            for niveau, count in zip(niveaux, counts)
        ]
    }


def analyser_evolution_enquetes_resolues(start_date, end_date):
    """
    Analyse l'évolution mensuelle du taux d'enquêtes résolues.
    
    Args:
        start_date: Date de début
        end_date: Date de fin
    
    Returns:
        dict: Évolution mensuelle avec taux de résolution
    """
    queryset = CriminalFicheCriminelle.objects.filter(
        Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
        Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
    )
    
    statuts_resolus = ['Clôturé', 'Résolu', 'Classé', 'Jugé']
    
    monthly_data = []
    current_date = start_date.replace(day=1)
    end = end_date.replace(day=1)
    
    while current_date <= end:
        next_month = current_date + relativedelta(months=1)
        
        # Fiches créées ce mois
        fiches_mois = queryset.filter(
            Q(date_arrestation__gte=current_date, date_arrestation__lt=next_month) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=current_date, date_creation__date__lt=next_month)
        )
        
        total_mois = fiches_mois.count()
        
        # Fiches résolues ce mois
        fiches_resolues = fiches_mois.filter(
            statut_fiche__libelle__in=statuts_resolus
        ).count()
        
        taux_resolution = (fiches_resolues / total_mois * 100) if total_mois > 0 else 0
        
        monthly_data.append({
            'mois': current_date.strftime('%Y-%m'),
            'mois_label': current_date.strftime('%b %Y'),
            'total_fiches': total_mois,
            'fiches_resolues': fiches_resolues,
            'taux_resolution': round(taux_resolution, 2)
        })
        
        current_date = next_month
    
    # Extraire les données pour graphique
    labels = [item['mois_label'] for item in monthly_data]
    taux = [item['taux_resolution'] for item in monthly_data]
    total = [item['total_fiches'] for item in monthly_data]
    resolues = [item['fiches_resolues'] for item in monthly_data]
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'type_analyse': 'Évolution du taux d\'enquêtes résolues',
        'period': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d')
        },
        'donnees': {
            'labels': labels,
            'taux_resolution': taux,
            'total_fiches': total,
            'fiches_resolues': resolues
        },
        'graphique_type': 'line',
        'details': monthly_data
    }


def analyser_par_type_infraction(start_date=None, end_date=None):
    """
    Analyse la répartition par type d'infraction (via motif_arrestation).
    
    Args:
        start_date: Date de début (optionnel)
        end_date: Date de fin (optionnel)
    
    Returns:
        dict: Statistiques par type d'infraction
    """
    queryset = CriminalFicheCriminelle.objects.all()
    
    # Filtrer par date si fourni
    if start_date and end_date:
        queryset = queryset.filter(
            Q(date_arrestation__gte=start_date, date_arrestation__lte=end_date) |
            Q(date_arrestation__isnull=True, date_creation__date__gte=start_date, date_creation__date__lte=end_date)
        )
    
    # Extraire les motifs d'arrestation et compter
    stats_motif = queryset.exclude(
        motif_arrestation__isnull=True
    ).exclude(
        motif_arrestation=''
    ).values(
        'motif_arrestation'
    ).annotate(
        count=Count('id')
    ).order_by('-count')[:20]  # Top 20 motifs
    
    motifs = []
    counts = []
    
    for item in stats_motif:
        motifs.append(item['motif_arrestation'])
        counts.append(item['count'])
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'type_analyse': 'Répartition par type d\'infraction',
        'total_fiches': sum(counts),
        'donnees': {
            'labels': motifs,
            'values': counts
        },
        'graphique_type': 'bar',
        'details': [
            {'motif': motif, 'nombre': count}
            for motif, count in zip(motifs, counts)
        ]
    }


def obtenir_statistiques_globales():
    """
    Retourne un résumé global de toutes les statistiques.
    
    Returns:
        dict: Statistiques globales consolidées
    """
    total_fiches = CriminalFicheCriminelle.objects.count()
    
    # Par sexe
    stats_sexe = analyser_par_sexe()
    
    # Par région
    stats_region = analyser_par_region()
    
    # Par statut
    stats_statut = analyser_par_statut_enquete()
    
    # Par gravité
    stats_gravite = analyser_par_gravite_crime()
    
    date_limite = timezone.now() - timedelta(days=30)
    fiches_recentes = CriminalFicheCriminelle.objects.filter(
        date_creation__gte=date_limite
    ).count()
    
    return {
        'source': 'DONNÉES RÉELLES - CriminalFicheCriminelle',
        'total_fiches': total_fiches,
        'fiches_recentes_30j': fiches_recentes,
        'par_sexe': stats_sexe,
        'par_region': stats_region,
        'par_statut_enquete': stats_statut,
        'par_gravite': stats_gravite
    }

