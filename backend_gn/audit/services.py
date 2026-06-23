"""
Service centralisé de journalisation d'audit.
UNIQUE POINT D'ENTRÉE pour toutes les actions d'audit dans le système SGIC.
"""

from .audit_service import audit_log

__all__ = ['audit_log']
