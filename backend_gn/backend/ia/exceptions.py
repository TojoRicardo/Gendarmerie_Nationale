"""Exceptions spécifiques au module IA."""


class FaceRecognitionError(Exception):
    """Erreur générique du moteur de reconnaissance faciale."""


class FaceModelUnavailableError(FaceRecognitionError):
    """ArcFace n'a pas pu être initialisé."""


class InvalidImageError(FaceRecognitionError):
    """L'image fournie n'est pas exploitable."""


class NoFaceDetectedError(FaceRecognitionError):
    """Aucun visage humain détecté dans l'image."""


class NoMatchFoundError(FaceRecognitionError):
    """Aucune correspondance trouvée dans la base d'embeddings."""


class CameraUnavailableError(FaceRecognitionError):
    """La webcam n'a pas pu être ouverte."""


class CameraReadError(FaceRecognitionError):
    """Erreur lors de la lecture d'une frame webcam."""


