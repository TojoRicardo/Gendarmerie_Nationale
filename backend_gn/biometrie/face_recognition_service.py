"""Compatibilité rétro avec l'ancien module de services ArcFace."""

from __future__ import annotations

from .arcface_service import (
    ArcFaceService,
    BiometrieAuditService,
    FaceEncodingResult,
    ReconnaissanceFacialeService,
)


class ArcFaceRecognitionService(ArcFaceService):
    """Alias conservé pour compatibilité avec l'existant."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


__all__ = [
    "ArcFaceRecognitionService",
    "ArcFaceService",
    "FaceEncodingResult",
    "ReconnaissanceFacialeService",
    "BiometrieAuditService",
]
