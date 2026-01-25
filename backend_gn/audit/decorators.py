"""
Décorateurs pour faciliter l'enregistrement d'actions d'audit
"""

from functools import wraps
from .utils import log_action


def audit(action, target_getter=None, details_getter=None):
    """
    Décorateur pour enregistrer automatiquement une action d'audit.
    
    Usage:
        @audit(action='CREATE', target_getter=lambda r, *args, **kwargs: f"Criminel#{kwargs.get('pk')}")
        def create_criminel(request, *args, **kwargs):
            # ... code ...
            return response
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            response = view_func(request, *args, **kwargs)
            try:
                target = target_getter(request, response, *args, **kwargs) if target_getter else None
                details = details_getter(request, response, *args, **kwargs) if details_getter else None
                log_action(request=request, action=action, target=target, details=details)
            except Exception:
                pass
            return response
        return _wrapped_view
    return decorator

