"""
Services pour les courbes statistiques (courbes évolutives).
"""

import pandas as pd
from django.utils import timezone

from sgic_statistics.models import CriminalCase


def get_monthly_curve():
    """
    Regroupe les dossiers criminels par mois et retourne
    les données nécessaires à une courbe (line chart).
    """
    queryset = CriminalCase.objects.values('date_created')
    if not queryset.exists():
        return {'months': [], 'counts': []}

    df = pd.DataFrame(list(queryset))
    df['date_created'] = pd.to_datetime(df['date_created'])
    df['month'] = df['date_created'].dt.to_period('M').dt.to_timestamp()

    grouped = (
        df.groupby('month')
        .size()
        .reset_index(name='count')
        .sort_values('month')
    )

    return {
        'months': [month.strftime('%b %Y') for month in grouped['month']],
        'counts': grouped['count'].astype(int).tolist(),
    }

