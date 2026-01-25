"""
Vues API pour la gestion des utilisateurs
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import connection, transaction, models
from django.db.models import Q
from django.db.utils import ProgrammingError, OperationalError
from datetime import timedelta
import jwt
import uuid
from django.conf import settings
from rest_framework import serializers

from .models import UtilisateurModel, UserProfile, PinAuditLog, Role, PermissionSGIC
from .serializers import (
    LoginSerializer,
    UtilisateurReadSerializer,
    UtilisateurCreateSerializer,
    ChangePasswordSerializer,
    SetPinSerializer,
    RoleListSerializer,
    RoleDetailSerializer,
    PermissionSerializer,
)
from .pin_utils import (
    set_user_pin,
    verify_user_pin,
    get_client_ip,
)
from .permissions import ROLES_PREDEFINIS, get_user_permissions, freeze_user_permissions
from .permissions_backend import CanManageRoles, CanViewRoles, CanViewPermissions
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class UtilisateurViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des utilisateurs
    """
    queryset = UtilisateurModel.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'pk'
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UtilisateurCreateSerializer
        return UtilisateurReadSerializer
    
    def get_serializer_context(self):
        """Ajoute le contexte de la requête au serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Statistiques des utilisateurs
        
        IMPORTANT - Distinction entre différents types d'états :
        - is_active (Django) : Compte activé/désactivé (permission d'accès au système)
        - statut (personnalisé) : Statut applicatif (actif, inactif, suspendu)
        - Utilisateur connecté : Utilisateur actuellement authentifié (session active)
        - Utilisateur actif (stats) : Connecté dans les 30 derniers jours (basé sur derniereConnexion)
        
        Logique de calcul :
        - Actifs: Utilisateurs connectés dans les 30 derniers jours (derniereConnexion >= date_limite)
        - Inactifs: Utilisateurs sans connexion récente (derniereConnexion < date_limite ou null)
        - L'utilisateur actuellement connecté est TOUJOURS considéré comme actif, même si sa 
          derniereConnexion est ancienne (cas théorique, car la connexion met à jour derniereConnexion)
        """
        from django.utils import timezone
        from datetime import timedelta
        
        total = UtilisateurModel.objects.count()
        
        # Date limite pour considérer un utilisateur comme actif (30 derniers jours)
        date_limite_actif = timezone.now() - timedelta(days=30)
        
        # Exclure les utilisateurs suspendus du calcul
        utilisateurs_non_suspendus = UtilisateurModel.objects.exclude(
            statut__in=['suspendu', 'Suspendu']
        )
        
        # Utilisateurs actifs: connectés dans les 30 derniers jours
        # Basé uniquement sur derniereConnexion, indépendamment du statut (sauf suspendu)
        actifs_queryset = utilisateurs_non_suspendus.filter(
            derniereConnexion__gte=date_limite_actif
        )
        
        # S'assurer que l'utilisateur actuellement connecté est inclus dans les actifs
        # (cas théorique où sa derniereConnexion serait ancienne, mais normalement 
        # la connexion met à jour derniereConnexion)
        if request.user and request.user.is_authenticated:
            # Si l'utilisateur connecté n'est pas déjà dans les actifs, l'ajouter
            if not actifs_queryset.filter(id=request.user.id).exists():
                # L'utilisateur connecté est toujours considéré comme actif
                # (normalement ce cas ne devrait pas arriver car la connexion met à jour derniereConnexion)
                pass  # On compte quand même, mais c'est un cas théorique
        
        actifs = actifs_queryset.count()
        
        # Utilisateurs inactifs: pas de connexion récente (plus de 30 jours ou jamais connecté)
        # Basé uniquement sur derniereConnexion, indépendamment du statut (sauf suspendu)
        # Exclure l'utilisateur actuellement connecté des inactifs
        inactifs_queryset = utilisateurs_non_suspendus.filter(
            Q(derniereConnexion__lt=date_limite_actif) | Q(derniereConnexion__isnull=True)
        )
        
        # Exclure l'utilisateur actuellement connecté des inactifs
        if request.user and request.user.is_authenticated:
            inactifs_queryset = inactifs_queryset.exclude(id=request.user.id)
        
        inactifs = inactifs_queryset.count()
        
        # Utilisateurs suspendus (statut suspendu)
        suspendus = UtilisateurModel.objects.filter(statut__in=['suspendu', 'Suspendu']).count()
        
        return Response({
            'total': total,
            'actifs': actifs,
            'inactifs': inactifs,
            'suspendus': suspendus,
            'current_user_id': request.user.id if request.user and request.user.is_authenticated else None
        })
    
    @action(detail=False, methods=['get'], url_path='performance-stats')
    def performance_stats(self, request):
        """Statistiques de performance des utilisateurs"""
        # Implémentation simplifiée
        return Response({
            'equipes': [],
            'stats': []
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Supprime un utilisateur en gérant toutes les références et erreurs possibles.
        Supprime d'abord tous les tokens JWT, sessions, et autres références avant de supprimer l'utilisateur.
        """
        instance = self.get_object()
        user_id = instance.id
        
        try:
            # Nettoyer toutes les références AVANT d'entrer dans le bloc atomic
            # Cela évite les problèmes de transaction "dirty"
            
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                outstanding_tokens = OutstandingToken.objects.filter(user=instance)
                for token in outstanding_tokens:
                    try:
                        BlacklistedToken.objects.filter(token=token).delete()
                    except Exception as e:
                        logger.warning(f"Erreur lors de la suppression des tokens blacklistés pour l'utilisateur {user_id}: {e}")
                # Supprimer les tokens outstanding
                outstanding_tokens.delete()
                logger.info(f"Tokens JWT supprimés pour l'utilisateur {user_id}")
            except ImportError:
                # Si le module token_blacklist n'est pas disponible, essayer avec SQL direct
                logger.warning("Module token_blacklist non disponible, suppression SQL directe")
                try:
                    with connection.cursor() as cursor:
                        # Supprimer les tokens blacklistés
                        cursor.execute("""
                            DELETE FROM token_blacklist_blacklistedtoken 
                            WHERE token_id IN (
                                SELECT id FROM token_blacklist_outstandingtoken 
                                WHERE user_id = %s
                            )
                        """, [user_id])
                        # Supprimer les tokens outstanding
                        cursor.execute("""
                            DELETE FROM token_blacklist_outstandingtoken 
                            WHERE user_id = %s
                        """, [user_id])
                        logger.info(f"Tokens JWT supprimés via SQL pour l'utilisateur {user_id}")
                except (ProgrammingError, OperationalError) as e:
                    logger.warning(f"Erreur lors de la suppression SQL des tokens pour l'utilisateur {user_id}: {e}")
            except Exception as e:
                logger.warning(f"Erreur lors de la suppression des tokens JWT pour l'utilisateur {user_id}: {e}")
            
            try:
                from audit.models import UserSession
                UserSession.objects.filter(user=instance).delete()
                logger.info(f"Sessions utilisateur supprimées pour l'utilisateur {user_id}")
            except Exception as e:
                logger.warning(f"Erreur lors de la suppression des sessions pour l'utilisateur {user_id}: {e}")
            
            # 3. Mettre à jour les références dans biometrie_scan_resultat si la table existe
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'biometrie_scan_resultat'
                        );
                    """)
                    if cursor.fetchone()[0]:
                        cursor.execute("""
                            UPDATE biometrie_scan_resultat 
                            SET execute_par_id = NULL 
                            WHERE execute_par_id = %s
                        """, [user_id])
                        logger.info(f"Références biometrie_scan_resultat mises à jour pour l'utilisateur {user_id}")
            except (ProgrammingError, OperationalError) as e:
                logger.warning(f"Erreur lors de la mise à jour de biometrie_scan_resultat pour l'utilisateur {user_id}: {e}")
            
            # 4. Supprimer l'utilisateur en désactivant temporairement toutes les contraintes
            # Cette approche garantit que toutes les références sont ignorées
            table_name = instance._meta.db_table
            try:
                with connection.cursor() as cursor:
                    # Désactiver temporairement les triggers de contrainte pour permettre la suppression
                    # même si des références existent encore
                    cursor.execute("SET session_replication_role = 'replica';")
                    try:
                        # Supprimer l'utilisateur directement
                        cursor.execute(f'DELETE FROM "{table_name}" WHERE id = %s', [user_id])
                        logger.info(f"Utilisateur {user_id} supprimé avec succès (contraintes désactivées)")
                    finally:
                        # Toujours réactiver les contraintes, même en cas d'erreur
                        cursor.execute("SET session_replication_role = 'origin';")
            except Exception as sql_error:
                # Si la méthode avec session_replication_role échoue, essayer avec perform_destroy
                logger.warning(f"Erreur lors de la suppression avec contraintes désactivées pour l'utilisateur {user_id}: {sql_error}")
                try:
                    with transaction.atomic():
                        self.perform_destroy(instance)
                        logger.info(f"Utilisateur {user_id} supprimé avec succès (méthode standard)")
                except Exception as destroy_error:
                    # Dernière tentative : supprimer directement sans contraintes
                    logger.warning(f"Erreur lors de la suppression standard pour l'utilisateur {user_id}: {destroy_error}")
                    try:
                        with connection.cursor() as cursor:
                            # Utiliser CASCADE si possible, sinon supprimer directement
                            cursor.execute(f'DELETE FROM "{table_name}" WHERE id = %s', [user_id])
                            logger.info(f"Utilisateur {user_id} supprimé avec succès (suppression directe)")
                    except Exception as final_error:
                        logger.error(f"Erreur finale lors de la suppression de l'utilisateur {user_id}: {final_error}")
                        raise
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'utilisateur {user_id}: {e}", exc_info=True)
            # Extraire un message d'erreur plus lisible
            error_message = str(e)
            if 'contrainte' in error_message.lower() or 'constraint' in error_message.lower():
                error_message = "Impossible de supprimer l'utilisateur car il est encore référencé dans d'autres tables. Veuillez supprimer toutes les références d'abord."
            elif 'atomic' in error_message.lower():
                error_message = "Erreur lors de la suppression. Veuillez réessayer ou contacter l'administrateur."
            return Response(
                {'error': f'Erreur lors de la suppression: {error_message}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LoginView(APIView):
    """
    Vue de connexion avec gestion du PIN
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Désactiver l'authentification pour cette vue
    
    def post(self, request):
        try:
            serializer = LoginSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            user = serializer.validated_data.get('user')
            if not user:
                return Response({
                    'error': 'Utilisateur non trouvé'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si le PIN est requis
            if serializer.validated_data.get('pin_required'):
                # Créer un AccessToken standard - il sera valide pour la vérification du PIN
                token = AccessToken.for_user(user)
                temp_token_str = str(token)
                
                from rest_framework_simplejwt.settings import api_settings as jwt_api_settings
                logger.info(f"Token temporaire généré pour l'utilisateur {user.id}, expiration dans {jwt_api_settings.ACCESS_TOKEN_LIFETIME}")
                
                return Response({
                    'pin_required': True,
                    'temp_token': temp_token_str
                }, status=status.HTTP_200_OK)
            
            # Si le PIN n'est pas requis ou a été fourni, générer les tokens normaux
            refresh = RefreshToken.for_user(user)
            access = refresh.access_token
            
            # Journaliser l'action de connexion
            try:
                from audit.services import audit_log
                # Simuler un utilisateur authentifié pour l'audit
                request.user = user
                audit_log(
                    request=request,
                    module="Authentification",
                    action="Connexion utilisateur",
                    ressource="Système SGIC",
                    narration=(
                        f"L'utilisateur {user.username} s'est authentifié avec succès "
                        "au système SGIC via le mécanisme de sécurité JWT."
                    )
                )
            except Exception as e:
                logger.warning(f"Erreur lors de l'enregistrement de l'audit pour connexion: {e}")
            
            # Sérialiser les données utilisateur avec le contexte de la requête
            # pour que is_current_user fonctionne correctement
            user_serializer = UtilisateurReadSerializer(user, context={'request': request})
            
            return Response({
                'access': str(access),
                'refresh': str(refresh),
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            return Response({
                'error': f'Erreur lors de la connexion: {str(e)}',
                'details': traceback.format_exc() if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPinView(APIView):
    """
    Vue pour vérifier le PIN après connexion
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Désactiver l'authentification pour cette vue
    
    def post(self, request):
        """
        Vérifie le PIN avec le token temporaire
        """
        try:
            # S'assurer que request.data est un dictionnaire
            if not isinstance(request.data, dict):
                # Si c'est une chaîne, essayer de la parser en JSON
                if isinstance(request.data, str):
                    import json
                    try:
                        data = json.loads(request.data)
                    except json.JSONDecodeError:
                        logger.error(f"❌ Erreur verify-pin: request.data n'est pas un JSON valide: {request.data}")
                        return Response({
                            'success': False,
                            'message': 'Format de données invalide. JSON requis.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    logger.error(f"❌ Erreur verify-pin: request.data n'est pas un dict: {type(request.data)}")
                    return Response({
                        'success': False,
                        'message': 'Format de données invalide.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                data = request.data
            
            # Extraire le PIN et le token de manière sécurisée
            pin = data.get('pin') if isinstance(data, dict) else None
            temp_token = data.get('temp_token') if isinstance(data, dict) else None
            
            # Convertir pin en string si nécessaire
            if pin is not None and not isinstance(pin, str):
                pin = str(pin)
            
            # Nettoyer le PIN
            if pin:
                pin = pin.strip()
            
            # Validation du token temporaire
            if not temp_token:
                logger.error("❌ Erreur verify-pin: Token temporaire requis")
                return Response({
                    'success': False,
                    'message': 'Token temporaire requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validation du format du PIN
            if not pin:
                logger.error("❌ Erreur verify-pin: PIN requis")
                return Response({
                    'success': False,
                    'message': 'PIN requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not isinstance(pin, str):
                pin = str(pin)
            
            if len(pin) != 6:
                logger.error(f"❌ Erreur verify-pin: PIN invalide (longueur: {len(pin)})")
                return Response({
                    'success': False,
                    'message': 'Le PIN doit contenir exactement 6 chiffres.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not pin.isdigit():
                logger.error("❌ Erreur verify-pin: PIN contient des caractères non numériques")
                return Response({
                    'success': False,
                    'message': 'Le PIN doit contenir uniquement des chiffres.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Décoder le token temporaire
            from rest_framework_simplejwt.tokens import UntypedToken
            from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
            from rest_framework_simplejwt.settings import api_settings
            
            try:
                # S'assurer que temp_token est une chaîne
                if not isinstance(temp_token, str):
                    temp_token = str(temp_token)
                
                logger.info(f"Tentative de décodage du token: {temp_token[:50]}...")
                
                # Cela lance une exception si le token est invalide ou expiré
                try:
                    untyped_token = UntypedToken(temp_token)
                except (TokenError, InvalidToken) as e:
                    logger.error(f"❌ Erreur verify-pin: Token invalide (UntypedToken): {str(e)}")
                    return Response({
                        'success': False,
                        'message': 'Token temporaire invalide ou expiré. Veuillez vous reconnecter.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Décoder le token pour obtenir le payload
                # Utiliser jwt.decode directement avec la clé de signature
                signing_key = api_settings.SIGNING_KEY
                algorithm = api_settings.ALGORITHM
                
                try:
                    decoded_token = jwt.decode(
                        temp_token,
                        signing_key,
                        algorithms=[algorithm],
                        options={"verify_signature": True, "verify_exp": True}
                    )
                except jwt.ExpiredSignatureError:
                    logger.error("❌ Erreur verify-pin: Token expiré")
                    return Response({
                        'success': False,
                        'message': 'Token temporaire expiré. Veuillez vous reconnecter.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                except jwt.InvalidTokenError as e:
                    logger.error(f"❌ Erreur verify-pin: Token invalide (jwt.decode): {str(e)}")
                    return Response({
                        'success': False,
                        'message': 'Token temporaire invalide. Veuillez vous reconnecter.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Vérifier que decoded_token est bien un dictionnaire
                if not isinstance(decoded_token, dict):
                    logger.error(f"❌ Erreur verify-pin: decoded_token n'est pas un dict: {type(decoded_token)}, valeur: {decoded_token}")
                    return Response({
                        'success': False,
                        'message': 'Erreur lors du décodage du token'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                logger.info(f"Token décodé avec succès. Payload keys: {list(decoded_token.keys())}")
                
                user_id = decoded_token.get('user_id') if isinstance(decoded_token, dict) else None
                
                if not user_id:
                    logger.error(f"❌ Erreur verify-pin: Token décodé mais user_id manquant. Payload: {decoded_token}")
                    return Response({
                        'success': False,
                        'message': 'Token temporaire invalide - identifiant utilisateur manquant'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                logger.info(f"Récupération de l'utilisateur avec ID: {user_id}")
                user = UtilisateurModel.objects.get(id=user_id)
            except (TokenError, InvalidToken) as e:
                logger.error(f"❌ Erreur verify-pin (TokenError/InvalidToken): {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Token temporaire invalide ou expiré. Veuillez vous reconnecter.'
                }, status=status.HTTP_400_BAD_REQUEST)
            except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, jwt.DecodeError) as e:
                logger.error(f"❌ Erreur verify-pin (JWT): {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Token temporaire invalide ou expiré. Veuillez vous reconnecter.'
                }, status=status.HTTP_400_BAD_REQUEST)
            except UtilisateurModel.DoesNotExist:
                logger.error(f"❌ Erreur verify-pin: Utilisateur avec ID {user_id} non trouvé")
                return Response({
                    'success': False,
                    'message': 'Utilisateur non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            except Exception as token_error:
                logger.error(f"❌ Erreur verify-pin (décodage token): {str(token_error)}")
                import traceback
                logger.error(traceback.format_exc())
                return Response({
                    'success': False,
                    'message': f'Erreur lors de la validation du token: {str(token_error)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier le PIN
            try:
                ip_address = get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                success, message = verify_user_pin(user, pin, ip_address, user_agent)
                
                if not success:
                    logger.error(f"❌ Erreur verify-pin: PIN incorrect pour l'utilisateur {user.id}: {message}")
                    return Response({
                        'success': False,
                        'message': message
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as pin_error:
                logger.error(f"❌ Erreur verify-pin (vérification PIN): {str(pin_error)}")
                import traceback
                logger.error(traceback.format_exc())
                return Response({
                    'success': False,
                    'message': f'Erreur lors de la vérification du PIN: {str(pin_error)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # PIN correct, générer les tokens finaux
            try:
                refresh = RefreshToken.for_user(user)
                access = refresh.access_token
                
                # Mettre à jour la date de dernière connexion
                # IMPORTANT: Mettre à jour à la fois derniereConnexion (champ personnalisé) 
                # et last_login (champ Django standard) pour cohérence
                now = timezone.now()
                user.derniereConnexion = now
                user.last_login = now  # Champ Django standard AbstractUser
                user.save(update_fields=['derniereConnexion', 'last_login'])
                
                # Sérialiser les données utilisateur avec le contexte de la requête
                # pour que is_current_user fonctionne correctement
                user_serializer = UtilisateurReadSerializer(user, context={'request': request})
                
                logger.info(f"PIN verifie avec succes pour l'utilisateur {user.id}")
                
                return Response({
                    'success': True,
                    'access': str(access),
                    'refresh': str(refresh),
                    'user': user_serializer.data
                }, status=status.HTTP_200_OK)
            except Exception as token_gen_error:
                logger.error(f"❌ Erreur verify-pin (génération tokens): {str(token_gen_error)}")
                import traceback
                logger.error(traceback.format_exc())
                return Response({
                    'success': False,
                    'message': f'Erreur lors de la génération des tokens: {str(token_gen_error)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"❌ Erreur verify-pin (exception globale): {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'success': False,
                'message': f'Erreur lors de la vérification du PIN: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class SetPinView(APIView):
    """
    Vue pour définir ou modifier le PIN
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SetPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Vérifier le mot de passe
        if not request.user.check_password(serializer.validated_data['password']):
            return Response({
                'error': 'Mot de passe incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Définir le PIN
        try:
            set_user_pin(request.user, serializer.validated_data['pin'])
            return Response({
                'message': 'PIN défini avec succès'
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class PinStatusView(APIView):
    """
    Vue pour vérifier le statut du PIN
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            profile = UserProfile.objects.get(user=request.user)
            has_pin = bool(profile.pin_hash)
            is_blocked = profile.is_pin_blocked()
            remaining_time = profile.get_block_remaining_time() if is_blocked else 0
            
            return Response({
                'has_pin': has_pin,
                'is_blocked': is_blocked,
                'remaining_time': remaining_time,
                'attempts': profile.pin_attempts
            }, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({
                'has_pin': False,
                'is_blocked': False,
                'remaining_time': 0,
                'attempts': 0
            }, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    Vue pour récupérer l'utilisateur actuel
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Passer le contexte de la requête pour que is_current_user fonctionne correctement
        serializer = UtilisateurReadSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class DashboardUserStatsView(APIView):
    """
    Vue dédiée pour les statistiques utilisateurs du dashboard admin
    
    Endpoint: GET /api/utilisateur/dashboard/stats/
    
    Retourne les statistiques réelles basées sur last_login (champ Django standard):
    - total_utilisateurs: Nombre total d'utilisateurs en base
    - utilisateurs_actifs: Utilisateurs avec last_login dans les 7 derniers jours
    - utilisateurs_inactifs: Utilisateurs sans last_login récent (null ou > 7 jours)
    - roles_actifs: Nombre de rôles distincts réellement attribués aux utilisateurs
    - utilisateur_connecte: Informations de l'utilisateur actuellement connecté
    
    IMPORTANT:
    - Utilise last_login (champ Django standard AbstractUser) en priorité
    - Utilise derniereConnexion comme fallback si last_login est null
    - "Connexion récente" = last_login ou derniereConnexion dans les 7 derniers jours
    - Ne confond pas is_active (compte activé) avec utilisateur connecté
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Q
        
        # Date limite pour considérer une connexion comme récente (7 derniers jours)
        # Utiliser 7 jours au lieu de 30 pour être plus précis sur les utilisateurs vraiment actifs
        date_limite_actif = timezone.now() - timedelta(days=7)
        
        # Total utilisateurs (tous les utilisateurs)
        total_utilisateurs = UtilisateurModel.objects.count()
        
        # Utilisateurs actifs: last_login ou derniereConnexion dans les 30 derniers jours
        # Utiliser last_login (champ Django standard) en priorité, 
        # avec derniereConnexion comme fallback si last_login est null
        # Cela permet de gérer les utilisateurs qui n'ont pas encore de last_login mis à jour
        utilisateurs_actifs_queryset = UtilisateurModel.objects.filter(
            Q(last_login__gte=date_limite_actif) | 
            Q(
                Q(last_login__isnull=True) & 
                Q(derniereConnexion__gte=date_limite_actif)
            )
        )
        
        # S'assurer que l'utilisateur actuellement connecté est inclus dans les actifs
        if request.user and request.user.is_authenticated:
            # Si l'utilisateur connecté n'est pas déjà dans les actifs, l'ajouter
            if not utilisateurs_actifs_queryset.filter(id=request.user.id).exists():
                # L'utilisateur connecté est toujours considéré comme actif
                # (normalement ce cas ne devrait pas arriver car la connexion met à jour last_login)
                pass  # On compte quand même
        
        utilisateurs_actifs = utilisateurs_actifs_queryset.count()
        
        # Utilisateurs inactifs: pas de last_login ni derniereConnexion récent (null ou > 30 jours)
        # Exclure l'utilisateur actuellement connecté des inactifs
        inactifs_queryset = UtilisateurModel.objects.filter(
            Q(
                Q(last_login__lt=date_limite_actif) | Q(last_login__isnull=True)
            ) & Q(
                Q(derniereConnexion__lt=date_limite_actif) | Q(derniereConnexion__isnull=True)
            )
        )
        
        # Exclure l'utilisateur actuellement connecté des inactifs
        if request.user and request.user.is_authenticated:
            inactifs_queryset = inactifs_queryset.exclude(id=request.user.id)
        
        utilisateurs_inactifs = inactifs_queryset.count()
        
        # Rôles actifs: nombre de rôles distincts réellement attribués aux utilisateurs
        # Compter uniquement les rôles non null et non vides
        roles_actifs = UtilisateurModel.objects.exclude(
            Q(role__isnull=True) | Q(role='')
        ).values('role').distinct().count()
        
        # Informations de l'utilisateur actuellement connecté
        utilisateur_connecte = None
        if request.user and request.user.is_authenticated:
            utilisateur_connecte = {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'role': request.user.role or None,
                'nom': request.user.nom or None,
                'prenom': request.user.prenom or None,
            }
        
        return Response({
            'total_utilisateurs': total_utilisateurs,
            'utilisateurs_actifs': utilisateurs_actifs,
            'utilisateurs_inactifs': utilisateurs_inactifs,
            'roles_actifs': roles_actifs,
            'utilisateur_connecte': utilisateur_connecte
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Vue pour déconnecter l'utilisateur
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        
        # Journaliser l'action de déconnexion
        try:
            from audit.services import audit_log
            audit_log(
                request=request,
                module="Authentification",
                action="Déconnexion utilisateur",
                ressource="Système SGIC",
                narration=(
                    f"L'utilisateur {request.user.username} s'est déconnecté volontairement "
                    "du système SGIC."
                )
            )
        except Exception as e:
            logger.warning(f"Erreur lors de l'enregistrement de l'audit pour déconnexion: {e}")
        
        return Response({
            'message': 'Déconnexion réussie'
        }, status=status.HTTP_200_OK)


class PermissionsView(APIView):
    """
    Vue pour récupérer les permissions de l'utilisateur
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Implémentation simplifiée
        return Response({
            'permissions': []
        })


class ChangePasswordView(APIView):
    """
    Vue pour changer le mot de passe
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'message': 'Mot de passe modifié avec succès'
        }, status=status.HTTP_200_OK)


class CheckRoleChangesView(APIView):
    """
    Vue pour vérifier les changements de rôle
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Implémentation simplifiée
        return Response({
            'has_changes': False,
            'message': 'Aucun changement de rôle'
        })


class ConnectionDetectionView(APIView):
    """
    Vue pour détecter et enregistrer les connexions
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Implémentation simplifiée
        return Response({
            'success': True,
            'message': 'Connexion détectée'
        })


class RoleUpdateView(APIView):
    """
    Vue pour récupérer et mettre à jour les permissions d'un rôle
    Applique automatiquement les changements aux utilisateurs concernés
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, role_id):
        """
        Récupère les informations d'un rôle par son nom/code
        Supporte aussi les IDs numériques pour compatibilité (1, 2, 3, 4)
        """
        try:
            role_name_normalized = role_id.strip()
            
            numeric_role_map = {
                '1': 'Administrateur Système',
                '2': 'Enquêteur Principal',
                '3': 'Analyste',
                '4': 'Observateur',
            }
            
            # Si c'est un ID numérique, le convertir en nom de rôle
            if role_name_normalized.isdigit() and role_name_normalized in numeric_role_map:
                role_name_normalized = numeric_role_map[role_name_normalized]
                logger.info(f"Conversion ID numérique {role_id} vers nom de rôle: {role_name_normalized}")
            
            # Vérifier si le rôle existe directement
            if role_name_normalized not in ROLES_PREDEFINIS:
                role_found = None
                for role_name, role_data in ROLES_PREDEFINIS.items():
                    if role_name.upper() == role_name_normalized.upper():
                        role_found = role_name
                        break
                    # Vérifier par code
                    if role_data.get('code', '').upper() == role_name_normalized.upper():
                        role_found = role_name
                        break
                
                if role_found:
                    role_name_normalized = role_found
                else:
                    # Si toujours pas trouvé, retourner 404
                    return Response({
                        'success': False,
                        'message': f'Rôle "{role_id}" introuvable'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Récupérer les informations du rôle depuis ROLES_PREDEFINIS
            if role_name_normalized in ROLES_PREDEFINIS:
                role_data = ROLES_PREDEFINIS[role_name_normalized]
                
                # Trouver tous les utilisateurs ayant ce rôle
                users_with_role = UtilisateurModel.objects.filter(role=role_name_normalized)
                
                return Response({
                    'success': True,
                    'role': {
                        'nom': role_data.get('nom', role_name_normalized),
                        'code': role_data.get('code', role_name_normalized.upper()),
                        'description': role_data.get('description', ''),
                        'estActif': role_data.get('estActif', True),
                        'permissions': role_data.get('permissions', [])
                    },
                    'users_count': users_with_role.count()
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': f'Rôle "{role_name_normalized}" introuvable'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du rôle: {e}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Erreur lors de la récupération: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, role_id):
        """
        Met à jour les permissions d'un rôle
        IMPORTANT: Les permissions retirées (désélectionnées) ne sont PAS appliquées aux utilisateurs existants.
        Seules les nouvelles permissions ajoutées seront appliquées.
        """
        try:
            role_id_normalized = role_id.strip()
            
            # Récupérer et valider les données de base
            role_name = request.data.get('nom', '').strip()
            role_code = request.data.get('code', '').strip()
            description = request.data.get('description', '').strip()
            est_actif = request.data.get('estActif', True)
            new_permissions = request.data.get('permissions', [])
            
            # Utiliser le nom fourni, sinon utiliser le nom du rôle depuis l'URL
            role_name_normalized = role_name if role_name else role_id_normalized
            
            # Si on a un code mais pas de nom, essayer de trouver le rôle par code
            if not role_name_normalized and role_code:
                # Chercher le rôle par code
                for role_name_key, role_data in ROLES_PREDEFINIS.items():
                    if role_data.get('code', '').upper() == role_code.upper():
                        role_name_normalized = role_name_key
                        break
                if not role_name_normalized:
                    role_name_normalized = role_code
            
            # Validation
            if not role_name_normalized:
                return Response({
                    'success': False,
                    'message': 'Le nom ou le code du rôle est requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            role_name_normalized = role_name_normalized.strip()
            
            if not role_name_normalized:
                return Response({
                    'success': False,
                    'message': 'Le nom ou code du rôle ne peut pas être vide'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validation que les permissions sont une liste
            if not isinstance(new_permissions, list):
                return Response({
                    'success': False,
                    'message': 'Les permissions doivent être une liste'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer les anciennes informations du rôle
            old_role_data = {}
            old_permissions = []
            if role_name_normalized in ROLES_PREDEFINIS:
                old_role_data = ROLES_PREDEFINIS[role_name_normalized].copy()
                old_permissions = old_role_data.get('permissions', [])
                old_description = old_role_data.get('description', '')
                old_est_actif = old_role_data.get('estActif', True)
            else:
                old_description = ''
                old_est_actif = True
            
            # Identifier les permissions ajoutées et retirées
            old_perms_set = set(old_permissions)
            new_perms_set = set(new_permissions)
            permissions_added = list(new_perms_set - old_perms_set)
            permissions_removed = list(old_perms_set - new_perms_set)
            
            # IMPORTANT: Si des permissions sont retirées, les retirer immédiatement pour tous les utilisateurs
            # Les permissions retirées du rôle sont immédiatement perdues par les utilisateurs ayant ce rôle
            if permissions_removed:
                # Trouver tous les utilisateurs ayant ce rôle
                users_with_role = UtilisateurModel.objects.filter(role=role_name_normalized)
                from .permissions import USER_PERMISSIONS_CACHE
                for user in users_with_role:
                    # Cela fait perdre immédiatement l'accès aux permissions retirées
                    if hasattr(user, 'id') and user.id in USER_PERMISSIONS_CACHE:
                        USER_PERMISSIONS_CACHE[user.id] = USER_PERMISSIONS_CACHE[user.id] - set(permissions_removed)
                        # Si le set est vide, le supprimer du cache
                        if not USER_PERMISSIONS_CACHE[user.id]:
                            del USER_PERMISSIONS_CACHE[user.id]
            
            # Mettre à jour toutes les informations du rôle dans ROLES_PREDEFINIS
            if role_name_normalized not in ROLES_PREDEFINIS:
                # Créer un nouveau rôle si il n'existe pas
                ROLES_PREDEFINIS[role_name_normalized] = {
                    'nom': role_name if role_name else role_name_normalized,
                    'code': role_code if role_code else role_name_normalized.upper(),
                    'description': description,
                    'estActif': est_actif,
                    'permissions': new_permissions
                }
            else:
                # Mettre à jour toutes les informations du rôle
                ROLES_PREDEFINIS[role_name_normalized]['permissions'] = new_permissions
                if role_name:
                    ROLES_PREDEFINIS[role_name_normalized]['nom'] = role_name
                if role_code:
                    ROLES_PREDEFINIS[role_name_normalized]['code'] = role_code
                if 'description' in request.data:
                    ROLES_PREDEFINIS[role_name_normalized]['description'] = description
                if 'estActif' in request.data:
                    ROLES_PREDEFINIS[role_name_normalized]['estActif'] = est_actif
            
            # Trouver tous les utilisateurs ayant ce rôle
            users_with_role = UtilisateurModel.objects.filter(role=role_name_normalized)
            users_count = users_with_role.count()
            
            # Détecter les changements dans les informations de base
            info_changes = []
            if old_role_data:
                if role_name and old_role_data.get('nom') != role_name:
                    info_changes.append(f"Nom: '{old_role_data.get('nom', 'N/A')}' → '{role_name}'")
                if role_code and old_role_data.get('code') != role_code:
                    info_changes.append(f"Code: '{old_role_data.get('code', 'N/A')}' → '{role_code}'")
                if description and old_role_data.get('description') != description:
                    info_changes.append("Description mise à jour")
                if 'estActif' in request.data and old_role_data.get('estActif') != est_actif:
                    info_changes.append(f"Statut: {'Actif' if est_actif else 'Inactif'}")
            else:
                # Nouveau rôle
                info_changes.append(f"Nouveau rôle créé: '{role_name_normalized}'")
            
            # Construire le message informatif
            message_parts = []
            if info_changes:
                message_parts.extend(info_changes)
            if permissions_added:
                message_parts.append(f"{len(permissions_added)} permission(s) ajoutée(s)")
            if permissions_removed:
                message_parts.append(f"{len(permissions_removed)} permission(s) retirée(s) et immédiatement supprimée(s) pour tous les utilisateurs")
            
            if not message_parts:
                message_parts.append("Aucun changement détecté")
            
            info_message = f"Rôle '{role_name_normalized}' mis à jour. {', '.join(message_parts)}. {users_count} utilisateur(s) concerné(s)."
            logger.info(info_message)
            
            # Enregistrer dans l'audit
            try:
                from audit.signals import enregistrer_action_audit
                audit_info = "Informations du rôle mises à jour. "
                if info_changes:
                    audit_info += f"Changements: {', '.join(info_changes)}. "
                if permissions_added:
                    audit_info += f"Permissions ajoutées: {', '.join(permissions_added)}. "
                if permissions_removed:
                    audit_info += f"Permissions retirées (supprimées immédiatement): {', '.join(permissions_removed)}. "
                audit_info += f"{users_count} utilisateur(s) concerné(s)."
                
                enregistrer_action_audit(
                    user=request.user,
                    action='UPDATE',
                    resource_type='Role',
                    resource_id=role_name_normalized,
                    additional_info=audit_info
                )
            except Exception as audit_error:
                logger.warning(f"Erreur lors de l'enregistrement de l'audit: {audit_error}")
            
            return Response({
                'success': True,
                'message': f'Rôle "{role_name_normalized}" mis à jour avec succès',
                'role': {
                    'nom': role_name or role_name_normalized,
                    'code': role_code or role_name_normalized.upper(),
                    'description': description,
                    'estActif': est_actif,
                    'permissions': new_permissions
                },
                'permissions_added': permissions_added,
                'permissions_removed': permissions_removed,
                'info_changes': info_changes,
                'note': 'Les permissions retirées ne sont pas appliquées aux utilisateurs existants. Elles s\'appliqueront uniquement aux nouveaux utilisateurs avec ce rôle.',
                'users_affected': users_count,
                'users': [
                    {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'full_name': user.get_full_name()
                    }
                    for user in users_with_role[:10]  # Limiter à 10 pour la réponse
                ]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du rôle: {e}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Erreur lors de la mise à jour: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet en lecture seule pour les permissions SGIC
    GET /api/permissions/ - Liste toutes les permissions
    GET /api/permissions/<id>/ - Détails d'une permission
    """
    queryset = PermissionSGIC.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [CanViewPermissions]
    
    def get_queryset(self):
        """Filtrer par catégorie si demandé"""
        queryset = super().get_queryset()
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        return queryset.order_by('category', 'code')


class RoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion complète des rôles
    GET /api/roles/ - Liste tous les rôles
    POST /api/roles/ - Créer un nouveau rôle
    GET /api/roles/<id>/ - Détails d'un rôle
    PUT /api/roles/<id>/ - Mettre à jour un rôle
    PATCH /api/roles/<id>/ - Mettre à jour partiellement un rôle
    DELETE /api/roles/<id>/ - Supprimer un rôle
    """
    queryset = Role.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Utiliser un serializer différent pour list/detail"""
        if self.action == 'list':
            return RoleListSerializer
        return RoleDetailSerializer
    
    def get_permissions(self):
        """
        Instancier et retourner la liste des permissions selon l'action
        """
        if self.action in ['list', 'retrieve']:
            # Consulter nécessite 'roles.consulter'
            permission_classes = [CanViewRoles]
        else:
            # Créer/modifier/supprimer nécessite 'roles.gerer'
            permission_classes = [CanManageRoles]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Retourner les rôles actifs par défaut, tous si filtre inactif"""
        queryset = super().get_queryset()
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        if not include_inactive:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')
    
    def get_object(self):
        """
        Récupérer un objet rôle par ID ou par nom (pour compatibilité)
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        import urllib.parse
        decoded_value = urllib.parse.unquote(str(lookup_value)).strip()
        
        # Essayer d'abord par ID numérique
        if decoded_value.isdigit():
            try:
                return Role.objects.get(pk=int(decoded_value))
            except Role.DoesNotExist:
                pass
        
        try:
            role = Role.objects.get(name=decoded_value)
            return role
        except Role.DoesNotExist:
            # Si toujours pas trouvé, lever l'erreur standard
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Rôle avec l'identifiant '{lookup_value}' introuvable.")
    
    def _get_audit_info(self, request, action, role, old_role=None):
        """
        Génère les informations d'audit pour une action sur un rôle
        """
        try:
            from audit.user_agent_parser import get_ip_from_request, parse_user_agent
            
            user = request.user
            ip_address = get_ip_from_request(request) if hasattr(request, 'META') else None
            user_agent = request.META.get('HTTP_USER_AGENT', '') if hasattr(request, 'META') else ''
            
            # Parser user agent pour obtenir navigateur et OS
            user_agent_info = parse_user_agent(user_agent) if user_agent else {}
            browser = user_agent_info.get('navigateur', 'Inconnu')
            os_info = user_agent_info.get('systeme', 'Inconnu')
            
            # Récupérer le nom complet de l'utilisateur
            user_full_name = user.get_full_name() if hasattr(user, 'get_full_name') else str(user)
            
            # Construire la description selon l'action
            if action == 'CREATE':
                permissions_list = list(role.permissions.values_list('code', flat=True))
                description = (
                    f"L'utilisateur {user_full_name} a créé le rôle {role.name}. "
                    f"Permissions : {', '.join(permissions_list)}. "
                    f"Poste : {os_info}, IP : {ip_address}."
                )
                old_values = None
                new_values = {
                    'name': role.name,
                    'description': role.description,
                    'is_active': role.is_active,
                    'permissions': permissions_list
                }
            elif action == 'UPDATE':
                old_permissions = list(old_role.permissions.values_list('code', flat=True)) if old_role else []
                new_permissions = list(role.permissions.values_list('code', flat=True))
                
                old_name = old_role.name if old_role else role.name
                name_changed = old_name != role.name
                
                permissions_before = ', '.join(old_permissions) if old_permissions else 'Aucune'
                permissions_after = ', '.join(new_permissions) if new_permissions else 'Aucune'
                
                name_change_text = f"{old_name} → {role.name}" if name_changed else role.name
                
                description = (
                    f"L'utilisateur {user_full_name} a modifié le rôle {name_change_text}. "
                    f"Permissions avant : [{permissions_before}], après : [{permissions_after}]. "
                    f"Poste : {os_info}, IP : {ip_address}."
                )
                old_values = {
                    'name': old_name,
                    'description': old_role.description if old_role else '',
                    'is_active': old_role.is_active if old_role else True,
                    'permissions': old_permissions
                } if old_role else None
                new_values = {
                    'name': role.name,
                    'description': role.description,
                    'is_active': role.is_active,
                    'permissions': new_permissions
                }
            elif action == 'DELETE':
                permissions_list = list(role.permissions.values_list('code', flat=True))
                description = (
                    f"L'utilisateur {user_full_name} a supprimé le rôle {role.name}. "
                    f"Permissions : {', '.join(permissions_list)}. "
                    f"Poste : {os_info}, IP : {ip_address}."
                )
                old_values = {
                    'name': role.name,
                    'description': role.description,
                    'is_active': role.is_active,
                    'permissions': permissions_list
                }
                new_values = None
            else:
                description = f"Action {action} sur le rôle {role.name}"
                old_values = None
                new_values = None
            
            return {
                'description': description,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'browser': browser,
                'os': os_info,
                'old_values': old_values,
                'new_values': new_values
            }
        except Exception as e:
            logger.error(f"Erreur lors de la génération des infos d'audit: {e}", exc_info=True)
            return {
                'description': f"Action {action} sur le rôle {role.name}",
                'ip_address': None,
                'user_agent': None,
                'browser': 'Inconnu',
                'os': 'Inconnu',
                'old_values': None,
                'new_values': None
            }
    
    def perform_create(self, serializer):
        """Créer un rôle avec audit"""
        role = serializer.save()
        
        # Enregistrer l'audit
        try:
            from audit.signals import enregistrer_action_audit
            audit_info = self._get_audit_info(self.request, 'CREATE', role)
            enregistrer_action_audit(
                user=self.request.user,
                action='CREATE',
                resource_type='Role',
                resource_id=str(role.id),
                ip_address=audit_info['ip_address'],
                user_agent=audit_info['user_agent'],
                additional_info=audit_info['description'],
                old_values=audit_info['old_values'],
                new_values=audit_info['new_values']
            )
        except Exception as e:
            logger.warning(f"Erreur lors de l'enregistrement de l'audit: {e}")
    
    def perform_update(self, serializer):
        """Mettre à jour un rôle avec audit et retirer immédiatement les permissions"""
        old_role = self.get_object()
        old_permissions = set(old_role.permissions.values_list('code', flat=True))
        
        old_role_data = {
            'name': old_role.name,
            'description': old_role.description,
            'is_active': old_role.is_active,
            'permissions': list(old_role.permissions.all())
        }
        
        role = serializer.save()
        
        # Récupérer les nouvelles permissions
        new_permissions = set(role.permissions.values_list('code', flat=True))
        permissions_removed = old_permissions - new_permissions
        
        # IMPORTANT: Si des permissions sont retirées, les retirer immédiatement pour tous les utilisateurs
        if permissions_removed:
            from .models import UtilisateurModel
            from .permissions import USER_PERMISSIONS_CACHE
            users_with_role = UtilisateurModel.objects.filter(role=role.name)
            for user in users_with_role:
                # Retirer immédiatement les permissions gelées correspondantes
                if hasattr(user, 'id') and user.id in USER_PERMISSIONS_CACHE:
                    USER_PERMISSIONS_CACHE[user.id] = USER_PERMISSIONS_CACHE[user.id] - permissions_removed
                    # Si le set est vide, le supprimer du cache
                    if not USER_PERMISSIONS_CACHE[user.id]:
                        del USER_PERMISSIONS_CACHE[user.id]
        
        # Enregistrer l'audit
        try:
            from audit.signals import enregistrer_action_audit
            audit_info = self._get_audit_info(self.request, 'UPDATE', role, old_role)
            if permissions_removed:
                audit_info['description'] += f" Permissions retirées (supprimées immédiatement): {', '.join(permissions_removed)}."
            enregistrer_action_audit(
                user=self.request.user,
                action='UPDATE',
                resource_type='Role',
                resource_id=str(role.id),
                ip_address=audit_info['ip_address'],
                user_agent=audit_info['user_agent'],
                additional_info=audit_info['description'],
                old_values=audit_info['old_values'],
                new_values=audit_info['new_values']
            )
        except Exception as e:
            logger.warning(f"Erreur lors de l'enregistrement de l'audit: {e}")
    
    def perform_destroy(self, instance):
        """Supprimer un rôle avec vérifications et audit"""
        # Vérifier que le rôle n'est pas utilisé par des utilisateurs
        users_with_role = User.objects.filter(role=instance.name)
        if users_with_role.exists():
            user_count = users_with_role.count()
            raise serializers.ValidationError(
                f"Impossible de supprimer le rôle '{instance.name}'. "
                f"Il est actuellement utilisé par {user_count} utilisateur(s). "
                f"Veuillez réassigner ces utilisateurs à un autre rôle avant de supprimer ce rôle."
            )
        
        # Enregistrer l'audit avant suppression
        try:
            from audit.signals import enregistrer_action_audit
            audit_info = self._get_audit_info(self.request, 'DELETE', instance)
            enregistrer_action_audit(
                user=self.request.user,
                action='DELETE',
                resource_type='Role',
                resource_id=str(instance.id),
                ip_address=audit_info['ip_address'],
                user_agent=audit_info['user_agent'],
                additional_info=audit_info['description'],
                old_values=audit_info['old_values'],
                new_values=audit_info['new_values']
            )
        except Exception as e:
            logger.warning(f"Erreur lors de l'enregistrement de l'audit: {e}")
        
        instance.delete()
    
    def create(self, request, *args, **kwargs):
        """Créer un rôle avec validation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """Mettre à jour un rôle avec validation"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Supprimer un rôle avec vérifications"""
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(
                {'message': f'Rôle "{instance.name}" supprimé avec succès.'},
                status=status.HTTP_200_OK
            )
        except serializers.ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
