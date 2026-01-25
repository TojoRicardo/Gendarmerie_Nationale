"""Reconnaissance faciale ArcFace en temps réel via webcam."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Optional, Tuple

try:  # pragma: no cover - dépend de l'environnement local
    import cv2  # type: ignore
except Exception:  # pragma: no cover - OpenCV peut ne pas être installé
    cv2 = None  # type: ignore

import numpy as np

from intelligence_artificielle.ia_service import (
    FaceRecognitionIAService,
    FaceRecognitionUnavailable,
    FaceMatch,
)

from .exceptions import (
    CameraReadError,
    CameraUnavailableError,
    FaceModelUnavailableError,
    FaceRecognitionError,
)
from .face_utils import FaceEngine, log_event

logger = logging.getLogger(__name__)


@dataclass
class RecognitionEvent:
    """Représente un visage reconnu lors d'une frame."""

    match: FaceMatch
    similarity: float
    bbox: Tuple[int, int, int, int]
    landmarks: List[List[float]]

    def similarity_percent(self) -> float:
        return float(self.similarity) * 100.0


class RealTimeRecognizer:
    """Boucle de reconnaissance faciale en temps réel avec ArcFace."""

    def __init__(
        self,
        *,
        threshold: float = 0.7,
        camera_index: int = 0,
        top_k: int = 3,
        draw_landmarks: bool = True,
        window_name: str = "Reconnaissance faciale ArcFace",
        announce_interval: float = 3.0,
        verbose: bool = True,
        status_callback: Optional[Callable[[str], None]] = None,
    ) -> None:
        self.threshold = float(threshold)
        self.camera_index = camera_index
        self.top_k = top_k
        self.draw_landmarks = draw_landmarks
        self.window_name = window_name
        self.announce_interval = announce_interval
        self.verbose = verbose
        self.status_callback = status_callback

        self.capture: Optional["cv2.VideoCapture"] = None
        self.running = False
        self._last_announcements: Dict[int, float] = {}
        self._last_no_face_message_at: Optional[float] = None

        self.engine = FaceEngine()
        try:
            self.service = FaceRecognitionIAService(
                threshold=self.threshold,
                arcface_service=self.engine.arcface,
            )
        except FaceRecognitionUnavailable as exc:
            raise FaceModelUnavailableError(str(exc)) from exc

        if draw_landmarks and cv2 is None:
            raise ImportError(
                "opencv-python est requis pour afficher les repères du visage."
            )

    # ------------------------------------------------------------------
    # Gestion webcam
    # ------------------------------------------------------------------
    def open_camera(self) -> None:
        if cv2 is None:  # pragma: no cover - dépend de l'installation locale
            raise ImportError(
                "opencv-python n'est pas installé. Installez-le pour utiliser la webcam."
            )

        capture = cv2.VideoCapture(self.camera_index)  # type: ignore[attr-defined]
        if not capture or not capture.isOpened():
            raise CameraUnavailableError(
                f"Impossible d'accéder à la caméra (index={self.camera_index})."
            )

        self.capture = capture
        log_event(f"Webcam ouverte (index={self.camera_index}).")

    def close_camera(self) -> None:
        if self.capture is not None:
            try:
                self.capture.release()
            except Exception:  # pragma: no cover - protection runtime
                pass
            self.capture = None

        if cv2 is not None:
            try:
                cv2.destroyAllWindows()
            except Exception:  # pragma: no cover - protection runtime
                pass

        log_event("Webcam fermée.")

    def _read_frame(self) -> np.ndarray:
        if self.capture is None:
            raise CameraUnavailableError("La caméra n'est pas initialisée.")

        ok, frame = self.capture.read()
        if not ok or frame is None:
            raise CameraReadError("Impossible de lire une frame depuis la webcam.")

        return frame

    # ------------------------------------------------------------------
    # Analyse des frames
    # ------------------------------------------------------------------
    def process_frame(
        self,
        frame: np.ndarray,
    ) -> Tuple[np.ndarray, List[RecognitionEvent]]:
        """Analyse une frame et retourne l'image annotée + les correspondances."""

        try:
            faces = self.engine.arcface.encode_faces(image=frame)  # type: ignore[arg-type]
        except ValueError as exc:
            raise FaceRecognitionError(str(exc)) from exc
        except TypeError as exc:
            raise FaceRecognitionError(str(exc)) from exc

        if not faces:
            return frame, []

        annotated = frame.copy()
        events: List[RecognitionEvent] = []

        for face in faces:
            matches: List[FaceMatch] = self.service.score_embeddings(
                face.embedding,
                top_k=self.top_k,
                threshold=self.threshold,
                include_all=True,
            )

            best_match = matches[0] if matches else None
            if best_match and best_match.similarity >= self.threshold:
                event = RecognitionEvent(
                    match=best_match,
                    similarity=best_match.similarity,
                    bbox=tuple(int(x) for x in face.bbox),
                    landmarks=self.engine.serialize_landmarks(face.landmarks),
                )
                events.append(event)
                self._announce(event)

            if self.draw_landmarks:
                annotated = self.engine.draw_face(annotated, face)

        return annotated if self.draw_landmarks else frame, events

    def _announce(self, event: RecognitionEvent) -> None:
        criminel_id = getattr(event.match.criminel, "id", None)
        now = time.time()
        last_time = self._last_announcements.get(criminel_id or -1)

        if last_time is not None and (now - last_time) < self.announce_interval:
            return

        self._last_announcements[criminel_id or -1] = now

        message = (
            f"Match: {event.match.criminel.nom} {event.match.criminel.prenom} "
            f"({event.similarity_percent():.2f}%)"
        )
        log_event(message)

        if self.verbose:
            print(message)

        if self.status_callback:
            self.status_callback(message)

    def _notify_status(self, message: str, *, throttle: float = 1.5) -> None:
        """Affiche un message d'état sans spammer la console."""
        now = time.time()
        if (
            self._last_no_face_message_at is not None
            and (now - self._last_no_face_message_at) < throttle
        ):
            return

        self._last_no_face_message_at = now

        if self.verbose:
            print(message)

        if self.status_callback:
            self.status_callback(message)

    # ------------------------------------------------------------------
    # Boucle principale
    # ------------------------------------------------------------------
    def start(
        self,
        *,
        display: bool = True,
        stop_on_key: bool = True,
        stop_key: str = "q",
    ) -> None:
        """Démarre la boucle vidéo (bloquante)."""

        if self.running:
            raise RuntimeError("La reconnaissance temps réel est déjà en cours.")

        self.open_camera()
        self.running = True

        try:
            while self.running:
                frame = self._read_frame()
                annotated, events = self.process_frame(frame)

                if not events:
                    self._notify_status("Aucun visage détecté.")

                if display and cv2 is not None:
                    cv2.imshow(self.window_name, annotated)  # type: ignore[attr-defined]
                    if stop_on_key:
                        key = cv2.waitKey(1) & 0xFF  # type: ignore[attr-defined]
                        if key == ord(stop_key):
                            break
        except KeyboardInterrupt:  # pragma: no cover - interaction utilisateur
            self._notify_status("Arrêt demandé par l'utilisateur.")
        finally:
            self.stop()

    def stop(self) -> None:
        """Arrête la boucle et libère la caméra."""
        self.running = False
        self.close_camera()

    # ------------------------------------------------------------------
    # Utilitaires
    # ------------------------------------------------------------------
    def iter_frames(self) -> Iterable[Tuple[np.ndarray, List[RecognitionEvent]]]:
        """Génère les frames lues et leurs résultats (mode sans fenêtre)."""

        if self.capture is None:
            self.open_camera()

        while True:
            frame = self._read_frame()
            yield self.process_frame(frame)

    def recognize_once(self) -> List[RecognitionEvent]:
        """Capture une seule frame et retourne les correspondances."""
        frame = self._read_frame()
        _, events = self.process_frame(frame)
        return events


