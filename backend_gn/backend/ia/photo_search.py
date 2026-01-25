"""Recherche d'un criminel à partir d'une photo uploadée."""

from __future__ import annotations

import logging
from numbers import Real
from typing import Any, Dict, Optional

from intelligence_artificielle.ia_service import (
    FaceRecognitionIAService,
    FaceRecognitionUnavailable,
)

from .exceptions import (
    FaceModelUnavailableError,
    FaceRecognitionError,
    InvalidImageError,
    NoFaceDetectedError,
    NoMatchFoundError,
)
from .face_utils import log_event

logger = logging.getLogger(__name__)


def _resolve_service(threshold: float) -> FaceRecognitionIAService:
    try:
        return FaceRecognitionIAService(threshold=threshold)
    except FaceRecognitionUnavailable as exc:
        logger.error("ArcFace indisponible pour la recherche par photo: %s", exc)
        raise FaceModelUnavailableError(str(exc)) from exc


def search_criminal_by_photo(
    image: Any,
    *,
    threshold: float = 0.7,
    top_k: int = 5,
    utilisateur=None,
    save_embedding: bool = False,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Retourne la meilleure correspondance pour une photo.

    Raises:
        FaceModelUnavailableError: InsightFace/ArcFace indisponible.
        InvalidImageError: le fichier transmis n'est pas une image lisible.
        NoFaceDetectedError: aucun visage humain détecté.
        NoMatchFoundError: aucun individu correspondant dans la base.
        FaceRecognitionError: toute autre erreur fonctionnelle.
    """

    service = _resolve_service(threshold)

    result = service.search_by_photo(
        image=image,
        threshold=threshold,
        top_k=top_k,
        utilisateur=utilisateur,
        save_embedding=save_embedding,
        metadata=metadata,
    )

    if not result.get("success"):
        message = result.get("message") or "Analyse faciale impossible."
        error_code = result.get("error_code")

        if error_code == "INVALID_IMAGE":
            raise InvalidImageError(
                "Veuillez fournir une photo valide contenant un visage humain."
            )
        if error_code == "NO_FACE_DETECTED":
            raise NoFaceDetectedError(
                "Veuillez fournir une photo valide contenant un visage humain."
            )
        if error_code == "NO_MATCH":
            raise NoMatchFoundError("Aucun individu correspondant trouvé dans la base.")
        if error_code == "ARCFACE_UNAVAILABLE":
            raise FaceModelUnavailableError(message)

        raise FaceRecognitionError(message)

    best_match = result.get("best_match") or {}
    criminel_id = best_match.get("criminel_id")
    nom = best_match.get("nom")
    prenom = best_match.get("prenom")
    score = best_match.get("similarite")
    score_str = f"{float(score):.4f}" if isinstance(score, Real) else "n/a"

    if criminel_id:
        log_event(
            f"Recherche photo: criminel_id={criminel_id}, nom={nom}, prenom={prenom}, score={score_str}",
            level=logging.INFO,
        )
    else:
        log_event("Recherche photo: aucune correspondance trouvée.", level=logging.INFO)

    return result


