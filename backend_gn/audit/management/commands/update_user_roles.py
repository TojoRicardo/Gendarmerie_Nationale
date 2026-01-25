"""
Commande de management pour mettre à jour les user_role null dans les logs d'audit.
Usage: python manage.py update_user_roles
"""

from django.core.management.base import BaseCommand
from django.db import models
from audit.models import AuditLog
from audit.middleware import get_role
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Met à jour les user_role null dans les logs d\'audit existants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui sera mis à jour sans modifier',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limite le nombre de logs à traiter',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        
        # Récupérer les logs avec user_role null ou vide
        queryset = AuditLog.objects.filter(
            user__isnull=False
        ).filter(
            models.Q(user_role__isnull=True) | models.Q(user_role='')
        )
        
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f"Traitement de {total} logs avec user_role null ou vide...")
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS("Aucun log à mettre à jour."))
            return
        
        updated = 0
        errors = 0
        
        for audit_log in queryset:
            try:
                if audit_log.user:
                    # Récupérer le rôle avec la fonction améliorée
                    role = get_role(audit_log.user)
                    
                    if role:
                        if not dry_run:
                            audit_log.user_role = role
                            audit_log.save(update_fields=['user_role'])
                        updated += 1
                        if updated % 100 == 0:
                            self.stdout.write(f"  {updated}/{total} rôles mis à jour...")
                    else:
                        # Si aucun rôle trouvé, mettre "Non spécifié"
                        if not dry_run:
                            audit_log.user_role = "Non spécifié"
                            audit_log.save(update_fields=['user_role'])
                        updated += 1
            except Exception as e:
                errors += 1
                logger.error(f"Erreur lors de la mise à jour du rôle pour log #{audit_log.id}: {e}")
                self.stdout.write(
                    self.style.ERROR(f"  Erreur pour log #{audit_log.id}: {e}")
                )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"\nMode DRY-RUN: {updated} rôles seraient mis à jour, {errors} erreurs"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✓ {updated} rôles mis à jour avec succès, {errors} erreurs"
                )
            )

