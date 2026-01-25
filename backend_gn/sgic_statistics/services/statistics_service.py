"""
Services statistiques principaux pour SGIC.
Utilise Pandas pour préparer les données.
"""

import pandas as pd
from django.utils import timezone
from django.db.models import Count

from sgic_statistics.models import CriminalCase


def _query_to_dataframe(queryset):
    data = list(queryset.values('province', 'date_created', 'status'))
    if not data:
        return pd.DataFrame(columns=['province', 'date_created', 'status'])
    df = pd.DataFrame(data)
    df['date_created'] = pd.to_datetime(df['date_created'])
    return df


def get_monthly_evolution():
    """
    Retourne l'évolution mensuelle des dossiers (line chart).
    """
    df = _query_to_dataframe(CriminalCase.objects.all())
    if df.empty:
        return {'labels': [], 'values': []}

    df['month'] = df['date_created'].dt.to_period('M').dt.to_timestamp()
    grouped = (
        df.groupby('month')
        .size()
        .reset_index(name='count')
        .sort_values('month')
    )

    return {
        'labels': [month.strftime('%b %Y') for month in grouped['month']],
        'values': grouped['count'].astype(int).tolist(),
    }


def get_case_trend():
    """
    Retourne les variations mensuelles (bar chart).
    """
    df = _query_to_dataframe(CriminalCase.objects.all())
    if df.empty:
        return {'labels': [], 'values': []}

    df['month'] = df['date_created'].dt.to_period('M').dt.to_timestamp()
    grouped = df.groupby('month').size().reset_index(name='count').sort_values('month')

    return {
        'labels': [month.strftime('%b %Y') for month in grouped['month']],
        'values': grouped['count'].astype(int).tolist(),
    }


def get_province_distribution():
    """
    Retourne la répartition par province (pie chart).
    """
    qs = CriminalCase.objects.values('province').annotate(total=Count('id'))
    if not qs:
        return {'labels': [], 'values': []}

    labels = [item['province'] for item in qs]
    values = [item['total'] for item in qs]
    return {'labels': labels, 'values': values}


def get_realtime_activity():
    """
    Retourne le nombre de nouveaux cas sur les dernières 24h.
    """
    since = timezone.now() - timezone.timedelta(hours=24)
    count = CriminalCase.objects.filter(date_created__gte=since.date()).count()
    hourly_df = (
        _query_to_dataframe(
            CriminalCase.objects.filter(date_created__gte=since.date())
        )
    )

    if hourly_df.empty:
        hourly_points = {'labels': [], 'values': []}
    else:
        hourly_df['hour'] = hourly_df['date_created'].dt.hour
        hour_grouped = (
            hourly_df.groupby('hour')
            .size()
            .reset_index(name='count')
            .sort_values('hour')
        )
        hourly_points = {
            'labels': [f'{int(h)}h' for h in hour_grouped['hour']],
            'values': hour_grouped['count'].astype(int).tolist(),
        }

    return {'total_24h': count, 'hourly': hourly_points}

