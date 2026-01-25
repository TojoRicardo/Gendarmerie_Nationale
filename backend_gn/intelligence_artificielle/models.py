# pylint: disable=import-error
from django.db import models
from django.conf import settings
import uuid


class IAReconnaissanceFaciale(models.Model):
    """
    Résultats de reconnaissance faciale générés par le module d'intelligence artificielle.
    Compare une image d'entrée avec la base de données des criminels.
    """
    image_analysee = models.ImageField(upload_to='ia/reconnaissance/')
    criminel_identifie = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resultats_reconnaissance_ia'
    )
    score_confiance = models.FloatField(verbose_name="Score de confiance (%)")
    date_analyse = models.DateTimeField(auto_now_add=True, verbose_name="Date d'analyse")
    analyse_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Analysé par'
    )
    statut = models.CharField(
        max_length=50,
        choices=[
            ('correspondance_trouvee', 'Correspondance trouvée'),
            ('aucune_correspondance', 'Aucune correspondance'),
            ('en_attente', 'En attente de validation'),
        ],
        default='en_attente',
        verbose_name="Statut de l'analyse"
    )

    class Meta:
        db_table = 'ia_reconnaissance_faciale'
        verbose_name = 'Analyse IA - Reconnaissance faciale'
        verbose_name_plural = 'Analyses IA - Reconnaissances faciales'
        ordering = ['-date_analyse']

    def __str__(self):
        if self.criminel_identifie:
            return f"Match {self.criminel_identifie.nom_complet} ({self.score_confiance}%)"
        return f"Analyse IA du {self.date_analyse.strftime('%d/%m/%Y %H:%M')}"


class IAFaceEmbedding(models.Model):
    """Embeddings ArcFace associés aux fiches criminelles (photo ou vidéo)."""

    class SourceType(models.TextChoices):
        PHOTO = "photo", "Photo uploadée"
        VIDEO = "video", "Flux vidéo"

    criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='ia_face_embeddings',
        verbose_name='Criminel'
    )
    embedding_vector = models.JSONField(
        verbose_name='Vecteur d\'encodage',
        help_text="Embedding facial normalisé (liste de 512 floats)"
    )
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.PHOTO,
        verbose_name='Source de capture'
    )
    image_capture = models.ImageField(
        upload_to='ia/embeddings/',
        blank=True,
        null=True,
        verbose_name='Image associée'
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Métadonnées annexes'
    )
    actif = models.BooleanField(default=True, verbose_name='Actif')
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    mis_a_jour_le = models.DateTimeField(auto_now=True, verbose_name='Dernière mise à jour')

    class Meta:
        db_table = 'ia_face_embedding'
        verbose_name = 'Encodage facial IA'
        verbose_name_plural = 'Encodages faciaux IA'
        ordering = ['-cree_le']
        indexes = [
            models.Index(fields=['criminel', '-cree_le']),
            models.Index(fields=['source_type']),
        ]

    def __str__(self):
        return f"Embedding IA #{self.pk} - {self.criminel} ({self.source_type})"


class RechercheIA(models.Model):
    """Journalisation des recherches faciales effectuées par les utilisateurs."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name="Utilisateur",
    )
    image_query = models.ImageField(
        upload_to="ia/recherches/",
        verbose_name="Image soumise",
    )
    seuil = models.FloatField(default=0.6, verbose_name="Seuil utilisé")
    top_n = models.PositiveIntegerField(default=3, verbose_name="Nombre de résultats demandés")
    resultats = models.JSONField(default=list, verbose_name="Résultats renvoyés")
    date_recherche = models.DateTimeField(auto_now_add=True, verbose_name="Date de la recherche")

    class Meta:
        db_table = "ia_recherche"
        verbose_name = "Recherche faciale IA"
        verbose_name_plural = "Recherches faciales IA"
        ordering = ["-date_recherche"]

    def __str__(self) -> str:
        user_display = self.user.get_full_name() if self.user else "Utilisateur inconnu"
        return f"Recherche IA ({user_display}) - {self.date_recherche:%d/%m/%Y %H:%M}"


class IAAnalyseStatistique(models.Model):
    """
    Analyses statistiques effectuées par le module IA :
    - taux de récidive
    - répartition géographique
    - typologie de crimes
    - détection de tendances
    """
    titre = models.CharField(max_length=255, verbose_name="Titre de l'analyse")
    description = models.TextField(verbose_name="Description de l'analyse")
    date_generation = models.DateTimeField(auto_now_add=True, verbose_name='Date de génération')
    donnees_source = models.JSONField(verbose_name='Données sources utilisées (JSON)')
    resultat = models.JSONField(verbose_name='Résultats analytiques (JSON)')
    genere_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Généré par'
    )

    class Meta:
        db_table = 'ia_analyse_statistique'
        verbose_name = 'Analyse statistique IA'
        verbose_name_plural = 'Analyses statistiques IA'
        ordering = ['-date_generation']

    def __str__(self):
        return f"{self.titre} ({self.date_generation.strftime('%d/%m/%Y')})"


class IAMatchBiometrique(models.Model):
    """
    Enregistre les correspondances trouvées automatiquement par l'IA :
    empreintes, visages, ou autres données biométriques.
    """
    type_match = models.CharField(
        max_length=50,
        choices=[
            ('visage', 'Reconnaissance faciale'),
            ('empreinte', 'Reconnaissance dactyloscopique'),
        ],
        verbose_name='Type de correspondance'
    )
    criminel_source = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='matches_source'
    )
    criminel_correspondant = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matches_correspondants'
    )
    pourcentage_similarite = models.FloatField(verbose_name='Taux de similarité (%)')
    date_detection = models.DateTimeField(auto_now_add=True, verbose_name='Date de détection')
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Validé par'
    )
    statut_validation = models.CharField(
        max_length=50,
        choices=[
            ('valide', 'Validé'),
            ('rejete', 'Rejeté'),
            ('en_attente', 'En attente')
        ],
        default='en_attente',
        verbose_name='Statut de validation'
    )

    class Meta:
        db_table = 'ia_match_biometrique'
        verbose_name = 'Correspondance biométrique IA'
        verbose_name_plural = 'Correspondances biométriques IA'
        ordering = ['-date_detection']

    def __str__(self):
        return f"{self.type_match.capitalize()} - Similarité : {self.pourcentage_similarite}%"


class IAPrediction(models.Model):
    """
    Table pour les analyses prédictives des comportements ou risques criminels.
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    fiche_criminelle = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='predictions'
    )
    type_prediction = models.CharField(
        max_length=100,
        choices=[
            ('recidive', 'Risque de récidive'),
            ('zone_risque', 'Zone à risque'),
            ('profil_dangerosite', 'Profil de dangerosité'),
            ('association_criminelle', 'Probabilité d\'association criminelle'),
        ],
        verbose_name='Type de prédiction'
    )
    resultat_prediction = models.JSONField(default=dict)
    score_confiance = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    date_generation = models.DateTimeField(auto_now_add=True)
    genere_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    observations = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'ia_prediction'
        verbose_name = "Analyse prédictive IA"
        verbose_name_plural = "Analyses prédictives IA"

    def __str__(self):
        return f"{self.fiche_criminelle.numero_fiche} - {self.type_prediction}"


class IAPattern(models.Model):
    """
    Représente un schéma ou un comportement criminel détecté par l'IA.
    Exemple : même mode opératoire, même zone, même période, etc.
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    nom_pattern = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    type_pattern = models.CharField(
        max_length=100,
        choices=[
            ('modus_operandi', 'Mode opératoire'),
            ('zone_criminelle', 'Zone géographique'),
            ('periode', 'Période temporelle'),
            ('profil', 'Profil comportemental'),
        ],
        verbose_name="Type de schéma détecté"
    )
    frequence = models.IntegerField(default=0)
    niveau_risque = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    donnees_sources = models.JSONField(default=dict, blank=True)
    date_detection = models.DateTimeField(auto_now_add=True)
    detecte_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )

    class Meta:
        db_table = 'ia_pattern'
        verbose_name = "Schéma criminel détecté"
        verbose_name_plural = "Schémas criminels détectés"

    def __str__(self):
        return self.nom_pattern


class IACorrelation(models.Model):
    """
    Table reliant plusieurs entités (criminels, infractions, zones, etc.)
    lorsqu'une corrélation est détectée automatiquement.
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    criminels = models.ManyToManyField(
        'criminel.CriminalFicheCriminelle',
        related_name='correlations'
    )
    infractions = models.ManyToManyField(
        'criminel.CriminalInfraction',
        related_name='correlations',
        blank=True
    )
    pattern_associe = models.ForeignKey(
        IAPattern,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='correlations'
    )
    type_correlation = models.CharField(
        max_length=100,
        choices=[
            ('lieu', 'Même lieu'),
            ('temps', 'Même période'),
            ('modus_operandi', 'Même modus operandi'),
            ('complice', 'Liens de complicité'),
            ('profil', 'Profil comportemental similaire'),
        ],
        verbose_name="Type de corrélation"
    )
    degre_correlation = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    resume = models.TextField(blank=True, null=True)
    date_detection = models.DateTimeField(auto_now_add=True)
    analyse_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )

    class Meta:
        db_table = 'ia_correlation'
        verbose_name = "Corrélation IA"
        verbose_name_plural = "Corrélations IA"

    def __str__(self):
        return f"Corrélation {self.type_correlation} - {self.degre_correlation}%"




class IACaseAnalysis(models.Model):
    """
    Analyse prédictive complète d'un dossier criminel.
    Utilise machine learning pour prédire les comportements futurs.
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    fiche_criminelle = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='ia_case_analyses',
        verbose_name='Fiche criminelle'
    )
    
    # Type d'analyse
    type_analyse = models.CharField(
        max_length=100,
        choices=[
            ('complet', 'Analyse complète'),
            ('recidive', 'Risque de récidive'),
            ('dangerosite', 'Profil de dangerosité'),
            ('zones_risque', 'Zones à risque'),
            ('associations', 'Associations criminelles'),
            ('comportement', 'Prédiction comportementale'),
        ],
        default='complet',
        verbose_name='Type d\'analyse'
    )
    
    # Résultats de l'analyse
    resultats = models.JSONField(
        default=dict,
        verbose_name='Résultats de l\'analyse',
        help_text='Résultats détaillés de l\'analyse prédictive'
    )
    
    # Scores et métriques
    score_risque_global = models.FloatField(
        default=0.0,
        verbose_name='Score de risque global (0-100)'
    )
    score_confiance = models.FloatField(
        default=0.0,
        verbose_name='Score de confiance de la prédiction (0-100)'
    )
    
    # Liens et corrélations détectées
    liens_detectes = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Liens détectés',
        help_text='Liste des liens entre suspects détectés'
    )
    
    # Recommandations
    recommandations = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Recommandations',
        help_text='Recommandations basées sur l\'analyse'
    )
    
    # Métadonnées
    model_version = models.CharField(
        max_length=50,
        default='1.0',
        verbose_name='Version du modèle utilisé'
    )
    features_utilisees = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Features utilisées',
        help_text='Liste des features utilisées pour l\'analyse'
    )
    
    date_analyse = models.DateTimeField(auto_now_add=True, verbose_name='Date d\'analyse')
    analyse_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ia_case_analyses',
        verbose_name='Analysé par'
    )
    
    class Meta:
        db_table = 'ia_case_analysis'
        verbose_name = 'Analyse de dossier IA'
        verbose_name_plural = 'Analyses de dossiers IA'
        ordering = ['-date_analyse']
        indexes = [
            models.Index(fields=['fiche_criminelle', '-date_analyse']),
            models.Index(fields=['type_analyse']),
            models.Index(fields=['-score_risque_global']),
        ]
    
    def __str__(self):
        return f"Analyse {self.fiche_criminelle.numero_fiche} - {self.type_analyse}"


class IAModelTraining(models.Model):
    """
    Journal des entraînements et mises à jour des modèles IA.
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    nom_modele = models.CharField(
        max_length=200,
        verbose_name='Nom du modèle'
    )
    type_modele = models.CharField(
        max_length=100,
        choices=[
            ('prediction', 'Prédiction comportementale'),
            ('face_recognition', 'Reconnaissance faciale'),
            ('risk_assessment', 'Évaluation des risques'),
        ],
        verbose_name='Type de modèle'
    )
    
    # Paramètres d'entraînement
    parametres_entrainement = models.JSONField(
        default=dict,
        verbose_name='Paramètres d\'entraînement'
    )
    
    # Métriques de performance
    metriques = models.JSONField(
        default=dict,
        verbose_name='Métriques de performance',
        help_text='Accuracy, precision, recall, F1-score, etc.'
    )
    
    # Données d'entraînement
    nb_echantillons = models.IntegerField(
        default=0,
        verbose_name='Nombre d\'échantillons utilisés'
    )
    date_debut = models.DateTimeField(verbose_name='Date de début')
    date_fin = models.DateTimeField(null=True, blank=True, verbose_name='Date de fin')
    
    # Statut
    statut = models.CharField(
        max_length=50,
        choices=[
            ('en_cours', 'En cours'),
            ('termine', 'Terminé'),
            ('erreur', 'Erreur'),
            ('annule', 'Annulé'),
        ],
        default='en_cours',
        verbose_name='Statut'
    )
    
    # Fichiers du modèle
    chemin_modele = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Chemin du modèle sauvegardé'
    )
    
    # Version
    version = models.CharField(
        max_length=50,
        default='1.0',
        verbose_name='Version du modèle'
    )
    
    entraine_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ia_model_trainings',
        verbose_name='Entraîné par'
    )
    
    observations = models.TextField(blank=True, null=True, verbose_name='Observations')
    
    class Meta:
        db_table = 'ia_model_training'
        verbose_name = 'Entraînement de modèle IA'
        verbose_name_plural = 'Entraînements de modèles IA'
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['type_modele', '-date_debut']),
            models.Index(fields=['statut']),
        ]
    
    def __str__(self):
        return f"{self.nom_modele} - {self.type_modele} ({self.version})"