"""
Serializers améliorés pour les enquêtes et pièces d'enquête
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models_enhanced import Enquete, PieceEnquete
from criminel.models import CriminalFicheCriminelle

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer basique pour les utilisateurs"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class FicheCriminelleBasicSerializer(serializers.ModelSerializer):
    """Serializer basique pour les fiches criminelles"""
    class Meta:
        model = CriminalFicheCriminelle
        fields = ['id', 'numero_fiche', 'nom', 'prenom']


class PieceEnqueteSerializer(serializers.ModelSerializer):
    """Serializer pour les pièces d'enquête"""
    ajoute_par_detail = UserBasicSerializer(
        source='ajoute_par',
        read_only=True
    )
    type_piece_display = serializers.CharField(
        source='get_type_piece_display',
        read_only=True
    )
    fichier_url = serializers.SerializerMethodField()
    fichier_nom = serializers.SerializerMethodField()
    fichier_taille = serializers.SerializerMethodField()
    
    class Meta:
        model = PieceEnquete
        fields = [
            'id',
            'enquete',
            'type_piece',
            'type_piece_display',
            'fichier',
            'fichier_url',
            'fichier_nom',
            'fichier_taille',
            'description',
            'date_ajout',
            'ajoute_par',
            'ajoute_par_detail',
            'hash_fichier',
            'est_confidentiel',
            'commentaire_interne',
        ]
        read_only_fields = [
            'id',
            'date_ajout',
            'ajoute_par',
            'hash_fichier',
        ]
    
    def get_fichier_url(self, obj):
        """Retourne l'URL du fichier"""
        if obj.fichier:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.fichier.url)
            return obj.fichier.url
        return None
    
    def get_fichier_nom(self, obj):
        """Retourne le nom du fichier"""
        if obj.fichier:
            return obj.fichier.name.split('/')[-1]
        return None
    
    def get_fichier_taille(self, obj):
        """Retourne la taille du fichier en bytes"""
        if obj.fichier:
            try:
                return obj.fichier.size
            except Exception:
                return None
        return None


class PieceEnqueteCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de pièces d'enquête (avec upload)"""
    class Meta:
        model = PieceEnquete
        fields = [
            'enquete',
            'type_piece',
            'fichier',
            'description',
            'est_confidentiel',
            'commentaire_interne',
        ]
    
    def create(self, validated_data):
        """Crée la pièce et assigne l'utilisateur"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['ajoute_par'] = request.user
        return super().create(validated_data)


class EnqueteListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des enquêtes (version allégée)"""
    enqueteur_responsable_detail = UserBasicSerializer(
        source='enqueteur_responsable',
        read_only=True
    )
    statut_display = serializers.CharField(
        source='get_statut_display',
        read_only=True
    )
    niveau_priorite_display = serializers.CharField(
        source='get_niveau_priorite_display',
        read_only=True
    )
    type_enquete_display = serializers.CharField(
        source='get_type_enquete_display',
        read_only=True
    )
    nombre_pieces = serializers.SerializerMethodField()
    nombre_equipe = serializers.SerializerMethodField()
    
    class Meta:
        model = Enquete
        fields = [
            'id',
            'numero_enquete',
            'titre',
            'type_enquete',
            'type_enquete_display',
            'statut',
            'statut_display',
            'niveau_priorite',
            'niveau_priorite_display',
            'date_ouverture',
            'date_cloture',
            'lieu_faits',
            'enqueteur_responsable',
            'enqueteur_responsable_detail',
            'nombre_equipe',
            'nombre_pieces',
            'is_archived',
            'created_at',
        ]
    
    def get_nombre_pieces(self, obj):
        """Retourne le nombre de pièces associées"""
        return obj.pieces.count()
    
    def get_nombre_equipe(self, obj):
        """Retourne le nombre de membres de l'équipe"""
        return obj.equipe_enquete.count()


class EnqueteDetailSerializer(serializers.ModelSerializer):
    """Serializer pour les détails d'une enquête"""
    enqueteur_responsable_detail = UserBasicSerializer(
        source='enqueteur_responsable',
        read_only=True
    )
    equipe_enquete_detail = UserBasicSerializer(
        source='equipe_enquete',
        many=True,
        read_only=True
    )
    fiche_criminelle_detail = FicheCriminelleBasicSerializer(
        source='fiche_criminelle',
        read_only=True
    )
    statut_display = serializers.CharField(
        source='get_statut_display',
        read_only=True
    )
    niveau_priorite_display = serializers.CharField(
        source='get_niveau_priorite_display',
        read_only=True
    )
    type_enquete_display = serializers.CharField(
        source='get_type_enquete_display',
        read_only=True
    )
    pieces = PieceEnqueteSerializer(
        source='pieces',
        many=True,
        read_only=True
    )
    nombre_pieces = serializers.SerializerMethodField()
    
    class Meta:
        model = Enquete
        fields = [
            'id',
            'numero_enquete',
            'titre',
            'description',
            'type_enquete',
            'type_enquete_display',
            'statut',
            'statut_display',
            'niveau_priorite',
            'niveau_priorite_display',
            'date_ouverture',
            'date_cloture',
            'lieu_faits',
            'enqueteur_responsable',
            'enqueteur_responsable_detail',
            'equipe_enquete',
            'equipe_enquete_detail',
            'fiche_criminelle',
            'fiche_criminelle_detail',
            'pieces',
            'nombre_pieces',
            'is_archived',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'numero_enquete',
            'created_at',
            'updated_at',
        ]
    
    def get_nombre_pieces(self, obj):
        """Retourne le nombre de pièces associées"""
        return obj.pieces.count()
    
    def validate(self, attrs):
        """Validation personnalisée"""
        # Si l'enquête est clôturée, vérifier que la date de clôture est définie
        if attrs.get('statut') == 'cloturee':
            if not attrs.get('date_cloture') and not self.instance.date_cloture:
                from django.utils import timezone
                attrs['date_cloture'] = timezone.now()
        
        return attrs


class EnqueteCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la création et modification d'enquêtes"""
    class Meta:
        model = Enquete
        fields = [
            'titre',
            'description',
            'type_enquete',
            'statut',
            'niveau_priorite',
            'date_ouverture',
            'date_cloture',
            'lieu_faits',
            'enqueteur_responsable',
            'equipe_enquete',
            'fiche_criminelle',
            'is_archived',
        ]
    
    def validate(self, attrs):
        """Validation personnalisée"""
        # Vérifier que la date de clôture est postérieure à la date d'ouverture
        date_ouverture = attrs.get('date_ouverture') or (self.instance.date_ouverture if self.instance else None)
        date_cloture = attrs.get('date_cloture')
        
        if date_ouverture and date_cloture:
            if date_cloture < date_ouverture:
                raise serializers.ValidationError({
                    'date_cloture': 'La date de clôture doit être postérieure à la date d\'ouverture.'
                })
        
        return attrs

