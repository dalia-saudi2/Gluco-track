"""Heuristic diabetes staging / risk stub (replaced by trained XGBoost in production)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from feature_constants import (
    LAB_FEATURE_KEYS,
    LAB_MEAN_IMPUTATION,
    STAGE_LABELS,
    TOTAL_FEATURES,
)


def _stage_label(stage: int, estimated: bool) -> str:
    base = STAGE_LABELS.get(stage, "Unknown")
    return f"{base} (estimated)" if estimated else base


def predict_from_measurement(
    row: Dict[str, Any],
    *,
    partial: bool = False,
    imputed_fields: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Rule-based placeholder; uses mean imputation for missing lab fields when partial."""
    imputed = list(imputed_fields or [])
    bmi = float(row.get("bmi") or 22)
    age = int(row.get("age") or 40)
    fam = bool(row.get("family_history_diabetes"))
    activity = int(row.get("physical_activity_minutes") or 0)

    sys_bp = row.get("systolic_bp")
    if sys_bp is None:
        sys_bp = LAB_MEAN_IMPUTATION["systolic_bp"]
        if "systolic_bp" not in imputed:
            imputed.append("systolic_bp")
    sys_bp = int(sys_bp)

    chol = row.get("cholesterol_total")
    if chol is None:
        chol = LAB_MEAN_IMPUTATION["cholesterol_total"]
        if "cholesterol_total" not in imputed:
            imputed.append("cholesterol_total")

    score = 18.0
    score += max(0, (bmi - 25) * 1.8)
    score += max(0, (sys_bp - 120) * 0.15)
    score += 12 if fam else 0
    score += 6 if activity < 90 else 0
    if chol is not None and float(chol) > 200:
        score += 8

    if partial:
        score *= 0.92

    score = max(5.0, min(95.0, score))
    stage = 0 if score < 35 else (1 if score < 60 else 2)

    base = score / 100.0
    features_used = TOTAL_FEATURES - len(imputed) if partial else TOTAL_FEATURES

    feature_importances = {
        "bmi": {"weight": 0.28, "imputed": False},
        "systolic_bp": {"weight": 0.18, "imputed": "systolic_bp" in imputed},
        "family_history_diabetes": {"weight": 0.22, "imputed": False},
        "physical_activity_minutes": {"weight": 0.14, "imputed": False},
        "cholesterol_total": {"weight": 0.12, "imputed": "cholesterol_total" in imputed},
    }

    return {
        "diabetes_stage": stage,
        "diabetes_stage_label": _stage_label(stage, partial),
        "diabetes_risk_score": round(score, 2),
        "diagnosed_diabetes": False,
        "retinopathy_risk": round(min(0.85, base * 0.35), 4),
        "nephropathy_risk": round(min(0.85, base * 0.28), 4),
        "neuropathy_risk": round(min(0.85, base * 0.32), 4),
        "staging_confidence": 0.55 if partial else 0.72,
        "risk_score_confidence": 0.52 if partial else 0.68,
        "feature_importances": feature_importances,
        "imputed_features": imputed,
        "features_used": features_used,
        "features_total": TOTAL_FEATURES,
        "is_estimated": partial,
        "model_name": "heuristic_staging_v1_partial" if partial else "heuristic_staging_v1",
    }
