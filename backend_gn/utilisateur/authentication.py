"""
Authentification JWT personnalisée pour SGIC.
Rejette les tokens de pré-authentification (avant vérification PIN).
"""

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

PRE_AUTH_TOKEN_TYPE = 'pre_auth'


class SGICJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        validated_token = super().get_validated_token(raw_token)
        if validated_token.get('token_type') == PRE_AUTH_TOKEN_TYPE:
            raise AuthenticationFailed(
                'Token de pré-authentification invalide. Veuillez vérifier votre PIN.'
            )
        return validated_token
