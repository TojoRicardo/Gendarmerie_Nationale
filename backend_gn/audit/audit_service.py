"""
Service centralisé de journalisation d'audit — point d'entrée unique.

Format standard des logs :
    [date heure] — [Nom utilisateur] — [action] — [module] — [détails]
"""

from __future__ import annotations

import hashlib
import logging
import threading
import time
from datetime import timedelta
from typing import Optional

from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from .models import AuditLog

logger = logging.getLogger(__name__)

# Déduplication en mémoire (fenêtre courte, sans dépendance externe)
_dedupe_lock = threading.Lock()
_recent_keys: dict[str, float] = {}
DEDUPE_WINDOW_SECONDS = 3

ACTION_CODES = {
    'LOGIN': 'LOGIN',
    'LOGOUT': 'LOGOUT',
    'FAILED_LOGIN': 'FAILED_LOGIN',
    'VIEW': 'VIEW',
    'CREATE': 'CREATE',
    'UPDATE': 'UPDATE',
    'DELETE': 'DELETE',
    'DOWNLOAD': 'DOWNLOAD',
    'UPLOAD': 'UPLOAD',
    'SEARCH': 'SEARCH',
    'ROLE_CHANGE': 'ROLE_CHANGE',
    'PERMISSION_CHANGE': 'PERMISSION_CHANGE',
    'ACCESS_DENIED': 'ACCESS_DENIED',
    'ERROR_403': 'ERROR_403',
    'ERROR_404': 'ERROR_404',
    'ERROR_500': 'ERROR_500',
    'NAVIGATION': 'NAVIGATION',
}

ACTION_LABELS = {
    'LOGIN': 'Connexion',
    'LOGOUT': 'Déconnexion',
    'FAILED_LOGIN': 'Échec de connexion',
    'VIEW': 'Consultation',
    'CREATE': 'Création',
    'UPDATE': 'Modification',
    'DELETE': 'Suppression',
    'DOWNLOAD': 'Téléchargement',
    'UPLOAD': 'Ajout',
    'SEARCH': 'Recherche',
    'ROLE_CHANGE': 'Modification de rôle',
    'PERMISSION_CHANGE': 'Modification de permissions',
    'ACCESS_DENIED': 'Accès refusé',
    'ERROR_403': 'Accès refusé (403)',
    'ERROR_404': 'Ressource introuvable (404)',
    'ERROR_500': 'Erreur système (500)',
    'NAVIGATION': 'Navigation',
}

HUMAN_ACTION_TO_CODE = {
    'connexion utilisateur': 'LOGIN',
    'déconnexion utilisateur': 'LOGOUT',
    'reconnaissance biométrique': 'SEARCH',
    'consultation fiche criminelle': 'VIEW',
    'création fiche criminelle': 'CREATE',
    'génération pdf dactyloscopique': 'CREATE',
    'téléchargement pdf dactyloscopique': 'DOWNLOAD',
    'génération et téléchargement pdf dactyloscopique': 'DOWNLOAD',
    'génération de rapport': 'CREATE',
    'téléchargement de rapport': 'DOWNLOAD',
    'recherche avancée': 'SEARCH',
    'analyse prédictive': 'VIEW',
}


def _map_human_action(action: str) -> tuple[str, str]:
    """Retourne (code action, libellé affiché)."""
    if not action:
        return 'VIEW', 'Consultation'
    lower = action.lower().strip()
    if lower in HUMAN_ACTION_TO_CODE:
        return HUMAN_ACTION_TO_CODE[lower], action
    if 'connexion' in lower and 'échec' not in lower and 'echec' not in lower:
        return 'LOGIN', action
    if 'déconnexion' in lower or 'deconnexion' in lower:
        return 'LOGOUT', action
    if 'recherche' in lower:
        return 'SEARCH', action
    if 'téléchargement' in lower or 'telechargement' in lower:
        return 'DOWNLOAD', action
    if any(k in lower for k in ('génération', 'generation', 'création', 'creation', 'ajout')):
        return 'CREATE', action
    if 'modification' in lower or 'mise à jour' in lower:
        return 'UPDATE', action
    if 'suppression' in lower:
        return 'DELETE', action
    if 'consultation' in lower or 'analyse' in lower:
        return 'VIEW', action
    if action.upper() in ACTION_CODES:
        return action.upper(), action
    return 'VIEW', action

MODULE_PREFIX_MAP = [
    ('/api/utilisateur/', 'Authentification'),
    ('/api/auth/', 'Authentification'),
    ('/api/criminel/', 'Fiches criminelles'),
    ('/api/enquete/', 'Enquêtes'),
    ('/api/biometrie/', 'Biométrie'),
    ('/api/reports/', 'Rapports'),
    ('/api/rapports/', 'Rapports statistiques'),
    ('/api/search/', 'Recherche'),
    ('/api/upr/', 'UPR'),
    ('/api/audit/', 'Audit'),
    ('/api/intelligence/', 'Intelligence artificielle'),
]


def get_user_display_name(user) -> str:
    """Nom complet de l'utilisateur pour les logs."""
    if not user:
        return 'Système'
    if isinstance(user, AnonymousUser):
        return 'Anonyme'

    if hasattr(user, 'get_full_name'):
        try:
            full = user.get_full_name()
            if full and full.strip():
                return full.strip()
        except Exception:
            pass

    nom = getattr(user, 'nom', None) or ''
    prenom = getattr(user, 'prenom', None) or ''
    if nom or prenom:
        return f"{prenom} {nom}".strip()

    first = getattr(user, 'first_name', '') or ''
    last = getattr(user, 'last_name', '') or ''
    if first or last:
        return f"{first} {last}".strip()

    return getattr(user, 'username', None) or 'Utilisateur inconnu'


def resolve_module(module: Optional[str] = None, endpoint: Optional[str] = None, resource_type: Optional[str] = None) -> str:
    if module:
        return module
    if endpoint:
        path = endpoint.lower()
        for prefix, mod in MODULE_PREFIX_MAP:
            if path.startswith(prefix):
                return mod
        if 'pdf' in path or 'fiche-criminelle' in path:
            return 'Rapports'
    if resource_type:
        rt = resource_type.lower()
        if 'empreinte' in rt or 'biometr' in rt or 'photo' in rt:
            return 'Biométrie'
        if 'fiche' in rt or 'crimin' in rt:
            return 'Fiches criminelles'
        if 'enquête' in rt or 'enquete' in rt:
            return 'Enquêtes'
        if 'role' in rt or 'utilisateur' in rt:
            return 'Administration'
        if 'rapport' in rt:
            return 'Rapports'
    return 'Système'


def resolve_action_code(action: str) -> str:
    if not action:
        return 'VIEW'
    if action.upper() in ACTION_CODES:
        return action.upper()
    return HUMAN_ACTION_TO_CODE.get(action.lower().strip(), 'VIEW')


def resolve_action_label(action_code: str, action_label: Optional[str] = None) -> str:
    if action_label:
        return action_label
    return ACTION_LABELS.get(action_code, action_code.replace('_', ' ').title())


def format_audit_line(
    timestamp,
    user_name: str,
    action_label: str,
    module: str,
    details: str,
) -> str:
    ts = timestamp.strftime('%d/%m/%Y %H:%M:%S')
    return f"{ts} — {user_name} — {action_label} — {module} — {details}"


def _dedupe_key(user_id, action_code: str, module: str, resource_id, details: str) -> str:
    raw = f"{user_id}|{action_code}|{module}|{resource_id}|{details}"
    return hashlib.md5(raw.encode('utf-8')).hexdigest()


def _is_duplicate(user_id, action_code: str, module: str, resource_id, details: str) -> bool:
    key = _dedupe_key(user_id, action_code, module, resource_id, details)
    now = time.time()

    with _dedupe_lock:
        expired = [k for k, t in _recent_keys.items() if now - t > DEDUPE_WINDOW_SECONDS]
        for k in expired:
            _recent_keys.pop(k, None)

        if key in _recent_keys:
            return True
        _recent_keys[key] = now

    try:
        user_filter = {'user_id': user_id} if user_id else {'user__isnull': True}
        audit_manager = getattr(AuditLog, 'objects')
        recent = audit_manager.filter(
            **user_filter,
            action=action_code,
            timestamp__gte=timezone.now() - timedelta(seconds=DEDUPE_WINDOW_SECONDS),
        ).order_by('-timestamp').first()
        if recent and recent.additional_info:
            meta = _extract_audit_meta(recent)
            if meta.get('module') == module and meta.get('details') == details:
                return True
    except Exception as exc:
        logger.debug("Vérification déduplication audit ignorée: %s", exc)

    return False


def _extract_audit_meta(log_entry: AuditLog) -> dict:
    for data in (log_entry.after, log_entry.data_after, log_entry.before, log_entry.data_before):
        if isinstance(data, dict) and '_audit' in data:
            return data['_audit']
    return {}


def _build_audit_payload(
    module: str,
    details: str,
    standard_line: str,
    extra: Optional[dict] = None,
) -> dict:
    payload = {
        '_audit': {
            'module': module,
            'details': details,
            'standard_line': standard_line,
        }
    }
    if extra:
        payload.update(extra)
    return payload


def record_audit(
    *,
    request=None,
    user=None,
    action: str = 'VIEW',
    module: Optional[str] = None,
    action_label: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id=None,
    details: Optional[str] = None,
    narration: Optional[str] = None,
    data_before=None,
    data_after=None,
    reussi: bool = True,
    message_erreur: Optional[str] = None,
    allow_anonymous: bool = False,
    skip_dedupe: bool = False,
    obj=None,
) -> Optional[AuditLog]:
    """
    Enregistre une action dans AuditLog avec le format standard.
    Ne lève jamais d'exception — les erreurs sont journalisées uniquement.
    """
    try:
        from .utils import log_action_detailed
        from .middleware import get_current_user, get_current_request

        if request is None:
            request = get_current_request()
        if user is None and request is not None:
            user = getattr(request, 'user', None)
        if user is None:
            user = get_current_user()

        if user and isinstance(user, AnonymousUser):
            user = None

        action_code = resolve_action_code(action)
        if not allow_anonymous and user is None and action_code not in ('FAILED_LOGIN',):
            logger.debug("Audit ignoré: utilisateur non authentifié (action=%s)", action_code)
            return None

        endpoint = request.path if request else None
        module_name = resolve_module(module, endpoint, resource_type)
        label = resolve_action_label(action_code, action_label)

        if not details:
            parts = []
            if resource_type:
                part = resource_type
                if resource_id is not None:
                    part += f" #{resource_id}"
                parts.append(part)
            if narration:
                parts.append(narration[:300])
            details = ' | '.join(parts) if parts else '—'

        user_name = get_user_display_name(user) if user else 'Anonyme'
        if action_code == 'FAILED_LOGIN' and resource_id:
            user_name = str(resource_id)

        ts = timezone.now()
        standard_line = format_audit_line(ts, user_name, label, module_name, details)

        user_id = user.pk if user else None
        if not skip_dedupe and _is_duplicate(user_id, action_code, module_name, resource_id, details):
            logger.debug("Audit dédupliqué: %s", standard_line[:120])
            return None

        audit_after = data_after if isinstance(data_after, dict) else {}
        audit_after = _build_audit_payload(module_name, details, standard_line, audit_after)

        if obj is not None:
            if not resource_type:
                resource_type = obj.__class__.__name__
            if resource_id is None:
                resource_id = obj.pk

        entry = log_action_detailed(
            request=request,
            user=user,
            action=action_code,
            resource_type=resource_type,
            resource_id=resource_id,
            data_before=data_before,
            data_after=audit_after,
            reussi=reussi,
            message_erreur=message_erreur,
            additional_info=standard_line,
            allow_anonymous=allow_anonymous,
        )
        return entry
    except Exception as exc:
        logger.exception("Échec enregistrement audit (non bloquant): %s", exc)
        return None


def record_auth(
    request,
    user,
    event: str,
    details: Optional[str] = None,
    reussi: bool = True,
    username_attempt: Optional[str] = None,
) -> Optional[AuditLog]:
    """Connexion, déconnexion ou échec de connexion."""
    event = event.upper()
    if event == 'LOGIN':
        code, label = 'LOGIN', 'Connexion'
        detail = details or f"Authentification JWT réussie — compte {getattr(user, 'username', 'N/A')}"
    elif event == 'LOGOUT':
        code, label = 'LOGOUT', 'Déconnexion'
        detail = details or f"Déconnexion volontaire — compte {getattr(user, 'username', 'N/A')}"
    elif event == 'FAILED_LOGIN':
        code, label = 'FAILED_LOGIN', 'Échec de connexion'
        detail = details or f"Tentative avec identifiant « {username_attempt or 'inconnu'} »"
        return record_audit(
            request=request,
            user=None,
            action=code,
            action_label=label,
            module='Authentification',
            resource_type='Système',
            resource_id=username_attempt or 'inconnu',
            details=detail,
            reussi=False,
            allow_anonymous=True,
            skip_dedupe=True,
        )
    else:
        code, label = event, event
        detail = details or f"Événement authentification : {event}"

    if request is not None and user is not None:
        request.user = user

    return record_audit(
        request=request,
        user=user,
        action=code,
        action_label=label,
        module='Authentification',
        resource_type='Système',
        details=detail,
        reussi=reussi,
        skip_dedupe=True,
    )


def record_pdf_dactyloscopique(
    request,
    criminel,
    *,
    filename: Optional[str] = None,
    enquete_id: Optional[int] = None,
    delivery: str = 'pdf',
) -> Optional[AuditLog]:
    """
    Trace la génération et le téléchargement d'une fiche dactyloscopique (PDF ou ZIP).
    """
    nom = getattr(criminel, 'nom', '') or ''
    prenom = getattr(criminel, 'prenom', '') or ''
    suspect = f"{nom} {prenom}".strip() or 'Non renseigné'
    dossier_id = getattr(criminel, 'id', None)
    numero = getattr(criminel, 'numero_fiche', None)

    doc_type = 'Fiche dactyloscopique'
    if not filename:
        numero_str = str(numero) if numero else f"ID{dossier_id}"
        filename = f"Fiche_dactyloscopique_{numero_str}_{nom}_{prenom}.pdf"

    delivery_label = 'archive ZIP (enquête complète)' if delivery == 'zip' else 'PDF'
    details = (
        f"Type: {doc_type} | Fichier: {filename} | "
        f"Dossier #{dossier_id} | Suspect: {suspect}"
    )
    if numero:
        details += f" | N° fiche: {numero}"
    if enquete_id:
        details += f" | Enquête #{enquete_id}"

    if request is not None:
        request._audit_pdf_logged = True

    return record_audit(
        request=request,
        action='DOWNLOAD',
        action_label='Génération et téléchargement PDF dactyloscopique',
        module='Rapports',
        resource_type='Fiche dactyloscopique',
        resource_id=dossier_id,
        details=details,
        obj=criminel,
        skip_dedupe=True,
        data_after={
            'document_type': doc_type,
            'filename': filename,
            'dossier_id': dossier_id,
            'suspect': suspect,
            'delivery': delivery_label,
            'operation': 'generated_and_downloaded',
        },
    )


def record_role_change(
    request,
    user,
    role_name: str,
    description: str,
    *,
    is_permission_change: bool = False,
) -> Optional[AuditLog]:
    action_code = 'PERMISSION_CHANGE' if is_permission_change else 'ROLE_CHANGE'
    label = ACTION_LABELS[action_code]
    return record_audit(
        request=request,
        user=user,
        action=action_code,
        action_label=label,
        module='Administration',
        resource_type='Rôle',
        resource_id=role_name,
        details=description,
        skip_dedupe=True,
    )


def audit_log(request, module, action, ressource, narration):
    """
    Compatibilité ascendante — redirige vers AuditLog (plus JournalAudit).
    """
    action_code, label = _map_human_action(action)
    details = f"{ressource} — {narration[:400]}" if narration else str(ressource)
    return record_audit(
        request=request,
        action=action_code,
        action_label=label,
        module=module,
        resource_type=ressource,
        details=details,
        narration=narration,
    )
