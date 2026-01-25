from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("criminel", "0011_add_is_archived_field"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailInterne",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("sujet", models.CharField(max_length=255)),
                ("message", models.TextField()),
                ("lu", models.BooleanField(default=False)),
                ("important", models.BooleanField(default=False)),
                ("brouillon", models.BooleanField(default=False)),
                ("supprime_par_expediteur", models.BooleanField(default=False)),
                ("supprime_par_destinataire", models.BooleanField(default=False)),
                ("date_envoi", models.DateTimeField(default=django.utils.timezone.now)),
                ("date_mise_a_jour", models.DateTimeField(auto_now=True)),
                ("dossier_url", models.URLField(blank=True, null=True)),
                (
                    "destinataire",
                    models.ForeignKey(
                        blank=True,
                        help_text="Peut être vide pour les brouillons non adressés.",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="emails_recus",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "dossier_lie",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="emails_associes",
                        to="criminel.criminalfichecriminelle",
                    ),
                ),
                (
                    "expediteur",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="emails_envoyes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "reponse_a",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reponses",
                        to="messagerie.emailinterne",
                    ),
                ),
            ],
            options={
                "verbose_name": "E-mail interne",
                "verbose_name_plural": "E-mails internes",
                "ordering": ("-date_envoi", "-id"),
            },
        ),
        migrations.AddIndex(
            model_name="emailinterne",
            index=models.Index(
                fields=["destinataire", "lu", "-date_envoi"], name="messagerie_email_destinataire_lu_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="emailinterne",
            index=models.Index(
                fields=["expediteur", "brouillon", "-date_envoi"], name="messagerie_email_expediteur_brouillon_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="emailinterne",
            index=models.Index(
                fields=["important", "-date_envoi"], name="messagerie_email_important_idx"
            ),
        ),
    ]

