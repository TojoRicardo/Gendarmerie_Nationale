"""
Service centralisé de journalisation d'audit.
UNIQUE POINT D'ENTRÉE pour toutes les actions d'audit dans le système SGIC.
"""

import uuid
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import JournalAudit

User = get_user_model()


def audit_log(
    request,
    module,
    action,
    ressource,
    narration
):
    """
    Fonction UNIQUE de journalisation d'audit.
    
    RÈGLE D'OR: 🚫 PAS de JournalAudit.objects.create() ailleurs
                ✅ TOUJOURS audit_log()
    
    Args:
        request: Objet HttpRequest Django
        module: Module concerné (ex: "Authentification", "Gestion criminelle", "Rapports")
        action: Action effectuée (ex: "Connexion utilisateur", "Création fiche criminelle")
        ressource: Ressource concernée (ex: "Système SGIC", "Fiche criminelle #123")
        narration: Description narrative détaillée de l'action
    
    Returns:
        JournalAudit: Instance créée du journal d'audit
    """
    # Récupérer l'utilisateur (peut être None pour actions système)
    user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
    
    # Déterminer le rôle
    role = "Système"
    if user and user.groups.exists():
        role = user.groups.first().name
    
    # Extraire l'adresse IP
    ip = request.META.get("REMOTE_ADDR", "0.0.0.0")
    # Gérer le cas où l'application est derrière un proxy
    if ip == "127.0.0.1" or ip.startswith("::1"):
        ip = request.META.get("HTTP_X_FORWARDED_FOR", ip)
        if ip:
            # Prendre la première IP si plusieurs
            ip = ip.split(",")[0].strip()
    
    # Extraire le User-Agent
    user_agent = request.META.get("HTTP_USER_AGENT", "Inconnu")
    
    # Extraire l'OS depuis le User-Agent
    os_info = request.META.get("HTTP_SEC_CH_UA_PLATFORM", "Inconnu")
    # Nettoyer les guillemets si présents
    if os_info and os_info.startswith('"') and os_info.endswith('"'):
        os_info = os_info[1:-1]
    
    # Essayer de parser l'OS depuis le User-Agent si non disponible
    if os_info == "Inconnu" and user_agent:
        os_info = _parse_os_from_user_agent(user_agent)
    
    # Extraire le navigateur depuis le User-Agent
    navigateur = _parse_browser_from_user_agent(user_agent)
    
    # Méthode HTTP
    methode_http = request.method
    
    # Générer la référence d'audit unique avec UUID pour éviter les collisions
    import time
    timestamp = timezone.now()
    # Ajouter des microsecondes pour garantir l'unicité
    unique_suffix = str(uuid.uuid4())[:8]
    reference_audit = f"SGIC-AUDIT-{timestamp.strftime('%Y%m%d-%H%M%S')}-{unique_suffix}"
    
    # Gérer le cas d'une collision de référence (très improbable mais possible)
    max_retries = 5
    retry_count = 0
    while retry_count < max_retries:
        try:
            # Créer l'entrée du journal d'audit
            journal = JournalAudit.objects.create(
                utilisateur=user,
                role=role,
                module=module,
                action=action,
                ressource=ressource,
                narration=narration,
                ip=ip,
                navigateur=navigateur,
                os=os_info,
                methode_http=methode_http,
                reference_audit=reference_audit
            )
            return journal
        except Exception as e:
            # Si la référence existe déjà, générer une nouvelle
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                retry_count += 1
                unique_suffix = str(uuid.uuid4())[:8]
                reference_audit = f"SGIC-AUDIT-{timestamp.strftime('%Y%m%d-%H%M%S')}-{unique_suffix}"
            else:
                # Autre erreur, la propager
                raise
    
    return journal


def _parse_os_from_user_agent(user_agent):
    """
    Parse le système d'exploitation depuis le User-Agent.
    
    Args:
        user_agent: Chaîne User-Agent complète
    
    Returns:
        str: Nom du système d'exploitation
    """
    user_agent_lower = user_agent.lower()
    
    if "windows" in user_agent_lower:
        if "windows nt 10.0" in user_agent_lower or "windows 10" in user_agent_lower:
            return "Windows 10"
        elif "windows nt 11.0" in user_agent_lower or "windows 11" in user_agent_lower:
            return "Windows 11"
        elif "windows nt 6.3" in user_agent_lower:
            return "Windows 8.1"
        elif "windows nt 6.2" in user_agent_lower:
            return "Windows 8"
        elif "windows nt 6.1" in user_agent_lower:
            return "Windows 7"
        else:
            return "Windows"
    elif "mac os x" in user_agent_lower or "macos" in user_agent_lower:
        return "macOS"
    elif "linux" in user_agent_lower:
        if "ubuntu" in user_agent_lower:
            return "Ubuntu Linux"
        elif "debian" in user_agent_lower:
            return "Debian Linux"
        elif "fedora" in user_agent_lower:
            return "Fedora Linux"
        else:
            return "Linux"
    elif "android" in user_agent_lower:
        return "Android"
    elif "ios" in user_agent_lower or "iphone" in user_agent_lower or "ipad" in user_agent_lower:
        return "iOS"
    else:
        return "Inconnu"


def _parse_browser_from_user_agent(user_agent):
    """
    Parse le navigateur depuis le User-Agent.
    
    Args:
        user_agent: Chaîne User-Agent complète
    
    Returns:
        str: Nom et version du navigateur
    """
    user_agent_lower = user_agent.lower()
    
    if "chrome" in user_agent_lower and "edg" not in user_agent_lower:
        # Extraire la version Chrome
        import re
        version_match = re.search(r'chrome/([\d.]+)', user_agent_lower)
        version = version_match.group(1) if version_match else "Unknown"
        return f"Google Chrome {version}"
    elif "firefox" in user_agent_lower:
        import re
        version_match = re.search(r'firefox/([\d.]+)', user_agent_lower)
        version = version_match.group(1) if version_match else "Unknown"
        return f"Mozilla Firefox {version}"
    elif "safari" in user_agent_lower and "chrome" not in user_agent_lower:
        import re
        version_match = re.search(r'version/([\d.]+)', user_agent_lower)
        version = version_match.group(1) if version_match else "Unknown"
        return f"Apple Safari {version}"
    elif "edg" in user_agent_lower or "edge" in user_agent_lower:
        import re
        version_match = re.search(r'edg[ea]?/([\d.]+)', user_agent_lower)
        version = version_match.group(1) if version_match else "Unknown"
        return f"Microsoft Edge {version}"
    elif "opera" in user_agent_lower or "opr" in user_agent_lower:
        import re
        version_match = re.search(r'(?:opera|opr)/([\d.]+)', user_agent_lower)
        version = version_match.group(1) if version_match else "Unknown"
        return f"Opera {version}"
    else:
        return "Navigateur inconnu"

