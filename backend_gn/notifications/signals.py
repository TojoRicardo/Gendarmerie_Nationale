"""
Signals pour déclencher automatiquement des notifications
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from criminel.models import CriminalFicheCriminelle
from utilisateur.models import UtilisateurModel
from .utils import creer_notification, creer_notification_pour_role


@receiver(post_save, sender=CriminalFicheCriminelle)
def notifier_creation_modification_fiche(sender, instance, created, **kwargs):
    """
    Notifier lors de la création ou modification d'une fiche criminelle
    """
    try:
        if created:
            # Nouvelle fiche créée
            titre = "Nouvelle fiche criminelle créée"
            message = f"La fiche criminelle #{instance.numero_fiche or instance.id} a été créée"
            lien = f"/fiches-criminelles/{instance.id}"
            
            # Notifier tous les administrateurs et enquêteurs
            admins_enqueteurs = UtilisateurModel.objects.filter(
                role__icontains="Administrateur"
            ) | UtilisateurModel.objects.filter(
                role__icontains="Enquêteur"
            )
            
            for user in admins_enqueteurs:
                creer_notification(
                    utilisateur=user,
                    titre=titre,
                    message=f"{message}. Suspect: {instance.nom} {instance.prenom}",
                    type="info",
                    lien=lien
                )
        else:
            # Fiche modifiée
            titre = "Fiche criminelle modifiée"
            message = f"La fiche criminelle #{instance.numero_fiche or instance.id} a été mise à jour"
            lien = f"/fiches-criminelles/{instance.id}"
            
            # Notifier les administrateurs
            creer_notification_pour_role(
                role="Administrateur",
                titre=titre,
                message=f"{message}. Suspect: {instance.nom} {instance.prenom}",
                type="info",
                lien=lien
            )
    except Exception as e:
        print(f"Erreur lors de la création de notification pour fiche: {e}")


@receiver(pre_save, sender=UtilisateurModel)
def detecter_changement_statut_utilisateur(sender, instance, **kwargs):
    """
    Détecter les changements de statut d'utilisateur
    """
    if instance.pk:  # L'utilisateur existe déjà
        try:
            ancien_utilisateur = UtilisateurModel.objects.get(pk=instance.pk)
            
            # Vérifier si le statut a changé
            if ancien_utilisateur.statut != instance.statut:
                instance._ancien_statut = ancien_utilisateur.statut
                instance._statut_change = True
            else:
                instance._statut_change = False
        except UtilisateurModel.DoesNotExist:
            instance._statut_change = False


@receiver(post_save, sender=UtilisateurModel)
def notifier_changement_statut_utilisateur(sender, instance, created, **kwargs):
    """
    Notifier lors du changement de statut d'un utilisateur
    """
    try:
        if created:
            # Nouvel utilisateur créé
            titre = "Nouvel utilisateur créé"
            message = f"L'utilisateur {instance.username} ({instance.nom} {instance.prenom}) a été créé avec le rôle {instance.role}"
            
            # Notifier tous les administrateurs
            creer_notification_pour_role(
                role="Administrateur",
                titre=titre,
                message=message,
                type="success",
                lien="/utilisateurs"
            )
            
            # Notifier l'utilisateur lui-même
            creer_notification(
                utilisateur=instance,
                titre="Bienvenue dans le système SGIC",
                message=f"Votre compte a été créé avec succès. Vous avez le rôle de {instance.role}.",
                type="success",
                lien="/dashboard"
            )
        
        elif hasattr(instance, '_statut_change') and instance._statut_change:
            # Le statut a changé
            ancien_statut = getattr(instance, '_ancien_statut', 'inconnu')
            nouveau_statut = instance.statut
            
            statut_labels = {
                'actif': 'Actif',
                'inactif': 'Inactif',
                'suspendu': 'Suspendu'
            }
            
            titre = "Changement de statut de compte"
            message = f"Votre statut a été modifié de '{statut_labels.get(ancien_statut, ancien_statut)}' à '{statut_labels.get(nouveau_statut, nouveau_statut)}'"
            
            type_notif = 'warning' if nouveau_statut in ['inactif', 'suspendu'] else 'success'
            
            # Notifier l'utilisateur concerné
            creer_notification(
                utilisateur=instance,
                titre=titre,
                message=message,
                type=type_notif,
                lien="/profil"
            )
            
            # Notifier les administrateurs
            creer_notification_pour_role(
                role="Administrateur",
                titre=f"Statut modifié: {instance.username}",
                message=f"Le statut de {instance.username} est passé à '{statut_labels.get(nouveau_statut, nouveau_statut)}'",
                type="info",
                lien="/utilisateurs"
            )
    except Exception as e:
        print(f"Erreur lors de la création de notification pour utilisateur: {e}")


# Les fonctions notifier_* sont définies dans utils.py pour éviter les imports circulaires

