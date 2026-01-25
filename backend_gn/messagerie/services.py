from __future__ import annotations

from typing import Iterable, List, Optional

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from criminel.models import CriminalFicheCriminelle

from .models import EmailInterne, EmailInterneDestinataire

User = get_user_model()


def create_internal_emails(
    *,
    expediteur: User,
    destinataires: Iterable[User],
    sujet: str,
    message: str,
    dossier: Optional[CriminalFicheCriminelle] = None,
    dossier_url: Optional[str] = None,
    brouillon: bool = False,
    reponse_a: Optional[EmailInterne] = None,
) -> List[EmailInterne]:
    """
    Crée un e-mail interne et associe les destinataires.

    Si plusieurs destinataires sont fournis, chacun dispose de son lien personnel.
    Les brouillons peuvent être sauvegardés sans destinataire.
    """
    destinataires_list = list(destinataires)

    with transaction.atomic():
        email = EmailInterne.objects.create(
            expediteur=expediteur,
            sujet=sujet,
            message=message,
            brouillon=brouillon,
            date_envoi=timezone.now(),
            dossier_lie=dossier,
            dossier_url=dossier_url,
            reponse_a=reponse_a,
        )

        if not brouillon and destinataires_list:
            for destinataire in destinataires_list:
                EmailInterneDestinataire.objects.get_or_create(
                    email=email,
                    destinataire=destinataire,
                )
        elif brouillon and destinataires_list:
            # Préserver la sélection pour le brouillon sans notifier les destinataires.
            email.destinataires.set(destinataires_list)

    return [email]


def toggle_delete_flag(email: EmailInterne, user: User, *, restore: bool = False) -> EmailInterne:
    """
    Marque l'e-mail comme supprimé pour l'utilisateur (soft delete).
    Utilisé pour déplacer vers la corbeille ou restaurer.
    """
    if email.expediteur_id == user.id:
        email.supprime_par_expediteur = not restore
        email.purge_par_expediteur = False
        if restore:
            email.purge_par_expediteur = False
        email.save(update_fields=["supprime_par_expediteur", "purge_par_expediteur", "date_mise_a_jour"])
        return email

    link = email.recipient_links.filter(destinataire=user).first()
    if link:
        link.supprime = not restore
        link.save(update_fields=["supprime", "date_mise_a_jour"])
    return email


def purge_email(email: EmailInterne, user: User) -> None:
    """
    Supprime définitivement l'e-mail pour l'utilisateur.
    - Pour l'expéditeur: masque l'e-mail de manière définitive (purge) tout en le laissant
      accessible aux destinataires tant qu'ils ne l'ont pas supprimé.
    - Pour un destinataire: supprime définitivement le lien vers l'e-mail.
    L'e-mail est supprimé de la base si aucune référence restante.
    """
    if email.expediteur_id == user.id:
        if not email.supprime_par_expediteur:
            email.supprime_par_expediteur = True
        email.purge_par_expediteur = True
        email.save(update_fields=["supprime_par_expediteur", "purge_par_expediteur", "date_mise_a_jour"])
    else:
        link = email.recipient_links.filter(destinataire=user).first()
        if link:
            link.delete()

    if not email.recipient_links.exists() and (
        email.purge_par_expediteur or email.supprime_par_expediteur
    ):
        email.delete()


def envoyer_notification_assignation(
    *, dossier: CriminalFicheCriminelle, expediteur: User, destinataire: User
) -> EmailInterne:
    """
    Envoie un e-mail lorsque qu'un dossier est assigné à un enquêteur principal.
    """
    sujet = f"Assignation à l'enquête #{dossier.numero_fiche or dossier.pk}"
    message = (
        f"Bonjour {destinataire.get_full_name() or destinataire.username},\n\n"
        f"Vous avez été assigné en tant qu'enquêteur principal sur le dossier "
        f"« {dossier.nom} {dossier.prenom} ».\n"
        "Merci de consulter le dossier pour prendre connaissance des détails et planifier les prochaines actions."
    )
    email = create_internal_emails(
        expediteur=expediteur,
        destinataires=[destinataire],
        sujet=sujet,
        message=message,
        dossier=dossier,
        dossier_url=f"/fiches-criminelles/{dossier.pk}",
    )[0]
    return email


def envoyer_notification_preuve(
    *,
    dossier: CriminalFicheCriminelle,
    expediteur: User,
    destinataires: Iterable[User],
    description_preuve: str,
) -> List[EmailInterne]:
    """
    Envoie une notification par e-mail lorsque de nouvelles preuves sont ajoutées.
    """
    sujet = f"Nouvelle preuve ajoutée au dossier #{dossier.numero_fiche or dossier.pk}"
    message = (
        f"Une nouvelle preuve a été ajoutée au dossier « {dossier.nom} {dossier.prenom} » :\n\n"
        f"{description_preuve}\n\n"
        "Merci de consulter le dossier afin de prendre connaissance des impacts sur l'enquête."
    )
    return create_internal_emails(
        expediteur=expediteur,
        destinataires=destinataires,
        sujet=sujet,
        message=message,
        dossier=dossier,
        dossier_url=f"/fiches-criminelles/{dossier.pk}",
    )


def envoyer_notification_cloture(
    *,
    dossier: CriminalFicheCriminelle,
    expediteur: User,
    superviseur: User,
    investigateur_principal: User,
) -> List[EmailInterne]:
    """
    Envoie des notifications de clôture d'enquête.
    """
    sujet = f"Clôture du dossier #{dossier.numero_fiche or dossier.pk}"
    message = (
        f"Le dossier « {dossier.nom} {dossier.prenom} » a été clôturé.\n\n"
        "Veuillez consulter le rapport final et enregistrer toute information complémentaire nécessaire."
    )
    return create_internal_emails(
        expediteur=expediteur,
        destinataires=[destinataire for destinataire in {superviseur, investigateur_principal} if destinataire],
        sujet=sujet,
        message=message,
        dossier=dossier,
        dossier_url=f"/fiches-criminelles/{dossier.pk}",
    )

