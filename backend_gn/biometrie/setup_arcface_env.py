"""Script de vérification et d'installation du modèle ArcFace pour SGIC."""

from __future__ import annotations

import importlib
import os
import sys
import traceback
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_NAME = "buffalo_l"


REQUIRED_MODULES: Sequence[Tuple[str, str]] = (
    ("insightface", "insightface"),
    ("onnx", "onnx"),
    ("onnxruntime", "onnxruntime"),
    ("numpy", "numpy"),
    ("pillow", "PIL"),
    ("opencv-python-headless", "cv2"),
    ("albumentations", "albumentations"),
    ("tqdm", "tqdm"),
    ("matplotlib", "matplotlib"),
    ("scikit-learn", "sklearn"),
    ("scikit-image", "skimage"),
    ("requests", "requests"),
)


def _normalize_path(path: Path) -> str:
    return str(path.resolve())


def ensure_scripts_path() -> None:
    """Ajoute le dossier Scripts Python de l'environnement courant au PATH utilisateur."""

    scripts_candidates: List[Path] = []
    scripts_candidates.append(Path(sys.executable).resolve().parent)
    scripts_candidates.append(PROJECT_ROOT / "venv" / "Scripts")
    scripts_candidates.append(Path(sys.base_prefix) / "Scripts")

    existing_entries = {
        Path(entry).resolve()
        for entry in os.environ.get("PATH", "").split(os.pathsep)
        if entry
    }

    to_add: List[Path] = [
        candidate
        for candidate in scripts_candidates
        if candidate.exists() and candidate.resolve() not in existing_entries
    ]

    if not to_add:
        print("Dossier Scripts déjà présent dans le PATH.")
        return

    added_strings = [_normalize_path(path) for path in to_add]

    try:
        if os.name == "nt":
            import winreg  # type: ignore

            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                "Environment",
                0,
                winreg.KEY_READ | winreg.KEY_SET_VALUE,
            ) as key:
                try:
                    current_value, _ = winreg.QueryValueEx(key, "PATH")
                except FileNotFoundError:
                    current_value = ""

                current_parts = [entry for entry in current_value.split(os.pathsep) if entry]
                normalized_existing = {
                    Path(entry).resolve()
                    for entry in current_parts
                    if entry
                }

                for path in to_add:
                    if path.resolve() not in normalized_existing:
                        current_parts.append(_normalize_path(path))

                new_value = os.pathsep.join(current_parts)
                winreg.SetValueEx(key, "PATH", 0, winreg.REG_EXPAND_SZ, new_value)
                os.environ["PATH"] = new_value
                print("Ajout du dossier Scripts au PATH utilisateur :", ", ".join(added_strings))
        else:
            os.environ["PATH"] = os.environ.get("PATH", "") + os.pathsep + os.pathsep.join(added_strings)
            print("PATH mis à jour pour cette session. Pensez à le rendre permanent sur votre OS.")
    except Exception as exc:  # pragma: no cover - dépend du système
        print(
            "Impossible de mettre à jour automatiquement le PATH. Ajoutez manuellement :",
            ", ".join(added_strings),
        )
        print(f"   Détail : {exc}")


def check_modules() -> Tuple[List[Tuple[str, str, str]], List[Tuple[str, str, str]]]:
    """Vérifie l'import de chaque module requis."""

    successes: List[Tuple[str, str, str]] = []
    failures: List[Tuple[str, str, str]] = []

    for package_name, module_name in REQUIRED_MODULES:
        try:
            module = importlib.import_module(module_name)
            version = getattr(module, "__version__", "").strip()
            if not version and module_name == "PIL":
                from PIL import __version__ as pil_version

                version = pil_version
            if not version and module_name == "cv2":
                version = getattr(module, "__version__", "")
            if not version:
                version = "version inconnue"
            successes.append((package_name, module_name, version))
        except Exception as exc:  # pragma: no cover - dépend du runtime
            failures.append((package_name, module_name, str(exc)))

    return successes, failures


def ensure_arcface_model(model_name: str = DEFAULT_MODEL_NAME) -> Path:
    """Télécharge le modèle ArcFace s'il est absent."""

    from insightface.app import FaceAnalysis

    model_root = PROJECT_ROOT / "biometrie" / "models_arcface"
    model_root.mkdir(parents=True, exist_ok=True)

    analysis = FaceAnalysis(name=model_name, root=str(model_root))
    analysis.prepare(ctx_id=0)  # ctx_id=0 -> CPU si GPU indisponible

    target_dir = model_root / model_name
    if not any(target_dir.glob("**/*")):
        raise RuntimeError("Téléchargement du modèle ArcFace non confirmé.")

    return target_dir


def format_successes(successes: Iterable[Tuple[str, str, str]]) -> str:
    lines = ["Modules disponibles :"]
    for package, module_name, version in successes:
        lines.append(f"  - {package} (module {module_name}) - {version}")
    return "\n".join(lines)


def format_failures(failures: Iterable[Tuple[str, str, str]]) -> str:
    lines = ["Modules manquants ou en erreur :"]
    for package, module_name, error in failures:
        lines.append(f"  - {package} (module {module_name}) - {error}")
    return "\n".join(lines)


def main() -> None:
    print("\n=== Vérification de l'environnement ArcFace (SGIC) ===\n")

    ensure_scripts_path()

    successes, failures = check_modules()

    if failures:
        print(format_failures(failures))
        print("\n[ERREUR] Des dépendances ArcFace sont manquantes. Installez-les puis relancez le script.")
        sys.exit(1)

    print(format_successes(successes))

    try:
        model_dir = ensure_arcface_model()
        print(f"\n[OK] Modèle ArcFace disponible dans : {model_dir}")
    except Exception as exc:
        print("\n[ERREUR] Échec lors de la préparation du modèle ArcFace :", exc)
        traceback.print_exc(limit=1)
        sys.exit(1)

    print("\n[OK] ArcFace installé avec succès et prêt à encoder les visages.")
    print("[OK] Tous les modules requis sont disponibles.")


if __name__ == "__main__":
    main()


