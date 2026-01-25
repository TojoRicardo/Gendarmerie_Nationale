"""Services ArcFace pour le module biométrie du SGIC.

Ce module regroupe l'ensemble du flux demandé par l'équipe biométrie :

1. Réception d'une photo envoyée par un enquêteur
2. Détection du visage avec InsightFace / ArcFace
3. Génération de l'encodage facial normalisé (embedding)
4. Sauvegarde de la photo dans `media/biometrie/photos/`
5. Stockage du vecteur d'encodage dans la table `Biometrie`
6. Mise à disposition d'outils pour comparer deux embeddings

Les classes exposées sont utilisées par les vues et serializers existants
sans modifier l'API interne. `face_recognition_service.py` conserve les
mêmes imports en s'appuyant sur ce module.
"""

from __future__ import annotations

import io
import logging
import threading
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple, Union

import numpy as np
from PIL import Image, UnidentifiedImageError

from django.core.files.base import File
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from django.db import transaction

import os
import warnings

# Supprime complètement les avertissements ONNX Runtime (niveau 4 = FATAL uniquement)
os.environ["ORT_LOG_SEVERITY_LEVEL"] = "4"
# Supprime les avertissements ONNX Runtime pour CUDA
warnings.filterwarnings("ignore", category=UserWarning, module="onnxruntime")

try:  # pragma: no cover - dépend de l'installation locale
    import onnxruntime as ort
except Exception:  # pragma: no cover - onnxruntime optionnel
    ort = None

from .models import Biometrie, BiometrieHistorique

logger = logging.getLogger(__name__)

# Réduire les logs InsightFace
logging.getLogger("insightface").setLevel(logging.WARNING)
logging.getLogger("onnxruntime").setLevel(logging.ERROR)

_GLOBAL_FACE_ANALYSIS_LOCK = threading.Lock()
_GLOBAL_FACE_ANALYSIS = None
_GLOBAL_FACE_ANALYSIS_CONFIG: Dict[str, Union[str, Tuple[int, int], int]] = {}
_GLOBAL_FACE_ANALYSIS_ERROR: Optional[Exception] = None

_SHARED_SERVICE_LOCK = threading.Lock()
_SHARED_ARCFACE_SERVICE: Optional["ArcFaceService"] = None
_SHARED_ARCFACE_ERROR: Optional[Exception] = None


try:  # pragma: no cover - dépend de l'installation locale
    from insightface.app import FaceAnalysis

    _ARC_FACE_AVAILABLE = True
except Exception as exc:  # pragma: no cover - insightface optionnel
    FaceAnalysis = None
    _ARC_FACE_AVAILABLE = False
    _ARC_FACE_IMPORT_ERROR = exc


UploadedImage = Union[
    str,
    bytes,
    InMemoryUploadedFile,
    TemporaryUploadedFile,
    Image.Image,
    np.ndarray,
]


@dataclass
class FaceEncodingResult:
    """Représente l'encodage et les métadonnées d'un visage détecté."""

    embedding: np.ndarray
    bbox: Tuple[int, int, int, int]
    confidence: float
    landmarks: Optional[np.ndarray] = None


class BiometrieAuditService:
    """Service de traçabilité pour toutes les actions biométriques."""

    @staticmethod
    def enregistrer_action(
        type_objet: str,
        objet_id: int,
        action: str,
        criminel,
        utilisateur=None,
        description: str = "",
        donnees_avant: Optional[dict] = None,
        donnees_apres: Optional[dict] = None,
        request=None,
    ) -> BiometrieHistorique:
        """Crée une entrée d'audit détaillant chaque opération biométrique."""

        adresse_ip = None
        user_agent = None

        if request:
            adresse_ip = request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")

        historique = BiometrieHistorique.objects.create(
            type_objet=type_objet,
            objet_id=objet_id,
            criminel=criminel,
            action=action,
            description=description,
            donnees_avant=donnees_avant,
            donnees_apres=donnees_apres,
            effectue_par=utilisateur,
            adresse_ip=adresse_ip,
            user_agent=user_agent,
        )

        return historique

    @staticmethod
    def obtenir_historique(
        type_objet: Optional[str] = None,
        objet_id: Optional[int] = None,
        criminel_id: Optional[int] = None,
        action: Optional[str] = None,
        limite: int = 50,
    ) -> List[BiometrieHistorique]:
        """Récupère l'historique filtré sans casser l'ancien contrat d'API."""

        queryset = BiometrieHistorique.objects.select_related("criminel", "effectue_par")

        if type_objet:
            queryset = queryset.filter(type_objet=type_objet)

        if objet_id:
            queryset = queryset.filter(objet_id=objet_id)

        if criminel_id:
            queryset = queryset.filter(criminel_id=criminel_id)

        if action:
            queryset = queryset.filter(action=action)

        return list(queryset[:limite])


class ArcFaceService:
    """Wrapper léger autour d'InsightFace pour la génération/gestion d'encodages."""

    def __init__(
        self,
        *,
        model_name: str = "buffalo_l",
        providers: Optional[List[str]] = None,
        ctx_id: int = 0,
        det_size: Tuple[int, int] = (640, 640),
    ) -> None:
        self.model_name = model_name
        self.providers = providers or self._default_providers()
        self.ctx_id = ctx_id
        self.det_size = det_size

        self._model: Optional[FaceAnalysis] = None
        self._available = False
        self._last_error: Optional[Exception] = None

        if _ARC_FACE_AVAILABLE:
            self._initialize_model()
        else:
            self._last_error = getattr(globals(), "_ARC_FACE_IMPORT_ERROR", None)
            logger.error(
                "ArcFace (insightface) n'est pas disponible. ImportError: %s",
                self._last_error or "N/A",
            )

    def _initialize_model(self) -> None:  # pragma: no cover - dépend du runtime
        global _GLOBAL_FACE_ANALYSIS, _GLOBAL_FACE_ANALYSIS_CONFIG, _GLOBAL_FACE_ANALYSIS_ERROR

        if self._model is not None:
            return

        if _GLOBAL_FACE_ANALYSIS is not None:
            self._model = _GLOBAL_FACE_ANALYSIS
            self._available = True
            self._last_error = None
            return

        with _GLOBAL_FACE_ANALYSIS_LOCK:
            if _GLOBAL_FACE_ANALYSIS is not None:
                self._model = _GLOBAL_FACE_ANALYSIS
                self._available = True
                self._last_error = None
                return

            try:
                # Force CPU uniquement pour éviter les avertissements CUDA
                model = FaceAnalysis(name=self.model_name, providers=self.providers)
                ctx_id = -1  # Force CPU (-1) pour éviter tous les avertissements GPU
                model.prepare(ctx_id=ctx_id, det_size=self.det_size)

                _GLOBAL_FACE_ANALYSIS = model
                _GLOBAL_FACE_ANALYSIS_CONFIG = {
                    "model_name": self.model_name,
                    "providers": tuple(self.providers),
                    "ctx_id": ctx_id,
                    "det_size": self.det_size,
                }
                _GLOBAL_FACE_ANALYSIS_ERROR = None

                logger.info(
                    "ArcFace initialisé (modèle=%s, ctx_id=%s, providers=%s)",
                    self.model_name,
                    ctx_id,
                    ",".join(self.providers),
                )
            except Exception as exc:
                _GLOBAL_FACE_ANALYSIS = None
                _GLOBAL_FACE_ANALYSIS_ERROR = exc
                self._model = None
                self._available = False
                self._last_error = exc
                logger.error("Impossible d'initialiser ArcFace : %s", exc)
                return

        self._model = _GLOBAL_FACE_ANALYSIS
        self._available = self._model is not None
        if self._available:
            self._last_error = None

    @staticmethod
    def _default_providers() -> List[str]:  # pragma: no cover - dépend du runtime
        # Force l'utilisation de CPU uniquement pour éviter les avertissements CUDA
        # Si CUDA est vraiment nécessaire, il faudra configurer l'environnement correctement
        return ["CPUExecutionProvider"]

    @property
    def available(self) -> bool:
        if self._available and self._model is not None:
            return True
        return False

    @property
    def unavailable_reason(self) -> Optional[str]:
        if self.available:
            return None
        if self._last_error:
            return str(self._last_error)
        if _GLOBAL_FACE_ANALYSIS_ERROR:
            return str(_GLOBAL_FACE_ANALYSIS_ERROR)
        if not _ARC_FACE_AVAILABLE:
            return str(getattr(globals(), "_ARC_FACE_IMPORT_ERROR", "ArcFace non importé"))
        if _GLOBAL_FACE_ANALYSIS_CONFIG:
            return (
                "ArcFace est initialisé avec une configuration incompatible. "
                "Redémarrez le service pour recharger le modèle."
            )
        return None

    def encode_image(self, image: UploadedImage) -> Optional[np.ndarray]:
        """Retourne un embedding facial normalisé ou ``None`` si aucun visage n'est détecté.
        
        Si plusieurs visages sont détectés, utilise le visage le plus grand (par surface de bbox).
        """

        faces = self.encode_faces(image=image, limit=None)  # Détecter tous les visages
        if not faces:
            return None
        
        if len(faces) > 1:
            logger.info(f"{len(faces)} visages détectés. Utilisation du visage le plus grand.")
            faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)
        
        return faces[0].embedding

    def encode_faces(
        self,
        *,
        image: UploadedImage,
        limit: Optional[int] = None,
    ) -> List[FaceEncodingResult]:
        """Détecte tous les visages sur une image et retourne leurs encodages.

        Args:
            image: Source de l'image (chemin, bytes, UploadedFile, ndarray, etc.).
            limit: Limite optionnelle du nombre de visages à retourner (None = tous).

        Returns:
            Liste de ``FaceEncodingResult`` contenant l'encodage normalisé et les métadonnées.

        Raises:
            RuntimeError: Si ArcFace n'est pas disponible.
            ValueError: Si l'image ne peut pas être chargée.
        """

        if not self.available:
            reason = self.unavailable_reason or "ArcFace n'est pas disponible. Vérifiez l'installation d'insightface."
            raise RuntimeError(reason)

        frame = self._load_image(image)
        if frame is None:
            raise ValueError("Impossible de charger l'image fournie.")

        try:
            faces = self._model.get(frame)  # type: ignore[union-attr]
        except Exception as exc:  # pragma: no cover - dépend du runtime
            logger.error("Erreur ArcFace lors de la détection des visages: %s", exc)
            self._last_error = exc
            raise RuntimeError("Le moteur ArcFace a rencontré une erreur pendant la détection.") from exc

        if not faces:
            return []

        results: List[FaceEncodingResult] = []
        for face in faces:
            embedding = face.embedding.astype(np.float32)
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm

            bbox = tuple(int(x) for x in face.bbox.tolist())  # type: ignore[attr-defined]
            confidence = float(getattr(face, "det_score", 0.0))
            landmarks = getattr(face, "landmark", None)
            if landmarks is not None:
                landmarks = np.asarray(landmarks, dtype=np.float32)

            results.append(
                FaceEncodingResult(
                    embedding=embedding,
                    bbox=bbox,
                    confidence=confidence,
                    landmarks=landmarks,
                )
            )

            if limit is not None and len(results) >= limit:
                break

        return results

    def save_biometrie_entry(
        self,
        *,
        criminel,
        photo: UploadedImage,
        utilisateur=None,
        request=None,
        audit_description: str = "Enregistrement photo biométrique",
    ) -> Optional[Tuple[Biometrie, List[float]]]:
        """
        Pipeline complet photo -> encodage -> stockage.

        - Détecte un visage et retourne ``None`` si aucun visage n'est trouvé
        - Sauvegarde la photo originale via le modèle ``Biometrie``
        - Stocke l'encodage facial normalisé dans la colonne JSON
        - Journalise l'action dans l'historique biométrique

        Returns:
            tuple(Biometrie, list[float]) ou ``None`` si aucun visage n'a été détecté.
        """

        embedding = self.encode_image(photo)
        if embedding is None:
            return None

        embedding_list = self.serialize_embedding(embedding)

        with transaction.atomic():
            biometrie = Biometrie.objects.create(
                criminel=criminel,
                photo=photo,
                encodage_facial=embedding_list,
            )

            BiometrieAuditService.enregistrer_action(
                type_objet="encodage",
                objet_id=biometrie.pk,
                action="encodage",
                criminel=criminel,
                utilisateur=utilisateur,
                description=audit_description,
                donnees_apres={
                    "biometrie_id": biometrie.pk,
                    "encodage_genere": True,
                },
                request=request,
            )

        return biometrie, embedding_list

    @staticmethod
    def compare_embeddings(embedding_a: np.ndarray, embedding_b: np.ndarray) -> float:
        """Calcule la similarité cosinus entre deux embeddings (0.0 -> 1.0)."""

        a = embedding_a / (np.linalg.norm(embedding_a) + 1e-12)
        b = embedding_b / (np.linalg.norm(embedding_b) + 1e-12)
        return float(np.dot(a, b))

    def compare(
        self,
        query_embedding: np.ndarray,
        stored_embeddings: Iterable[np.ndarray],
    ) -> List[Tuple[float, np.ndarray]]:
        """Retourne les embeddings triés par score de similarité décroissant."""

        results: List[Tuple[float, np.ndarray]] = []
        if query_embedding is None:
            return results

        for candidate in stored_embeddings:
            similarity = self.compare_embeddings(query_embedding, candidate)
            results.append((similarity, candidate))

        results.sort(key=lambda item: item[0], reverse=True)
        return results

    @staticmethod
    def are_same_person(
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
        *,
        threshold: float = 0.6,
    ) -> bool:
        """Vérifie si deux embeddings appartiennent au même individu selon un seuil."""

        score = ArcFaceService.compare_embeddings(embedding_a, embedding_b)
        return score >= threshold

    # Sérialisation
    @staticmethod
    def serialize_embedding(embedding: np.ndarray) -> List[float]:
        return embedding.astype(float).tolist()

    @staticmethod
    def deserialize_embedding(data: Union[List[float], Tuple[float, ...]]) -> np.ndarray:
        return np.asarray(data, dtype=np.float32)

    # Utilitaires internes
    @staticmethod
    def _pil_to_bgr(image: Image.Image) -> np.ndarray:
        rgb = image.convert("RGB")
        array = np.asarray(rgb)
        return array[:, :, ::-1]  # RGB -> BGR

    def _load_image(self, image: UploadedImage) -> Optional[np.ndarray]:
        if isinstance(image, str):
            try:
                with Image.open(image) as img:
                    return self._pil_to_bgr(img)
            except (UnidentifiedImageError, OSError) as exc:
                raise ValueError("Le fichier image fourni est invalide ou corrompu.") from exc

        if isinstance(image, (InMemoryUploadedFile, TemporaryUploadedFile)):
            image.seek(0)
            data = image.read()
            image.seek(0)
            try:
                return self._pil_to_bgr(Image.open(io.BytesIO(data)))
            except (UnidentifiedImageError, OSError) as exc:
                raise ValueError("Le fichier téléchargé n'est pas une image valide.") from exc

        if isinstance(image, bytes):
            try:
                return self._pil_to_bgr(Image.open(io.BytesIO(image)))
            except (UnidentifiedImageError, OSError) as exc:
                raise ValueError("Le contenu binaire fourni n'est pas une image valide.") from exc

        if isinstance(image, Image.Image):
            return self._pil_to_bgr(image)

        if isinstance(image, np.ndarray):
            if image.ndim == 3 and image.shape[2] >= 3:
                # Copier pour garantir un tableau contiguous uint8.
                array = image.astype(np.uint8, copy=False)
                return array[:, :, :3]
            raise ValueError("Le tableau numpy doit être de forme (H, W, 3)")

        if isinstance(image, File):
            image.seek(0)
            data = image.read()
            image.seek(0)
            try:
                return self._pil_to_bgr(Image.open(io.BytesIO(data)))
            except (UnidentifiedImageError, OSError) as exc:
                raise ValueError("Le fichier fourni n'est pas une image valide.") from exc

        raise TypeError("Type d'image non supporté pour ArcFace")

    @classmethod
    def get_global_initialization_error(cls) -> Optional[Exception]:
        return _GLOBAL_FACE_ANALYSIS_ERROR

    @classmethod
    def get_global_config(cls) -> Dict[str, Union[str, Tuple[int, int], int]]:
        return dict(_GLOBAL_FACE_ANALYSIS_CONFIG)


def get_shared_arcface_service() -> ArcFaceService:
    """
    Retourne une instance partagée de ``ArcFaceService`` pour éviter de recharger le modèle.

    Raises:
        RuntimeError: Si le modèle ne peut pas être initialisé.
    """

    global _SHARED_ARCFACE_SERVICE, _SHARED_ARCFACE_ERROR

    if _SHARED_ARCFACE_SERVICE and _SHARED_ARCFACE_SERVICE.available:
        return _SHARED_ARCFACE_SERVICE

    with _SHARED_SERVICE_LOCK:
        if _SHARED_ARCFACE_SERVICE and _SHARED_ARCFACE_SERVICE.available:
            return _SHARED_ARCFACE_SERVICE

        try:
            service = ArcFaceService()
        except Exception as exc:  # pragma: no cover - protection runtime
            _SHARED_ARCFACE_SERVICE = None
            _SHARED_ARCFACE_ERROR = exc
            raise

        if not service.available:
            error = RuntimeError(
                service.unavailable_reason
                or "ArcFace n'est pas disponible. Vérifiez l'installation InsightFace."
            )
            _SHARED_ARCFACE_SERVICE = None
            _SHARED_ARCFACE_ERROR = error
            raise error

        _SHARED_ARCFACE_SERVICE = service
        _SHARED_ARCFACE_ERROR = None
        return service


def get_shared_arcface_error() -> Optional[Exception]:
    """
    Retourne la dernière erreur rencontrée lors de l'initialisation du modèle partagé.
    """

    if _SHARED_ARCFACE_ERROR:
        return _SHARED_ARCFACE_ERROR
    return ArcFaceService.get_global_initialization_error()


class ReconnaissanceFacialeService:
    """Service de haut niveau pour orchestrer les comparaisons faciales."""

    def __init__(self, seuil_confiance: float = 0.6, arcface_service: Optional[ArcFaceService] = None) -> None:
        self.seuil_confiance = seuil_confiance
        self.arcface = arcface_service or ArcFaceService()

    def generer_encodage_facial(self, image: UploadedImage) -> Optional[List[float]]:
        embedding = self.arcface.encode_image(image)
        if embedding is None:
            return None
        return self.arcface.serialize_embedding(embedding)

    def calculer_score(self, embedding_a: np.ndarray, embedding_b: np.ndarray) -> float:
        return ArcFaceService.compare_embeddings(embedding_a, embedding_b)


