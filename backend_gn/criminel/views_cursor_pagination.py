"""
Exemple de ViewSet utilisant la pagination par curseur pour les fiches criminelles.

Ce fichier montre comment intégrer StableCursorPagination dans un ViewSet.
Vous pouvez soit :
1. Ajouter pagination_class directement dans CriminalFicheCriminelleViewSet existant
2. Créer un nouveau ViewSet dédié pour la pagination par curseur
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import CriminalFicheCriminelle
from .serializers import CriminalFicheCriminelleSerializer
from .pagination import StableCursorPagination


class CriminalFicheCriminelleCursorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet avec pagination par curseur pour les fiches criminelles.
    
    Endpoints :
    - GET /api/fiches-criminelles-cursor/ : Liste paginée
    - GET /api/fiches-criminelles-cursor/{id}/ : Détail d'une fiche
    
    Paramètres de requête :
    - limit : Nombre d'éléments par page (défaut: 25, max: 200)
    - cursor : Token de curseur pour la page suivante/précédente
    
    Exemple :
        GET /api/fiches-criminelles-cursor/?limit=50
        GET /api/fiches-criminelles-cursor/?cursor=cj0xJnA9MjAyNC0wMS0wMQ%3D%3D&limit=25
    """
    
    queryset = CriminalFicheCriminelle.objects.all().order_by('-date_creation', '-id')
    serializer_class = CriminalFicheCriminelleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StableCursorPagination
    
    def get_queryset(self):
        """
        Optimise le queryset avec prefetch et permet des filtres optionnels.
        
        Le tri par -date_creation, -id est CRITIQUE pour la pagination par curseur.
        Ne modifiez pas cet ordre sans recréer les index.
        """
        queryset = super().get_queryset()
        
        # Optimisation : précharger les relations fréquemment utilisées
        queryset = queryset.select_related(
            'statut_fiche'
        ).prefetch_related(
            'infractions',
            'infractions__type_infraction',
        )
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(nom__icontains=search) |
                Q(prenom__icontains=search) |
                Q(numero_fiche__icontains=search)
            )
        
        statut = self.request.query_params.get('statut', None)
        if statut:
            queryset = queryset.filter(statut_fiche_id=statut)
        
        # IMPORTANT : Maintenir l'ordre pour la pagination par curseur
        return queryset.order_by('-date_creation', '-id')
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Endpoint pour obtenir des statistiques (exemple).
        
        Note : La pagination par curseur ne fournit pas de count total.
        Pour les stats, utilisez un endpoint séparé.
        """
        total = CriminalFicheCriminelle.objects.count()
        return Response({
            'total_fiches': total,
            'note': 'Pour les listes paginées, utilisez le endpoint list avec cursor pagination'
        })


# Alternative : Ajouter la pagination directement au ViewSet existant
# Dans views.py, ajoutez simplement :
#
#
#     ...
#     ...

