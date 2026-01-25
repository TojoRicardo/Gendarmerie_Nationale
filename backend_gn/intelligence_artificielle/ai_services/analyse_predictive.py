"""
Service d'Analyse Prédictive IA
Utilise scikit-learn pour prédire les comportements criminels
"""

try:
    import numpy as np
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    import joblib
    IA_PACKAGES_AVAILABLE = True
except ImportError:
    IA_PACKAGES_AVAILABLE = False
    print(" Packages IA non installés. Installez-les avec: pip install -r requirements.txt")
import os
from django.conf import settings
from datetime import datetime, timedelta


class AnalysePredictiveService:
    """
    Service pour l'analyse prédictive des comportements criminels
    """
    
    def __init__(self):
        self.model_path = os.path.join(settings.BASE_DIR, 'intelligence_artificielle', 'models')
        self.scaler = StandardScaler() if IA_PACKAGES_AVAILABLE else None
        self.label_encoders = {}
        self.model = None
        
        # Créer le dossier models s'il n'existe pas
        os.makedirs(self.model_path, exist_ok=True)
    
    def predire_risque_recidive(self, criminel):
        """
        Prédit le risque de récidive d'un criminel
        
        Args:
            criminel: Instance de CriminalFicheCriminelle
            
        Returns:
            dict: {
                'risque_recidive': float (0-100),
                'niveau_risque': str ('faible', 'moyen', 'élevé'),
                'facteurs': list[dict],
                'recommandations': list[str]
            }
        """
        try:
            # Extraire les features du criminel
            features = self._extraire_features_criminel(criminel)
            
            # Calculer le score de risque
            score_risque = self._calculer_score_risque(features)
            
            # Déterminer le niveau de risque
            niveau_risque = self._determiner_niveau_risque(score_risque)
            
            # Identifier les facteurs de risque
            facteurs = self._identifier_facteurs_risque(features, criminel)
            
            # Générer des recommandations
            recommandations = self._generer_recommandations(niveau_risque, facteurs)
            
            return {
                'success': True,
                'risque_recidive': round(score_risque, 2),
                'niveau_risque': niveau_risque,
                'facteurs': facteurs,
                'recommandations': recommandations,
                'confiance_prediction': round(self._calculer_confiance(features), 2)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def predire_zone_risque(self, criminel):
        """
        Prédit les zones géographiques à risque pour un criminel
        
        Returns:
            dict: {
                'zones_risque': list[dict],
                'probabilites': dict,
                'carte_chaleur': dict
            }
        """
        try:
            # Analyser l'historique des infractions
            infractions = criminel.infractions.all()
            
            if not infractions:
                return {
                    'success': False,
                    'error': 'Aucune infraction enregistrée'
                }
            
            # Extraire les lieux des infractions
            lieux = []
            for infraction in infractions:
                if infraction.lieu:
                    lieux.append({
                        'lieu': infraction.lieu,
                        'date': infraction.date_infraction,
                        'type': infraction.type_infraction.libelle if infraction.type_infraction else 'Inconnu'
                    })
            
            # Analyser les patterns géographiques
            zones_risque = self._analyser_patterns_geographiques(lieux)
            
            return {
                'success': True,
                'zones_risque': zones_risque,
                'nb_lieux_analyses': len(lieux),
                'periode_analyse': self._get_periode_analyse(infractions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def predire_profil_dangerosite(self, criminel):
        """
        Évalue le profil de dangerosité d'un criminel
        
        Returns:
            dict: Profil de dangerosité avec scores détaillés
        """
        try:
            infractions = criminel.infractions.all()
            
            # Scores de dangerosité
            score_violence = self._evaluer_violence(infractions)
            score_frequence = self._evaluer_frequence(infractions)
            score_gravite = self._evaluer_gravite(infractions)
            score_evolution = self._evaluer_evolution(infractions)
            
            # Score global
            score_global = (
                score_violence * 0.35 +
                score_frequence * 0.25 +
                score_gravite * 0.30 +
                score_evolution * 0.10
            )
            
            niveau_dangerosite = self._determiner_niveau_dangerosite(score_global)
            
            return {
                'success': True,
                'score_global': round(score_global, 2),
                'niveau_dangerosite': niveau_dangerosite,
                'scores_detailles': {
                    'violence': round(score_violence, 2),
                    'frequence': round(score_frequence, 2),
                    'gravite': round(score_gravite, 2),
                    'evolution': round(score_evolution, 2)
                },
                'nb_infractions_analysees': infractions.count()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def predire_association_criminelle(self, criminel):
        """
        Prédit la probabilité d'associations criminelles
        
        Returns:
            dict: Probabilités et associations potentielles
        """
        try:
            # Analyser les corrélations existantes
            correlations = criminel.correlations.all()
            
            associations_potentielles = []
            
            for correlation in correlations:
                # Criminels associés dans cette corrélation
                criminels_associes = correlation.criminels.exclude(id=criminel.id)
                
                for criminel_associe in criminels_associes:
                    probabilite = self._calculer_probabilite_association(
                        criminel, 
                        criminel_associe,
                        correlation
                    )
                    
                    associations_potentielles.append({
                        'criminel_id': criminel_associe.id,
                        'numero_fiche': criminel_associe.numero_fiche,
                        'nom_complet': f"{criminel_associe.nom} {criminel_associe.prenom}",
                        'probabilite': round(probabilite, 2),
                        'type_correlation': correlation.type_correlation,
                        'degre_correlation': float(correlation.degre_correlation)
                    })
            
            # Trier par probabilité décroissante
            associations_potentielles.sort(key=lambda x: x['probabilite'], reverse=True)
            
            return {
                'success': True,
                'nb_associations': len(associations_potentielles),
                'associations': associations_potentielles[:10],  # Top 10
                'score_reseautage': self._calculer_score_reseautage(len(associations_potentielles))
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _extraire_features_criminel(self, criminel):
        """Extrait les features pour le modèle ML"""
        age = (datetime.now().date() - criminel.date_naissance).days // 365 if criminel.date_naissance else 30
        
        features = {
            'age': age,
            'nb_infractions': criminel.infractions.count(),
            'niveau_danger': criminel.niveau_danger if hasattr(criminel, 'niveau_danger') else 0,
            'antecedents': len(criminel.antecedent_judiciaire) if criminel.antecedent_judiciaire else 0,
            'jours_depuis_derniere_infraction': self._jours_depuis_derniere_infraction(criminel)
        }
        
        return features
    
    def _calculer_score_risque(self, features):
        """Calcule le score de risque de récidive"""
        score = 0
        
        if features['age'] < 25:
            score += 30
        elif features['age'] < 35:
            score += 20
        else:
            score += 10
        
        # Nombre d'infractions
        score += min(features['nb_infractions'] * 5, 30)
        
        # Niveau de danger
        score += features['niveau_danger'] * 2
        
        # Antécédents
        score += min(features['antecedents'] * 3, 20)
        
        # Récence
        if features['jours_depuis_derniere_infraction'] < 180:
            score += 20
        elif features['jours_depuis_derniere_infraction'] < 365:
            score += 10
        
        return min(score, 100)
    
    def _determiner_niveau_risque(self, score):
        """Détermine le niveau de risque"""
        if score < 30:
            return 'faible'
        elif score < 60:
            return 'moyen'
        else:
            return 'élevé'
    
    def _identifier_facteurs_risque(self, features, criminel):
        """Identifie les principaux facteurs de risque"""
        facteurs = []
        
        if features['age'] < 25:
            facteurs.append({
                'facteur': 'Âge jeune',
                'impact': 'élevé',
                'valeur': features['age']
            })
        
        if features['nb_infractions'] > 5:
            facteurs.append({
                'facteur': 'Infractions multiples',
                'impact': 'élevé',
                'valeur': features['nb_infractions']
            })
        
        if features['jours_depuis_derniere_infraction'] < 180:
            facteurs.append({
                'facteur': 'Infraction récente',
                'impact': 'très élevé',
                'valeur': features['jours_depuis_derniere_infraction']
            })
        
        return facteurs
    
    def _generer_recommandations(self, niveau_risque, facteurs):
        """Génère des recommandations"""
        recommandations = []
        
        if niveau_risque == 'élevé':
            recommandations.append('Surveillance renforcée recommandée')
            recommandations.append('Suivi psychologique conseillé')
            recommandations.append('Contrôles réguliers programmés')
        elif niveau_risque == 'moyen':
            recommandations.append('Surveillance standard')
            recommandations.append('Contrôles périodiques')
        else:
            recommandations.append('Surveillance minimale')
        
        return recommandations
    
    def _calculer_confiance(self, features):
        """
        Calcule la confiance dans la prédiction basée sur les données réelles disponibles
        
        Facteurs pris en compte:
        - Nombre d'infractions (plus il y en a, plus la confiance est élevée)
        - Présence d'antécédents (données historiques)
        - Récence des données (infractions récentes = données plus fiables)
        - Complétude des données (âge, niveau de danger, etc.)
        """
        confiance = 50  # Base de confiance
        
        nb_infractions = features.get('nb_infractions', 0)
        if nb_infractions > 10:
            confiance += 25
        elif nb_infractions > 5:
            confiance += 20
        elif nb_infractions > 3:
            confiance += 15
        elif nb_infractions > 1:
            confiance += 10
        elif nb_infractions == 1:
            confiance += 5
        
        antecedents = features.get('antecedents', 0)
        if antecedents > 0:
            confiance += min(antecedents * 2, 10)
        
        jours_depuis_derniere = features.get('jours_depuis_derniere_infraction', 9999)
        if jours_depuis_derniere < 180:
            confiance += 10  # Données très récentes
        elif jours_depuis_derniere < 365:
            confiance += 7   # Données récentes
        elif jours_depuis_derniere < 730:
            confiance += 5   # Données modérément récentes
        elif jours_depuis_derniere < 9999:
            confiance += 3   # Données anciennes mais disponibles
        
        # Vérifier que les données essentielles sont présentes
        if features.get('age') and features.get('age') > 0:
            confiance += 2
        if features.get('niveau_danger', 0) > 0:
            confiance += 3
        
        return min(max(confiance, 50), 95)
    
    def _jours_depuis_derniere_infraction(self, criminel):
        """Calcule les jours depuis la dernière infraction"""
        derniere_infraction = criminel.infractions.order_by('-date_infraction').first()
        if derniere_infraction and derniere_infraction.date_infraction:
            delta = datetime.now().date() - derniere_infraction.date_infraction
            return delta.days
        return 9999
    
    def _analyser_patterns_geographiques(self, lieux):
        """Analyse les patterns géographiques"""
        # Compter les occurrences par lieu
        from collections import Counter
        lieux_counts = Counter([l['lieu'] for l in lieux])
        
        zones_risque = []
        for lieu, count in lieux_counts.most_common(5):
            zones_risque.append({
                'lieu': lieu,
                'frequence': count,
                'probabilite': round((count / len(lieux)) * 100, 2)
            })
        
        return zones_risque
    
    def _get_periode_analyse(self, infractions):
        """Obtient la période d'analyse"""
        dates = [i.date_infraction for i in infractions if i.date_infraction]
        if dates:
            return {
                'debut': min(dates).isoformat(),
                'fin': max(dates).isoformat()
            }
        return None
    
    def _evaluer_violence(self, infractions):
        """Évalue le niveau de violence"""
        types_violents = ['agression', 'meurtre', 'violence', 'coup', 'blessure']
        count_violent = 0
        
        for infraction in infractions:
            if infraction.type_infraction:
                libelle = infraction.type_infraction.libelle.lower()
                if any(t in libelle for t in types_violents):
                    count_violent += 1
        
        total = infractions.count()
        return (count_violent / total * 100) if total > 0 else 0
    
    def _evaluer_frequence(self, infractions):
        """Évalue la fréquence des infractions"""
        count = infractions.count()
        if count == 0:
            return 0
        elif count < 3:
            return 20
        elif count < 5:
            return 50
        elif count < 10:
            return 75
        else:
            return 100
    
    def _evaluer_gravite(self, infractions):
        """Évalue la gravité globale"""
        # Basé sur les types d'infractions
        score = 0
        for infraction in infractions:
            if infraction.type_infraction:
                libelle = infraction.type_infraction.libelle.lower()
                if 'meurtre' in libelle or 'homicide' in libelle:
                    score += 100
                elif 'violence' in libelle or 'agression' in libelle:
                    score += 60
                elif 'vol' in libelle:
                    score += 30
                else:
                    score += 20
        
        return min(score / infractions.count() if infractions.count() > 0 else 0, 100)
    
    def _evaluer_evolution(self, infractions):
        """Évalue l'évolution du comportement"""
        # Compare les infractions récentes vs anciennes
        infractions_ordonnees = infractions.order_by('date_infraction')
        if infractions_ordonnees.count() < 2:
            return 50
        
        # Simplification: plus d'infractions récentes = évolution négative
        total = infractions_ordonnees.count()
        moitie = total // 2
        recentes = infractions_ordonnees[moitie:]
        
        return (recentes.count() / moitie * 100) if moitie > 0 else 50
    
    def _determiner_niveau_dangerosite(self, score):
        """Détermine le niveau de dangerosité"""
        if score < 30:
            return 'faible'
        elif score < 50:
            return 'modéré'
        elif score < 70:
            return 'élevé'
        else:
            return 'très élevé'
    
    def _calculer_probabilite_association(self, criminel1, criminel2, correlation):
        """Calcule la probabilité d'association entre deux criminels"""
        base_prob = float(correlation.degre_correlation)
        
        # Ajuster selon le nombre d'infractions communes
        infractions_communes = 0
        for inf1 in criminel1.infractions.all():
            for inf2 in criminel2.infractions.all():
                if inf1.lieu == inf2.lieu or inf1.type_infraction == inf2.type_infraction:
                    infractions_communes += 1
        
        ajustement = min(infractions_communes * 5, 20)
        
        return min(base_prob + ajustement, 100)
    
    def _calculer_score_reseautage(self, nb_associations):
        """Calcule un score de reseautage criminel"""
        if nb_associations == 0:
            return 0
        elif nb_associations < 3:
            return 25
        elif nb_associations < 5:
            return 50
        elif nb_associations < 10:
            return 75
        else:
            return 100

