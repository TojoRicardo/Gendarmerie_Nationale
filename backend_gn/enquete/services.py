from django.apps import apps
from typing import Optional


def recalculate_progression(dossier_id: Optional[int]) -> Optional[int]:
    """
    Recalcule la progression automatique d'un dossier criminel.

    Args:
        dossier_id: identifiant du dossier CriminalFicheCriminelle
    Returns:
        Nouveau pourcentage de progression ou None si le dossier est introuvable.
    """
    if not dossier_id:
        return None

    CriminalFicheCriminelle = apps.get_model("criminel", "CriminalFicheCriminelle")
    try:
        dossier = CriminalFicheCriminelle.objects.get(pk=dossier_id)
    except CriminalFicheCriminelle.DoesNotExist:
        return None

    return dossier.update_progression()

