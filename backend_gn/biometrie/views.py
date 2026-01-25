import logging
import os
import zipfile
import tempfile
from io import BytesIO

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count, Avg
from django.http import HttpResponse
from django.conf import settings
from typing import List, Tuple
from django.shortcuts import get_object_or_404
from .models import Biometrie, BiometriePhoto, BiometrieEmpreinte, BiometrieScanResultat, BiometrieHistorique
from .serializers import (
    BiometrieSerializer,
    BiometrieEnregistrementSerializer,
    BiometrieReconnaissanceSerializer,
    BiometriePhotoSerializer, 
    BiometrieEmpreinteSerializer,
    BiometriePhotoCreateSerializer,
    BiometrieEmpreinteCreateSerializer,
    BiometrieScanResultatSerializer,
    BiometrieScanResultatCreateSerializer,
    BiometrieStatistiquesSerializer,
    BiometrieHistoriqueSerializer,
    ReconnaissanceFacialeUploadSerializer,
    ReconnaissanceFacialeResultatSerializer,
    ComparaisonCriminelSerializer,
    MiseAJourEncodagesSerializer,
    SuppressionSecuriseSerializer
)
from .arcface_service import ReconnaissanceFacialeService, BiometrieAuditService
from .services.criminal_photo_verification import check_existing_criminal_photo
from .face_recognition_service import ArcFaceRecognitionService
from .face_106 import detect_106_landmarks
from .pipeline import enrollement_pipeline, save_enrollement_to_biometrie, save_enrollement_to_biometrie_photo
from criminel.models import CriminalFicheCriminelle
from .permissions import BiometriePermissions
import json
import base64

logger = logging.getLogger(__name__)

# Lazy loading pour ArcFace - ne pas initialiser au démarrage
_arcface_service_instance = None

def get_arcface_service():
    """Retourne l'instance ArcFace (lazy loading - initialisé seulement à la première utilisation)."""
    global _arcface_service_instance
    if _arcface_service_instance is None:
        _arcface_service_instance = ArcFaceRecognitionService()
    return _arcface_service_instance

# Pour compatibilité avec le code existant, créer un objet proxy
class ArcFaceServiceProxy:
    """Proxy pour lazy loading d'ArcFace."""
    def __getattr__(self, name):
        return getattr(get_arcface_service(), name)

arcface_service = ArcFaceServiceProxy()


class BiometrieEnregistrementAPIView(APIView):
    """Enregistre une photo et son encodage facial."""

    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BiometrieEnregistrementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not arcface_service.available:
            return Response(
                {
                    'detail': "Le moteur ArcFace n'est pas disponible. Vérifiez l'installation d'insightface.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        criminel = get_object_or_404(
            CriminalFicheCriminelle,
            pk=serializer.validated_data['criminel_id'],
        )

        photo = serializer.validated_data['photo']

        try:
            result = arcface_service.save_biometrie_entry(
                criminel=criminel,
                photo=photo,
                utilisateur=request.user if request.user.is_authenticated else None,
                request=request,
                audit_description="Encodage facial via API d'enregistrement",
            )
        except Exception as exc:  # pragma: no cover - dépend du runtime
            logger.error("Erreur lors de l'encodage facial: %s", exc)
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if result is None:
            return Response(
                {'detail': "Aucun visage n'a été détecté sur la photo fournie."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        biometrie, _ = result

        response_serializer = BiometrieSerializer(biometrie, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class BiometrieReconnaissanceAPIView(APIView):
    """Compare un visage avec les encodages stockés."""

    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BiometrieReconnaissanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not arcface_service.available:
            return Response(
                {
                    'detail': "Le moteur ArcFace n'est pas disponible. Vérifiez l'installation d'insightface.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        seuil = serializer.validated_data.get('seuil', 0.6)
        photo = serializer.validated_data['photo']

        try:
            query_embedding = arcface_service.encode_image(photo)
        except Exception as exc:  # pragma: no cover
            logger.error("Erreur lors de l'encodage facial: %s", exc)
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if query_embedding is None:
            return Response(
                {'match': False, 'detail': "Aucun visage détecté sur l'image fournie."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        biometries = Biometrie.objects.select_related('criminel').exclude(encodage_facial__isnull=True)
        if not biometries.exists():
            return Response(
                {'match': False, 'detail': 'Aucun encodage n\'est enregistré dans la base.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        reconnaissance_service = ReconnaissanceFacialeService(
            seuil_confiance=seuil,
            arcface_service=arcface_service,
        )

        correspondances: List[Tuple[float, Biometrie]] = []
        for biometrie in biometries:
            try:
                stored_embedding = arcface_service.deserialize_embedding(biometrie.encodage_facial)
            except Exception as exc:  # pragma: no cover
                logger.warning('Encodage facial invalide pour Biometrie #%s: %s', biometrie.pk, exc)
                continue

            score = reconnaissance_service.calculer_score(query_embedding, stored_embedding)
            correspondances.append((score, biometrie))

        if not correspondances:
            return Response(
                {'match': False, 'detail': 'Aucune donnée biométrique exploitable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        correspondances.sort(key=lambda item: item[0], reverse=True)
        meilleures_correspondances = []
        for score, biometrie in correspondances[:5]:
            data = {
                'biometrie_id': biometrie.pk,
                'criminel_id': biometrie.criminel_id,
                'score': round(float(score), 4),
                'photo': request.build_absolute_uri(biometrie.photo.url) if biometrie.photo else None,
                'criminel': {
                    'nom': biometrie.criminel.nom,
                    'prenom': biometrie.criminel.prenom,
                    'numero_fiche': biometrie.criminel.numero_fiche,
                },
            }
            meilleures_correspondances.append(data)

        meilleur_score, meilleure_biometrie = correspondances[0]
        match_valide = meilleur_score >= seuil
        
        # Journaliser l'action de reconnaissance biométrique
        try:
            from audit.services import audit_log
            criminel_id = meilleure_biometrie.criminel_id if meilleure_biometrie.criminel else None
            audit_log(
                request=request,
                module="Biométrie",
                action="Reconnaissance biométrique",
                ressource=f"Criminel #{criminel_id}" if criminel_id else "Module biométrie",
                narration=(
                    "Une opération de reconnaissance biométrique a été lancée "
                    "afin de comparer les empreintes ou données faciales enregistrées."
                )
            )
        except Exception as audit_error:
            logger.warning(f"Erreur lors de l'enregistrement de l'audit pour reconnaissance biométrique: {audit_error}")

        return Response(
            {
                'match': match_valide,
                'score': round(float(meilleur_score), 4),
                'seuil': seuil,
                'biometrie': BiometrieSerializer(meilleure_biometrie, context={'request': request}).data if match_valide else None,
                'correspondances': meilleures_correspondances,
            },
            status=status.HTTP_200_OK,
        )


class BiometriePhotoViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les photos biométriques
    """
    queryset = BiometriePhoto.objects.all()
    permission_classes = [IsAuthenticated]  # Simplified for now - TODO: Add role-based permissions
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BiometriePhotoCreateSerializer
        return BiometriePhotoSerializer
    
    def get_queryset(self):
        queryset = BiometriePhoto.objects.select_related(
            'criminel', 'capture_par'
        )
        
        # Filtrer par criminel
        criminel_id = self.request.query_params.get('criminel', None)
        if criminel_id:
            queryset = queryset.filter(criminel_id=criminel_id)
        
        # Filtrer par type de photo
        type_photo = self.request.query_params.get('type', None)
        if type_photo:
            queryset = queryset.filter(type_photo=type_photo)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """
        Créer une nouvelle photo biométrique avec vérification de doublons.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Vérifier les doublons AVANT de sauvegarder
        image_file = request.FILES.get('image')
        if image_file:
            criminel_id = serializer.validated_data.get('criminel')
            exclude_criminel_id = None
            if criminel_id:
                if hasattr(criminel_id, 'id'):
                    exclude_criminel_id = criminel_id.id
                else:
                    exclude_criminel_id = criminel_id
            
            # Vérifier si la photo existe déjà
            duplicate_check = check_existing_criminal_photo(
                uploaded_image=image_file,
                exclude_criminel_id=exclude_criminel_id
            )
            
            if duplicate_check and duplicate_check.get('existing_criminal'):
                # Retourner une réponse indiquant que le criminel existe déjà
                from rest_framework.response import Response
                from rest_framework import status
                
                return Response({
                    'existing_criminal': True,
                    'message': 'Cette photo correspond à un dossier criminel déjà enregistré.',
                    'criminel_id': duplicate_check['criminel_id'],
                    'nom_complet': duplicate_check['nom_complet'],
                    'numero_fiche': duplicate_check['numero_fiche'],
                    'similarity_score': duplicate_check['similarity_score'],
                    'photo_id': duplicate_check.get('photo_id'),
                    'criminel_url': f'/api/criminels/{duplicate_check["criminel_id"]}/'
                }, status=status.HTTP_200_OK)
        
        # Si pas de doublon, continuer avec le processus normal
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        # Sauvegarder avec l'utilisateur si authentifié, sinon None
        if self.request.user.is_authenticated:
            photo = serializer.save(capture_par=self.request.user)
        else:
            photo = serializer.save(capture_par=None)
        
        # Encoder automatiquement le visage avec le pipeline complet
        encodage_reussi = False
        pipeline_result = None
        
        try:
            if photo.image:
                image_source = None
                
                # Essayer d'abord avec le fichier uploadé directement
                if hasattr(photo.image, 'file') and photo.image.file:
                    image_source = photo.image.file
                    image_source.seek(0)  # Remettre au début du fichier
                # Sinon, utiliser le chemin du fichier sauvegardé
                elif hasattr(photo.image, 'path') and photo.image.path:
                    try:
                        image_source = photo.image.path
                    except Exception:
                        # Si le fichier n'est pas encore sur le disque, utiliser l'objet image
                        image_source = photo.image
                
                if image_source:
                    # Utiliser le pipeline complet d'enrôlement
                    pipeline_result = enrollement_pipeline(image_source)
                    
                    if pipeline_result.get("success", False):
                        # Sauvegarder tous les résultats dans la photo
                        try:
                            save_enrollement_to_biometrie_photo(
                                photo=photo,
                                pipeline_result=pipeline_result,
                                save_all=True  # Sauvegarder embedding, landmarks, facemesh, 3dmm
                            )
                            encodage_reussi = True
                            logger.info(f"Encodage complet réussi pour BiometriePhoto #{photo.pk}")
                        except Exception as save_error:
                            logger.warning(f"Erreur lors de la sauvegarde des résultats du pipeline: {save_error}")
                            # Sauvegarder au moins l'embedding dans l'ancien format
                            embedding512 = pipeline_result.get("embedding512", [])
                            if embedding512 and len(embedding512) == 512:
                                photo.encodage_facial = json.dumps(embedding512)
                                photo.save()
                                encodage_reussi = True
                                logger.info(f"Encodage sauvegardé (format ancien) pour BiometriePhoto #{photo.pk}")
                    else:
                        error_msg = pipeline_result.get("error", "Erreur inconnue")
                        logger.warning(f"Échec de l'encodage pour BiometriePhoto #{photo.pk}: {error_msg}")
                        
                        # Essayer l'ancien système en fallback
                        try:
                            service_reconnaissance = ReconnaissanceFacialeService()
                            if hasattr(photo.image, 'path') and photo.image.path:
                                encodage = service_reconnaissance.generer_encodage_facial(photo.image.path)
                                if encodage:
                                    photo.encodage_facial = json.dumps(encodage)
                                    photo.save()
                                    encodage_reussi = True
                                    logger.info(f"Encodage fallback réussi pour BiometriePhoto #{photo.pk}")
                        except Exception as e:
                            logger.error(f"Erreur lors de l'encodage fallback: {e}")
        except Exception as e:
            logger.error(f"Erreur lors de l'encodage facial complet: {e}", exc_info=True)
            
            # Essayer l'ancien système en fallback
            try:
                service_reconnaissance = ReconnaissanceFacialeService()
                if photo.image:
                    if hasattr(photo.image, 'path') and photo.image.path:
                        encodage = service_reconnaissance.generer_encodage_facial(photo.image.path)
                    elif hasattr(photo.image, 'file') and photo.image.file:
                        encodage = service_reconnaissance.generer_encodage_facial(photo.image.file)
                    else:
                        encodage = None
                    
                    if encodage:
                        photo.encodage_facial = json.dumps(encodage)
                        photo.save()
                        encodage_reussi = True
                        logger.info(f"Encodage fallback réussi pour BiometriePhoto #{photo.pk}")
            except Exception as fallback_error:
                logger.error(f"Erreur lors de l'encodage fallback: {fallback_error}")
        
        # Préparer les données pour l'historique
        donnees_apres = {
            'type_photo': photo.type_photo,
            'qualite': photo.qualite,
            'encodage_genere': encodage_reussi
        }
        
        if pipeline_result and pipeline_result.get("success"):
            donnees_apres.update({
                'embedding_512': bool(pipeline_result.get("embedding512")),
                'landmarks_106': bool(pipeline_result.get("landmarks106")),
                'facemesh_468': bool(pipeline_result.get("facemesh468")),
                'morphable_3d': bool(pipeline_result.get("morphable3d", {}).get("vertices")),
                'warnings': pipeline_result.get("warnings", [])
            })
        
        # Enregistrer dans l'historique
        BiometrieAuditService.enregistrer_action(
            type_objet='photo',
            objet_id=photo.id,
            action='creation',
            criminel=photo.criminel,
            utilisateur=self.request.user if self.request.user.is_authenticated else None,
            description=f'Ajout d\'une photo biométrique de type {photo.type_photo} avec encodage complet',
            donnees_apres=donnees_apres,
            request=self.request
        )
    
    @action(detail=False, methods=['get'])
    def par_criminel(self, request):
        """Récupérer toutes les photos d'un criminel"""
        criminel_id = request.query_params.get('criminel_id')
        if not criminel_id:
            return Response(
                {'error': 'criminel_id requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        photos = self.get_queryset().filter(criminel_id=criminel_id)
        serializer = self.get_serializer(photos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'])
    def supprimer(self, request, pk=None):
        """Supprimer une photo biométrique (DÉPRÉCIÉ - Utiliser supprimer_securise)"""
        photo = self.get_object()
        
        # Sauvegarder les infos pour l'historique
        criminel = photo.criminel
        donnees_avant = {
            'type_photo': photo.type_photo,
            'qualite': photo.qualite,
            'est_principale': photo.est_principale,
            'encodage_existe': bool(photo.encodage_facial)
        }
        
        # Enregistrer dans l'historique avant suppression
        BiometrieAuditService.enregistrer_action(
            type_objet='photo',
            objet_id=photo.id,
            action='suppression',
            criminel=criminel,
            utilisateur=self.request.user if self.request.user.is_authenticated else None,
            description='Suppression simple (sans confirmation)',
            donnees_avant=donnees_avant,
            request=self.request
        )
        
        photo.delete()
        return Response({'status': 'Photo supprimée avec succès'}, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def supprimer_securise(self, request, pk=None):
        """Suppression sécurisée avec confirmation et raison obligatoire"""
        photo = self.get_object()
        
        # Valider les données de suppression
        serializer = SuppressionSecuriseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        raison = serializer.validated_data['raison']
        
        # Sauvegarder les infos pour l'historique
        criminel = photo.criminel
        donnees_avant = {
            'type_photo': photo.type_photo,
            'qualite': photo.qualite,
            'est_principale': photo.est_principale,
            'encodage_existe': bool(photo.encodage_facial),
            'date_capture': photo.date_capture.isoformat(),
            'image_url': photo.image.url if photo.image else None
        }
        
        # Enregistrer dans l'historique avant suppression
        BiometrieAuditService.enregistrer_action(
            type_objet='photo',
            objet_id=photo.id,
            action='suppression',
            criminel=criminel,
            utilisateur=self.request.user,
            description=f'Suppression sécurisée - Raison: {raison}',
            donnees_avant=donnees_avant,
            request=self.request
        )
        
        # Supprimer la photo
        photo.delete()
        
        return Response({
            'status': 'Photo supprimée avec succès',
            'message': 'La suppression a été enregistrée dans l\'historique d\'audit',
            'photo_id': pk,
            'raison': raison
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def definir_principale(self, request, pk=None):
        """Définir une photo comme principale pour un criminel"""
        photo = self.get_object()
        
        # Retirer le statut principal des autres photos
        BiometriePhoto.objects.filter(
            criminel=photo.criminel,
            est_principale=True
        ).exclude(pk=photo.pk).update(est_principale=False)
        
        # Définir cette photo comme principale
        photo.est_principale = True
        photo.save()
        
        serializer = self.get_serializer(photo)
        return Response({
            'status': 'Photo définie comme principale',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def activer(self, request, pk=None):
        """Activer une photo biométrique"""
        photo = self.get_object()
        photo.est_active = True
        photo.save()
        
        # Enregistrer dans l'historique
        BiometrieAuditService.enregistrer_action(
            type_objet='photo',
            objet_id=photo.id,
            action='activation',
            criminel=photo.criminel,
            utilisateur=self.request.user if self.request.user.is_authenticated else None,
            description='Photo biométrique activée',
            donnees_apres={'est_active': True},
            request=self.request
        )
        
        serializer = self.get_serializer(photo)
        return Response({
            'status': 'Photo activée',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def desactiver(self, request, pk=None):
        """Désactiver une photo biométrique"""
        photo = self.get_object()
        photo.est_active = False
        photo.save()
        
        # Enregistrer dans l'historique
        BiometrieAuditService.enregistrer_action(
            type_objet='photo',
            objet_id=photo.id,
            action='desactivation',
            criminel=photo.criminel,
            utilisateur=self.request.user if self.request.user.is_authenticated else None,
            description='Photo biométrique désactivée',
            donnees_apres={'est_active': False},
            request=self.request
        )
        
        serializer = self.get_serializer(photo)
        return Response({
            'status': 'Photo désactivée',
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def historique(self, request):
        """Récupérer l'historique des modifications de photos"""
        photo_id = request.query_params.get('photo_id')
        criminel_id = request.query_params.get('criminel_id')
        limite = int(request.query_params.get('limite', 50))
        
        historique = BiometrieAuditService.obtenir_historique(
            type_objet='photo',
            objet_id=int(photo_id) if photo_id else None,
            criminel_id=int(criminel_id) if criminel_id else None,
            limite=limite
        )
        
        serializer = BiometrieHistoriqueSerializer(historique, many=True)
        return Response(serializer.data)


class BiometrieEmpreinteViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les empreintes digitales
    """
    queryset = BiometrieEmpreinte.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BiometrieEmpreinteCreateSerializer
        return BiometrieEmpreinteSerializer
    
    def get_queryset(self):
        queryset = BiometrieEmpreinte.objects.select_related(
            'criminel', 'enregistre_par'
        )
        
        # Filtrer par criminel
        criminel_id = self.request.query_params.get('criminel', None)
        if criminel_id:
            queryset = queryset.filter(criminel_id=criminel_id)
        
        # Filtrer par doigt
        doigt = self.request.query_params.get('doigt', None)
        if doigt:
            queryset = queryset.filter(doigt=doigt)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(enregistre_par=self.request.user)
    
    @action(detail=False, methods=['get'])
    def par_criminel(self, request):
        """Récupérer toutes les empreintes d'un criminel"""
        criminel_id = request.query_params.get('criminel_id')
        if not criminel_id:
            return Response(
                {'error': 'criminel_id requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        empreintes = self.get_queryset().filter(criminel_id=criminel_id)
        serializer = self.get_serializer(empreintes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'])
    def supprimer(self, request, pk=None):
        """Supprimer une empreinte digitale"""
        empreinte = self.get_object()
        empreinte.delete()
        return Response({'status': 'Empreinte supprimée avec succès'}, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def activer(self, request, pk=None):
        """Activer une empreinte digitale"""
        empreinte = self.get_object()
        empreinte.est_active = True
        empreinte.save()
        
        serializer = self.get_serializer(empreinte)
        return Response({
            'status': 'Empreinte activée',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def desactiver(self, request, pk=None):
        """Désactiver une empreinte digitale"""
        empreinte = self.get_object()
        empreinte.est_active = False
        empreinte.save()
        
        serializer = self.get_serializer(empreinte)
        return Response({
            'status': 'Empreinte désactivée',
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def statistiques_main(self, request):
        """Statistiques par main (droite/gauche)"""
        empreintes_droite = BiometrieEmpreinte.objects.filter(
            doigt__contains='droit'
        ).count()
        empreintes_gauche = BiometrieEmpreinte.objects.filter(
            doigt__contains='gauche'
        ).count()
        
        return Response({
            'empreintes_main_droite': empreintes_droite,
            'empreintes_main_gauche': empreintes_gauche,
            'total': empreintes_droite + empreintes_gauche
        })
    
    @action(detail=True, methods=['get'])
    def telecharger(self, request, pk=None):
        """
        Télécharge un fichier dactyloscopique avec son dossier d'enquête.
        
        Structure de l'archive ZIP:
        enquete_<id_enquete>/
        └── dactyloscopie/
            └── <nom_fichier>
        
        Le fichier n'est jamais téléchargé seul, toujours avec son dossier d'enquête.
        
        Endpoint: GET /api/biometrie/empreintes/<id>/telecharger/
        """
        from enquete.models import Enquete
        from enquete.views import _user_can_supervise, _get_assignment
        from rest_framework.exceptions import PermissionDenied
        
        # Récupérer l'empreinte
        empreinte = self.get_object()
        
        # Vérifier que le fichier existe
        if not empreinte.image:
            return Response(
                {'erreur': 'Aucun fichier associé à cette empreinte'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Récupérer le chemin du fichier
        try:
            file_path = empreinte.image.path
        except ValueError:
            return Response(
                {'erreur': 'Erreur lors de l\'accès au fichier'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not os.path.exists(file_path):
            return Response(
                {'erreur': 'Fichier non trouvé sur le disque'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Trouver l'enquête associée au criminel
        # Utiliser la plus récente enquête active pour ce criminel
        enquete = Enquete.objects.filter(
            dossier=empreinte.criminel
        ).order_by('-date_enregistrement').first()
        
        if not enquete:
            return Response(
                {'erreur': 'Aucune enquête associée à ce fichier dactyloscopique'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier les permissions d'accès à l'enquête
        # Utiliser la même logique que les vues d'enquête
        user = request.user
        if not user.is_authenticated:
            return Response(
                {'erreur': 'Authentification requise'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Vérifier l'accès à l'enquête (superviseur ou assignation)
        try:
            # Si l'utilisateur est superviseur, il a accès
            if _user_can_supervise(user) or user.is_superuser:
                pass  # Accès autorisé
            else:
                # Vérifier l'assignation pour le dossier
                _get_assignment(
                    user,
                    empreinte.criminel,
                    require_confirmed=False,  # Permettre même les assignations en attente
                    allow_supervisor_override=True
                )
        except Exception as e:
            # Si _get_assignment lève une exception, c'est que l'utilisateur n'a pas accès
            return Response(
                {'erreur': 'Vous n\'avez pas accès à cette enquête'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Vérifier que le fichier appartient bien à l'enquête (via le criminel)
        if empreinte.criminel != enquete.dossier:
            return Response(
                {'erreur': 'Le fichier n\'appartient pas à cette enquête'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer l'archive ZIP en mémoire
        zip_buffer = BytesIO()
        
        try:
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Nom du fichier d'origine
                original_filename = os.path.basename(empreinte.image.name)
                
                # Structure: enquete_<id_enquete>/dactyloscopie/<nom_fichier>
                zip_path = f"enquete_{enquete.id}/dactyloscopie/{original_filename}"
                
                # Ajouter le fichier à l'archive
                zip_file.write(file_path, zip_path)
            
            # Préparer la réponse HTTP
            zip_buffer.seek(0)
            response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
            
            # Nom de l'archive: enquete_<id_enquete>_dactyloscopie.zip
            zip_filename = f"enquete_{enquete.id}_dactyloscopie.zip"
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            
            # Ajouter les headers CORS si nécessaire
            origin = request.META.get('HTTP_ORIGIN', '')
            if origin:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
                response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            
            logger.info(
                f"Téléchargement fichier dactyloscopique #{empreinte.id} "
                f"avec enquête #{enquete.id} par utilisateur {user.username}"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Erreur lors de la création de l'archive ZIP: {e}", exc_info=True)
            return Response(
                {'erreur': f'Erreur lors de la création de l\'archive: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BiometrieScanResultatViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les résultats de scans biométriques
    """
    queryset = BiometrieScanResultat.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BiometrieScanResultatCreateSerializer
        return BiometrieScanResultatSerializer
    
    def get_queryset(self):
        queryset = BiometrieScanResultat.objects.select_related(
            'criminel_correspondant', 'execute_par'
        )
        
        # Filtrer par type de scan
        type_scan = self.request.query_params.get('type', None)
        if type_scan:
            queryset = queryset.filter(type_scan=type_scan)
        
        # Filtrer par statut
        statut = self.request.query_params.get('statut', None)
        if statut:
            queryset = queryset.filter(statut=statut)
        
        # Filtrer par criminel
        criminel_id = self.request.query_params.get('criminel', None)
        if criminel_id:
            queryset = queryset.filter(criminel_correspondant_id=criminel_id)
        
        # Filtrer les correspondances valides
        valide_only = self.request.query_params.get('valide', None)
        if valide_only == 'true':
            queryset = [scan for scan in queryset if scan.est_correspondance_valide()]
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(execute_par=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques globales des scans"""
        total_scans = BiometrieScanResultat.objects.count()
        scans_reussis = BiometrieScanResultat.objects.filter(statut='termine').count()
        scans_echoues = BiometrieScanResultat.objects.filter(statut='echec').count()
        
        # Temps moyen d'exécution
        temps_moyen = BiometrieScanResultat.objects.aggregate(
            Avg('temps_execution')
        )['temps_execution__avg'] or 0
        
        # Taux de réussite
        taux_reussite = (scans_reussis / total_scans * 100) if total_scans > 0 else 0
        
        # Statistiques par type de scan
        stats_par_type = BiometrieScanResultat.objects.values('type_scan').annotate(
            count=Count('id'),
            temps_moyen=Avg('temps_execution')
        )
        
        return Response({
            'total_scans': total_scans,
            'scans_reussis': scans_reussis,
            'scans_echoues': scans_echoues,
            'taux_reussite': round(taux_reussite, 2),
            'temps_moyen_execution': round(temps_moyen, 2),
            'statistiques_par_type': list(stats_par_type)
        })
    
    @action(detail=False, methods=['get'])
    def recents(self, request):
        """Récupérer les scans les plus récents"""
        limit = int(request.query_params.get('limit', 10))
        scans = self.get_queryset()[:limit]
        serializer = self.get_serializer(scans, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marquer_termine(self, request, pk=None):
        """Marquer un scan comme terminé"""
        scan = self.get_object()
        scan.statut = 'termine'
        scan.save()
        
        serializer = self.get_serializer(scan)
        return Response({
            'status': 'Scan marqué comme terminé',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def marquer_echec(self, request, pk=None):
        """Marquer un scan comme échoué"""
        scan = self.get_object()
        scan.statut = 'echec'
        scan.save()
        
        serializer = self.get_serializer(scan)
        return Response({
            'status': 'Scan marqué comme échoué',
            'data': serializer.data
        })


class BiometrieStatistiquesViewSet(viewsets.ViewSet):
    """
    ViewSet pour les statistiques globales biométriques
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Statistiques globales du système biométrique (endpoint principal)"""
        total_photos = BiometriePhoto.objects.count()
        total_empreintes = BiometrieEmpreinte.objects.count()
        total_scans = BiometrieScanResultat.objects.count()
        
        scans_reussis = BiometrieScanResultat.objects.filter(statut='termine').count()
        scans_echoues = BiometrieScanResultat.objects.filter(statut='echec').count()
        
        taux_reussite = (scans_reussis / total_scans * 100) if total_scans > 0 else 0
        
        temps_moyen = BiometrieScanResultat.objects.aggregate(
            Avg('temps_execution')
        )['temps_execution__avg'] or 0
        
        data = {
            'total_photos': total_photos,
            'total_empreintes': total_empreintes,
            'total_scans': total_scans,
            'scans_reussis': scans_reussis,
            'scans_echoues': scans_echoues,
            'taux_reussite': round(taux_reussite, 2),
            'temps_moyen_scan': round(temps_moyen, 2)
        }
        
        serializer = BiometrieStatistiquesSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def globales(self, request):
        """Alias pour les statistiques globales"""
        return self.list(request)


class ReconnaissanceFacialeViewSet(viewsets.ViewSet):
    """
    ViewSet pour la reconnaissance faciale
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def rechercher(self, request):
        """
        Rechercher un visage dans toute la base de données
        
        Endpoint: POST /api/biometrie/reconnaissance-faciale/rechercher/
        
        Body (multipart/form-data):
            - image: Image à rechercher
            - seuil_confiance: Seuil minimal (0.0 à 1.0)
            - limite_resultats: Nombre max de résultats
            - sauvegarder_resultat: Sauvegarder dans la BD (boolean)
        """
        # Valider les données
        serializer = ReconnaissanceFacialeUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        image = serializer.validated_data['image']
        seuil_confiance = serializer.validated_data.get('seuil_confiance', 0.6)
        limite_resultats = serializer.validated_data.get('limite_resultats', 10)
        sauvegarder = serializer.validated_data.get('sauvegarder_resultat', True)
        
        # Effectuer la recherche
        service = ReconnaissanceFacialeService(seuil_confiance=seuil_confiance)
        resultats = service.rechercher_dans_bd(
            image_source=image,
            limite_resultats=limite_resultats,
            utilisateur=request.user
        )
        
        # Sauvegarder le résultat si demandé
        if sauvegarder and resultats.get('succes'):
            meilleure = resultats.get('meilleure_correspondance')
            
            if meilleure:
                # Sauvegarder temporairement l'image
                from django.core.files.base import ContentFile
                import uuid
                
                image.seek(0)
                image_content = ContentFile(image.read(), name=f'scan_{uuid.uuid4()}.jpg')
                
                BiometrieScanResultat.objects.create(
                    type_scan='facial',
                    image_source=image_content,
                    criminel_correspondant_id=meilleure['criminel_id'],
                    score_correspondance=meilleure['score_correspondance'],
                    seuil_confiance=seuil_confiance,
                    resultats_json=json.dumps(resultats['tous_resultats'][:5]),
                    nombre_comparaisons=resultats['nombre_comparaisons'],
                    temps_execution=resultats['temps_execution'],
                    statut='termine',
                    execute_par=request.user
                )
        
        # Retourner les résultats
        return Response(resultats, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def comparer_avec_criminel(self, request):
        """
        Comparer une image avec un criminel spécifique
        
        Endpoint: POST /api/biometrie/reconnaissance-faciale/comparer_avec_criminel/
        
        Body (multipart/form-data):
            - image: Image à comparer
            - criminel_id: ID du criminel
            - seuil_confiance: Seuil minimal (0.0 à 1.0)
        """
        # Valider les données
        serializer = ComparaisonCriminelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        image = serializer.validated_data['image']
        criminel_id = serializer.validated_data['criminel_id']
        seuil_confiance = serializer.validated_data.get('seuil_confiance', 0.6)
        
        # Effectuer la comparaison
        service = ReconnaissanceFacialeService(seuil_confiance=seuil_confiance)
        resultats = service.comparer_avec_criminel(
            image_source=image,
            criminel_id=criminel_id
        )
        
        return Response(resultats, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def generer_encodage(self, request):
        """
        Générer un encodage facial à partir d'une image
        
        Endpoint: POST /api/biometrie/reconnaissance-faciale/generer_encodage/
        """
        if 'image' not in request.FILES:
            return Response(
                {'erreur': 'Image requise'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image = request.FILES['image']
        
        service = ReconnaissanceFacialeService()
        encodage = service.generer_encodage_facial(image)
        
        if encodage is None:
            return Response(
                {'succes': False, 'erreur': 'Aucun visage détecté dans l\'image'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'succes': True,
            'encodage': encodage,
            'longueur': len(encodage)
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def mettre_a_jour_encodages(self, request):
        """
        Recalculer les encodages faciaux
        
        Endpoint: POST /api/biometrie/reconnaissance-faciale/mettre_a_jour_encodages/
        
        Body (JSON):
            - criminel_id: ID du criminel (optionnel, si None = tous)
        """
        serializer = MiseAJourEncodagesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        criminel_id = serializer.validated_data.get('criminel_id')
        
        service = ReconnaissanceFacialeService()
        resultats = service.mettre_a_jour_encodages(criminel_id=criminel_id)
        
        return Response(resultats, status=status.HTTP_200_OK)


class Landmarks106APIView(APIView):
    """API pour détecter les 106 landmarks faciaux sur une image."""
    
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Détecte les 106 landmarks faciaux sur une image.
        
        Accepte:
            - multipart/form-data: champ 'image' avec le fichier image
            - base64: champ 'image_base64' avec l'image encodée en base64
        
        Retourne:
            {
                "success": true,
                "landmarks": [[x1, y1], [x2, y2], ...],  # 106 points
                "bbox": [x1, y1, x2, y2],  # optionnel
                "confidence": 0.95  # optionnel
            }
            
            ou en cas d'erreur:
            {
                "success": false,
                "error": "Message d'erreur",
                "landmarks": []
            }
        
        NOTE: Le traitement peut prendre plusieurs secondes, notamment lors du premier appel
        (initialisation du modèle InsightFace). Le timeout côté client est de 30 secondes.
        """
        logger.info("Landmarks106APIView: Requête POST reçue pour détection de landmarks")
        image = None
        
        # Vérifier si on reçoit un fichier multipart/form-data
        if 'image' in request.FILES:
            image = request.FILES['image']
            logger.info("Landmarks106APIView: Image reçue via multipart/form-data (taille: %s bytes)", 
                       image.size if hasattr(image, 'size') else 'inconnue')
        
        # Vérifier si on reçoit une image en base64
        elif 'image_base64' in request.data:
            try:
                logger.info("Landmarks106APIView: Tentative de décodage image base64")
                image_base64 = request.data['image_base64']
                # Retirer le préfixe data:image/...;base64, si présent
                if ',' in image_base64:
                    image_base64 = image_base64.split(',')[1]
                
                image_data = base64.b64decode(image_base64)
                # Créer un objet simulant un fichier uploadé
                from django.core.files.base import ContentFile
                image = ContentFile(image_data, name='temp_image.jpg')
                logger.info("Landmarks106APIView: Image base64 décodée avec succès (taille: %s bytes)", len(image_data))
            except Exception as exc:
                logger.error("Landmarks106APIView: Erreur lors du décodage base64: %s", exc, exc_info=True)
                return Response(
                    {
                        'success': False,
                        'error': 'Format base64 invalide',
                        'landmarks': []
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if image is None:
            logger.warning("Landmarks106APIView: Aucune image fournie dans la requête")
            return Response(
                {
                    'success': False,
                    'error': 'Image requise. Envoyez soit un fichier via "image" (multipart/form-data), soit une image encodée en base64 via "image_base64"',
                    'landmarks': []
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            logger.info("Landmarks106APIView: Démarrage de la détection des landmarks")
            # Détecter les 106 landmarks
            result = detect_106_landmarks(image)
            
            if not result.get('success', False):
                error_msg = result.get('error', 'Aucun visage détecté dans l\'image')
                logger.warning("Landmarks106APIView: Détection échouée: %s", error_msg)
                return Response(
                    {
                        'success': False,
                        'error': error_msg,
                        'landmarks': []
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            landmarks_count = len(result.get('landmarks', []))
            logger.info("Landmarks106APIView: Détection réussie - %s landmarks détectés", landmarks_count)
            
            # Retourner les résultats
            return Response({
                'success': True,
                'landmarks': result.get('landmarks', []),
                'bbox': result.get('bbox'),
                'confidence': result.get('confidence')
            }, status=status.HTTP_200_OK)
            
        except ValueError as exc:
            logger.error("Landmarks106APIView: Erreur de validation lors de la détection des landmarks: %s", exc, exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': str(exc),
                    'landmarks': []
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except RuntimeError as exc:
            logger.error("Landmarks106APIView: Erreur runtime lors de la détection des landmarks: %s", exc, exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': str(exc),
                    'landmarks': []
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as exc:
            logger.error("Landmarks106APIView: Erreur inattendue lors de la détection des landmarks: %s", exc, exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': f'Erreur lors de la détection des landmarks: {str(exc)}',
                    'landmarks': []
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BiometrieHistoriqueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter l'historique biométrique (lecture seule)
    """
    queryset = BiometrieHistorique.objects.all()
    serializer_class = BiometrieHistoriqueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = BiometrieHistorique.objects.select_related(
            'criminel', 'effectue_par'
        )
        
        # Filtrer par type d'objet
        type_objet = self.request.query_params.get('type_objet')
        if type_objet:
            queryset = queryset.filter(type_objet=type_objet)
        
        # Filtrer par objet_id
        objet_id = self.request.query_params.get('objet_id')
        if objet_id:
            queryset = queryset.filter(objet_id=objet_id)
        
        # Filtrer par criminel
        criminel_id = self.request.query_params.get('criminel_id')
        if criminel_id:
            queryset = queryset.filter(criminel_id=criminel_id)
        
        # Filtrer par action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filtrer par utilisateur
        utilisateur_id = self.request.query_params.get('utilisateur_id')
        if utilisateur_id:
            queryset = queryset.filter(effectue_par_id=utilisateur_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def par_criminel(self, request):
        """Historique pour un criminel spécifique"""
        criminel_id = request.query_params.get('criminel_id')
        if not criminel_id:
            return Response(
                {'erreur': 'criminel_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        limite = int(request.query_params.get('limite', 50))
        
        historique = self.get_queryset().filter(criminel_id=criminel_id)[:limite]
        serializer = self.get_serializer(historique, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def par_utilisateur(self, request):
        """Historique des actions d'un utilisateur"""
        utilisateur_id = request.query_params.get('utilisateur_id')
        if not utilisateur_id:
            return Response(
                {'erreur': 'utilisateur_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        limite = int(request.query_params.get('limite', 50))
        
        historique = self.get_queryset().filter(effectue_par_id=utilisateur_id)[:limite]
        serializer = self.get_serializer(historique, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques de l'historique"""
        queryset = self.get_queryset()
        
        stats_par_action = queryset.values('action').annotate(
            count=Count('id')
        ).order_by('-count')
        
        stats_par_type = queryset.values('type_objet').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'total_actions': queryset.count(),
            'par_action': list(stats_par_action),
            'par_type_objet': list(stats_par_type)
        })


class AnalyseBiometriqueAPIView(APIView):
    """API pour l'analyse biométrique complète (pipeline d'enrôlement)."""
    
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Analyse biométrique complète d'une image.
        
        Accepte:
            - multipart/form-data: champ 'image' avec le fichier image
            - base64: champ 'image_base64' avec l'image encodée en base64
        
        Retourne:
            {
                "success": true,
                "bbox": [x1, y1, x2, y2],
                "face_crop": "data:image/jpeg;base64,...",
                "landmarks106": [[x1, y1], [x2, y2], ...],
                "embedding512": [0.123, 0.456, ...],
                "facemesh468": [[x1, y1, z1], ...],
                "morphable3d": {...},
                "warnings": []
            }
        """
        image = None
        
        # Vérifier si on reçoit un fichier multipart/form-data
        if 'image' in request.FILES:
            image = request.FILES['image']
        
        # Vérifier si on reçoit une image en base64
        elif 'image_base64' in request.data:
            try:
                image_base64 = request.data['image_base64']
                # Retirer le préfixe data:image/...;base64, si présent
                if ',' in image_base64:
                    image_base64 = image_base64.split(',')[1]
                
                image_data = base64.b64decode(image_base64)
                from django.core.files.base import ContentFile
                image = ContentFile(image_data, name='temp_image.jpg')
            except Exception as exc:
                logger.error("Erreur lors du décodage base64: %s", exc)
                return Response(
                    {
                        'success': False,
                        'error': 'Format base64 invalide',
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if image is None:
            return Response(
                {
                    'success': False,
                    'error': 'Image requise. Envoyez soit un fichier via "image" (multipart/form-data), soit une image encodée en base64 via "image_base64"',
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Appeler le pipeline complet
            result = enrollement_pipeline(image)
            
            if not result.get('success', False):
                error_msg = result.get('error', 'Erreur inconnue lors de l\'analyse')
                
                # Gestion des erreurs spécifiques
                if 'aucun visage' in error_msg.lower():
                    return Response(
                        {
                            'success': False,
                            'error': 'Aucun visage détecté dans l\'image. Veuillez fournir une image avec un visage clairement visible.',
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif 'plusieurs visages' in error_msg.lower():
                    return Response(
                        {
                            'success': False,
                            'error': error_msg,
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif 'qualité' in error_msg.lower():
                    return Response(
                        {
                            'success': False,
                            'error': f'Qualité d\'image insuffisante: {error_msg}',
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return Response(
                        {
                            'success': False,
                            'error': error_msg,
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Retourner les résultats complets
            return Response(result, status=status.HTTP_200_OK)
            
        except ValueError as exc:
            logger.error("Erreur de validation lors de l'analyse biométrique: %s", exc)
            return Response(
                {
                    'success': False,
                    'error': str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except RuntimeError as exc:
            logger.error("Erreur runtime lors de l'analyse biométrique: %s", exc)
            return Response(
                {
                    'success': False,
                    'error': str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as exc:
            logger.error("Erreur inattendue lors de l'analyse biométrique: %s", exc, exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': f'Erreur lors de l\'analyse biométrique: {str(exc)}',
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EncodeVisageAPIView(APIView):
    """API pour encoder et sauvegarder un visage avec le pipeline complet."""
    
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Encode et sauvegarde un visage dans la base de données.
        
        Accepte:
            - multipart/form-data: champ 'image' avec le fichier image
            - base64: champ 'image_base64' avec l'image encodée en base64
            - criminel_id: ID du criminel (requis)
            - save_all: Si True, sauvegarde tous les résultats (landmarks, facemesh, 3dmm) (optionnel, défaut: True)
        
        Retourne:
            {
                "success": true,
                "biometrie_id": 123,
                "pipeline_result": {...},
                "message": "Visage encodé et sauvegardé avec succès"
            }
        """
        image = None
        criminel_id = request.data.get('criminel_id')
        save_all = request.data.get('save_all', 'true').lower() == 'true'
        
        if not criminel_id:
            return Response(
                {
                    'success': False,
                    'error': 'criminel_id requis',
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier si on reçoit un fichier multipart/form-data
        if 'image' in request.FILES:
            image = request.FILES['image']
        
        # Vérifier si on reçoit une image en base64
        elif 'image_base64' in request.data:
            try:
                image_base64 = request.data['image_base64']
                if ',' in image_base64:
                    image_base64 = image_base64.split(',')[1]
                
                image_data = base64.b64decode(image_base64)
                from django.core.files.base import ContentFile
                image = ContentFile(image_data, name='temp_image.jpg')
            except Exception as exc:
                logger.error("Erreur lors du décodage base64: %s", exc)
                return Response(
                    {
                        'success': False,
                        'error': 'Format base64 invalide',
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if image is None:
            return Response(
                {
                    'success': False,
                    'error': 'Image requise. Envoyez soit un fichier via "image" (multipart/form-data), soit une image encodée en base64 via "image_base64"',
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            criminel = get_object_or_404(
                CriminalFicheCriminelle,
                pk=criminel_id,
            )
            
            # Encoder et sauvegarder avec le pipeline complet
            result = save_enrollement_to_biometrie(
                criminel=criminel,
                image=image,
                utilisateur=request.user if request.user.is_authenticated else None,
                request=request,
                save_all=save_all
            )
            
            if result is None:
                return Response(
                    {
                        'success': False,
                        'error': 'Impossible d\'encoder le visage. Vérifiez que l\'image contient un visage clairement visible.',
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            biometrie, pipeline_result = result
            
            return Response({
                'success': True,
                'biometrie_id': biometrie.pk,
                'criminel_id': criminel.pk,
                'pipeline_result': {
                    'embedding512': len(pipeline_result.get('embedding512', [])),
                    'landmarks106': len(pipeline_result.get('landmarks106', [])),
                    'facemesh468': len(pipeline_result.get('facemesh468', [])),
                    'morphable3d': bool(pipeline_result.get('morphable3d', {}).get('vertices')),
                    'warnings': pipeline_result.get('warnings', [])
                },
                'message': 'Visage encodé et sauvegardé avec succès'
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as exc:
            logger.error("Erreur de validation lors de l'encodage: %s", exc)
            return Response(
                {
                    'success': False,
                    'error': str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as exc:
            logger.error("Erreur inattendue lors de l'encodage: %s", exc, exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': f'Erreur lors de l\'encodage: {str(exc)}',
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

