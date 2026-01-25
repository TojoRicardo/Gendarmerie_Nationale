"""
Fonctions utilitaires partagées pour l'application ai_analysis.
"""
import os
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

import logging
import matplotlib
matplotlib.use('Agg')  # backend non interactif pour serveur
import matplotlib.pyplot as plt
import seaborn as sns
from django.conf import settings

logger = logging.getLogger(__name__)


def date_range_to_months(start_date, end_date):
    """
    Génère une liste de dates (premier jour de chaque mois) entre deux dates.
    
    Args:
        start_date: Date de début
        end_date: Date de fin
    
    Returns:
        list: Liste d'objets date pour chaque mois
    """
    months = []
    current = start_date.replace(day=1)
    end = end_date.replace(day=1)
    
    while current <= end:
        months.append(current)
        current += relativedelta(months=1)
    
    return months


def calculate_percentage_change(old_value, new_value):
    """
    Calcule le pourcentage de changement entre deux valeurs.
    
    Args:
        old_value: Ancienne valeur
        new_value: Nouvelle valeur
    
    Returns:
        float: Pourcentage de changement
    """
    if old_value == 0:
        return 100.0 if new_value > 0 else 0.0
    
    return ((new_value - old_value) / old_value) * 100


def moving_average(data, window=3):
    """
    Calcule la moyenne mobile d'une série de données.
    
    Args:
        data: Liste ou Series de données
        window: Taille de la fenêtre
    
    Returns:
        numpy.array: Moyennes mobiles
    """
    if isinstance(data, list):
        data = pd.Series(data)
    
    return data.rolling(window=window, min_periods=1).mean().values


def detect_outliers_iqr(data, multiplier=1.5):
    """
    Détecte les valeurs aberrantes en utilisant la méthode IQR.
    
    Args:
        data: Données à analyser
        multiplier: Multiplicateur pour l'IQR (1.5 par défaut)
    
    Returns:
        dict: Indices des outliers et statistiques
    """
    if isinstance(data, list):
        data = pd.Series(data)
    
    Q1 = data.quantile(0.25)
    Q3 = data.quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - multiplier * IQR
    upper_bound = Q3 + multiplier * IQR
    
    outliers = data[(data < lower_bound) | (data > upper_bound)]
    
    return {
        'outlier_indices': outliers.index.tolist(),
        'outlier_values': outliers.tolist(),
        'lower_bound': lower_bound,
        'upper_bound': upper_bound,
        'Q1': Q1,
        'Q3': Q3,
        'IQR': IQR
    }


def calculate_statistics(data):
    """
    Calcule des statistiques descriptives pour un ensemble de données.
    
    Args:
        data: Données à analyser
    
    Returns:
        dict: Statistiques calculées
    """
    if isinstance(data, list):
        data = pd.Series(data)
    
    if len(data) == 0:
        return {
            'mean': 0,
            'median': 0,
            'std': 0,
            'min': 0,
            'max': 0,
            'count': 0
        }
    
    return {
        'mean': float(data.mean()),
        'median': float(data.median()),
        'std': float(data.std()) if len(data) > 1 else 0,
        'min': float(data.min()),
        'max': float(data.max()),
        'count': len(data),
        'sum': float(data.sum())
    }


def normalize_data(data, method='minmax'):
    """
    Normalise les données selon différentes méthodes.
    
    Args:
        data: Données à normaliser
        method: 'minmax' ou 'zscore'
    
    Returns:
        numpy.array: Données normalisées
    """
    if isinstance(data, list):
        data = np.array(data)
    
    if method == 'minmax':
        min_val = data.min()
        max_val = data.max()
        if max_val - min_val == 0:
            return np.zeros_like(data)
        return (data - min_val) / (max_val - min_val)
    
    elif method == 'zscore':
        mean = data.mean()
        std = data.std()
        if std == 0:
            return np.zeros_like(data)
        return (data - mean) / std
    
    else:
        raise ValueError(f"Méthode de normalisation inconnue: {method}")


def format_date_for_display(date, format='%d/%m/%Y'):
    """
    Formate une date pour l'affichage.
    
    Args:
        date: Objet date ou datetime
        format: Format de sortie
    
    Returns:
        str: Date formatée
    """
    if isinstance(date, str):
        try:
            date = datetime.strptime(date, '%Y-%m-%d').date()
        except ValueError:
            return date
    
    return date.strftime(format)


def aggregate_by_period(data, date_field, value_field, period='month'):
    """
    Agrège des données par période (jour, semaine, mois).
    
    Args:
        data: DataFrame pandas
        date_field: Nom du champ de date
        value_field: Nom du champ de valeur à agréger
        period: 'day', 'week', ou 'month'
    
    Returns:
        DataFrame: Données agrégées
    """
    if period == 'day':
        freq = 'D'
    elif period == 'week':
        freq = 'W'
    elif period == 'month':
        freq = 'MS'  # Month Start
    else:
        raise ValueError(f"Période inconnue: {period}")
    
    data[date_field] = pd.to_datetime(data[date_field])
    data.set_index(date_field, inplace=True)
    
    return data[value_field].resample(freq).sum().reset_index()


def calculate_growth_rate(values):
    """
    Calcule le taux de croissance moyen d'une série de valeurs.
    
    Args:
        values: Liste de valeurs
    
    Returns:
        float: Taux de croissance moyen en pourcentage
    """
    if len(values) < 2:
        return 0.0
    
    growth_rates = []
    for i in range(1, len(values)):
        if values[i-1] != 0:
            rate = (values[i] - values[i-1]) / values[i-1] * 100
            growth_rates.append(rate)
    
    return sum(growth_rates) / len(growth_rates) if growth_rates else 0.0


def create_time_series(start_date, end_date, freq='D'):
    """
    Crée une série temporelle entre deux dates.
    
    Args:
        start_date: Date de début
        end_date: Date de fin
        freq: Fréquence ('D' pour jour, 'W' pour semaine, 'M' pour mois)
    
    Returns:
        pandas.DatetimeIndex: Index de dates
    """
    return pd.date_range(start=start_date, end=end_date, freq=freq)


def validate_date_range(start_date, end_date):
    """
    Valide qu'une plage de dates est correcte.
    
    Args:
        start_date: Date de début
        end_date: Date de fin
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if start_date > end_date:
        return False, "La date de début doit être antérieure à la date de fin"
    
    if end_date > datetime.now().date():
        return False, "La date de fin ne peut pas être dans le futur"
    
    return True, None


def format_number(number, decimals=2, locale='fr'):
    """
    Formate un nombre pour l'affichage selon la locale.
    
    Args:
        number: Nombre à formater
        decimals: Nombre de décimales
        locale: Locale ('fr' ou 'en')
    
    Returns:
        str: Nombre formaté
    """
    formatted = f"{number:.{decimals}f}"
    
    if locale == 'fr':
        formatted = formatted.replace('.', ',')
        # Ajouter des espaces pour les milliers
        parts = formatted.split(',')
        parts[0] = ' '.join([parts[0][max(0, i-3):i] 
                            for i in range(len(parts[0]), 0, -3)][::-1])
        return ','.join(parts)
    
    return formatted


def generer_graphique(type_graph: str, data: dict, filename_prefix: str = 'graph', title: str = None, xlabel: str = None, ylabel: str = None) -> str:
    """
    Génère un graphique PNG et retourne son chemin relatif (media/graphs/...)

    Args:
        type_graph: 'line', 'multi_line', 'bar', 'pie', 'heatmap', 'histogram'
        data: dictionnaire structuré (voir services)
        filename_prefix: préfixe du fichier de sortie
        title: Titre du graphique (optionnel)
        xlabel: Libellé de l'axe X (optionnel)
        ylabel: Libellé de l'axe Y (optionnel)

    Returns:
        str: chemin relatif vers le fichier PNG (pour servir via MEDIA_URL)
    """
    # Préparer le dossier de sortie
    media_root = getattr(settings, 'MEDIA_ROOT', Path(settings.BASE_DIR) / 'media')
    graphs_dir = Path(media_root) / 'graphs'
    graphs_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{filename_prefix}_{type_graph}_{timestamp}.png"
    output_path = graphs_dir / filename

    # Taille selon le type de graphique
    if type_graph == 'pie':
        figsize = (10, 8)  # Plus grand pour les camemberts
    else:
        figsize = (12, 6)
    
    plt.figure(figsize=figsize)
    sns.set_style('whitegrid')
    sns.set_palette('husl')  # Palette de couleurs moderne

    try:
        if type_graph == 'line':
            labels = data.get('labels', [])
            values = data.get('values', [])
            plt.plot(labels, values, marker='o', linewidth=2, markersize=6)
            plt.xlabel(xlabel or 'Période')
            plt.ylabel(ylabel or 'Valeur')
            if title:
                plt.title(title, fontsize=14, fontweight='bold')
            plt.xticks(rotation=45, ha='right')
            plt.grid(True, alpha=0.3)
            plt.tight_layout()

        elif type_graph == 'multi_line':
            labels = data.get('labels', [])
            for serie in data.get('series', []):
                plt.plot(labels, serie.get('values', []), marker='o', linewidth=2, markersize=6, label=serie.get('name', ''))
            plt.xlabel(xlabel or 'Période')
            plt.ylabel(ylabel or 'Valeur')
            if title:
                plt.title(title, fontsize=14, fontweight='bold')
            plt.legend(loc='best')
            plt.xticks(rotation=45, ha='right')
            plt.grid(True, alpha=0.3)
            plt.tight_layout()

        elif type_graph == 'bar':
            labels = data.get('labels', [])
            values = data.get('values', [])
            bars = plt.bar(range(len(labels)), values, color=sns.color_palette('husl', len(labels)))
            plt.xlabel(xlabel or 'Catégorie')
            plt.ylabel(ylabel or 'Nombre')
            if title:
                plt.title(title, fontsize=14, fontweight='bold')
            plt.xticks(range(len(labels)), labels, rotation=45, ha='right')
            plt.grid(True, alpha=0.3, axis='y')
            
            # Ajouter les valeurs sur les barres
            for i, (bar, value) in enumerate(zip(bars, values)):
                height = bar.get_height()
                plt.text(bar.get_x() + bar.get_width()/2., height,
                        f'{int(value)}', ha='center', va='bottom', fontsize=9)
            
            plt.tight_layout()

        elif type_graph == 'pie':
            labels = data.get('labels', [])
            values = data.get('values', [])
            pourcentages = data.get('pourcentages', None)
            
            if not labels or not values:
                return ''
            
            # Créer le camembert
            colors = sns.color_palette('husl', len(labels))
            wedges, texts, autotexts = plt.pie(values, labels=labels, autopct='%1.1f%%',
                                               colors=colors, startangle=90,
                                               textprops={'fontsize': 10})
            
            # Améliorer le texte
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
            
            if title:
                plt.title(title, fontsize=14, fontweight='bold', pad=20)
            
            plt.axis('equal')
            plt.tight_layout()

        elif type_graph == 'heatmap':
            # heatmap: utiliser seaborn kdeplot si souhaité
            points = data.get('points', [])
            if points:
                lats = [p['lat'] for p in points]
                lngs = [p['lng'] for p in points]
                intensities = [p.get('intensity', 1) for p in points]
                scatter = plt.scatter(lngs, lats, c=intensities, cmap='hot', s=50, alpha=0.6)
                plt.colorbar(scatter, label='Intensité')
                plt.xlabel(xlabel or 'Longitude')
                plt.ylabel(ylabel or 'Latitude')
                if title:
                    plt.title(title, fontsize=14, fontweight='bold')
                plt.grid(True, alpha=0.3)
                plt.tight_layout()
            else:
                return ''

        elif type_graph == 'histogram':
            values = data.get('values', [])
            if values:
                plt.hist(values, bins=20, color=sns.color_palette('husl', 1)[0], edgecolor='black', alpha=0.7)
                plt.xlabel(xlabel or 'Valeur')
                plt.ylabel(ylabel or 'Fréquence')
                if title:
                    plt.title(title, fontsize=14, fontweight='bold')
                plt.grid(True, alpha=0.3, axis='y')
                plt.tight_layout()
            else:
                return ''
        else:
            # Type non supporté
            return ''

        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        # Retour chemin relatif depuis MEDIA_ROOT
        rel_path = os.path.join('graphs', filename)
        return rel_path

    except Exception as e:
        logger.error(f"Erreur lors de la génération du graphique {type_graph}: {str(e)}", exc_info=True)
        plt.close()
        return ''

