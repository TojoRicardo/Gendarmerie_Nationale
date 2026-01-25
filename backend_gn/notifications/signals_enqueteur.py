"""
Signals pour notifier les administrateurs lorsque les enquêteurs modifient des fichiers
"""

import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.conf import settings
from audit.middleware import get_current_user
from .utils import creer_notification_pour_role

logger = logging.getLogger(__name__)

User = settings.AUTH_USER_MODEL

# Modèles à surveiller pour les modifications d'enquêteurs
MODELES_SURVEILLES = []


def comparer_champs(ancien_objet, nouvel_objet, champs_a_surveiller=None):
    """
    Compare deux objets et retourne un dictionnaire des champs modifiés.
    
    Args:
        ancien_objet: Instance de l'objet avant modification
        nouvel_objet: Instance de l'objet après modification
        champs_a_surveiller: Liste des champs à surveiller (None = tous)
    
    Returns:
        dict: Dictionnaire avec les champs modifiés {champ: {'ancien': valeur, 'nouveau': valeur}}
    """
    modifications = {}
    
    # Obtenir tous les champs du modèle
    if champs_a_surveiller is None:
        champs_a_surveiller = [f.name for f in nouvel_objet._meta.get_fields() 
                              if hasattr(f, 'name') and not f.name.startswith('_')]
    
    for champ in champs_a_surveiller:
        if not hasattr(ancien_objet, champ) or not hasattr(nouvel_objet, champ):
            continue
        
        ancienne_valeur = getattr(ancien_objet, champ, None)
        nouvelle_valeur = getattr(nouvel_objet, champ, None)
        
        # Ignorer les champs de date de modification automatiques
        if champ in ['date_modification', 'date_creation', 'updated_at', 'created_at']:
            continue
        
        # Comparer les valeurs
        if ancienne_valeur != nouvelle_valeur:
            # Formater les valeurs pour l'affichage
            ancienne_valeur_str = _formater_valeur(ancienne_valeur)
            nouvelle_valeur_str = _formater_valeur(nouvelle_valeur)
            
            modifications[champ] = {
                'ancien': ancienne_valeur_str,
                'nouveau': nouvelle_valeur_str,
                'label': _get_field_label(nouvel_objet, champ)
            }
    
    return modifications


def _formater_valeur(valeur):
    """Formate une valeur pour l'affichage dans la notification."""
    if valeur is None:
        return "(vide)"
    if isinstance(valeur, bool):
        return "Oui" if valeur else "Non"
    if hasattr(valeur, '__str__'):
        return str(valeur)
    return valeur


def _get_field_label(model_instance, field_name):
    """Obtient le label d'un champ depuis le modèle."""
    try:
        field = model_instance._meta.get_field(field_name)
        return field.verbose_name if hasattr(field, 'verbose_name') else field_name.replace('_', ' ').title()
    except:
        return field_name.replace('_', ' ').title()


def est_enqueteur(user):
    """Vérifie si l'utilisateur est un enquêteur."""
    if not user or not user.is_authenticated:
        return False
    
    role = getattr(user, 'role', '')
    if not role:
        return False
    
    role_lower = role.lower()
    return 'enquêteur' in role_lower or 'enqueteur' in role_lower


def est_admin(user):
    """Vérifie si l'utilisateur est un administrateur."""
    if not user or not user.is_authenticated:
        return False
    
    # Vérifier si c'est un superutilisateur
    if user.is_superuser:
        return True
    
    # Vérifier le rôle
    role = getattr(user, 'role', '')
    if not role:
        return False
    
    role_lower = role.lower()
    return 'administrateur' in role_lower or 'admin' in role_lower


#Signal pour les Fiches Criminelles
try:
    from criminel.models import CriminalFicheCriminelle
    
    @receiver(pre_save, sender=CriminalFicheCriminelle)
    def capturer_etat_avant_modification_fiche(sender, instance, **kwargs):
        """Capture l'état de la fiche avant modification."""
        if instance.pk:  # Si l'objet existe déjà
            try:
                ancien_objet = CriminalFicheCriminelle.objects.get(pk=instance.pk)
                instance._etat_avant_modification = ancien_objet
            except CriminalFicheCriminelle.DoesNotExist:
                instance._etat_avant_modification = None
    
    @receiver(post_save, sender=CriminalFicheCriminelle)
    def notifier_modification_fiche_par_enqueteur(sender, instance, created, **kwargs):
        """Notifie les admins si un enquêteur modifie une fiche criminelle."""
        if created:
            return  # On ne notifie que les modifications, pas les créations
        
        try:
            current_user = get_current_user()
            
            # Vérifier si c'est un enquêteur qui a modifié
            if not current_user or not est_enqueteur(current_user):
                return
            
            # Récupérer l'état avant modification
            ancien_objet = getattr(instance, '_etat_avant_modification', None)
            if not ancien_objet:
                return
            
            # Comparer les champs modifiés
            champs_importants = [
                'nom', 'prenom', 'date_naissance', 'lieu_naissance', 'adresse',
                'telephone', 'email', 'numero_fiche', 'motif_arrestation',
                'date_arrestation', 'lieu_arrestation', 'niveau_danger',
                'antecedent_judiciaire', 'suite_judiciaire', 'peine_encourue'
            ]
            
            modifications = comparer_champs(ancien_objet, instance, champs_importants)
            
            if not modifications:
                return  # Aucune modification détectée
            
            # Construire le message détaillé
            nom_utilisateur = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username
            numero_fiche = instance.numero_fiche or f"#{instance.id}"
            nom_suspect = f"{instance.nom} {instance.prenom}".strip() or "Non spécifié"
            
            titre = f"Modification de fiche criminelle par un enquêteur"
            message = f"L'enquêteur {nom_utilisateur} a modifié la fiche criminelle {numero_fiche} (Suspect: {nom_suspect}).\n\n"
            message += "Modifications apportées:\n"
            
            for champ, valeurs in modifications.items():
                label = valeurs.get('label', champ)
                message += f"• {label}:\n"
                message += f"  - Ancien: {valeurs['ancien']}\n"
                message += f"  - Nouveau: {valeurs['nouveau']}\n"
            
            lien = f"/fiches-criminelles/{instance.id}"
            
            # Notifier tous les administrateurs
            creer_notification_pour_role(
                role="Administrateur Système",
                titre=titre,
                message=message,
                type="warning",
                lien=lien
            )
            
            logger.info(f"Notification envoyée aux admins: modification de fiche {instance.id} par enquêteur {current_user.username}")
            
        except Exception as e:
            logger.error(f"Erreur lors de la notification de modification de fiche: {e}")

except ImportError:
    logger.warning("Module criminel non disponible, notifications enquêteur désactivées")


#Signal pour les Photos Biométriques
try:
    from biometrie.models import BiometriePhoto
    
    @receiver(pre_save, sender=BiometriePhoto)
    def capturer_etat_avant_modification_photo(sender, instance, **kwargs):
        """Capture l'état de la photo avant modification."""
        if instance.pk:
            try:
                ancien_objet = BiometriePhoto.objects.get(pk=instance.pk)
                instance._etat_avant_modification = ancien_objet
            except BiometriePhoto.DoesNotExist:
                instance._etat_avant_modification = None
    
    @receiver(post_save, sender=BiometriePhoto)
    def notifier_modification_photo_par_enqueteur(sender, instance, created, **kwargs):
        """Notifie les admins si un enquêteur modifie une photo biométrique."""
        if created:
            return
        
        try:
            current_user = get_current_user()
            
            if not current_user or not est_enqueteur(current_user):
                return
            
            ancien_objet = getattr(instance, '_etat_avant_modification', None)
            if not ancien_objet:
                return
            
            modifications = comparer_champs(ancien_objet, instance, ['type_photo', 'notes', 'qualite'])
            
            if not modifications:
                return
            
            nom_utilisateur = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username
            nom_criminel = f"{instance.criminel.nom} {instance.criminel.prenom}" if instance.criminel else "Non spécifié"
            
            titre = f"Modification de photo biométrique par un enquêteur"
            message = f"L'enquêteur {nom_utilisateur} a modifié une photo biométrique pour {nom_criminel}.\n\n"
            message += "Modifications apportées:\n"
            
            for champ, valeurs in modifications.items():
                label = valeurs.get('label', champ)
                message += f"• {label}:\n"
                message += f"  - Ancien: {valeurs['ancien']}\n"
                message += f"  - Nouveau: {valeurs['nouveau']}\n"
            
            lien = f"/biometrie/{instance.criminel.id if instance.criminel else ''}"
            
            creer_notification_pour_role(
                role="Administrateur Système",
                titre=titre,
                message=message,
                type="warning",
                lien=lien
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de la notification de modification de photo: {e}")

except ImportError:
    logger.warning("Module biometrie non disponible, notifications enquêteur désactivées")


#Signal pour les Empreintes Digitales
try:
    from biometrie.models import BiometrieEmpreinte
    
    @receiver(pre_save, sender=BiometrieEmpreinte)
    def capturer_etat_avant_modification_empreinte(sender, instance, **kwargs):
        """Capture l'état de l'empreinte avant modification."""
        if instance.pk:
            try:
                ancien_objet = BiometrieEmpreinte.objects.get(pk=instance.pk)
                instance._etat_avant_modification = ancien_objet
            except BiometrieEmpreinte.DoesNotExist:
                instance._etat_avant_modification = None
    
    @receiver(post_save, sender=BiometrieEmpreinte)
    def notifier_modification_empreinte_par_enqueteur(sender, instance, created, **kwargs):
        """Notifie les admins si un enquêteur modifie une empreinte digitale."""
        if created:
            return
        
        try:
            current_user = get_current_user()
            
            if not current_user or not est_enqueteur(current_user):
                return
            
            ancien_objet = getattr(instance, '_etat_avant_modification', None)
            if not ancien_objet:
                return
            
            modifications = comparer_champs(ancien_objet, instance, ['doigt', 'type_empreinte', 'qualite', 'notes'])
            
            if not modifications:
                return
            
            nom_utilisateur = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username
            nom_criminel = f"{instance.criminel.nom} {instance.criminel.prenom}" if instance.criminel else "Non spécifié"
            
            titre = f"Modification d'empreinte digitale par un enquêteur"
            message = f"L'enquêteur {nom_utilisateur} a modifié une empreinte digitale pour {nom_criminel}.\n\n"
            message += "Modifications apportées:\n"
            
            for champ, valeurs in modifications.items():
                label = valeurs.get('label', champ)
                message += f"• {label}:\n"
                message += f"  - Ancien: {valeurs['ancien']}\n"
                message += f"  - Nouveau: {valeurs['nouveau']}\n"
            
            lien = f"/biometrie/{instance.criminel.id if instance.criminel else ''}"
            
            creer_notification_pour_role(
                role="Administrateur Système",
                titre=titre,
                message=message,
                type="warning",
                lien=lien
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de la notification de modification d'empreinte: {e}")

except ImportError:
    logger.warning("Module biometrie non disponible, notifications enquêteur désactivées")

