"""Services haut niveau pour la reconnaissance faciale IA avec ArcFace.

Ce module orchestre l'intégralité du pipeline demandé :

1. **Détection** : extraction des visages via InsightFace / ArcFace.
2. **Encodage** : génération des vecteurs normalisés (embeddings) pour chaque visage.
3. **Stockage** : persistance optionnelle des embeddings dans PostgreSQL liés aux fiches criminelles.
4. **Comparaison** : calcul des similarités entre un embedding requête et l'ensemble de la base.

Il expose une API Python unique utilisée par les vues Django Rest Framework côté IA.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
from django.db import transaction
from django.utils import timezone
from django.core.files.base import File
from django.db.utils import OperationalError, ProgrammingError

from biometrie.arcface_service import (
    ArcFaceService,
    FaceEncodingResult,
    get_shared_arcface_error,
    get_shared_arcface_service,
)
from biometrie.models import Biometrie
from criminel.models import CriminalFicheCriminelle

from .models import IAReconnaissanceFaciale, IAFaceEmbedding

logger = logging.getLogger(__name__)


class FaceRecognitionUnavailable(RuntimeError):
    """Erreur levée lorsque le moteur ArcFace n'est pas disponible."""


@dataclass
class FaceMatch:
    """Structure de données pour encapsuler un résultat de comparaison."""

    criminel: CriminalFicheCriminelle
    similarity: float
    distance: float
    source: str
    embedding_id: Optional[int]
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        photo_url = None
        if getattr(self.criminel, "photo", None):
            try:
                photo_url = self.criminel.photo.url  # type: ignore[attr-defined]
            except ValueError:
                photo_url = None

        return {
            "criminel_id": self.criminel.id,
            "numero_fiche": self.metadata.get("numero_fiche", self.criminel.numero_fiche),
            "nom": self.criminel.nom,
            "prenom": self.criminel.prenom,
            "similarite": float(self.similarity),
            "confidence": float(self.similarity),
            "confidence_percent": float(self.similarity) * 100.0,
            "distance": float(self.distance),
            "source": self.source,
            "embedding_id": self.embedding_id,
            "photo_url": photo_url,
            "metadata": self.metadata,
        }


class FaceRecognitionIAService:
    """Service centralisé pour la reconnaissance faciale IA.

    Parameters
    ----------
    threshold : float
        Seuil minimal de similarité (cosinus) pour considérer une correspondance valide.
    arcface_service : ArcFaceService, optional
        Instance partagée du moteur ArcFace (permet d'éviter de recharger le modèle).
    """

    def __init__(
        self,
        *,
        threshold: float = 0.7,
        arcface_service: Optional[ArcFaceService] = None,
    ) -> None:
        self.threshold = threshold
        if arcface_service is not None:
            self.arcface = arcface_service
        else:
            try:
                self.arcface = get_shared_arcface_service()
            except Exception as exc:  # pragma: no cover - protection runtime
                reason = str(exc) or "ArcFace n'est pas disponible. Vérifiez l'installation InsightFace."
                logger.error("ArcFace indisponible lors de l'initialisation du service IA: %s", reason)
                raise FaceRecognitionUnavailable(reason) from exc

        if not self.arcface.available:
            reason = (
                self.arcface.unavailable_reason
                or str(get_shared_arcface_error() or "")
                or "ArcFace n'est pas disponible. Vérifiez l'installation InsightFace."
            )
            logger.error("Le service ArcFace n'a pas pu être initialisé: %s", reason)
            raise FaceRecognitionUnavailable(reason)

    # Pipelines publics
  
    def search_by_photo(
        self,
        *,
        image: Any,
        criminel: Optional[CriminalFicheCriminelle] = None,
        criminel_id: Optional[int] = None,
        save_embedding: bool = False,
        threshold: Optional[float] = None,
        top_k: int = 5,
        utilisateur=None,
        metadata: Optional[Dict[str, Any]] = None,
        persist_result: bool = True,
    ) -> Dict[str, Any]:
        """Recherche d'un individu par photo unique (tapissage).

        Cette méthode applique le pipeline complet : détection -> encodage -> comparaison.
        L'embedding peut être sauvegardé et une analyse IA est loggée si demandé.
        """

        started_at = time.monotonic()
        result_metadata = metadata or {}

        criminel_obj = criminel
        if criminel_obj is None and criminel_id is not None:
            criminel_obj = CriminalFicheCriminelle.objects.filter(id=criminel_id).first()

        try:
            faces: List[FaceEncodingResult] = self.arcface.encode_faces(image=image, limit=1)
        except RuntimeError as exc:
            logger.error("ArcFace indisponible pendant la recherche par photo: %s", exc)
            return {
                "success": False,
                "message": "🚨 Service de reconnaissance faciale temporairement indisponible. Veuillez réessayer ou contacter l’administrateur IA.",
                "error": str(exc),
                "alert_level": "Critical",
                "details": "Impossible de charger InsightFace (modèle non trouvé).",
                "error_code": "ARCFACE_UNAVAILABLE",
                "duration_ms": int((time.monotonic() - started_at) * 1000),
                "faces_detected": 0,
            }
        except ValueError as exc:
            logger.warning("Image invalide fournie pour la reconnaissance faciale: %s", exc)
            return {
                "success": False,
                "message": "Image invalide. Le fichier transmis n'est pas reconnu comme une photo exploitable.",
                "error": str(exc),
                "alert_level": "Warning",
                "details": "Le fichier transmis n'est pas une image faciale lisible par ArcFace.",
                "error_code": "INVALID_IMAGE",
                "duration_ms": int((time.monotonic() - started_at) * 1000),
                "faces_detected": 0,
            }
        except TypeError as exc:
            logger.warning("Format d'image non supporté pour ArcFace: %s", exc)
            return {
                "success": False,
                "message": "Image invalide. Le format transmis n'est pas supporté pour la reconnaissance faciale.",
                "error": str(exc),
                "alert_level": "Warning",
                "details": "Le format du fichier n'est pas supporté pour la reconnaissance faciale.",
                "error_code": "INVALID_IMAGE",
                "duration_ms": int((time.monotonic() - started_at) * 1000),
                "faces_detected": 0,
            }
        except Exception as exc:  # pragma: no cover - protection runtime
            logger.exception("Erreur inattendue ArcFace lors de la recherche par photo")
            return {
                "success": False,
                "message": "Incident lors de l'analyse de l'image. Veuillez réessayer dans quelques instants.",
                "error": str(exc),
                "alert_level": "Warning",
                "details": "Une erreur inattendue est survenue pendant l'analyse ArcFace.",
                "error_code": "PROCESSING_ERROR",
                "duration_ms": int((time.monotonic() - started_at) * 1000),
                "faces_detected": 0,
            }

        if not faces:
            return {
                "success": False,
                "message": "Aucun visage valide détecté dans l'image. Veuillez utiliser une photo claire et bien cadrée.",
                "details": "Assurez-vous que le visage est bien visible, net et non obstrué.",
                "alert_level": "Warning",
                "error": "Aucun visage détecté sur la photo fournie.",
                "error_code": "NO_FACE_DETECTED",
                "duration_ms": int((time.monotonic() - started_at) * 1000),
                "faces_detected": 0,
            }

        query_face = faces[0]
        query_embedding = query_face.embedding
        serialized_query = ArcFaceService.serialize_embedding(query_embedding)

        # 2) Comparaison avec toutes les fiches
        comparisons = self.score_embeddings(
            query_embedding,
            top_k=top_k,
            threshold=threshold,
            include_all=True,
        )
        unique_matches: List[FaceMatch] = []
        seen_ids = set()
        for match in comparisons:
            criminel_id = getattr(match.criminel, "id", None)
            if criminel_id in seen_ids:
                continue
            seen_ids.add(criminel_id)
            unique_matches.append(match)

        matches_above_threshold = [
            match for match in unique_matches if match.similarity >= (threshold or self.threshold)
        ]
        success = bool(matches_above_threshold)
        best_match = matches_above_threshold[0] if success else (unique_matches[0] if unique_matches else None)

        saved_embedding_id: Optional[int] = None
        if save_embedding and criminel_obj is not None:
            saved_embedding = self._store_embedding(
                criminel=criminel_obj,
                embedding=query_embedding,
                source="photo",
                metadata=result_metadata,
                image=image if isinstance(image, File) else None,
            )
            saved_embedding_id = saved_embedding.id if saved_embedding else None

        # 4) Journalisation dans IAReconnaissanceFaciale
        analyse_instance = None
        if persist_result:
            analyse_instance = self._log_analyse_result(
                image=image if isinstance(image, File) else None,
                best_match=best_match,
                utilisateur=utilisateur,
                confidence=query_face.confidence,
            )

        duration_ms = int((time.monotonic() - started_at) * 1000)

        matches_payload = [match.to_dict() for match in matches_above_threshold[:top_k]]
        candidates_payload = [match.to_dict() for match in unique_matches[:top_k]]

        message = (
            "Correspondance trouvée"
            if success
            else "Aucune correspondance faciale détectée dans les enregistrements existants."
        )
        alert_level = "Confirmation" if success else "Information"

        return {
            "success": success,
            "embedding_saved_id": saved_embedding_id,
            "best_match": matches_payload[0] if matches_payload else (candidates_payload[0] if candidates_payload else None),
            "matches": matches_payload,
            "candidates": candidates_payload if not success else matches_payload,
            "faces_detected": 1,
            "total_found": len(matches_payload),
            "duration_ms": duration_ms,
            "arcface_confidence": float(query_face.confidence),
            "analyse_id": analyse_instance.id if analyse_instance else None,
            "threshold_used": threshold or self.threshold,
            "query_embedding": serialized_query,
            "error_code": None if success else "NO_MATCH",
            "status": "match" if success else "no_match",
            "message": message,
            "alert_level": alert_level,
        }

    def process_stream_frame(
        self,
        *,
        frame: Any,
        threshold: Optional[float] = None,
        top_k: int = 3,
    ) -> Dict[str, Any]:
        """Analyse un frame vidéo en temps réel.

        Chaque visage détecté est encodé puis comparé à l'ensemble des embeddings connus.
        Le service retourne, par visage, la meilleure correspondance ainsi que le détail des scores.
        """

        started_at = time.monotonic()

        faces = self.arcface.encode_faces(image=frame)
        if not faces:
            return {
                "success": False,
                "faces": [],
                "faces_detected": 0,
                "duration_ms": int((time.monotonic() - started_at) * 1000),
                "message": "Aucun visage détecté sur le frame.",
            }

        frame_results = []
        threshold_value = threshold or self.threshold

        for face in faces:
            matches = self.score_embeddings(
                face.embedding,
                top_k=top_k,
                threshold=threshold_value,
                include_all=True,
            )

            best_match = matches[0] if matches else None
            frame_results.append(
                {
                    "bbox": face.bbox,
                    "confidence": float(face.confidence),
                    "matches": [match.to_dict() for match in matches[:top_k]],
                    "best_match": best_match.to_dict() if best_match else None,
                    "recognized": bool(
                        best_match and best_match.similarity >= threshold_value
                    ),
                    "threshold_used": threshold_value,
                }
            )

        duration_ms = int((time.monotonic() - started_at) * 1000)

        return {
            "success": True,
            "faces_detected": len(frame_results),
            "faces": frame_results,
            "duration_ms": duration_ms,
            "threshold": threshold_value,
        }

    # Calculs & utilitaires internes
    def score_embeddings(
        self,
        query_embedding: np.ndarray,
        *,
        top_k: Optional[int] = None,
        threshold: Optional[float] = None,
        include_all: bool = False,
    ) -> List[FaceMatch]:
        """Calcule la similarité cosinus entre la requête et tous les embeddings connus."""

        stored_embeddings = list(self._iter_known_embeddings())
        if not stored_embeddings:
            return []

        threshold_value = threshold if threshold is not None else self.threshold

        # Normaliser une seule fois l'embedding requête
        query_vector = np.asarray(query_embedding, dtype=np.float32)
        query_norm = np.linalg.norm(query_vector)
        if query_norm > 0:
            query_vector = query_vector / query_norm
        expected_dim = query_vector.shape[0]

        candidate_vectors: List[np.ndarray] = []
        candidate_meta: List[Tuple[Optional[CriminalFicheCriminelle], str, Optional[int], Dict[str, Any]]] = []

        for candidate_embedding, criminel, source, embedding_id, metadata in stored_embeddings:
            vector = np.asarray(candidate_embedding, dtype=np.float32).reshape(-1)

            if vector.size != expected_dim:
                logger.debug(
                    "Embedding ignoré (dimension %s != %s) pour criminel #%s",
                    vector.size,
                    expected_dim,
                    getattr(criminel, "id", None),
                )
                continue

            if not np.isfinite(vector).all():
                logger.debug(
                    "Embedding contenant des valeurs non finies ignoré pour criminel #%s",
                    getattr(criminel, "id", None),
                )
                continue

            candidate_vectors.append(vector)
            candidate_meta.append((criminel, source, embedding_id, metadata))

        if not candidate_vectors:
            return []

        matrix = np.stack(candidate_vectors, axis=0)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        np.divide(matrix, norms, out=matrix, where=norms > 0)

        similarities = matrix @ query_vector

        matches: List[FaceMatch] = []
        for similarity, (criminel, source, embedding_id, metadata) in zip(similarities, candidate_meta):
            sim_float = float(similarity)

            criminel_obj = criminel
            if criminel_obj is None:
                criminel_id = metadata.get("criminel_id")
                if criminel_id is not None:
                    criminel_obj = CriminalFicheCriminelle.objects.filter(id=criminel_id).first()
                if criminel_obj is None:
                    logger.debug(
                        "Correspondance ignorée faute de criminel lié (embedding_id=%s, source=%s)",
                        embedding_id,
                        source,
                    )
                    continue

            match = FaceMatch(
                criminel=criminel_obj,
                similarity=sim_float,
                distance=float(1.0 - sim_float),
                source=source,
                embedding_id=embedding_id,
                metadata=metadata,
            )
            matches.append(match)

        matches.sort(key=lambda item: item.similarity, reverse=True)

        if include_all:
            if top_k is not None:
                return matches[:top_k]
            return matches

        filtered = [match for match in matches if match.similarity >= threshold_value]
        if filtered:
            return filtered[:top_k] if top_k is not None else filtered

        return matches[:top_k] if top_k is not None else matches

    def _iter_known_embeddings(
        self,
    ) -> Iterable[Tuple[np.ndarray, CriminalFicheCriminelle, str, Optional[int], Dict[str, Any]]]:
        """Rassemble les embeddings IA + biométrie pour la comparaison."""

        # Embeddings IA enregistrés explicitement
        try:
            ia_embeddings = (
                IAFaceEmbedding.objects.select_related("criminel")
                .filter(actif=True)
                .iterator()
            )
        except (ProgrammingError, OperationalError) as exc:
            logger.warning(
                "Table ia_face_embedding indisponible (migration non appliquée ?): %s",
                exc,
            )
            ia_embeddings = []

        for entry in ia_embeddings:
            if not entry.embedding_vector:
                continue

            try:
                vector = self._deserialize_embedding(entry.embedding_vector)
            except (TypeError, ValueError) as exc:
                logger.debug("Embedding IA invalide (#%s): %s", entry.pk, exc)
                continue

            metadata = {
                "source_type": entry.source_type,
                "numero_fiche": entry.criminel.numero_fiche,
                "cree_le": entry.cree_le.isoformat(),
                "criminel_id": entry.criminel_id,
            }

            yield vector, entry.criminel, "ia_face_embedding", entry.pk, metadata

        for entry in Biometrie.objects.select_related("criminel").iterator():
            raw_embedding = entry.encodage_facial
            if not raw_embedding:
                continue

            try:
                vector = self._deserialize_embedding(raw_embedding)
            except (TypeError, ValueError) as exc:
                logger.debug("Embedding biométrie invalide (#%s): %s", entry.pk, exc)
                continue

            photo_path = None
            photo_url = None
            if entry.photo:
                photo_path = entry.photo.name
                try:
                    photo_url = entry.photo.url  # type: ignore[attr-defined]
                except Exception:
                    photo_url = None

            metadata = {
                "source_type": "biometrie",
                "numero_fiche": entry.criminel.numero_fiche,
                "photo_path": photo_path,
                "photo_url": photo_url,
                "criminel_id": entry.criminel_id,
            }

            yield vector, entry.criminel, "biometrie", entry.pk, metadata

    def _deserialize_embedding(self, data: Sequence[float]) -> np.ndarray:
        array = np.asarray(data, dtype=np.float32)
        norm = np.linalg.norm(array)
        if norm > 0:
            array = array / norm
        return array

    @transaction.atomic
    def _store_embedding(
        self,
        *,
        criminel: CriminalFicheCriminelle,
        embedding: np.ndarray,
        source: str,
        metadata: Optional[Dict[str, Any]] = None,
        image: Optional[File] = None,
    ) -> Optional[IAFaceEmbedding]:
        """Persist l'embedding ArcFace dans PostgreSQL."""

        embedding_list = ArcFaceService.serialize_embedding(embedding)

        if image is not None and hasattr(image, "seek"):
            image.seek(0)

        instance = IAFaceEmbedding.objects.create(
            criminel=criminel,
            embedding_vector=embedding_list,
            source_type=source,
            image_capture=image,
            metadata=metadata or {},
        )

        logger.info(
            "Embedding IA sauvegardé pour %s (id=%s, source=%s)",
            criminel.numero_fiche,
            instance.pk,
            source,
        )
        return instance

    def _log_analyse_result(
        self,
        *,
        image: Optional[File],
        best_match: Optional[FaceMatch],
        utilisateur=None,
        confidence: float = 0.0,
    ) -> Optional[IAReconnaissanceFaciale]:
        """Crée un enregistrement IAReconnaissanceFaciale pour l'audit."""

        if image is None:
            return None

        if hasattr(image, "seek"):
            image.seek(0)

        score_percent = (
            float(best_match.similarity) * 100 if best_match else float(confidence) * 100
        )

        statut = "aucune_correspondance"
        criminel_identifie = None

        if best_match and best_match.similarity >= self.threshold:
            statut = "correspondance_trouvee"
            criminel_identifie = best_match.criminel

        analyse = IAReconnaissanceFaciale.objects.create(
            image_analysee=image,
            criminel_identifie=criminel_identifie,
            score_confiance=score_percent,
            analyse_par=utilisateur,
            statut=statut,
        )

        return analyse

# Fonctions utilitaires / exemples d'utilisation

def example_compare_embeddings(embedding_a: Sequence[float], embedding_b: Sequence[float]) -> Dict[str, Any]:
    """Démontre le calcul de similarité et la décision de correspondance."""

    vec_a = np.asarray(embedding_a, dtype=np.float32)
    vec_b = np.asarray(embedding_b, dtype=np.float32)

    similarity = ArcFaceService.compare_embeddings(vec_a, vec_b)
    same_person = ArcFaceService.are_same_person(vec_a, vec_b)

    return {
        "similarite": float(similarity),
        "distance": float(1.0 - similarity),
        "meme_personne": bool(same_person),
    }


def example_identification_flow(embedding_query: Sequence[float]) -> Dict[str, Any]:
    """Illustre comment identifier un individu à partir d'un embedding existant."""

    try:
        service = FaceRecognitionIAService()
    except FaceRecognitionUnavailable as exc:
        return {"success": False, "message": str(exc)}

    matches = service.score_embeddings(np.asarray(embedding_query, dtype=np.float32), top_k=3)

    return {
        "success": True,
        "matches": [match.to_dict() for match in matches],
    }


__all__ = [
    "FaceRecognitionIAService",
    "FaceRecognitionUnavailable",
    "FaceMatch",
    "example_compare_embeddings",
    "example_identification_flow",
]

