from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EmailInterne
from .serializers import (
    EmailInterneSerializer,
    EmailSendSerializer,
    EmailUpdateSerializer,
)
from .services import create_internal_emails, purge_email, toggle_delete_flag


class EmailInterneViewSet(viewsets.GenericViewSet):
    """
    ViewSet pour gérer la messagerie interne.
    Inclut inbox, sent, drafts, trash et opérations supplémentaires.
    """

    serializer_class = EmailInterneSerializer
    permission_classes = (IsAuthenticated,)
    lookup_field = "pk"

    def get_queryset(self):
        user = self.request.user
        return (
            EmailInterne.objects.select_related("expediteur", "dossier_lie")
            .prefetch_related("destinataires")
            .filter(Q(expediteur=user) | Q(recipient_links__destinataire=user))
            .distinct()
            .order_by("-date_envoi", "-id")
        )

    def list(self, request, *args, **kwargs):
        """Par défaut, retourne la boîte de réception."""
        return self.inbox(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        email = self.get_object()

        link = email.recipient_links.filter(destinataire=request.user).first()
        if link and not link.lu:
            link.lu = True
            link.save(update_fields=["lu", "date_mise_a_jour"])

        serializer = self.get_serializer(email)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        email = self.get_object()
        if email.expediteur_id != request.user.id:
            return Response(
                {"detail": "Vous ne pouvez modifier que vos propres e-mails."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = EmailUpdateSerializer(email, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        was_brouillon = email.brouillon
        serializer.save()

        email.refresh_from_db()
        if was_brouillon and not email.brouillon:
            email.marquer_envoye()

        return Response(EmailInterneSerializer(email, context=self.get_serializer_context()).data)

    def destroy(self, request, *args, **kwargs):
        email = self.get_object()
        toggle_delete_flag(email, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["delete"], url_path="purge")
    def purge(self, request, pk=None):
        email = self.get_object()
        purge_email(email, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path="restore")
    def restore(self, request, pk=None):
        email = self.get_object()
        toggle_delete_flag(email, request.user, restore=True)
        serializer = EmailInterneSerializer(email, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="inbox")
    def inbox(self, request, *args, **kwargs):
        queryset = self._apply_filters(
            EmailInterne.objects.inbox(request.user), request
        )
        return self._paginate_and_respond(queryset)

    @action(detail=False, methods=["get"], url_path="sent")
    def sent(self, request, *args, **kwargs):
        queryset = self._apply_filters(
            EmailInterne.objects.sent(request.user), request, include_unread=False
        )
        return self._paginate_and_respond(queryset)

    @action(detail=False, methods=["get"], url_path="drafts")
    def drafts(self, request, *args, **kwargs):
        queryset = self._apply_filters(
            EmailInterne.objects.drafts(request.user), request, include_unread=False
        )
        return self._paginate_and_respond(queryset)

    @action(detail=False, methods=["get"], url_path="trash")
    def trash(self, request, *args, **kwargs):
        queryset = self._apply_filters(
            EmailInterne.objects.trash(request.user), request, include_unread=False
        )
        return self._paginate_and_respond(queryset)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request, *args, **kwargs):
        user = request.user
        inbox_qs = EmailInterne.objects.inbox(user)
        unread_count = inbox_qs.filter(
            recipient_links__destinataire=user,
            recipient_links__lu=False,
        ).count()
        important_count = (
            EmailInterne.objects.visible_for(user)
            .filter(
                Q(expediteur=user, important=True)
                | Q(recipient_links__destinataire=user, recipient_links__important=True),
                brouillon=False,
            )
            .distinct()
            .count()
        )
        data = {
            "inbox_unread": unread_count,
            "inbox_total": inbox_qs.count(),
            "sent_total": EmailInterne.objects.sent(user).count(),
            "drafts_total": EmailInterne.objects.drafts(user).count(),
            "trash_total": EmailInterne.objects.trash(user).count(),
            "important_total": important_count,
        }
        return Response(data)

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        email = self.get_object()
        link = email.recipient_links.filter(destinataire=request.user).first()
        if not link:
            return Response(
                {"detail": "Seul le destinataire peut mettre à jour le statut de lecture."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not link.lu:
            link.lu = True
            link.save(update_fields=["lu", "date_mise_a_jour"])
        return Response({"status": "marked_read"})

    @action(detail=True, methods=["patch"], url_path="unread")
    def mark_unread(self, request, pk=None):
        email = self.get_object()
        link = email.recipient_links.filter(destinataire=request.user).first()
        if not link:
            return Response(
                {"detail": "Seul le destinataire peut mettre à jour le statut de lecture."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if link.lu:
            link.lu = False
            link.save(update_fields=["lu", "date_mise_a_jour"])
        return Response({"status": "marked_unread"})

    @action(detail=True, methods=["patch"], url_path="important")
    def toggle_important(self, request, pk=None):
        email = self.get_object()
        if email.expediteur_id == request.user.id:
            email.marquer_important_expediteur(not email.important)
            return Response({"important": email.important})

        link = email.recipient_links.filter(destinataire=request.user).first()
        if not link:
            return Response(
                {"detail": "Accès non autorisé pour modifier l'importance."},
                status=status.HTTP_403_FORBIDDEN,
            )
        link.important = not link.important
        link.save(update_fields=["important", "date_mise_a_jour"])
        return Response({"important": link.important})

    @action(detail=False, methods=["post"], url_path="send")
    def send(self, request, *args, **kwargs):
        serializer = EmailSendSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            created_emails = create_internal_emails(
                expediteur=request.user,
                destinataires=serializer.validated_data["destinataires"],
                sujet=serializer.validated_data["sujet"],
                message=serializer.validated_data["message"],
                dossier=serializer.validated_data.get("dossier_lie"),
                dossier_url=serializer.validated_data.get("dossier_url"),
                brouillon=serializer.validated_data.get("brouillon", False),
                reponse_a=serializer.validated_data.get("reponse_a"),
            )

        email = created_emails[0]
        response_serializer = EmailInterneSerializer(
            email,
            context=self.get_serializer_context(),
        )
        status_code = status.HTTP_201_CREATED if not serializer.validated_data.get("brouillon") else status.HTTP_200_OK
        return Response(response_serializer.data, status=status_code)

    def _apply_filters(self, queryset, request, include_unread=True):
        search = request.query_params.get("search")
        sort = request.query_params.get("sort")  # recent | oldest | unread | important
        importance = request.query_params.get("important")
        user = getattr(request, "user", None)

        if search:
            queryset = queryset.filter(
                Q(sujet__icontains=search)
                | Q(message__icontains=search)
                | Q(expediteur__username__icontains=search)
                | Q(expediteur__first_name__icontains=search)
                | Q(expediteur__last_name__icontains=search)
            )

        if importance == "true":
            queryset = queryset.filter(
                Q(important=True)
                | Q(
                    recipient_links__important=True,
                    recipient_links__supprime=False,
                    recipient_links__destinataire=user,
                )
            )

        if sort == "oldest":
            queryset = queryset.order_by("date_envoi", "id")
        elif sort == "unread" and include_unread and user:
            queryset = queryset.filter(
                recipient_links__destinataire=user,
                recipient_links__lu=False,
                recipient_links__supprime=False,
            )
        elif sort == "important":
            queryset = queryset.order_by("-important", "-date_envoi")

        return queryset.distinct()

    def _paginate_and_respond(self, queryset):
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = EmailInterneSerializer(page, many=True, context=self.get_serializer_context())
            return self.get_paginated_response(serializer.data)
        serializer = EmailInterneSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

