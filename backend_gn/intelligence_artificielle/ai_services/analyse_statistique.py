"""
Service d'Analyse Statistique pour les Crimes
==============================================

Module pour analyser les statistiques criminelles et générer des insights.
Fournit des analyses descriptives, des tendances et des visualisations.
"""

import numpy as np
from collections import defaultdict
from datetime import timedelta
from typing import Dict, Any
from django.db.models import Count, Avg
from django.utils import timezone

from criminel.models import (
    CriminalInfraction,
    CriminalFicheCriminelle,
    # CriminalAssociation  # Model not yet created
)


class AnalyseStatistiqueService:
    """
    Service pour l'analyse statistique des crimes
    
    Fonctionnalités:
    - Statistiques descriptives (moyennes, médianes, distributions)
    - Analyse de tendances temporelles
    - Analyse géographique
    - Profils criminels
    - Rapports statistiques
    """
    
    def __init__(self):
        self.cache_stats = {}  # Cache pour optimiser les requêtes répétées
    
    def analyser_tendances_temporelles(self, 
                                      periode_jours: int = 365,
                                      granularite: str = 'mois') -> Dict[str, Any]:
        """
        Analyse les tendances temporelles des crimes
        
        Args:
            periode_jours: Période d'analyse en jours
            granularite: 'jour', 'semaine', 'mois', 'année'
            
        Returns:
            Dictionnaire avec les tendances temporelles
        """
        date_debut = timezone.now() - timedelta(days=periode_jours)
        
        infractions = CriminalInfraction.objects.filter(  # type: ignore
            date_infraction__gte=date_debut
        ).order_by('date_infraction')
        
        if not infractions.exists():
            return {
                'success': False,
                'message': 'Aucune infraction dans la période spécifiée'
            }
        
        # Grouper par période
        series_temporelle = defaultdict(int)
        
        for infraction in infractions:
            if granularite == 'jour':
                cle = infraction.date_infraction.strftime('%Y-%m-%d')
            elif granularite == 'semaine':
                cle = infraction.date_infraction.strftime('%Y-W%U')
            elif granularite == 'mois':
                cle = infraction.date_infraction.strftime('%Y-%m')
            else:  # année
                cle = infraction.date_infraction.strftime('%Y')
            
            series_temporelle[cle] += 1
        
        # Calculer la tendance
        valeurs = list(series_temporelle.values())
        if len(valeurs) > 1:
            # Régression linéaire simple
            x = np.arange(len(valeurs))
            y = np.array(valeurs)
            coefficients = np.polyfit(x, y, 1)
            tendance = 'hausse' if coefficients[0] > 0 else 'baisse'
            taux_variation = (coefficients[0] / np.mean(y)) * 100
        else:
            tendance = 'stable'
            taux_variation = 0
        
        return {
            'success': True,
            'periode': f'{periode_jours} jours',
            'granularite': granularite,
            'serie_temporelle': dict(series_temporelle),
            'total_infractions': sum(valeurs),
            'moyenne_par_periode': np.mean(valeurs) if valeurs else 0,
            'tendance': tendance,
            'taux_variation': round(taux_variation, 2),
            'pic_maximum': max(valeurs) if valeurs else 0,
            'pic_minimum': min(valeurs) if valeurs else 0
        }
    
    def analyser_distribution_geographique(self) -> Dict[str, Any]:
        """
        Analyse la distribution géographique des crimes
        
        Returns:
            Dictionnaire avec les statistiques géographiques
        """
        # Grouper par lieu
        infractions_par_lieu = CriminalInfraction.objects.values(  # type: ignore
            'lieu_infraction'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Zones les plus touchées
        zones_chaudes = list(infractions_par_lieu[:10])
        
        # Statistiques
        total_infractions = sum(z['count'] for z in infractions_par_lieu)
        
        return {
            'success': True,
            'zones_chaudes': zones_chaudes,
            'nombre_zones_uniques': infractions_par_lieu.count(),
            'total_infractions': total_infractions,
            'concentration_top_10': sum(z['count'] for z in zones_chaudes) / total_infractions * 100 if total_infractions > 0 else 0
        }
    
    def analyser_types_crimes(self) -> Dict[str, Any]:
        """
        Analyse la distribution des types de crimes
        
        Returns:
            Dictionnaire avec les statistiques par type de crime
        """
        # Grouper par type
        infractions_par_type = CriminalInfraction.objects.values(  # type: ignore
            'type_infraction'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        total = sum(item['count'] for item in infractions_par_type)
        
        # Ajouter les pourcentages
        distribution = []
        for item in infractions_par_type:
            distribution.append({
                'type': item['type_infraction'],
                'count': item['count'],
                'pourcentage': round((item['count'] / total * 100), 2) if total > 0 else 0
            })
        
        return {
            'success': True,
            'distribution': distribution,
            'nombre_types': len(distribution),
            'type_plus_frequent': distribution[0] if distribution else None
        }
    
    def analyser_profils_criminels(self) -> Dict[str, Any]:
        """
        Analyse les profils des criminels
        
        Returns:
            Statistiques sur les profils criminels
        """
        criminels = CriminalFicheCriminelle.objects.all()  # type: ignore
        
        if not criminels.exists():
            return {
                'success': False,
                'message': 'Aucun criminel dans la base'
            }
        
        # Distribution par sexe
        repartition_sexe = criminels.values('sexe').annotate(
            count=Count('id')
        )
        
        ages = []
        for criminel in criminels:
            if criminel.date_naissance:
                age = (timezone.now().date() - criminel.date_naissance).days // 365
                ages.append(age)
        
        # Distribution par niveau de dangerosité
        repartition_danger = criminels.values('niveau_dangerosite').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return {
            'success': True,
            'total_criminels': criminels.count(),
            'repartition_sexe': list(repartition_sexe),
            'age_moyen': round(np.mean(ages), 1) if ages else None,
            'age_median': round(np.median(ages), 1) if ages else None,
            'age_min': min(ages) if ages else None,
            'age_max': max(ages) if ages else None,
            'repartition_dangerosite': list(repartition_danger)
        }
    
    def generer_rapport_statistique_complet(self, 
                                            periode_jours: int = 365) -> Dict[str, Any]:
        """
        Génère un rapport statistique complet
        
        Args:
            periode_jours: Période d'analyse
            
        Returns:
            Rapport complet avec toutes les statistiques
        """
        rapport: Dict[str, Any] = {}
        rapport['date_generation'] = timezone.now().isoformat()
        rapport['periode_analyse'] = f'{periode_jours} jours'
        
        # Tendances temporelles
        rapport['tendances_temporelles'] = self.analyser_tendances_temporelles(
            periode_jours=periode_jours,
            granularite='mois'
        )
        
        # Distribution géographique
        rapport['distribution_geographique'] = self.analyser_distribution_geographique()
        
        # Types de crimes
        rapport['types_crimes'] = self.analyser_types_crimes()
        
        # Profils criminels
        rapport['profils_criminels'] = self.analyser_profils_criminels()
        
        return {
            'success': True,
            'rapport': rapport
        }
    
    def calculer_taux_recidive(self) -> Dict[str, Any]:
        """
        Calcule le taux de récidive
        
        Returns:
            Statistiques de récidive
        """
        criminels_avec_infractions = CriminalFicheCriminelle.objects.annotate(  # type: ignore
            nb_infractions=Count('infractions')
        )
        
        recidivistes = criminels_avec_infractions.filter(nb_infractions__gt=1)
        total_criminels = criminels_avec_infractions.count()
        
        taux_recidive = (recidivistes.count() / total_criminels * 100) if total_criminels > 0 else 0
        
        # Distribution du nombre d'infractions
        distribution_infractions = criminels_avec_infractions.values(
            'nb_infractions'
        ).annotate(
            count=Count('id')
        ).order_by('nb_infractions')
        
        return {
            'success': True,
            'total_criminels': total_criminels,
            'nombre_recidivistes': recidivistes.count(),
            'taux_recidive': round(taux_recidive, 2),
            'distribution_infractions': list(distribution_infractions)
        }
    
    def analyser_associations_criminelles(self) -> Dict[str, Any]:
        """
        Analyse les associations entre criminels
        
        Returns:
            Statistiques sur les associations
        
        Note: Cette fonctionnalité nécessite le modèle CriminalAssociation
        """
        # TODO: Implémenter cette méthode une fois que CriminalAssociation est créé
        return {
            'success': False,
            'message': 'Le modèle CriminalAssociation n\'est pas encore implémenté',
            'total_associations': 0
        }
    
    def obtenir_statistiques_rapides(self) -> Dict[str, Any]:
        """
        Retourne des statistiques rapides pour les dashboards
        
        Returns:
            Statistiques essentielles
        """
        total_criminels = CriminalFicheCriminelle.objects.count()  # type: ignore
        total_infractions = CriminalInfraction.objects.count()  # type: ignore
        
        date_semaine = timezone.now() - timedelta(days=7)
        infractions_recentes = CriminalInfraction.objects.filter(  # type: ignore
            date_infraction__gte=date_semaine
        ).count()
        
        criminels_actifs = CriminalFicheCriminelle.objects.filter(  # type: ignore
            infractions__date_infraction__gte=date_semaine
        ).distinct().count()
        
        return {
            'success': True,
            'total_criminels': total_criminels,
            'total_infractions': total_infractions,
            'infractions_7_jours': infractions_recentes,
            'criminels_actifs_7_jours': criminels_actifs,
            'moyenne_infractions_par_criminel': round(
                total_infractions / total_criminels, 2
            ) if total_criminels > 0 else 0
        }

