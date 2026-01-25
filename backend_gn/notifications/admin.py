from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Administration des notifications"""
    
    list_display = [
        'id',
        'utilisateur',
        'titre',
        'type',
        'lue',
        'date_creation',
        'date_lecture'
    ]
    
    list_filter = [
        'type',
        'lue',
        'date_creation'
    ]
    
    search_fields = [
        'titre',
        'message',
        'utilisateur__username',
        'utilisateur__email'
    ]
    
    readonly_fields = [
        'date_creation',
        'date_lecture'
    ]
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('utilisateur', 'titre', 'message', 'type')
        }),
        ('État', {
            'fields': ('lue', 'lien')
        }),
        ('Dates', {
            'fields': ('date_creation', 'date_lecture'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimiser les requêtes"""
        return super().get_queryset(request).select_related('utilisateur')
