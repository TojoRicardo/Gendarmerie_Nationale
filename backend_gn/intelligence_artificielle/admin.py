from django.contrib import admin
from .models import (
    IAReconnaissanceFaciale,
    IAAnalyseStatistique,
    IAMatchBiometrique,
    IAFaceEmbedding,
    IAPrediction,
    IAPattern,
    IACorrelation,
)
@admin.register(IAFaceEmbedding)
class IAFaceEmbeddingAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'criminel',
        'source_type',
        'actif',
        'cree_le',
    )
    list_filter = ('source_type', 'actif', 'cree_le')
    search_fields = ('criminel__nom', 'criminel__prenom', 'criminel__numero_fiche')
    readonly_fields = ('cree_le', 'mis_a_jour_le')
    ordering = ('-cree_le',)



@admin.register(IAReconnaissanceFaciale)
class IAReconnaissanceFacialeAdmin(admin.ModelAdmin):
    list_display = ('id', 'criminel_identifie', 'score_confiance', 'statut', 'date_analyse', 'analyse_par')
    list_filter = ('statut', 'date_analyse')
    search_fields = ('criminel_identifie__nom', 'criminel_identifie__prenom')
    readonly_fields = ('date_analyse',)
    ordering = ('-date_analyse',)


@admin.register(IAAnalyseStatistique)
class IAAnalyseStatistiqueAdmin(admin.ModelAdmin):
    list_display = ('id', 'titre', 'date_generation', 'genere_par')
    list_filter = ('date_generation',)
    search_fields = ('titre', 'description')
    readonly_fields = ('date_generation',)
    ordering = ('-date_generation',)


@admin.register(IAMatchBiometrique)
class IAMatchBiometriqueAdmin(admin.ModelAdmin):
    list_display = ('id', 'type_match', 'criminel_source', 'criminel_correspondant', 
                    'pourcentage_similarite', 'statut_validation', 'date_detection')
    list_filter = ('type_match', 'statut_validation', 'date_detection')
    search_fields = ('criminel_source__nom', 'criminel_source__prenom',
                     'criminel_correspondant__nom', 'criminel_correspondant__prenom')
    readonly_fields = ('date_detection',)
    ordering = ('-date_detection',)


@admin.register(IAPrediction)
class IAPredictionAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'fiche_criminelle', 'type_prediction', 'score_confiance', 
                    'date_generation', 'genere_par')
    list_filter = ('type_prediction', 'date_generation')
    search_fields = ('fiche_criminelle__numero_fiche', 'fiche_criminelle__nom', 
                     'fiche_criminelle__prenom', 'observations')
    readonly_fields = ('uuid', 'date_generation')
    ordering = ('-date_generation',)


@admin.register(IAPattern)
class IAPatternAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'nom_pattern', 'type_pattern', 'frequence', 
                    'niveau_risque', 'date_detection', 'detecte_par')
    list_filter = ('type_pattern', 'date_detection')
    search_fields = ('nom_pattern', 'description')
    readonly_fields = ('uuid', 'date_detection')
    ordering = ('-date_detection',)


@admin.register(IACorrelation)
class IACorrelationAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'type_correlation', 'degre_correlation', 
                    'pattern_associe', 'date_detection', 'analyse_par')
    list_filter = ('type_correlation', 'date_detection')
    search_fields = ('resume',)
    readonly_fields = ('uuid', 'date_detection')
    filter_horizontal = ('criminels', 'infractions')
    ordering = ('-date_detection',)
