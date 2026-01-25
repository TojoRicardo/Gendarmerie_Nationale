from django.contrib import admin
from .models import UtilisateurModel, UserProfile, PinAuditLog, Role, PermissionSGIC


@admin.register(UtilisateurModel)
class UtilisateurAdmin(admin.ModelAdmin):
    """Administration des utilisateurs"""
    list_display = [
        'email',
        'username',
        'nom',
        'prenom',
        'role',
        'statut',
        'is_active',
        'date_joined'
    ]
    list_filter = [
        'role',
        'statut',
        'is_active',
        'is_staff',
        'date_joined'
    ]
    search_fields = [
        'email',
        'username',
        'nom',
        'prenom',
        'matricule'
    ]
    readonly_fields = [
        'date_joined',
        'last_login',
        'dateCreation',
        'derniereConnexion'
    ]
    fieldsets = (
        ('Informations de connexion', {
            'fields': ('email', 'username', 'password')
        }),
        ('Informations personnelles', {
            'fields': ('nom', 'prenom', 'grade', 'matricule', 'telephone', 'dateNaissance', 'adresse')
        }),
        ('Rôle et statut', {
            'fields': ('role', 'statut', 'is_active', 'is_staff', 'is_superuser')
        }),
        ('Dates importantes', {
            'fields': ('dateCreation', 'date_joined', 'derniereConnexion', 'last_login')
        }),
    )
    ordering = ['-date_joined']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Administration des profils utilisateur avec PIN"""
    list_display = ('user', 'has_pin', 'pin_attempts', 'is_blocked', 'pin_blocked_until', 'created_at')
    readonly_fields = ('pin_hash', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    list_filter = ('pin_blocked_until', 'created_at')
    
    def has_pin(self, obj):
        return bool(obj.pin_hash)
    has_pin.boolean = True
    has_pin.short_description = 'PIN défini'
    
    def is_blocked(self, obj):
        return obj.is_pin_blocked()
    is_blocked.boolean = True
    is_blocked.short_description = 'Bloqué'


@admin.register(PinAuditLog)
class PinAuditLogAdmin(admin.ModelAdmin):
    """Administration des logs d'audit PIN"""
    list_display = ('user', 'success', 'timestamp', 'ip_address', 'user_agent_short')
    list_filter = ('success', 'timestamp')
    search_fields = ('user__username', 'user__email', 'ip_address')
    readonly_fields = ('user', 'success', 'timestamp', 'ip_address', 'user_agent')
    ordering = ['-timestamp']
    
    def user_agent_short(self, obj):
        if obj.user_agent:
            return obj.user_agent[:50] + '...' if len(obj.user_agent) > 50 else obj.user_agent
        return '-'
    user_agent_short.short_description = 'User Agent'


@admin.register(PermissionSGIC)
class PermissionSGICAdmin(admin.ModelAdmin):
    """Administration des permissions SGIC"""
    list_display = ('code', 'label', 'category', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('code', 'label', 'category')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ['category', 'code']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Administration des rôles"""
    list_display = ('name', 'is_active', 'permissions_count', 'users_count', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ('permissions',)
    fieldsets = (
        ('Informations du rôle', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Permissions', {
            'fields': ('permissions',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def permissions_count(self, obj):
        return obj.permissions.count()
    permissions_count.short_description = 'Nombre de permissions'
    
    def users_count(self, obj):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(role=obj.name).count()
    users_count.short_description = 'Nombre d\'utilisateurs'
