"""
Vues pour la gestion des caméras et alertes multi-caméras.
"""

import logging
import base64
import os
from datetime import datetime, timezone
from io import BytesIO

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone as django_timezone
from django.db import transaction

from .models import Camera, UPRLog, CameraCapture
from .serializers import (
    CameraSerializer,
    UPRLogSerializer,
    AlertDetectionSerializer,
    CompareEmbeddingSerializer,
    CameraCaptureSerializer,
    CameraCaptureCreateSerializer
)
from .permissions_cameras import APIKeyPermission
from criminel.models import CriminalFicheCriminelle
from utilisateur.models import UtilisateurModel
from notifications.models import Notification
from audit.utils import log_action_detailed
from audit.narrative_audit_service import ajouter_action_narrative
from services.camera_service import CameraService, CameraUnavailableError, CameraCaptureError

logger = logging.getLogger(__name__)


class CameraViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des caméras.
    
    Endpoints:
    - GET /api/cameras/ : Liste toutes les caméras
    - GET /api/cameras/<id>/ : Détails d'une caméra
    - POST /api/cameras/scan/ : Scanner les caméras disponibles
    """
    
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        """Retourne la liste des caméras"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['post'], url_path='scan')
    def scan(self, request):
        """
        Scanne les caméras USB et IP disponibles.
        
        Retourne la liste des caméras détectées.
        """
        try:
            import cv2
            
            cameras_found = []
            
            # Scanner USB (0-5 par défaut)
            usb_max = int(os.getenv('CAMERAS_USB_MAX', '6'))
            logger.info(f"Scan des caméras USB (0 à {usb_max-1})...")
            
            for idx in range(usb_max):
                cap = cv2.VideoCapture(idx)
                if cap.isOpened():
                    ret, _ = cap.read()
                    if ret:
                        camera_id = f"usb_{idx}"
                        camera, created = Camera.objects.get_or_create(
                            camera_id=camera_id,
                            defaults={
                                'name': f'Caméra USB {idx}',
                                'source': str(idx),
                                'camera_type': 'usb',
                                'active': False
                            }
                        )
                        cameras_found.append(CameraSerializer(camera).data)
                        logger.info(f"  ✅ Caméra USB {idx} détectée")
                    cap.release()
            
            # Caméras IP depuis config
            cameras_ips = os.getenv('CAMERAS_IPS', '')
            if cameras_ips:
                urls = [url.strip() for url in cameras_ips.split(',') if url.strip()]
                for idx, url in enumerate(urls):
                    camera_id = f"ip_{idx}"
                    camera, created = Camera.objects.get_or_create(
                        camera_id=camera_id,
                        defaults={
                            'name': f'Caméra IP {idx}',
                            'source': url,
                            'camera_type': 'ip',
                            'active': False
                        }
                    )
                    cameras_found.append(CameraSerializer(camera).data)
            
            return Response({
                'success': True,
                'cameras': cameras_found,
                'count': len(cameras_found)
            }, status=status.HTTP_200_OK)
            
        except ImportError:
            return Response({
                'error': 'OpenCV non disponible. Installation requise: pip install opencv-python'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Erreur scan caméras: {e}", exc_info=True)
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AlertDetectionView(APIView):
    """
    Endpoint pour recevoir les alertes de détection depuis multi_camera_service.
    
    POST /api/upr/alert-detection/
    
    Payload:
    {
        "camera_id": "usb_0",
        "timestamp": "2025-12-08T10:30:00Z",
        "matches": [...],
        "best_match": {...},
        "frame_base64": "...",
        "detection_info": {...}
    }
    """
    
    permission_classes = [APIKeyPermission]  # Authentification via API key
    
    def post(self, request):
        """Reçoit une alerte de détection."""
        serializer = AlertDetectionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'error': 'Données invalides',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        camera_id = data['camera_id']
        matches = data.get('matches', [])
        best_match = data.get('best_match')
        frame_base64 = data.get('frame_base64', '')
        detection_info = data.get('detection_info', {})
        
        try:
            # Récupérer ou créer la caméra
            camera, _ = Camera.objects.get_or_create(
                camera_id=camera_id,
                defaults={
                    'name': f'Caméra {camera_id}',
                    'source': camera_id,
                    'camera_type': 'usb' if camera_id.startswith('usb_') else 'ip'
                }
            )
            
            # Mettre à jour les stats de la caméra
            camera.detection_count += 1
            camera.last_seen = django_timezone.now()
            camera.active = True
            camera.save()
            
            # Déterminer l'action
            match_type = detection_info.get('match_type', 'detection')
            if match_type == 'certain':
                action = 'match_certain'
            elif match_type == 'probable':
                action = 'match_probable'
            else:
                action = 'detection'
            
            # Extraire les IDs si correspondance
            criminal_id = None
            upr_id = None
            match_score = None
            
            if best_match:
                match_score = best_match.get('score', 0.0)
                criminal_id = best_match.get('criminal_id')
                upr_id = best_match.get('upr_id')
            
            # Stocker la frame si fournie
            frame_url = None
            if frame_base64 and settings.DEBUG:  # En production, utiliser S3
                try:
                    frame_data = base64.b64decode(frame_base64)
                    frame_file = ContentFile(frame_data, name=f'detection_{camera_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg')
                    frame_path = default_storage.save(f'upr/detections/{frame_file.name}', frame_file)
                    frame_url = default_storage.url(frame_path)
                except Exception as e:
                    logger.warning(f"Impossible de sauvegarder la frame: {e}")
            
            # Créer le log
            log_entry = UPRLog.objects.create(
                user=None,  # Auto-détection
                camera=camera,
                action=action,
                details={
                    'matches': matches,
                    'best_match': best_match,
                    'detection_info': detection_info,
                    'timestamp': data['timestamp']
                },
                criminal_id=criminal_id,
                upr_id=upr_id,
                match_score=match_score,
                frame_url=frame_url
            )
            
            # Générer une notification si correspondance certaine
            if action == 'match_certain' and criminal_id:
                self._create_notification(criminal_id, camera, match_score, log_entry.id)
            
            return Response({
                'success': True,
                'log_id': log_entry.id,
                'message': 'Alerte enregistrée avec succès'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur traitement alerte: {e}", exc_info=True)
            return Response({
                'error': 'Erreur lors du traitement de l\'alerte',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_notification(self, criminal_id, camera, score, log_id):
        """Crée une notification pour les utilisateurs autorisés."""
        try:
            # Créer notification pour les admins et enquêteurs
            users = UtilisateurModel.objects.filter(
                role__in=['administrateur', 'admin', 'Enquêteur Principal', 'Enquêteur']
            ).filter(statut='actif')
            
            for user in users:
                Notification.objects.create(
                    utilisateur=user,
                    type='error',  # Utiliser 'error' pour les alertes critiques
                    titre=f'🚨 Détection faciale - Caméra {camera.name}',
                    message=f'Correspondance détectée (score: {score:.2f}). Criminel ID: {criminal_id}',
                    lien=f'/criminels/{criminal_id}'
                )
        except Exception as e:
            logger.warning(f"Impossible de créer notification: {e}")


class CompareEmbeddingView(APIView):
    """
    Compare un embedding facial avec la base UPR et criminels.
    
    POST /api/upr/compare-embedding/
    
    Payload:
    {
        "embedding": [0.123, 0.456, ...],  # 512 dimensions
        "top_k": 3
    }
    """
    
    permission_classes = [APIKeyPermission]  # Authentification via API key
    
    def post(self, request):
        """Compare un embedding avec la base."""
        serializer = CompareEmbeddingSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'error': 'Données invalides',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        embedding = serializer.validated_data['embedding']
        top_k = serializer.validated_data.get('top_k', 3)
        
        try:
            import numpy as np
            from .models import UnidentifiedPerson
            
            embedding_np = np.array(embedding, dtype=np.float32)
            embedding_norm = embedding_np / np.linalg.norm(embedding_np)
            
            matches = []
            
            # Comparer avec UPR
            upr_list = UnidentifiedPerson.objects.exclude(
                face_embedding__isnull=True
            ).exclude(
                face_embedding=[]
            ).exclude(
                is_resolved=True
            ).exclude(
                is_archived=True
            )
            
            for upr in upr_list:
                if not upr.face_embedding:
                    continue
                
                upr_embedding = np.array(upr.face_embedding, dtype=np.float32)
                upr_embedding_norm = upr_embedding / np.linalg.norm(upr_embedding)
                
                # Distance cosinus (1 - similarité)
                similarity = np.dot(embedding_norm, upr_embedding_norm)
                distance = 1.0 - similarity
                
                matches.append({
                    'type': 'UPR',
                    'id': upr.id,
                    'upr_id': upr.id,
                    'code_upr': upr.code_upr,
                    'nom_temporaire': upr.nom_temporaire,
                    'score': float(similarity),
                    'distance': float(distance),
                    'is_strict_match': distance < 0.90,
                    'is_weak_match': distance < 1.20
                })
            
            # Comparer avec criminels (si embeddings disponibles)
            try:
                from biometrie.models import BiometriePhoto
                criminal_photos = BiometriePhoto.objects.exclude(
                    embedding_512__isnull=True
                ).exclude(
                    embedding_512=[]
                ).select_related('criminel')
                
                for photo in criminal_photos:
                    if not photo.embedding_512 or not photo.criminel:
                        continue
                    
                    crim_embedding = np.array(photo.embedding_512, dtype=np.float32)
                    crim_embedding_norm = crim_embedding / np.linalg.norm(crim_embedding)
                    
                    similarity = np.dot(embedding_norm, crim_embedding_norm)
                    distance = 1.0 - similarity
                    
                    fiche = photo.criminel
                    matches.append({
                        'type': 'CRIMINEL',
                        'id': fiche.id,
                        'criminal_id': fiche.id,
                        'numero_fiche': fiche.numero_fiche,
                        'nom': fiche.nom or '',
                        'prenom': fiche.prenom or '',
                        'score': float(similarity),
                        'distance': float(distance),
                        'is_strict_match': distance < 0.90,
                        'is_weak_match': distance < 1.20
                    })
            except Exception as e:
                logger.warning(f"Erreur comparaison avec criminels: {e}")
            
            # Trier par score décroissant et prendre top_k
            matches.sort(key=lambda x: x['score'], reverse=True)
            top_matches = matches[:top_k]
            
            return Response({
                'success': True,
                'matches': top_matches,
                'total_found': len(matches)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur comparaison embedding: {e}", exc_info=True)
            return Response({
                'error': 'Erreur lors de la comparaison',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UPRLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des logs UPR.
    
    Endpoints:
    - GET /api/upr/logs/ : Liste des logs
    - GET /api/upr/logs/<id>/ : Détails d'un log
    - POST /api/upr/logs/<id>/accept/ : Accepter une correspondance
    - POST /api/upr/logs/<id>/reject/ : Rejeter une correspondance
    """
    
    queryset = UPRLog.objects.all()
    serializer_class = UPRLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer les logs selon les paramètres"""
        queryset = UPRLog.objects.all()
        
        # Filtrer par action
        action_filter = self.request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)
        
        # Filtrer par caméra
        camera_id = self.request.query_params.get('camera_id')
        if camera_id:
            queryset = queryset.filter(camera__camera_id=camera_id)
        
        # Limiter les résultats
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        """Accepter une correspondance"""
        log_entry = self.get_object()
        
        if log_entry.action not in ['match_certain', 'match_probable']:
            return Response({
                'error': 'Cette action ne peut être acceptée que pour les correspondances'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mettre à jour le log
        log_entry.action = 'accepted'
        log_entry.user = request.user
        log_entry.save()
        
        # Loguer l'action
        log_action_detailed(
            user=request.user,
            action='upr_match_accepted',
            model_name='UPRLog',
            object_id=log_entry.id,
            details={
                'criminal_id': log_entry.criminal_id,
                'upr_id': log_entry.upr_id,
                'score': log_entry.match_score
            }
        )
        
        return Response({
            'success': True,
            'message': 'Correspondance acceptée',
            'log': UPRLogSerializer(log_entry).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Rejeter une correspondance"""
        log_entry = self.get_object()
        
        if log_entry.action not in ['match_certain', 'match_probable']:
            return Response({
                'error': 'Cette action ne peut être rejetée que pour les correspondances'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mettre à jour le log
        log_entry.action = 'rejected'
        log_entry.user = request.user
        log_entry.save()
        
        # Loguer l'action
        log_action_detailed(
            user=request.user,
            action='upr_match_rejected',
            model_name='UPRLog',
            object_id=log_entry.id,
            details={
                'criminal_id': log_entry.criminal_id,
                'upr_id': log_entry.upr_id,
                'score': log_entry.match_score
            }
        )
        
        return Response({
            'success': True,
            'message': 'Correspondance rejetée',
            'log': UPRLogSerializer(log_entry).data
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_check_cameras(request):
    """
    Health check endpoint pour les caméras.
    
    GET /api/health/cameras/
    """
    try:
        total_cameras = Camera.objects.count()
        active_cameras = Camera.objects.filter(active=True).count()
        
        last_detection = UPRLog.objects.order_by('-created_at').first()
        last_detection_time = last_detection.created_at.isoformat() if last_detection else None
        
        return Response({
            'status': 'healthy',
            'active_streams': active_cameras,
            'total_cameras': total_cameras,
            'last_detection': last_detection_time
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CameraCaptureViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des captures caméra.
    
    Endpoints:
    - GET /api/upr/captures/ : Liste toutes les captures
    - GET /api/upr/captures/<id>/ : Détails d'une capture
    - POST /api/upr/captures/ : Créer une nouvelle capture
    - DELETE /api/upr/captures/<id>/ : Supprimer une capture
    """
    
    queryset = CameraCapture.objects.all()
    serializer_class = CameraCaptureSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtre les captures selon les paramètres."""
        queryset = CameraCapture.objects.select_related('user', 'camera', 'criminel', 'suspect_upr')
        
        # Filtrer par utilisateur (utilisateur connecté uniquement, sauf admin)
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        
        # Filtrer par caméra
        camera_id = self.request.query_params.get('camera_id')
        if camera_id:
            queryset = queryset.filter(camera__camera_id=camera_id)
        
        # Filtrer par type de caméra
        camera_type = self.request.query_params.get('camera_type')
        if camera_type:
            queryset = queryset.filter(camera_type=camera_type)
        
        # Filtrer par fiche criminelle
        criminel_id = self.request.query_params.get('criminel_id')
        if criminel_id:
            queryset = queryset.filter(criminel_id=criminel_id)
        
        # Filtrer par suspect UPR
        suspect_upr_id = self.request.query_params.get('suspect_upr_id')
        if suspect_upr_id:
            queryset = queryset.filter(suspect_upr_id=suspect_upr_id)
        
        return queryset.order_by('-captured_at')
    
    @action(detail=False, methods=['post'], url_path='capture')
    def capture(self, request):
        """
        Capture une image depuis une caméra spécifique.
        
        POST /api/upr/captures/capture/
        
        Body:
        {
            "camera_index": 0,  // 0 = intégrée, 1 = USB externe
            "criminel_id": 123,  // optionnel
            "suspect_upr_id": 456,  // optionnel
            "notes": "Observation..."  // optionnel
        }
        """
        serializer = CameraCaptureCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'error': 'Données invalides',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        camera_index = serializer.validated_data['camera_index']
        criminel_id = serializer.validated_data.get('criminel_id')
        suspect_upr_id = serializer.validated_data.get('suspect_upr_id')
        notes = serializer.validated_data.get('notes', '')
        
        try:
            camera_service = CameraService()
            
            # Capturer l'image
            try:
                image_file, metadata = camera_service.capture_image_as_file(camera_index)
            except CameraUnavailableError as e:
                logger.warning(f"Caméra non disponible: {e}")
                return Response({
                    'error': 'Caméra non disponible',
                    'message': str(e),
                    'camera_index': camera_index
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except CameraCaptureError as e:
                logger.error(f"Erreur de capture: {e}")
                return Response({
                    'error': 'Erreur de capture',
                    'message': str(e),
                    'camera_index': camera_index
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Récupérer ou créer l'objet Camera
            camera_type = 'integree' if camera_index == 0 else 'usb'
            camera_id = f"usb_{camera_index}" if camera_index > 0 else "integree_0"
            
            camera, _ = Camera.objects.get_or_create(
                camera_id=camera_id,
                defaults={
                    'name': camera_service.get_camera_type_display(camera_index),
                    'source': str(camera_index),
                    'camera_type': camera_type,
                    'active': True
                }
            )
            
            # Mettre à jour les stats de la caméra
            camera.last_seen = django_timezone.now()
            camera.active = True
            camera.frame_count += 1
            camera.save()
            
            # Récupérer les objets liés si fournis
            criminel = None
            suspect_upr = None
            
            if criminel_id:
                try:
                    criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
                except CriminalFicheCriminelle.DoesNotExist:
                    return Response({
                        'error': 'Fiche criminelle non trouvée',
                        'criminel_id': criminel_id
                    }, status=status.HTTP_404_NOT_FOUND)
            
            if suspect_upr_id:
                try:
                    from .models import UnidentifiedPerson
                    suspect_upr = UnidentifiedPerson.objects.get(id=suspect_upr_id)
                except UnidentifiedPerson.DoesNotExist:
                    return Response({
                        'error': 'Suspect UPR non trouvé',
                        'suspect_upr_id': suspect_upr_id
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Créer l'enregistrement de capture
            capture = CameraCapture.objects.create(
                user=request.user,
                camera=camera,
                camera_index=camera_index,
                camera_type=camera_type,
                image=image_file,
                criminel=criminel,
                suspect_upr=suspect_upr,
                capture_metadata=metadata,
                notes=notes
            )
            
            # Générer le journal d'audit narratif
            try:
                _generate_narrative_audit_for_capture(request, capture)
            except Exception as e:
                logger.warning(f"Erreur lors de la génération du journal d'audit: {e}")
            
            # Logger l'action détaillée
            log_action_detailed(
                user=request.user,
                action='camera_capture',
                model_name='CameraCapture',
                object_id=capture.id,
                details={
                    'camera_index': camera_index,
                    'camera_type': camera_type,
                    'criminel_id': criminel_id,
                    'suspect_upr_id': suspect_upr_id,
                    'metadata': metadata
                }
            )
            
            return Response(
                CameraCaptureSerializer(capture, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de la capture: {e}", exc_info=True)
            return Response({
                'error': 'Erreur lors de la capture',
                'details': str(e) if getattr(settings, 'DEBUG', False) else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='available')
    def list_available_cameras(self, request):
        """
        Liste les caméras disponibles pour capture.
        
        GET /api/upr/captures/available/
        """
        try:
            camera_service = CameraService()
            cameras = camera_service.list_available_cameras()
            
            return Response({
                'success': True,
                'cameras': cameras,
                'count': len(cameras)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la liste des caméras: {e}", exc_info=True)
            return Response({
                'error': 'Erreur lors de la détection des caméras',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CaptureUSBCameraView(APIView):
    """
    Vue API dédiée pour la capture depuis la webcam USB externe.
    
    Détecte automatiquement la caméra USB et capture une image.
    
    POST /api/upr/captures/usb/
    
    Body:
    {
        "criminel_id": 123,  // optionnel
        "suspect_upr_id": 456,  // optionnel
        "notes": "Observation..."  // optionnel
    }
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Capture une image depuis la caméra USB externe."""
        criminel_id = request.data.get('criminel_id')
        suspect_upr_id = request.data.get('suspect_upr_id')
        notes = request.data.get('notes', '')
        
        try:
            camera_service = CameraService()
            
            # Capturer depuis la caméra USB (détection automatique)
            try:
                image_file, metadata = CameraService.capture_from_usb()
            except CameraUnavailableError as e:
                logger.warning(f"Caméra USB non disponible: {e}")
                return Response({
                    'error': 'Caméra USB non disponible',
                    'message': str(e)
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except CameraCaptureError as e:
                logger.error(f"Erreur de capture USB: {e}")
                return Response({
                    'error': 'Erreur de capture',
                    'message': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Récupérer ou créer l'objet Camera pour USB
            camera_id = f"usb_auto"
            camera, _ = Camera.objects.get_or_create(
                camera_id=camera_id,
                defaults={
                    'name': 'Caméra USB externe (détection auto)',
                    'source': 'auto',
                    'camera_type': 'usb',
                    'active': True
                }
            )
            
            # Mettre à jour les stats de la caméra
            camera.last_seen = django_timezone.now()
            camera.active = True
            camera.frame_count += 1
            camera.save()
            
            # Extraire l'index de la caméra depuis les métadonnées
            camera_index = metadata.get('camera_index', 1)
            
            # Récupérer les objets liés si fournis
            criminel = None
            suspect_upr = None
            
            if criminel_id:
                try:
                    criminel = CriminalFicheCriminelle.objects.get(id=criminel_id)
                except CriminalFicheCriminelle.DoesNotExist:
                    return Response({
                        'error': 'Fiche criminelle non trouvée',
                        'criminel_id': criminel_id
                    }, status=status.HTTP_404_NOT_FOUND)
            
            if suspect_upr_id:
                try:
                    from .models import UnidentifiedPerson
                    suspect_upr = UnidentifiedPerson.objects.get(id=suspect_upr_id)
                except UnidentifiedPerson.DoesNotExist:
                    return Response({
                        'error': 'Suspect UPR non trouvé',
                        'suspect_upr_id': suspect_upr_id
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Créer l'enregistrement de capture
            capture = CameraCapture.objects.create(
                user=request.user,
                camera=camera,
                camera_index=camera_index,
                camera_type='usb',
                image=image_file,
                criminel=criminel,
                suspect_upr=suspect_upr,
                capture_metadata=metadata,
                notes=notes
            )
            
            # Générer le journal d'audit narratif
            try:
                _generate_narrative_audit_for_capture(request, capture)
            except Exception as e:
                logger.warning(f"Erreur lors de la génération du journal d'audit: {e}")
            
            # Logger l'action détaillée
            log_action_detailed(
                user=request.user,
                action='camera_capture_usb',
                model_name='CameraCapture',
                object_id=capture.id,
                details={
                    'camera_index': camera_index,
                    'camera_type': 'usb',
                    'criminel_id': criminel_id,
                    'suspect_upr_id': suspect_upr_id,
                    'metadata': metadata,
                    'auto_detected': True
                }
            )
            
            return Response(
                CameraCaptureSerializer(capture, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de la capture USB: {e}", exc_info=True)
            return Response({
                'error': 'Erreur lors de la capture USB',
                'details': str(e) if getattr(settings, 'DEBUG', False) else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _generate_narrative_audit_for_capture(request, capture: CameraCapture):
    """
    Génère une entrée narrative dans le journal d'audit pour une capture.
    
    Args:
        request: Objet request Django
        capture: Objet CameraCapture créé
    """
    try:
        # Récupérer la session utilisateur si disponible
        session = getattr(request, 'user_session', None)
        
        if not session:
            # Essayer de récupérer la session depuis l'audit
            try:
                from audit.models import UserSession
                session = UserSession.objects.filter(
                    user=request.user,
                    is_active=True
                ).order_by('-created_at').first()
            except Exception:
                pass
        
        if session:
            # Construire les détails de l'action
            details = {
                'resource_type': 'capture_camera',
                'resource_id': capture.id,
                'camera_type': capture.get_camera_type_display(),
                'camera_index': capture.camera_index,
            }
            
            if capture.criminel:
                details['criminel_id'] = capture.criminel.id
                details['numero_fiche'] = capture.criminel.numero_fiche
                details['criminel_nom'] = f"{capture.criminel.nom or ''} {capture.criminel.prenom or ''}".strip()
            
            if capture.suspect_upr:
                details['upr_id'] = capture.suspect_upr.id
                details['upr_code'] = capture.suspect_upr.code_upr
            
            # Générer la phrase narrative
            user_display = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            camera_display = capture.get_camera_type_display()
            heure = capture.captured_at.strftime('%Hh%M')
            
            phrase_parts = [f"{user_display} a utilisé {camera_display} pour capturer une image à {heure}."]
            
            if capture.criminel:
                nom_criminel = details.get('criminel_nom', capture.criminel.numero_fiche)
                phrase_parts.append(f"La capture est associée à la fiche criminelle {nom_criminel} (référence {capture.criminel.numero_fiche}).")
            
            if capture.suspect_upr:
                phrase_parts.append(f"La capture est associée au suspect non identifié {capture.suspect_upr.code_upr} ({capture.suspect_upr.nom_temporaire}).")
            
            if capture.notes:
                phrase_parts.append(f"Note: {capture.notes}")
            
            # Ajouter l'action narrative
            ajouter_action_narrative(
                session=session,
                action_type='capture_camera',
                details=details,
                request=request
            )
            
            # Ajouter aussi la phrase personnalisée si possible
            try:
                from audit.models import JournalAuditNarratif
                journal = getattr(session, 'journal_narratif', None)
                if journal and not journal.est_cloture:
                    phrase_complete = ' '.join(phrase_parts)
                    journal.ajouter_phrase_narrative(phrase_complete)
            except Exception:
                pass
                
    except Exception as e:
        logger.warning(f"Impossible de générer le journal d'audit narratif pour la capture {capture.id}: {e}")

