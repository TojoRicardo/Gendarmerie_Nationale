"""
ViewSets améliorés pour les enquêtes et pièces d'enquête
Avec permissions basées sur les rôles et upload sécurisé
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.utils import timezone

from audit.signals import enregistrer_action_audit
from .models_enhanced import Enquete, PieceEnquete
from .serializers_enhanced import (
    EnqueteListSerializer,
    EnqueteDetailSerializer,
    EnqueteCreateUpdateSerializer,
    PieceEnqueteSerializer,
    PieceEnqueteCreateSerializer,
)


class IsEnqueteurOrAdmin(permissions.BasePermission):
    """Permission pour les enquêteurs et administrateurs"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        role = getattr(request.user, 'role', '')
        allowed_roles = [
            'Administrateur Système',
            'Enquêteur Principal',
            'Enquêteur',
            'Enquêteur Junior'
        ]
        return role in allowed_roles


class CanModifyEnquete(permissions.BasePermission):
    """Permission pour modifier une enquête"""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        role = getattr(request.user, 'role', '')
        if role in ['Administrateur Système', 'Enquêteur Principal']:
            return True
        
        # L'enquêteur responsable peut modifier son enquête
        if obj.enqueteur_responsable == request.user:
            return True
        
        return False


class CanDeleteEnquete(permissions.BasePermission):
    """Permission pour supprimer une enquête"""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        role = getattr(request.user, 'role', '')
        return role in ['Administrateur Système', 'Enquêteur Principal']


class CanModifyPiece(permissions.BasePermission):
    """Permission pour modifier une pièce d'enquête"""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        role = getattr(request.user, 'role', '')
        if role in ['Administrateur Système', 'Enquêteur Principal']:
            return True
        
        # L'auteur de la pièce peut la modifier
        if obj.ajoute_par == request.user:
            return True
        
        # L'enquêteur responsable peut modifier les pièces de son enquête
        if obj.enquete.enqueteur_responsable == request.user:
            return True
        
        return False


class EnqueteViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des enquêtes
    """
    queryset = Enquete.objects.select_related(
        'enqueteur_responsable',
        'fiche_criminelle'
    ).prefetch_related(
        'equipe_enquete',
        'pieces'
    ).filter(is_archived=False)
    
    permission_classes = [IsEnqueteurOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'type_enquete', 'niveau_priorite', 'is_archived']
    search_fields = ['numero_enquete', 'titre', 'description']
    ordering_fields = ['date_ouverture', 'date_cloture', 'created_at', 'niveau_priorite']
    ordering = ['-date_ouverture']
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action"""
        if self.action == 'list':
            return EnqueteListSerializer
        elif self.action in ['retrieve', 'pieces']:
            return EnqueteDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EnqueteCreateUpdateSerializer
        return EnqueteDetailSerializer
    
    def get_queryset(self):
        """Filtre les enquêtes selon les permissions"""
        queryset = super().get_queryset()
        
        # Filtres additionnels depuis les query params
        enqueteur_id = self.request.query_params.get('enqueteur')
        if enqueteur_id:
            queryset = queryset.filter(
                Q(enqueteur_responsable_id=enqueteur_id) |
                Q(equipe_enquete__id=enqueteur_id)
            ).distinct()
        
        date_debut = self.request.query_params.get('date_debut')
        if date_debut:
            queryset = queryset.filter(date_ouverture__gte=date_debut)
        
        date_fin = self.request.query_params.get('date_fin')
        if date_fin:
            queryset = queryset.filter(date_ouverture__lte=date_fin)
        
        # Si l'utilisateur n'est pas admin, filtrer selon ses enquêtes
        if not self.request.user.is_superuser:
            role = getattr(self.request.user, 'role', '')
            if role not in ['Administrateur Système', 'Enquêteur Principal']:
                queryset = queryset.filter(
                    Q(enqueteur_responsable=self.request.user) |
                    Q(equipe_enquete=self.request.user)
                ).distinct()
        
        return queryset
    
    def get_permissions(self):
        """Retourne les permissions selon l'action"""
        if self.action in ['list', 'retrieve', 'pieces']:
            return [IsEnqueteurOrAdmin()]
        elif self.action in ['create']:
            return [IsEnqueteurOrAdmin()]
        elif self.action in ['update', 'partial_update']:
            return [IsEnqueteurOrAdmin(), CanModifyEnquete()]
        elif self.action == 'destroy':
            return [IsEnqueteurOrAdmin(), CanDeleteEnquete()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Crée une enquête et enregistre l'audit"""
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="creation",
            ressource="Enquête",
            ressource_id=str(instance.id),
            details={
                "numero_enquete": instance.numero_enquete,
                "titre": instance.titre,
                "type_enquete": instance.type_enquete,
            },
        )
    
    def perform_update(self, serializer):
        """Met à jour une enquête et enregistre l'audit"""
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Enquête",
            ressource_id=str(instance.id),
            details={
                "numero_enquete": instance.numero_enquete,
                "statut": instance.statut,
            },
        )
    
    def perform_destroy(self, instance):
        """Supprime une enquête et enregistre l'audit"""
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Enquête",
            ressource_id=str(instance.id),
            details={"numero_enquete": instance.numero_enquete},
        )
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def cloturer(self, request, pk=None):
        """Clôture une enquête"""
        enquete = self.get_object()
        
        if enquete.statut == 'cloturee':
            return Response(
                {'detail': 'Cette enquête est déjà clôturée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        enquete.statut = 'cloturee'
        enquete.date_cloture = timezone.now()
        enquete.save()
        
        enregistrer_action_audit(
            user=request.user,
            action="cloture",
            ressource="Enquête",
            ressource_id=str(enquete.id),
            details={"numero_enquete": enquete.numero_enquete},
        )
        
        serializer = self.get_serializer(enquete)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def pieces(self, request, pk=None):
        """Retourne toutes les pièces d'une enquête"""
        enquete = self.get_object()
        pieces = enquete.pieces.all().order_by('-date_ajout')
        serializer = PieceEnqueteSerializer(pieces, many=True, context={'request': request})
        return Response(serializer.data)


class PieceEnqueteViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des pièces d'enquête
    """
    queryset = PieceEnquete.objects.select_related(
        'enquete',
        'ajoute_par'
    ).all()
    
    permission_classes = [IsEnqueteurOrAdmin]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type_piece', 'est_confidentiel', 'enquete']
    search_fields = ['description', 'commentaire_interne']
    ordering_fields = ['date_ajout']
    ordering = ['-date_ajout']
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action"""
        if self.action == 'create':
            return PieceEnqueteCreateSerializer
        return PieceEnqueteSerializer
    
    def get_queryset(self):
        """Filtre les pièces selon les permissions"""
        queryset = super().get_queryset()
        
        # Filtrer par enquête si spécifié
        enquete_id = self.request.query_params.get('enquete')
        if enquete_id:
            queryset = queryset.filter(enquete_id=enquete_id)
        
        # Si l'utilisateur n'est pas admin, filtrer selon ses enquêtes
        if not self.request.user.is_superuser:
            role = getattr(self.request.user, 'role', '')
            if role not in ['Administrateur Système', 'Enquêteur Principal']:
                queryset = queryset.filter(
                    Q(ajoute_par=self.request.user) |
                    Q(enquete__enqueteur_responsable=self.request.user) |
                    Q(enquete__equipe_enquete=self.request.user)
                ).distinct()
        
        return queryset
    
    def get_permissions(self):
        """Retourne les permissions selon l'action"""
        if self.action in ['list', 'retrieve', 'download']:
            return [IsEnqueteurOrAdmin()]
        elif self.action == 'create':
            return [IsEnqueteurOrAdmin()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsEnqueteurOrAdmin(), CanModifyPiece()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Crée une pièce et enregistre l'audit"""
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="creation",
            ressource="Pièce d'enquête",
            ressource_id=str(instance.id),
            details={
                "enquete_id": str(instance.enquete.id),
                "type_piece": instance.type_piece,
            },
        )
    
    def perform_update(self, serializer):
        """Met à jour une pièce et enregistre l'audit"""
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Pièce d'enquête",
            ressource_id=str(instance.id),
            details={
                "enquete_id": str(instance.enquete.id),
                "type_piece": instance.type_piece,
            },
        )
    
    def perform_destroy(self, instance):
        """Supprime une pièce et enregistre l'audit"""
        enquete_id = str(instance.enquete.id)
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Pièce d'enquête",
            ressource_id=str(instance.id),
            details={"enquete_id": enquete_id},
        )
        instance.delete()
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Télécharge une pièce d'enquête"""
        piece = self.get_object()
        
        # Vérifier les permissions pour les pièces confidentielles
        if piece.est_confidentiel:
            role = getattr(request.user, 'role', '')
            if role not in ['Administrateur Système', 'Enquêteur Principal']:
                if piece.ajoute_par != request.user and piece.enquete.enqueteur_responsable != request.user:
                    return Response(
                        {'detail': 'Accès refusé. Cette pièce est confidentielle.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        if not piece.fichier:
            return Response(
                {'detail': 'Fichier non disponible.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier l'intégrité si le hash est disponible
        if piece.hash_fichier:
            if not piece.verify_integrity():
                return Response(
                    {'detail': 'Erreur d\'intégrité du fichier détectée.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        from django.http import FileResponse
        response = FileResponse(piece.fichier.open(), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{piece.fichier.name.split("/")[-1]}"'
        return response

