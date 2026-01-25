"""
Service de recherche biométrique (photo ou tapissage) pour la section IA.

Ce module réutilise le moteur de reconnaissance faciale ArcFace exposé dans
`face_recognition.services` afin d'offrir, depuis la section IA, une recherche
par photo unique ou une comparaison dans un tapissage (line-up).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Iterable, List, Optional, Dict, Any

from django.core.files.storage import default_storage
from django.utils import timezone

from face_recognition.services import (
    extract_embedding_from_image,
    recognize_person,
    verify_person,
    save_recognition_log,
)
from face_recognition.models import Person  # type: ignore[attr-defined]


@dataclass
class BiometricMatch:
    """
    Représente une correspondance trouvée lors de la recherche biométrique.
    """

    person_id: str
    person_name: str
    confidence_score: float
    verified: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "person_id": self.person_id,
            "person_name": self.person_name,
            "confidence_score": self.confidence_score,
            "verified": self.verified,
        }


def _save_temp_image(image_file, directory: str) -> str:
    """
    Sauvegarde l'image dans un dossier temporaire et retourne le chemin.
    """
    filename = getattr(image_file, "name", f"{uuid.uuid4()}.jpg")
    timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
    path = f"ai_analysis/{directory}/{timestamp}_{filename}"
    return default_storage.save(path, image_file)


def _serialize_person(person: Person) -> Dict[str, Any]:
    """
    Sérialise une instance Person en dictionnaire simple.
    """
    return {
        "id": str(person.id),
        "name": person.name,
        "email": person.email,
        "created_at": person.created_at.isoformat() if getattr(person, "created_at", None) else None,
    }


def rechercher_par_photo(
    image_file,
    *,
    threshold: float = 0.6,
    top_k: int = 3,
    include_embedding: bool = False,
    requested_by=None,
) -> Dict[str, Any]:
    """
    Recherche les meilleures correspondances pour une photo donnée.
    """
    embedding, detection_score = extract_embedding_from_image(image_file)

    if embedding is None:
        raise ValueError("Aucun visage détecté dans l'image fournie.")

    # Après extraction, repositionner le curseur pour la sauvegarde éventuelle
    if hasattr(image_file, "seek"):
        image_file.seek(0)

    image_path = _save_temp_image(image_file, "recherches")

    matches = recognize_person(embedding, threshold=threshold, top_k=top_k)

    data_matches: List[Dict[str, Any]] = []
    best_person = None
    best_score = 0.0

    for match in matches:
        person = match.get("person")
        if not person:
            continue

        confidence = float(match.get("confidence_score", 0.0))
        data_matches.append({
            "person": _serialize_person(person),
            "confidence_score": confidence,
            "face_embedding_id": match.get("face_embedding_id"),
        })

        if confidence > best_score:
            best_score = confidence
            best_person = person

    save_recognition_log(
        embedding=embedding,
        image_path=image_path,
        detected_person=best_person if best_score >= threshold else None,
        confidence_score=best_score if best_score >= threshold else 0.0,
        threshold_used=threshold,
        processing_time_ms=None,
        created_by=requested_by,
    )

    response: Dict[str, Any] = {
        "mode": "search",
        "threshold": threshold,
        "top_k": top_k,
        "detection_score": detection_score,
        "matches": data_matches,
        "recognized": best_person is not None and best_score >= threshold,
        "best_score": best_score,
        "image_path": image_path,
    }

    if include_embedding:
        response["embedding"] = embedding.tolist()

    return response


def comparer_tapissage(
    image_file,
    lineup_ids: Iterable[uuid.UUID],
    *,
    threshold: float = 0.6,
    include_embedding: bool = False,
    requested_by=None,
) -> Dict[str, Any]:
    """
    Compare une photo à un ensemble de personnes (tapissage).
    """
    embedding, detection_score = extract_embedding_from_image(image_file)

    if embedding is None:
        raise ValueError("Aucun visage détecté dans l'image fournie.")

    if hasattr(image_file, "seek"):
        image_file.seek(0)

    image_path = _save_temp_image(image_file, "tapissages")

    results: List[BiometricMatch] = []
    invalid_ids: List[str] = []
    best_person: Optional[Person] = None
    best_score = 0.0

    for person_id in lineup_ids:
        try:
            person = Person.objects.get(id=person_id)  # type: ignore[attr-defined]
        except Person.DoesNotExist:
            invalid_ids.append(str(person_id))
            continue

        verified, score = verify_person(embedding, person.id, threshold=0.0)
        results.append(
            BiometricMatch(
                person_id=str(person.id),
                person_name=person.name,
                confidence_score=float(score),
                verified=bool(verified and score >= threshold),
            )
        )

        if score > best_score:
            best_score = float(score)
            best_person = person

    results.sort(key=lambda item: item.confidence_score, reverse=True)

    save_recognition_log(
        embedding=embedding,
        image_path=image_path,
        detected_person=best_person if best_person and best_score >= threshold else None,
        confidence_score=best_score if best_score >= threshold else 0.0,
        threshold_used=threshold,
        processing_time_ms=None,
        created_by=requested_by,
    )

    response: Dict[str, Any] = {
        "mode": "lineup",
        "threshold": threshold,
        "detection_score": detection_score,
        "results": [match.to_dict() for match in results],
        "recognized": best_person is not None and best_score >= threshold,
        "best_score": best_score,
        "image_path": image_path,
        "invalid_ids": invalid_ids,
    }

    if include_embedding:
        response["embedding"] = embedding.tolist()

    return response


def effectuer_recherche_biometrique(
    image_file,
    *,
    mode: str,
    threshold: float,
    top_k: int = 3,
    lineup_ids: Optional[Iterable[uuid.UUID]] = None,
    include_embedding: bool = False,
    requested_by=None,
) -> Dict[str, Any]:
    """
    Point d'entrée principal pour la recherche biométrique.
    """
    if mode == "search":
        return rechercher_par_photo(
            image_file,
            threshold=threshold,
            top_k=top_k,
            include_embedding=include_embedding,
            requested_by=requested_by,
        )

    if mode == "lineup":
        if not lineup_ids:
            raise ValueError("La liste des suspects est requise pour le mode tapissage.")

        resolved_ids = []
        for suspect_id in lineup_ids:
            if isinstance(suspect_id, uuid.UUID):
                resolved_ids.append(suspect_id)
            else:
                try:
                    resolved_ids.append(uuid.UUID(str(suspect_id)))
                except ValueError as exc:
                    raise ValueError(f"Identifiant suspect invalide: {suspect_id}") from exc

        return comparer_tapissage(
            image_file,
            lineup_ids=resolved_ids,
            threshold=threshold,
            include_embedding=include_embedding,
            requested_by=requested_by,
        )

    raise ValueError(f"Mode de recherche inconnu: {mode}")


