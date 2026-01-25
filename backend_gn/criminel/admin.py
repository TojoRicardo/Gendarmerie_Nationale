from django.contrib import admin
from .models import (
    RefStatutFiche,
    RefTypeInfraction,
    RefStatutAffaire,
    CriminalFicheCriminelle,
    CriminalTypeInfraction,
    CriminalInfraction,
    InvestigationAssignment,
)


# ADMIN MODÈLES DE RÉFÉRENCE

@admin.register(RefStatutFiche)
class RefStatutFicheAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'actif', 'ordre']
    list_filter = ['actif']
    search_fields = ['code', 'libelle']
    ordering = ['ordre', 'libelle']


@admin.register(RefTypeInfraction)
class RefTypeInfractionAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'categorie', 'actif', 'ordre']
    list_filter = ['actif', 'categorie']
    search_fields = ['code', 'libelle', 'categorie']
    ordering = ['ordre', 'libelle']


@admin.register(RefStatutAffaire)
class RefStatutAffaireAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'couleur', 'actif', 'ordre']
    list_filter = ['actif']
    search_fields = ['code', 'libelle']
    ordering = ['ordre', 'libelle']


#ADMIN MODÈLES CRIMINELS

class CriminalInfractionInline(admin.TabularInline):
    model = CriminalInfraction
    extra = 1
    fields = ['type_infraction', 'date_infraction', 'lieu', 'statut_affaire']


@admin.register(CriminalFicheCriminelle)
class CriminalFicheCriminelleAdmin(admin.ModelAdmin):
    list_display = ['numero_fiche', 'nom', 'prenom', 'surnom', 'sexe', 'date_naissance', 'nationalite', 'statut_fiche', 'is_archived', 'date_creation']
    list_filter = ['sexe', 'statut_fiche', 'nationalite', 'corpulence', 'is_archived', 'date_creation']
    search_fields = ['numero_fiche', 'nom', 'prenom', 'surnom', 'cin', 'adresse']
    readonly_fields = ['numero_fiche', 'date_creation', 'date_modification']
    inlines = [CriminalInfractionInline]
    date_hierarchy = 'date_creation'
    
    fieldsets = (
        ('Identification', {
            'fields': ('numero_fiche', 'nom', 'prenom', 'surnom', 'sexe', 'photo')
        }),
        ('Naissance et Nationalité', {
            'fields': ('date_naissance', 'lieu_naissance', 'nationalite', 'cin')
        }),
        ('Description Physique', {
            'fields': ('corpulence', 'cheveux', 'visage', 'barbe', 'marques_particulieres'),
            'classes': ['collapse']
        }),
        ('Filiation', {
            'fields': ('nom_pere', 'nom_mere'),
            'classes': ['collapse']
        }),
        ('Coordonnées', {
            'fields': ('adresse', 'contact')
        }),
        ('Informations Professionnelles', {
            'fields': ('profession', 'service_militaire'),
            'classes': ['collapse']
        }),
        ('Informations Judiciaires', {
            'fields': (
                'motif_arrestation', 'date_arrestation', 'lieu_arrestation',
                'unite_saisie', 'reference_pv', 'suite_judiciaire',
                'peine_encourue', 'antecedent_judiciaire'
            )
        }),
        ('Statut et Métadonnées', {
            'fields': ('statut_fiche', 'is_archived', 'date_creation', 'date_modification'),
            'classes': ['collapse']
        }),
    )


@admin.register(CriminalTypeInfraction)
class CriminalTypeInfractionAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'type_infraction', 'gravite', 'actif', 'couleur']
    list_filter = ['actif', 'gravite', 'type_infraction']
    search_fields = ['code', 'libelle', 'article_loi']
    readonly_fields = ['date_creation', 'date_modification']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('code', 'libelle', 'type_infraction', 'gravite')
        }),
        ('Description', {
            'fields': ('description',)
        }),
        ('Peines', {
            'fields': ('peine_minimale', 'peine_maximale', 'article_loi')
        }),
        ('Affichage', {
            'fields': ('actif', 'couleur')
        }),
        ('Dates', {
            'fields': ('date_creation', 'date_modification'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CriminalInfraction)
class CriminalInfractionAdmin(admin.ModelAdmin):
    list_display = ['fiche', 'type_infraction', 'date_infraction', 'lieu', 'statut_affaire', 'date_enregistrement']
    list_filter = ['statut_affaire', 'date_infraction', 'date_enregistrement']
    search_fields = ['fiche__nom', 'fiche__prenom', 'lieu', 'description']
    readonly_fields = ['date_enregistrement', 'date_modification']
    autocomplete_fields = ['fiche']
    
    fieldsets = (
        ('Fiche criminelle', {
            'fields': ('fiche',)
        }),
        ('Infraction', {
            'fields': ('type_infraction', 'date_infraction', 'lieu', 'description')
        }),
        ('Statut', {
            'fields': ('statut_affaire',)
        }),
        ('Dates', {
            'fields': ('date_enregistrement', 'date_modification'),
            'classes': ('collapse',)
        }),
    )


@admin.register(InvestigationAssignment)
class InvestigationAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        'fiche',
        'assigned_investigator',
        'assigned_by',
        'status',
        'assignment_date',
        'due_date',
        'priority',
    ]
    list_filter = ['status', 'priority', 'assignment_date', 'due_date']
    search_fields = [
        'fiche__numero_fiche',
        'fiche__nom',
        'fiche__prenom',
        'assigned_investigator__username',
        'assigned_investigator__email',
    ]
    autocomplete_fields = ['fiche', 'assigned_investigator', 'assigned_by']
    readonly_fields = ['assignment_date', 'created_at', 'updated_at']
