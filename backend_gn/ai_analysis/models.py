from django.db import models


class Cas(models.Model):
    """
    Modèle central pour stocker les cas criminels ou incidents
    """
    date = models.DateField()
    categorie = models.CharField(max_length=100)
    lieu = models.CharField(max_length=255)  # adresse ou coordonnées GPS
    description = models.TextField(blank=True, null=True)
    statut = models.CharField(max_length=50, default='ouvert')  # ou 'fermé'

    class Meta:
        verbose_name = 'Cas'
        verbose_name_plural = 'Cas'
        ordering = ['-date']

    def __str__(self):
        return f"{self.categorie} - {self.date}"


class EvolutionMensuelle(models.Model):
    """
    Stocke les résultats de l'évolution mensuelle
    """
    mois = models.DateField()  # utiliser le premier jour du mois
    total_cas = models.IntegerField()
    moyenne_cas = models.FloatField(null=True, blank=True)

    class Meta:
        verbose_name = 'Évolution Mensuelle'
        verbose_name_plural = 'Évolutions Mensuelles'
        ordering = ['-mois']

    def __str__(self):
        return f"Mois: {self.mois} - Total: {self.total_cas}"


class EvolutionDetaillee(models.Model):
    """
    Détail par catégorie ou variable
    """
    mois = models.DateField()
    categorie = models.CharField(max_length=100)
    total_cas = models.IntegerField()
    moyenne_cas = models.FloatField(null=True, blank=True)

    class Meta:
        verbose_name = 'Évolution Détaillée'
        verbose_name_plural = 'Évolutions Détaillées'
        ordering = ['-mois', 'categorie']

    def __str__(self):
        return f"{self.categorie} - {self.mois}"


class RepartitionGeographique(models.Model):
    """
    Répartition des cas par lieu
    """
    lieu = models.CharField(max_length=255)  # adresse ou coord GPS
    total_cas = models.IntegerField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        verbose_name = 'Répartition Géographique'
        verbose_name_plural = 'Répartitions Géographiques'
        ordering = ['-total_cas']

    def __str__(self):
        return f"{self.lieu} - {self.total_cas}"


class ActiviteTempsReel(models.Model):
    """
    Suivi en temps réel des activités/anomalies
    """
    timestamp = models.DateTimeField(auto_now_add=True)
    categorie = models.CharField(max_length=100)
    lieu = models.CharField(max_length=255)
    valeur = models.FloatField()  # ex: nombre d'événements, score d'anomalie
    anomalie = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Activité Temps Réel'
        verbose_name_plural = 'Activités Temps Réel'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.categorie} - {self.timestamp} - Anomalie: {self.anomalie}"

