"""
XGBoost classifier for post-meal glucose direction.

Primary runtime path now prefers the real-patient CSV optimized bundle
(`glucose_direction_from_csv_optimized.joblib`) when available.
If unavailable/incompatible, it falls back to the compact model / heuristic.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import joblib
except ImportError:
    joblib = None  # type: ignore

_MODEL = None
_MODEL_PATH = Path(__file__).resolve().parent / "ml_models" / "glucose_direction.joblib"
_REAL_BUNDLE = None
_REAL_BUNDLE_PATH = Path(__file__).resolve().parent / "ml_models" / "glucose_direction_from_csv_optimized.joblib"

DEFAULT_ICR = 12.0
DEFAULT_ISF = 50.0


def _load_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    if joblib is None or not _MODEL_PATH.exists():
        _MODEL = None
        return None
    _MODEL = joblib.load(_MODEL_PATH)
    return _MODEL


def _load_real_bundle():
    # Bypassed: Real-patient bundle features are pre-scaled, leading to scaling mismatches
    # with unscaled runtime values. We fall back to the compact runtime model which is trained on raw values.
    return None


def build_feature_row(
    carbs_g: float,
    current_glucose_mg_dl: float,
    insulin_units: float,
    meal_hour: int,
    glucose_readings_mg_dl: List[float],
    icr_g_per_unit: float,
    isf_mg_dl_per_unit: float,
) -> np.ndarray:
    h = int(meal_hour) % 24
    sin_h = float(np.sin(2 * np.pi * h / 24))
    cos_h = float(np.cos(2 * np.pi * h / 24))
    readings = glucose_readings_mg_dl or []
    if len(readings) >= 2:
        trend_slope = float((readings[-1] - readings[0]) / max(len(readings) - 1, 1))
        trend_mean_delta = float(np.mean(readings)) - float(current_glucose_mg_dl)
    else:
        trend_slope = 0.0
        trend_mean_delta = 0.0

    icr = float(icr_g_per_unit) if icr_g_per_unit else DEFAULT_ICR
    isf = float(isf_mg_dl_per_unit) if isf_mg_dl_per_unit else DEFAULT_ISF

    return np.array(
        [
            [
                float(carbs_g),
                float(current_glucose_mg_dl),
                float(insulin_units),
                sin_h,
                cos_h,
                trend_slope,
                trend_mean_delta,
                icr,
                isf,
            ]
        ],
        dtype=np.float32,
    )


def predict_direction_proba(
    carbs_g: float,
    current_glucose_mg_dl: float,
    insulin_units: float,
    meal_hour: int,
    glucose_readings_mg_dl: List[float],
    icr_g_per_unit: float,
    isf_mg_dl_per_unit: float,
    patient_id: Optional[int] = None,
) -> Tuple[str, float, Dict[str, Any]]:
    """
    Returns direction label, P(up), and feature dict for transparency.
    Fallback heuristic if model file missing.
    """
    X = build_feature_row(
        carbs_g,
        current_glucose_mg_dl,
        insulin_units,
        meal_hour,
        glucose_readings_mg_dl,
        icr_g_per_unit,
        isf_mg_dl_per_unit,
    )
    feat_dict = {
        "carbs_g": float(X[0, 0]),
        "current_glucose_mg_dl": float(X[0, 1]),
        "insulin_units": float(X[0, 2]),
        "meal_hour_sin": float(X[0, 3]),
        "meal_hour_cos": float(X[0, 4]),
        "trend_slope": float(X[0, 5]),
        "trend_mean_delta": float(X[0, 6]),
        "icr_g_per_unit": float(X[0, 7]),
        "isf_mg_dl_per_unit": float(X[0, 8]),
    }

    # 1) Prefer real-patient optimized model bundle if present.
    bundle = _load_real_bundle()
    if bundle is not None:
        try:
            model = bundle["model"]
            columns = list(bundle.get("columns") or [])
            medians = dict(bundle.get("median_imputer") or {})
            threshold = float(bundle.get("threshold", 0.5))

            # Start from training medians and overwrite with available runtime signals.
            row = {c: float(medians.get(c, 0.0)) for c in columns}
            h = int(meal_hour) % 24
            sin_h = float(np.sin(2 * np.pi * h / 24))
            cos_h = float(np.cos(2 * np.pi * h / 24))
            readings = glucose_readings_mg_dl or []
            trend_slope = float((readings[-1] - readings[0]) / max(len(readings) - 1, 1)) if len(readings) >= 2 else 0.0
            trend_mean_delta = float(np.mean(readings)) - float(current_glucose_mg_dl) if len(readings) >= 2 else 0.0

            # Runtime mappings (best-effort) to the real-patient feature schema.
            mappings = {
                "glucose": float(current_glucose_mg_dl),
                "carbs": float(carbs_g),
                "bolus_dose": float(insulin_units),
                "hour_sin": sin_h,
                "hour_cos": cos_h,
                "glucose_roc_5": trend_slope,
                "glucose_roc_15": trend_slope,
                "glucose_roc_30": trend_slope,
                "glucose_delta_15": trend_mean_delta,
                "glucose_delta_30": trend_mean_delta,
                "glucose_delta_60": trend_mean_delta,
                "glucose_mean_30": float(current_glucose_mg_dl) + trend_mean_delta,
                "glucose_mean_60": float(current_glucose_mg_dl) + trend_mean_delta,
                "glucose_std_30": float(np.std(readings)) if len(readings) > 1 else 0.0,
                "glucose_std_60": float(np.std(readings)) if len(readings) > 1 else 0.0,
                "glucose_min_60": float(np.min(readings)) if len(readings) > 0 else float(current_glucose_mg_dl),
                "glucose_max_60": float(np.max(readings)) if len(readings) > 0 else float(current_glucose_mg_dl),
                "glucose_range_60": (float(np.max(readings)) - float(np.min(readings))) if len(readings) > 1 else 0.0,
                "time_since_meal": 0.0,
                "time_since_bolus": 0.0,
                "exercise_active": 0.0,
                "patient_id": float(patient_id) if patient_id is not None else 0.0,
            }
            for k, v in mappings.items():
                if k in row:
                    row[k] = float(v)

            X_real = np.array([[row[c] for c in columns]], dtype=np.float32)
            proba = model.predict_proba(X_real)[0]
            p_up = float(proba[1] if len(proba) > 1 else proba[0])
            direction = "likely_up" if p_up >= threshold + 0.08 else ("likely_down" if p_up <= threshold - 0.08 else "uncertain")
            feat_dict["model_source"] = "real_patient_csv_bundle"
            feat_dict["model_threshold"] = threshold
            return direction, p_up, feat_dict
        except Exception:
            # If anything fails, continue to compact model fallback below.
            pass

    # 2) Compact model fallback
    model = _load_model()
    if model is not None:
        proba = model.predict_proba(X)[0]
        p_up = float(proba[1] if len(proba) > 1 else proba[0])
        feat_dict["model_source"] = "compact_runtime_model"
    else:
        # Heuristic fallback aligned with validation-layer intuition
        icr = max(feat_dict["icr_g_per_unit"], 4.0)
        isf = max(feat_dict["isf_mg_dl_per_unit"], 20.0)
        net = (feat_dict["carbs_g"] / icr) - max(feat_dict["insulin_units"], 0.0)
        score = net * (isf * 0.08) + 0.12 * (feat_dict["current_glucose_mg_dl"] - 120) / 50
        score += 0.04 * feat_dict["trend_slope"]
        p_up = float(1.0 / (1.0 + np.exp(-score)))
        feat_dict["model_source"] = "heuristic_fallback"

    if p_up >= 0.58:
        direction = "likely_up"
    elif p_up <= 0.42:
        direction = "likely_down"
    else:
        direction = "uncertain"

    return direction, p_up, feat_dict
