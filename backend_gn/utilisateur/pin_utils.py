"""
Utilitaires pour la gestion du PIN à 6 chiffres
"""

from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from datetime import timedelta
from .models import UserProfile, PinAuditLog, UtilisateurModel

# Constantes pour la gestion du PIN
MAX_PIN_ATTEMPTS = 3
PIN_BLOCK_DURATION = timedelta(minutes=5)  # Blocage de 5 minutes après 3 échecs

FORBIDDEN_PINS = {
    '000000', '111111', '222222', '333333', '444444', '555555',
    '666666', '777777', '888888', '999999', '123456', '654321',
    '012345', '543210', '111222', '222111', '112233', '332211'
}


def set_user_pin(user, pin_code):
    """
    Définit ou modifie le PIN d'un utilisateur
    
    Args:
        user: Instance de UtilisateurModel
        pin_code: Code PIN à 6 chiffres (string)
    
    Returns:
        tuple: (success: bool, message: str)
    
    Raises:
        ValueError: Si le PIN est invalide
    """
    # Validation du format
    if not pin_code or not isinstance(pin_code, str):
        raise ValueError("Le PIN est requis")
    
    # Vérifier que c'est bien 6 chiffres
    if not pin_code.isdigit() or len(pin_code) != 6:
        raise ValueError("Le PIN doit contenir exactement 6 chiffres")
    
    # Vérifier les PINs interdits
    if pin_code in FORBIDDEN_PINS:
        raise ValueError("Ce PIN est trop simple et n'est pas autorisé. Veuillez choisir un PIN plus sécurisé.")
    
    # Créer ou récupérer le profil utilisateur
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    # Hasher et stocker le PIN
    profile.pin_hash = make_password(pin_code)
    profile.pin_attempts = 0
    profile.pin_blocked_until = None
    profile.save()
    
    return True, "PIN défini avec succès"


def verify_user_pin(user, input_pin, ip_address=None, user_agent=None):
    """
    Vérifie le PIN d'un utilisateur avec limitation des tentatives et blocage temporaire
    
    Args:
        user: Instance de UtilisateurModel
        input_pin: Code PIN saisi par l'utilisateur (string)
        ip_address: Adresse IP de la requête (optionnel)
        user_agent: User Agent du navigateur (optionnel)
    
    Returns:
        tuple: (success: bool, message: str)
    """
    now = timezone.now()
    
    # Créer ou récupérer le profil utilisateur
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    # Vérifier si l'utilisateur est bloqué
    if profile.is_pin_blocked():
        remaining_minutes = profile.get_block_remaining_time()
        PinAuditLog.objects.create(
            user=user,
            success=False,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Intégrer dans le système d'audit principal
        _log_pin_audit(user, False, ip_address, user_agent, "Utilisateur bloqué")
        return False, f"Trop d'échecs. Réessayez dans {remaining_minutes} minute(s)."
    
    # Vérifier si le PIN est défini
    if not profile.pin_hash:
        PinAuditLog.objects.create(
            user=user,
            success=True,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Intégrer dans le système d'audit principal
        _log_pin_audit(user, True, ip_address, user_agent, "PIN non configuré")
        return True, "Connexion réussie (PIN non configuré - veuillez le définir dans votre profil)"
    
    # Vérifier le format du PIN saisi
    if not input_pin:
        profile.pin_attempts += 1
        if profile.pin_attempts >= MAX_PIN_ATTEMPTS:
            profile.pin_blocked_until = now + PIN_BLOCK_DURATION
            message = f"Trop d'échecs. Bloqué pendant {PIN_BLOCK_DURATION.seconds // 60} minutes."
        else:
            remaining = MAX_PIN_ATTEMPTS - profile.pin_attempts
            message = f"PIN invalide. {remaining} tentative(s) restante(s)."
        profile.save()
        PinAuditLog.objects.create(
            user=user,
            success=False,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Intégrer dans le système d'audit principal
        _log_pin_audit(user, False, ip_address, user_agent, "PIN vide")
        return False, message
    
    # S'assurer que input_pin est une chaîne
    if not isinstance(input_pin, str):
        input_pin = str(input_pin)
    
    # Vérifier que le PIN contient uniquement des chiffres et a 6 caractères
    if not input_pin.isdigit() or len(input_pin) != 6:
        profile.pin_attempts += 1
        if profile.pin_attempts >= MAX_PIN_ATTEMPTS:
            profile.pin_blocked_until = now + PIN_BLOCK_DURATION
            message = f"Trop d'échecs. Bloqué pendant {PIN_BLOCK_DURATION.seconds // 60} minutes."
        else:
            remaining = MAX_PIN_ATTEMPTS - profile.pin_attempts
            message = f"PIN invalide. Le PIN doit contenir exactement 6 chiffres. {remaining} tentative(s) restante(s)."
        profile.save()
        PinAuditLog.objects.create(
            user=user,
            success=False,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Intégrer dans le système d'audit principal
        _log_pin_audit(user, False, ip_address, user_agent, "Format PIN invalide")
        return False, message
    
    # Vérifier le PIN
    if check_password(input_pin, profile.pin_hash):
        # Réinitialiser compteur et blocage
        profile.pin_attempts = 0
        profile.pin_blocked_until = None
        profile.save()
        
        # Log réussite
        PinAuditLog.objects.create(
            user=user,
            success=True,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Intégrer dans le système d'audit principal
        _log_pin_audit(user, True, ip_address, user_agent, "PIN validé avec succès")
        return True, "Connexion réussie"
    else:
        # Incrémenter compteur d'échecs
        profile.pin_attempts += 1
        if profile.pin_attempts >= MAX_PIN_ATTEMPTS:
            profile.pin_blocked_until = now + PIN_BLOCK_DURATION
            message = f"Trop d'échecs. Bloqué pendant {PIN_BLOCK_DURATION.seconds // 60} minutes."
        else:
            remaining = MAX_PIN_ATTEMPTS - profile.pin_attempts
            message = f"PIN incorrect. {remaining} tentative(s) restante(s)."
        profile.save()
        
        # Log échec
        PinAuditLog.objects.create(
            user=user,
            success=False,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Intégrer dans le système d'audit principal
        _log_pin_audit(user, False, ip_address, user_agent, f"PIN incorrect - {message}")
        return False, message


def _log_pin_audit(user, success, ip_address, user_agent, message):
    """
    Intègre les logs PIN dans le système d'audit principal.
    
    Args:
        user: Instance de UtilisateurModel
        success: bool - True si la validation PIN a réussi
        ip_address: str - Adresse IP
        user_agent: str - User Agent
        message: str - Message descriptif
    """
    try:
        from audit.utils import log_action
        from audit.middleware import get_current_request
        
        request = get_current_request()
        action = 'PIN_VALIDATION' if success else 'PIN_FAILED'
        
        log_action(
            request=request,
            user=user,
            action=action,
            resource_type='Système',
            resource_id=str(user.id) if user else None,
            endpoint=request.path if request else '/api/auth/verify-pin/',
            method='POST',
            ip_address=ip_address,
            user_agent=user_agent,
            additional_info=message,
            reussi=success,
            message_erreur=None if success else message
        )
    except Exception as e:
        # Ne pas bloquer si l'audit échoue
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur lors de l'intégration du log PIN dans l'audit: {e}")


def get_client_ip(request):
    """
    Récupère l'adresse IP du client depuis la requête.
    Utilise la fonction complète du module audit pour une meilleure détection.
    
    Args:
        request: Objet HttpRequest Django
    
    Returns:
        str: Adresse IP du client ou None
    """
    try:
        # Utiliser la fonction complète du module audit qui gère les proxies
        from audit.user_agent_parser import get_ip_from_request
        return get_ip_from_request(request)
    except ImportError:
        # Fallback si le module audit n'est pas disponible
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
            if ip:
                return ip
        
        # Vérifier X-Real-IP
        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return x_real_ip.strip()
        
        # Utiliser REMOTE_ADDR
        remote_addr = request.META.get('REMOTE_ADDR')
        if remote_addr:
            return remote_addr.strip()
        
        return None


