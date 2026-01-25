"""
Configuration admin pour le Journal d'Audit Professionnel
"""

from django.contrib import admin
from .models import AuditLog, JournalAudit  # JournalAudit est un alias


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Interface admin pour le Journal d'Audit Professionnel."""
    
    list_display = [
        'timestamp',
        'user_display',
        'action_display',
        'content_type_display',
        'ip_address',
        'reussi',
    ]
    
    list_filter = [
        'action',
        'content_type',
        'resource_type',  # Gardé pour compatibilité
        'reussi',
        'timestamp',
    ]
    
    search_fields = [
        'description',
        'resource_type',
        'user__username',
        'ip_address',
        'additional_info',
    ]
    
    readonly_fields = [
        'timestamp',
        'description',
        'content_type',
        'object_id',
        'content_object',
    ]
    
    date_hierarchy = 'timestamp'
    
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('user', 'user_role', 'action', 'content_type', 'object_id', 'content_object')
        }),
        ('Compatibilité (ancien système)', {
            'fields': ('resource_type', 'resource_id'),
            'classes': ('collapse',)
        }),
        ('Description', {
            'fields': ('description',)
        }),
        ('Informations HTTP', {
            'fields': ('endpoint', 'method')
        }),
        ('Informations réseau et appareil', {
            'fields': ('ip_address', 'user_agent', 'browser', 'os')
        }),
        ('Modifications avant/après (nouveau format)', {
            'fields': ('changes_before', 'changes_after')
        }),
        ('Données avant/après (ancien format)', {
            'fields': ('data_before', 'data_after'),
            'classes': ('collapse',)
        }),
        ('Informations supplémentaires', {
            'fields': ('additional_info',)
        }),
        ('Statut', {
            'fields': ('reussi', 'message_erreur')
        }),
        ('Date', {
            'fields': ('timestamp',)
        }),
    )
    
    def user_display(self, obj):
        """Retourne le nom d'utilisateur ou 'Système'."""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name or obj.user.username
        return 'Système'
    user_display.short_description = 'Utilisateur'
    
    def content_type_display(self, obj):
        """Retourne le type de contenu ou le resource_type (compatibilité)."""
        if obj.content_type:
            return f"{obj.content_type.app_label}.{obj.content_type.model}"
        return obj.resource_type or '-'
    content_type_display.short_description = 'Type de ressource'
