"""
Views pour le module de versement des dossiers d'enquête
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Enquete
from .models_dossier import (
    PersonneEnquete,
    InfractionEnquete,
    PreuveEnquete,
    RapportType,
    RapportEnqueteComplet,
    BiometrieEnquete,
    AuditLogEnquete,
    DecisionCloture,
)
from .serializers_dossier import (
    PersonneEnqueteSerializer,
    InfractionEnqueteSerializer,
    PreuveEnqueteSerializer,
    RapportTypeSerializer,
    RapportEnqueteCompletSerializer,
    BiometrieEnqueteSerializer,
    AuditLogEnqueteSerializer,
    DecisionClotureSerializer,
    DossierEnqueteCompletSerializer,
)

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Récupère l'adresse IP du client"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def creer_audit_log(enquete, action, description, utilisateur, request=None, details=None):
    """Crée un log d'audit pour une action sur l'enquête"""
    try:
        AuditLogEnquete.objects.create(
            enquete=enquete,
            action=action,
            description=description,
            utilisateur=utilisateur,
            details=details or {},
            ip_address=get_client_ip(request) if request else None,
        )
    except Exception as e:
        logger.error(f"Erreur lors de la création du log d'audit: {e}")


class DossierEnqueteVersementView(generics.CreateAPIView):
    """
    Endpoint pour le versement complet d'un dossier d'enquête
    Accepte toutes les sections du dossier en une seule requête
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DossierEnqueteCompletSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Crée un dossier d'enquête complet avec toutes les sections"""
        try:
            # Créer l'enquête de base
            enquete_serializer = self.get_serializer(data=request.data)
            enquete_serializer.is_valid(raise_exception=True)
            enquete = enquete_serializer.save(
                cree_par=request.user,
                enqueteur_responsable=request.user,
            )

            # Créer un log d'audit
            creer_audit_log(
                enquete=enquete,
                action='creation',
                description=f"Création du dossier d'enquête {enquete.numero_enquete}",
                utilisateur=request.user,
                request=request,
            )

            return Response(enquete_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Erreur lors du versement du dossier: {e}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DossierEnqueteDetailView(generics.RetrieveAPIView):
    """Récupère les détails complets d'un dossier d'enquête"""
    permission_classes = [permissions.IsAuthenticated]
    queryset = Enquete.objects.all()
    serializer_class = DossierEnqueteCompletSerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'enquete_id'

    def retrieve(self, request, *args, **kwargs):
        """Récupère le dossier complet avec toutes les sections"""
        instance = self.get_object()
        
        # Log d'audit pour consultation
        creer_audit_log(
            enquete=instance,
            action='consultation',
            description=f"Consultation du dossier d'enquête {instance.numero_enquete}",
            utilisateur=request.user,
            request=request,
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


# Personnes liées à l'enquête
class PersonneEnqueteViewSet(ModelViewSet):
    """ViewSet pour la gestion des personnes liées à l'enquête"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PersonneEnqueteSerializer
    queryset = PersonneEnquete.objects.all()

    def get_queryset(self):
        """Filtre par enquête si fourni"""
        queryset = super().get_queryset()
        enquete_id = self.request.query_params.get('enquete')
        if enquete_id:
            queryset = queryset.filter(enquete_id=enquete_id)
        return queryset

    def perform_create(self, serializer):
        """Crée une personne et enregistre dans l'audit"""
        personne = serializer.save(ajoute_par=self.request.user)
        
        creer_audit_log(
            enquete=personne.enquete,
            action='ajout_personne',
            description=f"Ajout de {personne} dans l'enquête",
            utilisateur=self.request.user,
            request=self.request,
        )


# Infractions liées à l'enquête
class InfractionEnqueteViewSet(ModelViewSet):
    """ViewSet pour la gestion des infractions liées à l'enquête"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InfractionEnqueteSerializer
    queryset = InfractionEnquete.objects.all()

    def get_queryset(self):
        """Filtre par enquête si fourni"""
        queryset = super().get_queryset()
        enquete_id = self.request.query_params.get('enquete')
        if enquete_id:
            queryset = queryset.filter(enquete_id=enquete_id)
        return queryset

    def perform_create(self, serializer):
        """Crée une infraction et enregistre dans l'audit"""
        infraction = serializer.save(ajoute_par=self.request.user)
        
        creer_audit_log(
            enquete=infraction.enquete,
            action='ajout_infraction',
            description=f"Ajout de l'infraction: {infraction.qualification_juridique}",
            utilisateur=self.request.user,
            request=self.request,
        )


# Preuves d'enquête
class PreuveEnqueteViewSet(ModelViewSet):
    """ViewSet pour la gestion des preuves d'enquête"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PreuveEnqueteSerializer
    queryset = PreuveEnquete.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """Filtre par enquête si fourni"""
        queryset = super().get_queryset()
        enquete_id = self.request.query_params.get('enquete')
        if enquete_id:
            queryset = queryset.filter(enquete_id=enquete_id)
        return queryset

    def perform_create(self, serializer):
        """Crée une preuve et enregistre dans l'audit"""
        preuve = serializer.save(ajoute_par=self.request.user)
        
        creer_audit_log(
            enquete=preuve.enquete,
            action='ajout_preuve',
            description=f"Ajout de la preuve {preuve.numero_scelle}",
            utilisateur=self.request.user,
            request=self.request,
            details={'numero_scelle': preuve.numero_scelle, 'type_preuve': preuve.type_preuve},
        )

    def perform_destroy(self, instance):
        """Supprime une preuve et enregistre dans l'audit"""
        enquete = instance.enquete
        numero_scelle = instance.numero_scelle
        
        instance.delete()
        
        creer_audit_log(
            enquete=enquete,
            action='suppression_preuve',
            description=f"Suppression de la preuve {numero_scelle}",
            utilisateur=self.request.user,
            request=self.request,
            details={'numero_scelle': numero_scelle},
        )


# Rapports d'enquête
class RapportTypeViewSet(ModelViewSet):
    """ViewSet pour les types de rapports"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RapportTypeSerializer
    queryset = RapportType.objects.all()


class RapportEnqueteCompletViewSet(ModelViewSet):
    """ViewSet pour la gestion des rapports d'enquête"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RapportEnqueteCompletSerializer
    queryset = RapportEnqueteComplet.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """Filtre par enquête si fourni"""
        queryset = super().get_queryset()
        enquete_id = self.request.query_params.get('enquete')
        if enquete_id:
            queryset = queryset.filter(enquete_id=enquete_id)
        return queryset

    def perform_create(self, serializer):
        """Crée un rapport et enregistre dans l'audit"""
        rapport = serializer.save(redacteur=self.request.user)
        
        creer_audit_log(
            enquete=rapport.enquete,
            action='ajout_rapport',
            description=f"Ajout du rapport: {rapport.titre}",
            utilisateur=self.request.user,
            request=self.request,
        )

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valide un rapport"""
        rapport = self.get_object()
        rapport.statut = 'valide'
        rapport.valide_par = request.user
        rapport.date_validation = timezone.now()
        rapport.save()

        creer_audit_log(
            enquete=rapport.enquete,
            action='validation_rapport',
            description=f"Validation du rapport: {rapport.titre}",
            utilisateur=request.user,
            request=request,
        )

        serializer = self.get_serializer(rapport)
        return Response(serializer.data)


# Données biométriques
class BiometrieEnqueteViewSet(ModelViewSet):
    """ViewSet pour la gestion des données biométriques d'enquête"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BiometrieEnqueteSerializer
    queryset = BiometrieEnquete.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """Filtre par enquête si fourni"""
        queryset = super().get_queryset()
        enquete_id = self.request.query_params.get('enquete')
        if enquete_id:
            queryset = queryset.filter(enquete_id=enquete_id)
        return queryset

    def perform_create(self, serializer):
        """Crée une donnée biométrique et enregistre dans l'audit"""
        biometrie = serializer.save(ajoute_par=self.request.user)
        
        creer_audit_log(
            enquete=biometrie.enquete,
            action='ajout_biometrie',
            description=f"Ajout de données biométriques pour {biometrie.personne_enquete}",
            utilisateur=self.request.user,
            request=self.request,
        )


# Journal d'audit
class AuditLogEnqueteViewSet(ReadOnlyModelViewSet):
    """ViewSet pour consulter les journaux d'audit d'une enquête (lecture seule)"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AuditLogEnqueteSerializer
    queryset = AuditLogEnquete.objects.all()

    def get_queryset(self):
        """Filtre par enquête"""
        queryset = super().get_queryset()
        enquete_id = self.request.query_params.get('enquete')
        if enquete_id:
            queryset = queryset.filter(enquete_id=enquete_id)
        return queryset.order_by('-date_action')


# Décision de clôture
class DecisionClotureViewSet(ModelViewSet):
    """ViewSet pour la gestion des décisions de clôture"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DecisionClotureSerializer
    queryset = DecisionCloture.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        """Crée une décision de clôture et clôture l'enquête"""
        decision = serializer.save(cree_par=self.request.user)
        
        # Clôturer l'enquête
        enquete = decision.enquete
        enquete.statut = 'cloturee'
        enquete.date_cloture = timezone.now()
        enquete.save()

        creer_audit_log(
            enquete=enquete,
            action='cloture',
            description=f"Clôture de l'enquête {enquete.numero_enquete}",
            utilisateur=self.request.user,
            request=self.request,
            details={'decision': decision.conclusion},
        )

        return decision

