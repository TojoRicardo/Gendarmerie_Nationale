"""
Utilitaires de Prétraitement des Données
=========================================

Module pour nettoyer, normaliser et préparer les données
avant l'analyse IA.
"""

from __future__ import annotations

try:
    import numpy as np
    import pandas as pd
    IA_PACKAGES_AVAILABLE = True
except ImportError:
    IA_PACKAGES_AVAILABLE = False
    print(" Packages IA non installs. Installez-les avec: pip install -r requirements.txt")
    # Créer des stubs pour éviter les erreurs
    np = None
    pd = None
    
from typing import Dict, List, Any, Optional, TYPE_CHECKING
from datetime import datetime, timedelta

if TYPE_CHECKING and pd is not None:
    from pandas import DataFrame
else:
    DataFrame = Any


class DataPreprocessingUtils:
    """
    Classe utilitaire pour le prétraitement des données
    """
    
    @staticmethod
    def normaliser_scores(scores: List[float], 
                         min_val: float = 0.0, 
                         max_val: float = 100.0) -> List[float]:
        """
        Normalise une liste de scores dans un intervalle donné
        
        Args:
            scores: Liste des scores à normaliser
            min_val: Valeur minimale de l'intervalle
            max_val: Valeur maximale de l'intervalle
            
        Returns:
            Scores normalisés
        """
        if not scores:
            return []
        
        scores_array = np.array(scores)
        min_score = scores_array.min()
        max_score = scores_array.max()
        
        if max_score == min_score:
            return [min_val] * len(scores)
        
        normalized = (scores_array - min_score) / (max_score - min_score)
        normalized = normalized * (max_val - min_val) + min_val
        
        return normalized.tolist()
    
    @staticmethod
    def nettoyer_texte(texte: str) -> str:
        """
        Nettoie un texte (espaces, caractères spéciaux)
        
        Args:
            texte: Texte à nettoyer
            
        Returns:
            Texte nettoyé
        """
        if not texte:
            return ""
        
        # Supprimer les espaces multiples
        texte = " ".join(texte.split())
        
        # Supprimer les caractères de contrôle
        texte = ''.join(char for char in texte if ord(char) >= 32 or char == '\n')
        
        # Trim
        return texte.strip()
    
    @staticmethod
    def encoder_categorie(valeurs: List[str]) -> Dict[str, int]:
        """
        Encode des valeurs catégorielles en valeurs numériques
        
        Args:
            valeurs: Liste de valeurs catégorielles
            
        Returns:
            Dictionnaire de mapping catégorie -> nombre
        """
        categories_uniques = sorted(set(valeurs))
        return {cat: idx for idx, cat in enumerate(categories_uniques)}
    
    @staticmethod
    def remplir_valeurs_manquantes(data: 'DataFrame', 
                                   strategy: str = 'mean') -> 'DataFrame':
        """
        Remplit les valeurs manquantes dans un DataFrame
        
        Args:
            data: DataFrame pandas
            strategy: 'mean', 'median', 'mode', ou valeur spécifique
            
        Returns:
            DataFrame avec valeurs remplies
        """
        if strategy == 'mean':
            return data.fillna(data.mean())
        elif strategy == 'median':
            return data.fillna(data.median())
        elif strategy == 'mode':
            return data.fillna(data.mode().iloc[0])
        else:
            return data.fillna(strategy)
    
    @staticmethod
    def extraire_features_temporelles(date: datetime) -> Dict[str, int]:
        """
        Extrait des features temporelles d'une date
        
        Args:
            date: Date à analyser
            
        Returns:
            Dictionnaire de features
        """
        return {
            'annee': date.year,
            'mois': date.month,
            'jour': date.day,
            'jour_semaine': date.weekday(),  # 0 = lundi, 6 = dimanche
            'jour_annee': date.timetuple().tm_yday,
            'semaine': date.isocalendar()[1],
            'trimestre': (date.month - 1) // 3 + 1,
            'est_weekend': 1 if date.weekday() >= 5 else 0,
            'heure': date.hour if hasattr(date, 'hour') else 0
        }
    
    @staticmethod
    def calculer_distance_jours(date1: datetime, date2: datetime) -> int:
        """
        Calcule la distance en jours entre deux dates
        
        Args:
            date1: Première date
            date2: Deuxième date
            
        Returns:
            Nombre de jours
        """
        return abs((date2 - date1).days)
    
    @staticmethod
    def creer_bins_age(ages: List[int], 
                       bins: Optional[List[int]] = None) -> Dict[int, str]:
        """
        Crée des catégories d'âge
        
        Args:
            ages: Liste d'âges
            bins: Limites des bins (par défaut: [0, 18, 25, 35, 50, 65, 100])
            
        Returns:
            Mapping âge -> catégorie
        """
        if bins is None:
            bins = [0, 18, 25, 35, 50, 65, 100]
        
        labels = [
            '0-18', '18-25', '25-35', '35-50', '50-65', '65+'
        ]
        
        mapping = {}
        for age in ages:
            for i in range(len(bins) - 1):
                if bins[i] <= age < bins[i + 1]:
                    mapping[age] = labels[i] if i < len(labels) else labels[-1]
                    break
        
        return mapping
    
    @staticmethod
    def detecter_outliers(valeurs: List[float], 
                         methode: str = 'iqr',
                         seuil: float = 1.5) -> List[int]:
        """
        Détecte les valeurs aberrantes
        
        Args:
            valeurs: Liste de valeurs
            methode: 'iqr' (interquartile range) ou 'zscore'
            seuil: Seuil pour considérer une valeur aberrante
            
        Returns:
            Indices des valeurs aberrantes
        """
        valeurs_array = np.array(valeurs)
        outliers = []
        
        if methode == 'iqr':
            q1 = np.percentile(valeurs_array, 25)
            q3 = np.percentile(valeurs_array, 75)
            iqr = q3 - q1
            
            lower_bound = q1 - seuil * iqr
            upper_bound = q3 + seuil * iqr
            
            for idx, val in enumerate(valeurs_array):
                if val < lower_bound or val > upper_bound:
                    outliers.append(idx)
        
        elif methode == 'zscore':
            mean = np.mean(valeurs_array)
            std = np.std(valeurs_array)
            
            for idx, val in enumerate(valeurs_array):
                z_score = abs((val - mean) / std) if std != 0 else 0
                if z_score > seuil:
                    outliers.append(idx)
        
        return outliers
    
    @staticmethod
    def creer_features_agregees(data: 'DataFrame', 
                                group_by: str,
                                agg_columns: List[str]) -> 'DataFrame':
        """
        Crée des features agrégées
        
        Args:
            data: DataFrame source
            group_by: Colonne de regroupement
            agg_columns: Colonnes à agréger
            
        Returns:
            DataFrame avec features agrégées
        """
        aggregations = {}
        
        for col in agg_columns:
            aggregations[col] = ['count', 'sum', 'mean', 'max', 'min', 'std']
        
        return data.groupby(group_by).agg(aggregations)
    
    @staticmethod
    def standardiser_donnees(data: np.ndarray) -> np.ndarray:
        """
        Standardise les données (moyenne = 0, écart-type = 1)
        
        Args:
            data: Array numpy
            
        Returns:
            Données standardisées
        """
        mean = np.mean(data, axis=0)
        std = np.std(data, axis=0)
        
        # Éviter la division par zéro
        std[std == 0] = 1
        
        return (data - mean) / std
    
    @staticmethod
    def creer_matrice_features(criminels_data: List[Dict]) -> np.ndarray:
        """
        Crée une matrice de features à partir de données de criminels
        
        Args:
            criminels_data: Liste de dictionnaires de données
            
        Returns:
            Matrice numpy de features
        """
        if not criminels_data:
            return np.array([])
        
        # Extraire les features numériques
        features = []
        
        for criminel in criminels_data:
            feature_vector = [
                criminel.get('age', 0),
                criminel.get('nombre_infractions', 0),
                criminel.get('niveau_dangerosite_num', 0),
                criminel.get('nombre_associations', 0),
                criminel.get('score_risque', 0)
            ]
            features.append(feature_vector)
        
        return np.array(features)
    
    @staticmethod
    def equilibrer_classes(X: np.ndarray, 
                          y: np.ndarray,
                          methode: str = 'undersample') -> tuple:
        """
        Équilibre les classes dans un dataset déséquilibré
        
        Args:
            X: Features
            y: Labels
            methode: 'oversample' ou 'undersample'
            
        Returns:
            X_balanced, y_balanced
        """
        from collections import Counter
        
        # Compter les classes
        class_counts = Counter(y)
        
        if methode == 'undersample':
            # Prendre le minimum
            min_count = min(class_counts.values())
            
            indices = []
            for classe in class_counts.keys():
                class_indices = np.where(y == classe)[0]
                selected = np.random.choice(class_indices, min_count, replace=False)
                indices.extend(selected)
            
            indices = np.array(indices)
            return X[indices], y[indices]
        
        elif methode == 'oversample':
            # Prendre le maximum
            max_count = max(class_counts.values())
            
            X_balanced = []
            y_balanced = []
            
            for classe in class_counts.keys():
                class_indices = np.where(y == classe)[0]
                class_X = X[class_indices]
                class_y = y[class_indices]
                
                # Oversample
                if len(class_indices) < max_count:
                    additional = np.random.choice(
                        len(class_indices),
                        max_count - len(class_indices),
                        replace=True
                    )
                    class_X = np.vstack([class_X, class_X[additional]])
                    class_y = np.hstack([class_y, class_y[additional]])
                
                X_balanced.append(class_X)
                y_balanced.append(class_y)
            
            return np.vstack(X_balanced), np.hstack(y_balanced)
        
        return X, y
    
    @staticmethod
    def creer_sequences_temporelles(data: List[Any],
                                    window_size: int = 7) -> List[List[Any]]:
        """
        Crée des séquences temporelles pour l'analyse
        
        Args:
            data: Données séquentielles
            window_size: Taille de la fenêtre
            
        Returns:
            Liste de séquences
        """
        sequences = []
        
        for i in range(len(data) - window_size + 1):
            sequence = data[i:i + window_size]
            sequences.append(sequence)
        
        return sequences

