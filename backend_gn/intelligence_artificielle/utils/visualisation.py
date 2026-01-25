"""
Utilitaires de Visualisation
=============================

Module pour générer des graphiques et visualisations
pour les analyses IA.
"""

import numpy as np
from typing import Dict, List, Any, Optional
import base64
from io import BytesIO


class VisualisationUtils:
    """
    Classe utilitaire pour créer des visualisations
    """
    
    @staticmethod
    def has_matplotlib() -> bool:
        """Vérifie si matplotlib est disponible"""
        try:
            import matplotlib
            return True
        except ImportError:
            return False
    
    @staticmethod
    def creer_graphique_barres(data: Dict[str, int],
                               titre: str = "Graphique",
                               xlabel: str = "Catégories",
                               ylabel: str = "Valeurs") -> Optional[str]:
        """
        Crée un graphique en barres
        
        Args:
            data: Dictionnaire {catégorie: valeur}
            titre: Titre du graphique
            xlabel: Label de l'axe X
            ylabel: Label de l'axe Y
            
        Returns:
            Image encodée en base64 ou None
        """
        if not VisualisationUtils.has_matplotlib():
            return None
        
        try:
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(10, 6))
            
            categories = list(data.keys())
            valeurs = list(data.values())
            
            ax.bar(categories, valeurs, color='steelblue')
            ax.set_title(titre, fontsize=14, fontweight='bold')
            ax.set_xlabel(xlabel)
            ax.set_ylabel(ylabel)
            
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            
            # Convertir en base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return image_base64
            
        except Exception as e:
            print(f"Erreur création graphique: {e}")
            return None
    
    @staticmethod
    def creer_graphique_ligne(data: Dict[str, float],
                             titre: str = "Évolution",
                             xlabel: str = "Temps",
                             ylabel: str = "Valeur") -> Optional[str]:
        """
        Crée un graphique en ligne
        
        Args:
            data: Dictionnaire {temps: valeur}
            titre: Titre du graphique
            xlabel: Label de l'axe X
            ylabel: Label de l'axe Y
            
        Returns:
            Image encodée en base64 ou None
        """
        if not VisualisationUtils.has_matplotlib():
            return None
        
        try:
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(12, 6))
            
            temps = list(data.keys())
            valeurs = list(data.values())
            
            ax.plot(temps, valeurs, marker='o', linewidth=2, color='steelblue')
            ax.set_title(titre, fontsize=14, fontweight='bold')
            ax.set_xlabel(xlabel)
            ax.set_ylabel(ylabel)
            ax.grid(True, alpha=0.3)
            
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            
            # Convertir en base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return image_base64
            
        except Exception as e:
            print(f"Erreur création graphique: {e}")
            return None
    
    @staticmethod
    def creer_graphique_secteurs(data: Dict[str, float],
                                 titre: str = "Répartition") -> Optional[str]:
        """
        Crée un graphique en secteurs (pie chart)
        
        Args:
            data: Dictionnaire {catégorie: valeur}
            titre: Titre du graphique
            
        Returns:
            Image encodée en base64 ou None
        """
        if not VisualisationUtils.has_matplotlib():
            return None
        
        try:
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(10, 8))
            
            categories = list(data.keys())
            valeurs = list(data.values())
            
            colors = plt.cm.Set3(np.linspace(0, 1, len(categories)))
            
            ax.pie(valeurs, labels=categories, autopct='%1.1f%%',
                   colors=colors, startangle=90)
            ax.set_title(titre, fontsize=14, fontweight='bold')
            
            plt.tight_layout()
            
            # Convertir en base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return image_base64
            
        except Exception as e:
            print(f"Erreur création graphique: {e}")
            return None
    
    @staticmethod
    def creer_heatmap(data: np.ndarray,
                     labels_x: List[str],
                     labels_y: List[str],
                     titre: str = "Heatmap") -> Optional[str]:
        """
        Crée une heatmap
        
        Args:
            data: Matrice de données
            labels_x: Labels de l'axe X
            labels_y: Labels de l'axe Y
            titre: Titre
            
        Returns:
            Image encodée en base64 ou None
        """
        if not VisualisationUtils.has_matplotlib():
            return None
        
        try:
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(12, 10))
            
            im = ax.imshow(data, cmap='YlOrRd', aspect='auto')
            
            ax.set_xticks(np.arange(len(labels_x)))
            ax.set_yticks(np.arange(len(labels_y)))
            ax.set_xticklabels(labels_x)
            ax.set_yticklabels(labels_y)
            
            plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
            
            # Ajouter les valeurs
            for i in range(len(labels_y)):
                for j in range(len(labels_x)):
                    text = ax.text(j, i, f"{data[i, j]:.2f}",
                                 ha="center", va="center", color="black", fontsize=8)
            
            ax.set_title(titre, fontsize=14, fontweight='bold')
            fig.colorbar(im, ax=ax)
            
            plt.tight_layout()
            
            # Convertir en base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return image_base64
            
        except Exception as e:
            print(f"Erreur création heatmap: {e}")
            return None
    
    @staticmethod
    def creer_graphique_multiple(datasets: List[Dict[str, Any]],
                                 titre: str = "Comparaison",
                                 type_graphique: str = 'ligne') -> Optional[str]:
        """
        Crée un graphique avec plusieurs séries de données
        
        Args:
            datasets: Liste de {nom, data, color}
            titre: Titre du graphique
            type_graphique: 'ligne' ou 'barres'
            
        Returns:
            Image encodée en base64 ou None
        """
        if not VisualisationUtils.has_matplotlib():
            return None
        
        try:
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(14, 7))
            
            for dataset in datasets:
                nom = dataset.get('nom', 'Série')
                data = dataset.get('data', {})
                color = dataset.get('color', 'steelblue')
                
                x = list(data.keys())
                y = list(data.values())
                
                if type_graphique == 'ligne':
                    ax.plot(x, y, marker='o', label=nom, color=color, linewidth=2)
                elif type_graphique == 'barres':
                    ax.bar(x, y, label=nom, color=color, alpha=0.7)
            
            ax.set_title(titre, fontsize=14, fontweight='bold')
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            
            # Convertir en base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return image_base64
            
        except Exception as e:
            print(f"Erreur création graphique multiple: {e}")
            return None
    
    @staticmethod
    def creer_histogramme(valeurs: List[float],
                         bins: int = 20,
                         titre: str = "Distribution",
                         xlabel: str = "Valeur") -> Optional[str]:
        """
        Crée un histogramme
        
        Args:
            valeurs: Liste de valeurs
            bins: Nombre de bins
            titre: Titre
            xlabel: Label de l'axe X
            
        Returns:
            Image encodée en base64 ou None
        """
        if not VisualisationUtils.has_matplotlib():
            return None
        
        try:
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(10, 6))
            
            ax.hist(valeurs, bins=bins, color='steelblue', edgecolor='black', alpha=0.7)
            ax.set_title(titre, fontsize=14, fontweight='bold')
            ax.set_xlabel(xlabel)
            ax.set_ylabel('Fréquence')
            ax.grid(True, alpha=0.3, axis='y')
            
            plt.tight_layout()
            
            # Convertir en base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100)
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return image_base64
            
        except Exception as e:
            print(f"Erreur création histogramme: {e}")
            return None
    
    @staticmethod
    def generer_rapport_visuel(statistiques: Dict[str, Any]) -> Dict[str, Any]:
        """
        Génère un rapport visuel complet
        
        Args:
            statistiques: Dictionnaire de statistiques
            
        Returns:
            Dictionnaire avec graphiques encodés
        """
        rapport = {
            'graphiques': {},
            'succes': True
        }
        
        # Graphique des types de crimes
        if 'types_crimes' in statistiques:
            types_data = {
                item['type']: item['count']
                for item in statistiques['types_crimes'].get('distribution', [])
            }
            if types_data:
                rapport['graphiques']['types_crimes'] = VisualisationUtils.creer_graphique_barres(
                    types_data,
                    "Distribution des Types de Crimes",
                    "Type de Crime",
                    "Nombre d'infractions"
                )
        
        # Graphique de tendances temporelles
        if 'tendances_temporelles' in statistiques:
            serie = statistiques['tendances_temporelles'].get('serie_temporelle', {})
            if serie:
                rapport['graphiques']['tendances'] = VisualisationUtils.creer_graphique_ligne(
                    {k: float(v) for k, v in serie.items()},
                    "Évolution Temporelle des Crimes",
                    "Période",
                    "Nombre d'infractions"
                )
        
        # Graphique de dangerosité
        if 'profils_criminels' in statistiques:
            danger_data = {
                item['niveau_dangerosite']: item['count']
                for item in statistiques['profils_criminels'].get('repartition_dangerosite', [])
            }
            if danger_data:
                rapport['graphiques']['dangerosite'] = VisualisationUtils.creer_graphique_secteurs(
                    danger_data,
                    "Répartition par Niveau de Dangerosité"
                )
        
        return rapport
    
    @staticmethod
    def exporter_donnees_csv(data: List[Dict], 
                            nom_fichier: str = "export.csv") -> Optional[str]:
        """
        Exporte des données en CSV
        
        Args:
            data: Liste de dictionnaires
            nom_fichier: Nom du fichier
            
        Returns:
            Chemin du fichier ou None
        """
        try:
            import pandas as pd
            from django.conf import settings
            import os
            
            df = pd.DataFrame(data)
            
            # Créer le dossier exports s'il n'existe pas
            exports_dir = os.path.join(settings.MEDIA_ROOT, 'exports')
            os.makedirs(exports_dir, exist_ok=True)
            
            # Chemin complet
            file_path = os.path.join(exports_dir, nom_fichier)
            
            # Sauvegarder
            df.to_csv(file_path, index=False, encoding='utf-8')
            
            return file_path
            
        except Exception as e:
            print(f"Erreur export CSV: {e}")
            return None

