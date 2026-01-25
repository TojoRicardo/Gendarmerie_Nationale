# pylint: disable=import-error
from django.contrib import admin
from django.utils.html import format_html
from .models import Biometrie, BiometriePhoto, BiometrieEmpreinte, BiometriePaume, BiometrieScanResultat, BiometrieHistorique


@admin.register(Biometrie)
class BiometrieAdmin(admin.ModelAdmin):
    list_display = ['id', 'criminel', 'date_enregistrement']
    list_filter = ['date_enregistrement']
    search_fields = ['criminel__nom', 'criminel__prenom', 'criminel__numero_fiche']
    readonly_fields = ['date_enregistrement']


@admin.register(BiometriePhoto)
class BiometriePhotoAdmin(admin.ModelAdmin):
    list_display = [
        'id', 
        'get_criminel_info', 
        'type_photo', 
        'qualite', 
        'est_principale',
        'est_active',
        'preview_image',
        'date_capture', 
        'capture_par'
    ]
    list_filter = [
        'type_photo', 
        'est_principale', 
        'est_active', 
        'date_capture'
    ]
    search_fields = [
        'criminel__nom', 
        'criminel__prenom', 
        'criminel__numero_fiche',
        'notes'
    ]
    readonly_fields = [
        'date_capture', 
        'taille_fichier', 
        'preview_image_large',
        'get_file_info'
    ]
    list_per_page = 25
    date_hierarchy = 'date_capture'
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('criminel', 'type_photo', 'image', 'preview_image_large')
        }),
        ('Qualité et analyse', {
            'fields': ('qualite', 'encodage_facial', 'est_principale', 'est_active')
        }),
        ('Informations du fichier', {
            'fields': ('taille_fichier', 'get_file_info'),
            'classes': ('collapse',)
        }),
        ('Notes et observations', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_capture', 'capture_par'),
            'classes': ('collapse',)
        }),
    )
    
    def get_criminel_info(self, obj):
        """Affiche les informations du criminel"""
        if obj.criminel:
            return format_html(
                '<strong>{}</strong><br><small>{}</small>',
                f"{obj.criminel.nom} {obj.criminel.prenom}",
                obj.criminel.numero_fiche
            )
        return '-'
    get_criminel_info.short_description = 'Criminel'
    
    def preview_image(self, obj):
        """Aperçu miniature de l'image dans la liste"""
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />',
                obj.image.url
            )
        return '-'
    preview_image.short_description = 'Aperçu'
    
    def preview_image_large(self, obj):
        """Aperçu grande taille de l'image dans le formulaire"""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 400px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />',
                obj.image.url
            )
        return '-'
    preview_image_large.short_description = 'Aperçu de l\'image'
    
    def get_file_info(self, obj):
        """Informations sur le fichier"""
        if obj.image:
            extension = obj.get_file_extension()
            size_kb = obj.taille_fichier / 1024 if obj.taille_fichier else 0
            return format_html(
                '<strong>Extension:</strong> {}<br>'
                '<strong>Taille:</strong> {:.2f} KB<br>'
                '<strong>Chemin:</strong> {}',
                extension or '-',
                size_kb,
                obj.image.name
            )
        return '-'
    get_file_info.short_description = 'Informations du fichier'
    
    actions = ['activer_photos', 'desactiver_photos', 'definir_comme_principale']
    
    def activer_photos(self, request, queryset):
        """Active les photos sélectionnées"""
        updated = queryset.update(est_active=True)
        self.message_user(request, f'{updated} photo(s) activée(s) avec succès.')
    activer_photos.short_description = "Activer les photos sélectionnées"
    
    def desactiver_photos(self, request, queryset):
        """Désactive les photos sélectionnées"""
        updated = queryset.update(est_active=False)
        self.message_user(request, f'{updated} photo(s) désactivée(s) avec succès.')
    desactiver_photos.short_description = "Désactiver les photos sélectionnées"
    
    def definir_comme_principale(self, request, queryset):
        """Définit la première photo sélectionnée comme principale"""
        if queryset.count() > 1:
            self.message_user(request, 'Veuillez sélectionner une seule photo.', level='warning')
            return
        photo = queryset.first()
        if photo:
            BiometriePhoto.objects.filter(
                criminel=photo.criminel,
                est_principale=True
            ).update(est_principale=False)
            photo.est_principale = True
            photo.save()
            self.message_user(request, f'Photo définie comme principale pour {photo.criminel}.')
    definir_comme_principale.short_description = "Définir comme photo principale"


@admin.register(BiometrieEmpreinte)
class BiometrieEmpreinteAdmin(admin.ModelAdmin):
    list_display = [
        'id', 
        'get_criminel_info', 
        'doigt',
        'type_empreinte',
        'qualite',
        'nombre_minuties',
        'est_active',
        'preview_image',
        'date_enregistrement', 
        'enregistre_par'
    ]
    list_filter = [
        'doigt',
        'type_empreinte',
        'est_active',
        'date_enregistrement'
    ]
    search_fields = [
        'criminel__nom', 
        'criminel__prenom', 
        'criminel__numero_fiche',
        'notes'
    ]
    readonly_fields = [
        'date_enregistrement', 
        'taille_fichier',
        'preview_image_large',
        'get_file_info',
        'get_main'
    ]
    list_per_page = 25
    date_hierarchy = 'date_enregistrement'
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('criminel', 'doigt', 'get_main', 'image', 'preview_image_large')
        }),
        ('Classification et qualité', {
            'fields': ('type_empreinte', 'qualite', 'nombre_minuties', 'est_active')
        }),
        ('Données biométriques', {
            'fields': ('minuties', 'encodage_empreinte'),
            'classes': ('collapse',)
        }),
        ('Informations du fichier', {
            'fields': ('taille_fichier', 'get_file_info'),
            'classes': ('collapse',)
        }),
        ('Notes et observations', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_enregistrement', 'enregistre_par'),
            'classes': ('collapse',)
        }),
    )
    
    def get_criminel_info(self, obj):
        """Affiche les informations du criminel"""
        if obj.criminel:
            return format_html(
                '<strong>{}</strong><br><small>{}</small>',
                f"{obj.criminel.nom} {obj.criminel.prenom}",
                obj.criminel.numero_fiche
            )
        return '-'
    get_criminel_info.short_description = 'Criminel'
    
    def preview_image(self, obj):
        """Aperçu miniature de l'image dans la liste"""
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />',
                obj.image.url
            )
        return '-'
    preview_image.short_description = 'Aperçu'
    
    def preview_image_large(self, obj):
        """Aperçu grande taille de l'image dans le formulaire"""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 400px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />',
                obj.image.url
            )
        return '-'
    preview_image_large.short_description = 'Aperçu de l\'empreinte'
    
    def get_file_info(self, obj):
        """Informations sur le fichier"""
        if obj.image:
            size_kb = obj.taille_fichier / 1024 if obj.taille_fichier else 0
            return format_html(
                '<strong>Taille:</strong> {:.2f} KB<br>'
                '<strong>Chemin:</strong> {}',
                size_kb,
                obj.image.name
            )
        return '-'
    get_file_info.short_description = 'Informations du fichier'
    
    actions = ['activer_empreintes', 'desactiver_empreintes']
    
    def activer_empreintes(self, request, queryset):
        """Active les empreintes sélectionnées"""
        updated = queryset.update(est_active=True)
        self.message_user(request, f'{updated} empreinte(s) activée(s) avec succès.')
    activer_empreintes.short_description = "Activer les empreintes sélectionnées"
    
    def desactiver_empreintes(self, request, queryset):
        """Désactive les empreintes sélectionnées"""
        updated = queryset.update(est_active=False)
        self.message_user(request, f'{updated} empreinte(s) désactivée(s) avec succès.')
    desactiver_empreintes.short_description = "Désactiver les empreintes sélectionnées"


@admin.register(BiometriePaume)
class BiometriePaumeAdmin(admin.ModelAdmin):
    list_display = [
        'id', 
        'get_criminel_info', 
        'paume',
        'qualite',
        'resolution',
        'est_active',
        'preview_image',
        'date_enregistrement', 
        'enregistre_par'
    ]
    list_filter = [
        'paume',
        'est_active',
        'date_enregistrement'
    ]
    search_fields = [
        'criminel__nom', 
        'criminel__prenom', 
        'criminel__numero_fiche',
        'notes'
    ]
    readonly_fields = [
        'date_enregistrement', 
        'taille_fichier',
        'preview_image_large',
        'get_file_info'
    ]
    list_per_page = 25
    date_hierarchy = 'date_enregistrement'
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('criminel', 'paume', 'image', 'preview_image_large')
        }),
        ('Qualité et spécifications', {
            'fields': ('qualite', 'resolution', 'est_active')
        }),
        ('Informations du fichier', {
            'fields': ('taille_fichier', 'get_file_info'),
            'classes': ('collapse',)
        }),
        ('Notes et observations', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_enregistrement', 'enregistre_par'),
            'classes': ('collapse',)
        }),
    )
    
    def get_criminel_info(self, obj):
        """Affiche les informations du criminel"""
        if obj.criminel:
            return format_html(
                '<strong>{}</strong><br><small>{}</small>',
                f"{obj.criminel.nom} {obj.criminel.prenom}",
                obj.criminel.numero_fiche
            )
        return '-'
    get_criminel_info.short_description = 'Criminel'
    
    def preview_image(self, obj):
        """Aperçu miniature de l'image dans la liste"""
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 70px; object-fit: cover; border-radius: 4px;" />',
                obj.image.url
            )
        return '-'
    preview_image.short_description = 'Aperçu'
    
    def preview_image_large(self, obj):
        """Aperçu grande taille de l'image dans le formulaire"""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 500px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />',
                obj.image.url
            )
        return '-'
    preview_image_large.short_description = 'Aperçu de l\'empreinte palmaire'
    
    def get_file_info(self, obj):
        """Informations sur le fichier"""
        if obj.image:
            size_kb = obj.taille_fichier / 1024 if obj.taille_fichier else 0
            return format_html(
                '<strong>Résolution:</strong> {}<br>'
                '<strong>Taille:</strong> {:.2f} KB<br>'
                '<strong>Chemin:</strong> {}',
                obj.resolution or 'Non spécifiée',
                size_kb,
                obj.image.name
            )
        return '-'
    get_file_info.short_description = 'Informations du fichier'
    
    actions = ['activer_paumes', 'desactiver_paumes']
    
    def activer_paumes(self, request, queryset):
        """Active les empreintes palmaires sélectionnées"""
        updated = queryset.update(est_active=True)
        self.message_user(request, f'{updated} empreinte(s) palmaire(s) activée(s) avec succès.')
    activer_paumes.short_description = "Activer les empreintes palmaires sélectionnées"
    
    def desactiver_paumes(self, request, queryset):
        """Désactive les empreintes palmaires sélectionnées"""
        updated = queryset.update(est_active=False)
        self.message_user(request, f'{updated} empreinte(s) palmaire(s) désactivée(s) avec succès.')
    desactiver_paumes.short_description = "Désactiver les empreintes palmaires sélectionnées"


@admin.register(BiometrieScanResultat)
class BiometrieScanResultatAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'type_scan',
        'get_criminel_correspondant',
        'get_score_display',
        'statut',
        'nombre_comparaisons',
        'temps_execution',
        'date_scan',
        'execute_par'
    ]
    list_filter = [
        'type_scan',
        'statut',
        'date_scan'
    ]
    search_fields = [
        'criminel_correspondant__nom',
        'criminel_correspondant__prenom',
        'criminel_correspondant__numero_fiche',
        'notes'
    ]
    readonly_fields = [
        'date_scan',
        'preview_image_source',
        'get_correspondance_status',
        'get_performance_info'
    ]
    list_per_page = 25
    date_hierarchy = 'date_scan'
    
    fieldsets = (
        ('Informations du scan', {
            'fields': (
                'type_scan',
                'image_source',
                'preview_image_source',
                'statut'
            )
        }),
        ('Résultats', {
            'fields': (
                'criminel_correspondant',
                'score_correspondance',
                'seuil_confiance',
                'get_correspondance_status'
            )
        }),
        ('Détails techniques', {
            'fields': (
                'resultats_json',
                'nombre_comparaisons',
                'temps_execution',
                'get_performance_info'
            ),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_scan', 'execute_par'),
            'classes': ('collapse',)
        }),
    )
    
    def get_criminel_correspondant(self, obj):
        """Affiche les informations du criminel correspondant"""
        if obj.criminel_correspondant:
            return format_html(
                '<strong>{}</strong><br><small>{}</small>',
                f"{obj.criminel_correspondant.nom} {obj.criminel_correspondant.prenom}",
                obj.criminel_correspondant.numero_fiche
            )
        return format_html('<span style="color: #999;">Aucune correspondance</span>')
    get_criminel_correspondant.short_description = 'Correspondance'
    
    def get_score_display(self, obj):
        """Affiche le score avec une barre de progression visuelle"""
        percentage = int(obj.score_correspondance * 100)
        if obj.est_correspondance_valide():
            color = '#28a745' if percentage >= 90 else '#ffc107'
        else:
            color = '#dc3545'
        
        return format_html(
            '<div style="width: 100px; background: #e9ecef; border-radius: 4px; overflow: hidden;">'
            '<div style="width: {}%; background: {}; padding: 2px 5px; color: white; font-size: 11px; text-align: center;">'
            '{}%'
            '</div>'
            '</div>',
            percentage,
            color,
            percentage
        )
    get_score_display.short_description = 'Score'
    
    def preview_image_source(self, obj):
        """Aperçu de l'image source"""
        if obj.image_source:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />',
                obj.image_source.url
            )
        return '-'
    preview_image_source.short_description = 'Image source'
    
    def get_correspondance_status(self, obj):
        """Affiche le statut de la correspondance"""
        is_valid = obj.est_correspondance_valide()
        status_color = '#28a745' if is_valid else '#dc3545'
        status_text = 'Correspondance valide' if is_valid else 'Score insuffisant'
        
        return format_html(
            '<div style="padding: 8px 12px; background: {}; color: white; border-radius: 4px; display: inline-block;">'
            '{}'
            '</div>',
            status_color,
            status_text
        )
    get_correspondance_status.short_description = 'Statut de correspondance'
    
    def get_performance_info(self, obj):
        """Affiche les informations de performance"""
        return format_html(
            '<strong>Comparaisons:</strong> {}<br>'
            '<strong>Temps d\'exécution:</strong> {:.2f} secondes<br>'
            '<strong>Moyenne par comparaison:</strong> {:.4f} secondes',
            obj.nombre_comparaisons,
            obj.temps_execution,
            obj.temps_execution / obj.nombre_comparaisons if obj.nombre_comparaisons > 0 else 0
        )
    get_performance_info.short_description = 'Performance'
    
    actions = ['marquer_comme_termine', 'marquer_comme_echec']
    
    def marquer_comme_termine(self, request, queryset):
        """Marque les scans comme terminés"""
        updated = queryset.update(statut='termine')
        self.message_user(request, f'{updated} scan(s) marqué(s) comme terminé(s).')
    marquer_comme_termine.short_description = "Marquer comme terminé"
    
    def marquer_comme_echec(self, request, queryset):
        """Marque les scans comme échoués"""
        updated = queryset.update(statut='echec')
        self.message_user(request, f'{updated} scan(s) marqué(s) comme échoué(s).')
    marquer_comme_echec.short_description = "Marquer comme échec"


@admin.register(BiometrieHistorique)
class BiometrieHistoriqueAdmin(admin.ModelAdmin):
    """
    Admin pour l'historique biométrique (lecture seule)
    """
    list_display = [
        'id',
        'get_action_badge',
        'type_objet',
        'objet_id',
        'get_criminel_info',
        'get_user_info',
        'date_action',
        'adresse_ip'
    ]
    list_filter = [
        'action',
        'type_objet',
        'date_action',
    ]
    search_fields = [
        'criminel__nom',
        'criminel__prenom',
        'criminel__numero_fiche',
        'effectue_par__username',
        'description',
        'adresse_ip'
    ]
    readonly_fields = [
        'type_objet',
        'objet_id',
        'criminel',
        'action',
        'description',
        'donnees_avant',
        'donnees_apres',
        'date_action',
        'effectue_par',
        'adresse_ip',
        'user_agent',
        'get_donnees_diff'
    ]
    date_hierarchy = 'date_action'
    list_per_page = 50
    
    # Lecture seule - pas de modification/suppression
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    fieldsets = (
        ('Action', {
            'fields': ('action', 'type_objet', 'objet_id', 'date_action')
        }),
        ('Entité concernée', {
            'fields': ('criminel', 'description')
        }),
        ('Modifications', {
            'fields': ('donnees_avant', 'donnees_apres', 'get_donnees_diff'),
            'classes': ('collapse',)
        }),
        ('Utilisateur', {
            'fields': ('effectue_par', 'adresse_ip', 'user_agent'),
            'classes': ('collapse',)
        }),
    )
    
    def get_action_badge(self, obj):
        """Affiche l'action avec un badge coloré"""
        colors = {
            'creation': '#28a745',
            'modification': '#ffc107',
            'suppression': '#dc3545',
            'activation': '#17a2b8',
            'desactivation': '#6c757d',
            'encodage': '#007bff',
            'principale': '#e83e8c',
        }
        color = colors.get(obj.action, '#6c757d')
        
        return format_html(
            '<span style="padding: 4px 8px; background: {}; color: white; border-radius: 4px; font-size: 11px; font-weight: bold;">'
            '{}'
            '</span>',
            color,
            obj.get_action_display()
        )
    get_action_badge.short_description = 'Action'
    get_action_badge.admin_order_field = 'action'
    
    def get_criminel_info(self, obj):
        """Affiche les informations du criminel"""
        if obj.criminel:
            return format_html(
                '<strong>{}</strong><br><small>{}</small>',
                f"{obj.criminel.nom} {obj.criminel.prenom}",
                obj.criminel.numero_fiche
            )
        return '-'
    get_criminel_info.short_description = 'Criminel'
    
    def get_user_info(self, obj):
        """Affiche les informations de l'utilisateur"""
        if obj.effectue_par:
            if hasattr(obj.effectue_par, 'nom'):
                return format_html(
                    '<strong>{}</strong><br><small>{}</small>',
                    f"{obj.effectue_par.nom} {obj.effectue_par.prenom}",
                    obj.effectue_par.username
                )
            return obj.effectue_par.username
        return format_html('<em style="color: #6c757d;">Système</em>')
    get_user_info.short_description = 'Effectué par'
    
    def get_donnees_diff(self, obj):
        """Affiche les différences entre avant/après"""
        if not obj.donnees_avant and not obj.donnees_apres:
            return '-'
        
        html = '<div style="font-family: monospace; font-size: 12px;">'
        
        if obj.donnees_avant:
            html += '<div style="margin-bottom: 10px;"><strong>Avant:</strong><br>'
            html += '<pre style="background: #f8f9fa; padding: 10px; border-radius: 4px;">'
            import json
            html += json.dumps(obj.donnees_avant, indent=2, ensure_ascii=False)
            html += '</pre></div>'
        
        if obj.donnees_apres:
            html += '<div><strong>Après:</strong><br>'
            html += '<pre style="background: #f8f9fa; padding: 10px; border-radius: 4px;">'
            html += json.dumps(obj.donnees_apres, indent=2, ensure_ascii=False)
            html += '</pre></div>'
        
        html += '</div>'
        return format_html(html)
    get_donnees_diff.short_description = 'Différences'

