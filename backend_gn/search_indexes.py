"""
Configuration des index de recherche avec Haystack/Whoosh
Pour la recherche avancée et sémantique dans le système SGIC
"""

import haystack
from haystack import indexes
from criminel.models import CriminalFicheCriminelle, CriminalInfraction
from enquete.models import Enquete, RapportEnquete, Observation


class CriminalFicheCriminelleIndex(indexes.SearchIndex, indexes.Indexable):
    """
    Index de recherche pour les fiches criminelles
    Permet la recherche floue et sémantique
    """
    text = indexes.CharField(document=True, use_template=True)
    numero_fiche = indexes.CharField(model_attr='numero_fiche', indexed=True, stored=True)
    nom = indexes.CharField(model_attr='nom', indexed=True, stored=True)
    prenom = indexes.CharField(model_attr='prenom', indexed=True, stored=True)
    surnom = indexes.CharField(model_attr='surnom', null=True, indexed=True, stored=True)
    pseudonymes_connus = indexes.CharField(model_attr='pseudonymes_connus', null=True, indexed=True)
    cin = indexes.CharField(model_attr='cin', null=True, indexed=True, stored=True)
    numero_passeport = indexes.CharField(model_attr='numero_passeport', null=True, indexed=True)
    nationalite = indexes.CharField(model_attr='nationalite', null=True, indexed=True)
    lieu_naissance = indexes.CharField(model_attr='lieu_naissance', null=True, indexed=True)
    adresse = indexes.CharField(model_attr='adresse', null=True, indexed=True)
    profession = indexes.CharField(model_attr='profession', null=True, indexed=True)
    description_physique = indexes.CharField(null=True, indexed=True)
    niveau_danger = indexes.IntegerField(model_attr='niveau_danger', indexed=True, stored=True)
    statut_fiche = indexes.CharField(null=True, indexed=True, stored=True)
    date_creation = indexes.DateTimeField(model_attr='date_creation', indexed=True, stored=True)
    
    # Champs pour faciliter la recherche
    content_auto = indexes.EdgeNgramField(model_attr='nom')
    content_auto_prenom = indexes.EdgeNgramField(model_attr='prenom')
    
    def get_model(self):
        return CriminalFicheCriminelle
    
    def index_queryset(self, using=None):
        """Retourne le queryset d'objets à indexer"""
        return self.get_model().objects.filter(is_archived=False)
    
    def prepare_description_physique(self, obj):
        """Prépare une description physique combinée pour la recherche"""
        parts = []
        if obj.corpulence:
            parts.append(f"Corpulence: {obj.corpulence}")
        if obj.cheveux:
            parts.append(f"Cheveux: {obj.cheveux}")
        if obj.visage:
            parts.append(f"Visage: {obj.visage}")
        if obj.height:
            parts.append(f"Taille: {obj.height}cm")
        if obj.eye_color:
            parts.append(f"Yeux: {obj.eye_color}")
        if obj.marques_particulieres:
            parts.append(obj.marques_particulieres)
        return " ".join(parts)
    
    def prepare_statut_fiche(self, obj):
        """Prépare le statut de la fiche pour l'indexation"""
        if obj.statut_fiche:
            return obj.statut_fiche.code
        return None


class CriminalInfractionIndex(indexes.SearchIndex, indexes.Indexable):
    """
    Index de recherche pour les infractions
    """
    text = indexes.CharField(document=True, use_template=True)
    numero_affaire = indexes.CharField(model_attr='numero_affaire', null=True, indexed=True, stored=True)
    description = indexes.CharField(model_attr='description', null=True, indexed=True)
    description_detaillee = indexes.CharField(model_attr='description_detaillee', null=True, indexed=True)
    lieu = indexes.CharField(model_attr='lieu', indexed=True, stored=True)
    date_infraction = indexes.DateTimeField(model_attr='date_infraction', indexed=True, stored=True)
    fiche_id = indexes.IntegerField(model_attr='fiche_id', indexed=True, stored=True)
    type_infraction = indexes.CharField(null=True, indexed=True, stored=True)
    statut_affaire = indexes.CharField(null=True, indexed=True, stored=True)
    
    def get_model(self):
        return CriminalInfraction
    
    def index_queryset(self, using=None):
        """Retourne le queryset d'objets à indexer"""
        return self.get_model().objects.all()
    
    def prepare_type_infraction(self, obj):
        """Prépare le type d'infraction pour l'indexation"""
        if obj.type_infraction:
            return obj.type_infraction.libelle
        return None
    
    def prepare_statut_affaire(self, obj):
        """Prépare le statut de l'affaire pour l'indexation"""
        if obj.statut_affaire:
            return obj.statut_affaire.code
        return None


class EnqueteIndex(indexes.SearchIndex, indexes.Indexable):
    """
    Index de recherche pour les enquêtes
    """
    text = indexes.CharField(document=True, use_template=True)
    numero_enquete = indexes.CharField(model_attr='numero_enquete', indexed=True, stored=True)
    titre = indexes.CharField(model_attr='titre', indexed=True, stored=True)
    description = indexes.CharField(model_attr='description', indexed=True)
    type_enquete_code = indexes.CharField(model_attr='type_enquete_code', indexed=True, stored=True)
    statut = indexes.CharField(model_attr='statut', indexed=True, stored=True)
    lieu = indexes.CharField(model_attr='lieu', null=True, indexed=True)
    dossier_id = indexes.IntegerField(model_attr='dossier_id', null=True, indexed=True, stored=True)
    date_enregistrement = indexes.DateTimeField(model_attr='date_enregistrement', indexed=True, stored=True)
    
    def get_model(self):
        return Enquete
    
    def index_queryset(self, using=None):
        """Retourne le queryset d'objets à indexer"""
        return self.get_model().objects.all()


class RapportEnqueteIndex(indexes.SearchIndex, indexes.Indexable):
    """
    Index de recherche pour les rapports d'enquête
    """
    text = indexes.CharField(document=True, use_template=True)
    titre = indexes.CharField(model_attr='titre', indexed=True, stored=True)
    contenu = indexes.CharField(model_attr='contenu', indexed=True)
    statut = indexes.CharField(model_attr='statut', indexed=True, stored=True)
    dossier_id = indexes.IntegerField(model_attr='dossier_id', indexed=True, stored=True)
    date_redaction = indexes.DateTimeField(model_attr='date_redaction', indexed=True, stored=True)
    
    def get_model(self):
        return RapportEnquete
    
    def index_queryset(self, using=None):
        """Retourne le queryset d'objets à indexer"""
        return self.get_model().objects.all()


class ObservationIndex(indexes.SearchIndex, indexes.Indexable):
    """
    Index de recherche pour les observations
    """
    text = indexes.CharField(document=True, use_template=True)
    texte = indexes.CharField(model_attr='texte', indexed=True)
    dossier_id = indexes.IntegerField(model_attr='dossier_id', indexed=True, stored=True)
    date = indexes.DateTimeField(model_attr='date', indexed=True, stored=True)
    
    def get_model(self):
        return Observation
    
    def index_queryset(self, using=None):
        """Retourne le queryset d'objets à indexer"""
        return self.get_model().objects.all()

