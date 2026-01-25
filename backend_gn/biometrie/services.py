"""
Services pour le module Biometrie

Ce fichier expose les services principaux du module Biometrie.
L'implémentation complète de la reconnaissance faciale ArcFace 
se trouve dans face_recognition_service.py
"""

from .face_recognition_service import (
    ArcFaceRecognitionService,
    ReconnaissanceFacialeService,
    BiometrieAuditService
)

# Exports pour faciliter les imports
__all__ = [
    'ArcFaceRecognitionService',
    'ReconnaissanceFacialeService',
    'BiometrieAuditService'
]

