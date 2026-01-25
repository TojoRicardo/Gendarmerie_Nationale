from rest_framework.permissions import BasePermission


class IsAdminOrAnalyst(BasePermission):
    """
    Autorise uniquement les administrateurs ou analystes.
    """

    allowed_roles = {
        'admin',
        'administrateur',
        'administrateur système',
        'analyste',
        'analyste judiciaire',
    }

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        role = (getattr(user, 'role', '') or '').strip().lower()
        return role in self.allowed_roles

