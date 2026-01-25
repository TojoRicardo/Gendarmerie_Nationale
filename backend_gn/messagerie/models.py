from django.conf import settings
from django.db import models
from django.utils import timezone


class EmailInterneQuerySet(models.QuerySet):
    """QuerySet personnalisé pour faciliter les filtres courants."""

    def visible_for(self, user):
        """
        Filtrer les e-mails visibles pour l'utilisateur donné
        (inclut les envoyés, reçus et exclut ceux supprimés par lui).
        """
        return (
            self.filter(
                models.Q(expediteur=user, supprime_par_expediteur=False, purge_par_expediteur=False)
                | models.Q(recipient_links__destinataire=user, recipient_links__supprime=False)
            )
            .distinct()
        )

    def inbox(self, user):
        return (
            self.filter(
                recipient_links__destinataire=user,
                recipient_links__supprime=False,
                brouillon=False,
            )
            .select_related("expediteur", "dossier_lie")
            .prefetch_related("destinataires")
            .order_by("-date_envoi", "-id")
        ).distinct()

    def sent(self, user):
        return (
            self.filter(
                expediteur=user,
                supprime_par_expediteur=False,
                purge_par_expediteur=False,
                brouillon=False,
            )
            .select_related("expediteur", "dossier_lie")
            .prefetch_related("destinataires")
            .order_by("-date_envoi", "-id")
        )

    def drafts(self, user):
        return (
            self.filter(
                expediteur=user,
                brouillon=True,
                supprime_par_expediteur=False,
                purge_par_expediteur=False,
            )
            .select_related("expediteur", "dossier_lie")
            .prefetch_related("destinataires")
            .order_by("-date_envoi", "-id")
        )

    def trash(self, user):
        return (
            self.filter(
                models.Q(expediteur=user, supprime_par_expediteur=True, purge_par_expediteur=False)
                | models.Q(recipient_links__destinataire=user, recipient_links__supprime=True)
            )
            .select_related("expediteur", "dossier_lie")
            .prefetch_related("destinataires")
            .order_by("-date_envoi", "-id")
        ).distinct()


class EmailInterne(models.Model):
    """
    Modèle de messagerie interne pour les procédures judiciaires.

    Fournit la base pour la boîte de réception, envoyés, brouillons et corbeille.
    """

    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    destinataires = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="+",
        through="EmailInterneDestinataire",
        blank=True,
    )
    sujet = models.CharField(max_length=255)
    message = models.TextField()
    brouillon = models.BooleanField(default=False)
    supprime_par_expediteur = models.BooleanField(default=False)
    purge_par_expediteur = models.BooleanField(default=False)
    important = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(default=timezone.now)
    date_mise_a_jour = models.DateTimeField(auto_now=True)
    dossier_lie = models.ForeignKey(
        "criminel.CriminalFicheCriminelle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails_associes",
    )
    dossier_url = models.URLField(blank=True, null=True)
    reponse_a = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reponses",
    )

    objects = EmailInterneQuerySet.as_manager()

    class Meta:
        verbose_name = "E-mail interne"
        verbose_name_plural = "E-mails internes"
        ordering = ("-date_envoi", "-id")
        indexes = [
            models.Index(fields=("expediteur", "brouillon", "-date_envoi")),
            models.Index(fields=("important", "-date_envoi")),
        ]

    def __str__(self):
        return f"{self.sujet} ({self.expediteur.username})"

    def marquer_envoye(self):
        """Marquer l'e-mail comme envoyé et rafraîchir ses métadonnées."""
        updated_fields = ["date_mise_a_jour"]

        if self.brouillon:
            self.brouillon = False
            updated_fields.append("brouillon")

        now = timezone.now()
        self.date_envoi = now
        self.date_mise_a_jour = now
        updated_fields.append("date_envoi")

        self.save(update_fields=updated_fields)

    def marquer_important_expediteur(self, valeur=True):
        self.important = valeur
        self.save(update_fields=["important", "date_mise_a_jour"])


class EmailInterneDestinataire(models.Model):
    """Table de liaison pour les destinataires avec leurs états."""

    email = models.ForeignKey(
        EmailInterne,
        on_delete=models.CASCADE,
        related_name="recipient_links",
    )
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    lu = models.BooleanField(default=False)
    important = models.BooleanField(default=False)
    supprime = models.BooleanField(default=False)
    date_reception = models.DateTimeField(auto_now_add=True)
    date_mise_a_jour = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Destinataire d'e-mail"
        verbose_name_plural = "Destinataires d'e-mails"
        unique_together = ("email", "destinataire")
        indexes = [
            models.Index(fields=("destinataire", "lu", "-date_reception")),
            models.Index(fields=("destinataire", "supprime", "-date_reception")),
        ]

    def __str__(self):
        return f"{self.destinataire} ← {self.email}"


