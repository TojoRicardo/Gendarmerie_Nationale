from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser

from audit.signals import enregistrer_action_audit
from criminel.models import (
    AssignmentStatus,
    CriminalFicheCriminelle,
    InvestigationAssignment,
)

from .models import Avancement, Enquete, EnqueteCriminel, Observation, Preuve, RapportEnquete, TypeEnquete
from .services import recalculate_progression
from .serializers import (
    AvancementSerializer,
    EnqueteCriminelSerializer,
    EnqueteSerializer,
    ObservationSerializer,
    PreuveSerializer,
    RapportEnqueteSerializer,
    TypeEnqueteSerializer,
)


SUPERVISOR_ROLES = {"Administrateur Système", "Enquêteur Principal"}


def _user_can_supervise(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return getattr(user, "role", None) in SUPERVISOR_ROLES


def _get_assignment(
    user,
    dossier,
    require_confirmed=True,
    allow_supervisor_override=False,
):
    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentification requise.")

    if user.is_superuser or (allow_supervisor_override and _user_can_supervise(user)):
        return None

    statuses = [AssignmentStatus.EN_COURS]
    if not require_confirmed:
        statuses.append(AssignmentStatus.EN_ATTENTE)
        statuses.append(AssignmentStatus.SUSPENDUE)

    assignment = (
        InvestigationAssignment.objects.filter(
            fiche=dossier,
            assigned_investigator=user,
            status__in=statuses,
        )
        .order_by("-assignment_date")
        .first()
    )
    if not assignment:
        raise PermissionDenied(
            "Aucune assignation valide n'est associée à ce dossier pour votre compte."
        )

    if require_confirmed:
        if assignment.status != AssignmentStatus.EN_COURS:
            raise PermissionDenied(
                "Cette action nécessite une assignation confirmée (statut 'En cours')."
            )

        if assignment.due_date and assignment.due_date < timezone.now().date():
            assignment.check_and_update_status()
            raise PermissionDenied(
                "La date limite de votre assignation est dépassée. Contactez votre superviseur."
            )
    return assignment


def _refresh_dossier_progression(*dossier_ids):
    unique_ids = {dossier_id for dossier_id in dossier_ids if dossier_id}
    for dossier_id in unique_ids:
        recalculate_progression(dossier_id)


class DossierAccessMixin:
    require_confirmed_assignment = False
    allow_supervisor_access = False

    def get_dossier(self):
        dossier_id = self.kwargs.get("dossier_id")
        return get_object_or_404(CriminalFicheCriminelle, pk=dossier_id)

    def ensure_access(self, dossier):
        if self.allow_supervisor_access and _user_can_supervise(self.request.user):
            return
        _get_assignment(
            self.request.user,
            dossier,
            require_confirmed=self.require_confirmed_assignment,
        )


class PreuveCreateView(generics.CreateAPIView):
    queryset = Preuve.objects.all()
    serializer_class = PreuveSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        dossier = serializer.validated_data["dossier"]
        _get_assignment(
            self.request.user,
            dossier,
            require_confirmed=True,
            allow_supervisor_override=True,
        )
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="creation",
            ressource="Preuve",
            ressource_id=instance.id,
            details={
                "dossier_id": instance.dossier_id,
                "type_preuve": instance.type_preuve,
            },
        )
        _refresh_dossier_progression(instance.dossier_id)
        _refresh_dossier_progression(instance.dossier_id)


class PreuveListView(DossierAccessMixin, generics.ListAPIView):
    serializer_class = PreuveSerializer
    permission_classes = [permissions.IsAuthenticated]
    allow_supervisor_access = True

    def get_queryset(self):
        dossier = self.get_dossier()
        self.ensure_access(dossier)
        return (
            Preuve.objects.filter(dossier=dossier)
            .select_related("enqueteur", "dossier")
            .order_by("-date_ajout")
        )


class RapportCreateView(generics.CreateAPIView):
    queryset = RapportEnquete.objects.all()
    serializer_class = RapportEnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        dossier = serializer.validated_data["dossier"]
        _get_assignment(
            self.request.user,
            dossier,
            require_confirmed=True,
            allow_supervisor_override=True,
        )
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="creation",
            ressource="Rapport d'enquête",
            ressource_id=instance.id,
            details={
                "dossier_id": instance.dossier_id,
                "titre": instance.titre,
                "statut": instance.statut,
            },
        )


class RapportListView(DossierAccessMixin, generics.ListAPIView):
    serializer_class = RapportEnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]
    allow_supervisor_access = True

    def get_queryset(self):
        dossier = self.get_dossier()
        self.ensure_access(dossier)
        return (
            RapportEnquete.objects.filter(dossier=dossier)
            .select_related("enqueteur", "dossier")
            .order_by("-date_redaction")
        )


class ObservationCreateView(generics.CreateAPIView):
    queryset = Observation.objects.all()
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        dossier = serializer.validated_data["dossier"]
        _get_assignment(
            self.request.user,
            dossier,
            require_confirmed=True,
            allow_supervisor_override=True,
        )
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="creation",
            ressource="Observation",
            ressource_id=instance.id,
            details={"dossier_id": instance.dossier_id},
        )
        _refresh_dossier_progression(instance.dossier_id)


class ObservationListView(DossierAccessMixin, generics.ListAPIView):
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    allow_supervisor_access = True

    def get_queryset(self):
        dossier = self.get_dossier()
        self.ensure_access(dossier)
        return (
            Observation.objects.filter(dossier=dossier)
            .select_related("enqueteur", "dossier")
            .order_by("-date")
        )


class AvancementUpdateView(generics.CreateAPIView):
    queryset = Avancement.objects.all()
    serializer_class = AvancementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        dossier = serializer.validated_data["dossier"]
        _get_assignment(
            self.request.user,
            dossier,
            require_confirmed=True,
            allow_supervisor_override=True,
        )
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Avancement d'enquête",
            ressource_id=instance.id,
            details={
                "dossier_id": instance.dossier_id,
                "pourcentage": instance.pourcentage,
            },
        )


class AvancementListView(DossierAccessMixin, generics.ListAPIView):
    serializer_class = AvancementSerializer
    permission_classes = [permissions.IsAuthenticated]
    allow_supervisor_access = True

    def get_queryset(self):
        dossier = self.get_dossier()
        self.ensure_access(dossier)
        return (
            Avancement.objects.filter(dossier=dossier)
            .select_related("enqueteur", "dossier")
            .order_by("-date_mise_a_jour")
        )


class EnqueteObjectAccessMixin:
    allow_supervisor_access = False
    require_confirmed_assignment = True

    def _enforce_access(self, dossier):
        if self.allow_supervisor_access and _user_can_supervise(self.request.user):
            return
        _get_assignment(
            self.request.user,
            dossier,
            require_confirmed=self.require_confirmed_assignment,
            allow_supervisor_override=True,
        )

    def get_object(self):
        obj = super().get_object()
        self._enforce_access(obj.dossier)
        return obj


class PreuveDetailView(
    EnqueteObjectAccessMixin, generics.RetrieveUpdateDestroyAPIView
):
    queryset = Preuve.objects.select_related("dossier", "enqueteur")
    serializer_class = PreuveSerializer
    parser_classes = [MultiPartParser, FormParser]
    allow_supervisor_access = True
    
    def get_permissions(self):
        """Instancie et retourne la liste des permissions que cette vue requiert."""
        # Pour les vues génériques, déterminer l'action depuis la méthode HTTP
        method = self.request.method.upper()
        if method in ['PUT', 'PATCH']:
            from .permissions import CanModifyPreuve
            return [CanModifyPreuve()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        previous_dossier_id = serializer.instance.dossier_id
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Preuve",
            ressource_id=instance.id,
            details={
                "dossier_id": instance.dossier_id,
                "type_preuve": instance.type_preuve,
            },
        )
        _refresh_dossier_progression(previous_dossier_id, instance.dossier_id)

    def perform_destroy(self, instance):
        dossier_id = instance.dossier_id
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Preuve",
            ressource_id=instance.id,
            details={"dossier_id": instance.dossier_id},
        )
        instance.delete()
        _refresh_dossier_progression(dossier_id)


class RapportDetailView(
    EnqueteObjectAccessMixin, generics.RetrieveUpdateDestroyAPIView
):
    queryset = RapportEnquete.objects.select_related("dossier", "enqueteur")
    serializer_class = RapportEnqueteSerializer
    allow_supervisor_access = True
    
    def get_permissions(self):
        """Instancie et retourne la liste des permissions que cette vue requiert."""
        # Pour les vues génériques, déterminer l'action depuis la méthode HTTP
        method = self.request.method.upper()
        if method in ['PUT', 'PATCH']:
            from .permissions import CanModifyEnquete
            return [CanModifyEnquete()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        previous_dossier_id = serializer.instance.dossier_id
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Rapport d'enquête",
            ressource_id=instance.id,
            details={
                "dossier_id": instance.dossier_id,
                "titre": instance.titre,
                "statut": instance.statut,
            },
        )
        _refresh_dossier_progression(previous_dossier_id, instance.dossier_id)

    def perform_destroy(self, instance):
        dossier_id = instance.dossier_id
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Rapport d'enquête",
            ressource_id=instance.id,
            details={"dossier_id": instance.dossier_id},
        )
        instance.delete()
        _refresh_dossier_progression(dossier_id)


class ObservationDetailView(
    EnqueteObjectAccessMixin, generics.RetrieveUpdateDestroyAPIView
):
    queryset = Observation.objects.select_related("dossier", "enqueteur")
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    allow_supervisor_access = True

    def perform_update(self, serializer):
        previous_dossier_id = serializer.instance.dossier_id
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Observation",
            ressource_id=instance.id,
            details={"dossier_id": instance.dossier_id},
        )
        _refresh_dossier_progression(previous_dossier_id, instance.dossier_id)

    def perform_destroy(self, instance):
        dossier_id = instance.dossier_id
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Observation",
            ressource_id=instance.id,
            details={"dossier_id": instance.dossier_id},
        )
        instance.delete()
        _refresh_dossier_progression(dossier_id)


class AvancementDetailView(
    EnqueteObjectAccessMixin, generics.RetrieveUpdateDestroyAPIView
):
    queryset = Avancement.objects.select_related("dossier", "enqueteur")
    serializer_class = AvancementSerializer
    permission_classes = [permissions.IsAuthenticated]
    allow_supervisor_access = True

    def perform_update(self, serializer):
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Avancement d'enquête",
            ressource_id=instance.id,
            details={
                "dossier_id": instance.dossier_id,
                "pourcentage": instance.pourcentage,
            },
        )

    def perform_destroy(self, instance):
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Avancement d'enquête",
            ressource_id=instance.id,
            details={"dossier_id": instance.dossier_id},
        )
        instance.delete()


# ============================================================================
# VUES POUR LES TYPES D'ENQUÊTE
# ============================================================================

class TypeEnqueteListView(generics.ListAPIView):
    """Liste tous les types d'enquête actifs"""
    queryset = TypeEnquete.objects.filter(actif=True).order_by('ordre', 'libelle')
    serializer_class = TypeEnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]


class TypeEnqueteDetailView(generics.RetrieveAPIView):
    """Détail d'un type d'enquête"""
    queryset = TypeEnquete.objects.all()
    serializer_class = TypeEnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]


# ============================================================================
# VUES POUR LES ENQUÊTES
# ============================================================================

class EnqueteCreateView(generics.CreateAPIView):
    """Création d'une nouvelle enquête"""
    queryset = Enquete.objects.all()
    serializer_class = EnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="creation",
            ressource="Enquête",
            ressource_id=instance.id,
            details={
                "numero_enquete": instance.numero_enquete,
                "type_enquete": instance.type_enquete_code,
                "dossier_id": instance.dossier_id,
            },
        )


class EnqueteListView(generics.ListAPIView):
    """Liste des enquêtes avec filtres"""
    serializer_class = EnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Enquete.objects.select_related(
            'type_enquete',
            'dossier',
            'enqueteur_principal',
            'cree_par'
        ).prefetch_related('enqueteurs_associes').all()
        
        # Filtre par type d'enquête
        type_enquete = self.request.query_params.get('type_enquete')
        if type_enquete:
            queryset = queryset.filter(type_enquete_code=type_enquete)
        
        # Filtre par statut
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        # Filtre par enquêteur principal
        enqueteur_id = self.request.query_params.get('enqueteur')
        if enqueteur_id:
            queryset = queryset.filter(enqueteur_principal_id=enqueteur_id)
        
        # Filtre par dossier
        dossier_id = self.request.query_params.get('dossier')
        if dossier_id:
            queryset = queryset.filter(dossier_id=dossier_id)
        
        # Recherche textuelle
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(titre__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(numero_enquete__icontains=search)
            )
        
        return queryset.order_by('-date_enregistrement')


class EnqueteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une enquête"""
    queryset = Enquete.objects.select_related(
        'type_enquete',
        'dossier',
        'enqueteur_principal',
        'enqueteur_responsable',
        'cree_par'
    ).prefetch_related('enqueteurs_associes', 'criminels_lies__criminel')
    serializer_class = EnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'id'
    
    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Si le statut passe à 'cloturee', mettre à jour date_cloture
        if instance.statut == 'cloturee' and not instance.date_cloture:
            instance.clore_enquete()
        
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
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Enquête",
            ressource_id=str(instance.id),
            details={"numero_enquete": instance.numero_enquete},
        )
        instance.delete()


class EnqueteStatutUpdateView(generics.UpdateAPIView):
    """Endpoint pour mettre à jour uniquement le statut d'une enquête"""
    queryset = Enquete.objects.all()
    serializer_class = EnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'id'
    
    def patch(self, request, *args, **kwargs):
        """Mise à jour partielle du statut"""
        instance = self.get_object()
        nouveau_statut = request.data.get('statut')
        
        if not nouveau_statut:
            from rest_framework.response import Response
            from rest_framework import status
            return Response(
                {"error": "Le champ 'statut' est requis."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ancien_statut = instance.statut
        instance.statut = nouveau_statut
        
        # Si clôture, mettre à jour date_cloture
        if nouveau_statut == 'cloturee' and not instance.date_cloture:
            instance.clore_enquete()
        else:
            instance.save(update_fields=['statut', 'date_modification'])
        
        enregistrer_action_audit(
            user=request.user,
            action="modification_statut",
            ressource="Enquête",
            ressource_id=str(instance.id),
            details={
                "numero_enquete": instance.numero_enquete,
                "ancien_statut": ancien_statut,
                "nouveau_statut": nouveau_statut,
            },
        )
        
        serializer = self.get_serializer(instance)
        from rest_framework.response import Response
        return Response(serializer.data)


class EnqueteRapportListView(generics.ListAPIView):
    """Liste des rapports d'une enquête"""
    serializer_class = RapportEnqueteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        enquete_id = self.kwargs.get('id')
        enquete = get_object_or_404(Enquete, id=enquete_id)
        return RapportEnquete.objects.filter(enquete=enquete).select_related(
            'enquete', 'enqueteur'
        ).order_by('-date_redaction')


class EnqueteCriminelCreateView(generics.CreateAPIView):
    """Création d'une relation Enquête-Criminel"""
    queryset = EnqueteCriminel.objects.all()
    serializer_class = EnqueteCriminelSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="creation",
            ressource="Relation Enquête-Criminel",
            ressource_id=instance.id,
            details={
                "enquete_id": str(instance.enquete.id),
                "criminel_id": instance.criminel.id,
                "role": instance.role,
            },
        )


class EnqueteCriminelListView(generics.ListAPIView):
    """Liste des criminels liés à une enquête"""
    serializer_class = EnqueteCriminelSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        enquete_id = self.kwargs.get('id')
        enquete = get_object_or_404(Enquete, id=enquete_id)
        return EnqueteCriminel.objects.filter(enquete=enquete).select_related(
            'enquete', 'criminel', 'ajoute_par'
        ).order_by('-date_ajout')


class EnqueteCriminelDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une relation Enquête-Criminel"""
    queryset = EnqueteCriminel.objects.select_related('enquete', 'criminel', 'ajoute_par')
    serializer_class = EnqueteCriminelSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_update(self, serializer):
        instance = serializer.save()
        enregistrer_action_audit(
            user=self.request.user,
            action="modification",
            ressource="Relation Enquête-Criminel",
            ressource_id=instance.id,
            details={
                "enquete_id": str(instance.enquete.id),
                "criminel_id": instance.criminel.id,
            },
        )
    
    def perform_destroy(self, instance):
        enquete_id = str(instance.enquete.id)
        criminel_id = instance.criminel.id
        enregistrer_action_audit(
            user=self.request.user,
            action="suppression",
            ressource="Relation Enquête-Criminel",
            ressource_id=instance.id,
            details={
                "enquete_id": enquete_id,
                "criminel_id": criminel_id,
            },
        )
        instance.delete()

