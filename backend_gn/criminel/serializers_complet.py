"""
Serializer COMPLET pour la Fiche Criminelle
Inclut TOUTES les informations organisées par sections
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CriminalFicheCriminelle, CriminalInfraction
from .serializers import CriminalInfractionListSerializer

# Import des serializers biométriques
try:
    from biometrie.serializers import (
        BiometriePhotoSerializer,
        BiometrieEmpreinteSerializer,
    )
except ImportError:
    BiometriePhotoSerializer = None
    BiometrieEmpreinteSerializer = None

User = get_user_model()


class CriminalFicheCriminelleCompleteSerializer(serializers.ModelSerializer):
    """
    Serializer COMPLET de la Fiche Criminelle avec TOUTES les informations :
    - Identification complète
    - Données biométriques (photos, empreintes, encodages IA)
    - Informations personnelles et sociales
    - Réseau relationnel
    - Historique criminel complet
    - Preuves et documents
    - Analyse comportementale
    - Synthèse finale
    - Audit et traçabilité
    """
    
    # Informations de base
    statut_fiche_display = serializers.SerializerMethodField(read_only=True)
    created_by_username = serializers.SerializerMethodField(read_only=True)
    pdf_exported_url = serializers.SerializerMethodField(read_only=True)
    
    # Relations - Infractions
    infractions = CriminalInfractionListSerializer(many=True, read_only=True)
    
    # Relations - Données biométriques
    photos_biometriques = serializers.SerializerMethodField(read_only=True)
    empreintes_digitales = serializers.SerializerMethodField(read_only=True)
    empreintes_palmaires = serializers.SerializerMethodField(read_only=True)
    encodages_biometriques = serializers.SerializerMethodField(read_only=True)
    historique_biometrie = serializers.SerializerMethodField(read_only=True)
    
    # Résumé biométrique IA
    resume_biometrie_ia = serializers.SerializerMethodField(read_only=True)
    
    # Historique d'audit
    historique_audit = serializers.SerializerMethodField(read_only=True)
    
    # Métadonnées
    nombre_photos = serializers.SerializerMethodField(read_only=True)
    nombre_empreintes = serializers.SerializerMethodField(read_only=True)
    nombre_infractions = serializers.SerializerMethodField(read_only=True)
    
    def get_statut_fiche_display(self, obj):
        """Récupérer le libellé du statut"""
        return obj.statut_fiche.libelle if obj.statut_fiche else None
    
    def get_created_by_username(self, obj):
        """Récupérer le nom d'utilisateur du créateur"""
        if obj.created_by:
            if hasattr(obj.created_by, 'nom') and hasattr(obj.created_by, 'prenom'):
                return f"{obj.created_by.nom} {obj.created_by.prenom}"
            return obj.created_by.username
        return None
    
    def get_pdf_exported_url(self, obj):
        """Récupérer l'URL du PDF exporté"""
        if obj.pdf_exported:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_exported.url)
            return obj.pdf_exported.url
        return None
    
    def get_infractions(self, obj):
        """Récupérer toutes les infractions avec détails"""
        infractions = obj.infractions.all().select_related('type_infraction', 'statut_affaire')
        return CriminalInfractionListSerializer(infractions, many=True, context=self.context).data
    
    def get_photos_biometriques(self, obj):
        """Récupérer toutes les photos biométriques"""
        if not BiometriePhotoSerializer:
            return []
        photos = obj.photos_biometriques.all().order_by('-date_capture')
        return BiometriePhotoSerializer(photos, many=True, context=self.context).data
    
    def get_empreintes_digitales(self, obj):
        """Récupérer toutes les empreintes digitales"""
        if not BiometrieEmpreinteSerializer:
            return []
        empreintes = obj.empreintes_biometriques.filter(type_empreinte='digitale').order_by('main', 'doigt')
        return BiometrieEmpreinteSerializer(empreintes, many=True, context=self.context).data
    
    def get_empreintes_palmaires(self, obj):
        """Récupérer toutes les empreintes palmaires"""
        if not BiometrieEmpreinteSerializer:
            return []
        empreintes = obj.empreintes_biometriques.filter(type_empreinte='palmaire').order_by('main')
        return BiometrieEmpreinteSerializer(empreintes, many=True, context=self.context).data
    
    def get_encodages_biometriques(self, obj):
        """Récupérer tous les encodages biométriques"""
        encodages = obj.encodages_biometriques.all().order_by('-date_enregistrement')
        return [{
            'id': enc.id,
            'date_enregistrement': enc.date_enregistrement,
            'photo_url': enc.photo.url if enc.photo else None,
            'a_encodage': bool(enc.encodage_facial),
        } for enc in encodages]
    
    def get_historique_biometrie(self, obj):
        """Récupérer l'historique biométrique"""
        try:
            historique = obj.historique_biometrie.all().order_by('-date_action')[:20]
            return [{
                'id': h.id,
                'type_objet': h.type_objet,
                'action': h.action,
                'description': h.description,
                'date_action': h.date_action,
            } for h in historique]
        except:
            return []
    
    def get_resume_biometrie_ia(self, obj):
        """Résumé des données IA biométriques"""
        photos_actives = obj.photos_biometriques.filter(est_active=True)
        
        return {
            'nombre_photos_actives': photos_actives.count(),
            'photos_avec_embedding': photos_actives.exclude(embedding_512__isnull=True).count(),
            'photos_avec_landmarks': photos_actives.exclude(landmarks_106__isnull=True).count(),
            'photos_avec_facemesh': photos_actives.exclude(facemesh_468__isnull=True).count(),
            'derniere_mise_a_jour': photos_actives.order_by('-date_mise_a_jour').first().date_mise_a_jour if photos_actives.exists() and hasattr(photos_actives.first(), 'date_mise_a_jour') else None,
            'niveaux_confiance': [
                {
                    'photo_id': p.id,
                    'type_photo': p.type_photo,
                    'niveau_confiance': getattr(p, 'niveau_confiance', None),
                    'qualite': p.qualite,
                }
                for p in photos_actives if hasattr(p, 'niveau_confiance') and p.niveau_confiance is not None
            ],
        }
    
    def get_nombre_photos(self, obj):
        """Nombre total de photos biométriques"""
        return obj.photos_biometriques.count()
    
    def get_nombre_empreintes(self, obj):
        """Nombre total d'empreintes"""
        return obj.empreintes_biometriques.count()
    
    def get_nombre_infractions(self, obj):
        """Nombre total d'infractions"""
        return obj.infractions.count()
    
    def get_historique_audit(self, obj):
        """Récupérer l'historique complet du journal d'audit pour cette fiche"""
        try:
            from django.contrib.contenttypes.models import ContentType
            from audit.models import AuditLog
            
            # Récupérer le ContentType pour CriminalFicheCriminelle
            content_type = ContentType.objects.get_for_model(CriminalFicheCriminelle)
            
            # Récupérer tous les logs d'audit pour cette fiche
            audit_logs = AuditLog.objects.filter(
                content_type=content_type,
                object_id=obj.id
            ).select_related(
                'user', 'session'
            ).order_by('-timestamp')
            
            return [{
                'id': log.id,
                'action': log.action,
                'action_display': log.get_action_display(),
                'user': {
                    'id': log.user.id if log.user else None,
                    'username': log.user.username if log.user else None,
                    'nom_complet': f"{log.user.nom} {log.user.prenom}" if log.user and hasattr(log.user, 'nom') and hasattr(log.user, 'prenom') else (log.user.username if log.user else None),
                    'email': log.user.email if log.user and hasattr(log.user, 'email') else None,
                } if log.user else None,
                'user_role': log.user_role,
                'timestamp': log.timestamp,
                'description': log.description,
                'endpoint': log.endpoint,
                'method': log.method,
                'ip_address': str(log.ip_address) if log.ip_address else None,
                'user_agent': log.user_agent,
                'browser': log.browser,
                'os': log.os,
                'poste_travail': getattr(log.session, 'workstation_info', None) if log.session else None,
                'avant_modification': log.before if hasattr(log, 'before') else (log.data_before if hasattr(log, 'data_before') else {}),
                'apres_modification': log.after if hasattr(log, 'after') else (log.data_after if hasattr(log, 'data_after') else {}),
                'reussi': log.reussi if hasattr(log, 'reussi') else True,
                'message_erreur': log.message_erreur if hasattr(log, 'message_erreur') else None,
            } for log in audit_logs]
        except Exception as e:
            # Si le module audit n'est pas disponible, retourner une liste vide
            return []
    
    class Meta:
        model = CriminalFicheCriminelle
        fields = '__all__'
        read_only_fields = [
            'numero_fiche',
            'date_creation',
            'date_modification',
            'uuid',
            'created_by',
            'pdf_exported',
            'pdf_exported_at',
        ]
    
    def to_representation(self, instance):
        """
        Personnaliser la représentation pour organiser les données par sections
        """
        data = super().to_representation(instance)
        
        # Organiser les données par sections pour une meilleure lisibilité
        organized_data = {
            # === 1. INFORMATIONS D'IDENTIFICATION ===
            'identification': {
                'numero_fiche': data.get('numero_fiche'),
                'numero_identification_criminel': data.get('numero_identification_criminel'),
                'numero_judiciaire': data.get('numero_judiciaire'),
                'nom_complet': f"{data.get('nom', '')} {data.get('prenom', '')}".strip(),
                'nom': data.get('nom'),
                'prenom': data.get('prenom'),
                'surnom': data.get('surnom'),
                'pseudonymes_connus': data.get('pseudonymes_connus'),
                'sexe': data.get('sexe'),
                'date_naissance': data.get('date_naissance'),
                'lieu_naissance': data.get('lieu_naissance'),
                'nationalite': data.get('nationalite'),
                'langues_parlees': data.get('langues_parlees'),
                'cin': data.get('cin'),
                'numero_passeport': data.get('numero_passeport'),
                'photo': data.get('photo'),
            },
            
            # === 2. DONNÉES BIOMÉTRIQUES ET IA ===
            'biometrie': {
                'photos': data.get('photos_biometriques', []),
                'empreintes_digitales': data.get('empreintes_digitales', []),
                'empreintes_palmaires': data.get('empreintes_palmaires', []),
                'encodages': data.get('encodages_biometriques', []),
                'historique': data.get('historique_biometrie', []),
                'resume_ia': data.get('resume_biometrie_ia', {}),
            },
            
            # === 3. CARACTÉRISTIQUES PHYSIQUES ===
            'caracteristiques_physiques': {
                'taille': data.get('height'),
                'poids': data.get('weight'),
                'corpulence': data.get('corpulence'),
                'couleur_yeux': data.get('eye_color'),
                'couleur_cheveux': data.get('hair_color'),
                'cheveux': data.get('cheveux'),
                'morphologie': data.get('build'),
                'visage': data.get('visage'),
                'face_shape': data.get('face_shape'),
                'barbe': data.get('barbe'),
                'signes_particuliers': data.get('distinguishing_marks'),
                'tatouages': data.get('tattoos'),
                'marques_particulieres': data.get('marques_particulieres'),
            },
            
            # === 4. INFORMATIONS PERSONNELLES/SOCIALES ===
            'informations_personnelles': {
                'statut_matrimonial': data.get('statut_matrimonial'),
                'partenaire_affectif': data.get('partenaire_affectif'),
                'spouse': data.get('spouse'),
                'enfants': data.get('children'),
                'personnes_proches': data.get('personnes_proches'),
                'dependants': data.get('dependants'),
                'reseau_sociaux': {
                    'facebook': data.get('facebook'),
                    'instagram': data.get('instagram'),
                    'tiktok': data.get('tiktok'),
                    'twitter_x': data.get('twitter_x'),
                    'whatsapp': data.get('whatsapp'),
                    'telegram': data.get('telegram'),
                    'email': data.get('email'),
                    'autres_reseaux': data.get('autres_reseaux'),
                },
                'habitudes': {
                    'consommation_alcool': data.get('consommation_alcool'),
                    'consommation_drogues': data.get('consommation_drogues'),
                    'frequentations_connues': data.get('frequentations_connues'),
                    'endroits_frequentes': data.get('endroits_frequentes'),
                },
            },
            
            # === 5. ADRESSE ET DÉPLACEMENTS ===
            'adresse_deplacements': {
                'adresse_actuelle': data.get('adresse'),
                'anciennes_adresses': data.get('anciennes_adresses'),
                'adresses_secondaires': data.get('adresses_secondaires'),
                'lieux_visites_frequemment': data.get('lieux_visites_frequemment'),
                'contact': data.get('contact'),
                'latitude': data.get('latitude'),
                'longitude': data.get('longitude'),
                'vehicules_associes': data.get('vehicules_associes'),
                'plaques_immatriculation': data.get('plaques_immatriculation'),
                'permis_conduire': data.get('permis_conduire'),
                'trajets_habituels': data.get('trajets_habituels'),
            },
            
            # === 6. INFORMATIONS PROFESSIONNELLES/FINANCIÈRES ===
            'profession_finances': {
                'emploi_actuel': data.get('profession'),
                'emplois_precedents': data.get('emplois_precedents'),
                'sources_revenus': data.get('sources_revenus'),
                'entreprises_associees': data.get('entreprises_associees'),
                'comptes_bancaires': data.get('comptes_bancaires'),
                'biens_proprietes': data.get('biens_proprietes'),
                'dettes_importantes': data.get('dettes_importantes'),
                'transactions_suspectes': data.get('transactions_suspectes'),
            },
            
            # === 7. RÉSEAU RELATIONNEL ===
            'reseau_relationnel': {
                'partenaire_affectif': data.get('partenaire_affectif'),
                'famille_proche': data.get('famille_proche'),
                'amis_proches': data.get('amis_proches'),
                'relations_risque': data.get('relations_risque'),
                'suspects_associes': data.get('suspects_associes'),
                'membres_reseau_criminel': data.get('membres_reseau_criminel'),
                'complices_potentiels': data.get('complices_potentiels'),
                'contacts_recurrents': data.get('contacts_recurrents'),
            },
            
            # === 8. HISTORIQUE CRIMINEL ===
            'historique_criminel': {
                'infractions': data.get('infractions', []),
                'arrestations': data.get('arrestations'),
                'condamnations': data.get('condamnations'),
                'mandats_actifs': data.get('mandats_actifs'),
                'mandats_expires': data.get('mandats_expires'),
                'periodes_incarceration': data.get('periodes_incarceration'),
                'liberte_conditionnelle': data.get('liberte_conditionnelle'),
                'antecedent_judiciaire': data.get('antecedent_judiciaire'),
            },
            
            # === 9. PREUVES ET DOCUMENTS ===
            'preuves_documents': {
                'photos_preuves': data.get('photos_preuves'),
                'videos_preuves': data.get('videos_preuves'),
                'audios_interrogatoire': data.get('audios_interrogatoire'),
                'rapports_scientifiques': data.get('rapports_scientifiques'),
                'analyse_ia': data.get('analyse_ia'),
                'documents_saisis': data.get('documents_saisis'),
                'rapport_medicolegal': data.get('rapport_medicolegal'),
            },
            
            # === 10. ANALYSE COMPORTEMENTALE ===
            'analyse_comportementale': {
                'profil_psychologique': data.get('profil_psychologique'),
                'niveau_danger': data.get('niveau_danger'),
                'motivation_probable': data.get('motivation_probable'),
                'mode_operatoire': data.get('mode_operatoire'),
                'signature_criminelle': data.get('signature_criminelle'),
                'risque_recidive': data.get('risque_recidive'),
                'indicateurs_comportementaux': data.get('indicateurs_comportementaux'),
            },
            
            # === 11. SYNTHÈSE FINALE ===
            'synthese': {
                'resume_individu': data.get('resume_individu'),
                'niveau_risque_global': data.get('niveau_risque_global'),
                'menace_potentielle': data.get('menace_potentielle'),
                'recommandation_surveillance': data.get('recommandation_surveillance'),
                'actions_futures_recommandees': data.get('actions_futures_recommandees'),
            },
            
            # === 12. INFORMATIONS JUDICIAIRES ===
            'judiciaire': {
                'motif_arrestation': data.get('motif_arrestation'),
                'date_arrestation': data.get('date_arrestation'),
                'lieu_arrestation': data.get('lieu_arrestation'),
                'province': data.get('province'),
                'region': data.get('region'),
                'district': data.get('district'),
                'unite_saisie': data.get('unite_saisie'),
                'reference_pv': data.get('reference_pv'),
                'suite_judiciaire': data.get('suite_judiciaire'),
                'peine_encourue': data.get('peine_encourue'),
                'service_militaire': data.get('service_militaire'),
                'statut_fiche': data.get('statut_fiche_display'),
            },
            
            # === 13. DONNÉES TÉLÉPHONIQUES/NUMÉRIQUES ===
            'telephoniques_numeriques': {
                'imei': data.get('imei'),
                'imsi': data.get('imsi'),
                'telephones_associes': data.get('telephones_associes'),
                'cartes_sim': data.get('cartes_sim'),
                'historique_appels': data.get('historique_appels'),
                'geolocalisation_estimee': data.get('geolocalisation_estimee'),
                'comptes_cloud': data.get('comptes_cloud'),
                'messages_recuperes': data.get('messages_recuperes'),
            },
            
            # === 14. FILIATION ===
            'filiation': {
                'nom_pere': data.get('nom_pere'),
                'nom_mere': data.get('nom_mere'),
            },
            
            # === 11. HISTORIQUE COMPLET DU JOURNAL D'AUDIT ===
            'historique_audit': {
                'logs': data.get('historique_audit', []),
                'nombre_total': len(data.get('historique_audit', [])),
                'resume': {
                    'creations': len([log for log in data.get('historique_audit', []) if log.get('action') == 'CREATE']),
                    'modifications': len([log for log in data.get('historique_audit', []) if log.get('action') == 'UPDATE']),
                    'consultations': len([log for log in data.get('historique_audit', []) if log.get('action') == 'VIEW']),
                    'suppressions': len([log for log in data.get('historique_audit', []) if log.get('action') == 'DELETE']),
                    'exports_pdf': len([log for log in data.get('historique_audit', []) if 'PDF' in str(log.get('description', '')).upper() or 'export' in str(log.get('description', '')).lower()]),
                    'telechargements': len([log for log in data.get('historique_audit', []) if log.get('action') == 'DOWNLOAD']),
                    'modifications_biometriques': len([log for log in data.get('historique_audit', []) if 'biometr' in str(log.get('description', '')).lower()]),
                }
            },
            
            # === 15. MÉTADONNÉES ET STATISTIQUES ===
            'metadonnees': {
                'uuid': data.get('uuid'),
                'date_creation': data.get('date_creation'),
                'date_modification': data.get('date_modification'),
                'created_by': data.get('created_by_username'),
                'statut_fiche': data.get('statut_fiche'),
                'statut_fiche_display': data.get('statut_fiche_display'),
                'progression': data.get('progression'),
                'is_archived': data.get('is_archived'),
                'pdf_exported_url': data.get('pdf_exported_url'),
                'pdf_exported_at': data.get('pdf_exported_at'),
                'nombre_photos': data.get('nombre_photos'),
                'nombre_empreintes': data.get('nombre_empreintes'),
                'nombre_infractions': data.get('nombre_infractions'),
            },
        }
        
        return organized_data

