from django.contrib import admin
from .models import Rapport


@admin.register(Rapport)
class RapportAdmin(admin.ModelAdmin):
    
    list_display = [
        'id',
        'titre',
        'type_rapport',
        'statut',
        'cree_par',
        'date_creation',
        'taille_fichier',
    ]
    list_filter = [
        'type_rapport',
        'statut',
        'date_creation',
    ]
    search_fields = [
        'titre',
        'note',
        'cree_par__username',
        'cree_par__email',
    ]
    readonly_fields = [
        'id',
        'date_creation',
        'date_generation',
        'duree_generation',
        'taille_fichier',
        'message_erreur',
    ]
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('id', 'titre', 'type_rapport', 'statut', 'cree_par', 'date_creation', 'date_generation')
        }),
        ('Paramètres et fichier', {
            'fields': ('parametres', 'fichier', 'note')
        }),
        ('Métadonnées', {
            'fields': ('duree_generation', 'taille_fichier', 'message_erreur'),
            'classes': ('collapse',)
        }),
    )
    
    date_hierarchy = 'date_creation'
    
    def has_add_permission(self, request):
        return False
