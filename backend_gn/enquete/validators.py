"""
Validators pour les fichiers des preuves et pièces d'enquête
"""
import os
from django.core.exceptions import ValidationError


def validate_preuve_file_size(value):
    """Valide la taille du fichier (max 10 MB)"""
    max_size = 10 * 1024 * 1024  # 10 MB
    if value.size > max_size:
        raise ValidationError(
            f'La taille du fichier ({value.size / (1024*1024):.1f} MB) depasse la limite de 10 MB.'
        )


def validate_preuve_file_type(value):
    """Valide le type de fichier - Seulement Word, PDF et photos"""
    if not value or not hasattr(value, 'name'):
        return
    
    ext = os.path.splitext(value.name)[1].lower()
    
    allowed_extensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
        '.doc', '.docx',
        '.pdf',
    ]
    
    if ext not in allowed_extensions:
        raise ValidationError(
            'Format de fichier non autorise. Formats acceptes : '
            'Photos (JPG, PNG, GIF, BMP, WEBP), Word (DOC, DOCX), PDF'
        )


def validate_document_file_size(value):
    """Valide la taille du fichier (max 50 MB)"""
    max_size = 50 * 1024 * 1024
    if value.size > max_size:
        raise ValidationError(
            f'La taille du fichier ({value.size / (1024*1024):.1f} MB) depasse la limite de 50 MB.'
        )


DOCUMENT_ALLOWED_EXTENSIONS = [
    '.pdf',
    '.doc', '.docx',
    '.xls', '.xlsx',
    '.ppt', '.pptx',
    '.odt', '.ods', '.odp',
    '.csv',
    '.txt', '.rtf',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
    '.zip', '.rar', '.7z',
]


def validate_document_file_type(value):
    """Valide le type de fichier pour les documents d'enquete"""
    if not value or not hasattr(value, 'name'):
        return
    
    ext = os.path.splitext(value.name)[1].lower()
    
    if ext not in DOCUMENT_ALLOWED_EXTENSIONS:
        raise ValidationError(
            'Format de fichier non autorise. Formats acceptes : '
            'PDF, Word, Excel, PowerPoint, LibreOffice, CSV, TXT, RTF, '
            'Images (JPG, PNG, GIF, BMP, WEBP), Archives (ZIP, RAR, 7Z)'
        )

