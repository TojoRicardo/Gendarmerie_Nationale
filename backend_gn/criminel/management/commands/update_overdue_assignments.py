"""
Commande de management Django pour mettre à jour automatiquement 
les statuts des assignations avec échéance dépassée.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from criminel.models import InvestigationAssignment, AssignmentStatus
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Met à jour automatiquement les statuts des assignations avec échéance dépassée'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les assignations qui seraient mises à jour sans les modifier',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.now().date()
        
        # Récupérer toutes les assignations non clôturées avec une date d'échéance
        assignments = InvestigationAssignment.objects.filter(
            due_date__isnull=False,
            status__in=[
                AssignmentStatus.EN_ATTENTE,
                AssignmentStatus.EN_COURS,
                AssignmentStatus.SUSPENDUE,
            ]
        ).select_related('fiche', 'assigned_investigator', 'assigned_by')
        
        updated_count = 0
        skipped_count = 0
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n🔍 Recherche des assignations avec échéance dépassée (date du jour: {today.strftime("%d/%m/%Y")})...\n'
            )
        )
        
        for assignment in assignments:
            if assignment.due_date < today:
                if dry_run:
                    self.stdout.write(
                        f'  ⚠️  Assignation #{assignment.id} - Dossier {assignment.fiche.numero_fiche} '
                        f'(Échéance: {assignment.due_date.strftime("%d/%m/%Y")}) '
                        f'→ Statut serait changé en "Échéance dépassée"'
                    )
                else:
                    old_status = assignment.status
                    assignment.status = AssignmentStatus.ECHEANCE_DEPASSEE
                    assignment.save(update_fields=['status', 'updated_at'])
                    
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ✅ Assignation #{assignment.id} - Dossier {assignment.fiche.numero_fiche} '
                            f'(Échéance: {assignment.due_date.strftime("%d/%m/%Y")}) '
                            f'→ Statut changé de "{old_status}" à "Échéance dépassée"'
                        )
                    )
                    
                    # Créer une notification pour l'enquêteur assigné
                    try:
                        from notifications.utils import creer_notification
                        
                        titre = f"Échéance dépassée - Dossier #{assignment.fiche.numero_fiche or assignment.fiche.id}"
                        message = (
                            f"L'assignation du dossier « {assignment.fiche.nom} {assignment.fiche.prenom} » "
                            f"a dépassé sa date limite ({assignment.due_date.strftime('%d/%m/%Y')}).\n\n"
                            f"Le statut a été automatiquement mis à jour en 'Échéance dépassée'.\n"
                            f"Veuillez contacter votre superviseur pour discuter de la suite à donner."
                        )
                        
                        creer_notification(
                            utilisateur=assignment.assigned_investigator,
                            titre=titre,
                            message=message,
                            type='warning',
                            lien=f'/assignations'
                        )
                        
                        # Notifier aussi l'utilisateur qui a assigné
                        if assignment.assigned_by:
                            titre_supervisor = f"Échéance dépassée - Assignation #{assignment.id}"
                            message_supervisor = (
                                f"L'assignation du dossier « {assignment.fiche.nom} {assignment.fiche.prenom} » "
                                f"assignée à {assignment.assigned_investigator.get_full_name() or assignment.assigned_investigator.username} "
                                f"a dépassé sa date limite ({assignment.due_date.strftime('%d/%m/%Y')}).\n\n"
                                f"Le statut a été automatiquement mis à jour en 'Échéance dépassée'."
                            )
                            
                            creer_notification(
                                utilisateur=assignment.assigned_by,
                                titre=titre_supervisor,
                                message=message_supervisor,
                                type='warning',
                                lien=f'/assignations'
                            )
                    except Exception as e:
                        logger.exception("Erreur lors de la création des notifications pour l'assignation #%s", assignment.id)
                    
                    updated_count += 1
            else:
                skipped_count += 1
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n📊 Résumé (mode dry-run):\n'
                    f'  • {updated_count} assignation(s) seraient mises à jour\n'
                    f'  • {skipped_count} assignation(s) avec échéance future\n'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Mise à jour terminée:\n'
                    f'  • {updated_count} assignation(s) mise(s) à jour\n'
                    f'  • {skipped_count} assignation(s) avec échéance future\n'
                )
            )

