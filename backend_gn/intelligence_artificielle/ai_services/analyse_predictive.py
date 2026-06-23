"""
Service d'Analyse Prédictive IA
Utilise scikit-learn pour prédire les comportements criminels
"""

try:
    from sklearn.preprocessing import StandardScaler
    IA_PACKAGES_AVAILABLE = True
except ImportError:
    IA_PACKAGES_AVAILABLE = False
    StandardScaler = None  # type: ignore[misc, assignment]
    print(" Packages IA non installés. Installez-les avec: pip install -r requirements.txt")
import os
from django.conf import settings
from datetime import datetime


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
            features = self._extraire_features_criminel(criminel)
            score_risque, scores_detailles = self._calculer_score_risque(features)
            niveau_risque = self._determiner_niveau_risque(score_risque)
            facteurs = self._identifier_facteurs_risque(features, criminel)
            recommandations = self._generer_recommandations(niveau_risque, facteurs, criminel)
            tendance = self._analyser_tendance_infractions(criminel)
            confiance = self._calculer_confiance(features)

            return {
                'success': True,
                'risque_recidive': round(score_risque, 2),
                'niveau_risque': niveau_risque,
                'facteurs': facteurs,
                'recommandations': recommandations,
                'confiance_prediction': round(confiance, 2),
                'scores_detailles': scores_detailles,
                'tendance': tendance,
                'interpretation': self._generer_interpretation_recidive(
                    score_risque, niveau_risque, tendance, features
                ),
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
                'nb_zones_identifiees': len(zones_risque),
                'periode_analyse': self._get_periode_analyse(infractions),
                'interpretation': self._generer_interpretation_zones(zones_risque, len(lieux)),
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
            tendance = self._analyser_tendance_infractions(criminel)
            
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
                'nb_infractions_analysees': infractions.count(),
                'tendance': tendance,
                'interpretation': self._generer_interpretation_dangerosite(
                    score_global, niveau_dangerosite, tendance
                ),
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
            correlations = criminel.correlations.all()
            associations_potentielles = []
            seen_ids = set()
            
            for correlation in correlations:
                criminels_associes = correlation.criminels.exclude(id=criminel.id)
                
                for criminel_associe in criminels_associes:
                    if criminel_associe.id in seen_ids:
                        continue
                    seen_ids.add(criminel_associe.id)
                    probabilite = self._calculer_probabilite_association(
                        criminel, 
                        criminel_associe,
                        correlation
                    )
                    
                    associations_potentielles.append({
                        'criminel_id': criminel_associe.id,
                        'numero_fiche': criminel_associe.numero_fiche,
                        'nom_complet': f"{criminel_associe.nom} {criminel_associe.prenom}".strip(),
                        'probabilite': round(probabilite, 2),
                        'type_correlation': correlation.type_correlation,
                        'degre_correlation': float(correlation.degre_correlation),
                        'source': 'correlation_ia',
                    })
            
            # Compléter avec des liens géographiques si peu de corrélations IA
            if len(associations_potentielles) < 5:
                associations_potentielles.extend(
                    self._detecter_associations_geographiques(criminel, seen_ids)
                )
            
            associations_potentielles.sort(key=lambda x: x['probabilite'], reverse=True)
            top_associations = associations_potentielles[:10]
            
            return {
                'success': True,
                'nb_associations': len(associations_potentielles),
                'associations': top_associations,
                'score_reseautage': self._calculer_score_reseautage(len(associations_potentielles)),
                'interpretation': self._generer_interpretation_associations(
                    len(associations_potentielles), top_associations
                ),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def evaluer_qualite_donnees(self, criminel, features=None):
        """Évalue la complétude et la fiabilité des données du dossier."""
        if features is None:
            features = self._extraire_features_criminel(criminel)

        criteres = []
        score = 0
        max_score = 0

        checks = [
            ('date_naissance', criminel.date_naissance is not None, 10, 'Date de naissance'),
            ('infractions', features.get('nb_infractions', 0) > 0, 25, 'Infractions enregistrées'),
            ('lieux', features.get('nb_lieux_distincts', 0) > 0, 15, 'Lieux d\'infraction'),
            ('niveau_danger', features.get('niveau_danger', 0) > 0, 10, 'Niveau de danger renseigné'),
            ('antecedents', features.get('nb_antecedents', 0) > 0, 10, 'Antécédents judiciaires'),
            ('types_infractions', features.get('nb_types_infractions', 0) > 0, 15, 'Types d\'infraction'),
            ('recence', features.get('jours_depuis_derniere_infraction', 9999) < 9999, 15, 'Données récentes'),
        ]

        manques = []
        for _key, present, poids, label in checks:
            max_score += poids
            if present:
                score += poids
                criteres.append({'critere': label, 'present': True, 'poids': poids})
            else:
                manques.append(label)
                criteres.append({'critere': label, 'present': False, 'poids': poids})

        pct = round((score / max_score) * 100, 1) if max_score else 0
        if pct >= 75:
            niveau = 'élevée'
        elif pct >= 50:
            niveau = 'moyenne'
        else:
            niveau = 'faible'

        return {
            'score': pct,
            'niveau': niveau,
            'criteres': criteres,
            'donnees_manquantes': manques,
            'nb_infractions': features.get('nb_infractions', 0),
        }

    def generer_synthese_globale(self, criminel, resultats, score_risque_global, score_confiance):
        """Génère un résumé textuel de l'analyse pour l'enquêteur."""
        nom = f"{criminel.nom} {criminel.prenom}".strip()
        fiche = criminel.numero_fiche
        parties = [f"Analyse du dossier {fiche} ({nom})."]

        recidive = resultats.get('recidive')
        if recidive and recidive.get('success'):
            niveau = recidive.get('niveau_risque', 'inconnu')
            score = recidive.get('risque_recidive', 0)
            parties.append(
                f"Risque de récidive {niveau} ({score:.0f}%)"
                + (f", tendance {recidive['tendance']['label']}." if recidive.get('tendance') else '.')
            )

        danger = resultats.get('dangerosite')
        if danger and danger.get('success'):
            parties.append(
                f"Profil de dangerosité {danger.get('niveau_dangerosite', 'inconnu')} "
                f"({danger.get('score_global', 0):.0f}%)."
            )

        zones = resultats.get('zones_risque')
        if zones and zones.get('success') and zones.get('zones_risque'):
            top = zones['zones_risque'][0]['lieu']
            parties.append(f"Zone la plus fréquente : {top}.")

        asso = resultats.get('associations')
        if asso and asso.get('success'):
            nb = asso.get('nb_associations', 0)
            if nb:
                parties.append(f"{nb} association(s) criminelle(s) identifiée(s).")
            else:
                parties.append("Aucune association criminelle détectée.")

        if score_risque_global >= 60:
            parties.append("Niveau d'alerte global élevé — mesures de suivi renforcées recommandées.")
        elif score_risque_global >= 35:
            parties.append("Profil modéré — surveillance périodique conseillée.")
        else:
            parties.append("Profil globalement stable — suivi standard suffisant.")

        parties.append(f"Confiance de l'analyse : {score_confiance:.0f}%.")

        return ' '.join(parties)

    def _extraire_features_criminel(self, criminel):
        """Extrait les features pour le modèle ML"""
        age = (datetime.now().date() - criminel.date_naissance).days // 365 if criminel.date_naissance else None

        infractions = criminel.infractions.all()
        nb_infractions = infractions.count()
        lieux = list(infractions.values_list('lieu', flat=True))
        types_ids = set(infractions.values_list('type_infraction_id', flat=True))
        types_ids.discard(None)

        features = {
            'age': age if age is not None else 0,
            'age_connu': age is not None,
            'nb_infractions': nb_infractions,
            'nb_types_infractions': len(types_ids),
            'nb_lieux_distincts': len({lieu for lieu in lieux if lieu}),
            'niveau_danger': criminel.niveau_danger if hasattr(criminel, 'niveau_danger') and criminel.niveau_danger else 0,
            'nb_antecedents': self._compter_antecedents(criminel),
            'antecedents': self._compter_antecedents(criminel),
            'jours_depuis_derniere_infraction': self._jours_depuis_derniere_infraction(criminel),
        }

        return features

    def _compter_antecedents(self, criminel):
        if not criminel.antecedent_judiciaire:
            return 0
        text = criminel.antecedent_judiciaire.strip()
        if not text:
            return 0
        lines = [line for line in text.splitlines() if line.strip()]
        return len(lines) if lines else 1

    def _calculer_score_risque(self, features):
        """Calcule le score de risque de récidive avec détail par composante."""
        scores_detailles = {}
        score = 0.0

        age = features.get('age', 0)
        if features.get('age_connu'):
            if age < 25:
                scores_detailles['demographie'] = 28
            elif age < 35:
                scores_detailles['demographie'] = 18
            else:
                scores_detailles['demographie'] = 8
        else:
            scores_detailles['demographie'] = 12

        nb_inf = features.get('nb_infractions', 0)
        scores_detailles['historique'] = min(nb_inf * 6, 32)
        scores_detailles['niveau_danger'] = min(features.get('niveau_danger', 0) * 4, 20)
        scores_detailles['antecedents'] = min(features.get('nb_antecedents', 0) * 4, 16)

        jours = features.get('jours_depuis_derniere_infraction', 9999)
        if jours < 90:
            scores_detailles['recence'] = 22
        elif jours < 180:
            scores_detailles['recence'] = 16
        elif jours < 365:
            scores_detailles['recence'] = 10
        elif jours < 730:
            scores_detailles['recence'] = 5
        else:
            scores_detailles['recence'] = 0

        if features.get('nb_types_infractions', 0) >= 3:
            scores_detailles['diversite_modus'] = 12
        elif features.get('nb_types_infractions', 0) >= 2:
            scores_detailles['diversite_modus'] = 6
        else:
            scores_detailles['diversite_modus'] = 0

        score = sum(scores_detailles.values())
        return min(score, 100), {k: round(v, 1) for k, v in scores_detailles.items()}
    
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
        
        if features.get('age_connu') and features['age'] < 25:
            facteurs.append({
                'facteur': 'Âge jeune (< 25 ans)',
                'impact': 'élevé',
                'impact_score': 85,
                'valeur': f"{features['age']} ans",
                'description': 'Les profils jeunes présentent un risque de récidive statistiquement plus élevé.',
            })
        
        nb_inf = features.get('nb_infractions', 0)
        if nb_inf >= 5:
            facteurs.append({
                'facteur': 'Infractions multiples',
                'impact': 'élevé',
                'impact_score': 90,
                'valeur': nb_inf,
                'description': f'{nb_inf} infraction(s) enregistrée(s) sur le dossier.',
            })
        elif nb_inf >= 2:
            facteurs.append({
                'facteur': 'Récidive avérée',
                'impact': 'modéré',
                'impact_score': 60,
                'valeur': nb_inf,
                'description': 'Plusieurs infractions indiquent un comportement répétitif.',
            })

        jours = features.get('jours_depuis_derniere_infraction', 9999)
        if jours < 180:
            facteurs.append({
                'facteur': 'Infraction récente',
                'impact': 'très élevé',
                'impact_score': 95,
                'valeur': f"{jours} jours",
                'description': 'Une infraction datant de moins de 6 mois augmente significativement le risque.',
            })

        niveau = features.get('niveau_danger', 0)
        if niveau >= 3:
            facteurs.append({
                'facteur': 'Niveau de danger élevé',
                'impact': 'élevé',
                'impact_score': 80,
                'valeur': niveau,
                'description': 'Le niveau de danger renseigné sur la fiche est élevé.',
            })

        if features.get('nb_types_infractions', 0) >= 3:
            facteurs.append({
                'facteur': 'Diversité des infractions',
                'impact': 'modéré',
                'impact_score': 55,
                'valeur': features['nb_types_infractions'],
                'description': 'Plusieurs types d\'infractions suggèrent un profil polyvalent.',
            })

        if features.get('nb_antecedents', 0) >= 2:
            facteurs.append({
                'facteur': 'Antécédents judiciaires',
                'impact': 'modéré',
                'impact_score': 65,
                'valeur': features['nb_antecedents'],
                'description': 'Historique judiciaire documenté sur la fiche.',
            })

        facteurs.sort(key=lambda x: x.get('impact_score', 0), reverse=True)
        return facteurs
    
    def _generer_recommandations(self, niveau_risque, facteurs, criminel=None):
        """Génère des recommandations contextualisées"""
        recommandations = []
        
        if niveau_risque == 'élevé':
            recommandations.extend([
                'Surveillance renforcée et contrôles réguliers programmés',
                'Évaluation psychologique et sociale recommandée',
                'Coordination avec les unités de terrain sur les zones identifiées',
            ])
        elif niveau_risque == 'moyen':
            recommandations.extend([
                'Surveillance standard avec points de contrôle trimestriels',
                'Mise à jour régulière du dossier et des infractions',
            ])
        else:
            recommandations.extend([
                'Surveillance minimale — maintenir le dossier à jour',
                'Réévaluer en cas de nouvelle infraction ou signalement',
            ])

        for facteur in facteurs[:3]:
            nom = facteur.get('facteur', '')
            if 'récente' in nom.lower():
                recommandations.append('Prioriser le suivi post-infraction récente (< 6 mois)')
            elif 'association' in nom.lower() or 'réseau' in nom.lower():
                recommandations.append('Analyser le réseau d\'associés identifiés')

        if criminel and criminel.infractions.count() == 0:
            recommandations = [
                'Compléter le dossier avec les infractions connues pour améliorer la précision',
                'Enregistrer les lieux et dates des faits pour l\'analyse géographique',
            ]

        seen = set()
        uniques = []
        for rec in recommandations:
            if rec not in seen:
                seen.add(rec)
                uniques.append(rec)
        return uniques
    
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
        
        antecedents = features.get('nb_antecedents', features.get('antecedents', 0))
        if antecedents > 0:
            confiance += min(antecedents * 2, 10)

        if features.get('nb_types_infractions', 0) >= 2:
            confiance += 5
        if features.get('nb_lieux_distincts', 0) >= 2:
            confiance += 5
        
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
        """Analyse les patterns géographiques avec détail par zone."""
        from collections import Counter, defaultdict

        lieux_counts = Counter([entry['lieu'] for entry in lieux if entry.get('lieu')])
        types_par_lieu = defaultdict(set)
        dates_par_lieu = defaultdict(list)

        for entry in lieux:
            lieu = entry.get('lieu')
            if not lieu:
                continue
            if entry.get('type'):
                types_par_lieu[lieu].add(entry['type'])
            if entry.get('date'):
                dates_par_lieu[lieu].append(entry['date'])

        zones_risque = []
        total = len(lieux) or 1
        for lieu, count in lieux_counts.most_common(5):
            dates = dates_par_lieu.get(lieu, [])
            zones_risque.append({
                'lieu': lieu,
                'frequence': count,
                'probabilite': round((count / total) * 100, 2),
                'types_infractions': sorted(types_par_lieu.get(lieu, set())),
                'derniere_infraction': max(dates).isoformat() if dates else None,
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

    def _analyser_tendance_infractions(self, criminel):
        """Analyse la tendance temporelle des infractions."""
        infractions = list(
            criminel.infractions.filter(date_infraction__isnull=False)
            .order_by('date_infraction')
            .values_list('date_infraction', flat=True)
        )
        if len(infractions) < 2:
            return {
                'direction': 'stable',
                'label': 'données insuffisantes',
                'nb_infractions': len(infractions),
            }

        mid = len(infractions) // 2
        anciennes = infractions[:mid]
        recentes = infractions[mid:]
        span_ancien = max((anciennes[-1] - anciennes[0]).days, 1)
        span_recent = max((recentes[-1] - recentes[0]).days, 1)
        freq_ancien = len(anciennes) / span_ancien * 365
        freq_recent = len(recentes) / span_recent * 365

        if freq_recent > freq_ancien * 1.3:
            direction, label = 'hausse', 'en hausse'
        elif freq_recent < freq_ancien * 0.7:
            direction, label = 'baisse', 'en baisse'
        else:
            direction, label = 'stable', 'stable'

        return {
            'direction': direction,
            'label': label,
            'freq_recente_annuelle': round(freq_recent, 2),
            'freq_ancienne_annuelle': round(freq_ancien, 2),
            'nb_infractions': len(infractions),
        }

    def _detecter_associations_geographiques(self, criminel, seen_ids):
        """Détecte des liens potentiels via lieux d'infraction communs."""
        from criminel.models import CriminalInfraction, CriminalFicheCriminelle

        lieux = set(
            criminel.infractions.exclude(lieu='').values_list('lieu', flat=True)
        )
        if not lieux:
            return []

        associations = []
        autres_fiches = (
            CriminalInfraction.objects.filter(lieu__in=lieux)
            .exclude(fiche_id=criminel.id)
            .values_list('fiche_id', 'lieu')
        )
        lieux_par_fiche = {}
        for fiche_id, lieu in autres_fiches:
            if fiche_id in seen_ids:
                continue
            lieux_par_fiche.setdefault(fiche_id, set()).add(lieu)

        for fiche_id, lieux_communs in lieux_par_fiche.items():
            seen_ids.add(fiche_id)
            try:
                autre = CriminalFicheCriminelle.objects.get(id=fiche_id)
            except CriminalFicheCriminelle.DoesNotExist:
                continue
            probabilite = min(35 + len(lieux_communs) * 15, 75)
            associations.append({
                'criminel_id': autre.id,
                'numero_fiche': autre.numero_fiche,
                'nom_complet': f"{autre.nom} {autre.prenom}".strip(),
                'probabilite': round(probabilite, 2),
                'type_correlation': 'lieu',
                'degre_correlation': probabilite,
                'source': 'lieu_commun',
                'lieux_communs': sorted(lieux_communs),
            })

        associations.sort(key=lambda x: x['probabilite'], reverse=True)
        return associations[:5]

    def _generer_interpretation_recidive(self, score, niveau, tendance, features):
        tendance_txt = tendance.get('label', 'stable') if tendance else 'stable'
        nb = features.get('nb_infractions', 0)
        return (
            f"Score de récidive {score:.0f}% ({niveau}). "
            f"Basé sur {nb} infraction(s), tendance {tendance_txt}."
        )

    def _generer_interpretation_dangerosite(self, score, niveau, tendance):
        tendance_txt = tendance.get('label', 'stable') if tendance else 'stable'
        return (
            f"Profil de dangerosité {niveau} ({score:.0f}%). "
            f"Évolution comportementale {tendance_txt}."
        )

    def _generer_interpretation_zones(self, zones, nb_lieux):
        if not zones:
            return "Aucune zone à risque identifiée."
        top = zones[0]
        return (
            f"{len(zones)} zone(s) identifiée(s) sur {nb_lieux} lieu(x) analysé(s). "
            f"Zone principale : {top['lieu']} ({top['probabilite']:.0f}% des faits)."
        )

    def _generer_interpretation_associations(self, nb_total, top_list):
        if nb_total == 0:
            return "Aucune association criminelle détectée dans les corrélations ni par lieux communs."
        ia_count = sum(1 for a in top_list if a.get('source') == 'correlation_ia')
        geo_count = sum(1 for a in top_list if a.get('source') == 'lieu_commun')
        parts = [f"{nb_total} lien(s) potentiel(s) identifié(s)"]
        if ia_count:
            parts.append(f"{ia_count} via corrélations IA")
        if geo_count:
            parts.append(f"{geo_count} via lieux communs")
        return '. '.join(parts) + '.'

