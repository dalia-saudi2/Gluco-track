"""Load LR .pkl artifacts once at startup (joblib.load, module-level cache)."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import joblib
except ImportError:  # pragma: no cover
    joblib = None  # type: ignore

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(
    os.environ.get(
        "DIABETES_LR_MODELS_DIR",
        Path(__file__).resolve().parent / "artifacts",
    )
)

_BUNDLES: Dict[str, Dict[str, Any]] = {}
_LOAD_ERRORS: Dict[str, str] = {}


def _bundle_paths(mode: str) -> tuple[Path, Path, Path, Path]:
    return (
        ARTIFACTS_DIR / f"metadata_{mode}.json",
        ARTIFACTS_DIR / f"lr_clf_{mode}.pkl",
        ARTIFACTS_DIR / f"lr_reg_{mode}.pkl",
        ARTIFACTS_DIR / f"lr_reg_scaler_{mode}.pkl",
    )


def load_bundle(mode: str, *, force: bool = False) -> Optional[Dict[str, Any]]:
    """Load and cache one mode bundle (clinical | lifestyle)."""
    if not force and mode in _BUNDLES:
        return _BUNDLES[mode]

    if joblib is None:
        _LOAD_ERRORS[mode] = "joblib is not installed"
        return None

    meta_path, clf_path, reg_path, scaler_path = _bundle_paths(mode)
    missing = [p.name for p in (meta_path, clf_path, reg_path, scaler_path) if not p.is_file()]
    if missing:
        _LOAD_ERRORS[mode] = f"missing artifacts: {', '.join(missing)}"
        logger.warning("Diabetes LR bundle %s unavailable: %s", mode, _LOAD_ERRORS[mode])
        return None

    try:
        bundle = {
            "metadata": json.loads(meta_path.read_text(encoding="utf-8")),
            "clf": joblib.load(clf_path),
            "reg": joblib.load(reg_path),
            "reg_scaler": joblib.load(scaler_path),
        }
        _BUNDLES[mode] = bundle
        _LOAD_ERRORS.pop(mode, None)
        logger.info(
            "Loaded diabetes LR bundle %s (%s features) from %s",
            mode,
            bundle["metadata"].get("n_features"),
            ARTIFACTS_DIR,
        )
        return bundle
    except Exception as exc:  # pragma: no cover
        _LOAD_ERRORS[mode] = str(exc)
        logger.exception("Failed loading diabetes LR bundle %s", mode)
        return None


def warmup_models() -> None:
    """Eager-load both bundles (call from FastAPI startup)."""
    for mode in ("clinical", "lifestyle"):
        load_bundle(mode)


def get_load_errors() -> Dict[str, str]:
    return dict(_LOAD_ERRORS)
