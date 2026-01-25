"""
Signals pour gérer la fermeture des sessions utilisateur et le journal narratif.
"""

from django.contrib.auth.signals import user_logged_out, user_logged_in
from django.dispatch import receiver
from .models import UserSession
from .narrative_audit_service import initialiser_journal_narratif, cloturer_journal_narratif
import logging

logger = logging.getLogger(__name__)


@receiver(user_logged_in)
def init_journal_narratif_on_login(sender, request, user, **kwargs):
    """
    Initialise le journal narratif lors de la connexion d'un utilisateur.
    """
    try:
        if not user or not user.is_authenticated:
            return
        
        if request and hasattr(request, 'session'):
            session_key = request.session.session_key
            if session_key:
                try:
                    session = UserSession.objects.get(session_key=session_key)
                    # Initialiser le journal narratif
                    initialiser_journal_narratif(session, request)
                except UserSession.DoesNotExist:
                    logger.debug(f"Aucune session trouvée pour la clé {session_key} lors de la connexion")
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du journal narratif: {e}")
    except Exception as e:
        logger.error(f"Erreur dans init_journal_narratif_on_login: {e}")


@receiver(user_logged_out)
def close_user_session(sender, request, user, **kwargs):
    """
    Ferme la session utilisateur et clôture le journal narratif lors de la déconnexion.
    """
    try:
        if request and hasattr(request, 'session'):
            session_key = request.session.session_key
            if session_key:
                try:
                    session = UserSession.objects.get(session_key=session_key)
                    # Clôturer le journal narratif avant de fermer la session
                    cloturer_journal_narratif(session)
                    # Fermer la session
                    session.close()
                    logger.info(f"Session fermée et journal narratif clôturé pour l'utilisateur {user.username if user else 'Anonyme'}")
                except UserSession.DoesNotExist:
                    logger.debug(f"Aucune session trouvée pour la clé {session_key}")
                except Exception as e:
                    logger.error(f"Erreur lors de la fermeture de la session: {e}")
    except Exception as e:
        logger.error(f"Erreur dans close_user_session: {e}")

