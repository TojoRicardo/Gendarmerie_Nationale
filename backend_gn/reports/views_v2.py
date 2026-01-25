from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.conf import settings
from criminel.models import CriminalFicheCriminelle
from .pdf_fiche_criminelle_v2 import generate_fiche_criminelle_pdf_v2
from .permissions import CanGeneratePDF
from .download_service import EnqueteDownloadService
import logging
import urllib.parse
import json

logger = logging.getLogger(__name__)


def add_cors_headers_to_pdf_response(response, request):
    allowed_local_origins = [
        'https://localhost:3002',
        'http://localhost:3002',
        'https://127.0.0.1:3002',
        'http://127.0.0.1:3002',
        'https://localhost:3003',
        'http://localhost:3003',
        'https://localhost:3000',
        'http://localhost:3000',
    ]
    
    origin = request.META.get('HTTP_ORIGIN', '')
    
    if not origin:
        referer = request.META.get('HTTP_REFERER', '')
        if referer:
            try:
                parsed = urllib.parse.urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
            except Exception as e:
                logger.warning(f"Erreur lors de l'extraction de l'origine depuis Referer: {e}")
    
    allow_origin = None
    
    if origin:
        origin_lower = origin.lower().strip()
        for allowed in allowed_local_origins:
            if origin_lower == allowed.lower().strip():
                allow_origin = origin
                logger.info(f"CORS: Origine trouvée dans la liste autorisée: {origin}")
                break
        
        if not allow_origin:
            if any(host in origin_lower for host in ['localhost', '127.0.0.1']):
                allow_origin = origin
                logger.info(f"CORS: Origine localhost/127.0.0.1 détectée: {origin}")
            else:
                if settings.DEBUG:
                    allow_origin = origin
                    logger.info(f"CORS: Origine autorisée en mode DEBUG: {origin}")
                else:
                    logger.warning(f"CORS: Origine non autorisée en production: {origin}")
    
    if allow_origin:
        response['Access-Control-Allow-Origin'] = allow_origin
        response['Access-Control-Allow-Credentials'] = 'true'
        logger.info(f"CORS: Autorisation de l'origine: {allow_origin}")
    else:
        if settings.DEBUG:
            response['Access-Control-Allow-Origin'] = '*'
            logger.info(f"CORS: Mode DEBUG - autorisation de toutes les origines (*)")
        else:
            if origin:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
                logger.info(f"CORS: Production - autorisation de l'origine: {origin}")
            else:
                response['Access-Control-Allow-Origin'] = '*'
                logger.warning("CORS: Production - aucune origine détectée, utilisation de '*'")
    
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS, POST, HEAD'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRFToken'
    response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Type, Content-Length'
    response['Access-Control-Max-Age'] = '86400'
    
    if not response.get('Access-Control-Allow-Origin'):
        logger.error("ERREUR: Access-Control-Allow-Origin n'a pas été défini!")
        if origin:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        else:
            response['Access-Control-Allow-Origin'] = '*'
        logger.warning(f"CORS: Headers ajoutés en fallback - Origin: {response.get('Access-Control-Allow-Origin')}")
    
    return response


class FicheCriminellePDFViewV2(APIView):
    permission_classes = [IsAuthenticated, CanGeneratePDF]

    def check_permissions(self, request):
        if request.method == 'OPTIONS':
            return
        super().check_permissions(request)

    def options(self, request, criminel_id=None):
        response = HttpResponse(status=200)
        response = add_cors_headers_to_pdf_response(response, request)
        
        if not response.get('Access-Control-Allow-Origin'):
            origin = request.META.get('HTTP_ORIGIN', '')
            if origin:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
            else:
                response['Access-Control-Allow-Origin'] = '*'
            logger.warning(f"OPTIONS: Headers CORS manquants, ajout forcé pour origine: {origin}")
        
        origin = request.META.get('HTTP_ORIGIN', request.META.get('HTTP_REFERER', 'N/A'))
        cors_origin = response.get('Access-Control-Allow-Origin', 'N/A')
        logger.info(f"OPTIONS request pour criminel {criminel_id}, origine: {origin}, CORS-Origin: {cors_origin}")
        
        return response

    def get(self, request, criminel_id):
        origin = request.META.get('HTTP_ORIGIN', '')
        referer = request.META.get('HTTP_REFERER', '')
        logger.info(f"GET request - Origin: {origin}, Referer: {referer}, Method: {request.method}, Criminel ID: {criminel_id}")
        
        try:
            criminel = CriminalFicheCriminelle.objects.select_related().prefetch_related().get(id=criminel_id)
            criminel.refresh_from_db()
            logger.info(f"Fiche criminelle chargée: ID={criminel.id}, Nom={criminel.nom}")
            
            pdf_buffer = generate_fiche_criminelle_pdf_v2(criminel, request)
            pdf_content = pdf_buffer.getvalue()
            pdf_buffer.close()
            logger.info(f"PDF généré: {len(pdf_content)} bytes")
            
            response = EnqueteDownloadService.download_fiche_criminelle_with_enquete(
                criminel_id, pdf_content, request
            )
            
            response = add_cors_headers_to_pdf_response(response, request)
            
            return response
            
        except CriminalFicheCriminelle.DoesNotExist:
            logger.error(f"Fiche criminelle {criminel_id} introuvable")
            error_response = HttpResponse(
                json.dumps({'erreur': 'Fiche criminelle introuvable'}),
                content_type='application/json',
                status=404
            )
            error_response = add_cors_headers_to_pdf_response(error_response, request)
            return error_response
        except Exception as e:
            logger.error(f"Erreur lors de la génération du PDF V2 pour criminel {criminel_id}: {e}", exc_info=True)
            import traceback
            traceback_str = traceback.format_exc()
            logger.error(f"Traceback complet: {traceback_str}")
            
            error_data = {
                'error': 'Erreur lors de la génération du PDF',
                'message': str(e),
                'criminel_id': str(criminel_id)
            }
            if settings.DEBUG:
                error_data['traceback'] = traceback_str
            
            error_json = json.dumps(error_data, ensure_ascii=False, indent=2)
            error_response = HttpResponse(
                content=error_json.encode('utf-8'),
                content_type='application/json',
                status=500
            )
            error_response = add_cors_headers_to_pdf_response(error_response, request)
            return error_response
