"""
Service de Patterns et Corrélations IA
Utilise pandas, numpy et seaborn pour analyser les corrélations criminelles
"""

try:
    import pandas as pd
    import numpy as np
    IA_PACKAGES_AVAILABLE = True
except ImportError:
    IA_PACKAGES_AVAILABLE = False
    print(" Packages IA non installés. Installez-les avec: pip install -r requirements.txt")
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from django.db.models import Count, Q


class PatternCorrelationService:
    """
    Service pour la détection de patterns et corrélations criminelles
    """
    
    def __init__(self):
        self.seuil_correlation = 0.6  # Seuil minimum pour considérer une corrélation
    
    def detecter_correlations(self, criminels_queryset, periode_jours=365):
        """
        Détecte les corrélations entre criminels
        
        Args:
            criminels_queryset: QuerySet de criminels à analyser
            periode_jours: Période d'analyse en jours
            
        Returns:
            dict: Résultats d'analyse avec corrélations détectées
        """
        try:
            date_debut = datetime.now().date() - timedelta(days=periode_jours)
            
            # Analyser les différents types de corrélations
            correlations_lieu = self._analyser_correlations_lieu(criminels_queryset, date_debut)
            correlations_temps = self._analyser_correlations_temps(criminels_queryset, date_debut)
            correlations_modus = self._analyser_correlations_modus_operandi(criminels_queryset)
            correlations_profil = self._analyser_correlations_profil(criminels_queryset)
            
            # Synthèse
            synthese = self._generer_synthese({
                'lieu': correlations_lieu,
                'temps': correlations_temps,
                'modus': correlations_modus,
                'profil': correlations_profil
            })
            
            return {
                'success': True,
                'periode_analyse': {
                    'debut': date_debut.isoformat(),
                    'fin': datetime.now().date().isoformat(),
                    'jours': periode_jours
                },
                'nb_criminels_analyses': criminels_queryset.count(),
                'correlations': {
                    'lieu': correlations_lieu,
                    'temps': correlations_temps,
                    'modus_operandi': correlations_modus,
                    'profil': correlations_profil
                },
                'synthese': synthese,
                'graphiques': self._generer_donnees_graphiques(criminels_queryset, date_debut)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyser_patterns_temporels(self, infractions_queryset):
        """
        Analyse les patterns temporels des infractions
        
        Returns:
            dict: Patterns temporels (heures, jours, mois)
        """
        try:
            if not infractions_queryset:
                return {'success': False, 'error': 'Aucune infraction à analyser'}
            
            # Convertir en DataFrame
            data = []
            for infraction in infractions_queryset:
                if infraction.date_infraction:
                    data.append({
                        'date': infraction.date_infraction,
                        'heure': infraction.heure if hasattr(infraction, 'heure') else None,
                        'jour_semaine': infraction.date_infraction.weekday(),
                        'mois': infraction.date_infraction.month,
                        'type': infraction.type_infraction.libelle if infraction.type_infraction else 'Inconnu'
                    })
            
            if not data:
                return {'success': False, 'error': 'Aucune date valide'}
            
            df = pd.DataFrame(data)
            
            # Analyser par jour de la semaine
            jours_semaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
            par_jour = df['jour_semaine'].value_counts().to_dict()
            par_jour_formatted = {jours_semaine[k]: v for k, v in par_jour.items()}
            
            # Analyser par mois
            mois_noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                         'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
            par_mois = df['mois'].value_counts().to_dict()
            par_mois_formatted = {mois_noms[k-1]: v for k, v in par_mois.items()}
            
            # Identifier les périodes à risque
            jour_max = max(par_jour.items(), key=lambda x: x[1])
            mois_max = max(par_mois.items(), key=lambda x: x[1])
            
            return {
                'success': True,
                'nb_infractions': len(data),
                'patterns': {
                    'par_jour_semaine': par_jour_formatted,
                    'par_mois': par_mois_formatted,
                    'jour_plus_frequent': jours_semaine[jour_max[0]],
                    'mois_plus_frequent': mois_noms[mois_max[0]-1]
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyser_patterns_geographiques(self, infractions_queryset):
        """
        Analyse les patterns géographiques
        
        Returns:
            dict: Zones à risque et carte de chaleur
        """
        try:
            lieux = []
            for infraction in infractions_queryset:
                if infraction.lieu:
                    lieux.append({
                        'lieu': infraction.lieu,
                        'type': infraction.type_infraction.libelle if infraction.type_infraction else 'Inconnu',
                        'date': infraction.date_infraction
                    })
            
            if not lieux:
                return {'success': False, 'error': 'Aucun lieu enregistré'}
            
            # Compter les occurrences par lieu
            lieux_counts = Counter([l['lieu'] for l in lieux])
            
            # Top 10 zones à risque
            zones_risque = []
            for lieu, count in lieux_counts.most_common(10):
                zones_risque.append({
                    'lieu': lieu,
                    'nb_incidents': count,
                    'pourcentage': round((count / len(lieux)) * 100, 2)
                })
            
            # Analyser par type d'infraction et lieu
            types_par_lieu = defaultdict(Counter)
            for item in lieux:
                types_par_lieu[item['lieu']][item['type']] += 1
            
            patterns_types = {}
            for lieu, types in types_par_lieu.items():
                if lieu in [z['lieu'] for z in zones_risque[:5]]:  # Top 5
                    patterns_types[lieu] = dict(types.most_common(3))
            
            return {
                'success': True,
                'nb_lieux_uniques': len(lieux_counts),
                'zones_risque': zones_risque,
                'patterns_par_lieu': patterns_types,
                'concentration_max': zones_risque[0] if zones_risque else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generer_statistiques_globales(self, criminels_queryset):
        """
        Génère des statistiques globales sur les criminels
        
        Returns:
            dict: Statistiques complètes
        """
        try:
            total_criminels = criminels_queryset.count()
            
            if total_criminels == 0:
                return {'success': False, 'error': 'Aucun criminel à analyser'}
            
            # Statistiques de base
            stats = {
                'total_criminels': total_criminels,
                'avec_infractions': criminels_queryset.filter(infractions__isnull=False).distinct().count(),
                'sans_infractions': criminels_queryset.filter(infractions__isnull=True).count()
            }
            
            # Distribution par âge
            ages = []
            for criminel in criminels_queryset:
                if criminel.date_naissance:
                    age = (datetime.now().date() - criminel.date_naissance).days // 365
                    ages.append(age)
            
            if ages:
                stats['age'] = {
                    'moyen': round(np.mean(ages), 1),
                    'median': round(np.median(ages), 1),
                    'min': min(ages),
                    'max': max(ages)
                }
            
            # Top types d'infractions
            from django.db.models import Count
            top_infractions = criminels_queryset.values(
                'infractions__type_infraction__libelle'
            ).annotate(
                count=Count('infractions')
            ).order_by('-count')[:10]
            
            stats['top_infractions'] = [
                {
                    'type': item['infractions__type_infraction__libelle'] or 'Inconnu',
                    'count': item['count']
                }
                for item in top_infractions
            ]
            
            return {
                'success': True,
                'statistiques': stats
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyser_correlations_lieu(self, criminels, date_debut):
        """Analyse les corrélations par lieu"""
        correlations = []
        
        # Grouper criminels par lieux d'infractions
        lieux_criminels = defaultdict(list)
        
        for criminel in criminels:
            infractions = criminel.infractions.filter(date_infraction__gte=date_debut)
            lieux = set(inf.lieu for inf in infractions if inf.lieu)
            for lieu in lieux:
                lieux_criminels[lieu].append(criminel.id)
        
        # Trouver les lieux avec plusieurs criminels
        for lieu, criminel_ids in lieux_criminels.items():
            if len(criminel_ids) >= 2:
                correlations.append({
                    'lieu': lieu,
                    'nb_criminels': len(criminel_ids),
                    'criminel_ids': criminel_ids,
                    'degre_correlation': min(len(criminel_ids) * 10, 100)
                })
        
        return sorted(correlations, key=lambda x: x['nb_criminels'], reverse=True)[:10]
    
    def _analyser_correlations_temps(self, criminels, date_debut):
        """Analyse les corrélations temporelles"""
        correlations = []
        
        periodes = defaultdict(list)
        
        for criminel in criminels:
            infractions = criminel.infractions.filter(date_infraction__gte=date_debut)
            for infraction in infractions:
                if infraction.date_infraction:
                    # Grouper par semaine
                    semaine = infraction.date_infraction.isocalendar()[1]
                    annee = infraction.date_infraction.year
                    cle = f"{annee}-S{semaine}"
                    periodes[cle].append(criminel.id)
        
        # Identifier les périodes avec activité intense
        for periode, criminel_ids in periodes.items():
            criminel_ids_uniques = list(set(criminel_ids))
            if len(criminel_ids_uniques) >= 2:
                correlations.append({
                    'periode': periode,
                    'nb_criminels': len(criminel_ids_uniques),
                    'nb_incidents': len(criminel_ids),
                    'criminel_ids': criminel_ids_uniques,
                    'intensite': len(criminel_ids)
                })
        
        return sorted(correlations, key=lambda x: x['intensite'], reverse=True)[:10]
    
    def _analyser_correlations_modus_operandi(self, criminels):
        """Analyse les similitudes de modus operandi"""
        correlations = []
        
        # Grouper par types d'infractions similaires
        types_criminels = defaultdict(list)
        
        for criminel in criminels:
            types_infractions = set(
                inf.type_infraction.libelle
                for inf in criminel.infractions.all()
                if inf.type_infraction
            )
            
            for type_inf in types_infractions:
                types_criminels[type_inf].append(criminel.id)
        
        # Trouver les patterns communs
        for type_inf, criminel_ids in types_criminels.items():
            if len(criminel_ids) >= 2:
                correlations.append({
                    'modus_operandi': type_inf,
                    'nb_criminels': len(criminel_ids),
                    'criminel_ids': criminel_ids
                })
        
        return sorted(correlations, key=lambda x: x['nb_criminels'], reverse=True)[:10]
    
    def _analyser_correlations_profil(self, criminels):
        """Analyse les similitudes de profils"""
        correlations = []
        
        # Grouper par tranches d'âge
        tranches_age = defaultdict(list)
        
        for criminel in criminels:
            if criminel.date_naissance:
                age = (datetime.now().date() - criminel.date_naissance).days // 365
                tranche = (age // 10) * 10  # Par décennie
                tranches_age[f"{tranche}-{tranche+9} ans"].append(criminel.id)
        
        for tranche, criminel_ids in tranches_age.items():
            if len(criminel_ids) >= 3:
                correlations.append({
                    'tranche_age': tranche,
                    'nb_criminels': len(criminel_ids),
                    'criminel_ids': criminel_ids[:10]  # Limiter
                })
        
        return sorted(correlations, key=lambda x: x['nb_criminels'], reverse=True)[:5]
    
    def _generer_synthese(self, correlations):
        """Génère une synthèse des corrélations"""
        return {
            'nb_correlations_lieu': len(correlations['lieu']),
            'nb_correlations_temps': len(correlations['temps']),
            'nb_correlations_modus': len(correlations['modus']),
            'nb_correlations_profil': len(correlations['profil']),
            'total_correlations': sum([
                len(correlations['lieu']),
                len(correlations['temps']),
                len(correlations['modus']),
                len(correlations['profil'])
            ])
        }
    
    def _generer_donnees_graphiques(self, criminels, date_debut):
        """Génère les données pour les graphiques frontend"""
        # Données pour graphique temporel
        infractions_par_mois = defaultdict(int)
        
        for criminel in criminels:
            for infraction in criminel.infractions.filter(date_infraction__gte=date_debut):
                if infraction.date_infraction:
                    mois_cle = infraction.date_infraction.strftime('%Y-%m')
                    infractions_par_mois[mois_cle] += 1
        
        # Formater pour le frontend
        timeline = [
            {'mois': mois, 'count': count}
            for mois, count in sorted(infractions_par_mois.items())
        ]
        
        return {
            'timeline': timeline,
            'format': 'ready_for_chart'
        }

