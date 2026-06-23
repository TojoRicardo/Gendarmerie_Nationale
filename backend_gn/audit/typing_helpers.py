"""Helpers pour l'analyse statique des valeurs runtime des champs Django."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from django.utils import timezone


def as_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return timezone.now()


def as_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def as_optional_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def as_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def related_username(user: Any, default: str = "Système") -> str:
    if user is None:
        return default
    username = getattr(user, "username", None)
    if username:
        return str(username)
    first = str(getattr(user, "first_name", "") or "").strip()
    last = str(getattr(user, "last_name", "") or "").strip()
    full = f"{first} {last}".strip()
    return full or default


def is_user_authenticated(user: Any) -> bool:
    if user is None:
        return False
    is_auth = getattr(user, "is_authenticated", False)
    return bool(is_auth() if callable(is_auth) else is_auth)


def format_time(value: Any, fmt: str, default: str = "N/A") -> str:
    dt = value if isinstance(value, datetime) else None
    return dt.strftime(fmt) if dt else default
