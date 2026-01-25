import logging
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Count, Q
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
from datetime import datetime, timedelta
from calendar import monthrange

logger = logging.getLogger(__name__)


def add_cors_headers_to_response(response, request):
    """
    Ajoute les headers CORS à une réponse DRF Response.
    Fonction helper pour garantir que toutes les réponses incluent les headers CORS.
    """
    origin = request.META.get('HTTP_ORIGIN', '')
    if not origin:
        # Essayer de récupérer depuis Referer
        referer = request.META.get('HTTP_REFERER', '')
        if referer:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
            except:
                pass
    
    # Autoriser toutes les origines locales
    if origin and ('localhost' in origin.lower() or '127.0.0.1' in origin.lower()):
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
    elif origin:
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
    else:
        response['Access-Control-Allow-Origin'] = '*'
    
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS, POST, HEAD, PUT, DELETE, PATCH'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRFToken'
    response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Type, Content-Length'
    response['Access-Control-Max-Age'] = '86400'
    
    return response

def subtract_months(reference_date, months):
    """Soustrait un nombre de mois à une date tout en conservant le fuseau horaire."""
    year = reference_date.year
    month = reference_date.month - months
    while month <= 0:
        month += 12
        year -= 1
    day = min(reference_date.day, monthrange(year, month)[1])
    return reference_date.replace(year=year, month=month, day=day)

from .models import (
    RefStatutFiche,
    RefTypeInfraction,
    RefStatutAffaire,
    CriminalFicheCriminelle,
    InvestigationAssignment,
    AssignmentStatus,
    CriminalTypeInfraction,
    CriminalInfraction,
)
from .views_biometric import BiometricPhotoUploadMixin

from .serializers import (
    RefStatutFicheSerializer,
    RefTypeInfractionSerializer,
    RefStatutAffaireSerializer,
    CriminalFicheCriminelleSerializer,
    CriminalTypeInfractionSerializer,
    CriminalInfractionSerializer,
    InvestigationAssignmentSerializer,
)
from .pagination import StableCursorPagination

# Importer le serializer complet
try:
    from .serializers_complet import CriminalFicheCriminelleCompleteSerializer
except ImportError:
    CriminalFicheCriminelleCompleteSerializer = None

from enquete.services import recalculate_progression


User = get_user_model()


class RefStatutFicheViewSet(viewsets.ModelViewSet):
    queryset = RefStatutFiche.objects.all().order_by('ordre')  # type: ignore[attr-defined]
    serializer_class = RefStatutFicheSerializer
    permission_classes = [AllowAny]


class RefTypeInfractionViewSet(viewsets.ModelViewSet):
    queryset = RefTypeInfraction.objects.all().order_by('ordre')  # type: ignore[attr-defined]
    serializer_class = RefTypeInfractionSerializer
    permission_classes = [AllowAny]


class RefStatutAffaireViewSet(viewsets.ModelViewSet):
    queryset = RefStatutAffaire.objects.all().order_by('ordre')  # type: ignore[attr-defined]
    serializer_class = RefStatutAffaireSerializer
    permission_classes = [AllowAny]


class CriminalFicheCriminelleViewSet(BiometricPhotoUploadMixin, viewsets.ModelViewSet):
    queryset = CriminalFicheCriminelle.objects.all()  # type: ignore[attr-defined]
    serializer_class = CriminalFicheCriminelleSerializer
    permission_classes = [IsAuthenticated]
    # Pagination par curseur désactivée ici car le client utilise ?page=1
    # Utilisez l'endpoint séparé /api/fiches-criminelles-cursor/ pour la pagination par curseur
    
    def options(self, request, *args, **kwargs):
        """Gérer les requêtes OPTIONS pour CORS (preflight)"""
        response = Response(status=200)
        return add_cors_headers_to_response(response, request)
    
    def get_permissions(self):
        """
        Instancie et retourne la liste des permissions que cette vue requiert.
        """
        if self.action == 'destroy':
            from .permissions import CanDeleteFicheCriminelle
            return [CanDeleteFicheCriminelle()]
        elif self.action in ['update', 'partial_update']:
            from .permissions import CanModifyFicheCriminelle
            return [CanModifyFicheCriminelle()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Optimiser le queryset avec les relations et filtres"""
        try:
            from utilisateur.permissions import user_is_app_admin
            
            # Vérifier si l'utilisateur est administrateur
            is_admin = (
                self.request.user.is_superuser or 
                getattr(self.request.user, 'is_staff', False) or
                user_is_app_admin(self.request.user)
            )
            
            if hasattr(self.request, 'user') and self.request.user.is_authenticated:
                logger.debug(f"User: {self.request.user.username}, Role: {getattr(self.request.user, 'role', 'N/A')}, is_admin: {is_admin}")
            
            # Récupérer les paramètres de filtrage depuis la requête
            exclude_archived_param = self.request.query_params.get('exclude_archived', 'false')
            if exclude_archived_param and isinstance(exclude_archived_param, str):
                exclude_archived_param = exclude_archived_param.lower() == 'true'
            else:
                exclude_archived_param = False
            search = self.request.query_params.get('search', None)
            statut = self.request.query_params.get('statut', None)
            niveau_danger = self.request.query_params.get('niveau_danger', None)
            
            # Construire le queryset de base
            # Les autres utilisateurs voient uniquement les fiches non archivées
            if is_admin:
                # Administrateurs voient toutes les fiches par défaut
                # Sauf si exclude_archived=true est explicitement demandé
                if exclude_archived_param:
                    queryset = CriminalFicheCriminelle.objects.filter(is_archived=False)  # type: ignore[attr-defined]
                    logger.debug("Admin: Excluant les fiches archivées (exclude_archived=true)")
                else:
                    queryset = CriminalFicheCriminelle.objects.all()  # type: ignore[attr-defined]
                    logger.debug(f"Admin: Récupération de toutes les fiches (total: {queryset.count()})")
            else:
                # Par défaut, exclure les fiches archivées pour les non-admins
                queryset = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                    is_archived=False
                )
                logger.debug(f"Non-admin: Récupération des fiches actives uniquement (total: {queryset.count()})")
            
            # Optimiser avec select_related et prefetch_related pour éviter les requêtes N+1
            queryset = queryset.select_related(
                'statut_fiche'
            ).prefetch_related(
                'infractions__type_infraction',
                'infractions__statut_affaire'
            )
            
            # IMPORTANT : Toujours avoir un ordering par défaut pour éviter les conflits avec OrderingFilter
            # Si aucun ordering n'est spécifié dans la requête, utiliser celui-ci
            ordering_param = self.request.query_params.get('ordering', None)
            if not ordering_param:
                queryset = queryset.order_by('-date_creation', '-id')
            # Sinon, laisser OrderingFilter gérer l'ordering
            
            if search:
                search_str = str(search).strip() if search else ''
                if search_str:
                    # Construire la requête Q de manière explicite pour éviter les erreurs de type
                    search_q1 = Q(nom__icontains=search_str)
                    search_q2 = Q(prenom__icontains=search_str)
                    search_q3 = Q(surnom__icontains=search_str)
                    search_q4 = Q(numero_fiche__icontains=search_str)
                    search_query = search_q1 | search_q2 | search_q3 | search_q4  # type: ignore
                    queryset = queryset.filter(search_query)
            
            # Filtre par statut
            if statut:
                statut_str = str(statut).strip() if statut else ''
                if statut_str:
                    queryset = queryset.filter(statut_fiche__code=statut_str)
            
            # Filtre par niveau de danger
            if niveau_danger:
                try:
                    niveau_int = int(str(niveau_danger))
                    queryset = queryset.filter(niveau_danger=niveau_int)
                except (ValueError, TypeError):
                    pass  # Ignorer si la valeur n'est pas un entier valide
            
            return queryset
        except Exception as e:
            logger.error(f"Erreur dans get_queryset: {str(e)}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return CriminalFicheCriminelle.objects.none()  # type: ignore[attr-defined]
    
    def list(self, request, *args, **kwargs):
        """Lister les fiches avec pagination et gestion d'erreurs améliorée"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Pagination automatique par DRF
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True, context={'request': request})
                return self.get_paginated_response(serializer.data)
            
            # Si pas de pagination, retourner toutes les données
            serializer = self.get_serializer(queryset, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la liste des fiches: {str(e)}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Erreur lors de la récupération de la liste: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Récupérer une fiche (actives ou archivées)"""
        pk = self.kwargs.get('pk')
        
        if not pk:
            return Response(
                {'error': 'ID de fiche non fourni'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Optimiser avec select_related pour charger les relations
            try:
                queryset = self.get_queryset().select_related(
                    'statut_fiche'
                ).prefetch_related(
                    'infractions__type_infraction',
                    'infractions__statut_affaire'
                )
                instance = queryset.get(pk=pk)
            except (Http404, ObjectDoesNotExist):
                # Si la fiche n'est pas trouvée dans les fiches actives,
                # chercher dans les archives avec les relations préchargées
                try:
                    instance = CriminalFicheCriminelle.objects.select_related(  # type: ignore[attr-defined]
                        'statut_fiche'
                    ).prefetch_related(
                        'infractions__type_infraction',
                        'infractions__statut_affaire'
                    ).get(pk=pk, is_archived=True)
                except ObjectDoesNotExist:
                    error_response = Response(
                        {'error': 'Fiche non trouvée'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    return add_cors_headers_to_response(error_response, request)
            
            serializer = self.get_serializer(instance, context={'request': request})
            # Journaliser l'action de consultation
            try:
                from audit.services import audit_log
                audit_log(
                    request=request,
                    module="Gestion criminelle",
                    action="Consultation fiche criminelle",
                    ressource=f"Fiche criminelle #{instance.id}",
                    narration=(
                        f"La fiche criminelle n°{instance.id} a été consultée par "
                        f"{request.user.username} sans modification des données."
                    )
                )
            except Exception as e:
                logger.warning(f"Erreur lors de l'enregistrement de l'audit pour consultation de fiche: {e}")
            response = Response(serializer.data)
            return add_cors_headers_to_response(response, request)
        except ObjectDoesNotExist:
            error_response = Response(
                {'error': 'Fiche non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
            return add_cors_headers_to_response(error_response, request)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la fiche {pk}: {str(e)}", exc_info=True)
            import traceback
            logger.error(f"Traceback complet: {traceback.format_exc()}")
            error_response = Response(
                {'error': f'Erreur lors de la récupération de la fiche: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            return add_cors_headers_to_response(error_response, request)
    
    @action(detail=True, methods=['get'], url_path='complet')
    def complet(self, request, pk=None):
        """
        Récupérer une fiche criminelle COMPLÈTE avec TOUTES les informations organisées par sections
        """
        if not CriminalFicheCriminelleCompleteSerializer:
            return Response(
                {'error': 'Serializer complet non disponible'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            # Récupérer la fiche avec toutes les relations optimisées
            queryset = CriminalFicheCriminelle.objects.select_related(
                'statut_fiche',
                'created_by',
            ).prefetch_related(
                'infractions__type_infraction',
                'infractions__statut_affaire',
                'photos_biometriques',
                'empreintes_biometriques',
                'encodages_biometriques',
                'historique_biometrie',
            )
            
            # Essayer d'abord dans les fiches actives, puis dans les archives
            try:
                instance = queryset.get(pk=pk, is_archived=False)
            except ObjectDoesNotExist:
                instance = queryset.get(pk=pk, is_archived=True)
            
            # Utiliser le serializer complet
            serializer = CriminalFicheCriminelleCompleteSerializer(
                instance,
                context={'request': request}
            )
            
            # Journaliser l'action de consultation complète
            try:
                from audit.services import audit_log
                audit_log(
                    request=request,
                    module="Gestion criminelle",
                    action="Consultation fiche criminelle",
                    ressource=f"Fiche criminelle #{instance.id}",
                    narration=(
                        f"La fiche criminelle n°{instance.id} a été consultée dans son intégralité par "
                        f"{request.user.username} sans modification des données."
                    )
                )
            except Exception as e:
                logger.warning(f"Erreur audit fiche complète: {e}")
            
            response = Response(serializer.data)
            return add_cors_headers_to_response(response, request)
            
        except ObjectDoesNotExist:
            return Response(
                {'error': 'Fiche non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la fiche complète {pk}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = self.perform_create(serializer)
            # Journaliser l'action de création
            try:
                from audit.services import audit_log
                audit_log(
                    request=request,
                    module="Gestion criminelle",
                    action="Création fiche criminelle",
                    ressource=f"Fiche criminelle #{instance.id}",
                    narration=(
                        f"L'utilisateur {request.user.username} a créé une nouvelle fiche "
                        f"criminelle afin d'enregistrer un individu suspect dans la base SGIC."
                    )
                )
            except Exception as e:
                logger.warning(f"Erreur lors de l'enregistrement de l'audit pour création de fiche: {e}")
            response = Response(serializer.data, status=status.HTTP_201_CREATED)
            return add_cors_headers_to_response(response, request)
        error_response = Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return add_cors_headers_to_response(error_response, request)
    
    def perform_create(self, serializer):
        """Enregistrer la fiche et retourner l'instance"""
        return serializer.save()
    
    def update(self, request, *args, **kwargs):
        """Mettre à jour une fiche"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Mais on peut ajouter une vérification supplémentaire pour les Enquêteurs
        user = request.user
        user_role = (getattr(user, 'role', '') or '').strip()
        
        if user_role in ['Enquêteur', 'Enquêteur Junior']:
            from criminel.models import InvestigationAssignment
            assignment = InvestigationAssignment.objects.filter(
                fiche=instance,
                assigned_investigator=user,
                status__in=['en_attente', 'en_cours', 'confirmee']
            ).first()
            
            if not assignment:
                # Vérifier si c'est le créateur
                if not (hasattr(instance, 'created_by') and instance.created_by == user):
                    return Response(
                        {
                            'error': 'Vous n\'êtes pas autorisé à modifier ce dossier.',
                            'detail': 'Ce dossier n\'est pas assigné à votre compte. Seuls les dossiers qui vous sont assignés peuvent être modifiés.'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        # Capturer les valeurs avant modification pour l'audit
        old_values = {}
        if instance.pk:
            # Capturer les champs principaux avant modification
            old_values = {
                'numero_fiche': instance.numero_fiche or '',
                'nom': instance.nom or '',
                'prenom': instance.prenom or '',
                'surnom': instance.surnom or '',
                'sexe': instance.sexe or '',
                'date_naissance': str(instance.date_naissance) if instance.date_naissance else '',
                'lieu_naissance': instance.lieu_naissance or '',
                'nationalite': instance.nationalite or '',
                'cin': instance.cin or '',
                'niveau_danger': instance.niveau_danger or '',
            }
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            updated_instance = self.perform_update(serializer, old_values=old_values)
            # Message de succès selon le rôle
            message = "Modification effectuée avec succès."
            if user_role in ['Enquêteur Principal', 'Enquêteur', 'Enquêteur Junior']:
                message = "Modification effectuée par enquêteur."
            
            return Response({
                **serializer.data,
                'message': message
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_update(self, serializer, old_values=None):
        """Exécuter la mise à jour avec capture des valeurs pour l'audit"""
        user = self.request.user
        user_role = (getattr(user, 'role', '') or '').strip()
        
        instance = serializer.save()
        
        # Si on a des old_values, enregistrer explicitement l'action d'audit avec les détails
        if old_values and instance.pk:
            try:
                from audit.signals import enregistrer_action_audit
                
                # Préparer les new_values
                new_values = {
                    'numero_fiche': instance.numero_fiche or '',
                    'nom': instance.nom or '',
                    'prenom': instance.prenom or '',
                    'surnom': instance.surnom or '',
                    'sexe': instance.sexe or '',
                    'date_naissance': str(instance.date_naissance) if instance.date_naissance else '',
                    'lieu_naissance': instance.lieu_naissance or '',
                    'nationalite': instance.nationalite or '',
                    'cin': instance.cin or '',
                    'niveau_danger': instance.niveau_danger or '',
                }
                
                # Identifier les champs modifiés
                changed_fields = []
                for key in set(list(old_values.keys()) + list(new_values.keys())):
                    if old_values.get(key) != new_values.get(key):
                        changed_fields.append(key)
                
                # Préparer les détails enrichis
                details = {
                    'numero_fiche': instance.numero_fiche or '',
                    'nom': instance.nom or '',
                    'prenom': instance.prenom or '',
                    'surnom': instance.surnom or '',
                    'modified_by_role': user_role,
                }
                
                if changed_fields:
                    details['changed_fields'] = changed_fields
                    details['old_values'] = old_values
                    details['new_values'] = new_values
                    details['before'] = old_values
                    details['after'] = new_values
                
                # Enregistrer l'action d'audit explicitement
                enregistrer_action_audit(
                    action='modification',
                    ressource='Fiche Criminelle',
                    ressource_id=instance.id,
                    details=details,
                    old_values=old_values,
                    new_values=new_values
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur lors de l'enregistrement de l'audit pour modification de fiche: {e}", exc_info=True)
        
        return instance
    
    def partial_update(self, request, *args, **kwargs):
        """Mise à jour partielle (PATCH)"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Archiver une fiche criminelle (soft delete)
        La fiche est marquée comme archivée au lieu d'être supprimée définitivement
        """
        # Récupérer le pk depuis les kwargs
        pk = self.kwargs.get('pk')
        
        if not pk:
            return Response(
                {'error': 'ID de fiche non fourni'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            try:
                instance = CriminalFicheCriminelle.objects.select_related(  # type: ignore[attr-defined]
                    'statut_fiche'
                ).prefetch_related(
                    'infractions__type_infraction',
                    'infractions__statut_affaire'
                ).get(pk=pk)
                logger.debug(f"Fiche {pk} trouvée pour archivage. is_archived={instance.is_archived}")
            except ObjectDoesNotExist:
                logger.error(f"Fiche {pk} non trouvée pour archivage")
                return Response(
                    {
                        'error': 'Fiche non trouvée',
                        'message': 'La fiche demandée n\'existe pas ou a été supprimée.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            from .permissions import CanDeleteFicheCriminelle
            permission = CanDeleteFicheCriminelle()
            if not permission.has_object_permission(request, self, instance):
                return Response(
                    {'error': permission.message},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Récupérer les informations de la fiche avant archivage
            numero_fiche = instance.numero_fiche
            nom_complet = f"{instance.nom} {instance.prenom}".strip()
            user = request.user
            user_role = (getattr(user, 'role', '') or '').strip()
            
            # Vérifier si la fiche n'est pas déjà archivée
            if instance.is_archived:
                logger.warning(f"Tentative d'archivage d'une fiche déjà archivée: {pk} par {user.username}")
                return Response(
                    {
                        'success': False,
                        'message': 'Cette fiche est déjà archivée.',
                        'error': 'Fiche déjà archivée'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Archiver la fiche au lieu de la supprimer
            with transaction.atomic():
                # Marquer comme archivée
                instance.is_archived = True
                instance.update_statut_automatique(commit=False)
                instance.save()
            
            # Enregistrer l'action d'audit explicitement
            try:
                from audit.signals import enregistrer_action_audit
                
                details = {
                    'numero_fiche': numero_fiche or '',
                    'nom': instance.nom or '',
                    'prenom': instance.prenom or '',
                    'surnom': instance.surnom or '',
                    'archived_by': user.get_full_name() or user.username,
                    'archived_by_role': user_role,
                    'archived': True,
                    'action_type': 'archivage',
                }
                
                enregistrer_action_audit(
                    action='suppression',
                    ressource='Fiche Criminelle',
                    ressource_id=instance.id,
                    details=details,
                    old_values={'is_archived': False},
                    new_values={'is_archived': True}
                )
            except Exception as e:
                logger.error(f"Erreur lors de l'enregistrement de l'audit pour archivage de fiche: {e}", exc_info=True)
            
            logger.info(f"Fiche {numero_fiche} ({nom_complet}) archivée avec succès par {user.username}")
            
            return Response(
                {
                    'success': True,
                    'message': f'La fiche criminelle "{nom_complet}" (N° {numero_fiche}) a été archivée avec succès.',
                    'numero_fiche': numero_fiche,
                    'nom_complet': nom_complet
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            instance_id = pk if pk else 'inconnu'
            logger.error(f"Erreur lors de l'archivage de la fiche {instance_id}: {str(e)}", exc_info=True)
            
            return Response(
                {
                    'success': False,
                    'message': 'Une erreur est survenue lors de l\'archivage de la fiche. Veuillez réessayer.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='archives')
    def archives(self, request):
        """
        Récupérer toutes les fiches archivées
        GET /api/criminel/fiches-criminelles/archives/
        """
        try:
            queryset = CriminalFicheCriminelle.objects.filter(is_archived=True).order_by('-date_modification')  # type: ignore[attr-defined]
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des archives: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Erreur lors de la récupération des archives'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='unarchive')
    def unarchive(self, request, pk=None):
        """
        Désarchiver une fiche criminelle
        POST /api/criminel/fiches-criminelles/{id}/unarchive/
        """
        try:
            # Récupérer la fiche même si elle est archivée
            try:
                instance = CriminalFicheCriminelle.objects.select_related(  # type: ignore[attr-defined]
                    'statut_fiche'
                ).get(pk=pk)
                logger.debug(f"Fiche {pk} trouvée pour désarchivage. is_archived={instance.is_archived}")
            except ObjectDoesNotExist:
                logger.error(f"Fiche {pk} non trouvée pour désarchivage")
                return Response(
                    {
                        'error': 'Fiche non trouvée',
                        'message': 'La fiche demandée n\'existe pas ou a été supprimée.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            from .permissions import CanDeleteFicheCriminelle
            permission = CanDeleteFicheCriminelle()
            if not permission.has_object_permission(request, self, instance):
                return Response(
                    {'error': permission.message},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Récupérer les informations de la fiche avant désarchivage
            numero_fiche = instance.numero_fiche
            nom_complet = f"{instance.nom} {instance.prenom}".strip()
            user = request.user
            user_role = (getattr(user, 'role', '') or '').strip()
            
            # Vérifier si la fiche est bien archivée
            if not instance.is_archived:
                logger.warning(f"Tentative de désarchivage d'une fiche non archivée: {pk} par {user.username}")
                return Response(
                    {
                        'success': False,
                        'message': 'Cette fiche n\'est pas archivée.',
                        'error': 'Fiche non archivée'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Désarchiver la fiche
            with transaction.atomic():
                # Marquer comme non archivée
                instance.is_archived = False
                instance.update_statut_automatique(commit=False)
                instance.save()
            
            # Enregistrer l'action d'audit explicitement
            try:
                from audit.signals import enregistrer_action_audit
                
                details = {
                    'numero_fiche': numero_fiche or '',
                    'nom': instance.nom or '',
                    'prenom': instance.prenom or '',
                    'surnom': instance.surnom or '',
                    'unarchived_by': user.get_full_name() or user.username,
                    'unarchived_by_role': user_role,
                    'archived': False,
                    'action_type': 'désarchivage',
                }
                
                # Enregistrer comme "modification" dans l'audit
                enregistrer_action_audit(
                    action='modification',
                    ressource='Fiche Criminelle',
                    ressource_id=instance.id,
                    details=details,
                    old_values={'is_archived': True},
                    new_values={'is_archived': False}
                )
            except Exception as e:
                logger.error(f"Erreur lors de l'enregistrement de l'audit pour désarchivage de fiche: {e}", exc_info=True)
            
            logger.info(f"Fiche {numero_fiche} ({nom_complet}) désarchivée avec succès par {user.username}")
            
            return Response(
                {
                    'success': True,
                    'message': f'La fiche criminelle "{nom_complet}" (N° {numero_fiche}) a été désarchivée avec succès.',
                    'numero_fiche': numero_fiche,
                    'nom_complet': nom_complet
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Erreur lors du désarchivage de la fiche {pk}: {str(e)}", exc_info=True)
            
            return Response(
                {
                    'success': False,
                    'message': 'Une erreur est survenue lors du désarchivage de la fiche. Veuillez réessayer.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Récupérer les statistiques des fiches criminelles
        GET /api/criminel/fiches-criminelles/stats/
        """
        try:
            fiches_actives = CriminalFicheCriminelle.objects.filter(is_archived=False)  # type: ignore[attr-defined]
            
            # Statistiques générales
            total_fiches = fiches_actives.count()
            
            # Initialiser les statuts pour éviter les erreurs "possibly unbound"
            statut_en_cours = None
            statut_cloture = None
            
            try:
                statut_en_cours = RefStatutFiche.objects.get(code='en_cours')  # type: ignore[attr-defined]
                en_cours = fiches_actives.filter(statut_fiche=statut_en_cours).count()
            except ObjectDoesNotExist:
                en_cours = 0
            
            try:
                statut_cloture = RefStatutFiche.objects.get(code='cloture')  # type: ignore[attr-defined]
                clotures = fiches_actives.filter(statut_fiche=statut_cloture).count()
            except ObjectDoesNotExist:
                clotures = 0
            
            critiques = fiches_actives.filter(niveau_danger__gte=4).count()
            
            date_limite_30j = datetime.now() - timedelta(days=30)
            date_limite_60j = datetime.now() - timedelta(days=60)
            
            # Total ce mois vs mois dernier
            total_ce_mois = fiches_actives.filter(date_creation__gte=date_limite_30j).count()
            total_mois_dernier = fiches_actives.filter(
                date_creation__gte=date_limite_60j,
                date_creation__lt=date_limite_30j
            ).count()
            evolution_total = self._calculer_evolution(total_ce_mois, total_mois_dernier)
            
            # En cours ce mois vs mois dernier
            if statut_en_cours:
                try:
                    en_cours_ce_mois = fiches_actives.filter(
                        statut_fiche=statut_en_cours,
                        date_creation__gte=date_limite_30j
                    ).count()
                    en_cours_mois_dernier = fiches_actives.filter(
                        statut_fiche=statut_en_cours,
                        date_creation__gte=date_limite_60j,
                        date_creation__lt=date_limite_30j
                    ).count()
                    evolution_en_cours = self._calculer_evolution(en_cours_ce_mois, en_cours_mois_dernier)
                except:
                    evolution_en_cours = "0%"
            else:
                evolution_en_cours = "0%"
            
            # Clôturées ce mois vs mois dernier
            if statut_cloture:
                try:
                    clotures_ce_mois = fiches_actives.filter(
                        statut_fiche=statut_cloture,
                        date_creation__gte=date_limite_30j
                    ).count()
                    clotures_mois_dernier = fiches_actives.filter(
                        statut_fiche=statut_cloture,
                        date_creation__gte=date_limite_60j,
                        date_creation__lt=date_limite_30j
                    ).count()
                    evolution_clotures = self._calculer_evolution(clotures_ce_mois, clotures_mois_dernier)
                except:
                    evolution_clotures = "0%"
            else:
                evolution_clotures = "0%"
            
            # Critiques ce mois vs mois dernier
            critiques_ce_mois = fiches_actives.filter(
                niveau_danger__gte=4,
                date_creation__gte=date_limite_30j
            ).count()
            critiques_mois_dernier = fiches_actives.filter(
                niveau_danger__gte=4,
                date_creation__gte=date_limite_60j,
                date_creation__lt=date_limite_30j
            ).count()
            evolution_critiques = self._calculer_evolution(critiques_ce_mois, critiques_mois_dernier)
            
            # Statistiques par niveau de danger
            par_niveau_danger = {}
            for niveau, libelle in CriminalFicheCriminelle.NIVEAU_DANGER_CHOICES:
                count = fiches_actives.filter(niveau_danger=niveau).count()
                par_niveau_danger[libelle] = count
            
            # Statistiques par sexe
            par_sexe = {}
            for code, libelle in CriminalFicheCriminelle.SEXE_CHOICES:
                count = fiches_actives.filter(sexe=code).count()
                par_sexe[libelle] = count
            
            # Fiches avec photos
            fiches_avec_photo = fiches_actives.filter(photo__isnull=False).exclude(photo='').count()
            fiches_sans_photo = total_fiches - fiches_avec_photo
            
            # Statistiques par statut de fiche
            par_statut = []
            statuts = RefStatutFiche.objects.filter(actif=True)  # type: ignore[attr-defined]
            for statut in statuts:
                count = fiches_actives.filter(statut_fiche=statut).count()
                par_statut.append({
                    'statut': statut.libelle,
                    'count': count
                })
            
            total_infractions = CriminalInfraction.objects.filter(fiche__is_archived=False).count()  # type: ignore[attr-defined]
            
            top_infractions = CriminalInfraction.objects.filter(fiche__is_archived=False).values(  # type: ignore[attr-defined]
                'type_infraction__libelle'
            ).annotate(
                count=Count('id')
            ).order_by('-count')[:5]
            
            # Formater les données
            top_infractions_formatted = [
                {
                    'type': item['type_infraction__libelle'] or 'Non défini',
                    'count': item['count']
                }
                for item in top_infractions
            ]
            
            # Construire la réponse avec le format attendu par le frontend
            statistiques = {
                # Format pour le dashboard principal
                'total': total_fiches,
                'en_cours': en_cours,
                'clotures': clotures,
                'critiques': critiques,
                'evolution_total': evolution_total,
                'evolution_total_hausse': not evolution_total.startswith('-'),
                'evolution_en_cours': evolution_en_cours,
                'evolution_en_cours_hausse': not evolution_en_cours.startswith('-'),
                'evolution_clotures': evolution_clotures,
                'evolution_clotures_hausse': not evolution_clotures.startswith('-'),
                'evolution_critiques': evolution_critiques,
                'evolution_critiques_hausse': not evolution_critiques.startswith('-'),
                
                # Statistiques détaillées
                'total_fiches': total_fiches,
                'par_niveau_danger': par_niveau_danger,
                'par_sexe': par_sexe,
                'photos': {
                    'avec_photo': fiches_avec_photo,
                    'sans_photo': fiches_sans_photo
                },
                'fiches_recentes_30j': total_ce_mois,
                'par_statut': par_statut,
                'total_infractions': total_infractions,
                'top_infractions': top_infractions_formatted
            }
            
            return Response(statistiques, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur lors de la récupération des statistiques: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculer_evolution(self, valeur_actuelle, valeur_precedente):
        """Calculer le pourcentage d'évolution entre deux valeurs"""
        if valeur_precedente == 0:
            if valeur_actuelle == 0:
                return "0%"
            else:
                return "+100%"
        
        evolution = ((valeur_actuelle - valeur_precedente) / valeur_precedente) * 100
        signe = "+" if evolution > 0 else ""
        return f"{signe}{evolution:.1f}%"
    
    @action(detail=False, methods=['get'], url_path='crime-type-stats')
    def crime_type_stats(self, request):
        """
        Récupérer les statistiques par type de crime
        GET /api/criminel/fiches-criminelles/crime-type-stats/
        """
        try:
            stats_par_type = CriminalInfraction.objects.filter(fiche__is_archived=False).values(  # type: ignore[attr-defined]
                'type_infraction__libelle'
            ).annotate(
                count=Count('id')
            ).order_by('-count')
            
            # Formater les données pour le frontend
            result = []
            for stat in stats_par_type:
                if stat['type_infraction__libelle']:
                    result.append({
                        'name': stat['type_infraction__libelle'],
                        'type': stat['type_infraction__libelle'],
                        'count': stat['count'],
                        'valeur': stat['count']
                    })
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des stats par type: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='monthly-stats')
    def monthly_stats(self, request):
        """
        Récupérer les statistiques mensuelles avec données d'assignations
        GET /api/criminel/fiches-criminelles/monthly-stats/?months=12
        """
        try:
            from django.db.models.functions import TruncMonth
            from django.utils import timezone
            
            months = int(request.query_params.get('months', 12))
            # Validation : s'assurer que le nombre de mois est valide (entre 1 et 24)
            months = max(1, min(24, months))

            # Calculer la date il y a `months` mois sans dépendre de bibliothèques externes
            now = timezone.now()
            date_debut = subtract_months(now, months)
            
            # Obtenir toutes les fiches actives depuis cette date, groupées par mois
            fiches_par_mois = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                date_creation__gte=date_debut,
                is_archived=False
            ).annotate(
                mois=TruncMonth('date_creation')
            ).values('mois').annotate(
                total=Count('id')
            ).order_by('mois')
            
            # Obtenir les fiches clôturées par mois
            try:
                statut_cloture = RefStatutFiche.objects.get(code='cloture')  # type: ignore[attr-defined]
                fiches_cloturees = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                    date_creation__gte=date_debut,
                    statut_fiche=statut_cloture,
                    is_archived=False
                ).annotate(
                    mois=TruncMonth('date_creation')
                ).values('mois').annotate(
                    total=Count('id')
                ).order_by('mois')
                
                # Créer un dictionnaire pour accès rapide
                clotures_dict = {item['mois']: item['total'] for item in fiches_cloturees}
            except ObjectDoesNotExist:
                clotures_dict = {}
            
            # Obtenir les statistiques d'assignations par mois de CRÉATION de la fiche (pas date d'assignation)
            # Compter les FICHES distinctes par statut d'assignation
            # Pour chaque fiche, on utilise son assignation la plus récente pour déterminer le statut
            
            # Récupérer toutes les fiches créées dans la période avec leur dernière assignation
            fiches_avec_assignations = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                date_creation__gte=date_debut,
                is_archived=False
            ).prefetch_related('assignations').annotate(
                mois=TruncMonth('date_creation')
            )
            
            # Créer des dictionnaires pour chaque statut d'assignation
            pending_dict = {}
            in_progress_dict = {}
            closed_dict = {}
            overdue_dict = {}
            
            # Pour chaque fiche, déterminer son statut d'assignation (dernière assignation)
            # Si pas d'assignation, la fiche sera comptée dans "en attente" plus tard
            for fiche in fiches_avec_assignations:
                mois_date = fiche.mois
                # Utiliser la relation prefetch_related
                assignations_list = list(fiche.assignations.all())
                
                if assignations_list:
                    # Trier par date d'assignation décroissante et prendre la première (la plus récente)
                    assignations_list.sort(key=lambda a: a.assignment_date, reverse=True)
                    derniere_assignation = assignations_list[0]
                    stat = derniere_assignation.status  # stat est déjà une chaîne (ex: 'pending', 'in_progress', etc.)
                    
                    # Vérifier si l'assignation est en échéance dépassée
                    # Si la date limite est dépassée ET le statut n'est pas déjà "closed" ou "overdue"
                    today = timezone.now().date()
                    if derniere_assignation.due_date and derniere_assignation.due_date < today:
                        # Si le statut est "pending", "in_progress", ou "on_hold", le changer en "overdue"
                        if stat in ['pending', 'in_progress', 'on_hold']:
                            stat = 'overdue'
                    
                    # Compter la fiche dans le bon dictionnaire selon le statut final
                    if stat == 'pending':
                        pending_dict[mois_date] = pending_dict.get(mois_date, 0) + 1
                    elif stat == 'in_progress':
                        in_progress_dict[mois_date] = in_progress_dict.get(mois_date, 0) + 1
                    elif stat == 'closed':
                        closed_dict[mois_date] = closed_dict.get(mois_date, 0) + 1
                    elif stat == 'overdue':
                        overdue_dict[mois_date] = overdue_dict.get(mois_date, 0) + 1
                    elif stat == 'on_hold':
                        # Les assignations "suspendues" sont comptées comme "en attente" pour les statistiques
                        pending_dict[mois_date] = pending_dict.get(mois_date, 0) + 1
                # Si pas d'assignation, la fiche sera comptée plus tard dans "en attente"
            
            # Formater les données
            result = []
            mois_noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
            
            for item in fiches_par_mois:
                mois_date = item['mois']
                mois_str = f"{mois_noms[mois_date.month - 1]} {mois_date.year}"
                total_fiches = item['total']
                
                # Récupérer les stats d'assignations pour ce mois
                pending = pending_dict.get(mois_date, 0)
                in_progress = in_progress_dict.get(mois_date, 0)
                closed = closed_dict.get(mois_date, 0)
                overdue = overdue_dict.get(mois_date, 0)
                
                # RÉSOLUS (resolus) : 
                # - Fiches avec dernière assignation ayant statut "closed" = closed
                # - Fiches avec statut "cloture" mais sans assignation "closed" = resolus_from_fiches
                # Il faut éviter le double comptage : une fiche clôturée peut avoir une assignation "closed" OU être clôturée sans assignation
                resolus_from_assignments = closed  # Fiches avec assignation "closed"
                resolus_from_fiches = clotures_dict.get(mois_date, 0)  # Fiches clôturées (peuvent avoir ou non une assignation "closed")
                
                # Si une fiche est clôturée ET a une assignation "closed", elle est déjà comptée dans closed
                # Si une fiche est clôturée MAIS n'a PAS d'assignation "closed", elle doit être ajoutée aux résolus
                # Utiliser le maximum pour capturer toutes les fiches clôturées
                resolus = max(resolus_from_assignments, resolus_from_fiches)
                
                # Le total doit être le nombre de fiches créées (source de vérité)
                total = total_fiches
                
                # Calculer le total des fiches avec assignations comptées
                total_avec_assignations = pending + in_progress + closed + overdue
                
                # Calculer les fiches sans assignation (ou sans assignation comptée)
                fiches_sans_assignation = max(0, total_fiches - total_avec_assignations)
                
                # Parmi ces fiches sans assignation, certaines peuvent être clôturées
                # Si resolus_from_fiches > closed, cela signifie qu'il y a des fiches clôturées sans assignation "closed"
                fiches_cloturees_deja_comptees = min(resolus_from_assignments, resolus_from_fiches)  # Partie commune
                fiches_cloturees_sans_assignation = max(0, resolus_from_fiches - resolus_from_assignments)
                
                # Les fiches sans assignation qui ne sont pas clôturées doivent aller dans "en attente"
                # Les fiches clôturées sans assignation sont déjà dans resolus
                if fiches_sans_assignation > 0:
                    # Certaines de ces fiches peuvent être clôturées mais non comptées
                    fiches_non_cloturees_sans_assignation = max(0, fiches_sans_assignation - fiches_cloturees_sans_assignation)
                    pending = pending + fiches_non_cloturees_sans_assignation
                
                # Vérifier la cohérence finale : total = somme de toutes les catégories
                total_categories = pending + in_progress + resolus + overdue
                
                # Si le total ne correspond pas, ajuster "en attente" en dernier recours
                # Cela garantit que total = somme des catégories
                if total_categories != total and total > 0:
                    difference = total - total_categories
                    pending = max(0, pending + difference)
                
                result.append({
                    'mois': mois_str,
                    'cas': total,  # Utiliser le total cohérent
                    'total': total,  # Ajouter explicitement total pour le frontend
                    'resolus': resolus,  # Résolus = assignations "closed" + fiches clôturées sans assignation
                    # Statistiques d'assignations
                    'pending': pending,  # En attente = assignations "pending" + "on_hold" + fiches sans assignation
                    'in_progress': in_progress,  # En cours = assignations "in_progress"
                    'closed': resolus,  # Alias pour compatibilité (utiliser resolus au lieu de closed)
                    'overdue': overdue,  # Échéance dépassée = assignations "overdue" ou avec due_date dépassée
                    # Aliases pour compatibilité
                    'enAttente': pending,
                    'enCours': in_progress,
                    'echeanceDepassee': overdue
                })
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des stats mensuelles: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='evolution-stats')
    def evolution_stats(self, request):
        """
        Récupérer les statistiques d'évolution détaillée (totaux, résolus, en cours)
        GET /api/criminel/fiches-criminelles/evolution-stats/?months=12
        """
        try:
            from django.db.models.functions import TruncMonth
            from django.utils import timezone
            
            months = int(request.query_params.get('months', 12))
            # Validation : s'assurer que le nombre de mois est valide (entre 1 et 24)
            months = max(1, min(24, months))
            
            now = timezone.now()
            date_debut = subtract_months(now, months)
            
            # Initialiser les statuts pour éviter les erreurs "possibly unbound"
            statut_cloture = None
            statut_en_cours = None
            
            # Obtenir le statut "en_cours" et "cloture"
            try:
                statut_cloture = RefStatutFiche.objects.get(code='cloture')  # type: ignore[attr-defined]
                statut_en_cours = RefStatutFiche.objects.get(code='en_cours')  # type: ignore[attr-defined]
            except ObjectDoesNotExist:
                pass  # Les variables sont déjà initialisées à None
            
            # Obtenir toutes les fiches actives par mois avec statuts
            fiches_par_mois = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                date_creation__gte=date_debut,
                is_archived=False
            ).annotate(
                mois=TruncMonth('date_creation')
            ).values('mois').annotate(
                total=Count('id')
            ).order_by('mois')
            
            # Fiches clôturées par mois
            if statut_cloture:
                fiches_resolues = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                    date_creation__gte=date_debut,
                    statut_fiche=statut_cloture,
                    is_archived=False
                ).annotate(
                    mois=TruncMonth('date_creation')
                ).values('mois').annotate(
                    total=Count('id')
                ).order_by('mois')
                resolues_dict = {item['mois']: item['total'] for item in fiches_resolues}
            else:
                resolues_dict = {}
            
            # Fiches en cours par mois
            if statut_en_cours:
                fiches_en_cours = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                    date_creation__gte=date_debut,
                    statut_fiche=statut_en_cours,
                    is_archived=False
                ).annotate(
                    mois=TruncMonth('date_creation')
                ).values('mois').annotate(
                    total=Count('id')
                ).order_by('mois')
                en_cours_dict = {item['mois']: item['total'] for item in fiches_en_cours}
            else:
                en_cours_dict = {}
            
            # Formater les données
            result = []
            mois_noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
            
            for item in fiches_par_mois:
                mois_date = item['mois']
                mois_str = f"{mois_noms[mois_date.month - 1]} {mois_date.year}"
                resolus = resolues_dict.get(mois_date, 0)
                en_cours = en_cours_dict.get(mois_date, 0)
                
                result.append({
                    'mois': mois_str,
                    'total': item['total'],
                    'resolus': resolus,
                    'en_cours': en_cours
                })
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des stats d'évolution: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='geographic-stats')
    def geographic_stats(self, request):
        """
        Récupérer les statistiques géographiques par province
        GET /api/criminel/fiches-criminelles/geographic-stats/
        
        Retourne un tableau avec les statistiques par province ou un tableau vide si aucune donnée n'est disponible.
        Format de retour:
        [
            {
                "province": "Fianarantsoa",
                "nombre_de_cas": 5,
                "ville": "Fianarantsoa",
                "city": "Fianarantsoa",
                "cas": 5,
                "count": 5,
                "cases": 5
            },
            ...
        ]
        """
        try:
            # Compter les fiches actives par province en utilisant ORM avec aggregation
            stats_geo = CriminalFicheCriminelle.objects.filter(  # type: ignore[attr-defined]
                is_archived=False
            ).values(
                'province'
            ).annotate(
                nombre_de_cas=Count('id')
            ).filter(
                province__isnull=False
            ).exclude(
                province=''
            ).order_by('-nombre_de_cas')
            
            # Convertir le QuerySet en liste pour le traitement
            stats_list = list(stats_geo)
            
            # Si aucune donnée géographique n'est disponible, retourner un tableau vide avec un message
            if not stats_list:
                logger.info("Aucune donnée géographique trouvée dans la base de données")
                return Response([], status=status.HTTP_200_OK)
            
            # Formater les données dans le format attendu par le frontend
            result = []
            total_max = stats_list[0]['nombre_de_cas'] if stats_list else 1  # Pour normaliser
            
            for stat in stats_list:
                province_name = stat['province'] or 'Inconnu'
                nombre_de_cas = stat['nombre_de_cas'] or 0
                
                result.append({
                    # Format principal avec clés standard
                    'province': province_name,
                    'nombre_de_cas': nombre_de_cas,
                    # Formats alternatifs pour compatibilité
                    'ville': province_name,
                    'city': province_name,
                    'location': province_name,
                    'cas': nombre_de_cas,
                    'count': nombre_de_cas,
                    'cases': nombre_de_cas,
                    'value': nombre_de_cas,
                    # Données supplémentaires
                    'normalized': nombre_de_cas / total_max if total_max > 0 else 0,
                    'evolution': '+0%',  # TODO: Calculer l'évolution si nécessaire
                    'increasing': True,
                    'hausse': True
                })
            
            logger.info(f"Stats géographiques récupérées: {len(result)} provinces trouvées")
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des stats géographiques: {str(e)}", exc_info=True)
            # Retourner un tableau vide en cas d'erreur pour ne pas bloquer le frontend
            return Response([], status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='hourly-stats')
    def hourly_stats(self, request):
        """
        Récupérer les statistiques par heure de la journée
        GET /api/criminel/fiches-criminelles/hourly-stats/
        """
        try:
            from django.db.models.functions import ExtractHour
            
            # Compter les fiches actives par heure de création
            stats_hourly = CriminalFicheCriminelle.objects.filter(is_archived=False).annotate(  # type: ignore[attr-defined]
                heure=ExtractHour('date_creation')
            ).values('heure').annotate(
                count=Count('id')
            ).order_by('heure')
            
            hourly_dict = {i: 0 for i in range(24)}
            
            # Remplir avec les vraies données
            for stat in stats_hourly:
                if stat['heure'] is not None:
                    hourly_dict[stat['heure']] = stat['count']
            
            # Formater les données
            result = []
            for heure in range(24):
                result.append({
                    'heure': f"{heure:02d}h",
                    'time': f"{heure:02d}:00",
                    'cas': hourly_dict[heure],
                    'count': hourly_dict[heure]
                })
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des stats horaires: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CriminalTypeInfractionViewSet(viewsets.ModelViewSet):
    queryset = CriminalTypeInfraction.objects.all().order_by('-gravite')  # type: ignore[attr-defined]
    serializer_class = CriminalTypeInfractionSerializer
    permission_classes = [AllowAny]


class CriminalInfractionViewSet(viewsets.ModelViewSet):
    queryset = CriminalInfraction.objects.all().order_by('-date_infraction')  # type: ignore[attr-defined]
    serializer_class = CriminalInfractionSerializer
    permission_classes = [AllowAny]


class InvestigationAssignmentViewSet(viewsets.ModelViewSet):
    """
    Gestion des assignations d'enquêtes.
    """

    INVESTIGATOR_ROLES = ("Enquêteur", "Enquêteur Junior", "Enquêteur Principal")

    serializer_class = InvestigationAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = InvestigationAssignment.objects.select_related(  # type: ignore[attr-defined]
            "fiche", "assigned_investigator", "assigned_by"
        )
        
        # Vérifier et mettre à jour automatiquement les statuts des assignations avec échéance dépassée
        # Cette vérification se fait à chaque requête pour garantir la cohérence
        self._update_overdue_assignments(queryset)
        
        if user.is_superuser or self._user_can_manage_assignments(user):
            return queryset
        return queryset.filter(
            Q(assigned_investigator=user) | Q(assigned_by=user)
        )
    
    def _update_overdue_assignments(self, queryset):
        """
        Met à jour automatiquement les statuts des assignations avec échéance dépassée.
        Utilise update() directement sur le modèle pour optimiser les performances.
        """
        from django.utils import timezone
        
        today = timezone.now().date()
        
        # Mettre à jour directement en base de données pour optimiser les performances
        # Utiliser InvestigationAssignment.objects directement pour éviter les problèmes de queryset
        updated_count = InvestigationAssignment.objects.filter(  # type: ignore[attr-defined]
            due_date__lt=today,
            due_date__isnull=False,
            status__in=[AssignmentStatus.EN_ATTENTE, AssignmentStatus.EN_COURS, AssignmentStatus.SUSPENDUE]
        ).update(status=AssignmentStatus.ECHEANCE_DEPASSEE)
        
        if updated_count > 0:
            logger.info(f"Mise à jour automatique de {updated_count} assignation(s) avec échéance dépassée.")
    
    def retrieve(self, request, *args, **kwargs):
        """
        Récupère une assignation individuelle et vérifie automatiquement son statut.
        """
        instance = self.get_object()
        
        # Vérifier et mettre à jour le statut si nécessaire
        if instance.check_and_update_status():
            logger.info(f"Statut de l'assignation #{instance.id} mis à jour automatiquement en 'Échéance dépassée'.")
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        if not self._user_can_manage_assignments(user):
            raise PermissionDenied(
                "Vous n'êtes pas autorisé à créer une assignation."
            )
        assignment = serializer.save()
        recalculate_progression(assignment.fiche_id)
        
        # Créer une notification pour l'enquêteur assigné
        try:
            from notifications.utils import creer_notification
            
            dossier = assignment.fiche
            enqueteur = assignment.assigned_investigator
            
            titre = f"Assignation d'enquête - Dossier #{dossier.numero_fiche or dossier.id}"
            message = (
                f"Vous avez été assigné(e) à l'enquête sur le dossier "
                f"« {dossier.nom} {dossier.prenom} » par {user.get_full_name() or user.username}.\n\n"
                f"Statut: {assignment.get_status_display()}\n"
            )
            
            if assignment.instructions:
                message += f"Instructions: {assignment.instructions}\n\n"
            
            if assignment.due_date:
                from django.utils import timezone
                today = timezone.now().date()
                is_overdue = assignment.due_date < today
                message += f"Date limite (échéance): {assignment.due_date.strftime('%d/%m/%Y')}"
                if is_overdue:
                    message += " ⚠️ ÉCHÉANCE DÉPASSÉE"
                message += "\n\n"
            
            message += "Veuillez confirmer cette assignation pour commencer l'enquête."
            
            # Utiliser 'warning' si l'échéance est dépassée
            notification_type = 'warning' if assignment.is_overdue() else 'info'
            
            creer_notification(
                utilisateur=enqueteur,
                titre=titre,
                message=message,
                type=notification_type,
                lien=f'/assignations'
            )
        except Exception as e:
            logger.exception("Erreur lors de la création de la notification d'assignation.")

    def perform_update(self, serializer):
        """
        Seuls les administrateurs peuvent modifier les assignations.
        Les utilisateurs normaux ne peuvent que confirmer leurs assignations.
        """
        user = self.request.user
        
        # Seuls les administrateurs peuvent modifier
        if not self._user_can_manage_assignments(user):
            raise PermissionDenied(
                "Vous n'êtes pas autorisé à modifier cette assignation. "
                "Seuls les administrateurs peuvent modifier les assignations."
            )
        
        assignment = serializer.save()
        
        # Vérifier et mettre à jour automatiquement le statut si l'échéance est dépassée
        if assignment.check_and_update_status():
            logger.info(f"Statut de l'assignation #{assignment.id} mis à jour automatiquement en 'Échéance dépassée' lors de la mise à jour.")

    def perform_destroy(self, instance):
        """
        Seuls les administrateurs peuvent supprimer les assignations.
        """
        user = self.request.user
        
        # Seuls les administrateurs peuvent supprimer
        if not self._user_can_manage_assignments(user):
            raise PermissionDenied(
                "Vous n'êtes pas autorisé à supprimer cette assignation. "
                "Seuls les administrateurs peuvent supprimer les assignations."
            )
        
        dossier_id = instance.fiche_id
        instance.delete()
        recalculate_progression(dossier_id)

    @action(detail=False, methods=["get"], url_path="dossiers")
    def dossiers(self, request):
        """
        Retourner la liste des dossiers actifs disponibles pour l'assignation.
        """
        dossiers = (
            CriminalFicheCriminelle.objects.filter(is_archived=False)  # type: ignore[attr-defined]
            .select_related("statut_fiche")
            .order_by("-date_creation")[:200]
        )
        data = [
            {
                "id": dossier.id,
                "numero_fiche": dossier.numero_fiche,
                "nom": dossier.nom,
                "prenom": dossier.prenom,
                "statut": getattr(dossier.statut_fiche, "libelle", None),
            }
            for dossier in dossiers
        ]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="enqueteurs")
    def enqueteurs(self, request):
        """
        Retourner la liste des utilisateurs pouvant être assignés en tant qu'enquêteurs.
        """
        utilisateurs = User.objects.filter(  # type: ignore[attr-defined]
            role__in=self.INVESTIGATOR_ROLES, is_active=True
        ).order_by("prenom", "nom")
        data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "full_name": user.get_full_name(),
            }
            for user in utilisateurs
        ]
        return Response(data, status=status.HTTP_200_OK)

    def check_object_permissions(self, request, obj):
        """
        Surcharge pour l'action 'confirmer' afin de permettre l'accès même si l'objet
        n'est pas dans le queryset filtré, à condition que l'utilisateur soit l'enquêteur assigné.
        """
        # Pour l'action 'confirmer', vérifier uniquement que l'utilisateur est l'enquêteur assigné
        if self.action == 'confirmer':
            if obj.assigned_investigator_id != request.user.id:
                raise PermissionDenied(
                    "Vous ne pouvez confirmer que vos propres assignations."
                )
            # Si c'est l'enquêteur assigné, autoriser l'accès
            return
        
        # Pour les autres actions, utiliser le comportement par défaut
        super().check_object_permissions(request, obj)

    def get_object(self):
        """
        Surcharge pour l'action 'confirmer' afin de permettre l'accès même si l'objet
        n'est pas dans le queryset filtré.
        """
        # Pour l'action 'confirmer', récupérer l'objet directement sans filtrage
        if self.action == 'confirmer':
            lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
            lookup_value = self.kwargs[lookup_url_kwarg]
            filter_kwargs = {self.lookup_field: lookup_value}
            
            try:
                obj = InvestigationAssignment.objects.select_related(  # type: ignore[attr-defined]
                    "fiche", "assigned_investigator", "assigned_by"
                ).get(**filter_kwargs)
                # Les permissions seront vérifiées dans check_object_permissions
                return obj
            except ObjectDoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound("Assignation introuvable.")
        
        # Pour les autres actions, utiliser le comportement par défaut
        return super().get_object()

    @action(detail=True, methods=["post"], url_path="confirmer")
    def confirmer(self, request, pk=None):
        """
        Confirmer une assignation. Vérifie automatiquement l'échéance.
        Si l'échéance est dépassée, empêche la confirmation et retourne une erreur.
        
        Cette action est accessible même si l'assignation n'est pas dans le queryset filtré,
        à condition que l'utilisateur soit l'enquêteur assigné.
        Les permissions sont vérifiées dans check_object_permissions().
        """
        assignment = self.get_object()
        user = request.user

        can_confirm, reason = assignment.can_be_confirmed()
        
        if not can_confirm:
            return Response(
                {"detail": reason or "Cette assignation ne peut pas être confirmée."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier et mettre à jour le statut si l'échéance est dépassée
        assignment.check_and_update_status()
        
        # Si après vérification le statut est devenu "overdue", empêcher la confirmation
        if assignment.status == AssignmentStatus.ECHEANCE_DEPASSEE:
            return Response(
                {
                    "detail": "L'échéance de cette assignation est dépassée. Veuillez contacter votre superviseur.",
                    "status": assignment.status,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Confirmer l'assignation en passant le statut à "En cours"
        assignment.status = AssignmentStatus.EN_COURS
        assignment.save(update_fields=['status', 'updated_at'])

        # Créer une notification pour l'utilisateur qui a assigné
        try:
            from notifications.utils import creer_notification
            
            if assignment.assigned_by:
                titre = f"Assignation confirmée - Dossier #{assignment.fiche.numero_fiche or assignment.fiche.id}"
                message = (
                    f"L'enquêteur {user.get_full_name() or user.username} a confirmé "
                    f"l'assignation du dossier « {assignment.fiche.nom} {assignment.fiche.prenom} ».\n\n"
                    f"Le statut est maintenant : En cours"
                )
                
                creer_notification(
                    utilisateur=assignment.assigned_by,
                    titre=titre,
                    message=message,
                    type='success',
                    lien=f'/assignations'
                )
        except Exception as e:
            logger.exception("Erreur lors de la création de la notification de confirmation.")

        serializer = self.get_serializer(assignment)
        return Response(
            {
                "detail": "Assignation confirmée avec succès. Le statut est maintenant 'En cours'.",
                "assignment": serializer.data
            },
            status=status.HTTP_200_OK
        )

    @staticmethod
    def _user_can_manage_assignments(user):
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.role in {"Administrateur Système", "Enquêteur Principal"}
