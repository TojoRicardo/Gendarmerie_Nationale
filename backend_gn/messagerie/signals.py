from django.dispatch import Signal, receiver

from criminel.models import CriminalFicheCriminelle

from .services import (
    envoyer_notification_assignation,
    envoyer_notification_cloture,
    envoyer_notification_preuve,
)

# Signaux personnalisés pour l'intégration avec les autres modules du SI
assignation_effectuee = Signal()
preuve_ajoutee = Signal()
enquete_cloturee = Signal()


@receiver(assignation_effectuee)
def handle_assignation_effectuee(sender, dossier: CriminalFicheCriminelle, expediteur, destinataire, **kwargs):
    """
    Lorsqu'un dossier est assigné, envoyer un e-mail automatique à l'enquêteur principal.
    """
    if dossier and expediteur and destinataire:
        envoyer_notification_assignation(
            dossier=dossier, expediteur=expediteur, destinataire=destinataire
        )


@receiver(preuve_ajoutee)
def handle_preuve_ajoutee(
    sender,
    dossier: CriminalFicheCriminelle,
    expediteur,
    destinataires,
    description_preuve="Nouvelle preuve ajoutée.",
    **kwargs,
):
    """
    Lorsqu'une preuve est ajoutée, avertir tous les membres de l'enquête.
    """
    if dossier and expediteur and destinataires:
        envoyer_notification_preuve(
            dossier=dossier,
            expediteur=expediteur,
            destinataires=destinataires,
            description_preuve=description_preuve,
        )


@receiver(enquete_cloturee)
def handle_enquete_cloturee(
    sender,
    dossier: CriminalFicheCriminelle,
    expediteur,
    superviseur,
    investigateur_principal,
    **kwargs,
):
    """
    Lorsqu'une enquête est clôturée, informer le superviseur et l'enquêteur principal.
    """
    if dossier and expediteur and (superviseur or investigateur_principal):
        envoyer_notification_cloture(
            dossier=dossier,
            expediteur=expediteur,
            superviseur=superviseur,
            investigateur_principal=investigateur_principal,
        )

