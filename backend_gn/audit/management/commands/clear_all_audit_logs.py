"""
Commande de management pour supprimer tous les logs d'audit.
Usage: python manage.py clear_all_audit_logs
"""

from django.core.management.base import BaseCommand
from audit.models import AuditLog
from utilisateur.models import PinAuditLog
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Supprime tous les logs d\'audit (AuditLog et PinAuditLog)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression (requis pour exécuter)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui sera supprimé sans supprimer',
        )

    def handle(self, *args, **options):
        confirm = options['confirm']
        dry_run = options['dry_run']
        
        # Compter les logs
        audit_log_count = AuditLog.objects.count()
        pin_audit_count = PinAuditLog.objects.count()
        total_count = audit_log_count + pin_audit_count
        
        self.stdout.write("=" * 60)
        self.stdout.write("SUPPRESSION DE TOUS LES LOGS D'AUDIT")
        self.stdout.write("=" * 60)
        self.stdout.write("")
        self.stdout.write(f"Logs AuditLog: {audit_log_count}")
        self.stdout.write(f"Logs PinAuditLog: {pin_audit_count}")
        self.stdout.write(f"Total: {total_count}")
        self.stdout.write("")
        
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS("Aucun log à supprimer. La base est déjà vide."))
            return
        
        if dry_run:
            self.stdout.write(self.style.WARNING("Mode DRY-RUN: Aucune suppression ne sera effectuée."))
            self.stdout.write(f"  - {audit_log_count} entrées AuditLog seraient supprimées")
            self.stdout.write(f"  - {pin_audit_count} entrées PinAuditLog seraient supprimées")
            return
        
        if not confirm:
            self.stdout.write(self.style.ERROR("ATTENTION: Cette action est irréversible!"))
            self.stdout.write("Pour confirmer, utilisez: python manage.py clear_all_audit_logs --confirm")
            return
        
        # Supprimer tous les logs
        try:
            with transaction.atomic():
                deleted_audit_logs = AuditLog.objects.all().delete()[0]
                deleted_pin_logs = PinAuditLog.objects.all().delete()[0]
                total_deleted = deleted_audit_logs + deleted_pin_logs
            
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"✓ {total_deleted} entrée(s) supprimée(s) avec succès."))
            self.stdout.write(f"  - {deleted_audit_logs} entrées AuditLog")
            self.stdout.write(f"  - {deleted_pin_logs} entrées PinAuditLog")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Erreur lors de la suppression: {e}"))
            logger.error(f"Erreur lors de la suppression des logs d'audit: {e}", exc_info=True)
            raise

