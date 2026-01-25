from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UtilisateurViewSet,
    LoginView,
    CurrentUserView,
    LogoutView,
    PermissionsView,
    ChangePasswordView,
    CheckRoleChangesView,
    ConnectionDetectionView,
    SetPinView,
    PinStatusView,
    VerifyPinView,
    RoleUpdateView,
    RoleViewSet,
    PermissionViewSet,
    DashboardUserStatsView,
)

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')
router.register(r'permissions', PermissionViewSet, basename='permission')

# Enregistrer les rôles avec lookup_field personnalisé pour supporter ID et nom
router.register(r'roles', RoleViewSet, basename='role')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('disconnect/', LogoutView.as_view(), name='disconnect'),  # Alias pour logout (compatibilité frontend)
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('permissions/', PermissionsView.as_view(), name='permissions'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('check-role-changes/', CheckRoleChangesView.as_view(), name='check-role-changes'),
    path('detect-connection/', ConnectionDetectionView.as_view(), name='detect-connection'),
    # Dashboard endpoints
    path('dashboard/stats/', DashboardUserStatsView.as_view(), name='dashboard-user-stats'),
    # PIN endpoints
    path('set-pin/', SetPinView.as_view(), name='set-pin'),
    path('pin-status/', PinStatusView.as_view(), name='pin-status'),
    path('verify-pin/', VerifyPinView.as_view(), name='verify-pin'),
    # Role endpoints
    path('roles/<str:role_id>/', RoleUpdateView.as_view(), name='role-update'),
]
