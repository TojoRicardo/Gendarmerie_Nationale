import logging
from typing import Any, Dict, List, Optional

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import (
    IAReconnaissanceFaciale, IAAnalyseStatistique, IAMatchBiometrique, 
    IAPrediction, IAPattern, IACorrelation
)
from .serializers import (
    IAReconnaissanceFacialeSerializer, IAReconnaissanceFacialeCreateSerializer,
    IAAnalyseStatistiqueSerializer, IAAnalyseStatistiqueCreateSerializer,
    IAMatchBiometriqueSerializer, IAMatchBiometriqueCreateSerializer,
    IAPredictionSerializer, IAPredictionCreateSerializer,
    IAPatternSerializer, IAPatternCreateSerializer,
    IACorrelationSerializer, IACorrelationCreateSerializer
)


class IAReconnaissanceFacialeViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les analyses de reconnaissance faciale IA
    """
    queryset = IAReconnaissanceFaciale.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IAReconnaissanceFacialeCreateSerializer
        return IAReconnaissanceFacialeSerializer
    
    @action(detail=False, methods=['get'])
    def par_statut(self, request):
        """Filtrer les analyses par statut"""
        statut = request.query_params.get('statut', None)
        if statut:
            analyses = self.queryset.filter(statut=statut)
            serializer = self.get_serializer(analyses, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre statut requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def par_criminel(self, request):
        """Obtenir toutes les analyses pour un criminel"""
        criminel_id = request.query_params.get('criminel_id', None)
        if criminel_id:
            analyses = self.queryset.filter(criminel_identifie_id=criminel_id)
            serializer = self.get_serializer(analyses, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre criminel_id requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['patch'])
    def valider(self, request, pk=None):
        """Valider une analyse de reconnaissance faciale"""
        analyse = self.get_object()
        analyse.statut = 'correspondance_trouvee'
        analyse.save()
        serializer = self.get_serializer(analyse)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def rejeter(self, request, pk=None):
        """Rejeter une analyse de reconnaissance faciale"""
        analyse = self.get_object()
        analyse.statut = 'aucune_correspondance'
        analyse.save()
        serializer = self.get_serializer(analyse)
        return Response(serializer.data)


class IAAnalyseStatistiqueViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les analyses statistiques IA
    """
    queryset = IAAnalyseStatistique.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IAAnalyseStatistiqueCreateSerializer
        return IAAnalyseStatistiqueSerializer
    
    @action(detail=False, methods=['get'])
    def recherche(self, request):
        """Rechercher des analyses par titre ou description"""
        query = request.query_params.get('q', None)
        if query:
            analyses = self.queryset.filter(
                Q(titre__icontains=query) | Q(description__icontains=query)
            )
            serializer = self.get_serializer(analyses, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre q (recherche) requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def recentes(self, request):
        """Obtenir les analyses les plus récentes"""
        limite = int(request.query_params.get('limite', 10))
        analyses = self.queryset.order_by('-date_generation')[:limite]
        serializer = self.get_serializer(analyses, many=True)
        return Response(serializer.data)


class IAMatchBiometriqueViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les correspondances biométriques IA
    """
    queryset = IAMatchBiometrique.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IAMatchBiometriqueCreateSerializer
        return IAMatchBiometriqueSerializer
    
    @action(detail=False, methods=['get'])
    def par_type(self, request):
        """Filtrer les correspondances par type"""
        type_match = request.query_params.get('type', None)
        if type_match:
            matches = self.queryset.filter(type_match=type_match)
            serializer = self.get_serializer(matches, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre type requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def en_attente(self, request):
        """Obtenir toutes les correspondances en attente de validation"""
        matches = self.queryset.filter(statut_validation='en_attente')
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def valider(self, request, pk=None):
        """Valider une correspondance biométrique"""
        match = self.get_object()
        match.statut_validation = 'valide'
        match.valide_par = request.user
        match.save()
        serializer = self.get_serializer(match)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def rejeter(self, request, pk=None):
        """Rejeter une correspondance biométrique"""
        match = self.get_object()
        match.statut_validation = 'rejete'
        match.valide_par = request.user
        match.save()
        serializer = self.get_serializer(match)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def par_criminel(self, request):
        """Obtenir toutes les correspondances pour un criminel"""
        criminel_id = request.query_params.get('criminel_id', None)
        if criminel_id:
            matches = self.queryset.filter(
                Q(criminel_source_id=criminel_id) | 
                Q(criminel_correspondant_id=criminel_id)
            )
            serializer = self.get_serializer(matches, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre criminel_id requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class IAPredictionViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les prédictions IA
    """
    queryset = IAPrediction.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IAPredictionCreateSerializer
        return IAPredictionSerializer
    
    @action(detail=False, methods=['get'])
    def par_type(self, request):
        """Filtrer les prédictions par type"""
        type_pred = request.query_params.get('type', None)
        if type_pred:
            predictions = self.queryset.filter(type_prediction=type_pred)
            serializer = self.get_serializer(predictions, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre type requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def par_fiche(self, request):
        """Obtenir toutes les prédictions pour une fiche criminelle"""
        fiche_id = request.query_params.get('fiche_id', None)
        if fiche_id:
            predictions = self.queryset.filter(fiche_criminelle_id=fiche_id)
            serializer = self.get_serializer(predictions, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre fiche_id requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def risques_eleves(self, request):
        """Obtenir les prédictions avec un score de confiance élevé"""
        seuil = float(request.query_params.get('seuil', 70.00))
        predictions = self.queryset.filter(score_confiance__gte=seuil)
        serializer = self.get_serializer(predictions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def par_uuid(self, request):
        """Rechercher une prédiction par UUID"""
        uuid_val = request.query_params.get('uuid', None)
        if uuid_val:
            try:
                prediction = self.queryset.get(uuid=uuid_val)
                serializer = self.get_serializer(prediction)
                return Response(serializer.data)
            except IAPrediction.DoesNotExist:
                return Response(
                    {'error': 'Prédiction introuvable'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        return Response(
            {'error': 'Paramètre uuid requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class IAPatternViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les schémas criminels détectés par l'IA
    """
    queryset = IAPattern.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IAPatternCreateSerializer
        return IAPatternSerializer
    
    @action(detail=False, methods=['get'])
    def par_type(self, request):
        """Filtrer les patterns par type"""
        type_pattern = request.query_params.get('type', None)
        if type_pattern:
            patterns = self.queryset.filter(type_pattern=type_pattern)
            serializer = self.get_serializer(patterns, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre type requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def risques_eleves(self, request):
        """Obtenir les patterns avec un niveau de risque élevé"""
        seuil = float(request.query_params.get('seuil', 70.00))
        patterns = self.queryset.filter(niveau_risque__gte=seuil)
        serializer = self.get_serializer(patterns, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def plus_frequents(self, request):
        """Obtenir les patterns les plus fréquents"""
        limite = int(request.query_params.get('limite', 10))
        patterns = self.queryset.order_by('-frequence')[:limite]
        serializer = self.get_serializer(patterns, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def par_uuid(self, request):
        """Rechercher un pattern par UUID"""
        uuid_val = request.query_params.get('uuid', None)
        if uuid_val:
            try:
                pattern = self.queryset.get(uuid=uuid_val)
                serializer = self.get_serializer(pattern)
                return Response(serializer.data)
            except IAPattern.DoesNotExist:
                return Response(
                    {'error': 'Pattern introuvable'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        return Response(
            {'error': 'Paramètre uuid requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class IACorrelationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les corrélations détectées par l'IA
    """
    queryset = IACorrelation.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IACorrelationCreateSerializer
        return IACorrelationSerializer
    
    @action(detail=False, methods=['get'])
    def par_type(self, request):
        """Filtrer les corrélations par type"""
        type_corr = request.query_params.get('type', None)
        if type_corr:
            correlations = self.queryset.filter(type_correlation=type_corr)
            serializer = self.get_serializer(correlations, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre type requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def par_criminel(self, request):
        """Obtenir toutes les corrélations impliquant un criminel"""
        criminel_id = request.query_params.get('criminel_id', None)
        if criminel_id:
            correlations = self.queryset.filter(criminels__id=criminel_id)
            serializer = self.get_serializer(correlations, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre criminel_id requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def par_pattern(self, request):
        """Obtenir toutes les corrélations associées à un pattern"""
        pattern_id = request.query_params.get('pattern_id', None)
        if pattern_id:
            correlations = self.queryset.filter(pattern_associe_id=pattern_id)
            serializer = self.get_serializer(correlations, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'Paramètre pattern_id requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def degre_eleve(self, request):
        """Obtenir les corrélations avec un degré de corrélation élevé"""
        seuil = float(request.query_params.get('seuil', 75.00))
        correlations = self.queryset.filter(degre_correlation__gte=seuil)
        serializer = self.get_serializer(correlations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def par_uuid(self, request):
        """Rechercher une corrélation par UUID"""
        uuid_val = request.query_params.get('uuid', None)
        if uuid_val:
            try:
                correlation = self.queryset.get(uuid=uuid_val)
                serializer = self.get_serializer(correlation)
                return Response(serializer.data)
            except IACorrelation.DoesNotExist:
                return Response(
                    {'error': 'Corrélation introuvable'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        return Response(
            {'error': 'Paramètre uuid requis'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Obtenir des statistiques sur les corrélations"""
        stats = {
            'total': self.queryset.count(),
            'par_type': {},
            'degre_moyen': 0
        }
        
        # Compter par type
        for choice in IACorrelation._meta.get_field('type_correlation').choices:
            type_val = choice[0]
            count = self.queryset.filter(type_correlation=type_val).count()
            stats['par_type'][type_val] = count
        
        # Calculer le degré moyen
        correlations = self.queryset.all()
        if correlations.exists():
            total_degre = sum(c.degre_correlation for c in correlations)
            stats['degre_moyen'] = float(total_degre) / correlations.count()
        
        return Response(stats)


#NOUVEAUX ENDPOINTS IA FONCTIONNELS

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import numpy as np
import cv2
import json
import time
from django.core.files.base import ContentFile
from django.utils import timezone
from django.db import transaction
from django.urls import reverse

from biometrie.arcface_service import ArcFaceService
from biometrie.models import Biometrie
from criminel.models import CriminalFicheCriminelle
from .models import RechercheIA
from . import services
from .ia_service import FaceRecognitionIAService, FaceRecognitionUnavailable


class ReconnaissanceViewSet(APIView):
    """Endpoint pour la recherche par photo basée sur les embeddings ArcFace."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    LOGGER = logging.getLogger(__name__)
    ALLOWED_ROLES = {
        'Administrateur Système',
        'Enquêteur Principal',
        'Analyste',
    }

    def post(self, request):
        """
        Analyse une photo pour identifier un criminel à partir des embeddings stockés.
        """
        user_role = getattr(request.user, 'role', None)
        if user_role not in self.ALLOWED_ROLES:
            return Response(
                {
                    'matches': [],
                    'message': "Vous n'êtes pas autorisé à utiliser la reconnaissance faciale.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'matches': [], 'message': 'Aucune image fournie.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        threshold_value = request.data.get('threshold', 0.6)
        try:
            threshold_value = float(threshold_value)
        except (TypeError, ValueError):
            return Response(
                {'matches': [], 'message': 'Seuil invalide. Utilisez une valeur numérique (0-1).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        top_n = request.data.get('top_n', 3)
        try:
            top_n = max(1, int(top_n))
        except (TypeError, ValueError):
            return Response(
                {'matches': [], 'message': 'Paramètre top_n invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            arcface = ArcFaceService()
        except Exception:  # pragma: no cover - import insightface optionnel
            self.LOGGER.exception("ArcFace indisponible pour la recherche faciale.")
            return Response(
                {'matches': [], 'message': 'Le moteur ArcFace est indisponible.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        started_at = timezone.now()
        faces = arcface.encode_faces(image=image_file, limit=1)
        if not faces:
            return Response(
                {
                    'matches': [],
                    'status': 'no_face',
                    'message': 'Aucun visage détecté sur la photo fournie.',
                    'threshold': threshold_value,
                    'timestamp': timezone.now().isoformat(),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        query_embedding = faces[0].embedding.astype(np.float32)
        query_norm = np.linalg.norm(query_embedding)
        if query_norm == 0:
            return Response(
                {
                    'matches': [],
                    'status': 'invalid_embedding',
                    'message': 'Impossible de normaliser le visage détecté.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        query_embedding = query_embedding / query_norm

        matches = []
        for biometrie in Biometrie.objects.select_related('criminel').all():
            embedding_data = biometrie.encodage_facial
            if not embedding_data:
                continue

            emb_array = np.asarray(embedding_data, dtype=np.float32)
            if emb_array.ndim != 1 or emb_array.size == 0:
                continue

            emb_norm = np.linalg.norm(emb_array)
            if emb_norm == 0:
                continue

            emb_array = emb_array / emb_norm
            similarity = float(np.dot(query_embedding, emb_array))

            if similarity >= threshold_value and biometrie.criminel:
                matches.append(
                    {
                        'biometrie': biometrie,
                        'similarity': similarity,
                    }
                )

        matches.sort(key=lambda item: item['similarity'], reverse=True)
        matches = matches[:top_n]

        formatted_matches = []
        for item in matches:
            biometrie = item['biometrie']
            criminel = biometrie.criminel
            photo_url = None
            if biometrie.photo:
                try:
                    photo_url = request.build_absolute_uri(biometrie.photo.url)
                except ValueError:
                    photo_url = None
            if not photo_url and criminel.photo:
                try:
                    photo_url = request.build_absolute_uri(criminel.photo.url)
                except ValueError:
                    photo_url = None

            formatted_matches.append(
                {
                    'fiche_id': criminel.id,
                    'numero_fiche': criminel.numero_fiche,
                    'nom': criminel.nom,
                    'prenom': criminel.prenom,
                    'cin': criminel.cin,
                    'score': round(item['similarity'], 4),
                    'photo_url': photo_url,
                }
            )

        duration = (timezone.now() - started_at).total_seconds()

        # Journaliser l'action d'analyse prédictive IA
        try:
            from audit.services import audit_log
            audit_log(
                request=request,
                module="Intelligence Artificielle",
                action="Analyse prédictive",
                ressource="Module IA",
                narration=(
                    "Une analyse prédictive basée sur l'intelligence artificielle "
                    "a été exécutée afin d'identifier des corrélations criminelles."
                )
            )
        except Exception as audit_error:
            logger.warning(f"Erreur lors de l'enregistrement de l'audit pour analyse IA: {audit_error}")

        # Journalisation de la recherche
        try:
            image_file.seek(0)
            content = ContentFile(image_file.read())
            resultats_payload = {
                'threshold': threshold_value,
                'top_n': top_n,
                'matches': formatted_matches,
            }
            RechercheIA.objects.create(
                user=request.user,
                image_query=content,
                seuil=threshold_value,
                top_n=top_n,
                resultats=resultats_payload,
            )
        except Exception:  # pragma: no cover - ne bloque pas la réponse
            self.LOGGER.exception("Impossible de journaliser la recherche IA")

        self.LOGGER.info(
            "Recherche faciale IA par %s - résultats=%d, score_max=%.4f",
            request.user,
            len(formatted_matches),
            formatted_matches[0]['score'] if formatted_matches else 0.0,
        )

        response_payload = {
            'status': 'success' if formatted_matches else 'no_match',
            'threshold': threshold_value,
            'top_n': top_n,
            'matches': formatted_matches,
            'total_found': len(formatted_matches),
            'search_time': round(duration, 4),
            'timestamp': timezone.now().isoformat(),
            'message': 'Aucune correspondance trouvée dans la base.'
            if not formatted_matches
            else 'Correspondances trouvées.',
        }
        return Response(response_payload, status=status.HTTP_200_OK)


class RecherchePhotoAPIView(APIView):
    """
    Endpoint simplifié : compare une photo importée avec les encodages stockés en base.
    Renvoie les criminels correspondants triés par similarité décroissante.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    DEFAULT_THRESHOLD = 0.7  # 70%
    DEFAULT_TOP = 1
    _face_detector = None
    _face_detector_load_attempted = False
    FACE_MIN_SIZE = (80, 80)

    @classmethod
    def _get_face_detector(cls):
        if cls._face_detector is None and not cls._face_detector_load_attempted:
            cls._face_detector_load_attempted = True
            try:
                cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                detector = cv2.CascadeClassifier(cascade_path)
                if detector.empty():
                    logging.getLogger(__name__).warning(
                        "Impossible de charger le classifieur Haarcascade (%s). La détection OpenCV sera ignorée.",
                        cascade_path,
                    )
                    detector = None
                cls._face_detector = detector
            except Exception as exc:  # pragma: no cover - initialisation OpenCV
                logging.getLogger(__name__).warning(
                    "Erreur lors de l'initialisation du détecteur OpenCV: %s",
                    exc,
                )
                cls._face_detector = None
        return cls._face_detector

    @classmethod
    def _contains_human_face(cls, image_file):
        try:
            if hasattr(image_file, 'seek'):
                image_file.seek(0)
            image_bytes = image_file.read()
            if hasattr(image_file, 'seek'):
                image_file.seek(0)
        except Exception as exc:  # pragma: no cover - lecture robuste
            logging.getLogger(__name__).warning(
                "Lecture du fichier image impossible pour détection OpenCV: %s",
                exc,
            )
            return False

        if not image_bytes:
            return False

        try:
            np_image = np.frombuffer(image_bytes, dtype=np.uint8)
            frame = cv2.imdecode(np_image, cv2.IMREAD_COLOR)
        except Exception as exc:  # pragma: no cover - décodage robuste
            logging.getLogger(__name__).warning(
                "Décodage OpenCV impossible pour l'image de recherche-photo: %s",
                exc,
            )
            return False

        if frame is None:
            return False

        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        except Exception as exc:  # pragma: no cover - conversion
            logging.getLogger(__name__).warning(
                "Conversion en niveaux de gris échouée pour la détection faciale: %s",
                exc,
            )
            return False

        detector = cls._get_face_detector()
        if detector is None:
            # Si le détecteur OpenCV n'est pas disponible, on laisse ArcFace gérer la détection.
            return True

        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=cls.FACE_MIN_SIZE,
        )
        return len(faces) > 0

    def _normalize_threshold(self, raw_threshold):
        try:
            value = float(raw_threshold)
        except (TypeError, ValueError):
            raise ValueError("Seuil invalide. Utilisez une valeur numérique.")
        if value > 1:
            value = value / 100.0
        if value < 0 or value > 1:
            raise ValueError("Le seuil doit être compris entre 0 et 1.")
        return value

    @staticmethod
    def _parse_embedding(payload):
        if payload is None:
            return None
        if isinstance(payload, list):
            return np.asarray(payload, dtype=np.float32)
        if isinstance(payload, (bytes, str)):
            try:
                data = json.loads(payload)
                return np.asarray(data, dtype=np.float32)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    @staticmethod
    def _build_photo_url(request, biometrie, criminel):
        candidates = []
        if biometrie and getattr(biometrie, 'photo', None):
            candidates.append(biometrie.photo.url)
        if criminel and getattr(criminel, 'photo', None):
            candidates.append(criminel.photo.url)

        for url in candidates:
            if not url:
                continue
            try:
                return request.build_absolute_uri(url)
            except ValueError:
                return url
        return None

    @staticmethod
    def _build_fiche_url(request, criminel_id):
        try:
            relative = reverse('criminalfichecriminelle-detail', args=[criminel_id])
            return request.build_absolute_uri(relative)
        except Exception:
            try:
                return request.build_absolute_uri(f'/criminels/{criminel_id}/')
            except Exception:
                return None

    def post(self, request):
        photo = request.FILES.get('photo') or request.FILES.get('image')
        if not photo:
            return Response(
                {
                    'resultats': [],
                    'message': 'Aucune photo fournie. Téléversez une image au format JPG ou PNG.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not self._contains_human_face(photo):
            return Response(
                {
                    'resultats': [],
                    'message': 'Aucun visage humain détecté',
                    'code': 'FACE_NOT_DETECTED',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            threshold = self._normalize_threshold(request.data.get('threshold', self.DEFAULT_THRESHOLD))
        except ValueError as exc:
            return Response(
                {
                    'resultats': [],
                    'message': str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        top_raw = request.data.get('top_k') or request.data.get('top_n') or self.DEFAULT_TOP
        try:
            top_n = max(1, int(top_raw))
        except (TypeError, ValueError):
            return Response(
                {
                    'resultats': [],
                    'message': 'Le paramètre top_k doit être un entier positif.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            arcface = ArcFaceService()
        except Exception as exc:  # pragma: no cover - dépend de l'installation locale
            logging.getLogger(__name__).exception("ArcFace indisponible pour recherche-photo.")
            return Response(
                {
                    'resultats': [],
                    'message': f'Le moteur ArcFace est indisponible: {exc}',
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        started_at = timezone.now()
        faces = arcface.encode_faces(image=photo, limit=1)
        if not faces:
            elapsed = (timezone.now() - started_at).total_seconds()
            return Response(
                {
                    'resultats': [],
                    'message': 'Aucun visage humain détecté',
                    'code': 'FACE_NOT_DETECTED',
                    'temps_execution': round(elapsed, 3),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        query_embedding = faces[0].embedding.astype(np.float32)
        norm = np.linalg.norm(query_embedding)
        if norm == 0:
            return Response(
                {
                    'resultats': [],
                    'message': 'Encodage facial invalide. Essayez avec une photo plus nette.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        query_embedding = query_embedding / norm

        matches = []
        for biometrie in Biometrie.objects.select_related('criminel').all():
            embedding_array = self._parse_embedding(biometrie.encodage_facial)
            if embedding_array is None or embedding_array.size == 0:
                continue

            emb_norm = np.linalg.norm(embedding_array)
            if emb_norm == 0:
                continue
            embedding_array = embedding_array / emb_norm

            similarity = float(np.dot(query_embedding, embedding_array))
            if similarity >= threshold and biometrie.criminel:
                matches.append(
                    {
                        'criminel': biometrie.criminel,
                        'similarity': similarity,
                        'biometrie': biometrie,
                    }
                )

        matches.sort(key=lambda item: item['similarity'], reverse=True)
        matches = matches[:top_n]

        resultats = []
        for match in matches:
            criminel = match['criminel']
            similarity_percent = match['similarity'] * 100.0
            resultats.append(
                {
                    'id': criminel.id,
                    'numero_fiche': criminel.numero_fiche,
                    'nom': criminel.nom,
                    'prenom': criminel.prenom,
                    'photo_criminel': self._build_photo_url(request, match.get('biometrie'), criminel),
                    'similarite': round(similarity_percent, 1),
                    'fiche_url': self._build_fiche_url(request, criminel.id),
                }
            )

        elapsed = (timezone.now() - started_at).total_seconds()

        if not resultats:
            return Response(
                {
                    'resultats': [],
                    'total': 0,
                    'seuil': round(threshold * 100, 1),
                    'temps_execution': round(elapsed, 3),
                    'message': 'Aucun individu correspondant trouvé',
                    'code': 'NO_MATCH_FOUND',
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                'resultats': resultats,
                'total': len(resultats),
                'seuil': round(threshold * 100, 1),
                'temps_execution': round(elapsed, 3),
                'message': 'Correspondances détectées.',
            },
            status=status.HTTP_200_OK,
        )


class RecherchePhotoStreamAPIView(APIView):
    """
    Endpoint temps réel pour la reconnaissance par flux vidéo.

    Accepte un embedding pré-calculé ou un crop d'image contenant un visage et
    retourne les correspondances dépassant le seuil de similarité.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    DEFAULT_THRESHOLD = 0.7
    DEFAULT_TOP = 3

    @staticmethod
    def _parse_embedding(payload):
        return RecherchePhotoAPIView._parse_embedding(payload)

    def _normalize_threshold(self, raw_threshold):
        try:
            value = float(raw_threshold)
        except (TypeError, ValueError):
            raise ValueError("Seuil invalide. Utilisez une valeur numérique.")
        if value > 1:
            value = value / 100.0
        if value < 0 or value > 1:
            raise ValueError("Le seuil doit être compris entre 0 et 1.")
        return value

    def _format_match(self, match: Dict[str, Any], threshold: float) -> Optional[Dict[str, Any]]:
        if not match:
            return None

        criminel_id = match.get('criminel_id') or match.get('id')
        if criminel_id is None:
            return None

        similarity_percent = match.get('confidence_percent')
        if similarity_percent is None:
            similarity_percent = match.get('similarite')
        if similarity_percent is None:
            confidence = match.get('confidence')
            if confidence is not None:
                similarity_percent = float(confidence) * (100.0 if confidence <= 1 else 1.0)
            else:
                similarity_percent = 0.0

        similarity_percent = float(similarity_percent)
        if similarity_percent <= 1.0 and match.get('confidence') is not None:
            similarity_percent = float(match['confidence']) * 100.0

        if similarity_percent < threshold * 100.0:
            return None

        return {
            'id': criminel_id,
            'nom': match.get('nom'),
            'prenom': match.get('prenom'),
            'numero_fiche': match.get('numero_fiche'),
            'photo_url': match.get('photo_url'),
            'source': match.get('source'),
            'similarite': round(similarity_percent, 1),
        }

    def _collect_matches(
        self,
        matches: List[Dict[str, Any]],
        threshold: float,
        top_k: int,
    ) -> List[Dict[str, Any]]:
        filtered: Dict[Any, Dict[str, Any]] = {}
        for match in matches:
            formatted = self._format_match(match, threshold)
            if not formatted:
                continue
            match_id = formatted['id']
            if match_id not in filtered or formatted['similarite'] > filtered[match_id]['similarite']:
                filtered[match_id] = formatted
        return sorted(filtered.values(), key=lambda item: item['similarite'], reverse=True)[:top_k]

    def post(self, request):
        started_at = time.perf_counter()

        try:
            threshold = self._normalize_threshold(request.data.get('threshold', self.DEFAULT_THRESHOLD))
        except ValueError as exc:
            return Response(
                {
                    'resultats': [],
                    'message': str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        top_raw = request.data.get('top_k') or request.data.get('top_n') or self.DEFAULT_TOP
        try:
            top_k = max(1, int(top_raw))
        except (TypeError, ValueError):
            return Response(
                {
                    'resultats': [],
                    'message': 'Le paramètre top_k doit être un entier positif.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        embedding_payload = request.data.get('embedding') or request.data.get('embedding_json')
        frame_image = request.FILES.get('image') or request.FILES.get('frame')

        if embedding_payload is None and frame_image is None:
            return Response(
                {
                    'resultats': [],
                    'message': 'Aucun embedding ni image fournie.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        frame_dimensions = None
        frame_width = request.data.get('frame_width')
        frame_height = request.data.get('frame_height')
        try:
            if frame_width and frame_height:
                frame_dimensions = {
                    'width': float(frame_width),
                    'height': float(frame_height),
                }
        except (TypeError, ValueError):
            frame_dimensions = None

        try:
            face_service = FaceRecognitionIAService()
        except FaceRecognitionUnavailable as exc:
            return Response(
                {
                    'resultats': [],
                    'message': 'Le moteur ArcFace est indisponible.',
                    'details': str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:  # pragma: no cover - protection runtime
            logging.getLogger(__name__).exception("Erreur inattendue lors de l\'initialisation du service ArcFace.")
            return Response(
                {
                    'resultats': [],
                    'message': 'Erreur interne lors de l\'initialisation du moteur ArcFace.',
                    'details': str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if embedding_payload is not None:
            embedding_array = self._parse_embedding(embedding_payload)
            if embedding_array is None or embedding_array.size == 0:
                return Response(
                    {
                        'resultats': [],
                        'message': 'Embedding facial invalide ou vide.',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            query_vector = np.asarray(embedding_array, dtype=np.float32).reshape(-1)
            norm = np.linalg.norm(query_vector)
            if norm == 0:
                return Response(
                    {
                        'resultats': [],
                        'message': 'Embedding facial non normalisable.',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            query_vector = query_vector / norm
            matches_raw = face_service.score_embeddings(
                query_vector,
                top_k=top_k,
                threshold=threshold,
                include_all=True,
            )
            matches_dicts = [match.to_dict() for match in matches_raw]
            resultats = self._collect_matches(matches_dicts, threshold, top_k)

            elapsed = time.perf_counter() - started_at
            if not resultats:
                return Response(
                    {
                        'resultats': [],
                        'faces': [],
                        'message': 'Aucun individu correspondant trouvé',
                        'code': 'NO_MATCH_FOUND',
                        'temps_execution': round(elapsed, 3),
                        'threshold': round(threshold * 100, 1),
                        'frame_dimensions': frame_dimensions,
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    'resultats': resultats,
                    'faces': [],
                    'total': len(resultats),
                    'message': 'Correspondances détectées.',
                    'temps_execution': round(elapsed, 3),
                    'threshold': round(threshold * 100, 1),
                    'frame_dimensions': frame_dimensions,
                },
                status=status.HTTP_200_OK,
            )

        stream_result = face_service.process_stream_frame(
            frame=frame_image,
            threshold=threshold,
            top_k=top_k,
        )

        elapsed = time.perf_counter() - started_at

        if not stream_result.get('success'):
            return Response(
                {
                    'resultats': [],
                    'faces': [],
                    'message': 'Aucun visage humain détecté',
                    'code': 'FACE_NOT_DETECTED',
                    'faces_detected': stream_result.get('faces_detected', 0),
                    'temps_execution': round(elapsed, 3),
                    'threshold': round(threshold * 100, 1),
                    'frame_dimensions': frame_dimensions,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        faces_payload: List[Dict[str, Any]] = []
        aggregated_matches: List[Dict[str, Any]] = []

        for face in stream_result.get('faces', []):
            matches_for_face = face.get('matches', [])
            aggregated_matches.extend(matches_for_face)

            per_face_matches = self._collect_matches(matches_for_face, threshold, top_k)
            best_match = per_face_matches[0] if per_face_matches else None

            faces_payload.append(
                {
                    'bbox': face.get('bbox'),
                    'confidence': face.get('confidence'),
                    'recognized': face.get('recognized'),
                    'threshold_used': face.get('threshold_used'),
                    'best_match': best_match,
                    'matches': per_face_matches,
                }
            )

        resultats = self._collect_matches(aggregated_matches, threshold, top_k)

        if not resultats:
            return Response(
                {
                    'resultats': [],
                    'faces': faces_payload,
                    'message': 'Aucun individu correspondant trouvé',
                    'code': 'NO_MATCH_FOUND',
                    'faces_detected': stream_result.get('faces_detected', 0),
                    'temps_execution': round(elapsed, 3),
                    'threshold': round(threshold * 100, 1),
                    'frame_dimensions': frame_dimensions,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                'resultats': resultats,
                'faces': faces_payload,
                'total': len(resultats),
                'message': 'Correspondances détectées.',
                'faces_detected': stream_result.get('faces_detected', len(faces_payload)),
                'temps_execution': round(elapsed, 3),
                'threshold': round(threshold * 100, 1),
                'frame_dimensions': frame_dimensions,
            },
            status=status.HTTP_200_OK,
        )


class ReconnaissanceStreamingViewSet(APIView):
    """
    Endpoint pour la reconnaissance faciale en temps réel (streaming)
    POST /api/ia/reconnaissance-streaming/ - Analyser un frame de vidéo en temps réel
    
    CORRIGÉ COMPLÈTEMENT : Gestion robuste des erreurs 500
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def post(self, request):
        """
        Analyse un frame vidéo pour identification en temps réel
        
        Utilise ArcFace pour la reconnaissance faciale en temps réel.
        
        Paramètres acceptés:
            - image: Fichier image (multipart/form-data)
        """
        from datetime import datetime
        
        try:
            # Vérifier que l'image est fournie
            if 'image' not in request.FILES:
                return Response({
                    'status': 'error',
                    'message': 'Aucune image fournie',
                    'timestamp': datetime.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            image = request.FILES['image']

            threshold_value = None
            if 'threshold' in request.data:
                try:
                    threshold_value = float(request.data.get('threshold'))
                except (TypeError, ValueError):
                    return Response({
                        'status': 'error',
                        'message': 'Seuil invalide',
                        'timestamp': datetime.now().isoformat(),
                    }, status=status.HTTP_400_BAD_REQUEST)

            top_k_param = request.data.get('top_k', 3)
            try:
                top_k = int(top_k_param)
            except (TypeError, ValueError):
                top_k = 3

            resultats = services.analyser_flux_video(image, threshold=threshold_value, top_k=top_k)

            if not resultats.get('success'):
                return Response({
                    'status': 'error',
                    'success': False,
                    'message': resultats.get('error', 'Erreur lors de l\'analyse'),
                    'timestamp': datetime.now().isoformat(),
                    'faces_detected': resultats.get('faces_detected', 0),
                    'matches': [],
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'status': 'success',
                'success': True,
                'timestamp': datetime.now().isoformat(),
                'faces_detected': resultats.get('faces_detected', 0),
                'faces': resultats.get('faces', []),
                'duration_ms': resultats.get('duration_ms'),
                'threshold': resultats.get('threshold'),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


#FIN DE ReconnaissanceStreamingViewSet


class RealtimeRecognitionView(APIView):
    """
    Endpoint simplifié pour la reconnaissance faciale sur capture unique (webcam).
    POST /api/ia/realtime-recognition/
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        image_data = request.data.get("image")
        if not image_data:
            return Response(
                {
                    "status": "invalid_payload",
                    "message": "Aucune image capturée n’a été transmise.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        threshold = request.data.get("threshold", 0.7)
        try:
            threshold_value = float(threshold)
        except (TypeError, ValueError):
            threshold_value = 0.7

        try:
            result = analyze_realtime_capture(
                image_data=image_data,
                threshold=threshold_value,
            )
        except FaceModelUnavailableError as exc:
            return Response(
                {
                    "status": "model_unavailable",
                    "message": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:  # pragma: no cover - protection runtime
            logger.exception("Erreur inattendue lors de la capture temps réel ArcFace")
            return Response(
                {
                    "status": "error",
                    "message": "Erreur interne lors de la reconnaissance faciale.",
                    "details": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        status_flag = result.get("status")

        if status_flag == "invalid_face":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        if status_flag in {"no_match", "success"}:
            return Response(result, status=status.HTTP_200_OK)

        return Response(
            {
                "status": "error",
                "message": result.get("message")
                or "Erreur inattendue lors de la reconnaissance temps réel.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )




class PredictionViewSet(APIView):
    """
    Endpoint pour l'analyse prédictive IA
    POST /api/ia/prediction/ - Prédire les risques
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Prédit les risques pour un criminel
        
        Paramètres:
            - criminel_id: ID du criminel (requis)
            - type: Type de prédiction ('recidive', 'zone_risque', 'dangerosite', 'association')
        """
        criminel_id = request.data.get('criminel_id')
        type_prediction = request.data.get('type', 'recidive')
        
        if not criminel_id:
            return Response(
                {'error': 'ID du criminel requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Effectuer la prédiction
        resultat = services.predire_risque(
            criminel_id=criminel_id,
            type_prediction=type_prediction
        )
        
        return Response(resultat)
    
    def get(self, request):
        """
        Récupère les prédictions existantes
        
        Paramètres de query:
            - criminel_id: Filtrer par criminel
            - type: Filtrer par type de prédiction
        """
        criminel_id = request.query_params.get('criminel_id')
        type_prediction = request.query_params.get('type')
        
        queryset = IAPrediction.objects.all()
        
        if criminel_id:
            queryset = queryset.filter(fiche_criminelle_id=criminel_id)
        if type_prediction:
            queryset = queryset.filter(type_prediction=type_prediction)
        
        predictions = []
        for pred in queryset.order_by('-date_generation')[:20]:
            predictions.append({
                'id': pred.id,
                'uuid': str(pred.uuid),
                'criminel_id': pred.fiche_criminelle.id,
                'numero_fiche': pred.fiche_criminelle.numero_fiche,
                'type_prediction': pred.type_prediction,
                'score_confiance': float(pred.score_confiance),
                'date_generation': pred.date_generation.isoformat(),
                'resultat': pred.resultat_prediction
            })
        
        return Response({
            'success': True,
            'predictions': predictions,
            'count': len(predictions)
        })


class PatternsViewSet(APIView):
    """
    Endpoint pour les patterns et corrélations IA
    GET /api/ia/patterns/ - Analyser les patterns
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Analyse les patterns et corrélations
        
        Paramètres de query:
            - type: Type d'analyse ('global', 'temporel', 'geographique', 'statistiques')
            - periode: Période en jours (défaut: 365)
            - criminel_id: (optionnel) Analyse ciblée
        """
        type_analyse = request.query_params.get('type', 'global')
        periode_jours = int(request.query_params.get('periode', 365))
        criminel_id = request.query_params.get('criminel_id')
        
        # Effectuer l'analyse
        resultat = services.detecter_correlation(
            type_analyse=type_analyse,
            periode_jours=periode_jours,
            criminel_id=criminel_id
        )
        
        return Response(resultat)
    
    def post(self, request):
        """
        Lance une nouvelle analyse de patterns personnalisée
        
        Body:
            - type: Type d'analyse
            - parametres: Paramètres spécifiques
        """
        type_analyse = request.data.get('type', 'global')
        periode = request.data.get('periode', 365)
        criminel_id = request.data.get('criminel_id')
        
        resultat = services.detecter_correlation(
            type_analyse=type_analyse,
            periode_jours=periode,
            criminel_id=criminel_id
        )
        
        return Response(resultat)


class StatistiquesIAViewSet(APIView):
    """
    Endpoint pour les statistiques globales IA
    GET /api/ia/statistiques/ - Obtenir les statistiques
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Retourne les statistiques globales du module IA"""
        stats = services.obtenir_statistiques_ia()
        return Response(stats)


#RECONNAISSANCE FACIALE ARCFACE

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.base import ContentFile
from criminel.models import CriminalFicheCriminelle

from backend.ia.photo_search import search_criminal_by_photo
from backend.ia.realtime_capture import analyze_realtime_capture
from backend.ia.exceptions import (
    FaceModelUnavailableError,
    FaceRecognitionError,
    InvalidImageError,
    NoFaceDetectedError,
    NoMatchFoundError,
)


class FaceRecognitionView(APIView):
    """
    API pour la reconnaissance faciale avec ArcFace
    POST: Envoyer une image pour identifier un criminel
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    MODEL_INFO = {
        'modele': 'ArcFace (ResNet-100)',
        'version': '2.0',
        'precision': '99.83%',
        'norme': 'ISO/IEC 30107-3:2017 (PAD)',
    }
    
    @staticmethod
    def _build_absolute_url(request, url: Optional[str]) -> Optional[str]:
        if not url:
            return None
        try:
            return request.build_absolute_uri(url)
        except Exception:
            return url

    def _serialize_criminel(self, request, match_dict: dict) -> Optional[dict]:
        criminel_id = match_dict.get('criminel_id')
        if criminel_id is None:
            return None

        criminel_obj = CriminalFicheCriminelle.objects.filter(id=criminel_id).first()
        metadata = match_dict.get('metadata') or {}
        confidence_value = float(match_dict.get('confidence', match_dict.get('similarite', 0.0)) or 0.0)
        confidence_percent = max(
            0.0,
            min(float(match_dict.get('confidence_percent', confidence_value * 100.0)), 100.0),
        )
        score_label = f"{confidence_percent:.1f}%"

        if criminel_obj is None:
            return {
                'id': criminel_id,
                'numero_fiche': match_dict.get('numero_fiche'),
                'nom': match_dict.get('nom'),
                'prenom': match_dict.get('prenom'),
                'matricule': metadata.get('matricule') or metadata.get('cin'),
                'photo_url': self._build_absolute_url(request, match_dict.get('photo_url') or metadata.get('photo_url')),
                'similarite': round(float(match_dict.get('similarite', 0.0)), 4),
                'confidence': round(confidence_value, 4),
                'confidence_percent': round(confidence_percent, 2),
                'score_confiance': score_label,
                'distance': round(float(match_dict.get('distance', 0.0)), 4),
            }

        photo_url = criminel_obj.photo.url if getattr(criminel_obj, 'photo', None) else metadata.get('photo_url')

        return {
            'id': criminel_obj.id,
            'numero_fiche': criminel_obj.numero_fiche,
            'nom': criminel_obj.nom,
            'prenom': criminel_obj.prenom,
            'matricule': getattr(criminel_obj, 'matricule', None),
            'cin': getattr(criminel_obj, 'cin', metadata.get('cin')),
            'photo_url': self._build_absolute_url(request, photo_url),
            'similarite': round(float(match_dict.get('similarite', 0.0)), 4),
            'confidence': round(confidence_value, 4),
            'confidence_percent': round(confidence_percent, 2),
            'score_confiance': score_label,
            'distance': round(float(match_dict.get('distance', 0.0)), 4),
        }

    def post(self, request):
        """
        Reconnaît un visage à partir d'une image uploadée
        
        Body (form-data):
            - image: fichier image (JPG, PNG)
            - threshold: seuil de similarité optionnel (défaut: 0.6)
        
        Returns:
            JSON avec le résultat de la reconnaissance
        """
        try:
            image_file = request.FILES.get('photo') or request.FILES.get('image')
            if not image_file:
                return Response(
                    {
                        'success': False,
                        'message': 'Aucune photo transmise. Veuillez sélectionner une image au format JPG ou PNG.',
                        'alert_level': 'Warning',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Récupérer le seuil avec valeur par défaut 0.7
            threshold = request.data.get('threshold', 0.7)
            try:
                threshold = float(threshold)
            except (TypeError, ValueError):
                return Response(
                    {
                        'success': False,
                        'message': 'Seuil invalide. Merci de fournir une valeur numérique entre 0 et 1.',
                        'alert_level': 'Warning',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if threshold < 0 or threshold > 1:
                return Response(
                    {
                        'success': False,
                        'message': 'Seuil invalide. La valeur doit être comprise entre 0 et 1.',
                        'alert_level': 'Warning',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            include_embedding = (
                str(request.data.get('include_embedding', 'false')).lower() == 'true'
            )

            metadata = {
                'endpoint': 'FaceRecognitionView.post',
                'threshold': threshold,
                'ip': request.META.get('REMOTE_ADDR'),
            }

            try:
                result = search_criminal_by_photo(
                    image=image_file,
                    threshold=threshold,
                    top_k=int(request.data.get('top_k', 5)),
                    utilisateur=request.user if request.user.is_authenticated else None,
                    metadata=metadata,
                    save_embedding=True,
                )
            except (InvalidImageError, NoFaceDetectedError) as exc:
                return Response(
                    {
                        'success': False,
                        'message': str(exc),
                        'timestamp': timezone.now().isoformat(),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except NoMatchFoundError as exc:
                return Response(
                    {
                        'success': False,
                        'message': str(exc),
                        'timestamp': timezone.now().isoformat(),
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
            except FaceModelUnavailableError as exc:
                return Response(
                    {
                        'success': False,
                        'message': str(exc),
                        'details': "Le moteur ArcFace n'est pas disponible pour le moment.",
                        'timestamp': timezone.now().isoformat(),
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except FaceRecognitionError as exc:
                return Response(
                    {
                        'success': False,
                        'message': str(exc),
                        'timestamp': timezone.now().isoformat(),
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            best_match_raw = result.get('best_match') or {}
            criminel_payload = (
                self._serialize_criminel(request, best_match_raw) if best_match_raw else None
            )

            formatted_matches = [
                self._serialize_criminel(request, candidate)
                for candidate in result.get('matches', [])
            ]
            formatted_matches = [match for match in formatted_matches if match is not None]

            ranked_results = []
            for index, match in enumerate(formatted_matches, start=1):
                confidence = match.get('confidence_percent') or (
                    (match.get('confidence') or match.get('similarite', 0.0)) * 100.0
                )
                ranked_results.append(
                    {
                        'rang': index,
                        'criminel_id': match.get('id'),
                        'nom_complet': f"{match.get('nom', '')} {match.get('prenom', '')}".strip(),
                        'fiche_id': match.get('numero_fiche') or match.get('id'),
                        'cin': match.get('cin'),
                        'score_confiance_percent': confidence,
                        'photo_url': match.get('photo_url'),
                    }
                )

            threshold_used = result.get('threshold_used', threshold)
            execution_seconds = (result.get('duration_ms', 0) or 0) / 1000

            payload = {
                'success': True,
                'message': 'Correspondance trouvée.' if criminel_payload else 'Analyse terminée.',
                'criminel': criminel_payload,
                'matches': formatted_matches,
                'resultats': ranked_results,
                'total_found': len(ranked_results),
                'faces_detected': result.get('faces_detected', 1),
                'seuil': {
                    'valeur': float(threshold_used),
                    'pourcentage': float(threshold_used) * 100.0,
                },
                'temps_execution': {
                    'secondes': execution_seconds,
                    'millisecondes': result.get('duration_ms'),
                },
                'analyse_id': result.get('analyse_id'),
                'timestamp': timezone.now().isoformat(),
                **self.MODEL_INFO,
            }

            if include_embedding and result.get('query_embedding'):
                payload['embedding'] = result['query_embedding']

            return Response(payload, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    'success': False,
                    'message': 'Erreur lors de la reconnaissance faciale',
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GenerateEmbeddingView(APIView):
    """
    API pour générer et enregistrer l'embedding facial d'un criminel
    POST: Générer l'embedding à partir de la photo du criminel
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, criminel_id):
        """
        Génère l'embedding facial pour un criminel spécifique
        
        Args:
            criminel_id: ID du criminel
            
        Returns:
            JSON avec le résultat de la génération
        """
        try:
            # Récupérer le criminel
            try:
                criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)  # type: ignore
            except CriminalFicheCriminelle.DoesNotExist:
                return Response(
                    {
                        'success': False,
                        'message': 'Criminel introuvable',
                        'error': f'Aucun criminel avec l\'ID {criminel_id}'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if not criminel.photo:
                return Response(
                    {
                        'success': False,
                        'message': 'Aucune photo disponible',
                        'error': 'Le criminel n\'a pas de photo enregistrée'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = services.analyser_visage(
                criminel_id=criminel.id,
                criminel=criminel,
                image_path=criminel.photo.path,
                save_embedding=True,
                persist_result=False,
            )

            if not result.get('success'):
                error_code = result.get('error_code')
                status_map = {
                    'ARCFACE_UNAVAILABLE': status.HTTP_503_SERVICE_UNAVAILABLE,
                    'INVALID_IMAGE': status.HTTP_400_BAD_REQUEST,
                    'NO_FACE_DETECTED': status.HTTP_400_BAD_REQUEST,
                    'PROCESSING_ERROR': status.HTTP_500_INTERNAL_SERVER_ERROR,
                }
                status_code = status_map.get(
                    error_code,
                    status.HTTP_400_BAD_REQUEST if error_code else status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

                error_payload = {
                    'success': False,
                    'message': result.get('message', "Échec de l'extraction"),
                    'timestamp': timezone.now().isoformat(),
                }

                if error_code:
                    error_payload['error_code'] = error_code
                if result.get('details'):
                    error_payload['details'] = result['details']
                if result.get('error'):
                    error_payload['error'] = result['error']

                return Response(error_payload, status=status_code)

            embedding = result.get('query_embedding')
            embedding_id = result.get('embedding_saved_id')

            return Response(
                {
                    'success': True,
                    'message': 'Embedding généré avec succès',
                    'criminel': {
                        'id': criminel.id,
                        'numero_fiche': criminel.numero_fiche,
                        'nom': criminel.nom,
                        'prenom': criminel.prenom,
                        'nom_complet': criminel.nom_complet
                    },
                    'embedding': {
                        'dimensions': len(embedding) if embedding else 0,
                        'model': 'arcface-buffalo_l',
                        'embedding_id': embedding_id,
                    }
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'message': 'Erreur lors de la génération de l\'embedding',
                    'error': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )