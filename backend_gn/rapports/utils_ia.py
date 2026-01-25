"""
Module d'analyse IA pour les rapports
Inclut : Descriptive Analytics, Diagnostic Analytics, Predictive Analytics
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from django.db.models import Count, Q, Avg, Sum, F, Max, Min
from django.db.models.functions import TruncMonth, TruncDay, TruncWeek
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')


class IAAnalyticsService:
    """Service d'analyse IA pour les rapports"""
    
    def __init__(self, data: pd.DataFrame = None, queryset=None):
        """
        Initialise le service d'analyse IA
        
        Args:
            data: DataFrame pandas avec les données
            queryset: QuerySet Django (sera converti en DataFrame)
        """
        if data is not None:
            self.df = data
        elif queryset is not None:
            self.df = self._queryset_to_dataframe(queryset)
        else:
            raise ValueError("Doit fournir soit 'data' soit 'queryset'")
    
    def _queryset_to_dataframe(self, queryset) -> pd.DataFrame:
        """Convertit un QuerySet Django en DataFrame pandas"""
        if not queryset.exists():
            return pd.DataFrame()
        
        data_list = []
        try:
            for obj in queryset:
                obj_dict = {}
                for field in obj._meta.get_fields():
                    if hasattr(field, 'value_from_object'):
                        try:
                            value = field.value_from_object(obj)
                            # Convertir les dates en string pour DataFrame
                            if isinstance(value, datetime):
                                value = value.isoformat()
                            elif hasattr(value, 'isoformat'):
                                value = value.isoformat()
                            # Ignorer les relations ManyToMany et ForeignKey complexes
                            elif hasattr(value, '__iter__') and not isinstance(value, (str, bytes)):
                                continue
                            obj_dict[field.name] = value
                        except Exception:
                            # Ignorer les champs qui ne peuvent pas être sérialisés
                            pass
                if obj_dict:
                    data_list.append(obj_dict)
        except Exception as e:
            # En cas d'erreur, retourner un DataFrame vide plutôt que de planter
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Erreur lors de la conversion du queryset en DataFrame: {e}")
            return pd.DataFrame()
        
        return pd.DataFrame(data_list) if data_list else pd.DataFrame()
    
    # DESCRIPTIVE ANALYTICS
    
    def descriptive_analytics(self) -> Dict[str, Any]:
        """
        Analyse descriptive des données
        Retourne : moyennes, totaux, pourcentages, tendances
        """
        if self.df.empty:
            return {
                'total': 0,
                'moyenne': 0,
                'mediane': 0,
                'ecart_type': 0,
                'min': 0,
                'max': 0,
                'tendance': 'stable'
            }
        
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        
        stats = {
            'total': len(self.df),
            'colonnes': len(self.df.columns),
            'colonnes_numeriques': list(numeric_cols),
        }
        
        if len(numeric_cols) > 0:
            for col in numeric_cols:
                stats[f'{col}_moyenne'] = float(self.df[col].mean()) if not self.df[col].isna().all() else 0
                stats[f'{col}_mediane'] = float(self.df[col].median()) if not self.df[col].isna().all() else 0
                stats[f'{col}_ecart_type'] = float(self.df[col].std()) if not self.df[col].isna().all() else 0
                stats[f'{col}_min'] = float(self.df[col].min()) if not self.df[col].isna().all() else 0
                stats[f'{col}_max'] = float(self.df[col].max()) if not self.df[col].isna().all() else 0
        
        # Tendance temporelle si colonne date présente
        date_cols = [col for col in self.df.columns if 'date' in col.lower() or 'creation' in col.lower()]
        if date_cols:
            stats['tendance'] = self._calculate_trend()
        else:
            stats['tendance'] = 'stable'
        
        return stats
    
    def _calculate_trend(self) -> str:
        """Calcule la tendance (croissance, décroissance, stable)"""
        date_cols = [col for col in self.df.columns if 'date' in col.lower() or 'creation' in col.lower()]
        if not date_cols:
            return 'stable'
        
        date_col = date_cols[0]
        try:
            # Convertir en datetime si nécessaire
            if not pd.api.types.is_datetime64_any_dtype(self.df[date_col]):
                self.df[date_col] = pd.to_datetime(self.df[date_col], errors='coerce')
            
            # Grouper par mois
            self.df['month'] = self.df[date_col].dt.to_period('M')
            monthly_counts = self.df.groupby('month').size()
            
            if len(monthly_counts) < 2:
                return 'stable'
            
            # Calculer la pente
            x = np.arange(len(monthly_counts))
            y = monthly_counts.values
            slope = np.polyfit(x, y, 1)[0]
            
            if slope > 0.1:
                return 'croissance'
            elif slope < -0.1:
                return 'decroissance'
            else:
                return 'stable'
        except:
            return 'stable'
    
    # DIAGNOSTIC ANALYTICS
    
    def diagnostic_analytics(self) -> Dict[str, Any]:
        """
        Analyse diagnostic : corrélations, anomalies, patterns
        """
        if self.df.empty or len(self.df) < 2:
            return {
                'correlations': {},
                'anomalies': [],
                'patterns': [],
                'insights': []
            }
        
        diagnostics = {
            'correlations': self._calculate_correlations(),
            'anomalies': self._detect_anomalies(),
            'patterns': self._find_patterns(),
            'insights': []
        }
        
        # Générer des insights automatiques
        diagnostics['insights'] = self._generate_insights(diagnostics)
        
        return diagnostics
    
    def _calculate_correlations(self) -> Dict[str, float]:
        """Calcule les corrélations entre colonnes numériques"""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) < 2:
            return {}
        
        try:
            corr_matrix = self.df[numeric_cols].corr()
            correlations = {}
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    col1 = corr_matrix.columns[i]
                    col2 = corr_matrix.columns[j]
                    corr_value = corr_matrix.iloc[i, j]
                    if abs(corr_value) > 0.5 and not np.isnan(corr_value):
                        correlations[f'{col1}_vs_{col2}'] = float(corr_value)
            return correlations
        except:
            return {}
    
    def _detect_anomalies(self) -> List[Dict]:
        """Détecte les anomalies dans les données"""
        anomalies = []
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if self.df[col].isna().all():
                continue
            
            mean = self.df[col].mean()
            std = self.df[col].std()
            
            if std == 0:
                continue
            
            # Détecter les valeurs > 2 écarts-types de la moyenne
            threshold = mean + (2 * std)
            outliers = self.df[self.df[col] > threshold]
            
            if len(outliers) > 0:
                anomalies.append({
                    'colonne': col,
                    'type': 'valeur_elevee',
                    'nombre': len(outliers),
                    'valeur_max': float(outliers[col].max()),
                    'moyenne': float(mean)
                })
        
        return anomalies
    
    def _find_patterns(self) -> List[Dict]:
        """Trouve des patterns dans les données"""
        patterns = []
        
        # Pattern : distribution temporelle
        date_cols = [col for col in self.df.columns if 'date' in col.lower()]
        if date_cols:
            try:
                date_col = date_cols[0]
                if not pd.api.types.is_datetime64_any_dtype(self.df[date_col]):
                    self.df[date_col] = pd.to_datetime(self.df[date_col], errors='coerce')
                
                # Pattern jour de la semaine
                self.df['jour_semaine'] = self.df[date_col].dt.day_name()
                jour_counts = self.df['jour_semaine'].value_counts()
                jour_plus_frequent = jour_counts.index[0] if len(jour_counts) > 0 else None
                
                if jour_plus_frequent:
                    patterns.append({
                        'type': 'jour_semaine',
                        'valeur': jour_plus_frequent,
                        'frequence': int(jour_counts[jour_plus_frequent])
                    })
            except:
                pass
        
        return patterns
    
    def _generate_insights(self, diagnostics: Dict) -> List[str]:
        """Génère des insights automatiques à partir des diagnostics"""
        insights = []
        
        # Insight sur les anomalies
        if diagnostics['anomalies']:
            insights.append(f"Alerte : {len(diagnostics['anomalies'])} anomalies détectées dans les données")
        
        # Insight sur les corrélations - SUPPRIMÉ
        
        # Insight sur les patterns - SUPPRIMÉ
        
        return insights
    
    # PREDICTIVE ANALYTICS
    def predictive_analytics(self, target_col: str = None, periods: int = 3) -> Dict[str, Any]:
        """
        Analyse prédictive : prévisions pour les périodes suivantes
        
        Args:
            target_col: Colonne à prédire (si None, utilise le count)
            periods: Nombre de périodes à prédire
        """
        if self.df.empty:
            return {
                'predictions': [],
                'confidence': 0,
                'method': 'none'
            }
        
        predictions = {
            'predictions': [],
            'confidence': 0,
            'method': 'linear_regression'
        }
        
        # Essayer de prédire la tendance temporelle
        date_cols = [col for col in self.df.columns if 'date' in col.lower() or 'creation' in col.lower()]
        if date_cols:
            try:
                date_col = date_cols[0]
                if not pd.api.types.is_datetime64_any_dtype(self.df[date_col]):
                    self.df[date_col] = pd.to_datetime(self.df[date_col], errors='coerce')
                
                # Grouper par mois
                self.df['month'] = self.df[date_col].dt.to_period('M')
                monthly_data = self.df.groupby('month').size().reset_index(name='count')
                monthly_data['month_num'] = range(len(monthly_data))
                
                if len(monthly_data) >= 2:
                    # Régression linéaire simple
                    X = monthly_data[['month_num']].values
                    y = monthly_data['count'].values
                    
                    model = LinearRegression()
                    model.fit(X, y)
                    
                    # Prédire les prochaines périodes
                    future_months = np.arange(len(monthly_data), len(monthly_data) + periods)
                    future_predictions = model.predict(future_months.reshape(-1, 1))
                    
                    predictions['predictions'] = [
                        {
                            'periode': f'Période {i+1}',
                            'valeur_prevue': max(0, float(pred))  # Pas de valeurs négatives
                        }
                        for i, pred in enumerate(future_predictions)
                    ]
                    
                    score = model.score(X, y)
                    predictions['confidence'] = float(max(0, min(1, score)))  # Entre 0 et 1
                    
            except Exception as e:
                predictions['method'] = 'error'
                predictions['error'] = str(e)
        
        return predictions
    
    # ANALYSE COMPLÈTE
    
    def full_analysis(self) -> Dict[str, Any]:
        """
        Effectue une analyse complète : descriptive + diagnostic + predictive
        """
        return {
            'descriptive': self.descriptive_analytics(),
            'diagnostic': self.diagnostic_analytics(),
            'predictive': self.predictive_analytics(),
            'timestamp': datetime.now().isoformat()
        }
    
    def generate_summary_text(self, analysis: Dict[str, Any] = None) -> str:
        """
        Génère un texte de résumé automatique à partir de l'analyse
        """
        if analysis is None:
            analysis = self.full_analysis()
        
        desc = analysis.get('descriptive', {})
        diag = analysis.get('diagnostic', {})
        pred = analysis.get('predictive', {})
        
        summary_parts = []
        
        # Résumé descriptif
        total = desc.get('total', 0)
        summary_parts.append(f"Analyse de {total} enregistrements")
        
        # Tendance
        tendance = desc.get('tendance', 'stable')
        if tendance == 'croissance':
            summary_parts.append("Tendance : Croissance observée")
        elif tendance == 'decroissance':
            summary_parts.append("Tendance : Décroissance observée")
        else:
            summary_parts.append("Tendance : Stable")
        
        # Anomalies
        anomalies = diag.get('anomalies', [])
        if anomalies:
            summary_parts.append(f"Alerte : {len(anomalies)} anomalies détectées nécessitent attention")
        
        # Prédictions
        preds = pred.get('predictions', [])
        if preds:
            avg_pred = np.mean([p['valeur_prevue'] for p in preds])
            confidence = pred.get('confidence', 0)
            summary_parts.append(
                f"🔮 Prévision : {avg_pred:.1f} en moyenne pour les prochaines périodes "
                f"(confiance: {confidence*100:.1f}%)"
            )
        
        return " | ".join(summary_parts) if summary_parts else "Aucune analyse disponible"

