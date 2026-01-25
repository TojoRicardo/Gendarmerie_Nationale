"""
Utilitaires pour créer et gérer les notifications
"""
from .models import Notification
from utilisateur.models import UtilisateurModel


def creer_notification(utilisateur, titre, message, type='info', lien=None):
    """
    Créer une notification pour un utilisateur
    
    Args:
        utilisateur: Instance de UtilisateurModel ou ID
        titre: Titre de la notification
        message: Message de la notification
        type: Type de notification ('info', 'success', 'warning', 'error')
        lien: Lien optionnel vers une ressource
    
    Returns:
        Notification: L'instance de notification créée
    """
    if isinstance(utilisateur, int):
        utilisateur = UtilisateurModel.objects.get(id=utilisateur)
    
    notification = Notification.objects.create(
        utilisateur=utilisateur,
        titre=titre,
        message=message,
        type=type,
        lien=lien
    )
    
    return notification


def creer_notification_pour_role(role, titre, message, type='info', lien=None):
    """
    Créer une notification pour tous les utilisateurs ayant un rôle spécifique
    
    Args:
        role: Nom du rôle (string)
        titre: Titre de la notification
        message: Message de la notification
        type: Type de notification
        lien: Lien optionnel vers une ressource
    
    Returns:
        list: Liste des notifications créées
    """
    # Le rôle est un CharField dans UtilisateurModel
    utilisateurs = UtilisateurModel.objects.filter(role__icontains=role)
    notifications = []
    
    for utilisateur in utilisateurs:
        notification = creer_notification(
            utilisateur=utilisateur,
            titre=titre,
            message=message,
            type=type,
            lien=lien
        )
        notifications.append(notification)
    
    return notifications


def creer_notification_multiple(utilisateurs, titre, message, type='info', lien=None):
    """
    Créer une notification pour plusieurs utilisateurs
    
    Args:
        utilisateurs: Liste d'instances UtilisateurModel ou IDs
        titre: Titre de la notification
        message: Message de la notification
        type: Type de notification
        lien: Lien optionnel vers une ressource
    
    Returns:
        list: Liste des notifications créées
    """
    notifications = []
    
    for utilisateur in utilisateurs:
        notification = creer_notification(
            utilisateur=utilisateur,
            titre=titre,
            message=message,
            type=type,
            lien=lien
        )
        notifications.append(notification)
    
    return notifications


# Types de notifications prédéfinis
class NotificationTypes:
    """Types de notifications standards"""
    
    @staticmethod
    def fiche_creee(utilisateur, numero_fiche, createur):
        """Notification pour une nouvelle fiche criminelle"""
        return creer_notification(
            utilisateur=utilisateur,
            titre='Nouvelle fiche criminelle',
            message=f'Une nouvelle fiche criminelle #{numero_fiche} a été créée par {createur}',
            type='info',
            lien=f'/fiches-criminelles/{numero_fiche}'
        )
    
    @staticmethod
    def fiche_modifiee(utilisateur, numero_fiche, modificateur):
        """Notification pour une fiche criminelle modifiée"""
        return creer_notification(
            utilisateur=utilisateur,
            titre='Fiche criminelle modifiée',
            message=f'La fiche criminelle #{numero_fiche} a été modifiée par {modificateur}',
            type='info',
            lien=f'/fiches-criminelles/{numero_fiche}'
        )
    
    @staticmethod
    def analyse_ia_terminee(utilisateur, numero_fiche):
        """Notification pour une analyse IA terminée"""
        return creer_notification(
            utilisateur=utilisateur,
            titre='Analyse IA terminée',
            message=f'L\'analyse prédictive pour la fiche #{numero_fiche} est terminée',
            type='success',
            lien=f'/ia'
        )
    
    @staticmethod
    def rapport_genere(utilisateur, type_rapport):
        """Notification pour un rapport généré"""
        return creer_notification(
            utilisateur=utilisateur,
            titre='Rapport généré',
            message=f'Votre rapport {type_rapport} est prêt à être consulté',
            type='success',
            lien='/rapports'
        )
    
    @staticmethod
    def utilisateur_cree(utilisateur, nom_utilisateur, createur):
        """Notification pour un nouvel utilisateur"""
        return creer_notification(
            utilisateur=utilisateur,
            titre='Nouvel utilisateur créé',
            message=f'Un nouvel utilisateur {nom_utilisateur} a été créé par {createur}',
            type='info',
            lien='/utilisateurs'
        )
    
    @staticmethod
    def erreur_systeme(utilisateur, message_erreur):
        """Notification pour une erreur système"""
        return creer_notification(
            utilisateur=utilisateur,
            titre='Erreur système',
            message=message_erreur,
            type='error'
        )


# Fonctions avancées pour l'intégration système

def notifier_analyse_ia_terminee(fiche_id, utilisateur, resultats=None):
    """
    Fonction pour notifier qu'une analyse IA est terminée
    À appeler depuis les vues d'analyse IA
    
    Args:
        fiche_id: ID de la fiche criminelle analysée
        utilisateur: Utilisateur qui a lancé l'analyse
        resultats: Dictionnaire optionnel avec les résultats
    """
    try:
        from criminel.models import CriminalFicheCriminelle
        
        fiche = CriminalFicheCriminelle.objects.get(id=fiche_id)
        
        titre = "Analyse IA terminée"
        message = f"L'analyse prédictive pour la fiche #{fiche.numero_fiche or fiche.id} est terminée"
        
        if resultats:
            if resultats.get('correspondances'):
                message += f". {len(resultats['correspondances'])} correspondance(s) trouvée(s)"
            if resultats.get('score_risque'):
                message += f". Score de risque: {resultats['score_risque']}"
        
        # Notifier l'utilisateur qui a lancé l'analyse
        creer_notification(
            utilisateur=utilisateur,
            titre=titre,
            message=message,
            type="success",
            lien=f"/ia?fiche={fiche_id}"
        )
        
        # Notifier aussi les enquêteurs principaux
        try:
            creer_notification_pour_role(
                role="Enquêteur Principal",
                titre=titre,
                message=f"{message} (lancée par {utilisateur.username})",
                type="info",
                lien=f"/ia?fiche={fiche_id}"
            )
        except Exception:
            pass  # Le rôle n'existe peut-être pas
        
    except Exception as e:
        print(f"Erreur lors de la création de notification IA: {e}")


def notifier_rapport_genere(utilisateur, type_rapport, rapport_id=None):
    """
    Fonction pour notifier qu'un rapport a été généré
    À appeler depuis les vues de rapports
    
    Args:
        utilisateur: Utilisateur qui a demandé le rapport
        type_rapport: Type de rapport généré
        rapport_id: ID optionnel du rapport
    """
    try:
        titre = "Rapport généré avec succès"
        message = f"Votre rapport '{type_rapport}' a été généré et est prêt à être consulté"
        
        lien = "/rapports"
        if rapport_id:
            lien = f"/rapports/{rapport_id}"
        
        # Notifier l'utilisateur
        creer_notification(
            utilisateur=utilisateur,
            titre=titre,
            message=message,
            type="success",
            lien=lien
        )
        
    except Exception as e:
        print(f"Erreur lors de la création de notification rapport: {e}")


def notifier_erreur_systeme(utilisateurs, message_erreur, details=None):
    """
    Fonction pour notifier une erreur système
    
    Args:
        utilisateurs: Rôle (str) ou liste d'utilisateurs
        message_erreur: Message d'erreur
        details: Détails optionnels
    """
    try:
        titre = "Erreur système détectée"
        message = message_erreur
        
        if details:
            message += f"\n\nDétails: {details}"
        
        if isinstance(utilisateurs, str):
            # C'est un nom de rôle
            creer_notification_pour_role(
                role=utilisateurs,
                titre=titre,
                message=message,
                type="error"
            )
        else:
            # C'est une liste d'utilisateurs
            for user in utilisateurs:
                creer_notification(
                    utilisateur=user,
                    titre=titre,
                    message=message,
                    type="error"
                )
                
    except Exception as e:
        print(f"Erreur lors de la création de notification erreur: {e}")

