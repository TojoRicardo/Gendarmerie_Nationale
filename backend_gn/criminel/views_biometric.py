"""
API pour l'upload séparé des 3 photos biométriques (face, profil gauche, profil droit).
Conforme aux normes ISO 19794-5 et NIST.
"""

import logging
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone

from .models import CriminalFicheCriminelle
from biometrie.models import BiometriePhoto
from biometrie.pipeline import enrollement_pipeline, save_enrollement_to_biometrie_photo
from biometrie.arcface_service import BiometrieAuditService
from .validators import validate_biometric_photo

logger = logging.getLogger(__name__)


class BiometricPhotoUploadMixin:
    """Mixin pour ajouter les endpoints d'upload de photos biométriques."""
    
    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        url_path='upload-photo-face',
        url_name='upload-photo-face'
    )
    def upload_photo_face(self, request, pk=None):
        """
        Upload de la photo de face (frontale).
        
        POST /api/criminels/{id}/upload-photo-face/
        Body: multipart/form-data avec champ 'photo'
        """
        return self._upload_biometric_photo(
            request, pk, 'face', 'Photo de face'
        )
    
    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        url_path='upload-photo-profil-gauche',
        url_name='upload-photo-profil-gauche'
    )
    def upload_photo_profil_gauche(self, request, pk=None):
        """
        Upload de la photo de profil gauche.
        
        POST /api/criminels/{id}/upload-photo-profil-gauche/
        Body: multipart/form-data avec champ 'photo'
        """
        return self._upload_biometric_photo(
            request, pk, 'profil_gauche', 'Photo de profil gauche'
        )
    
    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        url_path='upload-photo-profil-droit',
        url_name='upload-photo-profil-droit'
    )
    def upload_photo_profil_droit(self, request, pk=None):
        """
        Upload de la photo de profil droit.
        
        POST /api/criminels/{id}/upload-photo-profil-droit/
        Body: multipart/form-data avec champ 'photo'
        """
        return self._upload_biometric_photo(
            request, pk, 'profil_droit', 'Photo de profil droit'
        )
    
    def _upload_biometric_photo(self, request, pk, type_photo, description):
        """
        Méthode interne pour gérer l'upload d'une photo biométrique.
        
        Args:
            request: Requête HTTP
            pk: ID du criminel
            type_photo: Type de photo ('face', 'profil_gauche', 'profil_droit')
            description: Description pour l'audit
        """
        criminel = get_object_or_404(CriminalFicheCriminelle, pk=pk)
        
        if 'photo' not in request.FILES:
            return Response(
                {
                    'success': False,
                    'error': 'Champ "photo" requis dans la requête multipart/form-data'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        photo_file = request.FILES['photo']
        
        # Valider la photo
        try:
            validate_biometric_photo(photo_file)
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'error': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Vérifier les doublons AVANT de sauvegarder
            from biometrie.services.criminal_photo_verification import check_existing_criminal_photo
            
            duplicate_check = check_existing_criminal_photo(
                uploaded_image=photo_file,
                exclude_criminel_id=criminel.id  # Exclure le criminel actuel
            )
            
            if duplicate_check and duplicate_check.get('existing_criminal'):
                # Retourner une réponse indiquant que le criminel existe déjà
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
            
            # Remettre le fichier au début pour le traitement suivant
            photo_file.seek(0)
            
            with transaction.atomic():
                # Vérifier si une photo de ce type existe déjà
                existing_photo = BiometriePhoto.objects.filter(
                    criminel=criminel,
                    type_photo=type_photo,
                    est_active=True
                ).first()
                
                if existing_photo:
                    # Désactiver l'ancienne photo
                    existing_photo.est_active = False
                    existing_photo.save()
                
                # Créer la nouvelle photo
                photo = BiometriePhoto.objects.create(
                    criminel=criminel,
                    image=photo_file,
                    type_photo=type_photo,
                    capture_par=request.user if request.user.is_authenticated else None,
                    est_active=True
                )
                
                # Encoder automatiquement avec le pipeline complet
                pipeline_result = None
                encodage_reussi = False
                
                try:
                    pipeline_result = enrollement_pipeline(photo.image)
                    
                    if pipeline_result.get("success", False):
                        save_enrollement_to_biometrie_photo(
                            photo=photo,
                            pipeline_result=pipeline_result,
                            save_all=True
                        )
                        encodage_reussi = True
                        logger.info(f"Encodage complet réussi pour photo {type_photo} du criminel #{criminel.pk}")
                    else:
                        logger.warning(
                            f"Échec de l'encodage pour photo {type_photo} du criminel #{criminel.pk}: "
                            f"{pipeline_result.get('error', 'Erreur inconnue')}"
                        )
                except Exception as e:
                    logger.error(f"Erreur lors de l'encodage automatique: {e}", exc_info=True)
                
                # Enregistrer dans l'audit
                BiometrieAuditService.enregistrer_action(
                    type_objet='photo',
                    objet_id=photo.id,
                    action='creation',
                    criminel=criminel,
                    utilisateur=request.user if request.user.is_authenticated else None,
                    description=f'{description} - Upload séparé via API',
                    donnees_apres={
                        'type_photo': type_photo,
                        'encodage_genere': encodage_reussi,
                        'embedding_512': bool(pipeline_result and pipeline_result.get("embedding512")),
                        'landmarks_106': bool(pipeline_result and pipeline_result.get("landmarks106")),
                    },
                    request=request
                )
                
                # Enregistrer aussi dans le journal d'audit général
                try:
                    from utils.audit_logger import log_action
                    log_action(
                        user=request.user if request.user.is_authenticated else None,
                        action='upload',
                        resource='Photo Biométrique',
                        resource_id=str(photo.id),
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        endpoint=request.path,
                        methode_http=request.method,
                        details={
                            'criminel_id': criminel.pk,
                            'type_photo': type_photo,
                            'encodage_reussi': encodage_reussi
                        },
                        request=request
                    )
                except Exception as e:
                    logger.warning(f"Erreur lors de l'enregistrement dans le journal d'audit: {e}")
                
                return Response({
                    'success': True,
                    'message': f'{description} uploadée avec succès',
                    'photo_id': photo.id,
                    'type_photo': type_photo,
                    'encodage_reussi': encodage_reussi,
                    'pipeline_result': {
                        'embedding512': len(pipeline_result.get('embedding512', [])) if pipeline_result else 0,
                        'landmarks106': len(pipeline_result.get('landmarks106', [])) if pipeline_result else 0,
                        'warnings': pipeline_result.get('warnings', []) if pipeline_result else []
                    } if pipeline_result else None
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Erreur lors de l'upload de la photo {type_photo}: {e}", exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': f'Erreur lors de l\'upload: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

