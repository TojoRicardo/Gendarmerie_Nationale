from django.contrib import admin
from .models import UnidentifiedPerson, Camera, UPRLog


@admin.register(UnidentifiedPerson)
class UnidentifiedPersonAdmin(admin.ModelAdmin):
    list_display = ('code_upr', 'nom_temporaire', 'date_enregistrement', 'has_embedding')
    list_filter = ('date_enregistrement', 'created_at')
    search_fields = ('code_upr', 'nom_temporaire', 'notes')
    readonly_fields = ('code_upr', 'nom_temporaire', 'date_enregistrement', 'created_at', 'updated_at', 'face_embedding')
    
    fieldsets = (
        ('Identification', {
            'fields': ('code_upr', 'nom_temporaire')
        }),
        ('Photo', {
            'fields': ('photo_face',)
        }),
        ('Biométrie', {
            'fields': ('face_embedding',),
            'description': 'Embedding ArcFace extrait automatiquement'
        }),
        ('Informations', {
            'fields': ('notes', 'date_enregistrement')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_embedding(self, obj):
        """Indique si l'UPR a un embedding."""
        return bool(obj.face_embedding)
    has_embedding.boolean = True
    has_embedding.short_description = 'Embedding'


@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ('camera_id', 'name', 'camera_type', 'active', 'last_seen', 'frame_count', 'detection_count')
    list_filter = ('camera_type', 'active', 'created_at')
    search_fields = ('camera_id', 'name', 'source')
    readonly_fields = ('frame_count', 'detection_count', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Identification', {
            'fields': ('camera_id', 'name', 'source', 'camera_type')
        }),
        ('Statut', {
            'fields': ('active', 'last_seen')
        }),
        ('Statistiques', {
            'fields': ('frame_count', 'detection_count')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UPRLog)
class UPRLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'camera', 'user', 'criminal_id', 'match_score', 'created_at')
    list_filter = ('action', 'created_at', 'camera')
    search_fields = ('camera__name', 'user__username', 'criminal_id', 'details')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informations', {
            'fields': ('user', 'camera', 'action')
        }),
        ('Correspondance', {
            'fields': ('criminal_id', 'upr_id', 'match_score')
        }),
        ('Détails', {
            'fields': ('details', 'frame_url')
        }),
        ('Métadonnées', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
