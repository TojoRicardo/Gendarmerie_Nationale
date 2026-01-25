from django.db import models, connection
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.utils import ProgrammingError, OperationalError
import os


def validate_image_file(value):
    valid_extensions = ['.jpg', '.jpeg', '.png']
    
    if not value or not hasattr(value, 'name') or not value.name:
        raise ValidationError('Nom de fichier manquant')
    
    ext = os.path.splitext(value.name)[1].lower()
    
    if ext not in valid_extensions:
        raise ValidationError(
            f'Les seuls formats acceptés sont: {", ".join(valid_extensions)}'
        )
    
    max_size = 10 * 1024 * 1024
    if hasattr(value, 'size') and value.size > max_size:
        raise ValidationError('La taille du fichier ne doit pas dépasser 10 MB')


def _table_exists(table_name):
    try:
        return table_name in connection.introspection.table_names()
    except (ProgrammingError, OperationalError):
        return False
    except Exception:
        return False


class OptionalTableQuerySet(models.QuerySet):
    def _missing_table(self):
        return not _table_exists(self.model._meta.db_table)

    def iterator(self, *args, **kwargs):
        if self._missing_table():
            return (x for x in ())
        return super().iterator(*args, **kwargs)

    def update(self, **kwargs):
        if self._missing_table():
            return 0
        return super().update(**kwargs)

    def delete(self):
        if self._missing_table():
            return (0, {})
        return super().delete()

    def exists(self):
        if self._missing_table():
            return False
        return super().exists()

    def count(self):
        if self._missing_table():
            return 0
        return super().count()

    def __len__(self):
        if self._missing_table():
            return 0
        return super().__len__()


class OptionalTableManager(models.Manager):
    def get_queryset(self):
        return OptionalTableQuerySet(self.model, using=self._db)


class Biometrie(models.Model):
    criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='encodages_biometriques',
        verbose_name='Criminel'
    )
    photo = models.ImageField(
        upload_to='biometrie/photos/',
        validators=[validate_image_file],
        verbose_name='Photo source'
    )
    encodage_facial = models.JSONField(
        verbose_name='Encodage facial',
        help_text='Vecteur d\'encodage facial généré par ArcFace'
    )
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date d\'enregistrement'
    )

    class Meta:
        db_table = 'biometrie_encodage'
        verbose_name = 'Encodage biométrique'
        verbose_name_plural = 'Encodages biométriques'
        ordering = ['-date_enregistrement']
        indexes = [
            models.Index(fields=['criminel', '-date_enregistrement'])
        ]

    def __str__(self):
        return f"Encodage biométrique #{self.pk} - {self.criminel}"

    objects = OptionalTableManager()


class BiometriePhoto(models.Model):
    TYPE_PHOTO_CHOICES = [
        ('face', 'Face'),
        ('profil_gauche', 'Profil gauche'),
        ('profil_droit', 'Profil droit'),
        ('face_3_4', 'Face 3/4'),
        ('plein_pied', 'Photo plein pied'),
        ('contextuelle', 'Photo contextuelle'),
        ('tatouage', 'Photo de tatouage'),
        ('cicatrice', 'Photo de cicatrice'),
        ('marque', 'Photo de marque particulière'),
    ]
    
    criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='photos_biometriques',
        verbose_name='Criminel'
    )
    image = models.ImageField(
        upload_to='biometrie/photos/',
        verbose_name='Image',
        help_text='Photo biométrique du criminel (JPG, PNG uniquement, max 10MB)',
        validators=[validate_image_file]
    )
    type_photo = models.CharField(
        max_length=50,
        choices=TYPE_PHOTO_CHOICES,
        verbose_name='Type de photo'
    )
    qualite = models.IntegerField(
        default=0,  # type: ignore[assignment]
        verbose_name='Qualité de l\'image',
        help_text='Score de qualité de 0 à 100'
    )
    encodage_facial = models.TextField(
        blank=True,
        null=True,
        verbose_name='Encodage facial',
        help_text='Encodage biométrique pour la reconnaissance faciale (format JSON)'
    )
    embedding_512 = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Embedding ArcFace 512-d',
        help_text='Vecteur d\'embedding ArcFace de 512 dimensions (format JSON array)'
    )
    landmarks_106 = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Landmarks 106 points',
        help_text='106 points de repère faciaux [[x, y], ...] (format JSON array)'
    )
    facemesh_468 = models.JSONField(
        blank=True,
        null=True,
        verbose_name='FaceMesh 468 points 3D',
        help_text='468 points 3D FaceMesh [[x, y, z], ...] (format JSON array)'
    )
    morphable_3d = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Modèle 3D Morphable',
        help_text='Paramètres du modèle 3D Morphable (vertices, shape_params, etc.)'
    )
    taille_fichier = models.IntegerField(
        blank=True,
        null=True,
        verbose_name='Taille du fichier (bytes)'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notes',
        help_text='Observations sur la photo'
    )
    date_capture = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de capture'
    )
    date_mise_a_jour = models.DateTimeField(
        auto_now=True,
        verbose_name='Dernière mise à jour',
        help_text='Date de dernière mise à jour (embedding, landmarks, etc.)'
    )
    niveau_confiance = models.FloatField(
        blank=True,
        null=True,
        verbose_name='Niveau de confiance',
        help_text='Niveau de confiance de l\'embedding ArcFace (0.0 à 1.0)',
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    capture_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Capturée par'
    )
    est_principale = models.BooleanField(
        default=False,  # type: ignore[assignment]
        verbose_name='Photo principale',
        help_text='Indique si cette photo est la photo principale du dossier'
    )
    est_active = models.BooleanField(
        default=True,  # type: ignore[assignment]
        verbose_name='Active',
        help_text='Indique si cette photo est utilisable pour la reconnaissance faciale'
    )

    class Meta:
        db_table = 'biometrie_photo'
        verbose_name = 'Photo biométrique'
        verbose_name_plural = 'Photos biométriques'
        ordering = ['-date_capture']
        indexes = [
            models.Index(fields=['criminel', '-date_capture']),
            models.Index(fields=['type_photo']),
            models.Index(fields=['est_principale']),
        ]

    def __str__(self):
        try:
            if hasattr(self, 'criminel') and self.criminel:
                criminel_obj = self.criminel
                nom = getattr(criminel_obj, 'nom', '')
                prenom = getattr(criminel_obj, 'prenom', '')
                if nom or prenom:
                    return f"Photo {self.type_photo} de {nom} {prenom}"
        except Exception:
            pass
        return f"Photo {self.type_photo}"

    def clean(self):
        if self.qualite < 0 or self.qualite > 100:
            raise ValidationError({'qualite': 'La qualité doit être entre 0 et 100'})
    
    def save(self, *args, **kwargs):
        if self.image and hasattr(self.image, 'size'):
            self.taille_fichier = getattr(self.image, 'size', None)
        
        if self.est_principale:
            BiometriePhoto.objects.filter(
                criminel=self.criminel,
                est_principale=True
            ).exclude(pk=self.pk).update(est_principale=False)
        
        super().save(*args, **kwargs)
    
    def get_file_extension(self):
        if self.image:
            name = getattr(self.image, 'name', None) or ''
            return os.path.splitext(str(name))[1] or None
        return None

    objects = OptionalTableManager()


class BiometrieEmpreinte(models.Model):
    DOIGT_CHOICES = [
        ('pouce_droit', 'Pouce droit'),
        ('index_droit', 'Index droit'),
        ('majeur_droit', 'Majeur droit'),
        ('annulaire_droit', 'Annulaire droit'),
        ('auriculaire_droit', 'Auriculaire droit'),
        ('pouce_gauche', 'Pouce gauche'),
        ('index_gauche', 'Index gauche'),
        ('majeur_gauche', 'Majeur gauche'),
        ('annulaire_gauche', 'Annulaire gauche'),
        ('auriculaire_gauche', 'Auriculaire gauche'),
    ]
    
    TYPE_EMPREINTE_CHOICES = [
        ('arche', 'Arche'),
        ('boucle', 'Boucle'),
        ('verticille', 'Verticille'),
        ('composite', 'Composite'),
    ]
    
    criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='empreintes_digitales',
        verbose_name='Criminel'
    )
    image = models.ImageField(
        upload_to='biometrie/empreintes/',
        verbose_name='Image de l\'empreinte',
        validators=[validate_image_file]
    )
    doigt = models.CharField(
        max_length=50,
        choices=DOIGT_CHOICES,
        verbose_name='Doigt'
    )
    type_empreinte = models.CharField(
        max_length=50,
        choices=TYPE_EMPREINTE_CHOICES,
        blank=True,
        null=True,
        verbose_name='Type d\'empreinte',
        help_text='Classification dactyloscopique'
    )
    qualite = models.IntegerField(
        default=0,  # type: ignore[assignment]
        verbose_name='Qualité de l\'empreinte',
        help_text='Score de qualité de 0 à 100'
    )
    minuties = models.TextField(
        blank=True,
        null=True,
        verbose_name='Minuties',
        help_text='Points caractéristiques de l\'empreinte (format JSON)'
    )
    nombre_minuties = models.IntegerField(
        default=0,  # type: ignore[assignment]
        verbose_name='Nombre de minuties détectées'
    )
    encodage_empreinte = models.TextField(
        blank=True,
        null=True,
        verbose_name='Encodage de l\'empreinte',
        help_text='Encodage biométrique pour la reconnaissance (format JSON)'
    )
    taille_fichier = models.IntegerField(
        blank=True,
        null=True,
        verbose_name='Taille du fichier (bytes)'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notes',
        help_text='Observations sur l\'empreinte'
    )
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date d\'enregistrement'
    )
    enregistre_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Enregistrée par'
    )
    est_active = models.BooleanField(
        default=True,  # type: ignore[assignment]
        verbose_name='Active',
        help_text='Indique si cette empreinte est utilisable pour la reconnaissance'
    )

    class Meta:
        db_table = 'biometrie_empreinte'
        verbose_name = 'Empreinte digitale'
        verbose_name_plural = 'Empreintes digitales'
        ordering = ['-date_enregistrement']
        unique_together = ['criminel', 'doigt']
        indexes = [
            models.Index(fields=['criminel', 'doigt']),
            models.Index(fields=['type_empreinte']),
            models.Index(fields=['-date_enregistrement']),
        ]

    def __str__(self):
        try:
            if hasattr(self, 'criminel') and self.criminel:
                criminel_obj = self.criminel
                nom = getattr(criminel_obj, 'nom', '')
                prenom = getattr(criminel_obj, 'prenom', '')
                if nom or prenom:
                    return f"Empreinte {self.doigt} - {nom} {prenom}"
        except Exception:
            pass
        return f"Empreinte {self.doigt}"

    def clean(self):
        if self.qualite < 0 or self.qualite > 100:
            raise ValidationError({'qualite': 'La qualité doit être entre 0 et 100'})
        
        if self.nombre_minuties < 0:
            raise ValidationError({'nombre_minuties': 'Le nombre de minuties ne peut pas être négatif'})
    
    def save(self, *args, **kwargs):
        if self.image and hasattr(self.image, 'size'):
            self.taille_fichier = getattr(self.image, 'size', None)
        super().save(*args, **kwargs)
    
    def get_main(self):
        return 'droite' if 'droit' in str(self.doigt) else 'gauche'

    objects = OptionalTableManager()


class BiometriePaume(models.Model):
    PAUME_CHOICES = [
        ('paume_droite', 'Paume droite'),
        ('paume_gauche', 'Paume gauche'),
    ]
    
    criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='empreintes_palmaires',
        verbose_name='Criminel'
    )
    image = models.ImageField(
        upload_to='biometrie/paumes/',
        verbose_name='Image de l\'empreinte palmaire',
        validators=[validate_image_file]
    )
    paume = models.CharField(
        max_length=50,
        choices=PAUME_CHOICES,
        verbose_name='Paume'
    )
    qualite = models.IntegerField(
        default=0,  # type: ignore[assignment]
        verbose_name='Qualité de l\'empreinte',
        help_text='Score de qualité de 0 à 10'
    )
    resolution = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Résolution',
        help_text='Ex: 1500x2000px'
    )
    taille_fichier = models.IntegerField(
        blank=True,
        null=True,
        verbose_name='Taille du fichier (bytes)'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notes',
        help_text='Observations sur l\'empreinte palmaire'
    )
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date d\'enregistrement'
    )
    enregistre_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Enregistrée par'
    )
    est_active = models.BooleanField(
        default=True,  # type: ignore[assignment]
        verbose_name='Active',
        help_text='Indique si cette empreinte est utilisable pour la reconnaissance'
    )

    class Meta:
        db_table = 'biometrie_paume'
        verbose_name = 'Empreinte palmaire'
        verbose_name_plural = 'Empreintes palmaires'
        ordering = ['-date_enregistrement']
        unique_together = ['criminel', 'paume']
        indexes = [
            models.Index(fields=['criminel', 'paume']),
            models.Index(fields=['-date_enregistrement']),
        ]

    def __str__(self):
        try:
            if hasattr(self, 'criminel') and self.criminel:
                criminel_obj = self.criminel
                nom = getattr(criminel_obj, 'nom', '')
                prenom = getattr(criminel_obj, 'prenom', '')
                if nom or prenom:
                    return f"Empreinte {self.paume} - {nom} {prenom}"
        except Exception:
            pass
        return f"Empreinte {self.paume}"
    
    def clean(self):
        if self.qualite < 0 or self.qualite > 10:
            raise ValidationError({'qualite': 'La qualité doit être entre 0 et 10'})
    
    def save(self, *args, **kwargs):
        if self.image and hasattr(self.image, 'size'):
            self.taille_fichier = getattr(self.image, 'size', None)
        super().save(*args, **kwargs)

    objects = OptionalTableManager()


class BiometrieScanResultat(models.Model):
    TYPE_SCAN_CHOICES = [
        ('facial', 'Reconnaissance faciale'),
        ('empreinte', 'Reconnaissance d\'empreinte'),
    ]
    
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('echec', 'Échec'),
    ]
    
    type_scan = models.CharField(
        max_length=50,
        choices=TYPE_SCAN_CHOICES,
        verbose_name='Type de scan'
    )
    image_source = models.ImageField(
        upload_to='biometrie/scans/',
        verbose_name='Image source',
        help_text='Image utilisée pour la recherche'
    )
    criminel_correspondant = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='resultats_scans',
        blank=True,
        null=True,
        verbose_name='Criminel correspondant'
    )
    score_correspondance = models.FloatField(
        default=0.0,  # type: ignore[assignment]
        verbose_name='Score de correspondance',
        help_text='Score de similarité (0.0 à 1.0)'
    )
    seuil_confiance = models.FloatField(
        default=0.75,  # type: ignore[assignment]
        verbose_name='Seuil de confiance',
        help_text='Seuil minimal pour considérer une correspondance valide'
    )
    resultats_json = models.TextField(
        blank=True,
        null=True,
        verbose_name='Résultats détaillés',
        help_text='Détails complets des résultats de scan (format JSON)'
    )
    nombre_comparaisons = models.IntegerField(
        default=0,  # type: ignore[assignment]
        verbose_name='Nombre de comparaisons effectuées'
    )
    temps_execution = models.FloatField(
        default=0.0,  # type: ignore[assignment]
        verbose_name='Temps d\'exécution (secondes)'
    )
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_cours',  # type: ignore[assignment]
        verbose_name='Statut'
    )
    date_scan = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date du scan'
    )
    execute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Exécuté par'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notes'
    )

    class Meta:
        db_table = 'biometrie_scan_resultat'
        verbose_name = 'Résultat de scan biométrique'
        verbose_name_plural = 'Résultats de scans biométriques'
        ordering = ['-date_scan']
        indexes = [
            models.Index(fields=['-date_scan']),
            models.Index(fields=['type_scan', 'statut']),
            models.Index(fields=['criminel_correspondant']),
        ]

    def __str__(self):
        if hasattr(self, 'criminel_correspondant') and self.criminel_correspondant:
            try:
                criminel_obj = self.criminel_correspondant
                nom = getattr(criminel_obj, 'nom', 'Inconnu')
                score_pct = float(self.score_correspondance) * 100  # type: ignore[arg-type]
                return f"Scan {self.type_scan} - Correspondance: {nom} ({score_pct:.2f}%)"
            except Exception:
                score_pct = float(self.score_correspondance) * 100  # type: ignore[arg-type]
                return f"Scan {self.type_scan} - Correspondance: ({score_pct:.2f}%)"
        return f"Scan {self.type_scan} - Aucune correspondance"
    
    def est_correspondance_valide(self):
        return self.score_correspondance >= self.seuil_confiance
    
    def clean(self):
        if self.score_correspondance < 0.0 or self.score_correspondance > 1.0:
            raise ValidationError({'score_correspondance': 'Le score doit être entre 0.0 et 1.0'})
        
        if self.seuil_confiance < 0.0 or self.seuil_confiance > 1.0:
            raise ValidationError({'seuil_confiance': 'Le seuil doit être entre 0.0 et 1.0'})

    objects = OptionalTableManager()


class BiometrieHistorique(models.Model):
    ACTION_CHOICES = [
        ('creation', 'Création'),
        ('modification', 'Modification'),
        ('suppression', 'Suppression'),
        ('activation', 'Activation'),
        ('desactivation', 'Désactivation'),
        ('encodage', 'Génération encodage'),
        ('principale', 'Définie comme principale'),
    ]
    
    TYPE_OBJET_CHOICES = [
        ('photo', 'Photo biométrique'),
        ('empreinte', 'Empreinte digitale'),
        ('paume', 'Empreinte palmaire'),
        ('scan', 'Résultat de scan'),
        ('encodage', 'Encodage facial (Biometrie)'),
    ]
    
    type_objet = models.CharField(
        max_length=50,
        choices=TYPE_OBJET_CHOICES,
        verbose_name='Type d\'objet'
    )
    objet_id = models.IntegerField(
        verbose_name='ID de l\'objet',
        help_text='ID de l\'objet modifié'
    )
    criminel = models.ForeignKey(
        'criminel.CriminalFicheCriminelle',
        on_delete=models.CASCADE,
        related_name='historique_biometrie',
        verbose_name='Criminel concerné'
    )
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        verbose_name='Action effectuée'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description',
        help_text='Détails de l\'action effectuée'
    )
    donnees_avant = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Données avant modification',
        help_text='État des données avant la modification (format JSON)'
    )
    donnees_apres = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Données après modification',
        help_text='État des données après la modification (format JSON)'
    )
    date_action = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de l\'action'
    )
    effectue_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='Effectué par'
    )
    adresse_ip = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name='Adresse IP',
        help_text='Adresse IP de l\'utilisateur'
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent',
        help_text='Navigateur/client utilisé'
    )
    
    class Meta:
        db_table = 'biometrie_historique'
        verbose_name = 'Historique biométrique'
        verbose_name_plural = 'Historiques biométriques'
        ordering = ['-date_action']
        indexes = [
            models.Index(fields=['type_objet', 'objet_id']),
            models.Index(fields=['criminel', '-date_action']),
            models.Index(fields=['action', '-date_action']),
            models.Index(fields=['effectue_par', '-date_action']),
        ]
    
    def __str__(self):
        d = self.date_action
        date_str = d.strftime('%Y-%m-%d %H:%M') if d else ''  # type: ignore[union-attr]
        return f"{self.action} - {self.type_objet} #{self.objet_id} - {date_str}"

    objects = OptionalTableManager()