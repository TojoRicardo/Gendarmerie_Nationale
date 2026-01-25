from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import serializers

from criminel.models import CriminalFicheCriminelle

from .models import EmailInterne, EmailInterneDestinataire

User = get_user_model()


class UserLightSerializer(serializers.ModelSerializer):
    """Serializer léger pour afficher expéditeur/destinataire."""

    display_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "display_name", "initials")

    def get_display_name(self, obj) -> str:
        full_name = getattr(obj, "get_full_name", None)
        if callable(full_name):
            name = full_name()
            if isinstance(name, str):
                cleaned = name.strip()
                if cleaned:
                    return cleaned
        if obj.first_name or obj.last_name:
            return f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return obj.username or obj.email or ""

    def get_initials(self, obj) -> str:
        source = self.get_display_name(obj) or ""
        parts = [p[0].upper() for p in source.split() if p]
        if len(parts) >= 2:
            return "".join(parts[:2])
        if parts:
            return parts[0]
        return (obj.username or "??")[:2].upper()


class EmailInterneSerializer(serializers.ModelSerializer):
    expediteur = UserLightSerializer(read_only=True)
    destinataires = UserLightSerializer(many=True, read_only=True)
    destinataire_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        many=True,
        allow_empty=True,
        source="destinataires",
    )
    is_owner = serializers.SerializerMethodField()
    is_recipient = serializers.SerializerMethodField()
    formatted_date = serializers.SerializerMethodField()
    relative_date = serializers.SerializerMethodField()
    mailbox = serializers.SerializerMethodField()
    can_restore = serializers.SerializerMethodField()
    is_deleted = serializers.SerializerMethodField()
    message_preview = serializers.SerializerMethodField()
    lu = serializers.SerializerMethodField()
    important = serializers.SerializerMethodField()

    class Meta:
        model = EmailInterne
        fields = (
            "id",
            "expediteur",
            "destinataires",
            "destinataire_ids",
            "sujet",
            "message",
            "lu",
            "important",
            "brouillon",
            "supprime_par_expediteur",
            "date_envoi",
            "date_mise_a_jour",
            "formatted_date",
            "relative_date",
            "dossier_lie",
            "dossier_url",
            "reponse_a",
            "is_owner",
            "is_recipient",
            "mailbox",
            "can_restore",
            "is_deleted",
            "message_preview",
        )
        read_only_fields = (
            "supprime_par_expediteur",
            "date_envoi",
            "date_mise_a_jour",
            "formatted_date",
            "relative_date",
            "is_owner",
            "is_recipient",
            "mailbox",
            "can_restore",
            "is_deleted",
            "message_preview",
        )

    def get_is_owner(self, obj):
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return False
        return obj.expediteur_id == request.user.id

    def get_is_recipient(self, obj):
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return False
        return obj.recipient_links.filter(destinataire=request.user).exists()

    def get_formatted_date(self, obj):
        if not obj.date_envoi:
            return None
        return timezone.localtime(obj.date_envoi).strftime("%d %B %Y • %H:%M")

    def get_relative_date(self, obj):
        if not obj.date_envoi:
            return None
        delta = timezone.now() - obj.date_envoi
        if delta.days == 0:
            hours = delta.seconds // 3600
            minutes = delta.seconds // 60
            if hours > 0:
                return f"Il y a {hours}h"
            if minutes > 0:
                return f"Il y a {minutes} min"
            return "À l'instant"
        if delta.days == 1:
            return "Hier"
        if delta.days < 7:
            return f"Il y a {delta.days} jours"
        return timezone.localtime(obj.date_envoi).strftime("%d/%m/%Y")

    def get_mailbox(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return "inbox"

        if obj.brouillon and obj.expediteur_id == user.id:
            return "drafts"

        if obj.expediteur_id == user.id:
            if obj.supprime_par_expediteur:
                return "trash" if not obj.purge_par_expediteur else "purged"
            return "sent"

        link = obj.recipient_links.filter(destinataire=user).first()
        if link:
            if link.supprime:
                return "trash"
            return "inbox"

        return "inbox"

    def get_can_restore(self, obj):
        return self.get_mailbox(obj) == "trash"

    def get_is_deleted(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if obj.expediteur_id == user.id:
            return obj.supprime_par_expediteur
        link = obj.recipient_links.filter(destinataire=user).first()
        if link:
            return link.supprime
        return False

    def get_message_preview(self, obj):
        content = strip_tags(obj.message or "")
        content = " ".join(content.split())
        if len(content) > 200:
            return f"{content[:197]}..."
        return content

    def _get_recipient_link(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return None
        return obj.recipient_links.filter(destinataire=user).first()

    def get_lu(self, obj):
        link = self._get_recipient_link(obj)
        if link is not None:
            return link.lu
        # Pour l'expéditeur, considérer comme lu.
        return True

    def get_important(self, obj):
        link = self._get_recipient_link(obj)
        if link is not None:
            return link.important
        return obj.important


class EmailSendSerializer(serializers.Serializer):
    destinataires = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=User.objects.all()),
        allow_empty=True,
    )
    sujet = serializers.CharField(max_length=255)
    message = serializers.CharField()
    dossier_lie = serializers.PrimaryKeyRelatedField(
        queryset=CriminalFicheCriminelle.objects.all(),  # type: ignore[attr-defined]
        required=False,
        allow_null=True,
    )
    dossier_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    brouillon = serializers.BooleanField(default=False)
    reponse_a = serializers.PrimaryKeyRelatedField(
        queryset=EmailInterne.objects.all(), required=False, allow_null=True
    )

    def validate(self, attrs):
        brouillon = attrs.get("brouillon", False)
        destinataires = attrs.get("destinataires")
        if not brouillon and not destinataires:
            raise serializers.ValidationError(
                {"destinataires": "Au moins un destinataire est requis pour l'envoi."}
            )
        return attrs


class EmailUpdateSerializer(serializers.ModelSerializer):
    destinataires = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        many=True,
        allow_empty=True,
    )
    destinataire_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = EmailInterne
        fields = (
            "sujet",
            "message",
            "dossier_lie",
            "dossier_url",
            "brouillon",
            "destinataires",
            "destinataire_id",
        )

    def validate(self, attrs):
        brouillon = attrs.get("brouillon", getattr(self.instance, "brouillon", False))
        explicit_dest_list = attrs.get("destinataires", None)
        explicit_dest_single = attrs.get("destinataire_id", None)

        if not brouillon:
            has_new_dest = bool(explicit_dest_list) or explicit_dest_single is not None
            has_existing = False
            instance = getattr(self, "instance", None)
            if instance is not None:
                has_existing = instance.recipient_links.exists()

            if not has_new_dest and not has_existing:
                raise serializers.ValidationError(
                    {"destinataires": "Au moins un destinataire est requis pour l'envoi."}
                )

        return attrs

    def update(self, instance, validated_data):
        destinataires = validated_data.pop("destinataires", None)
        destinataire_single = validated_data.pop("destinataire_id", None)

        if destinataire_single is not None:
            destinataires = list(destinataires or [])
            destinataires.append(destinataire_single)

        email = super().update(instance, validated_data)

        if destinataires is not None:
            if email.brouillon:
                email.destinataires.set(destinataires)
            else:
                email.recipient_links.all().delete()
                for destinataire in destinataires:
                    EmailInterneDestinataire._default_manager.get_or_create(
                        email=email,
                        destinataire=destinataire,
                    )
        return email

