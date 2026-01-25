"""
Service de Prédiction pour la Recherche de Criminels
====================================================

Module pour prédire et suggérer des pistes de recherche
en utilisant l'IA et l'apprentissage automatique.
"""

import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg


class PredictionRechercheService:
    """
    Service pour prédire les zones, moments et cibles probables
    pour optimiser la recherche de criminels
    """
    
    def __init__(self):
        self.seuil_confiance = 0.65
    
    def predire_zone_probable(self, criminel_id: int) -> Dict[str, Any]:
        """
        Prédit les zones probables où se trouve un criminel
        
        Args:
            criminel_id: ID du criminel recherché
            
        Returns:
            Zones probables avec scores de probabilité
        """
        from criminel.models import CriminalFicheCriminelle, CriminalInfraction
        
        try:
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        except CriminalFicheCriminelle.DoesNotExist:
            return {
                'success': False,
                'erreur': 'Criminel non trouvé'
            }
        
        # Analyser l'historique des lieux
        infractions = CriminalInfraction.objects.filter(
            fiche_criminelle=criminel
        ).exclude(lieu_infraction__isnull=True)
        
        if not infractions.exists():
            return {
                'success': False,
                'message': 'Aucun historique de lieu disponible'
            }
        
        # Compter la fréquence des lieux
        lieux_frequents = infractions.values('lieu_infraction').annotate(
            frequence=Count('id')
        ).order_by('-frequence')
        
        total = infractions.count()
        
        # Calculer les probabilités
        zones_probables = []
        for lieu in lieux_frequents[:5]:
            probabilite = lieu['frequence'] / total
            
            zones_probables.append({
                'zone': lieu['lieu_infraction'],
                'probabilite': round(probabilite * 100, 2),
                'nombre_occurrences': lieu['frequence'],
                'confiance': 'élevée' if probabilite > 0.3 else 'moyenne' if probabilite > 0.15 else 'faible'
            })
        
        # Ajouter les zones d'associés connus
        from criminel.models import CriminalAssociation
        
        associations = CriminalAssociation.objects.filter(
            Q(criminel_principal=criminel) | Q(criminel_associe=criminel),
            est_active=True
        )
        
        zones_associes = []
        for assoc in associations:
            autre_criminel = assoc.criminel_associe if assoc.criminel_principal == criminel else assoc.criminel_principal
            
            # Dernière localisation connue de l'associé
            derniere_infraction = CriminalInfraction.objects.filter(
                fiche_criminelle=autre_criminel
            ).exclude(lieu_infraction__isnull=True).order_by('-date_infraction').first()
            
            if derniere_infraction:
                zones_associes.append({
                    'zone': derniere_infraction.lieu_infraction,
                    'raison': f'Zone fréquentée par {autre_criminel.nom} {autre_criminel.prenom}',
                    'date': derniere_infraction.date_infraction.isoformat(),
                    'type_association': assoc.type_association
                })
        
        return {
            'success': True,
            'criminel_id': criminel_id,
            'zones_probables': zones_probables,
            'zones_via_associes': zones_associes,
            'recommandation': zones_probables[0]['zone'] if zones_probables else None
        }
    
    def predire_prochaine_action(self, criminel_id: int) -> Dict[str, Any]:
        """
        Prédit le type de prochaine action criminelle possible
        
        Args:
            criminel_id: ID du criminel
            
        Returns:
            Prédiction de la prochaine action
        """
        from criminel.models import CriminalFicheCriminelle, CriminalInfraction
        
        try:
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        except CriminalFicheCriminelle.DoesNotExist:
            return {
                'success': False,
                'erreur': 'Criminel non trouvé'
            }
        
        # Analyser les patterns historiques
        infractions = CriminalInfraction.objects.filter(
            fiche_criminelle=criminel
        ).order_by('-date_infraction')
        
        if infractions.count() < 2:
            return {
                'success': False,
                'message': 'Historique insuffisant pour prédiction'
            }
        
        # Analyser les types d'infractions
        types_frequents = infractions.values('type_infraction').annotate(
            count=Count('id')
        ).order_by('-count')
        
        type_plus_frequent = types_frequents[0] if types_frequents else None
        
        # Analyser les intervalles temporels
        dates = [inf.date_infraction for inf in infractions[:10]]
        if len(dates) > 1:
            intervalles = []
            for i in range(len(dates) - 1):
                delta = (dates[i] - dates[i+1]).days
                intervalles.append(delta)
            
            intervalle_moyen = np.mean(intervalles) if intervalles else 0
            prochaine_date_estimee = dates[0] + timedelta(days=intervalle_moyen)
        else:
            intervalle_moyen = 0
            prochaine_date_estimee = None
        
        # Niveau de dangerosité actuel
        niveau_danger = criminel.niveau_dangerosite
        
        return {
            'success': True,
            'criminel_id': criminel_id,
            'type_probable': type_plus_frequent['type_infraction'] if type_plus_frequent else 'Inconnu',
            'confiance_type': round((type_plus_frequent['count'] / infractions.count() * 100), 2) if type_plus_frequent else 0,
            'intervalle_moyen_jours': round(intervalle_moyen, 1),
            'date_estimee_prochaine_action': prochaine_date_estimee.isoformat() if prochaine_date_estimee else None,
            'niveau_dangerosite': niveau_danger,
            'urgence': 'haute' if niveau_danger in ['tres_eleve', 'extreme'] else 'moyenne' if niveau_danger == 'eleve' else 'faible'
        }
    
    def suggerer_pistes_recherche(self, criminel_id: int) -> Dict[str, Any]:
        """
        Suggère des pistes pour retrouver un criminel
        
        Args:
            criminel_id: ID du criminel recherché
            
        Returns:
            Liste de pistes et recommandations
        """
        from criminel.models import CriminalFicheCriminelle
        
        try:
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        except CriminalFicheCriminelle.DoesNotExist:
            return {
                'success': False,
                'erreur': 'Criminel non trouvé'
            }
        
        pistes = []
        
        # 1. Piste géographique
        prediction_zone = self.predire_zone_probable(criminel_id)
        if prediction_zone.get('success'):
            pistes.append({
                'type': 'geographique',
                'priorite': 'haute',
                'description': 'Surveiller les zones habituelles',
                'details': prediction_zone.get('zones_probables', [])
            })
        
        # 2. Piste via associés
        from criminel.models import CriminalAssociation
        
        associations = CriminalAssociation.objects.filter(
            Q(criminel_principal=criminel) | Q(criminel_associe=criminel),
            est_active=True,
            niveau_confiance__gte=50
        )
        
        if associations.exists():
            associes = []
            for assoc in associations:
                autre = assoc.criminel_associe if assoc.criminel_principal == criminel else assoc.criminel_principal
                associes.append({
                    'nom': f"{autre.nom} {autre.prenom}",
                    'id': autre.id,
                    'type_lien': assoc.type_association,
                    'confiance': assoc.niveau_confiance
                })
            
            pistes.append({
                'type': 'reseau',
                'priorite': 'haute',
                'description': 'Surveiller les associés connus',
                'details': associes
            })
        
        # 3. Piste biométrique
        from biometrie.models import BiometriePhoto
        
        photos = BiometriePhoto.objects.filter(
            criminel=criminel,
            est_active=True,
            encodage_facial__isnull=False
        )
        
        if photos.exists():
            pistes.append({
                'type': 'biometrique',
                'priorite': 'moyenne',
                'description': 'Reconnaissance faciale disponible',
                'details': {
                    'nombre_photos': photos.count(),
                    'reconnaissance_faciale': 'activee',
                    'qualite_moyenne': round(photos.aggregate(Avg('qualite'))['qualite__avg'] or 0, 1)
                }
            })
        
        # 4. Piste temporelle
        prediction_action = self.predire_prochaine_action(criminel_id)
        if prediction_action.get('success'):
            pistes.append({
                'type': 'temporelle',
                'priorite': 'moyenne',
                'description': 'Prédiction de la prochaine action',
                'details': {
                    'type_probable': prediction_action.get('type_probable'),
                    'date_estimee': prediction_action.get('date_estimee_prochaine_action'),
                    'urgence': prediction_action.get('urgence')
                }
            })
        
        # 5. Piste sur les lieux fréquentés
        if criminel.lieu_habitation:
            pistes.append({
                'type': 'domicile',
                'priorite': 'haute',
                'description': 'Vérifier le domicile connu',
                'details': {
                    'adresse': criminel.lieu_habitation
                }
            })
        
        return {
            'success': True,
            'criminel_id': criminel_id,
            'nom_complet': f"{criminel.nom} {criminel.prenom}",
            'nombre_pistes': len(pistes),
            'pistes': pistes,
            'priorite_generale': 'haute' if criminel.niveau_dangerosite in ['tres_eleve', 'extreme'] else 'moyenne'
        }
    
    def identifier_criminels_similaires(self, criminel_id: int, limite: int = 5) -> Dict[str, Any]:
        """
        Identifie des criminels avec un profil similaire
        
        Args:
            criminel_id: ID du criminel de référence
            limite: Nombre max de résultats
            
        Returns:
            Liste de criminels similaires
        """
        from criminel.models import CriminalFicheCriminelle, CriminalInfraction
        
        try:
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        except CriminalFicheCriminelle.DoesNotExist:
            return {
                'success': False,
                'erreur': 'Criminel non trouvé'
            }
        
        # Critères de similarité
        criminels_similaires = []
        
        tous_criminels = CriminalFicheCriminelle.objects.exclude(id=criminel_id)
        
        for autre in tous_criminels:
            score_similarite = 0
            raisons = []
            
            # 1. Même niveau de dangerosité
            if autre.niveau_dangerosite == criminel.niveau_dangerosite:
                score_similarite += 20
                raisons.append('Même niveau de dangerosité')
            
            # 2. Types d'infractions similaires
            infractions_ref = set(CriminalInfraction.objects.filter(
                fiche_criminelle=criminel
            ).values_list('type_infraction', flat=True))
            
            infractions_autre = set(CriminalInfraction.objects.filter(
                fiche_criminelle=autre
            ).values_list('type_infraction', flat=True))
            
            intersection = infractions_ref & infractions_autre
            if intersection:
                score_similarite += len(intersection) * 15
                raisons.append(f'{len(intersection)} types d\'infractions en commun')
            
            if criminel.date_naissance and autre.date_naissance:
                age_criminel = (timezone.now().date() - criminel.date_naissance).days // 365
                age_autre = (timezone.now().date() - autre.date_naissance).days // 365
                
                if abs(age_criminel - age_autre) <= 5:
                    score_similarite += 10
                    raisons.append('Âge similaire')
            
            # 4. Même sexe
            if autre.sexe == criminel.sexe:
                score_similarite += 5
            
            if score_similarite >= 30:  # Seuil minimum
                criminels_similaires.append({
                    'id': autre.id,
                    'nom': f"{autre.nom} {autre.prenom}",
                    'score_similarite': score_similarite,
                    'raisons': raisons,
                    'niveau_dangerosite': autre.niveau_dangerosite
                })
        
        # Trier par score
        criminels_similaires.sort(key=lambda x: x['score_similarite'], reverse=True)
        
        return {
            'success': True,
            'criminel_reference': f"{criminel.nom} {criminel.prenom}",
            'criminels_similaires': criminels_similaires[:limite],
            'total_trouves': len(criminels_similaires)
        }

