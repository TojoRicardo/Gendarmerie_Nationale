"""
Utilitaires pour fusionner les logs d'audit dupliqués en sessions unifiées
"""

from django.utils import timezone
from datetime import timedelta
from typing import List, Dict, Any
from .models import AuditLog
import logging

logger = logging.getLogger(__name__)


def detect_duplicate_logs(log1: AuditLog, log2: AuditLog, time_threshold_seconds: int = 5) -> bool:
    """
    Détecte si deux logs sont des doublons.
    
    Critères de doublon :
    - Même utilisateur
    - Même action
    - Même ressource (type + ID)
    - Même endpoint
    - Timestamp très proche (dans le seuil défini)
    
    Args:
        log1: Premier log
        log2: Deuxième log
        time_threshold_seconds: Seuil de temps en secondes (défaut: 5)
    
    Returns:
        True si les logs sont des doublons
    """
    # Vérifier l'utilisateur
    if log1.user_id != log2.user_id:
        return False
    
    # Vérifier l'action
    if log1.action != log2.action:
        return False
    
    resource1 = (log1.resource_type or '', str(log1.resource_id or ''))
    resource2 = (log2.resource_type or '', str(log2.resource_id or ''))
    if resource1 != resource2:
        # Vérifier aussi avec content_type
        if log1.content_type_id != log2.content_type_id or log1.object_id != log2.object_id:
            return False
    
    # Vérifier l'endpoint
    if log1.endpoint != log2.endpoint:
        return False
    
    # Vérifier la proximité temporelle
    time_diff = abs((log1.timestamp - log2.timestamp).total_seconds())
    if time_diff > time_threshold_seconds:
        return False
    
    return True


def merge_audit_logs(logs: List[AuditLog]) -> Dict[str, Any]:
    """
    Fusionne plusieurs logs d'audit en un seul log unifié.
    
    Args:
        logs: Liste des logs à fusionner
    
    Returns:
        Dictionnaire représentant le log fusionné
    """
    if not logs:
        return {}
    
    # Prendre le premier log comme base
    base_log = logs[0]
    
    # Fusionner les données before/after
    merged_before = {}
    merged_after = {}
    
    for log in logs:
        # Récupérer before/after de chaque log
        before_data = log.before or log.changes_before or log.data_before or {}
        after_data = log.after or log.changes_after or log.data_after or {}
        
        if isinstance(before_data, dict):
            merged_before.update(before_data)
        if isinstance(after_data, dict):
            merged_after.update(after_data)
    
    timestamps = [log.timestamp for log in logs if log.timestamp]
    latest_timestamp = max(timestamps) if timestamps else base_log.timestamp
    
    # Compter les occurrences
    occurrence_count = len(logs)
    
    # Construire le log fusionné
    merged_log = {
        'id': base_log.id,  # ID du premier log
        'ids': [log.id for log in logs],  # Tous les IDs fusionnés
        'user': base_log.user_id,
        'user_info': {
            'id': base_log.user.id if base_log.user else None,
            'username': base_log.user.username if base_log.user else None,
            'email': base_log.user.email if base_log.user and hasattr(base_log.user, 'email') else None,
            'full_name': f"{base_log.user.first_name} {base_log.user.last_name}".strip() if base_log.user else None,
        } if base_log.user else None,
        'user_role': base_log.user_role,
        'action': base_log.action,
        'action_display': base_log.get_action_display(),
        'resource_type': base_log.resource_type,
        'resource_id': base_log.resource_id,
        'content_type': base_log.content_type.model if base_log.content_type else None,
        'object_id': base_log.object_id,
        'endpoint': base_log.endpoint,
        'method': base_log.method,
        'ip_address': str(base_log.ip_address) if base_log.ip_address else None,
        'browser': base_log.browser,
        'os': base_log.os,
        'before': merged_before,
        'after': merged_after,
        'description': base_log.description,
        'timestamp': latest_timestamp.isoformat() if latest_timestamp else None,
        'reussi': all(log.reussi for log in logs),
        'message_erreur': base_log.message_erreur if base_log.message_erreur else None,
        'occurrence_count': occurrence_count,  # Nombre de logs fusionnés
        'is_merged': True,  # Flag pour indiquer que c'est un log fusionné
    }
    
    return merged_log


def group_logs_by_session(logs: List[AuditLog], session_timeout_minutes: int = 30) -> List[Dict[str, Any]]:
    """
    Groupe les logs par session utilisateur et fusionne les doublons.
    
    Une session est définie par :
    - Même utilisateur
    - Même IP
    - Actions consécutives avec moins de X minutes entre elles
    
    Args:
        logs: Liste des logs à grouper
        session_timeout_minutes: Timeout de session en minutes (défaut: 30)
    
    Returns:
        Liste des logs groupés et fusionnés
    """
    if not logs:
        return []
    
    # Trier par timestamp
    sorted_logs = sorted(logs, key=lambda x: x.timestamp if x.timestamp else timezone.now())
    
    # Grouper par session
    sessions = []
    current_session = []
    last_timestamp = None
    
    for log in sorted_logs:
        if not last_timestamp:
            # Premier log
            current_session = [log]
            last_timestamp = log.timestamp
        else:
            # Vérifier si on est dans la même session
            time_diff = (log.timestamp - last_timestamp).total_seconds() / 60 if log.timestamp and last_timestamp else 0
            same_user = log.user_id == current_session[0].user_id if current_session else False
            same_ip = str(log.ip_address) == str(current_session[0].ip_address) if current_session and log.ip_address and current_session[0].ip_address else False
            
            if same_user and same_ip and time_diff <= session_timeout_minutes:
                # Même session
                current_session.append(log)
            else:
                # Nouvelle session
                if current_session:
                    sessions.append(current_session)
                current_session = [log]
            
            last_timestamp = log.timestamp
    
    # Ajouter la dernière session
    if current_session:
        sessions.append(current_session)
    
    # Fusionner les doublons dans chaque session
    merged_sessions = []
    for session_logs in sessions:
        # Grouper les doublons
        grouped = []
        processed = set()
        
        for i, log in enumerate(session_logs):
            if i in processed:
                continue
            
            # Trouver tous les doublons de ce log
            duplicates = [log]
            for j, other_log in enumerate(session_logs[i+1:], start=i+1):
                if j not in processed and detect_duplicate_logs(log, other_log):
                    duplicates.append(other_log)
                    processed.add(j)
            
            processed.add(i)
            grouped.append(duplicates)
        
        # Fusionner chaque groupe
        for group in grouped:
            if len(group) == 1:
                # Pas de doublon, garder tel quel
                merged_sessions.append(group[0])
            else:
                # Fusionner les doublons
                merged = merge_audit_logs(group)
                merged_sessions.append(merged)
    
    return merged_sessions


def group_audit_logs_into_sessions(logs: List[AuditLog], session_timeout_minutes: int = 30) -> Dict[str, List[AuditLog]]:
    """
    Groupe les logs d'audit en sessions logiques.
    Une nouvelle session est créée si l'utilisateur change, l'IP change,
    ou si le temps entre deux actions dépasse session_timeout_minutes.
    
    Args:
        logs: Liste des logs à grouper
        session_timeout_minutes: Timeout de session en minutes (défaut: 30)
        
    Returns:
        Dictionnaire {session_id: [liste des logs]}
    """
    from collections import defaultdict
    from datetime import timedelta
    
    if not logs:
        return {}
    
    # Trier par timestamp
    sorted_logs = sorted(logs, key=lambda x: x.timestamp if x.timestamp else timezone.now())
    
    sessions = defaultdict(list)
    current_session_id = None
    last_log_time = None
    last_user_id = None
    last_ip_address = None
    
    for log in sorted_logs:
        log_time = log.timestamp
        user_id = log.user_id
        ip_address = log.ip_address
        
        # Déterminer si une nouvelle session doit commencer
        new_session = False
        if current_session_id is None:
            new_session = True
        elif user_id != last_user_id:
            new_session = True
        elif ip_address != last_ip_address:
            new_session = True
        elif last_log_time and log_time and (log_time - last_log_time) > timedelta(minutes=session_timeout_minutes):
            new_session = True
        
        if new_session:
            timestamp_str = log_time.strftime('%Y%m%d%H%M%S') if log_time else 'unknown'
            current_session_id = f"session_{user_id or 'system'}_{timestamp_str}"
            logger.debug(f"Nouvelle session démarrée: {current_session_id} pour utilisateur {user_id} à {log_time}")
        
        sessions[current_session_id].append(log)
        last_log_time = log_time
        last_user_id = user_id
        last_ip_address = ip_address
    
    # Convertir les defaultdict en dict standard
    return dict(sessions)


def get_merged_audit_logs(queryset, merge_duplicates: bool = True, session_timeout_minutes: int = 30) -> List[Dict[str, Any]]:
    """
    Récupère les logs d'audit avec fusion des doublons optionnelle.
    
    Args:
        queryset: QuerySet des logs d'audit
        merge_duplicates: Si True, fusionne les doublons
        session_timeout_minutes: Timeout de session pour le regroupement
    
    Returns:
        Liste des logs (fusionnés ou non)
    """
    logs = list(queryset)
    
    if not merge_duplicates:
        return logs
    
    # Grouper par session et fusionner
    merged = group_logs_by_session(logs, session_timeout_minutes)
    
    # Convertir les objets AuditLog en dictionnaires si nécessaire
    result = []
    for item in merged:
        if isinstance(item, AuditLog):
            # Log non fusionné, convertir en dict
            result.append(item.to_json() if hasattr(item, 'to_json') else {})
        elif isinstance(item, dict):
            # Log fusionné
            result.append(item)
    
    return result

