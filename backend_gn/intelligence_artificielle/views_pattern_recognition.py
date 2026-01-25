"""
Vues API pour la reconnaissance de patterns et prédictions IA
avec support des bounding boxes et points faciaux
"""

import logging
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db import transaction
from django.core.files.base import ContentFile

from .models import (
    IACaseAnalysis, IAModelTraining,
    RechercheIA
)
from .ai_services.analyse_predictive import AnalysePredictiveService
from biometrie.arcface_service import ArcFaceService
from biometrie.models import Biometrie
from criminel.models import CriminalFicheCriminelle

logger = logging.getLogger(__name__)


class CaseAnalysisAPIView(APIView):
    """
    API pour l'analyse prédictive de dossiers criminels
    POST /api/ia/case-analysis/analyze/
    GET /api/ia/case-analysis/?fiche_id=<id>
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def post(self, request):
        """
        Analyse un dossier criminel pour prédire les comportements futurs
        
        Body (JSON):
            - fiche_id: ID de la fiche criminelle (requis)
            - type_analyse: Type d'analyse ('complet', 'recidive', 'dangerosite', etc.)
        """
        try:
            # Vérifier les permissions
            user_role = getattr(request.user, 'role', None)
            allowed_roles = {'admin', 'enqueteur', 'analyste', 'Administrateur Système',
                           'Enquêteur Principal', 'Analyste'}
            if user_role not in allowed_roles:
                return Response(
                    {
                        'success': False,
                        'message': 'Vous n\'êtes pas autorisé à utiliser cette fonctionnalité.'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            fiche_id = request.data.get('fiche_id')
            numero_fiche = request.data.get('numero_fiche')
            type_analyse = request.data.get('type_analyse', 'complet')
            
            if numero_fiche:
                numero_fiche = str(numero_fiche).strip()
            
            if not fiche_id and not numero_fiche:
                return Response(
                    {
                        'success': False,
                        'message': 'ID ou numéro de fiche criminelle requis'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                if numero_fiche:
                    # Essayer d'abord la recherche exacte
                    try:
                        fiche = CriminalFicheCriminelle.objects.get(numero_fiche=numero_fiche)
                        logger.info(f"Fiche trouvée par numéro exact: {numero_fiche}, ID: {fiche.id}")
                    except CriminalFicheCriminelle.DoesNotExist:
                        if numero_fiche.isdigit() and len(numero_fiche) <= 3:
                            numero_seq = numero_fiche.zfill(3)
                            # Essayer avec le format complet "XXX-CIE/2-RJ"
                            numero_complet = f"{numero_seq}-CIE/2-RJ"
                            try:
                                fiche = CriminalFicheCriminelle.objects.get(numero_fiche=numero_complet)
                                logger.info(f"Fiche trouvée avec format complété: {numero_complet}, ID: {fiche.id}")
                            except CriminalFicheCriminelle.DoesNotExist:
                                # Essayer une recherche qui commence par ce numéro
                                fiches = CriminalFicheCriminelle.objects.filter(numero_fiche__startswith=numero_seq)
                                if fiches.count() == 1:
                                    fiche = fiches.first()
                                    logger.info(f"Fiche trouvée par recherche partielle: {fiche.numero_fiche}, ID: {fiche.id}")
                                elif fiches.count() > 1:
                                    # Si plusieurs résultats, essayer avec le format complet
                                    fiches_format = fiches.filter(numero_fiche=numero_complet)
                                    if fiches_format.exists():
                                        fiche = fiches_format.first()
                                        logger.info(f"Fiche trouvée parmi plusieurs résultats: {fiche.numero_fiche}, ID: {fiche.id}")
                                    else:
                                        raise CriminalFicheCriminelle.DoesNotExist()
                                else:
                                    raise CriminalFicheCriminelle.DoesNotExist()
                        else:
                            # Si ce n'est pas un simple nombre, essayer une recherche partielle
                            fiches = CriminalFicheCriminelle.objects.filter(numero_fiche__icontains=numero_fiche)
                            if fiches.count() == 1:
                                fiche = fiches.first()
                                logger.info(f"Fiche trouvée par recherche partielle: {fiche.numero_fiche}, ID: {fiche.id}")
                            elif fiches.count() > 1:
                                # Plusieurs résultats - essayer une correspondance plus précise
                                fiches_exacts = fiches.filter(numero_fiche__iexact=numero_fiche)
                                if fiches_exacts.exists():
                                    fiche = fiches_exacts.first()
                                    logger.info(f"Fiche trouvée parmi plusieurs résultats: {fiche.numero_fiche}, ID: {fiche.id}")
                                else:
                                    raise CriminalFicheCriminelle.MultipleObjectsReturned()
                            else:
                                raise CriminalFicheCriminelle.DoesNotExist()
                else:
                    fiche = CriminalFicheCriminelle.objects.get(id=fiche_id)
                    logger.info(f"Fiche trouvée par ID: {fiche_id}")
            except CriminalFicheCriminelle.DoesNotExist:
                logger.warning(f"Fiche non trouvée - ID: {fiche_id}, Numéro: {numero_fiche}")
                return Response(
                    {
                        'success': False,
                        'message': f'Fiche criminelle introuvable (Numéro: {numero_fiche or fiche_id}). Format attendu: XXX-CIE/2-RJ (ex: 003-CIE/2-RJ)'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            except CriminalFicheCriminelle.MultipleObjectsReturned:
                logger.error(f"Plusieurs fiches trouvées avec le numéro: {numero_fiche}")
                return Response(
                    {
                        'success': False,
                        'message': f'Plusieurs fiches trouvées avec ce numéro "{numero_fiche}". Veuillez être plus précis (format: XXX-CIE/2-RJ)'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Erreur lors de la récupération de la fiche: {str(e)}", exc_info=True)
                return Response(
                    {
                        'success': False,
                        'message': f'Erreur lors de la récupération de la fiche: {str(e)}'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Initialiser le service d'analyse prédictive
            try:
                predictive_service = AnalysePredictiveService()
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du service d'analyse: {str(e)}", exc_info=True)
                return Response(
                    {
                        'success': False,
                        'message': f'Erreur lors de l\'initialisation du service d\'analyse: {str(e)}'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Effectuer l'analyse selon le type
            resultats = {}
            score_risque_global = 0.0
            scores_confiance = []  # Liste pour collecter tous les scores de confiance
            liens_detectes = []
            recommandations = []
            features_utilisees = []
            
            # Extraire les features pour calculer la confiance globale
            try:
                features = predictive_service._extraire_features_criminel(fiche)
            except Exception as e:
                logger.error(f"Erreur lors de l'extraction des features: {str(e)}", exc_info=True)
                features = {}
            
            try:
                if type_analyse in ['complet', 'recidive']:
                    pred_recidive = predictive_service.predire_risque_recidive(fiche)
                    if pred_recidive.get('success'):
                        resultats['recidive'] = pred_recidive
                        score_risque_global = max(score_risque_global, pred_recidive.get('risque_recidive', 0))
                        recommandations.extend(pred_recidive.get('recommandations', []))
                        # Utiliser le score de confiance de la prédiction
                        if 'confiance_prediction' in pred_recidive:
                            scores_confiance.append(pred_recidive['confiance_prediction'])
                
                if type_analyse in ['complet', 'dangerosite']:
                    pred_dangerosite = predictive_service.predire_profil_dangerosite(fiche)
                    if pred_dangerosite.get('success'):
                        resultats['dangerosite'] = pred_dangerosite
                        score_risque_global = max(score_risque_global, pred_dangerosite.get('score_global', 0))
                        # Calculer confiance basée sur le nombre d'infractions analysées
                        nb_infractions = pred_dangerosite.get('nb_infractions_analysees', 0)
                        confiance_danger = 60 + min(nb_infractions * 3, 30)
                        scores_confiance.append(confiance_danger)
                
                if type_analyse in ['complet', 'zones_risque']:
                    pred_zones = predictive_service.predire_zone_risque(fiche)
                    if pred_zones.get('success'):
                        resultats['zones_risque'] = pred_zones
                        # Confiance basée sur le nombre de lieux analysés
                        nb_lieux = pred_zones.get('nb_lieux_analyses', 0)
                        confiance_zones = 50 + min(nb_lieux * 5, 40)
                        scores_confiance.append(confiance_zones)
                
                if type_analyse in ['complet', 'associations']:
                    pred_associations = predictive_service.predire_association_criminelle(fiche)
                    if pred_associations.get('success'):
                        resultats['associations'] = pred_associations
                        liens_detectes = pred_associations.get('associations', [])
                        # Confiance basée sur le nombre d'associations trouvées
                        nb_associations = pred_associations.get('nb_associations', 0)
                        confiance_assoc = 55 + min(nb_associations * 2, 35)
                        scores_confiance.append(confiance_assoc)
            except Exception as e:
                logger.error(f"Erreur lors de l'exécution de l'analyse prédictive: {str(e)}", exc_info=True)
                return Response(
                    {
                        'success': False,
                        'message': f'Erreur lors de l\'analyse prédictive: {str(e)}'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Calculer le score de confiance global basé sur les données réelles
            if scores_confiance:
                # Moyenne pondérée des scores de confiance
                score_confiance = sum(scores_confiance) / len(scores_confiance)
            else:
                # Fallback: calculer la confiance basée sur les features disponibles
                score_confiance = predictive_service._calculer_confiance(features)
            
            # Extraire les features utilisées
            features_utilisees = [
                'nb_infractions',
                'niveau_danger',
                'antecedents',
                'age',
                'historique_geographique'
            ]
            
            # Créer l'analyse
            case_analysis = IACaseAnalysis.objects.create(
                fiche_criminelle=fiche,
                type_analyse=type_analyse,
                resultats=resultats,
                score_risque_global=score_risque_global,
                score_confiance=score_confiance,
                liens_detectes=liens_detectes,
                recommandations=recommandations,
                features_utilisees=features_utilisees,
                analyse_par=request.user
            )
            
            return Response(
                {
                    'success': True,
                    'message': 'Analyse terminée avec succès',
                    'analysis_id': case_analysis.id,
                    'uuid': str(case_analysis.uuid),
                    'resultats': resultats,
                    'score_risque_global': score_risque_global,
                    'score_confiance': score_confiance,
                    'liens_detectes': liens_detectes,
                    'recommandations': recommandations,
                    'timestamp': timezone.now().isoformat()
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.exception(f"Erreur lors de l'analyse de dossier: {e}")
            return Response(
                {
                    'success': False,
                    'message': 'Erreur lors de l\'analyse',
                    'error': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get(self, request):
        """
        Récupère les analyses existantes
        
        Query params:
            - fiche_id: Filtrer par ID de fiche criminelle
            - numero_fiche: Filtrer par numéro de fiche criminelle
            - type_analyse: Filtrer par type d'analyse
        """
        try:
            queryset = IACaseAnalysis.objects.all()
            
            fiche_id = request.query_params.get('fiche_id')
            numero_fiche = request.query_params.get('numero_fiche')
            
            if numero_fiche:
                try:
                    fiche = CriminalFicheCriminelle.objects.get(numero_fiche=numero_fiche)
                    queryset = queryset.filter(fiche_criminelle_id=fiche.id)
                except CriminalFicheCriminelle.DoesNotExist:
                    queryset = queryset.none()
            elif fiche_id:
                queryset = queryset.filter(fiche_criminelle_id=fiche_id)
            
            type_analyse = request.query_params.get('type_analyse')
            if type_analyse:
                queryset = queryset.filter(type_analyse=type_analyse)
            
            analyses = queryset.order_by('-date_analyse')[:20]
            
            resultats = []
            for analysis in analyses:
                resultats.append({
                    'id': analysis.id,
                    'uuid': str(analysis.uuid),
                    'fiche_id': analysis.fiche_criminelle.id,
                    'numero_fiche': analysis.fiche_criminelle.numero_fiche,
                    'type_analyse': analysis.type_analyse,
                    'score_risque_global': analysis.score_risque_global,
                    'score_confiance': analysis.score_confiance,
                    'date_analyse': analysis.date_analyse.isoformat(),
                    'resultats': analysis.resultats,
                    'liens_detectes': analysis.liens_detectes,
                    'recommandations': analysis.recommandations
                })
            
            return Response(
                {
                    'success': True,
                    'count': len(resultats),
                    'analyses': resultats
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.exception(f"Erreur lors de la récupération des analyses: {e}")
            return Response(
                {
                    'success': False,
                    'message': 'Erreur lors de la récupération des analyses',
                    'error': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )




class ModelTrainingAPIView(APIView):
    """
    API pour entraîner/mettre à jour les modèles IA
    POST /api/ia/model-training/train/
    GET /api/ia/model-training/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def post(self, request):
        """
        Lance un entraînement de modèle
        
        Body (JSON):
            - nom_modele: Nom du modèle
            - type_modele: Type ('prediction', 'face_recognition', 'risk_assessment', etc.)
            - parametres: Paramètres d'entraînement
        """
        # Seuls les admins peuvent entraîner les modèles
        user_role = getattr(request.user, 'role', None)
        if user_role not in {'admin', 'Administrateur Système'}:
            return Response(
                {
                    'success': False,
                    'message': 'Seuls les administrateurs peuvent entraîner les modèles'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        nom_modele = request.data.get('nom_modele')
        type_modele = request.data.get('type_modele')
        parametres = request.data.get('parametres', {})
        
        if not nom_modele or not type_modele:
            return Response(
                {
                    'success': False,
                    'message': 'Nom et type de modèle requis'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer l'enregistrement d'entraînement
        training = IAModelTraining.objects.create(
            nom_modele=nom_modele,
            type_modele=type_modele,
            parametres_entrainement=parametres,
            date_debut=timezone.now(),
            statut='en_cours',
            entraine_par=request.user
        )
        
        # Pour l'instant, on retourne juste l'enregistrement
        
        return Response(
            {
                'success': True,
                'message': 'Entraînement lancé',
                'training_id': training.id,
                'uuid': str(training.uuid)
            },
            status=status.HTTP_200_OK
        )
    
    def get(self, request):
        """Récupère l'historique des entraînements"""
        trainings = IAModelTraining.objects.order_by('-date_debut')[:20]
        
        resultats = []
        for training in trainings:
            resultats.append({
                'id': training.id,
                'uuid': str(training.uuid),
                'nom_modele': training.nom_modele,
                'type_modele': training.type_modele,
                'version': training.version,
                'statut': training.statut,
                'metriques': training.metriques,
                'date_debut': training.date_debut.isoformat(),
                'date_fin': training.date_fin.isoformat() if training.date_fin else None
            })
        
        return Response(
            {
                'success': True,
                'count': len(resultats),
                'trainings': resultats
            },
            status=status.HTTP_200_OK
        )

