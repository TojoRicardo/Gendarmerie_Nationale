"""
Configuration des URLs - Gendarmerie Nationale
Routes principales de l'API REST
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse


def api_home(request):
    """
    Page d'accueil de l'API
    Retourne les informations générales et la liste des endpoints disponibles
    """
    return JsonResponse({
        'message': 'Bienvenue sur l\'API SGIC Gendarmerie Nationale',
        'version': '1.0.0',
        'status': 'running',
        'environment': 'development' if settings.DEBUG else 'production',
        'endpoints': {
            'admin': '/admin/',
            'utilisateurs': {
                'base': '/api/utilisateur/',
                'login': '/api/utilisateur/login/',
                'logout': '/api/utilisateur/logout/',
                'register': '/api/utilisateur/register/',
                'list': '/api/utilisateur/utilisateurs/',
                'roles': '/api/utilisateur/roles/',
            },
            'criminels': {
                'base': '/api/criminel/',
                'fiches': '/api/criminel/fiches-criminelles/',
                'infractions': '/api/criminel/infractions/',
                'types_infractions': '/api/criminel/types-infractions/',
                'statuts_fiche': '/api/criminel/statuts-fiche/',
                'statuts_affaire': '/api/criminel/statuts-affaire/',
            },
            'notifications': {
                'base': '/api/notifications/',
                'non_lues': '/api/notifications/non_lues/',
                'count': '/api/notifications/count_non_lues/',
                'marquer_lue': '/api/notifications/{id}/marquer_lue/',
                'marquer_toutes': '/api/notifications/marquer_toutes_lues/',
                'tester': '/api/notifications/tester/',
            },
            'biometrie': {
                'base': '/api/biometrie/',
                'photos': '/api/biometrie/photos/',
                'empreintes': '/api/biometrie/empreintes/',
                'photos_par_criminel': '/api/biometrie/photos/par_criminel/?criminel_id={id}',
                'empreintes_par_criminel': '/api/biometrie/empreintes/par_criminel/?criminel_id={id}',
            },
            'ia': {
                'base': '/api/ia/',
            },
            'face_recognition': {
                'base': '/api/face-recognition/',
                'persons': '/api/face-recognition/persons/',
                'recognize': '/api/face-recognition/recognize/',
                'verify': '/api/face-recognition/verify/',
                'stats': '/api/face-recognition/stats/',
                'logs': '/api/face-recognition/logs/',
            },
            'rapports': {
                'base': '/api/reports/',
            },
            'rapports_professionnels': {
                'base': '/api/rapports/',
                'generer': '/api/rapports/rapports/generer/',
                'historique': '/api/rapports/rapports/historique/',
                'types': '/api/rapports/rapports/types/',
                'telecharger': '/api/rapports/rapports/{id}/telecharger/',
            },
            'audit': {
                'base': '/api/audit/',
                'list': '/api/audit/',
                'statistiques': '/api/audit/statistiques/',
                'recherche': '/api/audit/recherche/?q=terme',
            },
            'search': {
                'base': '/api/search/',
                'advanced': '/api/search/?q=terme&models=criminel,enquete',
                'criminel': '/api/search/criminel/?q=terme',
                'enquete': '/api/search/enquete/?q=terme&type_enquete=plainte',
            },
            'auth': {
                'token_refresh': '/api/auth/token/refresh/',
            },
            'media': '/media/',
            'static': '/static/',
        },
        'documentation': {
            'frontend': 'http://localhost:3002/',
            'admin': 'http://127.0.0.1:8000/admin/',
        }
    }, json_dumps_params={'indent': 2, 'ensure_ascii': False})

urlpatterns = [
    path('', api_home, name='api_home'),
    path('admin/', admin.site.urls),
    
    # API endpoints avec le préfixe /api/
    path('api/utilisateur/', include('utilisateur.urls')),
    path('api/criminel/', include('criminel.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/biometrie/', include('biometrie.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/rapports/', include('rapports.urls')),  # Module de génération de rapports professionnels
    path('api/ia/', include('intelligence_artificielle.urls')),
    path('api/ai-analysis/', include('ai_analysis.urls')),  # Module d'analyse IA avancée
    path('api/face-recognition/', include('face_recognition.urls')),  # Module de reconnaissance faciale ArcFace
    path('api/audit/', include('audit.urls')),  # Module de journal d'audit avec IA locale
    path('api/enquete/', include('enquete.urls')),
    path('api/search/', include('search.urls')),  # Recherche avancée avec Whoosh
    path('api/statistics/', include('sgic_statistics.urls')),
    path('api/', include('upr.urls')),  # Module UPR - Unidentified Person Registry
    
    # Endpoint pour rafraîchir le token JWT
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Servir les fichiers médias en mode développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
