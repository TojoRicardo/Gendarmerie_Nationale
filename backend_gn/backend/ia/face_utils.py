"""Utilitaires bas niveau pour manipuler ArcFace et les landmarks."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple

try:  # pragma: no cover - dépend de l'environnement d'exécution
    import cv2  # type: ignore
except Exception:  # pragma: no cover - OpenCV peut être optionnel
    cv2 = None  # type: ignore

import numpy as np

from biometrie.arcface_service import (
    ArcFaceService,
    FaceEncodingResult,
    get_shared_arcface_service,
)

from .exceptions import (
    FaceModelUnavailableError,
    InvalidImageError,
    NoFaceDetectedError,
)

LOG_DIR = Path(__file__).resolve().parent.parent / "ia_logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)


def _get_arcface() -> ArcFaceService:
    try:
        service = get_shared_arcface_service()
    except Exception as exc:  # pragma: no cover - protection runtime
        raise FaceModelUnavailableError(str(exc)) from exc

    if not service.available:
        reason = service.unavailable_reason or "ArcFace n'est pas disponible."
        raise FaceModelUnavailableError(reason)

    return service


class FaceEngine:
    """Encapsule l'accès au moteur ArcFace pour la détection et l'encodage."""

    def __init__(self, arcface: Optional[ArcFaceService] = None) -> None:
        self.arcface = arcface or _get_arcface()

    # ------------------------------------------------------------------
    # Détection & encodage
    # ------------------------------------------------------------------
    def detect_faces(
        self,
        image: Sequence,
        *,
        limit: Optional[int] = None,
    ) -> List[FaceEncodingResult]:
        """Détecte les visages et retourne les métadonnées ArcFace."""

        try:
            faces = self.arcface.encode_faces(image=image, limit=limit)
        except ValueError as exc:
            logger.warning("Image invalide fournie à ArcFace: %s", exc)
            raise InvalidImageError(
                "Veuillez fournir une photo valide contenant un visage humain."
            ) from exc
        except TypeError as exc:
            logger.warning("Format d'image non supporté pour ArcFace: %s", exc)
            raise InvalidImageError(
                "Veuillez fournir une photo valide contenant un visage humain."
            ) from exc

        if not faces:
            raise NoFaceDetectedError(
                "Veuillez fournir une photo valide contenant un visage humain."
            )

        return faces

    def extract_embedding(
        self,
        image: Sequence,
    ) -> Tuple[np.ndarray, FaceEncodingResult]:
        """Retourne l'embedding normalisé et les métadonnées ArcFace associées."""

        faces = self.detect_faces(image, limit=1)
        face = faces[0]
        return face.embedding, face

    # ------------------------------------------------------------------
    # Landmarks & visualisation
    # ------------------------------------------------------------------
    @staticmethod
    def serialize_landmarks(landmarks: Optional[np.ndarray]) -> List[List[float]]:
        """Convertit un tableau de landmarks en liste sérialisable JSON."""

        if landmarks is None:
            return []
        return [[float(x), float(y)] for x, y in landmarks.tolist()]

    def draw_landmarks(
        self,
        frame: np.ndarray,
        landmarks: Optional[np.ndarray],
        *,
        color: Tuple[int, int, int] = (0, 255, 0),
        radius: int = 2,
        thickness: int = -1,
    ) -> np.ndarray:
        """Dessine les landmarks sur une frame OpenCV sans overlay coloré."""

        if cv2 is None:  # pragma: no cover - dépend de l'installation locale
            raise ImportError(
                "opencv-python n'est pas disponible. Installez-le pour la visualisation."
            )

        if frame is None or landmarks is None:
            return frame

        output = frame.copy()
        for point in landmarks:
            x, y = int(point[0]), int(point[1])
            cv2.circle(output, (x, y), radius, color, thickness, lineType=cv2.LINE_AA)
        return output

    def draw_face(
        self,
        frame: np.ndarray,
        face: FaceEncodingResult,
        *,
        color: Tuple[int, int, int] = (0, 255, 0),
    ) -> np.ndarray:
        """Dessine uniquement les landmarks du visage sur la frame."""

        return self.draw_landmarks(frame, face.landmarks, color=color)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calcule la similarité cosinus entre deux vectors."""

    if a.shape != b.shape:
        raise ValueError("Les embeddings doivent avoir la même dimension.")

    a_norm = a / (np.linalg.norm(a) + 1e-12)
    b_norm = b / (np.linalg.norm(b) + 1e-12)
    return float(np.dot(a_norm, b_norm))


def log_event(message: str, *, level: int = logging.INFO) -> None:
    """Écrit un message dans le fichier de logs ia_logs/arcface.log."""

    log_file = LOG_DIR / "arcface.log"
    handler = logging.FileHandler(log_file, encoding="utf-8")
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    temp_logger = logging.getLogger("backend.ia")
    temp_logger.addHandler(handler)
    temp_logger.setLevel(level)

    temp_logger.log(level, message)

    temp_logger.removeHandler(handler)
    handler.close()


