"""
Validators pour les champs du modèle CriminalFicheCriminelle.
Validation des images biométriques selon les normes ISO/NIST.
"""

import os
from django.core.exceptions import ValidationError
from PIL import Image
import logging

logger = logging.getLogger(__name__)


def validate_biometric_photo(value):
    """
    Valide une photo biométrique selon les normes ISO 19794-5.
    
    Exigences:
    - Format: JPEG ou TIFF
    - Dimensions minimales: 600x800 pixels (face)
    - Ratio recommandé: 3:4 (portrait)
    - Taille max: 10 MB
    - DPI recommandé: >= 300
    """
    if not value:
        return
    
    # Vérifier l'extension
    ext = os.path.splitext(value.name)[1].lower()
    allowed_extensions = ['.jpg', '.jpeg', '.tiff', '.tif']
    if ext not in allowed_extensions:
        raise ValidationError(
            f'Format de fichier non autorisé. Formats acceptés: {", ".join(allowed_extensions)}'
        )
    
    max_size = 10 * 1024 * 1024  # 10 MB
    if hasattr(value, 'size') and value.size > max_size:
        raise ValidationError(
            f'La taille du fichier ({value.size / (1024*1024):.1f} MB) dépasse la limite de 10 MB.'
        )
    
    # Vérifier les dimensions et DPI
    try:
        value.seek(0)
        img = Image.open(value)
        
        width, height = img.size
        
        # Dimensions minimales pour photo de face
        min_width = 600
        min_height = 800
        
        if width < min_width or height < min_height:
            raise ValidationError(
                f'Dimensions insuffisantes: {width}x{height}px. '
                f'Minimum requis: {min_width}x{min_height}px pour une photo biométrique conforme.'
            )
        
        ratio = width / height
        ideal_ratio = 3 / 4  # 0.75
        tolerance = 0.1
        
        if abs(ratio - ideal_ratio) > tolerance:
            logger.warning(
                f'Ratio d\'image non optimal: {ratio:.2f} (recommandé: {ideal_ratio:.2f}) '
                f'pour {value.name}'
            )
        
        # Vérifier le DPI si disponible
        if hasattr(img, 'info') and 'dpi' in img.info:
            dpi = img.info['dpi']
            if isinstance(dpi, tuple):
                dpi_x, dpi_y = dpi
                if dpi_x < 300 or dpi_y < 300:
                    logger.warning(
                        f'DPI faible: {dpi_x}x{dpi_y} (recommandé: >= 300 DPI) pour {value.name}'
                    )
        
        value.seek(0)
        
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(
            f'Erreur lors de la validation de l\'image: {str(e)}. '
            f'Vérifiez que le fichier est une image valide.'
        )


def validate_fingerprint_image(value):
    """
    Valide une image d'empreinte digitale selon les normes NIST/ISO.
    
    Exigences:
    - Format: TIFF non compressé, JPEG, ou WSQ
    - Dimensions minimales: 1000x1000 pixels
    - DPI recommandé: >= 500 (idéal: 1000 DPI)
    - Taille max: 5 MB
    """
    if not value:
        return
    
    # Vérifier l'extension
    ext = os.path.splitext(value.name)[1].lower()
    allowed_extensions = ['.jpg', '.jpeg', '.tiff', '.tif', '.wsq']
    if ext not in allowed_extensions:
        raise ValidationError(
            f'Format d\'empreinte non autorisé. Formats acceptés: {", ".join(allowed_extensions)}'
        )
    
    max_size = 5 * 1024 * 1024  # 5 MB
    if hasattr(value, 'size') and value.size > max_size:
        raise ValidationError(
            f'La taille du fichier ({value.size / (1024*1024):.1f} MB) dépasse la limite de 5 MB.'
        )
    
    # Vérifier les dimensions et DPI
    try:
        value.seek(0)
        
        # Pour WSQ, on ne peut pas vérifier avec PIL
        if ext == '.wsq':
            # WSQ est un format spécialisé pour empreintes, on accepte
            value.seek(0)
            return
        
        img = Image.open(value)
        width, height = img.size
        
        # Dimensions minimales pour empreinte
        min_dimension = 1000
        
        if width < min_dimension or height < min_dimension:
            raise ValidationError(
                f'Dimensions insuffisantes pour empreinte: {width}x{height}px. '
                f'Minimum requis: {min_dimension}x{min_dimension}px selon normes NIST.'
            )
        
        # Vérifier le DPI si disponible
        if hasattr(img, 'info') and 'dpi' in img.info:
            dpi = img.info['dpi']
            if isinstance(dpi, tuple):
                dpi_x, dpi_y = dpi
                if dpi_x < 500 or dpi_y < 500:
                    logger.warning(
                        f'DPI faible pour empreinte: {dpi_x}x{dpi_y} '
                        f'(recommandé: >= 500 DPI, idéal: 1000 DPI) pour {value.name}'
                    )
        
        value.seek(0)
        
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(
            f'Erreur lors de la validation de l\'empreinte: {str(e)}. '
            f'Vérifiez que le fichier est une image valide.'
        )


def validate_palmprint_image(value):
    """
    Valide une image d'empreinte palmaire.
    
    Exigences:
    - Format: TIFF ou JPEG
    - Dimensions minimales: 1500x2000 pixels
    - DPI recommandé: >= 500
    - Taille max: 10 MB
    """
    if not value:
        return
    
    # Vérifier l'extension
    ext = os.path.splitext(value.name)[1].lower()
    allowed_extensions = ['.jpg', '.jpeg', '.tiff', '.tif']
    if ext not in allowed_extensions:
        raise ValidationError(
            f'Format d\'empreinte palmaire non autorisé. Formats acceptés: {", ".join(allowed_extensions)}'
        )
    
    max_size = 10 * 1024 * 1024  # 10 MB
    if hasattr(value, 'size') and value.size > max_size:
        raise ValidationError(
            f'La taille du fichier ({value.size / (1024*1024):.1f} MB) dépasse la limite de 10 MB.'
        )
    
    # Vérifier les dimensions
    try:
        value.seek(0)
        img = Image.open(value)
        width, height = img.size
        
        # Dimensions minimales pour empreinte palmaire
        min_width = 1500
        min_height = 2000
        
        if width < min_width or height < min_height:
            raise ValidationError(
                f'Dimensions insuffisantes pour empreinte palmaire: {width}x{height}px. '
                f'Minimum requis: {min_width}x{min_height}px.'
            )
        
        value.seek(0)
        
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(
            f'Erreur lors de la validation de l\'empreinte palmaire: {str(e)}.'
        )

