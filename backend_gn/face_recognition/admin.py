"""
Configuration de l'administration Django pour la reconnaissance faciale.
"""

from django.contrib import admin
from .models import Person, FaceEmbedding, FaceRecognitionLog


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    """Administration pour le modèle Person"""
    list_display = ['id', 'name', 'faces_count', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('id', 'name')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(FaceEmbedding)
class FaceEmbeddingAdmin(admin.ModelAdmin):
    """Administration pour le modèle FaceEmbedding"""
    list_display = ['id', 'person', 'confidence_score', 'image_path', 'created_at']
    list_filter = ['created_at', 'confidence_score']
    search_fields = ['person__name', 'image_path']
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['person']
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('id', 'person', 'image_path', 'confidence_score')
        }),
        ('Données techniques', {
            'fields': ('embedding', 'image_width', 'image_height')
        }),
        ('Métadonnées', {
            'fields': ('created_at',)
        }),
    )


@admin.register(FaceRecognitionLog)
class FaceRecognitionLogAdmin(admin.ModelAdmin):
    """Administration pour le modèle FaceRecognitionLog"""
    list_display = ['id', 'detected_person', 'status', 'confidence_score', 'timestamp', 'created_by']
    list_filter = ['status', 'timestamp', 'threshold_used']
    search_fields = ['detected_person__name', 'image_path']
    readonly_fields = ['id', 'timestamp']
    raw_id_fields = ['detected_person', 'created_by']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('id', 'detected_person', 'status', 'confidence_score', 'threshold_used')
        }),
        ('Données techniques', {
            'fields': ('embedding_vector', 'image_path', 'processing_time_ms')
        }),
        ('Métadonnées', {
            'fields': ('timestamp', 'created_by')
        }),
    )
