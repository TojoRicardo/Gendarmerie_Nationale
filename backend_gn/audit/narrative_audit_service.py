"""
Service pour gérer le journal d'audit narratif.
Enrichit progressivement une description narrative unique par session.
"""

from django.utils import timezone
from .models import JournalAuditNarratif, UserSession
from .user_agent_parser import get_ip_from_request, parse_user_agent
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def initialiser_journal_narratif(session: UserSession, request=None) -> Optional[JournalAuditNarratif]:
    """
    Initialise un nouveau journal narratif au début d'une session.
    
    Args:
        session: La session utilisateur
        request: Objet request Django (optionnel, pour extraire IP et User-Agent)
    
    Returns:
        JournalAuditNarratif créé ou None en cas d'erreur
    """
    try:
        # Vérifier si un journal existe déjà pour cette session
        if hasattr(session, 'journal_narratif'):
            journal = session.journal_narratif
            if not journal.est_cloture:
                logger.debug(f"Journal narratif existant trouvé pour la session {session.id}")
                return journal
        
        # Extraire les informations techniques
        ip_address = session.ip_address
        user_agent = session.user_agent
        browser = None
        os_info = None
        
        if request:
            ip_address = get_ip_from_request(request) or ip_address
            user_agent = request.META.get('HTTP_USER_AGENT', '') or user_agent
            
            if user_agent:
                try:
                    ua_info = parse_user_agent(user_agent)
                    browser = ua_info.get('navigateur')
                    os_info = ua_info.get('systeme')
                except Exception as e:
                    logger.debug(f"Erreur lors du parsing user-agent: {e}")
        
        # Créer le journal narratif
        journal = JournalAuditNarratif.objects.create(
            session=session,
            user=session.user,
            date_debut=timezone.now(),
            ip_address=ip_address,
            user_agent=user_agent,
            browser=browser,
            os=os_info,
            description_narrative=''
        )
        
        # Générer la phrase d'ouverture
        user_display = _get_user_display(session.user)
        heure_debut = timezone.now().strftime('%Hh%M')
        phrase_ouverture = f"{user_display} s'est connecté au système à {heure_debut}."
        
        journal.ajouter_phrase_narrative(phrase_ouverture)
        
        logger.info(f"Journal narratif initialisé pour la session {session.id} de l'utilisateur {session.user.username}")
        return journal
        
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation du journal narratif: {e}", exc_info=True)
        return None


def ajouter_action_narrative(
    session: UserSession,
    action_type: str,
    details: Optional[dict] = None,
    request=None
) -> bool:
    """
    Ajoute une action narrative au journal de la session.
    
    Args:
        session: La session utilisateur
        action_type: Type d'action (ex: 'navigation', 'creation', 'modification', etc.)
        details: Détails de l'action (optionnel)
        request: Objet request Django (optionnel)
    
    Returns:
        True si l'action a été ajoutée avec succès, False sinon
    """
    try:
        # Récupérer ou initialiser le journal narratif
        journal = _get_or_create_journal(session, request)
        if not journal:
            return False
        
        # Générer la phrase narrative selon le type d'action
        phrase = _generer_phrase_narrative(action_type, details, session.user, request)
        
        if phrase:
            return journal.ajouter_phrase_narrative(phrase)
        
        return False
        
    except Exception as e:
        logger.error(f"Erreur lors de l'ajout d'action narrative: {e}", exc_info=True)
        return False


def cloturer_journal_narratif(session: UserSession) -> bool:
    """
    Clôture le journal narratif à la fin d'une session.
    
    Args:
        session: La session utilisateur
    
    Returns:
        True si le journal a été clôturé avec succès, False sinon
    """
    try:
        if not hasattr(session, 'journal_narratif'):
            logger.debug(f"Aucun journal narratif trouvé pour la session {session.id}")
            return False
        
        journal = session.journal_narratif
        if journal.est_cloture:
            logger.debug(f"Journal narratif déjà clôturé pour la session {session.id}")
            return True
        
        journal.cloturer()
        logger.info(f"Journal narratif clôturé pour la session {session.id}")
        return True
        
    except Exception as e:
        logger.error(f"Erreur lors de la clôture du journal narratif: {e}", exc_info=True)
        return False


def _get_or_create_journal(session: UserSession, request=None) -> Optional[JournalAuditNarratif]:
    """Récupère ou crée le journal narratif pour une session."""
    try:
        if hasattr(session, 'journal_narratif'):
            journal = session.journal_narratif
            if not journal.est_cloture:
                return journal
        
        # Créer le journal si nécessaire
        return initialiser_journal_narratif(session, request)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération/création du journal: {e}", exc_info=True)
        return None


def _get_user_display(user) -> str:
    """Retourne l'affichage de l'utilisateur."""
    if not user:
        return "L'utilisateur"
    
    full_name = f"{user.first_name} {user.last_name}".strip()
    if full_name:
        return full_name
    
    return user.username if user.username else "L'utilisateur"


def _generer_phrase_narrative(
    action_type: str,
    details: Optional[dict],
    user,
    request=None
) -> str:
    """
    Génère une phrase narrative formelle selon le type d'action.
    
    Args:
        action_type: Type d'action
        details: Détails de l'action
        user: Utilisateur
        request: Objet request Django
    
    Returns:
        Phrase narrative
    """
    user_display = _get_user_display(user)
    heure = timezone.now().strftime('%Hh%M')
    details = details or {}
    
    # Mapping des types d'actions vers des phrases narratives
    action_phrases = {
        'connexion': f"{user_display} s'est connecté au système à {heure}.",
        'login': f"{user_display} s'est connecté au système à {heure}.",
        
        'deconnexion': f"{user_display} s'est déconnecté du système à {heure}.",
        'logout': f"{user_display} s'est déconnecté du système à {heure}.",
        
        'navigation': _generer_phrase_navigation(details, user_display, heure),
        
        'creation': _generer_phrase_creation(details, user_display, heure),
        'create': _generer_phrase_creation(details, user_display, heure),
        
        'modification': _generer_phrase_modification(details, user_display, heure),
        'update': _generer_phrase_modification(details, user_display, heure),
        
        'suppression': _generer_phrase_suppression(details, user_display, heure),
        'delete': _generer_phrase_suppression(details, user_display, heure),
        
        'consultation': _generer_phrase_consultation(details, user_display, heure),
        'view': _generer_phrase_consultation(details, user_display, heure),
        
        'telechargement': _generer_phrase_telechargement(details, user_display, heure),
        'download': _generer_phrase_telechargement(details, user_display, heure),
        
        'televersement': _generer_phrase_televersement(details, user_display, heure),
        'upload': _generer_phrase_televersement(details, user_display, heure),
        
        'recherche': _generer_phrase_recherche(details, user_display, heure),
        'search': _generer_phrase_recherche(details, user_display, heure),
        
        'generation_rapport': _generer_phrase_generation_rapport(details, user_display, heure),
        
        'acces_refuse': _generer_phrase_acces_refuse(details, user_display, heure),
        'access_denied': _generer_phrase_acces_refuse(details, user_display, heure),
        
        'capture_camera': _generer_phrase_capture_camera(details, user_display, heure),
    }
    
    # Rechercher la phrase correspondante
    phrase = action_phrases.get(action_type.lower())
    
    if phrase:
        return phrase
    
    # Phrase générique par défaut
    action_display = action_type.replace('_', ' ').title()
    resource = details.get('ressource', details.get('resource_type', 'la ressource'))
    return f"{user_display} a effectué l'action '{action_display}' sur {resource} à {heure}."


def _generer_phrase_navigation(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une action de navigation."""
    screen_name = details.get('screen_name') or details.get('nom_ecran')
    route = details.get('route') or details.get('route_path')
    
    if screen_name:
        return f"{user_display} a accédé au module '{screen_name}' à {heure}."
    elif route:
        # Extraire un nom lisible de la route
        route_clean = route.replace('/', ' ').replace('-', ' ').strip()
        return f"{user_display} a navigué vers '{route_clean}' à {heure}."
    
    return f"{user_display} a navigué dans le système à {heure}."


def _generer_phrase_creation(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une création."""
    resource_type = details.get('resource_type') or details.get('ressource_type') or 'ressource'
    resource_id = details.get('resource_id') or details.get('ressource_id')
    resource_name = details.get('resource_name') or details.get('nom')
    
    # Mapper les types de ressources
    resource_map = {
        'fiche_criminelle': 'fiche criminelle',
        'enquete': 'enquête',
        'rapport': 'rapport',
        'utilisateur': 'compte utilisateur',
        'preuve': 'pièce à conviction',
    }
    resource_display = resource_map.get(resource_type.lower(), resource_type)
    
    if resource_name:
        return f"{user_display} a créé la {resource_display} '{resource_name}' à {heure}."
    elif resource_id:
        return f"{user_display} a créé une {resource_display} (référence #{resource_id}) à {heure}."
    
    return f"{user_display} a créé une {resource_display} à {heure}."


def _generer_phrase_modification(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une modification."""
    resource_type = details.get('resource_type') or details.get('ressource_type') or 'ressource'
    resource_id = details.get('resource_id') or details.get('ressource_id')
    resource_name = details.get('resource_name') or details.get('nom')
    
    resource_map = {
        'fiche_criminelle': 'fiche criminelle',
        'enquete': 'enquête',
        'rapport': 'rapport',
        'utilisateur': 'compte utilisateur',
        'preuve': 'pièce à conviction',
    }
    resource_display = resource_map.get(resource_type.lower(), resource_type)
    
    if resource_name:
        return f"{user_display} a modifié la {resource_display} '{resource_name}' à {heure}."
    elif resource_id:
        return f"{user_display} a modifié la {resource_display} (référence #{resource_id}) à {heure}."
    
    return f"{user_display} a modifié une {resource_display} à {heure}."


def _generer_phrase_suppression(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une suppression."""
    resource_type = details.get('resource_type') or details.get('ressource_type') or 'ressource'
    resource_id = details.get('resource_id') or details.get('ressource_id')
    resource_name = details.get('resource_name') or details.get('nom')
    
    resource_map = {
        'fiche_criminelle': 'fiche criminelle',
        'enquete': 'enquête',
        'rapport': 'rapport',
        'utilisateur': 'compte utilisateur',
        'preuve': 'pièce à conviction',
        'piece_jointe': 'pièce jointe',
    }
    resource_display = resource_map.get(resource_type.lower(), resource_type)
    
    if resource_name:
        return f"{user_display} a supprimé la {resource_display} '{resource_name}' à {heure}."
    elif resource_id:
        return f"{user_display} a supprimé la {resource_display} (référence #{resource_id}) à {heure}."
    
    return f"{user_display} a supprimé une {resource_display} à {heure}."


def _generer_phrase_consultation(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une consultation."""
    resource_type = details.get('resource_type') or details.get('ressource_type') or 'ressource'
    resource_id = details.get('resource_id') or details.get('ressource_id')
    resource_name = details.get('resource_name') or details.get('nom')
    
    resource_map = {
        'fiche_criminelle': 'fiche criminelle',
        'enquete': 'enquête',
        'rapport': 'rapport',
        'utilisateur': 'compte utilisateur',
        'preuve': 'pièce à conviction',
    }
    resource_display = resource_map.get(resource_type.lower(), resource_type)
    
    if resource_name:
        return f"{user_display} a consulté la {resource_display} '{resource_name}' à {heure}."
    elif resource_id:
        # Pour les enquêtes, essayer d'afficher la référence
        if resource_type.lower() == 'enquete':
            reference = details.get('reference') or details.get('ref')
            if reference:
                return f"{user_display} a consulté l'enquête {reference} à {heure}."
        
        return f"{user_display} a consulté la {resource_display} (référence #{resource_id}) à {heure}."
    
    return f"{user_display} a consulté une {resource_display} à {heure}."


def _generer_phrase_telechargement(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour un téléchargement."""
    file_name = details.get('file_name') or details.get('nom_fichier')
    file_type = details.get('file_type') or details.get('type_fichier', 'fichier')
    resource_type = details.get('resource_type') or 'ressource'
    
    if file_name:
        return f"{user_display} a téléchargé le fichier '{file_name}' ({file_type}) à {heure}."
    elif resource_type:
        resource_map = {
            'rapport': 'rapport',
            'pdf': 'rapport au format PDF',
            'excel': 'rapport au format Excel',
        }
        resource_display = resource_map.get(resource_type.lower(), resource_type)
        return f"{user_display} a téléchargé le {resource_display} à {heure}."
    
    return f"{user_display} a téléchargé un fichier à {heure}."


def _generer_phrase_televersement(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour un téléversement."""
    file_name = details.get('file_name') or details.get('nom_fichier')
    resource_type = details.get('resource_type') or 'ressource'
    
    if file_name:
        return f"{user_display} a téléversé le fichier '{file_name}' à {heure}."
    elif resource_type:
        resource_map = {
            'preuve': 'pièce à conviction',
            'piece_jointe': 'pièce jointe',
            'fichier_dactyloscopique': 'fichier dactyloscopique',
        }
        resource_display = resource_map.get(resource_type.lower(), resource_type)
        return f"{user_display} a téléversé un {resource_display} à {heure}."
    
    return f"{user_display} a téléversé un fichier à {heure}."


def _generer_phrase_recherche(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une recherche."""
    search_term = details.get('search_term') or details.get('terme_recherche')
    search_type = details.get('search_type') or details.get('type_recherche', 'recherche')
    
    if search_term:
        return f"{user_display} a effectué une recherche '{search_type}' avec le terme '{search_term}' à {heure}."
    
    return f"{user_display} a effectué une recherche '{search_type}' à {heure}."


def _generer_phrase_generation_rapport(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une génération de rapport."""
    report_type = details.get('report_type') or details.get('type_rapport', 'rapport')
    report_name = details.get('report_name') or details.get('nom_rapport')
    
    if report_name:
        return f"{user_display} a généré le rapport '{report_name}' à {heure}."
    
    return f"{user_display} a généré un {report_type} à {heure}."


def _generer_phrase_acces_refuse(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour un accès refusé."""
    resource_type = details.get('resource_type') or details.get('ressource_type', 'ressource')
    reason = details.get('reason') or details.get('raison')
    
    phrase = f"{user_display} a tenté d'accéder à {resource_type} mais l'accès a été refusé à {heure}."
    
    if reason:
        phrase += f" Raison: {reason}."
    
    return phrase


def _generer_phrase_capture_camera(details: dict, user_display: str, heure: str) -> str:
    """Génère une phrase pour une capture caméra."""
    camera_type = details.get('camera_type', 'caméra')
    camera_index = details.get('camera_index')
    
    # Construire la description de la caméra
    if camera_index == 0:
        camera_desc = "la caméra intégrée"
    elif camera_index:
        camera_desc = f"la caméra USB externe (index {camera_index})"
    else:
        camera_desc = camera_type
    
    phrase_parts = [f"{user_display} a utilisé {camera_desc} pour capturer une image à {heure}."]
    
    # Ajouter les informations sur les associations
    if details.get('criminel_id'):
        numero_fiche = details.get('numero_fiche', f"#{details.get('criminel_id')}")
        criminel_nom = details.get('criminel_nom', '')
        if criminel_nom:
            phrase_parts.append(f"La capture est associée à la fiche criminelle de {criminel_nom} (référence {numero_fiche}).")
        else:
            phrase_parts.append(f"La capture est associée à la fiche criminelle {numero_fiche}.")
    
    if details.get('upr_id'):
        upr_code = details.get('upr_code', f"UPR#{details.get('upr_id')}")
        phrase_parts.append(f"La capture est associée au suspect non identifié {upr_code}.")
    
    return " ".join(phrase_parts)

