"""
Vues pour la recherche avancée avec Haystack/Whoosh
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

try:
    from haystack.query import SearchQuerySet
    from haystack.inputs import AutoQuery, Exact, Clean
    HAYSTACK_AVAILABLE = True
except ImportError:
    HAYSTACK_AVAILABLE = False
    # Créer des stubs pour éviter les erreurs si Haystack n'est pas installé
    class SearchQuerySet:
        def models(self, *args):
            return self
        def filter(self, *args, **kwargs):
            return self
        def count(self):
            return 0
        def __getitem__(self, key):
            return []
    
    class AutoQuery:
        def __init__(self, query):
            self.query = query
    
    class Exact:
        def __init__(self, value):
            self.value = value

from django.conf import settings


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_advanced(request):
    """
    Recherche avancée dans tous les modules du système
    
    Paramètres de requête:
    - q: Terme de recherche (requis)
    - models: Modèles à rechercher (criminel, infraction, enquete, rapport, observation)
    - limit: Nombre de résultats (défaut: 20)
    - offset: Décalage pour pagination (défaut: 0)
    
    Exemples:
    GET /api/search/?q=dupont
    GET /api/search/?q=vol&models=criminel,infraction
    GET /api/search/?q=plainte&models=enquete&limit=10
    """
    if not HAYSTACK_AVAILABLE:
        return Response({
            'error': 'Le module de recherche avancée n\'est pas disponible. Installez django-haystack et Whoosh.',
            'instructions': 'pip install django-haystack==3.2.1 Whoosh==2.7.4'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    query = request.query_params.get('q', '').strip()
    
    if not query:
        return Response({
            'error': 'Le paramètre "q" (terme de recherche) est requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Modèles à rechercher
    models_param = request.query_params.get('models', '')
    if models_param:
        models_list = [m.strip() for m in models_param.split(',')]
    else:
        models_list = ['criminel', 'infraction', 'enquete', 'rapport', 'observation']
    
    # Pagination
    try:
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)  # Max 100 résultats
    except (ValueError, TypeError):
        limit = 20
    
    try:
        offset = int(request.query_params.get('offset', 0))
        offset = max(0, offset)
    except (ValueError, TypeError):
        offset = 0
    
    # Mapping des modèles
    model_mapping = {
        'criminel': 'criminel.criminalfichecriminelle',
        'infraction': 'criminel.criminalinfraction',
        'enquete': 'enquete.enquete',
        'rapport': 'enquete.rapportenquete',
        'observation': 'enquete.observation',
    }
    
    results = {
        'query': query,
        'total': 0,
        'results': [],
        'by_model': {},
    }
    
    # Recherche dans chaque modèle
    for model_key in models_list:
        if model_key not in model_mapping:
            continue
        
        model_name = model_mapping[model_key]
        sqs = SearchQuerySet().models(model_name).filter(content=AutoQuery(query))
        
        # Compter le total
        total_count = sqs.count()
        
        # Paginer
        page_results = sqs[offset:offset + limit]
        
        # Formater les résultats
        formatted_results = []
        for result in page_results:
            formatted_results.append({
                'id': result.pk,
                'model': model_key,
                'model_name': result.model_name,
                'score': result.score,
                'data': {
                    'title': getattr(result, 'titre', None) or getattr(result, 'nom', None) or str(result),
                    'description': getattr(result, 'description', None) or getattr(result, 'contenu', None) or '',
                    'numero': getattr(result, 'numero_fiche', None) or getattr(result, 'numero_enquete', None) or getattr(result, 'numero_affaire', None),
                    'date': getattr(result, 'date_creation', None) or getattr(result, 'date_enregistrement', None) or getattr(result, 'date_redaction', None),
                }
            })
        
        results['by_model'][model_key] = {
            'total': total_count,
            'results': formatted_results,
        }
        results['total'] += total_count
        results['results'].extend(formatted_results)
    
    # Trier par score décroissant
    results['results'].sort(key=lambda x: x['score'], reverse=True)
    
    # Journaliser l'action de recherche avancée
    try:
        from audit.services import audit_log
        audit_log(
            request=request,
            module="Recherche",
            action="Recherche avancée",
            ressource=f"Terme : {query}",
            narration=(
                "Une recherche avancée a été effectuée dans le système SGIC "
                "pour localiser des informations pertinentes."
            )
        )
    except Exception as audit_error:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Erreur lors de l'enregistrement de l'audit pour recherche: {audit_error}")
    
    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_criminel(request):
    """
    Recherche avancée spécifique aux fiches criminelles
    
    Paramètres:
    - q: Terme de recherche
    - limit: Nombre de résultats
    - offset: Décalage
    """
    if not HAYSTACK_AVAILABLE:
        return Response({
            'error': 'Le module de recherche avancée n\'est pas disponible. Installez django-haystack et Whoosh.',
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    """
    Recherche avancée spécifique aux fiches criminelles
    
    Paramètres:
    - q: Terme de recherche
    - limit: Nombre de résultats
    - offset: Décalage
    """
    query = request.query_params.get('q', '').strip()
    
    if not query:
        return Response({
            'error': 'Le paramètre "q" est requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)
    except (ValueError, TypeError):
        limit = 20
    
    try:
        offset = int(request.query_params.get('offset', 0))
        offset = max(0, offset)
    except (ValueError, TypeError):
        offset = 0
    
    sqs = SearchQuerySet().models('criminel.criminalfichecriminelle').filter(
        content=AutoQuery(query)
    )
    
    total = sqs.count()
    results = sqs[offset:offset + limit]
    
    formatted_results = []
    for result in results:
        formatted_results.append({
            'id': result.pk,
            'numero_fiche': getattr(result, 'numero_fiche', None),
            'nom': getattr(result, 'nom', None),
            'prenom': getattr(result, 'prenom', None),
            'surnom': getattr(result, 'surnom', None),
            'cin': getattr(result, 'cin', None),
            'niveau_danger': getattr(result, 'niveau_danger', None),
            'statut_fiche': getattr(result, 'statut_fiche', None),
            'score': result.score,
        })
    
    return Response({
        'query': query,
        'total': total,
        'limit': limit,
        'offset': offset,
        'results': formatted_results,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_enquete(request):
    """
    Recherche avancée spécifique aux enquêtes
    
    Paramètres:
    - q: Terme de recherche
    - type_enquete: Filtrer par type (plainte, denonciation, constatation_directe)
    - limit: Nombre de résultats
    - offset: Décalage
    """
    if not HAYSTACK_AVAILABLE:
        return Response({
            'error': 'Le module de recherche avancée n\'est pas disponible. Installez django-haystack et Whoosh.',
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    """
    Recherche avancée spécifique aux enquêtes
    
    Paramètres:
    - q: Terme de recherche
    - type_enquete: Filtrer par type (plainte, denonciation, constatation_directe)
    - limit: Nombre de résultats
    - offset: Décalage
    """
    query = request.query_params.get('q', '').strip()
    type_enquete = request.query_params.get('type_enquete', '').strip()
    
    try:
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)
    except (ValueError, TypeError):
        limit = 20
    
    try:
        offset = int(request.query_params.get('offset', 0))
        offset = max(0, offset)
    except (ValueError, TypeError):
        offset = 0
    
    sqs = SearchQuerySet().models('enquete.enquete')
    
    if query:
        sqs = sqs.filter(content=AutoQuery(query))
    
    if type_enquete:
        sqs = sqs.filter(type_enquete_code=Exact(type_enquete))
    
    total = sqs.count()
    results = sqs[offset:offset + limit]
    
    formatted_results = []
    for result in results:
        formatted_results.append({
            'id': result.pk,
            'numero_enquete': getattr(result, 'numero_enquete', None),
            'titre': getattr(result, 'titre', None),
            'type_enquete_code': getattr(result, 'type_enquete_code', None),
            'statut': getattr(result, 'statut', None),
            'date_enregistrement': getattr(result, 'date_enregistrement', None),
            'score': result.score,
        })
    
    return Response({
        'query': query,
        'type_enquete': type_enquete,
        'total': total,
        'limit': limit,
        'offset': offset,
        'results': formatted_results,
    })

