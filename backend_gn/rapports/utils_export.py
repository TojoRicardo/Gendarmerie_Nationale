"""
Module d'export amélioré avec génération de graphiques
Supporte matplotlib et seaborn pour créer des graphiques professionnels
"""

import os
import io
import base64
from datetime import datetime
from typing import Dict, List, Any, Optional
from datetime import timedelta
import pandas as pd
import numpy as np

# Graphiques
import matplotlib
matplotlib.use('Agg')  # Backend non-interactif pour serveur
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.figure import Figure

# Configuration matplotlib
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")
matplotlib.rcParams['figure.figsize'] = (10, 6)
matplotlib.rcParams['font.size'] = 10

from django.conf import settings


class GraphGeneratorService:
    """Service de génération de graphiques pour les rapports"""
    
    def __init__(self, output_dir: str = None):
        """
        Initialise le générateur de graphiques
        
        Args:
            output_dir: Dossier de sortie pour les graphiques (optionnel)
        """
        self.output_dir = output_dir or os.path.join(settings.MEDIA_ROOT, 'rapports', 'graphs')
        os.makedirs(self.output_dir, exist_ok=True)
    
    def generate_all_graphs(self, data: Dict[str, Any], rapport_id: str) -> Dict[str, str]:
        """
        Génère tous les graphiques pour un rapport
        
        Args:
            data: Données du rapport
            rapport_id: ID du rapport pour nommer les fichiers
        
        Returns:
            dict: Dictionnaire avec les chemins des graphiques générés
        """
        graphs = {}
        
        # Graphique évolution temporelle
        if 'evolution' in data.get('graphiques', {}) or 'donnees' in data:
            evolution_path = self._generate_evolution_chart(data, rapport_id)
            if evolution_path:
                graphs['evolution'] = evolution_path
        
        # Graphique répartition par statut
        if 'statistiques' in data:
            repartition_path = self._generate_repartition_chart(data, rapport_id)
            if repartition_path:
                graphs['repartition'] = repartition_path
        
        # Graphique top 5
        if 'donnees' in data:
            top5_path = self._generate_top5_chart(data, rapport_id)
            if top5_path:
                graphs['top5'] = top5_path
        
        if 'donnees' in data:
            geo_path = self._generate_geographic_chart(data, rapport_id)
            if geo_path:
                graphs['geographique'] = geo_path
        
        return graphs
    
    def _generate_evolution_chart(self, data: Dict, rapport_id: str) -> Optional[str]:
        """Génère un graphique d'évolution temporelle"""
        try:
            df = None
            
            # Essayer d'extraire les données d'évolution
            if 'graphiques' in data and 'evolution_quotidienne' in data['graphiques']:
                evolution_data = data['graphiques']['evolution_quotidienne']
                if evolution_data:
                    df = pd.DataFrame(evolution_data)
            elif 'donnees' in data and data['donnees']:
                df = pd.DataFrame(data['donnees'])
                # Chercher une colonne date
                date_cols = [col for col in df.columns if 'date' in col.lower() or 'jour' in col.lower()]
                if date_cols:
                    df['date'] = pd.to_datetime(df[date_cols[0]], errors='coerce')
                    df = df.groupby(df['date'].dt.date).size().reset_index(name='count')
            
            if df is None or df.empty:
                return None
            
            # Créer le graphique
            fig, ax = plt.subplots(figsize=(12, 6))
            
            if 'date' in df.columns and 'count' in df.columns:
                ax.plot(df['date'], df['count'], marker='o', linewidth=2, markersize=6)
            elif len(df.columns) >= 2:
                ax.plot(df.iloc[:, 0], df.iloc[:, 1], marker='o', linewidth=2, markersize=6)
            else:
                return None
            
            ax.set_title('Évolution Temporelle', fontsize=14, fontweight='bold', pad=20)
            ax.set_xlabel('Date', fontsize=11)
            ax.set_ylabel('Nombre', fontsize=11)
            ax.grid(True, alpha=0.3)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Sauvegarder
            filename = f"evolution_{rapport_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = os.path.join(self.output_dir, filename)
            fig.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close(fig)
            
            return filepath
        except Exception as e:
            print(f"Erreur génération graphique évolution: {e}")
            return None
    
    def _generate_repartition_chart(self, data: Dict, rapport_id: str) -> Optional[str]:
        """Génère un graphique de répartition (camembert ou barres)"""
        try:
            stats = data.get('statistiques', {})
            if not stats:
                return None
            
            # Préparer les données
            labels = []
            values = []
            for key, value in stats.items():
                try:
                    # Essayer de convertir en nombre
                    if isinstance(value, str) and '%' in value:
                        value = float(value.replace('%', '').strip())
                    elif isinstance(value, (int, float)):
                        value = float(value)
                    else:
                        continue
                    
                    if value > 0:
                        labels.append(str(key)[:30])  # Limiter la longueur
                        values.append(value)
                except:
                    continue
            
            if not values:
                return None
            
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # Couleurs
            colors = sns.color_palette("husl", len(values))
            
            wedges, texts, autotexts = ax.pie(
                values,
                labels=labels,
                autopct='%1.1f%%',
                startangle=90,
                colors=colors,
                textprops={'fontsize': 10}
            )
            
            # Améliorer les labels
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
            
            ax.set_title('Répartition', fontsize=14, fontweight='bold', pad=20)
            plt.tight_layout()
            
            # Sauvegarder
            filename = f"repartition_{rapport_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = os.path.join(self.output_dir, filename)
            fig.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close(fig)
            
            return filepath
        except Exception as e:
            print(f"Erreur génération graphique répartition: {e}")
            return None
    
    def _generate_top5_chart(self, data: Dict, rapport_id: str) -> Optional[str]:
        """Génère un graphique Top 5"""
        try:
            donnees = data.get('donnees', [])
            if not donnees:
                return None
            
            df = pd.DataFrame(donnees)
            
            # Chercher une colonne avec des nombres pour faire un top 5
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            text_cols = df.select_dtypes(include=['object']).columns
            
            if len(numeric_cols) == 0 or len(text_cols) == 0:
                return None
            
            # Utiliser la première colonne textuelle et numérique
            label_col = text_cols[0]
            value_col = numeric_cols[0]
            
            # Trier et prendre le top 5
            top5 = df.nlargest(5, value_col)
            
            # Créer le graphique en barres
            fig, ax = plt.subplots(figsize=(10, 6))
            
            bars = ax.barh(range(len(top5)), top5[value_col], color=sns.color_palette("husl", len(top5)))
            ax.set_yticks(range(len(top5)))
            ax.set_yticklabels([str(label)[:40] for label in top5[label_col]], fontsize=10)
            ax.set_xlabel('Valeur', fontsize=11)
            ax.set_title('Top 5', fontsize=14, fontweight='bold', pad=20)
            ax.grid(True, alpha=0.3, axis='x')
            
            # Ajouter les valeurs sur les barres
            for i, (idx, row) in enumerate(top5.iterrows()):
                ax.text(row[value_col], i, f' {row[value_col]:.0f}', 
                       va='center', fontsize=10, fontweight='bold')
            
            plt.tight_layout()
            
            # Sauvegarder
            filename = f"top5_{rapport_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = os.path.join(self.output_dir, filename)
            fig.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close(fig)
            
            return filepath
        except Exception as e:
            print(f"Erreur génération graphique top5: {e}")
            return None
    
    def _generate_geographic_chart(self, data: Dict, rapport_id: str) -> Optional[str]:
        """Génère un graphique géographique (heatmap si coordonnées disponibles)"""
        try:
            donnees = data.get('donnees', [])
            if not donnees:
                return None
            
            df = pd.DataFrame(donnees)
            
            # Chercher des colonnes géographiques
            geo_cols = [col for col in df.columns if 'lieu' in col.lower() or 'adresse' in col.lower() 
                       or 'region' in col.lower() or 'province' in col.lower()]
            
            if not geo_cols:
                return None
            
            geo_col = geo_cols[0]
            
            # Compter par région
            geo_counts = df[geo_col].value_counts().head(10)
            
            if geo_counts.empty:
                return None
            
            # Créer un graphique en barres horizontales
            fig, ax = plt.subplots(figsize=(10, 6))
            
            bars = ax.barh(range(len(geo_counts)), geo_counts.values, 
                          color=sns.color_palette("husl", len(geo_counts)))
            ax.set_yticks(range(len(geo_counts)))
            ax.set_yticklabels([str(label)[:40] for label in geo_counts.index], fontsize=10)
            ax.set_xlabel('Nombre', fontsize=11)
            ax.set_title('Répartition Géographique (Top 10)', fontsize=14, fontweight='bold', pad=20)
            ax.grid(True, alpha=0.3, axis='x')
            
            plt.tight_layout()
            
            # Sauvegarder
            filename = f"geographique_{rapport_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = os.path.join(self.output_dir, filename)
            fig.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close(fig)
            
            return filepath
        except Exception as e:
            print(f"Erreur génération graphique géographique: {e}")
            return None
    
    def graph_to_base64(self, filepath: str) -> str:
        """Convertit un graphique en base64 pour inclusion dans PDF"""
        try:
            with open(filepath, 'rb') as f:
                img_data = f.read()
                return base64.b64encode(img_data).decode('utf-8')
        except:
            return ""
    
    def cleanup_old_graphs(self, days: int = 7):
        """Nettoie les graphiques anciens (> X jours)"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            for filename in os.listdir(self.output_dir):
                filepath = os.path.join(self.output_dir, filename)
                if os.path.isfile(filepath):
                    mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                    if mtime < cutoff_date:
                        os.remove(filepath)
        except Exception as e:
            print(f"Erreur nettoyage graphiques: {e}")

