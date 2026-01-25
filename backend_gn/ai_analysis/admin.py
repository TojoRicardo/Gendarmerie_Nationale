from django.contrib import admin
from .models import (
    Cas,
    EvolutionMensuelle,
    EvolutionDetaillee,
    RepartitionGeographique,
    ActiviteTempsReel
)


@admin.register(Cas)
class CasAdmin(admin.ModelAdmin):
    list_display = ['id', 'categorie', 'date', 'lieu', 'statut']
    list_filter = ['categorie', 'statut', 'date']
    search_fields = ['categorie', 'lieu', 'description']
    date_hierarchy = 'date'


@admin.register(EvolutionMensuelle)
class EvolutionMensuelleAdmin(admin.ModelAdmin):
    list_display = ['id', 'mois', 'total_cas', 'moyenne_cas']
    list_filter = ['mois']
    search_fields = ['mois']
    date_hierarchy = 'mois'


@admin.register(EvolutionDetaillee)
class EvolutionDetailleeAdmin(admin.ModelAdmin):
    list_display = ['id', 'categorie', 'mois', 'total_cas', 'moyenne_cas']
    list_filter = ['categorie', 'mois']
    search_fields = ['categorie']
    date_hierarchy = 'mois'


@admin.register(RepartitionGeographique)
class RepartitionGeographiqueAdmin(admin.ModelAdmin):
    list_display = ['id', 'lieu', 'total_cas', 'latitude', 'longitude']
    list_filter = ['total_cas']
    search_fields = ['lieu']


@admin.register(ActiviteTempsReel)
class ActiviteTempsReelAdmin(admin.ModelAdmin):
    list_display = ['id', 'categorie', 'lieu', 'timestamp', 'valeur', 'anomalie']
    list_filter = ['categorie', 'anomalie', 'timestamp']
    search_fields = ['categorie', 'lieu']
    date_hierarchy = 'timestamp'
    readonly_fields = ['timestamp']

