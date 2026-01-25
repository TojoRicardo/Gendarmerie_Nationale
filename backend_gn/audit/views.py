"""
Vues pour le Journal d'Audit
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Sum, Case, When, IntegerField
from django.db.models.functions import TruncDate
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import AuditLog, JournalAudit, JournalAuditNarratif  # JournalAudit est un alias
from .serializers import (
    AuditLogSerializer,
    AuditLogCreateSerializer,
    AuditLogStatistiquesSerializer,
    # Alias pour compatibilité
    JournalAuditSerializer,
    JournalAuditCreateSerializer,
    JournalAuditStatistiquesSerializer,
    JournalAuditNarratifSerializer,
    JournalAuditNarratifListSerializer,
)

logger = logging.getLogger(__name__)


class JournalAuditPagination(PageNumberPagination):
    """Pagination personnalisée pour le Journal d'Audit."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class JournalAuditViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer le Journal d'Audit.
    
    Endpoints:
    - GET /api/audit/ : Liste paginée des entrées d'audit
    - GET /api/audit/{id}/ : Détails d'une entrée
    - POST /api/audit/ : Créer une entrée (description générée automatiquement)
    - GET /api/audit/statistiques/ : Statistiques globales
    - GET /api/audit/recherche/?q=terme : Recherche dans les descriptions
    """
    
    queryset = AuditLog.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = JournalAuditPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'resource_type', 'user__username', 'action']
    ordering_fields = ['timestamp', 'action', 'resource_type']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """
        Filtre le queryset selon les paramètres de requête.
        Les administrateurs voient tous les journaux, 
        les autres utilisateurs voient uniquement les leurs.
        """
        # Utiliser select_related pour optimiser les requêtes
        # La migration 0014 a ajouté le champ session, donc on peut l'utiliser
        # Mais on gère le cas où la migration n'a pas été appliquée avec un try/except
        try:
            queryset = AuditLog.objects.select_related('user', 'content_type', 'session').prefetch_related('user__groups')
        except Exception:
            queryset = AuditLog.objects.select_related('user', 'content_type').prefetch_related('user__groups')
        
        # Vérifier si l'utilisateur est admin
        user = self.request.user
        is_admin = False
        
        if user and user.is_authenticated:
            # Vérifier si c'est un superuser ou staff
            if user.is_superuser or getattr(user, 'is_staff', False):
                is_admin = True
            else:
                # Vérifier le rôle applicatif
                from utilisateur.permissions import user_is_app_admin
                is_admin = user_is_app_admin(user)
        
        # Filtre par utilisateur dans les paramètres de requête
        user_id = self.request.query_params.get('utilisateur', None)
        
        if user_id:
            # Si un filtre utilisateur est spécifié, l'appliquer
            queryset = queryset.filter(user_id=user_id)
        elif not is_admin:
            # Si l'utilisateur n'est pas admin et aucun filtre n'est spécifié,
            # limiter aux journaux de l'utilisateur connecté
            if user and user.is_authenticated:
                queryset = queryset.filter(user=user)
            else:
                # Si non authentifié, retourner un queryset vide
                queryset = queryset.none()
        # Si l'utilisateur est admin et aucun filtre n'est spécifié, retourner tous les journaux
        
        # Filtre par action
        action = self.request.query_params.get('action', None)
        if action:
            queryset = queryset.filter(action=action)
        
        # Filtre par ressource
        ressource = self.request.query_params.get('ressource', None)
        if ressource:
            queryset = queryset.filter(resource_type__icontains=ressource)
        
        # Filtre par module (alias pour ressource)
        module = self.request.query_params.get('module', None)
        if module:
            queryset = queryset.filter(resource_type__icontains=module)
        
        # Filtre par route frontend
        frontend_route = self.request.query_params.get('frontend_route', None)
        if frontend_route:
            queryset = queryset.filter(frontend_route__icontains=frontend_route)
        
        # Filtre par écran
        screen_name = self.request.query_params.get('screen_name', None)
        if screen_name:
            queryset = queryset.filter(screen_name__icontains=screen_name)
        
        # Filtre par date
        date_debut = self.request.query_params.get('date_debut', None)
        date_fin = self.request.query_params.get('date_fin', None)
        
        if date_debut:
            try:
                date_debut = datetime.fromisoformat(date_debut.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__gte=date_debut)
            except ValueError:
                pass
        
        if date_fin:
            try:
                date_fin = datetime.fromisoformat(date_fin.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__lte=date_fin)
            except ValueError:
                pass
        
        periode = self.request.query_params.get('periode', None)
        if periode:
            maintenant = timezone.now()
            if periode == 'aujourdhui':
                queryset = queryset.filter(timestamp__date=maintenant.date())
            elif periode == '7_jours':
                date_limite = maintenant - timedelta(days=7)
                queryset = queryset.filter(timestamp__gte=date_limite)
            elif periode == '30_jours':
                date_limite = maintenant - timedelta(days=30)
                queryset = queryset.filter(timestamp__gte=date_limite)
        
        # Filtre par succès/échec
        reussi = self.request.query_params.get('reussi', None)
        if reussi is not None:
            reussi_bool = reussi.lower() == 'true'
            queryset = queryset.filter(reussi=reussi_bool)
        
        ordering = self.request.query_params.get('ordering', '-timestamp')
        # Mapper date_action vers timestamp pour compatibilité
        if 'date_action' in ordering:
            ordering = ordering.replace('date_action', 'timestamp')
        
        # Valider que le champ de tri est autorisé
        if ordering.lstrip('-') in ['timestamp', 'action', 'resource_type']:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-timestamp')
        
        # Le queryset a déjà été optimisé avec select_related au début
        # Ne pas réappliquer select_related ici pour éviter de surcharger
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AuditLogCreateSerializer
        return AuditLogSerializer
    
    def list(self, request, *args, **kwargs):
        """Surcharge pour gérer les erreurs de sérialisation, la fusion optionnelle et le groupement par session."""
        try:
            # Vérifier si on demande le groupement par session
            group_by_session = request.query_params.get('group_by_session', 'false').lower() == 'true'
            
            if group_by_session:
                # Utiliser l'endpoint sessions pour regrouper toutes les actions d'une session
                return self.sessions(request)
            
            merge = request.query_params.get('merge', 'false').lower() == 'true'
            
            if merge:
                # Utiliser l'endpoint sessions pour la fusion
                return self.sessions(request)
            
            # Récupérer le queryset normal
            queryset = self.filter_queryset(self.get_queryset())
            
            # Filtrer les navigations dupliquées pour éviter d'afficher plusieurs fois la même navigation
            # dans un court laps de temps (pour une même connexion)
            deduplicate_navigations = request.query_params.get('deduplicate_navigations', 'true').lower() == 'true'
            
            if deduplicate_navigations:
                # Utiliser une approche SQL pour exclure les navigations dupliquées
                # On exclut les navigations qui ont une navigation plus récente (dans les 5 secondes)
                # avec les mêmes user_id, frontend_route et ip_address
                from django.db.models import Q, OuterRef, Exists, F
                from django.utils import timezone
                from datetime import timedelta
                
                # Sous-requête pour trouver les navigations dupliquées à exclure
                # Une navigation est un doublon si :
                # - C'est une navigation (action='NAVIGATION')
                # - Il existe une navigation plus récente avec les mêmes user_id, route et IP
                # - Et cette navigation plus récente est dans les 5 secondes suivantes
                duplicate_navs = AuditLog.objects.filter(
                    action='NAVIGATION',
                    user_id=OuterRef('user_id'),
                    frontend_route=OuterRef('frontend_route'),
                    ip_address=OuterRef('ip_address'),
                    timestamp__gt=OuterRef('timestamp'),
                    timestamp__lte=OuterRef('timestamp') + timedelta(seconds=5)
                )
                
                # Exclure les navigations qui ont des doublons plus récents
                queryset = queryset.exclude(
                    Q(action='NAVIGATION', frontend_route__isnull=False) & 
                    Exists(duplicate_navs)
                )
            
            # Utiliser la méthode list standard de DRF qui gère la pagination
            return super().list(request, *args, **kwargs)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la liste d'audit: {e}", exc_info=True)
            return Response(
                {'error': 'Erreur lors du chargement des entrées d\'audit', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def events(self, request):
        """
        Liste des événements d'audit (alias pour list).
        """
        return self.list(request)
    
    @action(detail=False, methods=['post'], url_path='log-navigation')
    def log_navigation(self, request):
        """
        Endpoint pour recevoir les logs de navigation depuis le frontend React.
        
        Body JSON:
        {
            "route": "/dashboard",
            "screen_name": "Dashboard",
            "action": "NAVIGATION" (optionnel, par défaut "VIEW")
        }
        """
        from .utils import log_action
        from .models import AuditLog
        
        try:
            route = request.data.get('route', '')
            screen_name = request.data.get('screen_name', '')
            action = request.data.get('action', 'VIEW')
            
            if not route:
                return Response(
                    {'error': 'Le champ "route" est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Vérifier s'il existe déjà un log de navigation très récent pour éviter les doublons
            from django.utils import timezone
            from datetime import timedelta
            
            # Vérifier les logs de navigation dans les 10 dernières secondes
            # Augmenté à 10 secondes pour éviter les doublons lors d'une même connexion/navigation
            recent_navigation = AuditLog.objects.filter(
                user=request.user if request.user.is_authenticated else None,
                action='NAVIGATION',
                frontend_route=route,
                timestamp__gte=timezone.now() - timedelta(seconds=10)
            ).order_by('-timestamp').first()
            
            if recent_navigation:
                # Mettre à jour le log existant avec le screen_name si nécessaire
                if screen_name and not recent_navigation.screen_name:
                    recent_navigation.screen_name = screen_name
                    recent_navigation.save(update_fields=['screen_name'])
                return Response({
                    'status': 'ok',
                    'message': 'Navigation déjà enregistrée',
                    'id': recent_navigation.id
                }, status=status.HTTP_200_OK)
            
            # Créer l'entrée d'audit pour la navigation
            audit_log = log_action(
                request=request,
                user=request.user if request.user.is_authenticated else None,
                action='NAVIGATION',  # Toujours utiliser NAVIGATION pour les navigations frontend
                resource_type='Navigation',
                resource_id=None,
            )
            
            if audit_log:
                # Mettre à jour avec les informations frontend
                audit_log.frontend_route = route
                audit_log.screen_name = screen_name or route
                audit_log.save(update_fields=['frontend_route', 'screen_name'])
                
                # Ajouter l'action au journal narratif
                if hasattr(request, 'current_user_session') and request.current_user_session:
                    from .narrative_audit_service import ajouter_action_narrative
                    ajouter_action_narrative(
                        request.current_user_session,
                        'navigation',
                        {
                            'route': route,
                            'screen_name': screen_name or route,
                        },
                        request
                    )
                
                return Response({
                    'status': 'ok',
                    'message': 'Navigation enregistrée',
                    'id': audit_log.id
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Erreur lors de la création de l\'entrée d\'audit'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de la navigation: {e}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='log-action-narrative')
    def log_action_narrative(self, request):
        """
        Endpoint pour recevoir des événements narratifs depuis le frontend React.
        
        Body JSON:
        {
            "action_type": "creation" | "modification" | "suppression" | "telechargement" | etc.,
            "details": {
                "resource_type": "fiche_criminelle",
                "resource_id": "123",
                "resource_name": "Nom de la ressource",
                ...
            }
        }
        """
        try:
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentification requise'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            action_type = request.data.get('action_type', '')
            details = request.data.get('details', {})
            
            if not action_type:
                return Response(
                    {'error': 'Le champ "action_type" est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Récupérer la session utilisateur
            if not hasattr(request, 'current_user_session') or not request.current_user_session:
                return Response(
                    {'error': 'Session utilisateur non trouvée'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Ajouter l'action au journal narratif
            from .narrative_audit_service import ajouter_action_narrative
            success = ajouter_action_narrative(
                request.current_user_session,
                action_type,
                details,
                request
            )
            
            if success:
                return Response({
                    'status': 'ok',
                    'message': 'Action narrative enregistrée'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Erreur lors de l\'enregistrement de l\'action narrative'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement de l'action narrative: {e}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='sessions')
    def sessions(self, request):
        """
        Retourne les logs d'audit groupés par session avec toutes les actions dans une seule entrée.
        
        Query params:
        - session_timeout: Timeout de session en minutes (défaut: 30)
        - date_debut: Filtrer par date de début
        - date_fin: Filtrer par date de fin
        - utilisateur: Filtrer par utilisateur
        - page: Numéro de page (défaut: 1)
        - page_size: Taille de page (défaut: 20)
        
        Returns:
        Liste des sessions avec toutes les actions groupées dans chaque session
        """
        try:
            from .utils_merge import group_audit_logs_into_sessions
            from .serializers import SessionAuditSerializer
            from datetime import timedelta
            
            # Récupérer le queryset de base
            queryset = self.get_queryset()
            
            # Appliquer les filtres
            date_debut = request.query_params.get('date_debut')
            date_fin = request.query_params.get('date_fin')
            utilisateur_id = request.query_params.get('utilisateur')
            
            if date_debut:
                queryset = queryset.filter(timestamp__gte=date_debut)
            if date_fin:
                queryset = queryset.filter(timestamp__lte=date_fin)
            if utilisateur_id:
                queryset = queryset.filter(user_id=utilisateur_id)
            
            # Paramètres de session
            session_timeout = int(request.query_params.get('session_timeout', 30))
            
            # Récupérer tous les logs
            all_logs = list(queryset.order_by('timestamp'))
            
            # Grouper par session
            sessions_dict = group_audit_logs_into_sessions(all_logs, session_timeout_minutes=session_timeout)
            
            # Construire les sessions avec toutes les informations
            sessions_list = []
            for session_id, session_logs in sessions_dict.items():
                if not session_logs:
                    continue
                
                # Trier les logs de la session par timestamp
                sorted_logs = sorted(session_logs, key=lambda x: x.timestamp if x.timestamp else timezone.now())
                
                first_log = sorted_logs[0]
                last_log = sorted_logs[-1]
                
                # Calculer la durée
                duration = None
                if first_log.timestamp and last_log.timestamp:
                    duration = int((last_log.timestamp - first_log.timestamp).total_seconds() / 60)
                
                session_data = {
                    'session_id': session_id,
                    'user': first_log.user,
                    'user_id': first_log.user_id,
                    'user_role': first_log.user_role,
                    'ip_address': first_log.ip_address,
                    'browser': first_log.browser,
                    'os': first_log.os,
                    'start_time': first_log.timestamp,
                    'end_time': last_log.timestamp,
                    'duration_minutes': duration,
                    'actions_count': len(sorted_logs),
                    'actions': sorted_logs,  # Toutes les actions de la session
                }
                
                sessions_list.append(session_data)
            
            sessions_list.sort(key=lambda x: x['start_time'] if x['start_time'] else timezone.now(), reverse=True)
            
            # Pagination
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            start = (page - 1) * page_size
            end = start + page_size
            
            paginated_sessions = sessions_list[start:end]
            
            # Sérialiser les sessions
            serializer = SessionAuditSerializer(paginated_sessions, many=True)
            
            return Response({
                'count': len(sessions_list),
                'next': f"?page={page + 1}" if end < len(sessions_list) else None,
                'previous': f"?page={page - 1}" if page > 1 else None,
                'results': serializer.data,
                'session_timeout_minutes': session_timeout,
            })
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des sessions d'audit: {e}", exc_info=True)
            return Response(
                {'error': 'Erreur lors du chargement des sessions', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def event_detail(self, request, pk=None):
        """
        Détails d'un événement d'audit (alias pour retrieve).
        """
        return self.retrieve(request, pk)
    
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """
        Retourne les statistiques globales du Journal d'Audit.
        Les administrateurs voient toutes les statistiques, 
        les autres utilisateurs voient uniquement les leurs.
        """
        # Vérifier si l'utilisateur est admin
        user = request.user
        is_admin = False
        
        if user and user.is_authenticated:
            # Vérifier si c'est un superuser ou staff
            if user.is_superuser or getattr(user, 'is_staff', False):
                is_admin = True
            else:
                # Vérifier le rôle applicatif
                from utilisateur.permissions import user_is_app_admin
                is_admin = user_is_app_admin(user)
        
        # Base queryset selon le rôle
        if is_admin:
            base_queryset = AuditLog.objects.all()
        else:
            # Utilisateurs non-admin : uniquement leurs journaux
            if user and user.is_authenticated:
                base_queryset = AuditLog.objects.filter(user=user)
            else:
                base_queryset = AuditLog.objects.none()
        
        maintenant = timezone.now()
        aujourdhui = maintenant.date()
        date_7_jours = maintenant - timedelta(days=7)
        date_30_jours = maintenant - timedelta(days=30)
        
        # Total général
        total_actions = base_queryset.count()
        
        # Actions par période
        actions_aujourdhui = base_queryset.filter(timestamp__date=aujourdhui).count()
        actions_7_jours = base_queryset.filter(timestamp__gte=date_7_jours).count()
        actions_30_jours = base_queryset.filter(timestamp__gte=date_30_jours).count()
        
        # Répartition par action
        par_action = dict(
            base_queryset.values('action')
            .annotate(count=Count('id'))
            .values_list('action', 'count')
        )
        
        # Répartition par ressource
        par_ressource = dict(
            base_queryset.values('resource_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
            .values_list('resource_type', 'count')
        )
        
        # Répartition par utilisateur
        par_utilisateur = dict(
            base_queryset
            .filter(user__isnull=False)
            .values('user__username')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
            .values_list('user__username', 'count')
        )
        
        # Actions réussies/échouées
        actions_reussies = base_queryset.filter(reussi=True).count()
        actions_echouees = base_queryset.filter(reussi=False).count()
        taux_reussite = (actions_reussies / total_actions * 100) if total_actions > 0 else 0
        
        data = {
            'total_actions': total_actions,
            'actions_aujourdhui': actions_aujourdhui,
            'actions_7_jours': actions_7_jours,
            'actions_30_jours': actions_30_jours,
            'par_action': par_action,
            'par_ressource': par_ressource,
            'par_utilisateur': par_utilisateur,
            'actions_reussies': actions_reussies,
            'actions_echouees': actions_echouees,
            'taux_reussite': round(taux_reussite, 2),
        }
        
        serializer = AuditLogStatistiquesSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recherche(self, request):
        """
        Recherche avancée dans les descriptions et autres champs.
        Les administrateurs peuvent rechercher dans tous les journaux, les autres utilisateurs uniquement dans les leurs.
        """
        terme = request.query_params.get('q', '')
        if not terme:
            return Response(
                {'error': 'Paramètre q (terme de recherche) requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            Q(description__icontains=terme) |
            Q(resource_type__icontains=terme) |
            Q(user__username__icontains=terme) |
            Q(action__icontains=terme) |
            Q(ip_address__icontains=terme)
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def analyser(self, request):
        """
        Analyse basique d'un ou plusieurs journaux d'audit.
        
        Body JSON:
        {
            "log_text": "texte du journal"  # Pour analyser un seul log
            OU
            "logs": ["log1", "log2", ...]  # Pour analyser plusieurs logs
        }
        
        Returns:
        {
            "resultat": {...}  # Si un seul log
            OU
            "resultats": [...]  # Si plusieurs logs
        }
        """
        log_text = request.data.get('log_text')
        logs = request.data.get('logs')
        
        def _analyze_simple_log(text):
            """Analyse simple d'un log sans IA."""
            if not text:
                return {
                    'evenement_type': 'autre',
                    'action': 'VIEW',
                    'utilisateur': 'Système',
                    'ip_address': None,
                    'statut': 'succès',
                    'score_confiance': 50,
                    'message': 'Analyse basique'
                }
            
            # Extraction basique sans IA
            resultat = {
                'evenement_type': 'autre',
                'action': 'VIEW',
                'utilisateur': 'Système',
                'ip_address': None,
                'statut': 'succès',
                'score_confiance': 50,
                'message': 'Module LLaMA supprimé - analyse basique uniquement'
            }
            
            # Détection basique de patterns
            text_lower = text.lower()
            if 'connecté' in text_lower or 'login' in text_lower:
                resultat['evenement_type'] = 'connexion'
                resultat['action'] = 'LOGIN'
            elif 'déconnecté' in text_lower or 'logout' in text_lower:
                resultat['evenement_type'] = 'deconnexion'
                resultat['action'] = 'LOGOUT'
            elif 'créé' in text_lower or 'create' in text_lower:
                resultat['evenement_type'] = 'creation'
                resultat['action'] = 'CREATE'
            elif 'modifié' in text_lower or 'update' in text_lower:
                resultat['evenement_type'] = 'modification'
                resultat['action'] = 'UPDATE'
            elif 'supprimé' in text_lower or 'delete' in text_lower:
                resultat['evenement_type'] = 'suppression'
                resultat['action'] = 'DELETE'
            
            # Extraction basique de l'utilisateur
            if 'utilisateur' in text:
                parts = text.split('utilisateur')
                if len(parts) > 1:
                    user_part = parts[1].split()[0] if parts[1].strip() else 'Système'
                    resultat['utilisateur'] = user_part
            
            # Extraction basique de l'IP
            import re
            ip_match = re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', text)
            if ip_match:
                resultat['ip_address'] = ip_match.group(0)
            
            return resultat
        
        if log_text:
            try:
                resultat = _analyze_simple_log(log_text)
                return Response({'resultat': resultat}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Erreur lors de l'analyse: {e}")
                return Response(
                    {'error': f'Erreur lors de l\'analyse: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        elif logs and isinstance(logs, list):
            try:
                resultats = [_analyze_simple_log(log) for log in logs]
                return Response({'resultats': resultats}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Erreur lors de l'analyse multiple: {e}")
                return Response(
                    {'error': f'Erreur lors de l\'analyse: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                {'error': 'Paramètre log_text ou logs requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def analyser_entrees(self, request):
        """
        Analyse basique des entrées d'audit existantes.
        
        Query params:
        - limit: Nombre d'entrées à analyser (défaut: 50)
        - date_debut: Filtrer par date de début
        - date_fin: Filtrer par date de fin
        - utilisateur: Filtrer par utilisateur
        
        Returns:
        {
            "total_analyses": 10,
            "resultats": [...],
            "ip_suspectes": [...],
            "statistiques": {...}
        }
        """
        # Récupérer les entrées à analyser
        queryset = self.get_queryset()
        
        # Limiter le nombre d'entrées
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]
        
        # Récupérer les journaux
        journaux = list(queryset.values('id', 'description', 'timestamp', 'user__username', 'ip_address', 'action'))
        
        if not journaux:
            return Response({
                'total_analyses': 0,
                'resultats': [],
                'ip_suspectes': [],
                'statistiques': {},
                'message': 'Module LLaMA supprimé - analyse basique uniquement'
            })
        
        # Analyse basique sans IA
        resultats = []
        for journal in journaux:
            resultat = {
                'journal_id': journal['id'],
                'date_action': journal['timestamp'].isoformat() if journal['timestamp'] else None,
                'utilisateur_original': journal['user__username'],
                'evenement_type': journal.get('action', 'VIEW').lower(),
                'action': journal.get('action', 'VIEW'),
                'ip_address': str(journal['ip_address']) if journal['ip_address'] else None,
                'statut': 'succès',
                'score_confiance': 50,
                'message': 'Module LLaMA supprimé - analyse basique uniquement'
            }
            resultats.append(resultat)
        
        ip_counts = {}
        for resultat in resultats:
            ip = resultat.get('ip_address')
            if ip:
                ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        ip_suspectes = [
            {'ip': ip, 'nombre_actions': count}
            for ip, count in ip_counts.items()
            if count > 10
        ]
        
        # Calculer les statistiques basiques
        evenements_par_type = {}
        statuts_par_type = {'succès': 0, 'échec': 0, 'autre': 0}
        
        for resultat in resultats:
            event_type = resultat.get('evenement_type', 'autre')
            evenements_par_type[event_type] = evenements_par_type.get(event_type, 0) + 1
            statuts_par_type['succès'] += 1
        
        statistiques = {
            'total_analyses': len(resultats),
            'evenements_par_type': evenements_par_type,
            'statuts': statuts_par_type,
            'ip_suspectes_count': len(ip_suspectes)
        }
        
        return Response({
            'total_analyses': len(resultats),
            'resultats': resultats,
            'ip_suspectes': ip_suspectes,
            'statistiques': statistiques,
            'message': 'Module LLaMA supprimé - analyse basique uniquement'
        })
    
    @action(detail=False, methods=['get'])
    def derniere_connexion(self, request):
        """
        Récupère la date de dernière connexion d'un utilisateur.
        
        Query params:
        - utilisateur: ID de l'utilisateur (requis)
        
        Returns:
        {
            "utilisateur_id": 1,
            "utilisateur_username": "user1",
            "derniere_connexion": "2025-01-15T10:30:00Z",
            "nombre_actions_depuis": 25
        }
        """
        user_id = request.query_params.get('utilisateur', None)
        if not user_id:
            return Response(
                {'error': 'Paramètre utilisateur (ID) requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Utilisateur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Trouver la dernière connexion de cet utilisateur
        derniere_connexion = AuditLog.objects.filter(
            user_id=user_id,
            action='LOGIN'
        ).order_by('-timestamp').first()
        
        if not derniere_connexion:
            return Response({
                'utilisateur_id': user_id,
                'utilisateur_username': user.username,
                'derniere_connexion': None,
                'nombre_actions_depuis': 0,
                'message': 'Aucune connexion trouvée pour cet utilisateur'
            })
        
        # Compter les actions depuis la dernière connexion
        nombre_actions = AuditLog.objects.filter(
            user_id=user_id,
            timestamp__gte=derniere_connexion.timestamp
        ).count()
        
        return Response({
            'utilisateur_id': user_id,
            'utilisateur_username': user.username,
            'derniere_connexion': derniere_connexion.timestamp.isoformat(),
            'nombre_actions_depuis': nombre_actions
        })
    
    @action(detail=False, methods=['delete', 'post'], url_path='clear-all')
    def clear_all(self, request):
        """
        Supprime toutes les entrées du journal d'audit.
        Réservé aux administrateurs système uniquement.
        
        POST /api/audit/clear-all/ - Supprime toutes les entrées
        """
        try:
            # Vérifier que l'utilisateur est authentifié
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {'success': False, 'message': 'Authentification requise'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Vérifier que l'utilisateur est administrateur système
            from utilisateur.permissions import user_is_app_admin
            if not user_is_app_admin(request.user):
                logger.warning(
                    f"Tentative de suppression du journal d'audit par un utilisateur non admin: {request.user.username}"
                )
                return Response(
                    {'success': False, 'message': 'Accès refusé. Seuls les administrateurs système peuvent supprimer le journal d\'audit.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Compter toutes les entrées d'audit avant suppression
            from utilisateur.models import PinAuditLog
            
            audit_log_count = AuditLog.objects.count()
            pin_audit_count = PinAuditLog.objects.count()
            total_count = audit_log_count + pin_audit_count
            
            if total_count == 0:
                return Response(
                    {
                        'success': True,
                        'message': 'Toutes les données d\'audit sont déjà vides.',
                        'deleted_count': {
                            'audit_logs': 0,
                            'pin_audit_logs': 0,
                            'total': 0
                        }
                    },
                    status=status.HTTP_200_OK
                )
            
            # Supprimer toutes les entrées dans une transaction
            from django.db import transaction
            with transaction.atomic():
                # Supprimer les entrées AuditLog
                deleted_audit_logs = AuditLog.objects.all().delete()[0]
                
                # Supprimer les entrées PinAuditLog
                deleted_pin_logs = PinAuditLog.objects.all().delete()[0]
                
                total_deleted = deleted_audit_logs + deleted_pin_logs
                
                # Note: On n'enregistre pas cette action dans le journal d'audit
            
            logger.info(
                f"Toutes les données d'audit vidées par {request.user.username}: "
                f"{deleted_audit_logs} entrées AuditLog et {deleted_pin_logs} entrées PinAuditLog supprimées"
            )
            
            return Response(
                {
                    'success': True,
                    'message': f'{total_deleted} entrée(s) supprimée(s) avec succès.',
                    'deleted_count': {
                        'audit_logs': deleted_audit_logs,
                        'pin_audit_logs': deleted_pin_logs,
                        'total': total_deleted
                    },
                    'details': {
                        'audit_logs': f'{deleted_audit_logs} entrée(s) du journal d\'audit principal',
                        'pin_audit_logs': f'{deleted_pin_logs} entrée(s) du journal d\'audit PIN'
                    }
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du journal d'audit: {e}", exc_info=True)
            return Response(
                {
                    'success': False,
                    'message': f'Erreur lors de la suppression: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='narrative-report')
    def narrative_report(self, request, pk=None):
        """
        Génère un journal narratif professionnel pour un log d'audit spécifique.
        
        GET /api/audit/{id}/narrative-report/ - Génère le rapport narratif
        """
        try:
            audit_log = self.get_object()
            
            # Extraire les informations du poste de travail depuis la requête actuelle
            from .narrative_generator import extract_workstation_info, generate_narrative_report
            
            workstation_info = extract_workstation_info(request)
            
            # Générer le rapport narratif
            narrative = generate_narrative_report(audit_log, workstation_info)
            
            return Response(
                {
                    'success': True,
                    'audit_log_id': audit_log.id,
                    'narrative_report': narrative,
                    'format': 'text/plain',
                    'reference': f"SGIC-AUDIT-{audit_log.timestamp.strftime('%Y-%m-%d')}-{audit_log.object_id or audit_log.id}" if audit_log.timestamp else "N/A"
                },
                status=status.HTTP_200_OK
            )
        except AuditLog.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Log d\'audit non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur lors de la génération du rapport narratif: {e}", exc_info=True)
            return Response(
                {'success': False, 'message': f'Erreur lors de la génération: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get', 'post'], url_path='narrative-reports')
    def narrative_reports(self, request):
        """
        Génère des journaux narratifs professionnels pour plusieurs logs d'audit.
        
        GET /api/audit/narrative-reports/?ids=1,2,3 - Génère les rapports pour les IDs spécifiés
        POST /api/audit/narrative-reports/ - Génère les rapports avec filtres dans le body
        """
        try:
            from .narrative_generator import generate_narrative_report_from_logs, extract_workstation_info
            
            # Extraire les IDs depuis les paramètres de requête ou le body
            if request.method == 'GET':
                ids_param = request.query_params.get('ids', '')
                if ids_param:
                    ids = [int(id.strip()) for id in ids_param.split(',') if id.strip().isdigit()]
                    audit_logs = AuditLog.objects.filter(id__in=ids)
                else:
                    return Response(
                        {'success': False, 'message': 'Paramètre "ids" requis (ex: ?ids=1,2,3)'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:  # POST
                data = request.data
                ids = data.get('ids', [])
                if ids:
                    audit_logs = AuditLog.objects.filter(id__in=ids)
                else:
                    # Utiliser les filtres pour récupérer les logs
                    filters = data.get('filters', {})
                    queryset = self.get_queryset()
                    
                    # Appliquer les filtres
                    if filters.get('user_id'):
                        queryset = queryset.filter(user_id=filters['user_id'])
                    if filters.get('action'):
                        queryset = queryset.filter(action=filters['action'])
                    if filters.get('date_from'):
                        queryset = queryset.filter(timestamp__gte=filters['date_from'])
                    if filters.get('date_to'):
                        queryset = queryset.filter(timestamp__lte=filters['date_to'])
                    if filters.get('resource_type'):
                        queryset = queryset.filter(resource_type=filters['resource_type'])
                    
                    # Limiter à 100 logs max
                    audit_logs = list(queryset[:100])
            
            if not audit_logs:
                return Response(
                    {'success': False, 'message': 'Aucun log d\'audit trouvé'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Extraire les informations du poste de travail
            workstation_info = extract_workstation_info(request)
            
            # Générer le rapport narratif groupé
            group_by_session = request.query_params.get('group_by_session', 'true').lower() == 'true'
            narrative = generate_narrative_report_from_logs(
                list(audit_logs), 
                group_by_session=group_by_session,
                workstation_info=workstation_info
            )
            
            return Response(
                {
                    'success': True,
                    'logs_count': len(audit_logs),
                    'narrative_report': narrative,
                    'format': 'text/plain',
                    'grouped_by_session': group_by_session
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Erreur lors de la génération des rapports narratifs: {e}", exc_info=True)
            return Response(
                {'success': False, 'message': f'Erreur lors de la génération: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JournalAuditNarratifViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet en lecture seule pour consulter les journaux d'audit narratifs.
    
    Endpoints:
    - GET /api/audit/narratifs/ : Liste paginée des journaux narratifs
    - GET /api/audit/narratifs/{id}/ : Détails d'un journal narratif complet
    - GET /api/audit/narratifs/mes-journaux/ : Journaux de l'utilisateur connecté
    """
    
    queryset = JournalAuditNarratif.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = JournalAuditPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description_narrative', 'user__username', 'user__first_name', 'user__last_name']
    ordering_fields = ['date_debut', 'date_fin', 'derniere_mise_a_jour']
    ordering = ['-date_debut']
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action."""
        if self.action == 'list':
            return JournalAuditNarratifListSerializer
        return JournalAuditNarratifSerializer
    
    def get_queryset(self):
        """
        Filtre le queryset selon les paramètres de requête.
        Les administrateurs voient tous les journaux,
        les autres utilisateurs voient uniquement les leurs.
        """
        queryset = JournalAuditNarratif.objects.select_related('user', 'session')
        
        # Vérifier si l'utilisateur est admin
        user = self.request.user
        is_admin = False
        
        if user and user.is_authenticated:
            # Vérifier si c'est un superuser ou staff
            if user.is_superuser or getattr(user, 'is_staff', False):
                is_admin = True
            else:
                # Vérifier le rôle applicatif
                from utilisateur.permissions import user_is_app_admin
                is_admin = user_is_app_admin(user)
        
        # Filtre par utilisateur dans les paramètres de requête
        user_id = self.request.query_params.get('utilisateur', None)
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        elif not is_admin:
            # Si l'utilisateur n'est pas admin, limiter aux journaux de l'utilisateur connecté
            if user and user.is_authenticated:
                queryset = queryset.filter(user=user)
            else:
                queryset = queryset.none()
        
        # Filtre par statut (clôturé ou non)
        est_cloture = self.request.query_params.get('est_cloture', None)
        if est_cloture is not None:
            est_cloture_bool = est_cloture.lower() == 'true'
            queryset = queryset.filter(est_cloture=est_cloture_bool)
        
        # Filtre par date de début
        date_debut_from = self.request.query_params.get('date_debut_from', None)
        date_debut_to = self.request.query_params.get('date_debut_to', None)
        if date_debut_from:
            try:
                date_debut_from = datetime.fromisoformat(date_debut_from.replace('Z', '+00:00'))
                queryset = queryset.filter(date_debut__gte=date_debut_from)
            except ValueError:
                pass
        if date_debut_to:
            try:
                date_debut_to = datetime.fromisoformat(date_debut_to.replace('Z', '+00:00'))
                queryset = queryset.filter(date_debut__lte=date_debut_to)
            except ValueError:
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='mes-journaux')
    def mes_journaux(self, request):
        """
        Retourne les journaux narratifs de l'utilisateur connecté.
        """
        queryset = self.get_queryset().filter(user=request.user)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='detail-complet')
    def detail_complet(self, request, pk=None):
        """
        Retourne le journal narratif complet avec toutes les informations.
        """
        journal = self.get_object()
        serializer = JournalAuditNarratifSerializer(journal)
        return Response(serializer.data)