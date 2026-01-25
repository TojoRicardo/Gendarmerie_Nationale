"""
Views complètes pour le module UPR avec extraction automatique et matching.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from django.conf import settings

from .models import UnidentifiedPerson, UPRMatchLog, CriminelMatchLog
from .serializers import (
    UnidentifiedPersonSerializer,
    UnidentifiedPersonCreateSerializer,
    UnidentifiedPersonListSerializer,
    MatchResultSerializer
)
from .services.face_processing import extract_face_data
from .services.face_matching import find_matches_for_upr
from .services.photo_verification import check_existing_upr_photo, search_by_photo
from .services.face_recognition_service import (
    capture_face_from_camera,
    extract_face_encoding,
    compare_with_existing_faces,
    save_image_to_storage,
    get_face_recognition_available
)
from audit.utils import log_action_detailed

logger = logging.getLogger(__name__)


class UnidentifiedPersonViewSet(viewsets.ModelViewSet):
    """
    ViewSet complet pour la gestion des UPR avec extraction automatique.
    
    Endpoints:
    - POST /upr/ : Créer un UPR avec extraction automatique
    - GET /upr/ : Liste tous les UPR
    - GET /upr/<id>/ : Détails d'un UPR
    - PUT /upr/<id>/ : Mise à jour complète
    - PATCH /upr/<id>/ : Mise à jour partielle
    - DELETE /upr/<id>/ : Supprimer un UPR
    - GET /upr/<id>/matches/ : Correspondances trouvées
    - POST /upr/<id>/merge-to-criminel/ : Fusionner UPR vers criminel
    """
    
    queryset = UnidentifiedPerson.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action."""
        if self.action == 'list':
            return UnidentifiedPersonListSerializer
        elif self.action == 'create':
            return UnidentifiedPersonCreateSerializer
        return UnidentifiedPersonSerializer
    
    def get_queryset(self):
        """Retourne la liste des UPR triés par date d'enregistrement."""
        queryset = UnidentifiedPerson.objects.all().order_by('-date_enregistrement')
        
        # Filtrer par statut de résolution si demandé
        is_resolved = self.request.query_params.get('is_resolved', None)
        if is_resolved is not None:
            is_resolved_bool = is_resolved.lower() == 'true'
            queryset = queryset.filter(is_resolved=is_resolved_bool)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """
        Crée un nouvel UPR avec extraction automatique complète.
        
        Processus:
        1. Upload des images
        2. Extraction des 106 landmarks
        3. Extraction de l'embedding ArcFace 512D
        4. Création de l'UPR
        5. Comparaison automatique avec UPR existants et fiches criminelles
        6. Retour des correspondances trouvées
        
        Accepte:
        - profil_face (obligatoire): fichier image
        - profil_left (optionnel): fichier image
        - profil_right (optionnel): fichier image
        - empreinte_digitale (optionnel): fichier image
        - context_location (optionnel): string
        - discovered_date (optionnel): datetime
        - notes (optionnel): texte
        """
        serializer = self.get_serializer(data=request.data, context={'created_by': request.user})
        serializer.is_valid(raise_exception=True)
        
        # Vérifier les doublons AVANT de sauvegarder
        profil_face_file = request.FILES.get('profil_face')
        if profil_face_file:
            duplicate_check = check_existing_upr_photo(
                uploaded_image=profil_face_file,
                exclude_upr_id=None  # Pas d'exclusion lors de la création
            )
            
            if duplicate_check and duplicate_check.get('existing_upr'):
                # Retourner une réponse indiquant que l'UPR existe déjà
                return Response({
                    'existing_upr': True,
                    'message': 'Cette photo correspond à un UPR déjà enregistré dans le système.',
                    'upr_id': duplicate_check['upr_id'],
                    'code_upr': duplicate_check['code_upr'],
                    'nom_temporaire': duplicate_check['nom_temporaire'],
                    'similarity_score': duplicate_check['similarity_score'],
                    'profil_face_url': duplicate_check['profil_face_url'],
                    'context_location': duplicate_check.get('context_location', ''),
                    'discovered_date': duplicate_check.get('discovered_date'),
                    'upr_url': f'/api/upr/{duplicate_check["upr_id"]}/'
                }, status=status.HTTP_200_OK)
        
        try:
            with transaction.atomic():
                # Créer l'UPR en utilisant le serializer pour gérer correctement les fichiers
                # Remettre le fichier au début si nécessaire
                if profil_face_file and hasattr(profil_face_file, 'seek'):
                    try:
                        profil_face_file.seek(0)
                    except:
                        pass  # Si le fichier ne supporte pas seek, continuer quand même
                
                upr = serializer.save()  # Génère code_upr et nom_temporaire
                
                # Vérifier que le fichier a été correctement sauvegardé
                if upr.profil_face:
                    logger.info(f"Fichier profil_face sauvegardé: {upr.profil_face.name} (URL: {upr.profil_face.url})")
                else:
                    logger.warning(f"UPR {upr.code_upr} créé sans fichier profil_face")
                
                logger.info(f"UPR créé: {upr.code_upr} par utilisateur {request.user.id}")
                
                # Extraction biométrique automatique
                extraction_result = None
                matches_result = None
                
                if upr.profil_face:
                    logger.info(f"Début extraction biométrique pour UPR {upr.code_upr}...")
                    
                    # Extraction des données faciales
                    extraction_result = extract_face_data(upr.profil_face)
                    
                    if extraction_result.get("success"):
                        # Sauvegarder les landmarks et l'embedding
                        upr.landmarks_106 = extraction_result.get("landmarks")
                        upr.face_embedding = extraction_result.get("embedding")
                        upr.save(update_fields=['landmarks_106', 'face_embedding'])
                        
                        logger.info(f"Extraction réussie pour UPR {upr.code_upr}")
                        
                        # Recherche automatique de correspondances
                        logger.info(f"Début recherche de correspondances pour UPR {upr.code_upr}...")
                        matches_result = find_matches_for_upr(upr)
                        
                        logger.info(f"Recherche terminée: {matches_result.get('total_matches', 0)} correspondance(s)")
                        
                        # Recalculer les correspondances pour tous les autres UPR existants
                        # pour qu'ils détectent ce nouvel UPR
                        logger.info("Recalcul des correspondances pour les autres UPR existants...")
                        from upr.models import UnidentifiedPerson
                        other_uprs = UnidentifiedPerson.objects.filter(
                            ~Q(id=upr.id),
                            face_embedding__isnull=False,
                            is_resolved=False
                        ).exclude(face_embedding=None)
                        
                        for other_upr in other_uprs:
                            try:
                                find_matches_for_upr(other_upr)
                            except Exception as e:
                                logger.warning(f"Erreur lors du recalcul des correspondances pour UPR {other_upr.code_upr}: {e}")
                    else:
                        error_msg = extraction_result.get("error", "Erreur inconnue")
                        logger.warning(f"Échec extraction pour UPR {upr.code_upr}: {error_msg}")
                
                # Audit logging
                log_action_detailed(
                    request=request,
                    user=request.user,
                    action='CREATE',
                    resource_type='UPR',
                    resource_id=upr.id,
                    endpoint=request.path,
                    method=request.method,
                    data_after={
                        'code_upr': upr.code_upr,
                        'extraction_success': extraction_result.get("success") if extraction_result else False,
                        'matches_found': matches_result.get('total_matches', 0) if matches_result else 0
                    },
                    reussi=True
                )
                
                # Préparer la réponse
                response_serializer = UnidentifiedPersonSerializer(upr, context={'request': request})
                response_data = response_serializer.data
                
                # Ajouter les résultats de matching et les alertes
                if matches_result:
                    upr_matches = matches_result.get('upr_matches', [])
                    criminel_matches = matches_result.get('criminel_matches', [])
                    total_matches = matches_result.get('total_matches', 0)
                    
                    strict_upr_matches = [m for m in upr_matches if m.get('is_strict_match', False)]
                    strict_criminel_matches = [m for m in criminel_matches if m.get('is_strict_match', False)]
                    
                    response_data['matches'] = {
                        'upr_matches': upr_matches,
                        'criminel_matches': criminel_matches,
                        'total_matches': total_matches,
                        'strict_matches': len(strict_upr_matches) + len(strict_criminel_matches),
                        'has_duplicate': len(strict_upr_matches) > 0 or len(strict_criminel_matches) > 0
                    }
                    
                    # Ajouter un message d'alerte si des doublons sont détectés
                    if strict_upr_matches or strict_criminel_matches:
                        duplicate_messages = []
                        
                        if strict_upr_matches:
                            for match in strict_upr_matches[:3]:  # Limiter à 3 pour éviter un message trop long
                                duplicate_messages.append(
                                    f"UPR {match.get('code_upr')} ({match.get('nom_temporaire')}) - "
                                    f"Distance: {match.get('distance', 0):.4f}"
                                )
                        
                        if strict_criminel_matches:
                            for match in strict_criminel_matches[:3]:
                                duplicate_messages.append(
                                    f"Criminel {match.get('numero_fiche')} - "
                                    f"{match.get('nom')} {match.get('prenom')} - "
                                    f"Distance: {match.get('distance', 0):.4f}"
                                )
                        
                        response_data['duplicate_warning'] = {
                            'message': f"⚠️ Doublon détecté ! Cette personne existe déjà dans la base de données.",
                            'details': duplicate_messages,
                            'count': len(strict_upr_matches) + len(strict_criminel_matches)
                        }
                        
                        logger.warning(
                            f"Doublon détecté pour UPR {upr.code_upr}: "
                            f"{len(strict_upr_matches)} UPR(s) et {len(strict_criminel_matches)} Criminel(s)"
                        )
                else:
                    response_data['matches'] = {
                        'upr_matches': [],
                        'criminel_matches': [],
                        'total_matches': 0
                    }
                
                # Ajouter les informations d'extraction
                if extraction_result:
                    response_data['extraction'] = {
                        'success': extraction_result.get('success', False),
                        'error': extraction_result.get('error'),
                        'confidence': extraction_result.get('confidence')
                    }
                
                return Response(
                    response_data,
                    status=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            logger.error(f"Erreur lors de la création de l'UPR: {e}", exc_info=True)
            
            # Audit logging pour l'erreur
            log_action_detailed(
                request=request,
                user=request.user,
                action='CREATE',
                resource_type='UPR',
                endpoint=request.path,
                method=request.method,
                reussi=False,
                message_erreur=str(e)
            )
            
            return Response(
                {'error': f'Erreur lors de la création: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """Récupère les détails d'un UPR."""
        upr = get_object_or_404(UnidentifiedPerson, pk=pk)
        serializer = self.get_serializer(upr, context={'request': request})
        return Response(serializer.data)
    
    def list(self, request):
        """Liste tous les UPR."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    def update(self, request, pk=None):
        """Met à jour un UPR (PUT complet)."""
        upr = get_object_or_404(UnidentifiedPerson, pk=pk)
        serializer = self.get_serializer(upr, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Si une nouvelle photo de face est fournie, réextraire
            if 'profil_face' in request.data and request.data['profil_face'] != upr.profil_face:
                extraction_result = extract_face_data(request.data['profil_face'])
                if extraction_result.get("success"):
                    serializer.validated_data['landmarks_106'] = extraction_result.get("landmarks")
                    serializer.validated_data['face_embedding'] = extraction_result.get("embedding")
            
            serializer.save()
            logger.info(f"UPR {upr.code_upr} mis à jour par utilisateur {request.user.id}")
            
            # Audit logging
            log_action_detailed(
                request=request,
                user=request.user,
                action='UPDATE',
                resource_type='UPR',
                resource_id=upr.id,
                endpoint=request.path,
                method=request.method,
                reussi=True
            )
            
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de l'UPR: {e}", exc_info=True)
            return Response(
                {'error': f'Erreur lors de la mise à jour: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def partial_update(self, request, pk=None):
        """Met à jour partiellement un UPR (PATCH)."""
        upr = get_object_or_404(UnidentifiedPerson, pk=pk)
        serializer = self.get_serializer(upr, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Si une nouvelle photo de face est fournie, réextraire
            if 'profil_face' in request.data and request.data['profil_face'] != upr.profil_face:
                extraction_result = extract_face_data(request.data['profil_face'])
                if extraction_result.get("success"):
                    serializer.validated_data['landmarks_106'] = extraction_result.get("landmarks")
                    serializer.validated_data['face_embedding'] = extraction_result.get("embedding")
            
            serializer.save()
            logger.info(f"UPR {upr.code_upr} partiellement mis à jour par utilisateur {request.user.id}")
            
            # Audit logging
            log_action_detailed(
                request=request,
                user=request.user,
                action='UPDATE',
                resource_type='UPR',
                resource_id=upr.id,
                endpoint=request.path,
                method=request.method,
                reussi=True
            )
            
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour partielle: {e}", exc_info=True)
            return Response(
                {'error': f'Erreur lors de la mise à jour: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, pk=None):
        """Supprime un UPR."""
        upr = get_object_or_404(UnidentifiedPerson, pk=pk)
        code_upr = upr.code_upr
        
        try:
            upr.delete()
            logger.info(f"UPR {code_upr} supprimé par utilisateur {request.user.id}")
            
            # Audit logging
            log_action_detailed(
                request=request,
                user=request.user,
                action='DELETE',
                resource_type='UPR',
                resource_id=pk,
                endpoint=request.path,
                method=request.method,
                reussi=True
            )
            
            return Response(
                {'message': f'UPR {code_upr} supprimé avec succès'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'UPR: {e}", exc_info=True)
            return Response(
                {'error': f'Erreur lors de la suppression: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'], url_path='matches')
    def matches(self, request, pk=None):
        """
        Retourne les correspondances trouvées pour cet UPR.
        
        Retourne:
        - upr_matches: Liste des correspondances avec d'autres UPR
        - criminel_matches: Liste des correspondances avec des fiches criminelles
        """
        upr = get_object_or_404(UnidentifiedPerson, pk=pk)
        
        # Récupérer les correspondances depuis les logs
        upr_matches = UPRMatchLog.objects.filter(upr_source=upr).select_related('upr_target')
        criminel_matches = CriminelMatchLog.objects.filter(upr_source=upr).select_related('criminel_target')
        
        # Sérialiser les résultats
        upr_matches_data = []
        for match in upr_matches:
            upr_matches_data.append({
                'type': 'UPR',
                'id': match.upr_target.id,
                'code_upr': match.upr_target.code_upr,
                'nom_temporaire': match.upr_target.nom_temporaire,
                'distance': match.distance,
                'is_strict_match': match.is_strict_match,
                'is_weak_match': match.is_weak_match,
                'match_date': match.match_date,
                'match_log_id': match.id
            })
        
        criminel_matches_data = []
        for match in criminel_matches:
            criminel_matches_data.append({
                'type': 'CRIMINEL',
                'id': match.criminel_target.id,
                'numero_fiche': match.criminel_target.numero_fiche,
                'nom': match.criminel_target.nom,
                'prenom': match.criminel_target.prenom,
                'distance': match.distance,
                'is_strict_match': match.is_strict_match,
                'is_weak_match': match.is_weak_match,
                'match_date': match.match_date,
                'match_log_id': match.id
            })
        
        return Response({
            'upr_matches': upr_matches_data,
            'criminel_matches': criminel_matches_data,
            'total_matches': len(upr_matches_data) + len(criminel_matches_data)
        })
    
    @action(detail=False, methods=['post'], url_path='search-by-photo')
    def search_by_photo(self, request):
        """
        Recherche par photo dans les UPR et les photos criminelles.
        
        POST /upr/search-by-photo/
        - photo: fichier image (obligatoire)
        - threshold: seuil de similarité (optionnel, défaut: 0.35)
        - top_k: nombre maximum de résultats (optionnel, défaut: 10)
        """
        photo_file = request.FILES.get('photo') or request.FILES.get('image')
        if not photo_file:
            return Response(
                {'error': 'Aucune photo fournie'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            threshold = float(request.data.get('threshold', 0.35))
            top_k = int(request.data.get('top_k', 10))
        except (ValueError, TypeError):
            threshold = 0.35
            top_k = 10
        
        try:
            results = search_by_photo(
                uploaded_image=photo_file,
                threshold=threshold,
                top_k=top_k
            )
            
            return Response(results, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la recherche par photo: {e}", exc_info=True)
            return Response(
                {'error': f'Erreur lors de la recherche: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Retourne les statistiques globales des UPR.
        
        GET /upr/statistics/
        """
        from django.db.models import Count, Q, Avg
        from django.utils import timezone
        from datetime import timedelta
        
        # Statistiques de base
        total_upr = UnidentifiedPerson.objects.count()
        resolved_upr = UnidentifiedPerson.objects.filter(is_resolved=True).count()
        unresolved_upr = total_upr - resolved_upr
        
        # UPR avec données biométriques
        upr_with_embedding = UnidentifiedPerson.objects.filter(face_embedding__isnull=False).exclude(face_embedding=None).count()
        upr_with_fingerprint = UnidentifiedPerson.objects.filter(empreinte_digitale__isnull=False).exclude(empreinte_digitale=None).count()
        
        # Correspondances
        total_upr_matches = UPRMatchLog.objects.count()
        total_criminel_matches = CriminelMatchLog.objects.count()
        strict_matches = UPRMatchLog.objects.filter(is_strict_match=True).count() + CriminelMatchLog.objects.filter(is_strict_match=True).count()
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        evolution_data = []
        for i in range(30):
            date = timezone.now() - timedelta(days=29-i)
            count = UnidentifiedPerson.objects.filter(
                date_enregistrement__date=date.date()
            ).count()
            evolution_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'label': date.strftime('%d/%m'),
                'count': count
            })
        
        # Répartition par statut
        status_distribution = [
            {'name': 'Résolus', 'value': resolved_upr, 'color': '#10B981'},
            {'name': 'Non résolus', 'value': unresolved_upr, 'color': '#F59E0B'},
        ]
        
        # Correspondances par type
        matches_by_type = [
            {'name': 'UPR ↔ UPR', 'value': total_upr_matches, 'color': '#3B82F6'},
            {'name': 'UPR ↔ Criminel', 'value': total_criminel_matches, 'color': '#EF4444'},
        ]
        
        # UPR créés ce mois
        this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        upr_this_month = UnidentifiedPerson.objects.filter(date_enregistrement__gte=this_month_start).count()
        
        # Taux de résolution
        resolution_rate = (resolved_upr / total_upr * 100) if total_upr > 0 else 0
        
        return Response({
            'total_upr': total_upr,
            'resolved_upr': resolved_upr,
            'unresolved_upr': unresolved_upr,
            'upr_with_embedding': upr_with_embedding,
            'upr_with_fingerprint': upr_with_fingerprint,
            'total_matches': total_upr_matches + total_criminel_matches,
            'strict_matches': strict_matches,
            'upr_this_month': upr_this_month,
            'resolution_rate': round(resolution_rate, 2),
            'evolution': evolution_data,
            'status_distribution': status_distribution,
            'matches_by_type': matches_by_type,
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='merge-to-criminel')
    def merge_to_criminel(self, request, pk=None):
        """
        Fusionne un UPR vers une fiche criminelle identifiée.
        
        Processus:
        1. Vérifier que l'UPR n'est pas déjà résolu
        2. Récupérer la fiche criminelle cible
        3. Transférer les photos et embeddings vers la fiche criminelle
        4. Marquer l'UPR comme résolu
        5. Enregistrer l'audit
        
        Body:
        - criminel_id: ID de la fiche criminelle cible
        """
        upr = get_object_or_404(UnidentifiedPerson, pk=pk)
        
        if upr.is_resolved:
            return Response(
                {'error': f'UPR {upr.code_upr} est déjà résolu'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        criminel_id = request.data.get('criminel_id')
        if not criminel_id:
            return Response(
                {'error': 'criminel_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from criminel.models import CriminalFicheCriminelle
        criminel = get_object_or_404(CriminalFicheCriminelle, pk=criminel_id)
        
        try:
            with transaction.atomic():
                # Transférer les données vers la fiche criminelle via le module biometrie
                from biometrie.models import Biometrie, BiometriePhoto
                from biometrie.arcface_service import ArcFaceService
                
                # Créer une entrée biométrique si elle n'existe pas
                biometrie, created = Biometrie.objects.get_or_create(
                    criminel=criminel,
                    defaults={
                        'encodage_facial': None  # Sera mis à jour si embedding disponible
                    }
                )
                
                # Si l'UPR a un embedding, le transférer
                if upr.face_embedding:
                    arcface_service = ArcFaceService()
                    if arcface_service.available:
                        # Sérialiser l'embedding
                        embedding_serialized = arcface_service.serialize_embedding(upr.face_embedding)
                        biometrie.encodage_facial = embedding_serialized
                        biometrie.save(update_fields=['encodage_facial'])
                
                # Transférer les photos vers BiometriePhoto
                if upr.profil_face:
                    BiometriePhoto.objects.create(
                        criminel=criminel,
                        image=upr.profil_face,
                        type_photo='face',
                        encodage_facial=biometrie.encodage_facial if biometrie.encodage_facial else None
                    )
                
                if upr.profil_left:
                    BiometriePhoto.objects.create(
                        criminel=criminel,
                        image=upr.profil_left,
                        type_photo='profil_gauche'
                    )
                
                if upr.profil_right:
                    BiometriePhoto.objects.create(
                        criminel=criminel,
                        image=upr.profil_right,
                        type_photo='profil_droit'
                    )
                
                # Marquer l'UPR comme résolu
                upr.is_resolved = True
                upr.resolved_at = timezone.now()
                upr.resolved_to_criminel = criminel
                upr.save(update_fields=['is_resolved', 'resolved_at', 'resolved_to_criminel'])
                
                logger.info(f"UPR {upr.code_upr} fusionné vers criminel {criminel.numero_fiche} par utilisateur {request.user.id}")
                
                # Audit logging
                log_action_detailed(
                    request=request,
                    user=request.user,
                    action='UPDATE',
                    resource_type='UPR',
                    resource_id=upr.id,
                    endpoint=request.path,
                    method=request.method,
                    data_after={
                        'code_upr': upr.code_upr,
                        'resolved_to_criminel': criminel.numero_fiche,
                        'resolved_at': upr.resolved_at.isoformat()
                    },
                    reussi=True
                )
                
                return Response({
                    'message': f'UPR {upr.code_upr} fusionné avec succès vers {criminel.numero_fiche}',
                    'upr': UnidentifiedPersonSerializer(upr, context={'request': request}).data,
                    'criminel': {
                        'id': criminel.id,
                        'numero_fiche': criminel.numero_fiche,
                        'nom': criminel.nom,
                        'prenom': criminel.prenom
                    }
                })
                
        except Exception as e:
            logger.error(f"Erreur lors de la fusion UPR vers criminel: {e}", exc_info=True)
            return Response(
                {'error': f'Erreur lors de la fusion: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ScanUPRView(APIView):
    """
    Vue API pour scanner et créer une UPR depuis une caméra USB.
    
    Utilise face_recognition pour :
    1. Capturer une image depuis la caméra USB
    2. Détecter et extraire l'encoding facial (128D)
    3. Comparer avec les UPR existants
    4. Créer une nouvelle UPR si aucune correspondance n'est trouvée
    
    Endpoint:
    POST /api/upr/scan/
    
    Body (optionnel):
    {
        "camera_index": 0,  // Index de la caméra USB (défaut: 0)
        "lieu_detection": "Poste de Gendarmerie",  // Lieu de détection (défaut: "Poste de Gendarmerie")
        "threshold": 0.6  // Seuil de reconnaissance (défaut: 0.6)
    }
    
    Returns:
    {
        "message": "Nouvelle UPR créée" ou "Personne déjà connue",
        "upr_id": "uuid",
        "statut": "NON_IDENTIFIE" ou "IDENTIFIE",
        "code_upr": "UPR-0001",
        "distance": 0.45,  // Si correspondance trouvée
        "existing_upr_id": "uuid"  // Si correspondance trouvée
    }
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Capture depuis la caméra USB et crée/identifie une UPR.
        """
        # Vérifier si face_recognition est disponible
        if not get_face_recognition_available():
            logger.error("face_recognition non disponible")
            return Response(
                {
                    "error": "Service de reconnaissance faciale non disponible. "
                            "Vérifiez que face_recognition et dlib sont installés."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            # Récupérer les paramètres optionnels
            camera_index = request.data.get('camera_index', None)
            if camera_index is not None:
                try:
                    camera_index = int(camera_index)
                except (ValueError, TypeError):
                    camera_index = None
            
            lieu_detection = request.data.get(
                'lieu_detection', 
                'Poste de Gendarmerie'
            )
            
            threshold = request.data.get('threshold', None)
            if threshold is not None:
                try:
                    threshold = float(threshold)
                    if threshold <= 0 or threshold > 1:
                        threshold = None
                except (ValueError, TypeError):
                    threshold = None
            
            logger.info(
                f"Scan UPR demandé par {request.user.username} "
                f"(caméra: {camera_index}, lieu: {lieu_detection})"
            )
            
            # 1. Capturer l'image depuis la caméra USB
            logger.info("Capture depuis la caméra USB...")
            try:
                image = capture_face_from_camera(camera_index)
            except Exception as e:
                logger.error(f"Erreur de capture caméra: {e}", exc_info=True)
                return Response(
                    {
                        "error": "Impossible d'accéder à la caméra USB",
                        "details": str(e) if settings.DEBUG else None
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            # 2. Extraire l'encoding facial
            logger.info("Extraction de l'encoding facial...")
            try:
                encoding = extract_face_encoding(image)
            except Exception as e:
                logger.error(f"Erreur d'extraction d'encoding: {e}", exc_info=True)
                return Response(
                    {
                        "error": "Erreur lors de l'extraction de l'encoding facial",
                        "details": str(e) if settings.DEBUG else None
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            if encoding is None:
                logger.warning("Aucun visage détecté dans l'image capturée")
                return Response(
                    {
                        "error": "Aucun visage détecté dans l'image capturée. "
                                "Assurez-vous que le visage est bien visible et éclairé."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 3. Comparer avec les UPR existants
            logger.info("Comparaison avec les UPR existants...")
            try:
                existing_upr = compare_with_existing_faces(encoding, threshold)
            except Exception as e:
                logger.error(f"Erreur de comparaison: {e}", exc_info=True)
                return Response(
                    {
                        "error": "Erreur lors de la comparaison avec les UPR existants",
                        "details": str(e) if settings.DEBUG else None
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # 4. Si correspondance trouvée, retourner les informations
            if existing_upr:
                logger.info(f"Correspondance trouvée: UPR {existing_upr.code_upr}")
                
                # Recalculer la distance pour la réponse
                import numpy as np
                import face_recognition as fr
                from .services.face_recognition_service import DEFAULT_RECOGNITION_THRESHOLD
                existing_encoding = np.array(existing_upr.face_encoding, dtype=np.float32)
                distances = fr.face_distance([existing_encoding], encoding)
                distance = float(distances[0])
                
                # Audit logging
                log_action_detailed(
                    request=request,
                    user=request.user,
                    action='UPR_SCAN_MATCH',
                    resource_type='UPR',
                    resource_id=existing_upr.id,
                    endpoint=request.path,
                    method=request.method,
                    data_after={
                        'code_upr': existing_upr.code_upr,
                        'match_found': True,
                        'distance': distance,
                        'threshold': threshold or DEFAULT_RECOGNITION_THRESHOLD
                    },
                    reussi=True
                )
                
                return Response({
                    "message": "Personne déjà connue",
                    "upr_id": str(existing_upr.id),
                    "statut": "IDENTIFIE",
                    "code_upr": existing_upr.code_upr,
                    "nom_temporaire": existing_upr.nom_temporaire,
                    "distance": round(distance, 4),
                    "threshold": threshold or DEFAULT_RECOGNITION_THRESHOLD,
                    "existing_upr_id": str(existing_upr.id),
                    "profil_face_url": existing_upr.profil_face.url if existing_upr.profil_face else None
                }, status=status.HTTP_200_OK)
            
            # 5. Aucune correspondance trouvée : créer une nouvelle UPR
            logger.info("Aucune correspondance trouvée, création d'une nouvelle UPR...")
            
            try:
                with transaction.atomic():
                    # Sauvegarder l'image capturée
                    image_path = save_image_to_storage(image, subfolder='upr_faces')
                    
                    # Créer l'UPR
                    upr = UnidentifiedPerson.objects.create(
                        profil_face=image_path,  # Django gère automatiquement le fichier
                        face_encoding=encoding.tolist(),  # Convertir numpy array en liste
                        context_location=lieu_detection,
                        discovered_date=timezone.now(),
                        created_by=request.user,
                        notes=f"Créé automatiquement par scan caméra USB (utilisateur: {request.user.username})"
                    )
                    
                    logger.info(f"Nouvelle UPR créée: {upr.code_upr} (ID: {upr.id})")
                    
                    # Audit logging
                    log_action_detailed(
                        request=request,
                        user=request.user,
                        action='UPR_SCAN_CREATE',
                        resource_type='UPR',
                        resource_id=upr.id,
                        endpoint=request.path,
                        method=request.method,
                        data_after={
                            'code_upr': upr.code_upr,
                            'lieu_detection': lieu_detection,
                            'match_found': False,
                            'face_encoding_dimension': len(encoding)
                        },
                        reussi=True
                    )
                    
                    return Response({
                        "message": "Nouvelle UPR créée",
                        "upr_id": str(upr.id),
                        "statut": "NON_IDENTIFIE",
                        "code_upr": upr.code_upr,
                        "nom_temporaire": upr.nom_temporaire,
                        "profil_face_url": upr.profil_face.url if upr.profil_face else None,
                        "date_detection": upr.discovered_date.isoformat() if upr.discovered_date else None,
                        "lieu_detection": lieu_detection
                    }, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                logger.error(f"Erreur lors de la création de l'UPR: {e}", exc_info=True)
                return Response(
                    {
                        "error": "Erreur lors de la création de l'UPR",
                        "details": str(e) if settings.DEBUG else None
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            logger.error(f"Erreur inattendue lors du scan UPR: {e}", exc_info=True)
            
            # Audit logging pour l'erreur
            log_action_detailed(
                request=request,
                user=request.user,
                action='UPR_SCAN_ERROR',
                resource_type='UPR',
                endpoint=request.path,
                method=request.method,
                reussi=False,
                message_erreur=str(e)
            )
            
            return Response(
                {
                    "error": "Erreur lors du scan UPR",
                    "details": str(e) if settings.DEBUG else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
