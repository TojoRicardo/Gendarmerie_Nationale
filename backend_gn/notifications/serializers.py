from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications"""
    
    utilisateur_nom = serializers.CharField(source='utilisateur.username', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'utilisateur',
            'utilisateur_nom',
            'titre',
            'message',
            'type',
            'lue',
            'lien',
            'date_creation',
            'date_lecture'
        ]
        read_only_fields = ['id', 'date_creation', 'date_lecture', 'utilisateur_nom']
    
    def to_representation(self, instance):
        """Personnaliser la représentation de la notification"""
        representation = super().to_representation(instance)
        
        # Formater les dates
        if representation['date_creation']:
            from datetime import datetime
            date = datetime.fromisoformat(representation['date_creation'].replace('Z', '+00:00'))
            representation['date_creation_formatee'] = date.strftime('%d/%m/%Y %H:%M')
        
        if representation['date_lecture']:
            from datetime import datetime
            date = datetime.fromisoformat(representation['date_lecture'].replace('Z', '+00:00'))
            representation['date_lecture_formatee'] = date.strftime('%d/%m/%Y %H:%M')
        
        return representation


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une notification"""
    
    class Meta:
        model = Notification
        fields = ['utilisateur', 'titre', 'message', 'type', 'lien']

