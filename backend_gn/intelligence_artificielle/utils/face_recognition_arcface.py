# pylint: disable=import-error
"""
Module de reconnaissance faciale utilisant ArcFace (InsightFace)
Permet d'extraire des embeddings et de comparer des visages
"""
import cv2
import numpy as np
import logging
from typing import Optional, Tuple, List, Dict
import os

# Import conditionnel d'InsightFace
try:
    from insightface.app import FaceAnalysis
    from insightface.model_zoo import get_model
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    FaceAnalysis = None
    get_model = None

logger = logging.getLogger(__name__)


class ArcFaceRecognition:
    """
    Classe pour la reconnaissance faciale avec ArcFace
    """
    
    def __init__(self, model_name='buffalo_l', det_size=(640, 640)):
        """
        Initialise le modèle ArcFace
        
        Args:
            model_name (str): Nom du modèle InsightFace (buffalo_l pour haute précision)
            det_size (tuple): Taille de détection pour le modèle
        """
        if not INSIGHTFACE_AVAILABLE:
            logger.warning("InsightFace n'est pas installé. Installez-le avec: pip install insightface")
            raise ImportError("Le module insightface n'est pas installé")
        
        self.model_name = model_name
        self.det_size = det_size
        self.app = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialise le modèle FaceAnalysis"""
        try:
            # Initialiser FaceAnalysis avec CPU uniquement
            self.app = FaceAnalysis(
                name=self.model_name,
                providers=['CPUExecutionProvider']  # Force l'utilisation du CPU
            )
            self.app.prepare(ctx_id=-1, det_size=self.det_size)  # ctx_id=-1 pour CPU
            logger.info(f"Modèle ArcFace '{self.model_name}' initialisé avec succès (CPU)")
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation du modèle ArcFace: {str(e)}")
            raise
    
    def extract_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extrait l'embedding facial d'une image
        
        Args:
            image_path (str): Chemin vers l'image
            
        Returns:
            np.ndarray: Vecteur d'embedding (512 dimensions) ou None si aucun visage détecté
        """
        try:
            # Vérifier si le fichier existe
            if not os.path.exists(image_path):
                logger.error(f"Image introuvable: {image_path}")
                return None
            
            # Charger l'image
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Impossible de charger l'image: {image_path}")
                return None
            
            # Détecter les visages
            faces = self.app.get(img)
            
            if len(faces) == 0:
                logger.warning(f"Aucun visage détecté dans l'image: {image_path}")
                return None
            
            if len(faces) > 1:
                faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)
                logger.info(f"{len(faces)} visages détectés, utilisation du plus grand")
            
            face = faces[0]
            embedding = face.embedding
            
            # Normaliser l'embedding
            embedding = embedding / np.linalg.norm(embedding)
            
            logger.info(f"Embedding extrait avec succès: {embedding.shape}")
            return embedding
            
        except Exception as e:
            logger.error(f"Erreur lors de l'extraction de l'embedding: {str(e)}")
            return None
    
    def extract_embedding_from_bytes(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """
        Extrait l'embedding facial d'une image en bytes
        
        Args:
            image_bytes (bytes): Données de l'image en bytes
            
        Returns:
            np.ndarray: Vecteur d'embedding (512 dimensions) ou None si aucun visage détecté
        """
        try:
            # Convertir bytes en numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("Impossible de décoder l'image à partir des bytes")
                return None
            
            # Détecter les visages
            faces = self.app.get(img)
            
            if len(faces) == 0:
                logger.warning("Aucun visage détecté dans l'image")
                return None
            
            if len(faces) > 1:
                faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)
                logger.info(f"{len(faces)} visages détectés, utilisation du plus grand")
            
            face = faces[0]
            embedding = face.embedding
            
            # Normaliser l'embedding
            embedding = embedding / np.linalg.norm(embedding)
            
            logger.info(f"Embedding extrait avec succès: {embedding.shape}")
            return embedding
            
        except Exception as e:
            logger.error(f"Erreur lors de l'extraction de l'embedding depuis bytes: {str(e)}")
            return None
    
    def compare_embeddings(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Compare deux embeddings et retourne un score de similarité
        
        Args:
            embedding1 (np.ndarray): Premier embedding
            embedding2 (np.ndarray): Second embedding
            
        Returns:
            float: Score de similarité (similarité cosinus, entre 0 et 1)
        """
        try:
            # Normaliser les embeddings
            embedding1 = embedding1 / np.linalg.norm(embedding1)
            embedding2 = embedding2 / np.linalg.norm(embedding2)
            
            # Calculer la similarité cosinus
            similarity = np.dot(embedding1, embedding2)
            
            # Convertir en score entre 0 et 1
            # La similarité cosinus est entre -1 et 1, on la normalise entre 0 et 1
            score = (similarity + 1) / 2
            
            return float(score)
            
        except Exception as e:
            logger.error(f"Erreur lors de la comparaison des embeddings: {str(e)}")
            return 0.0
    
    def find_best_match(
        self, 
        query_embedding: np.ndarray, 
        database_embeddings: List[Dict[str, any]], 
        threshold: float = 0.6
    ) -> Tuple[Optional[Dict], float]:
        """
        Trouve la meilleure correspondance dans une base de données d'embeddings
        
        Args:
            query_embedding (np.ndarray): Embedding à rechercher
            database_embeddings (list): Liste de dict avec 'id', 'nom', 'prenom', 'embedding'
            threshold (float): Seuil de similarité minimum (défaut: 0.6)
            
        Returns:
            tuple: (meilleure correspondance dict ou None, score de similarité)
        """
        try:
            best_match = None
            best_score = 0.0
            
            for entry in database_embeddings:
                db_embedding = np.array(entry['embedding'])
                
                # Comparer
                score = self.compare_embeddings(query_embedding, db_embedding)
                
                # Mettre à jour si meilleur score
                if score > best_score:
                    best_score = score
                    best_match = entry
            
            # Vérifier le seuil
            if best_score < threshold:
                logger.info(f"Meilleur score ({best_score:.4f}) inférieur au seuil ({threshold})")
                return None, best_score
            
            logger.info(f"Correspondance trouvée: {best_match.get('nom')} avec score {best_score:.4f}")
            return best_match, best_score
            
        except Exception as e:
            logger.error(f"Erreur lors de la recherche de correspondance: {str(e)}")
            return None, 0.0


_arcface_instance = None

def get_arcface_instance() -> Optional[ArcFaceRecognition]:
    """
    Retourne l'instance singleton d'ArcFace
    Retourne None si InsightFace n'est pas disponible
    """
    global _arcface_instance
    
    if not INSIGHTFACE_AVAILABLE:
        logger.warning("InsightFace n'est pas installé. La reconnaissance faciale est désactivée.")
        return None
    
    if _arcface_instance is None:
        try:
            _arcface_instance = ArcFaceRecognition()
        except Exception as e:
            logger.error(f"Impossible d'initialiser ArcFace: {str(e)}")
            return None
    
    return _arcface_instance

