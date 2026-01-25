from datetime import datetime
import os
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from .validators import validate_biometric_photo, validate_fingerprint_image, validate_palmprint_image


def upload_photo_criminel(instance, filename):
    """
    Génère le chemin de stockage personnalisé pour la photo du criminel.
    Format: criminels/photos/{numero_fiche}_{nom}_{prenom}.{extension}
    Exemple: criminels/photos/001-CIE_2-RJ_DUPONT_Jean.jpg
    """
    # Récupérer l'extension du fichier
    ext = filename.split('.')[-1].lower()
    
    # Créer le nom du fichier basé sur le numéro de fiche et le nom
    numero_fiche_slug = slugify(instance.numero_fiche) if instance.numero_fiche else 'sans-numero'
    nom_slug = slugify(instance.nom) if instance.nom else 'inconnu'
    prenom_slug = slugify(instance.prenom) if instance.prenom else ''
    
    # Construire le nom du fichier
    if prenom_slug:
        nouveau_nom = f"{numero_fiche_slug}_{nom_slug}_{prenom_slug}.{ext}"
    else:
        nouveau_nom = f"{numero_fiche_slug}_{nom_slug}.{ext}"
    
    # Retourner le chemin complet
    return os.path.join('criminels', 'photos', nouveau_nom)


class RefStatutFiche(models.Model):
    """
    Table de référence pour les statuts des fiches criminelles
    Exemples: Actif, Archivé, En révision, etc.
    """
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    actif = models.BooleanField(default=True)  # type: ignore  # type: ignore
    ordre = models.IntegerField(default=0)  # type: ignore
    
    class Meta:
        db_table = 'ref_statut_fiche'
        verbose_name = "Statut de fiche"
        verbose_name_plural = "Statuts de fiches"
        ordering = ['ordre', 'libelle']
    
    def __str__(self) -> str:
        return str(self.libelle)


class RefTypeInfraction(models.Model):
    """
    Table de référence pour les types d'infractions
    Exemples: Vol, Agression, Fraude, etc.
    """
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=100)
    categorie = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    actif = models.BooleanField(default=True)  # type: ignore  # type: ignore
    ordre = models.IntegerField(default=0)  # type: ignore
    
    class Meta:
        db_table = 'ref_type_infraction'
        verbose_name = "Type d'infraction"
        verbose_name_plural = "Types d'infractions"
        ordering = ['ordre', 'libelle']
    
    def __str__(self) -> str:
        return str(self.libelle)


class RefStatutAffaire(models.Model):
    """
    Table de référence pour les statuts des affaires
    Exemples: En cours, Classée, Jugée, etc.
    """
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    actif = models.BooleanField(default=True)  # type: ignore  # type: ignore
    ordre = models.IntegerField(default=0)  # type: ignore
    couleur = models.CharField(max_length=7, default='#6c757d', help_text="Couleur hexadécimale")
    
    class Meta:
        db_table = 'ref_statut_affaire'
        verbose_name = "Statut d'affaire"
        verbose_name_plural = "Statuts d'affaires"
        ordering = ['ordre', 'libelle']
    
    def __str__(self) -> str:
        return str(self.libelle)



class CriminalFicheCriminelle(models.Model):
    """
    Fiche criminelle complète d'un individu
    """
    SEXE_CHOICES = [
        ('H', 'Homme'),
        ('F', 'Femme'),
    ]
    
    CORPULENCE_CHOICES = [
        ('mince', 'Mince'),
        ('normale', 'Normale'),
        ('forte', 'Forte'),
        ('obese', 'Obèse'),
    ]
    
    CHEVEUX_CHOICES = [
        ('noirs', 'Noirs'),
        ('bruns', 'Bruns'),
        ('chatains', 'Châtains'),
        ('blonds', 'Blonds'),
        ('roux', 'Roux'),
        ('gris', 'Gris'),
        ('blancs', 'Blancs'),
        ('chauves', 'Chauves'),
    ]
    
    VISAGE_CHOICES = [
        ('ovale', 'Ovale'),
        ('rond', 'Rond'),
        ('carre', 'Carré'),
        ('allonge', 'Allongé'),
        ('triangulaire', 'Triangulaire'),
    ]
    
    BARBE_CHOICES = [
        ('aucune', 'Aucune'),
        ('courte', 'Courte'),
        ('longue', 'Longue'),
        ('moustache', 'Moustache'),
        ('bouc', 'Bouc'),
    ]
    
    STATUT_MATRIMONIAL_CHOICES = [
        ('celibataire', 'Célibataire'),
        ('marie', 'Marié(e)'),
        ('divorce', 'Divorcé(e)'),
        ('veuf', 'Veuf(ve)'),
        ('concubinage', 'En concubinage'),
        ('pacs', 'PACS'),
    ]
    
    NIVEAU_DANGER_CHOICES = [
        (1, 'Faible'),
        (2, 'Modéré'),
        (3, 'Élevé'),
        (4, 'Très Élevé'),
        (5, 'Extrême'),
    ]
    
    #INFORMATIONS GÉNÉRALES / IDENTIFICATION
    numero_fiche = models.CharField(max_length=50, unique=True, verbose_name="Numéro de fiche")
    nom = models.CharField(max_length=100, verbose_name="Nom")
    prenom = models.CharField(max_length=100, verbose_name="Prénom")
    surnom = models.CharField(max_length=100, blank=True, null=True, verbose_name="Surnom/Alias")
    pseudonymes_connus = models.TextField(
        blank=True,
        null=True,
        verbose_name="Surnoms / alias / pseudonymes connus",
        help_text="Tous les surnoms, alias et pseudonymes connus (un par ligne)"
    )
    sexe = models.CharField(max_length=10, choices=SEXE_CHOICES, verbose_name="Sexe")
    date_naissance = models.DateField(blank=True, null=True, verbose_name="Date de naissance")
    lieu_naissance = models.CharField(max_length=255, blank=True, null=True, verbose_name="Lieu de naissance")
    nationalite = models.CharField(max_length=100, blank=True, null=True, verbose_name="Nationalité")
    langues_parlees = models.TextField(
        blank=True,
        null=True,
        verbose_name="Langues parlées",
        help_text="Langues que l'individu parle couramment"
    )
    numero_identification_criminel = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Numéro d'identification criminel (ID SGIC)",
        help_text="Identifiant unique dans le système SGIC"
    )
    numero_judiciaire = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Numéro judiciaire (si affaire)",
        help_text="Numéro de référence judiciaire si lié à une affaire spécifique"
    )
    cin = models.CharField(max_length=15, blank=True, null=True, verbose_name="CIN (Carte d'Identité Nationale)", help_text="Format: XXX XXX XXX XXX (12 chiffres)")
    numero_passeport = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Numéro de passeport",
        help_text="Numéro de passeport (si autorisé et disponible)"
    )
    photo = models.ImageField(upload_to=upload_photo_criminel, blank=True, null=True, verbose_name="Photo", help_text="La photo sera automatiquement nommée avec le numéro de fiche et le nom du criminel")
    
    #DESCRIPTION PHYSIQUE
    corpulence = models.CharField(max_length=50, choices=CORPULENCE_CHOICES, blank=True, null=True, verbose_name="Corpulence")
    cheveux = models.CharField(max_length=50, choices=CHEVEUX_CHOICES, blank=True, null=True, verbose_name="Cheveux")
    visage = models.CharField(max_length=50, choices=VISAGE_CHOICES, blank=True, null=True, verbose_name="Forme du visage")
    barbe = models.CharField(max_length=50, choices=BARBE_CHOICES, blank=True, null=True, verbose_name="Barbe/Moustache")
    marques_particulieres = models.TextField(blank=True, null=True, verbose_name="Marque(s) particulière(s)")
    
    height = models.PositiveIntegerField(
        blank=True, 
        null=True, 
        verbose_name="Taille (cm)",
        help_text="Taille en centimètres",
        validators=[MinValueValidator(50), MaxValueValidator(250)]
    )
    weight = models.PositiveIntegerField(
        blank=True, 
        null=True, 
        verbose_name="Poids (kg)",
        help_text="Poids en kilogrammes",
        validators=[MinValueValidator(20), MaxValueValidator(300)]
    )
    eye_color = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        verbose_name="Couleur des yeux",
        help_text="Ex: Brun, Bleu, Vert, Noir"
    )
    hair_color = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        verbose_name="Couleur des cheveux",
        help_text="Détail de la couleur des cheveux"
    )
    build = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        verbose_name="Morphologie",
        help_text="Description de la morphologie (athlétique, mince, etc.)"
    )
    face_shape = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        verbose_name="Forme du visage",
        help_text="Forme détaillée du visage"
    )
    tattoos = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Tatouages",
        help_text="Description des tatouages (localisation, description)"
    )
    distinguishing_marks = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Signes distinctifs",
        help_text="Marques, cicatrices, particularités physiques, tatouages"
    )
    
    #FILIATION
    nom_pere = models.CharField(max_length=100, blank=True, null=True, verbose_name="Nom du père")
    nom_mere = models.CharField(max_length=100, blank=True, null=True, verbose_name="Nom de la mère")
    
    # INFORMATIONS PERSONNELLES / SOCIALES
    statut_matrimonial = models.CharField(
        max_length=50,
        choices=STATUT_MATRIMONIAL_CHOICES,
        blank=True,
        null=True,
        verbose_name="Statut matrimonial"
    )
    spouse = models.CharField(
        max_length=200, 
        blank=True, 
        null=True, 
        verbose_name="Partenaire / Conjoint(e)",
        help_text="Nom du conjoint ou de la conjointe"
    )
    children = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Enfants",
        help_text="Liste des enfants (noms, dates de naissance)"
    )
    personnes_proches = models.TextField(
        blank=True,
        null=True,
        verbose_name="Personnes proches significatives",
        help_text="Personnes proches importantes (famille, amis proches)"
    )
    dependants = models.TextField(
        blank=True,
        null=True,
        verbose_name="Dépendants",
        help_text="Personnes à charge"
    )
    
    # RÉSEAUX SOCIAUX
    facebook = models.CharField(max_length=255, blank=True, null=True, verbose_name="Facebook")
    instagram = models.CharField(max_length=255, blank=True, null=True, verbose_name="Instagram")
    tiktok = models.CharField(max_length=255, blank=True, null=True, verbose_name="TikTok")
    twitter_x = models.CharField(max_length=255, blank=True, null=True, verbose_name="X (Twitter)")
    whatsapp = models.CharField(max_length=50, blank=True, null=True, verbose_name="WhatsApp (n° associé)")
    telegram = models.CharField(max_length=100, blank=True, null=True, verbose_name="Telegram")
    email = models.EmailField(blank=True, null=True, verbose_name="Adresse e-mail")
    autres_reseaux = models.TextField(
        blank=True,
        null=True,
        verbose_name="Autres plateformes",
        help_text="Autres réseaux sociaux ou plateformes"
    )
    
    # HABITUDES / MODES DE VIE
    consommation_alcool = models.BooleanField(default=False, verbose_name="Consommation d'alcool")  # type: ignore
    consommation_drogues = models.BooleanField(default=False, verbose_name="Consommation de drogues")  # type: ignore
    frequentations_connues = models.TextField(
        blank=True,
        null=True,
        verbose_name="Fréquentations connues",
        help_text="Personnes avec qui il/elle fréquente régulièrement"
    )
    endroits_frequentes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Endroits fréquentés",
        help_text="Bars, quartiers, villes fréquentés"
    )
    
    #COORDONNÉES
    adresse = models.CharField(max_length=255, blank=True, null=True, verbose_name="Adresse actuelle")
    anciennes_adresses = models.TextField(
        blank=True,
        null=True,
        verbose_name="Anciennes adresses",
        help_text="Liste des anciennes adresses connues"
    )
    adresses_secondaires = models.TextField(
        blank=True,
        null=True,
        verbose_name="Adresses secondaires",
        help_text="Autres adresses (domiciles secondaires, etc.)"
    )
    lieux_visites_frequemment = models.TextField(
        blank=True,
        null=True,
        verbose_name="Lieux visités fréquemment",
        help_text="Lieux régulièrement fréquentés"
    )
    contact = models.CharField(max_length=100, blank=True, null=True, verbose_name="Contact/Téléphone")
    latitude = models.FloatField(blank=True, null=True, verbose_name="Latitude")
    longitude = models.FloatField(blank=True, null=True, verbose_name="Longitude")
    
    # DÉPLACEMENTS ET MOBILITÉ
    vehicules_associes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Véhicules associés",
        help_text="Description des véhicules connus"
    )
    plaques_immatriculation = models.TextField(
        blank=True,
        null=True,
        verbose_name="Plaques d'immatriculation",
        help_text="Plaques d'immatriculation des véhicules"
    )
    permis_conduire = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Permis de conduire",
        help_text="Numéro de permis de conduire"
    )
    trajets_habituels = models.TextField(
        blank=True,
        null=True,
        verbose_name="Trajets habituels",
        help_text="Itinéraires fréquemment empruntés"
    )
    
    #INFORMATIONS PROFESSIONNELLES / FINANCIÈRES
    profession = models.CharField(max_length=100, blank=True, null=True, verbose_name="Emploi actuel")
    emplois_precedents = models.TextField(
        blank=True,
        null=True,
        verbose_name="Emplois précédents",
        help_text="Historique des emplois précédents"
    )
    sources_revenus = models.TextField(
        blank=True,
        null=True,
        verbose_name="Sources de revenus",
        help_text="Sources de revenus identifiées"
    )
    entreprises_associees = models.TextField(
        blank=True,
        null=True,
        verbose_name="Entreprises associées",
        help_text="Entreprises où il/elle a travaillé ou est associé(e)"
    )
    comptes_bancaires = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comptes bancaires",
        help_text="Informations sur les comptes bancaires (si enquête autorisée)"
    )
    biens_proprietes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Biens ou propriétés",
        help_text="Biens immobiliers, véhicules, etc."
    )
    dettes_importantes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Dettes importantes",
        help_text="Dettes connues ou significatives"
    )
    transactions_suspectes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Transactions suspectes",
        help_text="Transactions financières suspectes identifiées"
    )
    service_militaire = models.CharField(max_length=255, blank=True, null=True, verbose_name="Service militaire")
    
    # RÉSEAU RELATIONNEL
    partenaire_affectif = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Partenaire affectif",
        help_text="Partenaire affectif actuel"
    )
    famille_proche = models.TextField(
        blank=True,
        null=True,
        verbose_name="Famille proche",
        help_text="Membres de la famille proche (parents, frères, sœurs)"
    )
    amis_proches = models.TextField(
        blank=True,
        null=True,
        verbose_name="Amis proches",
        help_text="Amis proches identifiés"
    )
    relations_risque = models.TextField(
        blank=True,
        null=True,
        verbose_name="Relations à risque",
        help_text="Relations identifiées comme potentiellement à risque"
    )
    suspects_associes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Suspects associés",
        help_text="Autres suspects avec qui il/elle est associé(e)"
    )
    membres_reseau_criminel = models.TextField(
        blank=True,
        null=True,
        verbose_name="Membres d'un réseau criminel",
        help_text="Membres identifiés d'un réseau criminel"
    )
    complices_potentiels = models.TextField(
        blank=True,
        null=True,
        verbose_name="Complices potentiels",
        help_text="Complices potentiels identifiés"
    )
    contacts_recurrents = models.TextField(
        blank=True,
        null=True,
        verbose_name="Contacts récurrents",
        help_text="Contacts récurrents identifiés"
    )
    
    # DONNÉES TÉLÉPHONIQUES / NUMÉRIQUES
    imei = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="IMEI",
        help_text="Identifiant IMEI du téléphone"
    )
    imsi = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="IMSI",
        help_text="Identifiant IMSI de la carte SIM"
    )
    telephones_associes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Téléphones associés",
        help_text="Numéros de téléphone et appareils associés"
    )
    cartes_sim = models.TextField(
        blank=True,
        null=True,
        verbose_name="Cartes SIM",
        help_text="Cartes SIM identifiées"
    )
    historique_appels = models.TextField(
        blank=True,
        null=True,
        verbose_name="Historique d'appels",
        help_text="Historique d'appels (si légalement autorisé)"
    )
    geolocalisation_estimee = models.TextField(
        blank=True,
        null=True,
        verbose_name="Géolocalisation estimée",
        help_text="Données de géolocalisation estimée"
    )
    comptes_cloud = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comptes cloud",
        help_text="Comptes cloud identifiés (iCloud, Google Drive, etc.)"
    )
    messages_recuperes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Messages récupérés",
        help_text="Messages récupérés (si autorisés légalement)"
    )
    
    profil_psychologique = models.TextField(
        blank=True,
        null=True,
        verbose_name="Profil psychologique",
        help_text="Analyse psychologique de l'individu"
    )
    motivation_probable = models.TextField(
        blank=True,
        null=True,
        verbose_name="Motivation probable",
        help_text="Motivations probables identifiées"
    )
    mode_operatoire = models.TextField(
        blank=True,
        null=True,
        verbose_name="Mode opératoire",
        help_text="Description du mode opératoire caractéristique"
    )
    signature_criminelle = models.TextField(
        blank=True,
        null=True,
        verbose_name="Signature criminelle",
        help_text="Signature ou caractéristiques distinctives des crimes commis"
    )
    risque_recidive = models.IntegerField(
        choices=[(1, 'Très faible'), (2, 'Faible'), (3, 'Modéré'), (4, 'Élevé'), (5, 'Très élevé')],
        blank=True,
        null=True,
        verbose_name="Risque de récidive",
        help_text="Évaluation du risque de récidive"
    )
    indicateurs_comportementaux = models.TextField(
        blank=True,
        null=True,
        verbose_name="Indicateurs comportementaux",
        help_text="Indicateurs comportementaux observés ou documentés"
    )
    
    # SYNTHÈSE FINALE
    resume_individu = models.TextField(
        blank=True,
        null=True,
        verbose_name="Résumé de l'individu",
        help_text="Synthèse complète de l'individu"
    )
    niveau_risque_global = models.IntegerField(
        choices=[(1, 'Minimal'), (2, 'Faible'), (3, 'Modéré'), (4, 'Élevé'), (5, 'Critique')],
        blank=True,
        null=True,
        verbose_name="Niveau de risque global",
        help_text="Évaluation globale du niveau de risque"
    )
    menace_potentielle = models.TextField(
        blank=True,
        null=True,
        verbose_name="Menace potentielle",
        help_text="Évaluation de la menace potentielle"
    )
    recommandation_surveillance = models.TextField(
        blank=True,
        null=True,
        verbose_name="Recommandation de surveillance",
        help_text="Recommandations spécifiques pour la surveillance"
    )
    actions_futures_recommandees = models.TextField(
        blank=True,
        null=True,
        verbose_name="Actions futures recommandées",
        help_text="Actions recommandées pour les prochaines étapes"
    )
    
    #INFORMATIONS JUDICIAIRES
    motif_arrestation = models.TextField(blank=True, null=True, verbose_name="Motif de l'arrestation")
    date_arrestation = models.DateField(blank=True, null=True, verbose_name="Date d'arrestation")
    province = models.CharField(max_length=100, blank=True, null=True, verbose_name="Province (Historique)", help_text="Province historique d'arrestation")
    region = models.CharField(max_length=100, blank=True, null=True, verbose_name="Région", help_text="Région d'arrestation (23 régions au total)")
    district = models.CharField(max_length=100, blank=True, null=True, verbose_name="District", help_text="District d'arrestation (119 districts au total)")
    lieu_arrestation = models.CharField(max_length=255, blank=True, null=True, verbose_name="Lieu d'arrestation")
    unite_saisie = models.CharField(max_length=255, blank=True, null=True, verbose_name="Unité saisie de l'affaire")
    reference_pv = models.CharField(max_length=100, blank=True, null=True, verbose_name="Référence P.V (Procès-Verbal)")
    suite_judiciaire = models.TextField(blank=True, null=True, verbose_name="Suite judiciaire")
    peine_encourue = models.CharField(max_length=255, blank=True, null=True, verbose_name="Peine encourue")
    antecedent_judiciaire = models.TextField(blank=True, null=True, verbose_name="Antécédent judiciaire")
    
    # HISTORIQUE CRIMINEL COMPLET
    arrestations = models.TextField(
        blank=True,
        null=True,
        verbose_name="Arrestations",
        help_text="Historique des arrestations (dates, lieux, motifs)"
    )
    condamnations = models.TextField(
        blank=True,
        null=True,
        verbose_name="Condamnations",
        help_text="Historique des condamnations (dates, peines, tribunaux)"
    )
    mandats_actifs = models.TextField(
        blank=True,
        null=True,
        verbose_name="Mandats actifs",
        help_text="Mandats d'arrêt actifs"
    )
    mandats_expires = models.TextField(
        blank=True,
        null=True,
        verbose_name="Mandats expirés",
        help_text="Historique des mandats expirés"
    )
    periodes_incarceration = models.TextField(
        blank=True,
        null=True,
        verbose_name="Périodes d'incarcération",
        help_text="Historique des périodes d'incarcération"
    )
    liberte_conditionnelle = models.TextField(
        blank=True,
        null=True,
        verbose_name="Liberté conditionnelle",
        help_text="Informations sur la liberté conditionnelle"
    )
    
    # PREUVES ET DOCUMENTS
    photos_preuves = models.TextField(
        blank=True,
        null=True,
        verbose_name="Photos des preuves",
        help_text="Références aux photos de preuves stockées"
    )
    videos_preuves = models.TextField(
        blank=True,
        null=True,
        verbose_name="Vidéos",
        help_text="Références aux vidéos de preuves stockées"
    )
    audios_interrogatoire = models.TextField(
        blank=True,
        null=True,
        verbose_name="Audios d'interrogatoire",
        help_text="Références aux enregistrements audio d'interrogatoires"
    )
    rapports_scientifiques = models.TextField(
        blank=True,
        null=True,
        verbose_name="Rapports scientifiques (TI)",
        help_text="Rapports du technicien d'investigation"
    )
    analyse_ia = models.TextField(
        blank=True,
        null=True,
        verbose_name="Analyse IA",
        help_text="Résultats d'analyse par intelligence artificielle"
    )
    documents_saisis = models.TextField(
        blank=True,
        null=True,
        verbose_name="Documents saisis",
        help_text="Liste des documents saisis"
    )
    rapport_medicolegal = models.TextField(
        blank=True,
        null=True,
        verbose_name="Rapport médico-légal",
        help_text="Rapport médico-légal si applicable"
    )
    
    record_status = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Statut du dossier",
        help_text="Statut du dossier judiciaire (Actif, Clos, En cours, etc.)"
    )
    
    #STATUT ET MÉTADONNÉES
    niveau_danger = models.IntegerField(
        choices=NIVEAU_DANGER_CHOICES,
        default=2,  # type: ignore
        verbose_name="Niveau de danger",
        help_text="Évaluation du niveau de dangerosité (1=Faible, 5=Extrême)"
    )
    statut_fiche = models.ForeignKey(
        RefStatutFiche, 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='fiches_criminelles',
        verbose_name="Statut de la fiche"
    )
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_enregistrement = models.DateTimeField(auto_now_add=True, verbose_name="Date d'enregistrement")  # Alias pour compatibilité
    date_modification = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    progression = models.PositiveIntegerField(
        default=0,  # type: ignore
        verbose_name="Progression automatique (%)",
        help_text="Progression calculée automatiquement selon les actions liées au dossier",
    )

    #ARCHIVAGE
    is_archived = models.BooleanField(default=False, verbose_name="Archivée", help_text="Indique si la fiche est archivée")  # type: ignore
    
    # MÉTADONNÉES ET TRACABILITÉ
    uuid = models.UUIDField(
        default=uuid.uuid4, 
        editable=False, 
        unique=True,
        verbose_name="UUID",
        help_text="Identifiant unique universel"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fiches_creees',
        verbose_name="Créé par",
        help_text="Utilisateur ayant créé la fiche"
    )
    pdf_exported = models.FileField(
        upload_to='criminels/pdfs/',
        blank=True,
        null=True,
        verbose_name="PDF exporté",
        help_text="Fichier PDF généré de la fiche criminelle"
    )
    pdf_exported_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date d'export PDF",
        help_text="Date de dernière génération du PDF"
    )

    class Meta:
        db_table = 'criminal_fiche_criminelle'
        verbose_name = "Fiche criminelle"
        verbose_name_plural = "Fiches criminelles"
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['numero_fiche']),
            models.Index(fields=['nom', 'prenom']),
            models.Index(fields=['-date_creation']),
        ]

    def __str__(self) -> str:
        if self.prenom:
            return f"{self.nom} {self.prenom}"
        return str(self.nom)
    
    @staticmethod
    def generer_numero_fiche():
        """
        Génère un numéro de fiche au format XXX-CIE/2-RJ
        où XXX est un compteur séquentiel qui se réinitialise chaque 1er janvier
        Vérifie l'unicité pour éviter les doublons en cas de création simultanée
        """
        from django.db import transaction
        from django.db.models import Max
        annee_actuelle = datetime.now().year
        
        # Chercher toutes les fiches de cette année avec le format XXX-CIE/2-RJ
        fiches_annee = CriminalFicheCriminelle.objects.filter(  # type: ignore
            date_creation__year=annee_actuelle,
            numero_fiche__endswith='-CIE/2-RJ'
        ).values_list('numero_fiche', flat=True)
        
        # Trouver le numéro maximum
        max_numero = 0
        for numero_fiche in fiches_annee:
            try:
                numero_seq_str = numero_fiche.split('-')[0]
                if len(numero_seq_str) == 3 and numero_seq_str.isdigit():
                    numero_seq = int(numero_seq_str)
                    if numero_seq > max_numero:
                        max_numero = numero_seq
            except (ValueError, IndexError):
                continue
        
        # Générer un nouveau numéro en vérifiant l'unicité
        max_tentatives = 100  # Limite de sécurité pour éviter une boucle infinie
        tentative = 0
        
        while tentative < max_tentatives:
            nouveau_numero = max_numero + 1 + tentative
            numero_fiche = f"{nouveau_numero:03d}-CIE/2-RJ"
            
            try:
                with transaction.atomic():
                    if not CriminalFicheCriminelle.objects.filter(numero_fiche=numero_fiche).exists():  # type: ignore
                        return numero_fiche
            except Exception:
                pass  # En cas d'erreur, continuer avec le numéro suivant
            
            tentative += 1
        
        # En cas d'échec après toutes les tentatives, utiliser un timestamp
        import time
        timestamp = int(time.time()) % 1000
        return f"{timestamp:03d}-CIE/2-RJ"
    
    def save(self, *args, **kwargs):
        """
        Surcharge de la méthode save pour générer automatiquement le numéro de fiche
        et mettre à jour le statut automatiquement
        Gère les erreurs d'unicité en cas de création simultanée
        """
        from django.db import IntegrityError
        
        if not self.numero_fiche:
            self.numero_fiche = self.generer_numero_fiche()
        
        update_fields = kwargs.get('update_fields', None)
        if update_fields is None or 'is_archived' in update_fields:
            # Ne pas mettre à jour automatiquement si on est en train de mettre à jour explicitement le statut
            # Sauf si on archive/désarchive
            self.update_statut_automatique(commit=False)
        
        # Essayer de sauvegarder, en cas d'erreur d'unicité, générer un nouveau numéro
        max_tentatives = 5
        tentative = 0
        
        while tentative < max_tentatives:
            try:
                super().save(*args, **kwargs)
                return  # Succès, sortir de la boucle
            except IntegrityError as e:
                # Si c'est une erreur d'unicité sur numero_fiche
                if 'numero_fiche' in str(e) or 'numero_fiche_key' in str(e):
                    tentative += 1
                    if tentative >= max_tentatives:
                        # Si toutes les tentatives ont échoué, lever l'erreur
                        raise
                    # Générer un nouveau numéro et réessayer
                    self.numero_fiche = self.generer_numero_fiche()
                else:
                    # Si c'est une autre erreur d'intégrité, la lever
                    raise

    def update_statut_automatique(self, commit: bool = True):
        """
        Met à jour automatiquement le statut de la fiche selon les conditions :
        - Si archivée : statut "archive"
        - Si toutes les infractions sont clôturées : statut "cloture"
        - Si aucune infraction ou infractions en cours : statut "en_cours"
        - Par défaut à la création : statut "en_cours"
        """
        try:
            # Si la fiche est archivée, mettre le statut "archive"
            if self.is_archived:
                statut_archive = RefStatutFiche.objects.filter(code='archive').first()  # type: ignore
                if statut_archive and (not self.statut_fiche or self.statut_fiche != statut_archive):
                    self.statut_fiche = statut_archive
                    if commit:
                        self.save(update_fields=['statut_fiche', 'date_modification'])
                    return
            
            # Vérifier les infractions
            infractions = self.infractions.all()  # type: ignore
            if infractions.exists():
                # Vérifier si toutes les infractions sont clôturées
                statut_cloture = RefStatutAffaire.objects.filter(code='cloture').first()  # type: ignore
                if statut_cloture:
                    toutes_cloturees = all(
                        infraction.statut_affaire and infraction.statut_affaire.code == 'cloture'  # type: ignore
                        for infraction in infractions
                    )
                    
                    if toutes_cloturees:
                        # Toutes les infractions sont clôturées
                        statut_fiche_cloture = RefStatutFiche.objects.filter(code='cloture').first()  # type: ignore
                        if statut_fiche_cloture and (not self.statut_fiche or self.statut_fiche != statut_fiche_cloture):
                            self.statut_fiche = statut_fiche_cloture
                            if commit:
                                self.save(update_fields=['statut_fiche', 'date_modification'])
                            return
            
            # Si pas de statut ou statut différent de "en_cours", mettre "en_cours"
            statut_en_cours = RefStatutFiche.objects.filter(code='en_cours').first()  # type: ignore
            if statut_en_cours and (not self.statut_fiche or self.statut_fiche.code != 'en_cours'):  # type: ignore
                self.statut_fiche = statut_en_cours
                if commit:
                    self.save(update_fields=['statut_fiche', 'date_modification'])
        except Exception as e:
            # En cas d'erreur, ne pas bloquer la sauvegarde
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Erreur lors de la mise à jour automatique du statut pour la fiche {getattr(self, 'id', 'N/A')}: {str(e)}")

    def update_progression(self, commit: bool = True) -> int:
        """
        Recalcule la progression automatique d'un dossier criminel selon le barème défini.
        """
        total = 0

        # Assignation
        if self.assignations.exists():  # type: ignore
            total += 10

        # Preuves
        preuve_count = self.preuves.count()  # type: ignore
        if preuve_count:
            total += 10 + max(0, preuve_count - 1) * 5

        # Observation / Notes
        if self.observations_enquete.exists():  # type: ignore
            total += 10

        validated_reports = self.rapports_enquete.filter(statut="valide")  # type: ignore
        total += validated_reports.count() * 20

        final_report_exists = validated_reports.filter(  # type: ignore
            Q(titre__icontains="final") | Q(titre__icontains="clôture") | Q(titre__icontains="cloture")  # type: ignore
        ).exists()
        if final_report_exists:
            total += 40

        total = max(0, min(100, total))

        if total != self.progression:
            self.progression = total
            if commit:
                self.save(update_fields=["progression", "date_modification"])
        progression_value = getattr(self, 'progression', 0)
        return int(progression_value) if isinstance(progression_value, (int, float)) else 0


class CriminalTypeInfraction(models.Model):
    """
    Type d'infraction détaillé avec gravité et peines
    """
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=200)
    type_infraction = models.ForeignKey(
        RefTypeInfraction, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='types_infractions_detailles'
    )
    gravite = models.IntegerField(
        default=1,  # type: ignore
        help_text="Niveau de gravité de 1 à 10"
    )
    description = models.TextField(blank=True, null=True)
    peine_minimale = models.CharField(max_length=100, blank=True, null=True)
    peine_maximale = models.CharField(max_length=100, blank=True, null=True)
    article_loi = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Référence de l'article de loi"
    )
    actif = models.BooleanField(default=True)  # type: ignore
    couleur = models.CharField(
        max_length=7, 
        default='#6c757d',
        help_text="Couleur hexadécimale pour l'affichage"
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criminal_type_infraction'
        verbose_name = "Type d'infraction détaillé"
        verbose_name_plural = "Types d'infractions détaillés"
        ordering = ['-gravite', 'libelle']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['gravite']),
        ]

    def __str__(self) -> str:
        return str(self.libelle)


class CriminalInfraction(models.Model):
    """
    Infraction commise par un criminel
    """
    fiche = models.ForeignKey(
        CriminalFicheCriminelle, 
        on_delete=models.CASCADE, 
        related_name='infractions'
    )
    numero_affaire = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Numéro d'affaire",
        help_text="Numéro de référence de l'affaire judiciaire"
    )
    type_infraction = models.ForeignKey(
        CriminalTypeInfraction, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='infractions_par_type'
    )
    date_infraction = models.DateField()
    lieu = models.CharField(max_length=200)
    description_detaillee = models.TextField(
        blank=True,
        null=True,
        verbose_name="Description détaillée",
        help_text="Description complète et détaillée de l'infraction"
    )
    description = models.TextField(blank=True, null=True)  # Garder pour compatibilité
    enqueteur_responsable = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Enquêteur responsable",
        help_text="Nom et fonction de l'enquêteur responsable"
    )
    preuves_associees = models.TextField(
        blank=True,
        null=True,
        verbose_name="Preuves associées",
        help_text="Liste des preuves associées à cette infraction"
    )
    statut_affaire = models.ForeignKey(
        RefStatutAffaire, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='infractions_par_statut'
    )
    statut_affaire_texte = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Statut de l'affaire",
        help_text="En cours / Clôturée / Classée"
    )
    date_enregistrement = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'criminal_infraction'
        verbose_name = "Infraction"
        verbose_name_plural = "Infractions"
        ordering = ['-date_infraction']
        indexes = [
            models.Index(fields=['fiche', '-date_infraction']),
            models.Index(fields=['date_infraction']),
        ]

    def save(self, *args, **kwargs):
        """
        Surcharge de la méthode save pour mettre à jour automatiquement le statut de la fiche
        """
        super().save(*args, **kwargs)
        
        # Mettre à jour le statut de la fiche associée
        if self.fiche:
            try:
                self.fiche.update_statut_automatique(commit=True)  # type: ignore
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                fiche_id = getattr(self.fiche, 'id', 'N/A') if self.fiche else 'N/A'
                logger.warning(f"Erreur lors de la mise à jour automatique du statut de la fiche {fiche_id}: {str(e)}")
    
    def delete(self, *args, **kwargs):
        """
        Surcharge de la méthode delete pour mettre à jour le statut de la fiche après suppression
        """
        fiche = self.fiche
        result = super().delete(*args, **kwargs)
        
        # Mettre à jour le statut de la fiche après suppression de l'infraction
        if fiche:
            try:
                fiche.update_statut_automatique(commit=True)  # type: ignore
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                fiche_id = getattr(fiche, 'id', 'N/A') if fiche else 'N/A'
                logger.warning(f"Erreur lors de la mise à jour automatique du statut de la fiche {fiche_id}: {str(e)}")
        
        return result

    def __str__(self) -> str:
        try:
            type_str = getattr(self.type_infraction, 'libelle', 'Infraction sans type') if self.type_infraction else "Infraction sans type"  # type: ignore
        except Exception:
            type_str = "Infraction sans type"
        
        try:
            nom_str = getattr(self.fiche, 'nom', 'Fiche inconnue') if self.fiche else "Fiche inconnue"  # type: ignore
        except Exception:
            nom_str = "Fiche inconnue"
        
        return f"{type_str} - {nom_str}"


class AssignmentStatus(models.TextChoices):
    EN_ATTENTE = "pending", "En attente"
    EN_COURS = "in_progress", "En cours"
    SUSPENDUE = "on_hold", "Suspendue"
    CLOTUREE = "closed", "Clôturée"
    ECHEANCE_DEPASSEE = "overdue", "Échéance dépassée"


class InvestigationAssignment(models.Model):
    """
    Assignation d'une enquête à un enquêteur.
    """

    fiche = models.ForeignKey(
        CriminalFicheCriminelle,
        on_delete=models.CASCADE,
        related_name="assignations",
        verbose_name="Dossier criminel",
    )
    assigned_investigator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Enquêteur assigné",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Assigné par",
        null=True,
        blank=True,
    )
    instructions = models.TextField(blank=True, null=True, verbose_name="Instructions")
    status = models.CharField(
        max_length=20,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.EN_ATTENTE,
        verbose_name="Statut",
    )
    priority = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Priorité",
        help_text="Optionnel : faible, normale, élevée…",
    )
    assignment_date = models.DateTimeField(
        auto_now_add=True, verbose_name="Date d'assignation"
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date limite",
        help_text="Date limite de finalisation de l'assignation (échéance)",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Mis à jour le")

    class Meta:
        db_table = "investigation_assignment"
        verbose_name = "Assignation d'enquête"
        verbose_name_plural = "Assignations d'enquêtes"
        ordering = ("-assignment_date", "-id")
        indexes = [
            models.Index(fields=("status",)),
            models.Index(fields=("assigned_investigator", "status")),
            models.Index(fields=("fiche", "assignment_date")),
        ]

    def __str__(self) -> str:
        numero_fiche = getattr(self.fiche, 'numero_fiche', 'N/A') if self.fiche else 'N/A'
        investigator = str(self.assigned_investigator) if self.assigned_investigator else 'Non assigné'
        return f"Assignation {numero_fiche} → {investigator}"

    def is_overdue(self):
        """
        Vérifie si l'assignation a dépassé sa date limite.
        """
        if not self.due_date:
            return False
        from django.utils import timezone
        today = timezone.now().date()
        return self.due_date < today

    def check_and_update_status(self):
        """
        Vérifie l'échéance et met à jour automatiquement le statut si nécessaire.
        Retourne True si le statut a été modifié.
        """
        if self.status == AssignmentStatus.CLOTUREE:
            return False
        
        if self.is_overdue() and self.status != AssignmentStatus.ECHEANCE_DEPASSEE:
            self.status = AssignmentStatus.ECHEANCE_DEPASSEE
            self.save(update_fields=['status', 'updated_at'])
            return True
        return False

    def can_be_confirmed(self):
        """
        Vérifie si l'assignation peut être confirmée.
        Retourne (can_confirm, reason) où can_confirm est un booléen et reason est un message.
        """
        if self.status == AssignmentStatus.CLOTUREE:
            return False, "Cette assignation est déjà clôturée."
        
        if self.is_overdue():
            return False, "L'échéance de cette assignation est dépassée. Veuillez contacter votre superviseur."
        
        if self.status == AssignmentStatus.EN_COURS:
            return False, "Cette assignation est déjà en cours."
        
        return True, None
