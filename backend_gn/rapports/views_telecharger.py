"""
Utilitaires pour le téléchargement de fichiers avec support CORS
"""


def add_cors_headers_to_file_response(response, request):
    """
    Ajoute les headers CORS nécessaires pour le téléchargement de fichiers.
    
    Args:
        response: HttpResponse ou FileResponse
        request: HttpRequest
        
    Returns:
        response: Response avec headers CORS ajoutés
    """
    origin = request.META.get('HTTP_ORIGIN', '')
    if not origin:
        referer = request.META.get('HTTP_REFERER', '')
        if referer:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
            except:
                pass
    
    if origin and ('localhost' in origin.lower() or '127.0.0.1' in origin.lower()):
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
    elif origin:
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
    else:
        response['Access-Control-Allow-Origin'] = '*'
    
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS, POST, HEAD, PUT, DELETE, PATCH'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRFToken'
    response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Type, Content-Length'
    response['Access-Control-Max-Age'] = '86400'
    
    return response
