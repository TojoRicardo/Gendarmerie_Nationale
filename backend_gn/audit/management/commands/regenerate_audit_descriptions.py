"""
Commande de management pour régénérer toutes les descriptions d'audit sans emojis.
Usage: python manage.py regenerate_audit_descriptions
"""

from django.core.management.base import BaseCommand
from audit.models import AuditLog
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Régénère toutes les descriptions d\'audit sans emojis'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui sera fait sans modifier la base de données',
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
        
        queryset = AuditLog.objects.all()
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f"Traitement de {total} entrées d'audit...")
        
        updated = 0
        errors = 0
        
        for audit_log in queryset:
            try:
                # Sauvegarder l'ancienne description pour comparaison
                old_description = audit_log.description
                
                audit_log._generate_description()
                
                # Vérifier si la description a changé
                if audit_log.description != old_description:
                    if not dry_run:
                        AuditLog.objects.filter(pk=audit_log.pk).update(
                            description=audit_log.description,
                            description_short=audit_log.description_short
                        )
                    updated += 1
                    if updated % 100 == 0:
                        self.stdout.write(f"  {updated}/{total} descriptions régénérées...")
            except Exception as e:
                errors += 1
                logger.error(f"Erreur lors de la régénération de la description pour log #{audit_log.id}: {e}")
                self.stdout.write(
                    self.style.ERROR(f"  Erreur pour log #{audit_log.id}: {e}")
                )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"\nMode DRY-RUN: {updated} descriptions seraient régénérées, {errors} erreurs"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✓ {updated} descriptions régénérées avec succès, {errors} erreurs"
                )
            )

