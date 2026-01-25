"""Capture unique pour la reconnaissance faciale en temps réel."""

from __future__ import annotations

import base64
import logging
import time
from io import BytesIO
from typing import Any, Dict, Optional, Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError

from .exceptions import (
    FaceModelUnavailableError,
    InvalidImageError,
    NoFaceDetectedError,
)
from .face_utils import FaceEngine, log_event

try:
    from intelligence_artificielle.ia_service import (
        FaceRecognitionIAService,
        FaceRecognitionUnavailable,
    )
except Exception:  # pragma: no cover - import temporel
    FaceRecognitionIAService = None  # type: ignore
    FaceRecognitionUnavailable = Exception  # type: ignore

logger = logging.getLogger(__name__)

_FACE_ENGINE: Optional[FaceEngine] = None
_FACE_SERVICE: Optional[FaceRecognitionIAService] = None
_FACE_SERVICE_ERROR: Optional[str] = None


def decode_base64_image(data_url: str) -> Image.Image:
    """Décoder une image base64 envoyée par le frontend."""

    if not data_url or "," not in data_url:
        raise InvalidImageError("Veuillez fournir une photo valide contenant un visage humain.")

    header, encoded = data_url.split(",", 1)
    try:
        img_bytes = base64.b64decode(encoded)
    except (base64.binascii.Error, ValueError) as exc:  # pragma: no cover - sécurité
        raise InvalidImageError("Veuillez fournir une photo valide contenant un visage humain.") from exc

    try:
        image = Image.open(BytesIO(img_bytes))
        return image.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("Veuillez fournir une photo valide contenant un visage humain.") from exc


def _get_face_engine() -> FaceEngine:
    global _FACE_ENGINE

    if _FACE_ENGINE is None:
        try:
            _FACE_ENGINE = FaceEngine()
        except Exception as exc:  # pragma: no cover - dépendances runtime
            raise FaceModelUnavailableError(str(exc)) from exc

    return _FACE_ENGINE


def _get_face_service(threshold: float) -> FaceRecognitionIAService:
    if FaceRecognitionIAService is None:  # pragma: no cover - import fail safe
        raise FaceModelUnavailableError("ArcFace n'est pas disponible sur le serveur.")

    global _FACE_SERVICE, _FACE_SERVICE_ERROR

    if _FACE_SERVICE is not None and _FACE_SERVICE_ERROR is None:
        _FACE_SERVICE.threshold = threshold
        return _FACE_SERVICE

    try:
        engine = _get_face_engine()
        _FACE_SERVICE = FaceRecognitionIAService(
            threshold=threshold,
            arcface_service=engine.arcface,
        )
        _FACE_SERVICE_ERROR = None
        return _FACE_SERVICE
    except FaceRecognitionUnavailable as exc:
        _FACE_SERVICE = None
        _FACE_SERVICE_ERROR = str(exc)
        raise FaceModelUnavailableError(str(exc)) from exc
    except Exception as exc:  # pragma: no cover - sécurité
        _FACE_SERVICE = None
        _FACE_SERVICE_ERROR = str(exc)
        raise FaceModelUnavailableError(str(exc)) from exc


def _pil_to_bgr_array(image: Image.Image) -> np.ndarray:
    array = np.asarray(image, dtype=np.uint8)
    if array.ndim == 2:
        array = np.stack([array, array, array], axis=-1)
    return array[:, :, ::-1]  # RGB -> BGR


def _format_match_payload(
    match,
    *,
    similarity_percent: float,
    bbox: Tuple[int, int, int, int],
) -> Dict[str, Any]:
    criminel = getattr(match, "criminel", None)

    photo_url = None
    if criminel is not None and getattr(criminel, "photo", None):
        try:
            photo_url = criminel.photo.url  # type: ignore[attr-defined]
        except Exception:  # pragma: no cover - accès storage
            photo_url = None

    metadata = getattr(match, "metadata", {}) or {}
    if metadata.get("photo_url"):
        photo_url = metadata["photo_url"]

    return {
        "id": getattr(criminel, "id", None),
        "numero_fiche": getattr(criminel, "numero_fiche", None),
        "nom": getattr(criminel, "nom", None),
        "prenom": getattr(criminel, "prenom", None),
        "similarity": round(similarity_percent, 2),
        "photo_url": photo_url,
        "source": getattr(match, "source", "realtime"),
        "embedding_id": getattr(match, "embedding_id", None),
        "metadata": metadata,
        "bbox": list(map(int, bbox)),
    }


def analyze_realtime_capture(
    image_data: str,
    *,
    threshold: float = 0.7,
) -> Dict[str, Any]:
    """Analyse une capture unique provenant de la webcam."""

    started_at = time.monotonic()

    engine = _get_face_engine()
    service = _get_face_service(threshold)

    try:
        pil_image = decode_base64_image(image_data)
    except InvalidImageError as exc:
        return {
            "status": "invalid_face",
            "message": str(exc),
        }

    frame = _pil_to_bgr_array(pil_image)
    frame_height, frame_width = frame.shape[:2]

    try:
        embedding, face = engine.extract_embedding(frame)
    except InvalidImageError as exc:
        return {
            "status": "invalid_face",
            "message": str(exc),
        }
    except NoFaceDetectedError:
        return {
            "status": "invalid_face",
            "message": "Veuillez fournir une photo valide contenant un visage humain.",
        }

    matches = service.score_embeddings(
        embedding,
        top_k=1,
        threshold=threshold,
        include_all=True,
    )

    duration_ms = int((time.monotonic() - started_at) * 1000)
    landmarks = engine.serialize_landmarks(face.landmarks)
    bbox = tuple(int(value) for value in face.bbox)

    if not matches:
        return {
            "status": "no_match",
            "message": "Aucun individu correspondant trouvé dans la base.",
            "landmarks": landmarks,
            "bbox": list(bbox),
            "frame_dimensions": {"width": frame_width, "height": frame_height},
            "duration_ms": duration_ms,
        }

    best_match = matches[0]
    similarity_percent = float(best_match.similarity) * 100.0

    if best_match.similarity < threshold:
        log_event(
            "Capture temps réel : aucun match au-dessus du seuil "
            f"(score={similarity_percent:.2f}%, seuil={threshold*100:.0f}%).",
            level=logging.INFO,
        )
        return {
            "status": "no_match",
            "message": "Aucun individu correspondant trouvé dans la base.",
            "landmarks": landmarks,
            "bbox": list(bbox),
            "frame_dimensions": {"width": frame_width, "height": frame_height},
            "duration_ms": duration_ms,
        }

    match_payload = _format_match_payload(
        best_match,
        similarity_percent=similarity_percent,
        bbox=bbox,
    )

    log_event(
        "Capture temps réel : match trouvé "
        f"(criminel_id={match_payload['id']}, similarity={similarity_percent:.2f}%).",
        level=logging.INFO,
    )

    return {
        "status": "success",
        "message": "Correspondance trouvée.",
        "match": match_payload,
        "similarity": similarity_percent,
        "landmarks": landmarks,
        "bbox": list(bbox),
        "frame_dimensions": {"width": frame_width, "height": frame_height},
        "duration_ms": duration_ms,
    }


__all__ = [
    "analyze_realtime_capture",
    "decode_base64_image",
]


