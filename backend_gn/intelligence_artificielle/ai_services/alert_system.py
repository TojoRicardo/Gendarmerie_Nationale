"""
Système d'Alerte Automatique Intelligent
=========================================

Module pour générer et gérer des alertes automatiques
basées sur l'analyse IA des comportements criminels.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count


class AlertSystemService:
    """
    Service pour le système d'alertes automatiques
    
    Génère des alertes basées sur:
    - Détection de patterns suspects
    - Risques élevés
    - Comportements anormaux
    - Correspondances biométriques
    """
    
    # Niveaux d'alerte
    NIVEAU_INFO = 'info'
    NIVEAU_AVERTISSEMENT = 'avertissement'
    NIVEAU_URGENT = 'urgent'
    NIVEAU_CRITIQUE = 'critique'
    
    def __init__(self):
        self.seuil_risque_eleve = 70  # Score de risque > 70 = alerte
        self.seuil_similarite_biometrique = 0.85
    
    def generer_alerte_risque_recidive(self, criminel_id: int) -> Optional[Dict[str, Any]]:
        """
        Génère une alerte si le risque de récidive est élevé
        
        Args:
            criminel_id: ID du criminel à analyser
            
        Returns:
            Alerte ou None
        """
        from criminel.models import CriminalFicheCriminelle, CriminalInfraction
        from ..ai_services.analyse_predictive import AnalysePredictiveService
        
        try:
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        except CriminalFicheCriminelle.DoesNotExist:
            return None
        
        # Analyser le risque
        service_prediction = AnalysePredictiveService()
        prediction = service_prediction.predire_risque_recidive(criminel)
        
        if not prediction.get('success'):
            return None
        
        risque_score = prediction.get('risque_recidive', 0)
        
        # Générer l'alerte si risque élevé
        if risque_score >= self.seuil_risque_eleve:
            niveau = self.NIVEAU_CRITIQUE if risque_score > 85 else self.NIVEAU_URGENT
            
            return {
                'type': 'risque_recidive',
                'niveau': niveau,
                'criminel_id': criminel_id,
                'criminel_nom': f"{criminel.nom} {criminel.prenom}",
                'score_risque': risque_score,
                'niveau_risque': prediction.get('niveau_risque'),
                'facteurs': prediction.get('facteurs', []),
                'message': f"Risque de récidive élevé ({risque_score}%) pour {criminel.nom} {criminel.prenom}",
                'date_generation': timezone.now().isoformat(),
                'recommandations': prediction.get('recommandations', [])
            }
        
        return None
    
    def generer_alerte_pattern_suspect(self) -> List[Dict[str, Any]]:
        """
        Détecte et génère des alertes pour les patterns suspects
        
        Returns:
            Liste d'alertes de patterns suspects
        """
        from criminel.models import CriminalInfraction
        
        alertes = []
        date_limite = timezone.now() - timedelta(days=30)
        
        # Pattern 1: Multiple infractions dans la même zone
        infractions_recentes = CriminalInfraction.objects.filter(
            date_infraction__gte=date_limite
        )
        
        lieux_suspects = infractions_recentes.values('lieu_infraction').annotate(
            count=Count('id')
        ).filter(count__gte=5).order_by('-count')
        
        for lieu in lieux_suspects:
            alertes.append({
                'type': 'pattern_geographique',
                'niveau': self.NIVEAU_AVERTISSEMENT,
                'zone': lieu['lieu_infraction'],
                'nombre_infractions': lieu['count'],
                'periode': '30 derniers jours',
                'message': f"Zone à risque détectée: {lieu['lieu_infraction']} ({lieu['count']} infractions)",
                'date_generation': timezone.now().isoformat(),
                'recommandations': [
                    'Augmenter la surveillance dans cette zone',
                    'Analyser les patterns temporels',
                    'Identifier les criminels actifs dans la zone'
                ]
            })
        
        # Pattern 2: Pics d'activité criminelle
        infractions_par_jour = {}
        for infraction in infractions_recentes:
            jour = infraction.date_infraction.strftime('%Y-%m-%d')
            infractions_par_jour[jour] = infractions_par_jour.get(jour, 0) + 1
        
        if infractions_par_jour:
            moyenne = sum(infractions_par_jour.values()) / len(infractions_par_jour)
            seuil_pic = moyenne * 2
            
            for jour, count in infractions_par_jour.items():
                if count >= seuil_pic:
                    alertes.append({
                        'type': 'pic_activite',
                        'niveau': self.NIVEAU_URGENT,
                        'date': jour,
                        'nombre_infractions': count,
                        'moyenne': round(moyenne, 2),
                        'message': f"Pic d'activité criminelle détecté le {jour} ({count} infractions)",
                        'date_generation': timezone.now().isoformat(),
                        'recommandations': [
                            'Analyser les infractions du jour',
                            'Identifier les causes possibles',
                            'Renforcer la surveillance'
                        ]
                    })
        
        return alertes
    
    def generer_alerte_association_dangereuse(self) -> List[Dict[str, Any]]:
        """
        Détecte les associations criminelles dangereuses
        
        Returns:
            Liste d'alertes pour associations dangereuses
        """
        from criminel.models import CriminalAssociation, CriminalFicheCriminelle
        
        alertes = []
        
        # Associations avec niveau de confiance élevé et criminels dangereux
        associations = CriminalAssociation.objects.filter(
            est_active=True,
            niveau_confiance__gte=70
        ).select_related('criminel_principal', 'criminel_associe')
        
        for assoc in associations:
            # Vérifier si au moins un des criminels est très dangereux
            niveau_principal = assoc.criminel_principal.niveau_dangerosite
            niveau_associe = assoc.criminel_associe.niveau_dangerosite
            
            niveaux_dangereux = ['tres_eleve', 'extreme']
            
            if niveau_principal in niveaux_dangereux or niveau_associe in niveaux_dangereux:
                alertes.append({
                    'type': 'association_dangereuse',
                    'niveau': self.NIVEAU_URGENT,
                    'criminel_principal': {
                        'id': assoc.criminel_principal.id,
                        'nom': f"{assoc.criminel_principal.nom} {assoc.criminel_principal.prenom}",
                        'dangerosite': niveau_principal
                    },
                    'criminel_associe': {
                        'id': assoc.criminel_associe.id,
                        'nom': f"{assoc.criminel_associe.nom} {assoc.criminel_associe.prenom}",
                        'dangerosite': niveau_associe
                    },
                    'type_association': assoc.type_association,
                    'niveau_confiance': assoc.niveau_confiance,
                    'message': f"Association dangereuse détectée entre {assoc.criminel_principal.nom} et {assoc.criminel_associe.nom}",
                    'date_generation': timezone.now().isoformat(),
                    'recommandations': [
                        'Surveiller les deux criminels',
                        'Analyser leurs activités récentes',
                        'Identifier d\'autres membres potentiels du réseau'
                    ]
                })
        
        return alertes
    
    def generer_alerte_correspondance_biometrique(self, 
                                                  criminel_id: int,
                                                  score_correspondance: float) -> Optional[Dict[str, Any]]:
        """
        Génère une alerte pour une correspondance biométrique
        
        Args:
            criminel_id: ID du criminel identifié
            score_correspondance: Score de la correspondance
            
        Returns:
            Alerte ou None
        """
        from criminel.models import CriminalFicheCriminelle
        
        if score_correspondance < self.seuil_similarite_biometrique:
            return None
        
        try:
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        except CriminalFicheCriminelle.DoesNotExist:
            return None
        
        niveau = self.NIVEAU_CRITIQUE if score_correspondance > 0.95 else self.NIVEAU_URGENT
        
        return {
            'type': 'correspondance_biometrique',
            'niveau': niveau,
            'criminel_id': criminel_id,
            'criminel_nom': f"{criminel.nom} {criminel.prenom}",
            'score_correspondance': round(score_correspondance * 100, 2),
            'niveau_dangerosite': criminel.niveau_dangerosite,
            'message': f"Correspondance biométrique ({score_correspondance*100:.1f}%) : {criminel.nom} {criminel.prenom}",
            'date_generation': timezone.now().isoformat(),
            'recommandations': [
                'Vérifier la localisation actuelle',
                'Consulter le dossier complet',
                'Alerter les unités de terrain si nécessaire'
            ]
        }
    
    def generer_alerte_comportement_anormal(self, criminel_id: int) -> Optional[Dict[str, Any]]:
        """
        Détecte un comportement anormal pour un criminel
        
        Args:
            criminel_id: ID du criminel
            
        Returns:
            Alerte ou None
        """
        from criminel.models import CriminalFicheCriminelle, CriminalInfraction
        
        try:
            criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        except CriminalFicheCriminelle.DoesNotExist:
            return None
        
        # Analyser l'historique
        infractions = CriminalInfraction.objects.filter(
            fiche_criminelle=criminel
        ).order_by('-date_infraction')
        
        if infractions.count() < 3:
            return None  # Pas assez de données
        
        # Comportement anormal : infractions récentes après longue inactivité
        derniere = infractions.first()
        avant_derniere = infractions[1] if infractions.count() > 1 else None
        
        if avant_derniere:
            delta = (derniere.date_infraction - avant_derniere.date_infraction).days
            
            # Si plus de 1 an d'inactivité puis nouvelle infraction
            if delta > 365:
                return {
                    'type': 'comportement_anormal',
                    'niveau': self.NIVEAU_AVERTISSEMENT,
                    'criminel_id': criminel_id,
                    'criminel_nom': f"{criminel.nom} {criminel.prenom}",
                    'anomalie': 'reprise_activite',
                    'periode_inactivite_jours': delta,
                    'derniere_infraction': derniere.date_infraction.isoformat(),
                    'message': f"Reprise d'activité après {delta} jours d'inactivité pour {criminel.nom} {criminel.prenom}",
                    'date_generation': timezone.now().isoformat(),
                    'recommandations': [
                        'Analyser les circonstances de la reprise',
                        'Vérifier les nouvelles associations',
                        'Évaluer le nouveau niveau de risque'
                    ]
                }
        
        return None
    
    def generer_alertes_automatiques(self) -> Dict[str, Any]:
        """
        Génère toutes les alertes automatiques
        
        Returns:
            Toutes les alertes groupées par type et niveau
        """
        from criminel.models import CriminalFicheCriminelle
        
        toutes_alertes = {
            'critique': [],
            'urgent': [],
            'avertissement': [],
            'info': []
        }
        
        # 1. Alertes de risque de récidive
        criminels = CriminalFicheCriminelle.objects.all()
        
        for criminel in criminels[:50]:  # Limiter pour performance
            alerte = self.generer_alerte_risque_recidive(criminel.id)
            if alerte:
                toutes_alertes[alerte['niveau']].append(alerte)
        
        # 2. Alertes de patterns suspects
        alertes_patterns = self.generer_alerte_pattern_suspect()
        for alerte in alertes_patterns:
            toutes_alertes[alerte['niveau']].append(alerte)
        
        # 3. Alertes d'associations dangereuses
        alertes_assoc = self.generer_alerte_association_dangereuse()
        for alerte in alertes_assoc:
            toutes_alertes[alerte['niveau']].append(alerte)
        
        # 4. Alertes de comportements anormaux
        for criminel in criminels[:30]:  # Limiter pour performance
            alerte = self.generer_alerte_comportement_anormal(criminel.id)
            if alerte:
                toutes_alertes[alerte['niveau']].append(alerte)
        
        # Statistiques
        total_alertes = sum(len(alertes) for alertes in toutes_alertes.values())
        
        return {
            'success': True,
            'date_generation': timezone.now().isoformat(),
            'alertes': toutes_alertes,
            'statistiques': {
                'total': total_alertes,
                'critiques': len(toutes_alertes['critique']),
                'urgents': len(toutes_alertes['urgent']),
                'avertissements': len(toutes_alertes['avertissement']),
                'info': len(toutes_alertes['info'])
            }
        }
    
    def obtenir_alertes_criminel(self, criminel_id: int) -> Dict[str, Any]:
        """
        Obtient toutes les alertes concernant un criminel spécifique
        
        Args:
            criminel_id: ID du criminel
            
        Returns:
            Alertes pour ce criminel
        """
        alertes = []
        
        # Alerte risque récidive
        alerte_recidive = self.generer_alerte_risque_recidive(criminel_id)
        if alerte_recidive:
            alertes.append(alerte_recidive)
        
        # Alerte comportement anormal
        alerte_comportement = self.generer_alerte_comportement_anormal(criminel_id)
        if alerte_comportement:
            alertes.append(alerte_comportement)
        
        # Trier par niveau de priorité
        ordre_priorite = {
            'critique': 0,
            'urgent': 1,
            'avertissement': 2,
            'info': 3
        }
        
        alertes.sort(key=lambda x: ordre_priorite.get(x['niveau'], 999))
        
        return {
            'success': True,
            'criminel_id': criminel_id,
            'nombre_alertes': len(alertes),
            'alertes': alertes
        }
    
    def marquer_alerte_traitee(self, alerte_id: str) -> Dict[str, Any]:
        """
        Marque une alerte comme traitée
        
        Args:
            alerte_id: ID de l'alerte
            
        Returns:
            Confirmation
        """
        # TODO: Implémenter la persistance des alertes dans la BD
        return {
            'success': True,
            'alerte_id': alerte_id,
            'statut': 'traitee',
            'date_traitement': timezone.now().isoformat()
        }
    
    def obtenir_statistiques_alertes(self, periode_jours: int = 30) -> Dict[str, Any]:
        """
        Obtient les statistiques des alertes générées
        
        Args:
            periode_jours: Période d'analyse
            
        Returns:
            Statistiques des alertes
        """
        # Générer les alertes actuelles
        alertes_actuelles = self.generer_alertes_automatiques()
        
        return {
            'success': True,
            'periode': f'{periode_jours} jours',
            'statistiques': alertes_actuelles['statistiques'],
            'repartition_par_type': {
                'risque_recidive': len([a for niveau in alertes_actuelles['alertes'].values() 
                                       for a in niveau if a['type'] == 'risque_recidive']),
                'pattern_suspect': len([a for niveau in alertes_actuelles['alertes'].values() 
                                       for a in niveau if a['type'] in ['pattern_geographique', 'pic_activite']]),
                'association_dangereuse': len([a for niveau in alertes_actuelles['alertes'].values() 
                                               for a in niveau if a['type'] == 'association_dangereuse']),
                'comportement_anormal': len([a for niveau in alertes_actuelles['alertes'].values() 
                                            for a in niveau if a['type'] == 'comportement_anormal'])
            }
        }

