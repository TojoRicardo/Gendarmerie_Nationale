from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q

from .models import Notification
from .serializers import NotificationSerializer, NotificationCreateSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les notifications"""
    
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        """Retourne uniquement les notifications de l'utilisateur connecté"""
        user = self.request.user
        queryset = Notification.objects.filter(utilisateur=user)
        
        lue = self.request.query_params.get('lue', None)
        if lue is not None:
            if lue.lower() == 'true':
                queryset = queryset.filter(lue=True)
            elif lue.lower() == 'false':
                queryset = queryset.filter(lue=False)
        
        return queryset
    
    def get_serializer_class(self):
        """Utiliser le bon serializer selon l'action"""
        if self.action == 'create':
            return NotificationCreateSerializer
        return NotificationSerializer
    
    def create(self, request, *args, **kwargs):
        """Créer une nouvelle notification"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Retourner avec le serializer complet
        notification = serializer.instance
        output_serializer = NotificationSerializer(notification)
        
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def non_lues(self, request):
        """Récupérer uniquement les notifications non lues"""
        notifications = self.get_queryset().filter(lue=False)
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def count_non_lues(self, request):
        """Compter les notifications non lues"""
        count = self.get_queryset().filter(lue=False).count()
        return Response({'count': count})
    
    @action(detail=True, methods=['patch', 'post'])
    def marquer_lue(self, request, pk=None):
        """Marquer une notification comme lue"""
        notification = self.get_object()
        notification.marquer_comme_lue()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch', 'post'])
    def marquer_toutes_lues(self, request):
        """Marquer toutes les notifications comme lues"""
        updated = self.get_queryset().filter(lue=False).update(
            lue=True,
            date_lecture=timezone.now()
        )
        return Response({
            'message': f'{updated} notification(s) marquée(s) comme lue(s)',
            'count': updated
        })
    
    @action(detail=False, methods=['delete'])
    def supprimer_lues(self, request):
        """Supprimer toutes les notifications lues"""
        deleted_count, _ = self.get_queryset().filter(lue=True).delete()
        return Response({
            'message': f'{deleted_count} notification(s) supprimée(s)',
            'count': deleted_count
        })
    
    @action(detail=False, methods=['delete'])
    def supprimer_toutes(self, request):
        """Supprimer toutes les notifications de l'utilisateur"""
        deleted_count, _ = self.get_queryset().delete()
        return Response({
            'message': f'{deleted_count} notification(s) supprimée(s)',
            'count': deleted_count
        })
    
    @action(detail=False, methods=['post'])
    def tester(self, request):
        """Créer une notification de test pour l'utilisateur connecté"""
        notification = Notification.objects.create(
            utilisateur=request.user,
            titre='Notification de test',
            message='Ceci est une notification de test pour vérifier le bon fonctionnement du système.',
            type='info'
        )
        serializer = self.get_serializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
