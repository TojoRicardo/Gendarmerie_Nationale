from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from datetime import date

from .models import ADMIN_ROLE_CODES, normalize_role_value, Role, PermissionSGIC

User = get_user_model()

class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(
        required=False,
        allow_blank=True,
        error_messages={
            'blank': "L'identifiant ne peut pas être vide."
        }
    )
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        error_messages={
            'blank': "L'identifiant ne peut pas être vide."
        }
    )
    password = serializers.CharField(
        write_only=True,
        error_messages={
            'required': "Le mot de passe est requis.",
            'blank': "Le mot de passe ne peut pas être vide."
        }
    )
    pin = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        max_length=6,
        min_length=0,  # Permettre une chaîne vide
        error_messages={
            'max_length': "Le PIN doit contenir exactement 6 chiffres.",
        },
        help_text="PIN à 6 chiffres (optionnel si non configuré)"
    )

    def validate_password(self, value):
        """Valide que le mot de passe n'est pas vide"""
        if not value:
            raise serializers.ValidationError("Le mot de passe est requis.")
        # Ne pas supprimer les espaces - préserver le mot de passe tel quel
        # Vérifier seulement qu'il n'est pas vide après suppression des espaces en début/fin
        if not value.strip():
            raise serializers.ValidationError("Le mot de passe ne peut pas être vide ou contenir uniquement des espaces.")
        # IMPORTANT: Ne pas modifier le mot de passe, le retourner tel quel
        return value
    
    def validate_pin(self, value):
        """Valide le format du PIN s'il est fourni"""
        if value and value.strip():
            # Si le PIN est fourni, il doit contenir exactement 6 chiffres
            if not value.isdigit():
                raise serializers.ValidationError("Le PIN doit contenir uniquement des chiffres.")
            if len(value) != 6:
                raise serializers.ValidationError("Le PIN doit contenir exactement 6 chiffres.")
        return value

    def validate(self, data):
        email = data.get('email', '').strip() if data.get('email') else ''
        username = data.get('username', '').strip() if data.get('username') else ''
        # NE PAS modifier le mot de passe - le garder tel quel pour la vérification
        password = data.get('password')

        if not email and not username:
            raise serializers.ValidationError({
                "non_field_errors": ["Veuillez fournir votre adresse email ou votre nom d'utilisateur."]
            })

        # Vérifier que le mot de passe est fourni
        if not password:
            raise serializers.ValidationError({
                "password": ["Le mot de passe est requis."]
            })

        # Déterminer l'identifiant à utiliser
        identifier = email if email else username
        is_email = '@' in identifier

        # Chercher l'utilisateur par email ou username
        try:
            if is_email:
                user = User.objects.get(email__iexact=identifier.lower())
            else:
                user = User.objects.get(username__iexact=identifier)
        except User.DoesNotExist:
            # Suggestions pour aider l'utilisateur
            suggestions = []
            if is_email:
                email_parts = identifier.lower().split('@')
                if len(email_parts) == 2:
                    local_part = email_parts[0]
                    domain_part = email_parts[1]
                    
                    # Chercher des emails similaires avec plusieurs stratégies
                    # 2. Exclure les comptes suspendus et inactifs pour ne montrer que les comptes utilisables
                    
                    prefix_length = min(5, len(local_part))
                    if prefix_length >= 3:
                        # Chercher les emails contenant le préfixe dans la partie locale
                        # Ex: "tojoriacrdo" trouvera "tojoricardo" grâce au préfixe "tojor"
                        prefix = local_part[:prefix_length]
                        
                        similar_users = User.objects.filter(
                            email__icontains=prefix
                        ).exclude(
                            statut__in=['suspendu']
                        ).exclude(
                            is_active=False
                        ).exclude(
                            email__iexact=identifier.lower()  # Exclure l'email exact (déjà vérifié)
                        ).distinct()[:10]  # Prendre plus de résultats pour mieux filtrer
                        
                        if similar_users.exists():
                            def similarity_score(user_email):
                                user_local = user_email.lower().split('@')[0]
                                # Score basé sur:
                                # 1. Si commence par le même préfixe
                                # 2. Longueur similaire
                                # 3. Nombre de caractères communs au début
                                starts_same = user_local.startswith(local_part[:prefix_length])
                                length_diff = abs(len(user_local) - len(local_part))
                                common_chars = sum(1 for i, c in enumerate(user_local) if i < len(local_part) and c == local_part[i])
                                
                                return (not starts_same, length_diff, -common_chars)
                            
                            sorted_users = sorted(
                                similar_users,
                                key=lambda u: similarity_score(u.email)
                            )
                            # Prendre seulement les 3 plus similaires
                            suggestions.append("Emails similaires trouvés:")
                            for u in sorted_users[:3]:
                                suggestions.append(f"  - {u.email}")
            else:
                # Essayer de trouver des utilisateurs avec un username similaire
                # Exclure les comptes suspendus et inactifs
                similar_users = User.objects.filter(
                    username__icontains=identifier[:4] if len(identifier) >= 4 else identifier
                ).exclude(
                    statut__in=['suspendu']
                ).exclude(
                    is_active=False
                ).exclude(
                    username__iexact=identifier  # Exclure le username exact
                )[:3]
                if similar_users.exists():
                    suggestions.append("Noms d'utilisateur similaires trouvés:")
                    for u in similar_users:
                        suggestions.append(f"  - {u.username}")
            
            # Utiliser une variable intermédiaire car les f-strings ne peuvent pas contenir de backslash dans les expressions
            identifiant_type = "l'email" if is_email else "le nom d'utilisateur"
            error_msg = f"Aucun compte n'existe avec {identifiant_type} '{identifier}'. Vérifiez votre identifiant."
            if suggestions:
                error_msg += "\n" + "\n".join(suggestions)
            
            if is_email:
                raise serializers.ValidationError({
                    "email": [error_msg]
                })
            else:
                raise serializers.ValidationError({
                    "username": [error_msg]
                })
        except User.MultipleObjectsReturned:
            if is_email:
                user = User.objects.filter(email__iexact=identifier.lower()).first()
            else:
                user = User.objects.filter(username__iexact=identifier).first()

        # IMPORTANT: Vérifier le statut suspendu AVANT de vérifier le mot de passe
        # Cela évite d'afficher "Mot de passe incorrect" pour un compte suspendu
        import logging
        logger = logging.getLogger(__name__)
        
        user_statut = (user.statut or '').strip().lower() if user.statut else ''
        
        if user_statut == 'suspendu':
            logger.warning(f"Tentative de connexion pour compte suspendu: {user.username} ({user.email})")
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Accès refusé : votre compte utilisateur a été suspendu. "
                    "Cette action de sécurité empêche toute tentative de connexion. "
                    "Veuillez contacter votre administrateur système pour réactiver votre compte."
                ]
            })
        
        if not user.is_active:
            logger.warning(f"Tentative de connexion pour compte inactif: {user.username} ({user.email})")
            raise serializers.ValidationError({
                "non_field_errors": ["Ce compte a été désactivé. Veuillez contacter l'administrateur système."]
            })

        # Vérifier d'abord si l'utilisateur a un mot de passe hashé
        if not user.password or user.password.startswith('!'):
            logger.warning(f"Utilisateur {user.username} ({user.email}) n'a pas de mot de passe défini ou est désactivé")
            raise serializers.ValidationError({
                "password": ["Mot de passe incorrect. Veuillez réessayer."]
            })

        # Vérifier le mot de passe
        # IMPORTANT: Le mot de passe doit être passé tel quel, sans modification
        # Debug: logger le type et la longueur pour vérifier qu'il n'est pas modifié
        logger.debug(f"Vérification mot de passe pour {user.username}: type={type(password)}, len={len(password) if password else 0}, has_password={bool(user.password)}")
        
        password_check = user.check_password(password)
        
        # Si check_password échoue, essayer avec authenticate pour voir si c'est un problème de format
        if not password_check:
            logger.debug(f"check_password a échoué, tentative avec authenticate pour {user.username}")
            try:
                from django.contrib.auth import authenticate
                # Essayer avec username
                test_auth_username = authenticate(username=user.username, password=password)
                # Essayer avec email si l'utilisateur utilise email comme username
                test_auth_email = None
                if user.email:
                    # Certains systèmes utilisent email comme username
                    test_auth_email = authenticate(username=user.email, password=password)
                
                if test_auth_username or test_auth_email:
                    logger.info(f"Authenticate réussi pour {user.username} (username={bool(test_auth_username)}, email={bool(test_auth_email)}), mais check_password a échoué")
                    # Si authenticate fonctionne, utiliser cette méthode
                    password_check = True
                else:
                    logger.warning(f"Échec de connexion pour {user.username} ({user.email}) - mot de passe incorrect (check_password et authenticate ont échoué)")
                    raise serializers.ValidationError({
                        "password": ["Mot de passe incorrect. Veuillez réessayer."]
                    })
            except serializers.ValidationError:
                # Re-lancer l'erreur de validation
                raise
            except Exception as e:
                logger.debug(f"Erreur lors du test authenticate: {e}")
                # Si authenticate échoue aussi, c'est que le mot de passe est vraiment incorrect
                logger.warning(f"Échec de connexion pour {user.username} ({user.email}) - mot de passe incorrect")
                raise serializers.ValidationError({
                    "password": ["Mot de passe incorrect. Veuillez réessayer."]
                })
        
        logger.info(f"Connexion réussie pour {user.username} ({user.email})")

        # Vérifier si l'utilisateur a un PIN configuré
        from .models import UserProfile
        try:
            profile = UserProfile.objects.get(user=user)
            has_pin = bool(profile.pin_hash)
        except UserProfile.DoesNotExist:
            has_pin = False
        
        # Si l'utilisateur a un PIN configuré mais qu'il n'a pas été fourni dans la requête
        # on indique que le PIN est requis
        pin_provided = data.get('pin', '').strip()
        if has_pin and not pin_provided:
            # Stocker l'information que le PIN est requis
            data['pin_required'] = True
            # Ne pas mettre à jour la dernière connexion ici, ce sera fait après vérification du PIN
        else:
            # Mettre à jour la date de dernière connexion seulement si le PIN n'est pas requis
            # ou s'il a été fourni et validé
            # IMPORTANT: Mettre à jour à la fois derniereConnexion (champ personnalisé) 
            # et last_login (champ Django standard) pour cohérence
            now = timezone.now()
            user.derniereConnexion = now
            user.last_login = now  # Champ Django standard AbstractUser
            user.save(update_fields=['derniereConnexion', 'last_login'])

        data['user'] = user
        return data


class UtilisateurReadSerializer(serializers.ModelSerializer):
    """
    Serializer pour la lecture des utilisateurs (sans mot de passe)
    
    IMPORTANT - Distinction entre différents types d'états :
    - is_active (Django) : Compte activé/désactivé (permission d'accès au système)
    - statut (personnalisé) : Statut applicatif (actif, inactif, suspendu)
    - is_current_user : Indique si cet utilisateur est l'utilisateur actuellement connecté (session active)
    - derniereConnexion : Date de dernière connexion (utilisé pour calculer actifs/inactifs)
    """
    permissions = serializers.SerializerMethodField()
    photo_profil = serializers.SerializerMethodField()
    photo_profil_upload = serializers.ImageField(write_only=True, required=False, allow_null=True)
    # Champ calculé pour identifier l'utilisateur actuellement connecté
    is_current_user = serializers.SerializerMethodField()
    # Champ calculé pour indiquer si l'utilisateur est actuellement connecté (session active)
    is_connected = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'matricule', 'nom', 'prenom', 
                  'telephone', 'dateNaissance', 'adresse', 'role', 'statut', 
                  'grade', 'dateCreation', 'derniereConnexion', 'is_active', 
                  'permissions', 'photo_profil', 'photo_profil_upload',
                  'is_current_user', 'is_connected']
        read_only_fields = ['id', 'dateCreation', 'derniereConnexion', 'permissions', 'is_current_user', 'is_connected']
    
    def get_permissions(self, obj):
        """Récupère les permissions de l'utilisateur selon son rôle"""
        from .permissions import get_user_permissions
        return get_user_permissions(obj)
    
    def get_photo_profil(self, obj):
        """Retourne l'URL complète de la photo de profil"""
        if obj.photo_profil:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo_profil.url)
            return obj.photo_profil.url
        return None
    
    def get_is_current_user(self, obj):
        """
        Indique si cet utilisateur est l'utilisateur actuellement connecté
        (celui qui fait la requête)
        """
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return request.user.id == obj.id
        return False
    
    def get_is_connected(self, obj):
        """
        Indique si l'utilisateur est actuellement connecté (session active)
        - True si c'est l'utilisateur actuellement authentifié
        - False sinon
        """
        return self.get_is_current_user(obj)
    
    def update(self, instance, validated_data):
        """Mise à jour de l'utilisateur avec gestion de la photo de profil"""
        # Gérer l'upload de la photo de profil
        photo_profil = validated_data.pop('photo_profil_upload', None)
        if photo_profil is not None:
            # Supprimer l'ancienne photo si elle existe
            if instance.photo_profil:
                try:
                    instance.photo_profil.delete(save=False)
                except Exception:
                    pass  # Ignorer les erreurs de suppression
            instance.photo_profil = photo_profil
        
        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)  # Optionnel pour la mise à jour
    confirm_password = serializers.CharField(write_only=True, required=False)  # Si tu souhaites la confirmation

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'confirm_password', 
                  'matricule', 'nom', 'prenom', 'telephone', 'dateNaissance', 
                  'adresse', 'role', 'statut', 'grade', 'is_active']
        extra_kwargs = {
            'password': {'required': False},  # Pas obligatoire lors de la mise à jour
        }

    def validate_password(self, value):
        """Valide la force du mot de passe lors de la création/mise à jour"""
        if value:  # Seulement valider si un mot de passe est fourni
            try:
                validate_password(value)
            except DjangoValidationError as e:
                raise serializers.ValidationError(e.messages)
        return value

    def validate(self, data):
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        # Vérifier que les mots de passe correspondent
        if confirm_password is not None and password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Les mots de passe ne correspondent pas."
            })
        
        # Pour la création, le mot de passe est obligatoire
        if not self.instance and not password:
            raise serializers.ValidationError({
                "password": "Le mot de passe est requis lors de la création d'un utilisateur."
            })
        
        return data

    def validate_email(self, value):
        qs = User.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_username(self, value):
        qs = User.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe déjà.")
        return value

    def validate_matricule(self, value):
        if value:
            qs = User.objects.filter(matricule=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Ce matricule est déjà utilisé.")
        return value

    def validate_telephone(self, value):
        if value:
            qs = User.objects.filter(telephone=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Ce contact est déjà utilisé.")
        return value

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password')
        validated_data['dateCreation'] = date.today()
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer pour le changement de mot de passe dans le profil utilisateur"""
    old_password = serializers.CharField(
        write_only=True,
        required=True,
        error_messages={
            'required': "L'ancien mot de passe est requis.",
            'blank': "L'ancien mot de passe ne peut pas être vide."
        }
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        error_messages={
            'required': "Le nouveau mot de passe est requis.",
            'blank': "Le nouveau mot de passe ne peut pas être vide."
        },
        help_text="Le mot de passe doit contenir au moins 8 caractères."
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        error_messages={
            'required': "La confirmation du mot de passe est requise.",
            'blank': "La confirmation du mot de passe ne peut pas être vide."
        }
    )

    def validate_old_password(self, value):
        """Vérifie que l'ancien mot de passe est correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("L'ancien mot de passe est incorrect.")
        return value

    def validate_new_password(self, value):
        """Valide la force du nouveau mot de passe"""
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def validate(self, data):
        """Vérifie que le nouveau mot de passe et sa confirmation correspondent"""
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                "confirm_password": "Les mots de passe ne correspondent pas."
            })
        
        # Vérifier que le nouveau mot de passe est différent de l'ancien
        if data['old_password'] == data['new_password']:
            raise serializers.ValidationError({
                "new_password": "Le nouveau mot de passe doit être différent de l'ancien."
            })
        
        return data


def ensure_user_can_be_deleted(user):
    """
    Utilitaire pour empêcher la suppression d'un compte administrateur.
    Lève serializers.ValidationError en cas d'interdiction.
    """
    if not user:
        raise serializers.ValidationError("Utilisateur introuvable.")

    role_value = normalize_role_value(getattr(user, 'role', None))
    role_code = normalize_role_value(getattr(user, 'role_code', None))
    is_admin = (
        getattr(user, 'is_application_admin', False)
        or getattr(user, 'is_superuser', False)
        or getattr(user, 'is_staff', False)
        or role_value in ADMIN_ROLE_CODES
        or role_code in ADMIN_ROLE_CODES
    )

    if is_admin:
        raise serializers.ValidationError("Impossible de supprimer un compte administrateur.")

    return True


class SetPinSerializer(serializers.Serializer):
    """Serializer pour définir ou modifier le PIN"""
    pin = serializers.CharField(
        required=True,
        max_length=6,
        min_length=6,
        error_messages={
            'required': "Le PIN est requis.",
            'max_length': "Le PIN doit contenir exactement 6 chiffres.",
            'min_length': "Le PIN doit contenir exactement 6 chiffres."
        },
        help_text="PIN à 6 chiffres"
    )
    confirm_pin = serializers.CharField(
        required=True,
        max_length=6,
        min_length=6,
        error_messages={
            'required': "La confirmation du PIN est requise.",
            'max_length': "Le PIN doit contenir exactement 6 chiffres.",
            'min_length': "Le PIN doit contenir exactement 6 chiffres."
        },
        help_text="Confirmation du PIN"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        help_text="Mot de passe actuel pour confirmer l'identité"
    )

    def validate_pin(self, value):
        """Valide le format du PIN"""
        if not value.isdigit():
            raise serializers.ValidationError("Le PIN doit contenir uniquement des chiffres.")
        return value

    def validate_confirm_pin(self, value):
        """Valide le format du PIN de confirmation"""
        if not value.isdigit():
            raise serializers.ValidationError("Le PIN de confirmation doit contenir uniquement des chiffres.")
        return value

    def validate(self, data):
        """Valide que les deux PIN correspondent"""
        pin = data.get('pin')
        confirm_pin = data.get('confirm_pin')
        
        if pin != confirm_pin:
            raise serializers.ValidationError({
                'confirm_pin': "Les deux PIN ne correspondent pas."
            })
        
        return data



class PermissionSerializer(serializers.ModelSerializer):
    """Serializer pour les permissions SGIC"""
    
    class Meta:
        model = PermissionSGIC
        fields = ['id', 'code', 'label', 'category', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RoleListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des rôles (allégé)"""
    permissions_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_active', 'permissions_count', 'users_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_permissions_count(self, obj):
        """Retourne le nombre de permissions du rôle"""
        return obj.permissions.count()
    
    def get_users_count(self, obj):
        """Retourne le nombre d'utilisateurs ayant ce rôle"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(role=obj.name).count()


class RoleDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un rôle avec ses permissions"""
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=PermissionSGIC.objects.all(),
        source='permissions',
        write_only=True,
        required=False
    )
    permissions_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = [
            'id', 'name', 'description', 'is_active',
            'permissions', 'permission_ids',
            'permissions_count', 'users_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_permissions_count(self, obj):
        """Retourne le nombre de permissions du rôle"""
        return obj.permissions.count()
    
    def get_users_count(self, obj):
        """Retourne le nombre d'utilisateurs ayant ce rôle"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(role=obj.name).count()
    
    def validate_permission_ids(self, value):
        """Validation: au moins une permission est requise"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("Un rôle doit contenir au minimum 1 permission.")
        return value
    
    def create(self, validated_data):
        """Création d'un rôle avec ses permissions"""
        permissions = validated_data.pop('permissions', [])
        role = Role.objects.create(**validated_data)
        if permissions:
            role.permissions.set(permissions)
        return role
    
    def update(self, instance, validated_data):
        """Mise à jour d'un rôle avec ses permissions"""
        permissions = validated_data.pop('permissions', None)
        
        # Mettre à jour les champs du rôle
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mettre à jour les permissions si fournies
        if permissions is not None:
            if len(permissions) == 0:
                raise serializers.ValidationError("Un rôle doit contenir au minimum 1 permission.")
            instance.permissions.set(permissions)
        
        return instance
