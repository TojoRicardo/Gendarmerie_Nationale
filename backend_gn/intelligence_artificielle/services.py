"""
Fichier de services centralisé pour l'Intelligence Artificielle
Fonctions principales pour analyse prédictive et corrélations

La reconnaissance faciale utilise ArcFace via le module Biometrie.
"""

from .ai_services.analyse_predictive import AnalysePredictiveService
from .ai_services.pattern_correlation import PatternCorrelationService
from .ai_services.analyse_statistique import AnalyseStatistiqueService
from .ai_services.prediction_recherche import PredictionRechercheService
from .ai_services.matching_intelligent import MatchingIntelligentService
from .ai_services.alert_system import AlertSystemService
from .ia_service import (
    FaceRecognitionIAService,
    FaceRecognitionUnavailable,
    example_compare_embeddings,
    example_identification_flow,
)
from .models import (
    IAReconnaissanceFaciale,
    IAFaceEmbedding,
    IAPrediction,
    IAPattern,
    IACorrelation,
)
from criminel.models import CriminalFicheCriminelle
from biometrie.arcface_service import ArcFaceService
from typing import Optional


# Instances globales des services
predictive_service = AnalysePredictiveService()
correlation_service = PatternCorrelationService()
statistique_service = AnalyseStatistiqueService()
prediction_recherche_service = PredictionRechercheService()
matching_service = MatchingIntelligentService()
alert_service = AlertSystemService()

_face_service: Optional[FaceRecognitionIAService] = None
_face_service_error: Optional[str] = None


def _get_face_service() -> Optional[FaceRecognitionIAService]:
    global _face_service, _face_service_error
    if _face_service is not None:
        return _face_service

    if _face_service_error:
        return None

    try:
        _face_service = FaceRecognitionIAService()
    except FaceRecognitionUnavailable as exc:
        _face_service_error = str(exc)
        return None
    except Exception as exc:  # pragma: no cover - protection runtime
        _face_service_error = str(exc)
        return None

    return _face_service


def analyser_visage(
    criminel_id=None,
    image_file=None,
    image_path=None,
    *,
    threshold: Optional[float] = None,
    save_embedding: bool = False,
    persist_result: bool = True,
    criminel=None,
):
    """
    Fonction centralisée pour analyser un visage
    
    Utilise le service ArcFace pour la reconnaissance faciale.
    
    Args:
        criminel_id: ID optionnel du criminel pour comparaison ciblée
        image_file: Fichier image uploadé (Django UploadedFile)
        image_path: Chemin vers une image locale
        
    Returns:
        dict: Résultats de l'analyse
    """
    face_service = _get_face_service()
    if face_service is None:
        error_message = _face_service_error or "ArcFace n'est pas disponible. Vérifiez l'installation InsightFace."
        return {
            'success': False,
            'message': 'Erreur du modèle ArcFace',
            'error': error_message,
            'details': "Impossible de charger InsightFace (modèle non trouvé).",
            'error_code': 'ARCFACE_UNAVAILABLE',
        }

    image_source = image_file or image_path
    if image_source is None:
        return {
            'success': False,
            'error': "Paramètres manquants: image_file ou image_path requis",
        }

    criminel_obj = criminel
    if criminel_obj is None and criminel_id is not None:
        criminel_obj = CriminalFicheCriminelle.objects.filter(id=criminel_id).first()

    return face_service.search_by_photo(
        image=image_source,
        criminel=criminel_obj,
        criminel_id=criminel_id,
        save_embedding=save_embedding or bool(criminel_obj),
        persist_result=persist_result,
        threshold=threshold,
    )


def analyser_flux_video(frame, threshold: Optional[float] = None, top_k: int = 3):
    """Analyse un frame vidéo pour la reconnaissance faciale en direct."""

    face_service = _get_face_service()
    if face_service is None:
        return {
            'success': False,
            'error': _face_service_error or 'Service ArcFace indisponible',
        }

    if frame is None:
        return {
            'success': False,
            'error': 'Frame vidéo manquant',
        }

    return face_service.process_stream_frame(frame=frame, threshold=threshold, top_k=top_k)


def predire_risque(criminel_id, type_prediction='recidive'):
    """
    Fonction centralisée pour prédire les risques
    
    Args:
        criminel_id: ID du criminel à analyser
        type_prediction: Type de prédiction ('recidive', 'zone_risque', 'dangerosite', 'association')
        
    Returns:
        dict: Résultats de la prédiction
    """
    try:
        criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
        
        # Choisir le type de prédiction
        if type_prediction == 'recidive':
            resultat = predictive_service.predire_risque_recidive(criminel)
        elif type_prediction == 'zone_risque':
            resultat = predictive_service.predire_zone_risque(criminel)
        elif type_prediction == 'dangerosite':
            resultat = predictive_service.predire_profil_dangerosite(criminel)
        elif type_prediction == 'association':
            resultat = predictive_service.predire_association_criminelle(criminel)
        else:
            return {
                'success': False,
                'error': f'Type de prédiction inconnu: {type_prediction}'
            }
        
        # Enregistrer dans la base de données
        if resultat.get('success'):
            IAPrediction.objects.create(
                fiche_criminelle=criminel,
                type_prediction=type_prediction,
                resultat_prediction=resultat,
                score_confiance=resultat.get('risque_recidive', 
                                           resultat.get('score_global', 0))
            )
        
        return resultat
        
    except CriminalFicheCriminelle.DoesNotExist:
        return {
            'success': False,
            'error': f'Criminel avec ID {criminel_id} introuvable'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Erreur lors de la prédiction: {str(e)}'
        }


def detecter_correlation(type_analyse='global', periode_jours=365, criminel_id=None):
    """
    Fonction centralisée pour détecter les corrélations
    
    Args:
        type_analyse: Type d'analyse ('global', 'temporel', 'geographique', 'statistiques')
        periode_jours: Période d'analyse en jours
        criminel_id: ID optionnel pour analyse ciblée
        
    Returns:
        dict: Résultats de l'analyse de corrélations
    """
    try:
        # Récupérer les criminels
        if criminel_id:
            criminels = CriminalFicheCriminelle.objects.filter(id=criminel_id)
        else:
            criminels = CriminalFicheCriminelle.objects.all()
        
        # Choisir le type d'analyse
        if type_analyse == 'global':
            resultat = correlation_service.detecter_correlations(criminels, periode_jours)
        elif type_analyse == 'temporel':
            # Récupérer toutes les infractions
            from criminel.models import CriminalInfraction
            infractions = CriminalInfraction.objects.filter(
                fiche_criminelle__in=criminels
            )
            resultat = correlation_service.analyser_patterns_temporels(infractions)
        elif type_analyse == 'geographique':
            from criminel.models import CriminalInfraction
            infractions = CriminalInfraction.objects.filter(
                fiche_criminelle__in=criminels
            )
            resultat = correlation_service.analyser_patterns_geographiques(infractions)
        elif type_analyse == 'statistiques':
            resultat = correlation_service.generer_statistiques_globales(criminels)
        else:
            return {
                'success': False,
                'error': f'Type d\'analyse inconnu: {type_analyse}'
            }
        
        # Enregistrer les patterns et corrélations importantes
        if resultat.get('success') and type_analyse == 'global':
            correlations_data = resultat.get('correlations', {})
            
            # Créer des patterns pour les corrélations importantes
            for type_corr, items in correlations_data.items():
                for item in items[:3]:  # Top 3 de chaque type
                    if isinstance(item, dict) and 'degre_correlation' in item:
                        pattern = IAPattern.objects.create(
                            nom_pattern=f"Pattern {type_corr}",
                            type_pattern=type_corr if type_corr != 'modus' else 'modus_operandi',
                            frequence=item.get('nb_criminels', 0),
                            niveau_risque=item.get('degre_correlation', 0),
                            donnees_sources=item
                        )
        
        return resultat
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Erreur lors de la détection de corrélations: {str(e)}'
        }


# Fonctions utilitaires supplémentaires

def comparer_deux_visages(image1, image2):
    """Compare directement deux images de visages"""
    from biometrie.services import ReconnaissanceFacialeService
    
    face_service = _get_face_service()
    if face_service is None:
        return {
            'success': False,
            'error': _face_service_error or 'Service ArcFace indisponible',
        }

    if not image1 or not image2:
        return {
            'success': False,
            'error': 'Deux images sont nécessaires pour effectuer la comparaison',
        }

    faces_a = face_service.arcface.encode_faces(image=image1, limit=1)
    faces_b = face_service.arcface.encode_faces(image=image2, limit=1)

    if not faces_a:
        return {
            'success': False,
            'error': "Aucun visage détecté dans l'image 1",
        }

    if not faces_b:
        return {
            'success': False,
            'error': "Aucun visage détecté dans l'image 2",
        }

    embedding_a = faces_a[0].embedding
    embedding_b = faces_b[0].embedding

    similarity = ArcFaceService.compare_embeddings(embedding_a, embedding_b)
    distance = float(1.0 - similarity)

    return {
        'success': True,
        'similarite': float(similarity),
        'distance': distance,
        'threshold': face_service.threshold,
        'same_person': ArcFaceService.are_same_person(embedding_a, embedding_b, threshold=face_service.threshold),
    }


def extraire_caracteristiques_faciales(image_path):
    """Extrait les caractéristiques d'un visage (encodage ArcFace)"""
    from biometrie.services import ReconnaissanceFacialeService
    
    face_service = _get_face_service()
    if face_service is None:
        return {
            'success': False,
            'error': _face_service_error or 'Service ArcFace indisponible',
        }

    faces = face_service.arcface.encode_faces(image=image_path, limit=1)
    if not faces:
        return {
            'success': False,
            'error': "Aucun visage détecté dans l'image",
        }

    embedding = ArcFaceService.serialize_embedding(faces[0].embedding)
    return {
        'success': True,
        'encodage': embedding,
        'longueur': len(embedding),
    }


def obtenir_statistiques_ia():
    """Retourne des statistiques globales sur les analyses IA"""
    try:
        stats = {
            'reconnaissance_faciale': {
                'total_analyses': IAReconnaissanceFaciale.objects.count(),
                'correspondances_trouvees': IAReconnaissanceFaciale.objects.filter(
                    statut='correspondance_trouvee'
                ).count(),
                'en_attente': IAReconnaissanceFaciale.objects.filter(
                    statut='en_attente'
                ).count()
            },
            'predictions': {
                'total_predictions': IAPrediction.objects.count(),
                'par_type': {}
            },
            'patterns': {
                'total_patterns': IAPattern.objects.count(),
                'par_type': {}
            },
            'correlations': {
                'total_correlations': IACorrelation.objects.count(),
                'par_type': {}
            }
        }
        
        # Compter par type de prédiction
        for choice in IAPrediction._meta.get_field('type_prediction').choices:
            type_val = choice[0]
            count = IAPrediction.objects.filter(type_prediction=type_val).count()
            stats['predictions']['par_type'][type_val] = count
        
        # Compter par type de pattern
        for choice in IAPattern._meta.get_field('type_pattern').choices:
            type_val = choice[0]
            count = IAPattern.objects.filter(type_pattern=type_val).count()
            stats['patterns']['par_type'][type_val] = count
        
        # Compter par type de corrélation
        for choice in IACorrelation._meta.get_field('type_correlation').choices:
            type_val = choice[0]
            count = IACorrelation.objects.filter(type_correlation=type_val).count()
            stats['correlations']['par_type'][type_val] = count
        
        return {
            'success': True,
            'statistiques': stats
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


# Export des fonctions principales
__all__ = [
    'analyser_visage',
    'analyser_flux_video',
    'predire_risque',
    'detecter_correlation',
    'comparer_deux_visages',
    'extraire_caracteristiques_faciales',
    'obtenir_statistiques_ia',
    'predictive_service',
    'correlation_service',
    'statistique_service',
    'prediction_recherche_service',
    'matching_service',
    'alert_service',
    'example_compare_embeddings',
    'example_identification_flow',
]

