"""
Utilitaires partagés pour le statut utilisateur (actif / inactif / suspendu).
"""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

CONNECTION_ACTIVE_DAYS = 7

SUSPENDED_Q = Q(statut__iexact='suspendu')


def is_suspended(user) -> bool:
    return (getattr(user, 'statut', None) or '').strip().lower() == 'suspendu'


def is_recently_connected(user, date_limite=None, current_user=None) -> bool:
    """Connexion récente = last_login ou derniereConnexion dans la fenêtre."""
    if current_user and getattr(current_user, 'pk', None) == getattr(user, 'pk', None):
        if getattr(current_user, 'is_authenticated', False):
            return True

    if date_limite is None:
        date_limite = timezone.now() - timedelta(days=CONNECTION_ACTIVE_DAYS)

    last_login = getattr(user, 'last_login', None)
    derniere = getattr(user, 'derniereConnexion', None)

    if last_login and last_login >= date_limite:
        return True
    if (not last_login) and derniere and derniere >= date_limite:
        return True
    return False


def compute_statut_effectif(user, current_user=None) -> str:
    """
    Statut affiché dans l'interface :
    - suspendu : décision administrative (champ statut)
    - actif : connexion récente (7 jours)
    - inactif : pas de connexion récente
    """
    if is_suspended(user):
        return 'suspendu'
    if is_recently_connected(user, current_user=current_user):
        return 'actif'
    return 'inactif'


def filter_users_by_statut(queryset, statut, current_user=None):
    """Filtre queryset selon le statut effectif."""
    statut = (statut or '').strip().lower()
    if not statut:
        return queryset

    date_limite = timezone.now() - timedelta(days=CONNECTION_ACTIVE_DAYS)

    if statut == 'suspendu':
        return queryset.filter(SUSPENDED_Q)

    base = queryset.exclude(SUSPENDED_Q)

    if statut == 'actif':
        active_q = (
            Q(last_login__gte=date_limite)
            | Q(Q(last_login__isnull=True) & Q(derniereConnexion__gte=date_limite))
        )
        if current_user and getattr(current_user, 'is_authenticated', False):
            active_q = active_q | Q(pk=current_user.pk)
        return base.filter(active_q).distinct()

    if statut == 'inactif':
        inactive_q = (
            Q(Q(last_login__lt=date_limite) | Q(last_login__isnull=True))
            & Q(Q(derniereConnexion__lt=date_limite) | Q(derniereConnexion__isnull=True))
        )
        qs = base.filter(inactive_q)
        if current_user and getattr(current_user, 'is_authenticated', False):
            qs = qs.exclude(pk=current_user.pk)
        return qs

    return queryset.filter(statut__iexact=statut)


def count_users_by_statut(queryset=None, current_user=None):
    """Compte actifs / inactifs / suspendus avec la même logique que l'UI."""
    from .models import UtilisateurModel

    qs = queryset if queryset is not None else UtilisateurModel.objects.all()
    total = qs.count()
    suspendus = qs.filter(SUSPENDED_Q).count()
    non_suspendus = qs.exclude(SUSPENDED_Q)

    date_limite = timezone.now() - timedelta(days=CONNECTION_ACTIVE_DAYS)
    actifs_q = (
        Q(last_login__gte=date_limite)
        | Q(Q(last_login__isnull=True) & Q(derniereConnexion__gte=date_limite))
    )
    if current_user and getattr(current_user, 'is_authenticated', False):
        actifs_q = actifs_q | Q(pk=current_user.pk)

    actifs = non_suspendus.filter(actifs_q).distinct().count()

    inactifs_q = (
        Q(Q(last_login__lt=date_limite) | Q(last_login__isnull=True))
        & Q(Q(derniereConnexion__lt=date_limite) | Q(derniereConnexion__isnull=True))
    )
    inactifs = non_suspendus.filter(inactifs_q)
    if current_user and getattr(current_user, 'is_authenticated', False):
        inactifs = inactifs.exclude(pk=current_user.pk)
    inactifs = inactifs.count()

    return {
        'total': total,
        'actifs': actifs,
        'inactifs': inactifs,
        'suspendus': suspendus,
    }
