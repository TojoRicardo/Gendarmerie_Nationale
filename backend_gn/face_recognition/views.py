"""
Vues API REST pour le système de reconnaissance faciale avec ArcFace.
"""

import uuid
import time
from django.utils import timezone
from django.db.models import Avg
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.storage import default_storage

from .models import Person, FaceEmbedding, FaceRecognitionLog
from .serializers import (
    PersonSerializer,
    PersonCreateSerializer,
    FaceEmbeddingSerializer,
    FaceEmbeddingCreateSerializer,
    FaceRecognitionLogSerializer,
    RecognizeRequestSerializer,
    VerifyRequestSerializer,
    StatsResponseSerializer
)
from .services import (
    extract_embedding_from_image,
    save_face_embedding,
    recognize_person,
    verify_person,
    save_recognition_log
)


class PersonViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les personnes (CRUD complet).
    
    Endpoints:
    - POST /api/persons/ - Créer une personne
    - GET /api/persons/ - Lister toutes les personnes
    - GET /api/persons/{id}/ - Récupérer une personne
    - PUT /api/persons/{id}/ - Mettre à jour une personne
    - DELETE /api/persons/{id}/ - Supprimer une personne
    """
    queryset = Person.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PersonCreateSerializer
        return PersonSerializer
    
    def create(self, request, *args, **kwargs):
        """Créer une nouvelle personne"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        person = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Personne créée avec succès',
            'data': PersonSerializer(person).data,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        """Lister toutes les personnes avec pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': 'Liste des personnes récupérée avec succès',
            'data': serializer.data,
            'timestamp': timezone.now().isoformat()
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Récupérer une personne spécifique"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'message': 'Personne récupérée avec succès',
            'data': serializer.data,
            'timestamp': timezone.now().isoformat()
        })
    
    def update(self, request, *args, **kwargs):
        """Mettre à jour une personne"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'success': True,
            'message': 'Personne mise à jour avec succès',
            'data': serializer.data,
            'timestamp': timezone.now().isoformat()
        })
    
    def destroy(self, request, *args, **kwargs):
        """Supprimer une personne"""
        instance = self.get_object()
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Personne supprimée avec succès',
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='faces')
    def faces(self, request, pk=None):
        """Récupérer tous les embeddings faciaux d'une personne"""
        person = self.get_object()
        embeddings = person.face_embeddings.all().order_by('-created_at')
        
        serializer = FaceEmbeddingSerializer(embeddings, many=True)
        
        return Response({
            'success': True,
            'message': f'Embeddings de {person.name} récupérés avec succès',
            'data': serializer.data,
            'timestamp': timezone.now().isoformat()
        })


class FaceEmbeddingViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les embeddings faciaux.
    
    Endpoints:
    - POST /api/persons/{person_id}/faces/ - Ajouter un embedding
    - GET /api/persons/{person_id}/faces/ - Liste des embeddings
    - DELETE /api/faces/{face_id}/ - Supprimer un embedding
    """
    queryset = FaceEmbedding.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = FaceEmbeddingSerializer
    
    def get_queryset(self):
        """Filtrer par person_id si fourni"""
        queryset = super().get_queryset()
        person_id = self.request.query_params.get('person_id')
        if person_id:
            try:
                queryset = queryset.filter(person_id=person_id)
            except ValueError:
                pass
        return queryset
    
    @action(detail=False, methods=['post'], url_path='add-face')
    def add_face(self, request, person_id=None):
        """
        Ajouter un embedding facial pour une personne.
        POST /api/persons/{person_id}/faces/ ou POST /api/faces/add-face/
        
        Body (multipart/form-data):
        - person_id: UUID de la personne (requis)
        - image: fichier image (JPEG, PNG)
        """
        try:
            # Récupérer person_id depuis les données de la requête
            person_id = request.data.get('person_id')
            
            if not person_id:
                return Response({
                    'success': False,
                    'message': 'person_id est requis',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer la personne
            try:
                person = Person.objects.get(id=person_id)
            except Person.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Personne non trouvée',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Vérifier qu'une image est fournie
            if 'image' not in request.FILES:
                return Response({
                    'success': False,
                    'message': 'Image requise',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            image_file = request.FILES['image']
            
            # Valider le format d'image
            if not image_file.content_type in ['image/jpeg', 'image/jpg', 'image/png']:
                return Response({
                    'success': False,
                    'message': 'Format d\'image non supporté. Utilisez JPEG ou PNG.',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Extraire l'embedding
            embedding, confidence_score = extract_embedding_from_image(image_file)
            
            if embedding is None:
                return Response({
                    'success': False,
                    'message': 'Aucun visage détecté dans l\'image',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Sauvegarder l'image
            image_path = default_storage.save(
                f'face_recognition/{person.id}/{image_file.name}',
                image_file
            )
            
            # Obtenir les dimensions de l'image si disponibles
            image_width = None
            image_height = None
            try:
                # Essayer d'utiliser PIL/Pillow pour obtenir les dimensions
                from PIL import Image
                image_file.seek(0)
                img = Image.open(image_file)
                image_width, image_height = img.size
                image_file.seek(0)  # Remettre le curseur au début
            except Exception:
                # Si PIL n'est pas disponible ou en cas d'erreur, laisser à None
                pass
            
            # Sauvegarder l'embedding
            face_embedding = save_face_embedding(
                person=person,
                embedding=embedding,
                image_path=image_path,
                confidence_score=confidence_score,
                image_width=image_width,
                image_height=image_height
            )
            
            serializer = FaceEmbeddingSerializer(face_embedding)
            
            return Response({
                'success': True,
                'message': 'Embedding facial ajouté avec succès',
                'data': serializer.data,
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Erreur lors de l\'ajout de l\'embedding: {str(e)}',
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        """Supprimer un embedding facial"""
        instance = self.get_object()
        
        # Supprimer l'image si elle existe
        if instance.image_path:
            try:
                default_storage.delete(instance.image_path)
            except Exception:
                pass
        
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Embedding facial supprimé avec succès',
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


class RecognizeView(viewsets.ViewSet):
    """
    View pour la reconnaissance faciale.
    
    POST /api/recognize/ - Reconnaître une personne à partir d'une image
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request):
        """
        Reconnaître une personne à partir d'une image.
        
        Body (multipart/form-data):
        - image: fichier image (JPEG, PNG)
        - threshold: seuil de confiance (optionnel, défaut: 0.6)
        - top_k: nombre de résultats (optionnel, défaut: 1)
        - include_embedding: inclure l'embedding dans la réponse (optionnel, défaut: false)
        """
        start_time = time.time()
        
        try:
            # Valider les données
            if 'image' not in request.FILES:
                return Response({
                    'success': False,
                    'message': 'Image requise',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            image_file = request.FILES['image']
            threshold = float(request.data.get('threshold', 0.6))
            top_k = int(request.data.get('top_k', 1))
            include_embedding = request.data.get('include_embedding', 'false').lower() == 'true'
            
            # Extraire l'embedding de l'image
            query_embedding, confidence_score = extract_embedding_from_image(image_file)
            
            if query_embedding is None:
                return Response({
                    'success': False,
                    'message': 'Aucun visage détecté dans l\'image',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Sauvegarder l'image temporairement
            image_path = default_storage.save(
                f'face_recognition/temp/{image_file.name}',
                image_file
            )
            
            # Reconnaître la personne
            matches = recognize_person(query_embedding, threshold=threshold, top_k=top_k)
            
            processing_time = (time.time() - start_time) * 1000  # en ms
            
            # Préparer la réponse
            if matches:
                best_match = matches[0]
                detected_person = best_match['person']
                
                # Sauvegarder le log
                log = save_recognition_log(
                    embedding=query_embedding,
                    image_path=image_path,
                    detected_person=detected_person,
                    confidence_score=best_match['confidence_score'],
                    threshold_used=threshold,
                    processing_time_ms=processing_time,
                    created_by=request.user
                )
                
                response_data = {
                    'recognized': True,
                    'person': {
                        'id': str(detected_person.id),
                        'name': detected_person.name,
                        'email': detected_person.email
                    },
                    'confidence_score': best_match['confidence_score'],
                    'face_embedding_id': best_match['face_embedding_id'],
                    'all_matches': [
                        {
                            'person_id': str(m['person'].id),
                            'person_name': m['person'].name,
                            'confidence_score': m['confidence_score']
                        }
                        for m in matches
                    ]
                }
                
                if include_embedding:
                    response_data['embedding'] = query_embedding.tolist()
                
                message = f'Personne reconnue: {detected_person.name}'
            else:
                # Sauvegarder le log comme inconnu
                log = save_recognition_log(
                    embedding=query_embedding,
                    image_path=image_path,
                    detected_person=None,
                    confidence_score=0.0,
                    threshold_used=threshold,
                    processing_time_ms=processing_time,
                    created_by=request.user
                )
                
                response_data = {
                    'recognized': False,
                    'message': 'Aucune correspondance trouvée'
                }
                
                if include_embedding:
                    response_data['embedding'] = query_embedding.tolist()
                
                message = 'Personne non reconnue'
            
            return Response({
                'success': True,
                'message': message,
                'data': response_data,
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Erreur lors de la reconnaissance: {str(e)}',
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyView(viewsets.ViewSet):
    """
    View pour la vérification faciale.
    
    POST /api/verify/ - Vérifier si une image correspond à une personne spécifique
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request):
        """
        Vérifier si une image correspond à une personne spécifique.
        
        Body (multipart/form-data):
        - image: fichier image (JPEG, PNG)
        - person_id: UUID de la personne à vérifier
        - threshold: seuil de confiance (optionnel, défaut: 0.6)
        """
        try:
            # Valider les données
            if 'image' not in request.FILES:
                return Response({
                    'success': False,
                    'message': 'Image requise',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            person_id = request.data.get('person_id')
            if not person_id:
                return Response({
                    'success': False,
                    'message': 'person_id est requis',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                person = Person.objects.get(id=person_id)
            except Person.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Personne non trouvée',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_404_NOT_FOUND)
            
            image_file = request.FILES['image']
            threshold = float(request.data.get('threshold', 0.6))
            
            # Extraire l'embedding
            query_embedding, _ = extract_embedding_from_image(image_file)
            
            if query_embedding is None:
                return Response({
                    'success': False,
                    'message': 'Aucun visage détecté dans l\'image',
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier
            verified, confidence_score = verify_person(query_embedding, person.id, threshold=threshold)
            
            return Response({
                'success': True,
                'verified': verified,
                'confidence_score': confidence_score,
                'message': 'Personne vérifiée' if verified else 'Personne non vérifiée',
                'data': {
                    'person': {
                        'id': str(person.id),
                        'name': person.name
                    },
                    'verified': verified,
                    'confidence_score': confidence_score,
                    'threshold': threshold
                },
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Erreur lors de la vérification: {str(e)}',
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StatsView(viewsets.ViewSet):
    """
    View pour les statistiques.
    
    GET /api/stats/ - Statistiques d'utilisation
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Récupérer les statistiques d'utilisation"""
        try:
            total_persons = Person.objects.count()  # type: ignore
            total_embeddings = FaceEmbedding.objects.count()  # type: ignore
            total_logs = FaceRecognitionLog.objects.count()  # type: ignore
            
            recognized_count = FaceRecognitionLog.objects.filter(status='recognized').count()  # type: ignore
            unknown_count = FaceRecognitionLog.objects.filter(status='unknown').count()  # type: ignore
            
            # Calculer la confiance moyenne
            avg_confidence = FaceRecognitionLog.objects.aggregate(  # type: ignore
                avg_confidence=Avg('confidence_score')
            )['avg_confidence'] or 0.0
            
            stats = {
                'total_persons': total_persons,
                'total_embeddings': total_embeddings,
                'total_logs': total_logs,
                'recognized_count': recognized_count,
                'unknown_count': unknown_count,
                'average_confidence': round(float(avg_confidence), 3)
            }
            
            return Response({
                'success': True,
                'message': 'Statistiques récupérées avec succès',
                'data': stats,
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Erreur lors de la récupération des statistiques: {str(e)}',
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RecognitionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter les logs de reconnaissance.
    
    GET /api/logs/ - Historique des reconnaissances (avec pagination)
    GET /api/logs/{id}/ - Détails d'un log
    """
    queryset = FaceRecognitionLog.objects.all().order_by('-timestamp')
    permission_classes = [IsAuthenticated]
    serializer_class = FaceRecognitionLogSerializer
    
    def list(self, request):
        """Lister les logs avec filtres"""
        queryset = self.get_queryset()
        
        # Filtres
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        person_id = request.query_params.get('person_id')
        if person_id:
            queryset = queryset.filter(detected_person_id=person_id)
        
        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        
        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': 'Logs récupérés avec succès',
            'data': serializer.data,
            'timestamp': timezone.now().isoformat()
        })
