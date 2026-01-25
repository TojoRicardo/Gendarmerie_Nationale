"""
Pagination par curseur (cursor pagination) pour les fiches criminelles.

Cette pagination est déterministe et stable, garantissant :
- Pas de doublons lors de la pagination
- Pas d'éléments manqués
- Performance optimale avec index PostgreSQL
"""

from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from urllib.parse import urlparse, parse_qs


class StableCursorPagination(CursorPagination):
    """
    Pagination par curseur déterministe pour CriminalFicheCriminelle.
    
    Configuration :
    - Tri principal par date_creation (desc) puis id (desc) pour garantir l'unicité
    - Paramètre 'limit' pour contrôler la taille de page
    - Curseur opaque encodé en base64 par DRF
    - Max 200 éléments par page pour éviter les abus
    
    Utilisation :
        GET /api/fiches-criminelles/?limit=50
        GET /api/fiches-criminelles/?cursor=cj0xJnA9MjAyNC0wMS0wMQ%3D%3D
    """
    
    # Taille de page par défaut
    page_size = 25
    
    page_size_query_param = 'limit'
    
    max_page_size = 200
    
    cursor_query_param = 'cursor'
    
    # Tri déterministe : plus récent en premier, puis par ID pour déduplication
    # Le '-' signifie ordre descendant
    ordering = '-date_creation', '-id'
    
    def get_paginated_response(self, data):
        """
        Retourne la réponse paginée avec next/previous cursors.
        
        Format de réponse :
        {
            "next": "http://api/fiches-criminelles/?cursor=abc123&limit=25",
            "previous": null,
            "results": [...]
        }
        """
        return Response({
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })


class StableCursorPaginationWithTokens(StableCursorPagination):
    """
    Variante qui retourne les tokens de curseur séparés (sans URL complète).
    
    Format de réponse :
    {
        "next_cursor": "cj0xJnA9MjAyNC0wMS0wMQ%3D%3D",
        "previous_cursor": null,
        "results": [...]
    }
    
    Utile si le client préfère gérer les URLs lui-même.
    """
    
    def get_paginated_response(self, data):
        """
        Extrait uniquement les tokens de curseur des URLs.
        """
        next_link = self.get_next_link()
        previous_link = self.get_previous_link()
        
        # Extraire le token cursor de l'URL
        next_cursor = None
        if next_link:
            try:
                parsed = urlparse(next_link)
                params = parse_qs(parsed.query)
                next_cursor = params.get('cursor', [None])[0]
            except Exception:
                next_cursor = None
        
        previous_cursor = None
        if previous_link:
            try:
                parsed = urlparse(previous_link)
                params = parse_qs(parsed.query)
                previous_cursor = params.get('cursor', [None])[0]
            except Exception:
                previous_cursor = None
        
        return Response({
            'next_cursor': next_cursor,
            'previous_cursor': previous_cursor,
            'results': data,
        })

