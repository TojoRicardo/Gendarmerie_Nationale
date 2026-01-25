"""
Services d'analyse statistique pour SGIC.
Utilise Pandas et Scikit-Learn pour produire des statistiques évolutives.
"""

import pandas as pd
from django.db.models import Count
from django.utils import timezone
from sklearn.linear_model import LinearRegression
import numpy as np

from .models import CriminalCase


def _to_dataframe(queryset):
    data = list(queryset.values('province', 'date_created', 'status'))
    if not data:
        return pd.DataFrame(columns=['province', 'date_created', 'status'])
    df = pd.DataFrame(data)
    df['date_created'] = pd.to_datetime(df['date_created'])
    return df


def analyse_mensuelle():
    """
    Retourne l'évolution mensuelle des dossiers criminels.
    """
    qs = CriminalCase.objects.all()
    df = _to_dataframe(qs)
    if df.empty:
        return []

    df['mois'] = df['date_created'].dt.to_period('M').dt.to_timestamp()
    grouped = df.groupby('mois').size().reset_index(name='total')

    X = np.arange(len(grouped)).reshape(-1, 1)
    y = grouped['total'].values
    model = LinearRegression().fit(X, y) if len(grouped) > 1 else None

    grouped['prediction'] = (
        model.predict(X) if model is not None else grouped['total']
    )

    return [
        {
            'mois': row['mois'].strftime('%b %Y'),
            'total': int(row['total']),
            'prediction': float(row['prediction']),
        }
        for _, row in grouped.iterrows()
    ]


def analyse_nombre_cas():
    """
    Analyse l'évolution du nombre de cas et détecte les fluctuations.
    """
    qs = CriminalCase.objects.all()
    df = _to_dataframe(qs)
    if df.empty:
        return []

    df['mois'] = df['date_created'].dt.to_period('M').dt.to_timestamp()
    monthly = df.groupby('mois').size().reset_index(name='total')
    monthly['variation'] = monthly['total'].pct_change().fillna(0) * 100

    return [
        {
            'mois': row['mois'].strftime('%b %Y'),
            'total': int(row['total']),
            'variation': round(row['variation'], 2),
        }
        for _, row in monthly.iterrows()
    ]


def analyse_par_province():
    """
    Répartition géographique des cas.
    """
    qs = CriminalCase.objects.values('province').annotate(total=Count('id'))
    total = sum(item['total'] for item in qs) or 1
    return [
        {
            'province': item['province'],
            'total': item['total'],
            'pourcentage': round(item['total'] / total * 100, 2),
        }
        for item in qs
    ]


def analyse_temps_reel():
    """
    Activité des dernières 24h.
    """
    since = timezone.now() - timezone.timedelta(hours=24)
    count = CriminalCase.objects.filter(date_created__gte=since.date()).count()
    return {'dernières_24h': count}


def analyse_fluctuations():
    """
    Analyse les fluctuations temporelles (variation + anomalies simples).
    """
    qs = CriminalCase.objects.all()
    df = _to_dataframe(qs)
    if df.empty:
        return {'amplitude': 0, 'variation': 0, 'tendance': 'stable'}

    df['jour'] = df['date_created'].dt.date
    daily = df.groupby('jour').size().reset_index(name='total')

    amplitude = daily['total'].max() - daily['total'].min()
    variation = daily['total'].pct_change().fillna(0).mean() * 100

    tendance = 'stable'
    if variation > 5:
        tendance = 'hausse'
    elif variation < -5:
        tendance = 'baisse'

    return {
        'amplitude': int(amplitude),
        'variation': round(variation, 2),
        'tendance': tendance,
    }

