"""
Validators pour les fichiers des preuves et pièces d'enquête
Validation stricte : 10 MB max, seulement Word, PDF et photos
"""
import os
from django.core.exceptions import ValidationError


def validate_preuve_file_size(value):
    """Valide la taille du fichier (max 10 MB)"""
    max_size = 10 * 1024 * 1024  # 10 MB
    if value.size > max_size:
        raise ValidationError(
            f'La taille du fichier ({value.size / (1024*1024):.1f} MB) dépasse la limite de 10 MB.'
        )


def validate_preuve_file_type(value):
    """Valide le type de fichier - Seulement Word, PDF et photos"""
    if not value or not hasattr(value, 'name'):
        return
    
    ext = os.path.splitext(value.name)[1].lower()
    
    # Extensions autorisées : Photos, Word, PDF uniquement
    allowed_extensions = [
        # Photos
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
        # Word
        '.doc', '.docx',
        # PDF
        '.pdf',
    ]
    
    if ext not in allowed_extensions:
        raise ValidationError(
            f'Format de fichier non autorisé. Formats acceptés : '
            f'Photos (JPG, PNG, GIF, BMP, WEBP), Word (DOC, DOCX), PDF'
        )

