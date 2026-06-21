"""Diabetes staging / risk score — ML logistic regression with heuristic fallback."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from feature_constants import LAB_FEATURE_KEYS, STAGE_LABELS, TOTAL_FEATURES
from models import PatientMeasurement, User

try:
    from ml.staging.predict import predict_stage as _ml_predict_stage
    from ml.staging.model_loader import load_bundle

    _ML_AVAILABLE = True
except ImportError:
    _ML_AVAILABLE = False


def _stage_label(stage: int, estimated: bool) -> str:
    base = STAGE_LABELS.get(stage, "Unknown")
    return f"{base} (estimated)" if estimated else base


def _complication_placeholders(risk_score: float) -> tuple[float, float, float]:
    base = max(0.0, min(1.0, risk_score / 100.0))
    return (
        round(min(0.85, base * 0.35), 4),
        round(min(0.85, base * 0.28), 4),
        round(min(0.85, base * 0.32), 4),
    )


def build_staging_payload(
    user: User,
    measurement: PatientMeasurement,
    *,
    partial: bool = False,
    glucose_postprandial: Optional[float] = None,
    insulin_level: Optional[float] = None,
) -> Dict[str, Any]:
    """Map user + measurement rows to the flat payload expected by predict_stage."""
    return {
        "partial": partial,
        "age": measurement.age or user.age,
        "gender": user.gender,
        "ethnicity": user.ethnicity,
        "education_level": user.education_level,
        "employment_status": user.employment_status,
        "income_level": user.income_level,
        "bmi": float(measurement.bmi) if measurement.bmi is not None else None,
        "waist_to_hip_ratio": (
            float(measurement.waist_to_hip_ratio) if measurement.waist_to_hip_ratio is not None else None
        ),
        "abdominal_obesity": measurement.abdominal_obesity,
        "smoking_status": measurement.smoking_status,
        "alcohol_group": measurement.alcohol_group,
        "physical_activity_minutes": measurement.physical_activity_minutes,
        "sleep_hours_per_day": measurement.sleep_hours_per_day,
        "screen_time_hours_per_day": measurement.screen_time_hours_per_day,
        "family_history_diabetes": measurement.family_history_diabetes,
        "hypertension_history": measurement.hypertension_history,
        "cardiovascular_history": measurement.cardiovascular_history,
        "systolic_bp": measurement.systolic_bp,
        "diastolic_bp": measurement.diastolic_bp,
        "heart_rate": measurement.heart_rate,
        "cholesterol_total": measurement.cholesterol_total,
        "ldl_cholesterol": measurement.ldl_cholesterol,
        "hdl_cholesterol": measurement.hdl_cholesterol,
        "triglycerides": measurement.triglycerides,
        "hba1c": measurement.hba1c,
        "fasting_glucose": measurement.fasting_glucose,
        "glucose_fasting": measurement.fasting_glucose,
        "glucose_postprandial": glucose_postprandial,
        "insulin_level": insulin_level,
    }


def _heuristic_predict(
    row: Dict[str, Any],
    *,
    partial: bool = False,
    imputed_fields: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Rule-based fallback when LR artifacts are unavailable."""
    imputed = list(imputed_fields or [])
    bmi = float(row.get("bmi") or 22)
    fam = bool(row.get("family_history_diabetes"))
    activity = int(row.get("physical_activity_minutes") or 0)

    sys_bp = row.get("systolic_bp")
    if sys_bp is None:
        sys_bp = 120
        if "systolic_bp" not in imputed:
            imputed.append("systolic_bp")
    sys_bp = int(sys_bp)

    chol = row.get("cholesterol_total")
    if chol is None:
        chol = 190
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
    ret, nep, neu = _complication_placeholders(score)

    return {
        "diabetes_stage": stage,
        "diabetes_stage_label": _stage_label(stage, partial),
        "diabetes_risk_score": round(score, 2),
        "diagnosed_diabetes": stage >= 2,
        "retinopathy_risk": ret,
        "nephropathy_risk": nep,
        "neuropathy_risk": neu,
        "staging_confidence": 0.55 if partial else 0.72,
        "risk_score_confidence": 0.52 if partial else 0.68,
        "feature_importances": None,
        "imputed_features": imputed,
        "features_used": TOTAL_FEATURES - len(imputed) if partial else TOTAL_FEATURES,
        "features_total": TOTAL_FEATURES,
        "is_estimated": partial or bool(imputed),
        "model_name": "heuristic_staging_v1_partial" if partial else "heuristic_staging_v1",
        "predicted_at": datetime.now(timezone.utc),
    }


def _ml_predict(
    payload: Dict[str, Any],
    *,
    partial: bool = False,
    imputed_fields: Optional[List[str]] = None,
    diagnosed_diabetes: bool = False,
) -> Dict[str, Any]:
    result = _ml_predict_stage(payload, partial=partial, imputed_fields=imputed_fields)
    stage = int(result["diabetes_stage"])
    risk_score = float(result["diabetes_risk_score"])
    ret, nep, neu = _complication_placeholders(risk_score)
    confidence = float(result.get("confidence") or 0.0)

    stage_label = STAGE_LABELS.get(stage, "Unknown")
    if result.get("is_estimated"):
        stage_label = f"{stage_label} (estimated)"

    return {
        "diabetes_stage": stage,
        "diabetes_stage_label": stage_label,
        "diabetes_risk_score": risk_score,
        "diagnosed_diabetes": diagnosed_diabetes or stage >= 2,
        "retinopathy_risk": ret,
        "nephropathy_risk": nep,
        "neuropathy_risk": neu,
        "staging_confidence": confidence,
        "risk_score_confidence": confidence,
        "feature_importances": None,
        "imputed_features": result.get("imputed_features") or [],
        "features_used": result.get("features_used", TOTAL_FEATURES),
        "features_total": result.get("features_total", TOTAL_FEATURES),
        "is_estimated": bool(result.get("is_estimated")),
        "model_name": result.get("model_name"),
        "stage_probabilities": result.get("stage_probabilities"),
        "predicted_at": result.get("predicted_at") or datetime.now(timezone.utc),
    }


def predict_from_profile(
    user: User,
    measurement: PatientMeasurement,
    *,
    partial: bool = False,
    imputed_fields: Optional[List[str]] = None,
    glucose_postprandial: Optional[float] = None,
    insulin_level: Optional[float] = None,
) -> Dict[str, Any]:
    """Run LR staging on full user + measurement profile."""
    payload = build_staging_payload(
        user,
        measurement,
        partial=partial,
        glucose_postprandial=glucose_postprandial,
        insulin_level=insulin_level,
    )
    mode = "lifestyle" if partial else "clinical"
    diagnosed = bool(user.is_diabetic_path)

    if _ML_AVAILABLE and load_bundle(mode):
        try:
            return _ml_predict(
                payload,
                partial=partial,
                imputed_fields=imputed_fields,
                diagnosed_diabetes=diagnosed,
            )
        except Exception:
            pass

    return _heuristic_predict(payload, partial=partial, imputed_fields=imputed_fields)


def predict_from_measurement(
    row: Dict[str, Any],
    *,
    partial: bool = False,
    imputed_fields: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Backward-compatible entry for sparse feature dicts (heuristic or minimal ML)."""
    mode = "lifestyle" if partial else "clinical"
    if _ML_AVAILABLE and load_bundle(mode):
        try:
            payload = dict(row)
            payload.setdefault("partial", partial)
            return _ml_predict(payload, partial=partial, imputed_fields=imputed_fields)
        except Exception:
            pass
    return _heuristic_predict(row, partial=partial, imputed_fields=imputed_fields)
