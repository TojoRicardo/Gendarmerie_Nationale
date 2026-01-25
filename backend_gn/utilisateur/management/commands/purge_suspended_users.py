import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connections, transaction
from django.db.utils import Error as DjangoDBError
from django.utils import timezone

from utilisateur.models import ADMIN_ROLE_CODES, normalize_role_value

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = "Supprime automatiquement les comptes suspendus depuis plus de 30 jours."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help="Nombre de jours à attendre avant suppression (défaut: 30)."
        )
        parser.add_argument(
            '--force-admin',
            action='store_true',
            help="Autorise la suppression même si le compte suspendu est administrateur."
        )

    def handle(self, *args, **options):
        days = options['days']
        cutoff = timezone.now() - timedelta(days=days)
        candidates = User.objects.filter(statut='suspendu', suspension_date__lte=cutoff)

        if not candidates.exists():
            self.stdout.write(self.style.SUCCESS("Aucun compte suspendu à purger."))
            return

        self.stdout.write(f"{candidates.count()} compte(s) suspendu(s) à purger.")

        force_admin = options['force_admin']

        for user in candidates:
            if self._is_admin_account(user) and not force_admin:
                logger.warning(
                    "Compte suspendu %s détecté comme administrateur, suppression ignorée.",
                    user.pk,
                )
                continue

            try:
                self._delete_user_instance(user)
                self.stdout.write(self.style.SUCCESS(
                    f"Utilisateur {user.pk} supprimé après {days} jours de suspension."
                ))
            except Exception as exc:  # pragma: no cover - sécurité
                logger.error(
                    "Suppression automatique impossible pour %s : %s",
                    user.pk,
                    exc,
                    exc_info=True,
                )
                self.stderr.write(
                    self.style.ERROR(f"Suppression impossible pour {user.pk}: {exc}")
                )

    def _is_admin_account(self, user):
        if not user:
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        role_value = normalize_role_value(getattr(user, 'role', None))
        role_code = normalize_role_value(getattr(user, 'role_code', None))
        return role_value in ADMIN_ROLE_CODES or role_code in ADMIN_ROLE_CODES

    def _delete_user_instance(self, instance):
        try:
            instance.delete()
        except Exception as exc:
            logger.warning(
                "Suppression standard impossible pour %s (%s). Tentative de suppression forcée.",
                instance.pk,
                exc,
            )
            self._force_delete_from_database(instance)

    def _force_delete_from_database(self, instance):
        db_alias = instance._state.db or 'default'
        connection = connections[db_alias]
        table = connection.ops.quote_name(instance._meta.db_table)
        pk_column = connection.ops.quote_name(instance._meta.pk.column)

        with transaction.atomic(using=db_alias):
            with connection.cursor() as cursor:
                cursor.execute(
                    f"DELETE FROM {table} WHERE {pk_column} = %s",
                    [instance.pk],
                )

