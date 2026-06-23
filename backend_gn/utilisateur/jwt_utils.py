"""
Utilitaires JWT pour la pré-authentification (étape PIN).
"""

from datetime import timedelta

from rest_framework_simplejwt.tokens import AccessToken

from .authentication import PRE_AUTH_TOKEN_TYPE


def create_pre_auth_token(user, lifetime_minutes=5):
    """Crée un token JWT limité, utilisable uniquement pour verify-pin."""
    token = AccessToken.for_user(user)
    token['token_type'] = PRE_AUTH_TOKEN_TYPE
    token.set_exp(lifetime=timedelta(minutes=lifetime_minutes))
    return str(token)
