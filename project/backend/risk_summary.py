"""Build dashboard risk summary from user measurement + prediction."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from feature_constants import TOTAL_FEATURES, count_filled_features, profile_completeness_pct
from models import DiabetesPrediction, PatientMeasurement, User


def _latest_measurement(db: Session, user_id: int) -> Optional[PatientMeasurement]:
    return (
        db.query(PatientMeasurement)
        .filter(PatientMeasurement.patient_id == user_id, PatientMeasurement.is_current.is_(True))
        .order_by(PatientMeasurement.created_at.desc())
        .first()
    )


def _latest_prediction(db: Session, user_id: int) -> Optional[DiabetesPrediction]:
    return (
        db.query(DiabetesPrediction)
        .filter(DiabetesPrediction.patient_id == user_id)
        .order_by(DiabetesPrediction.predicted_at.desc())
        .first()
    )


def build_risk_summary(user: User, db: Session) -> Optional[dict]:
    measurement = _latest_measurement(db, user.id)
    prediction = _latest_prediction(db, user.id)
    if not measurement or not prediction:
        return None

    filled = count_filled_features(measurement, user)
    pct = profile_completeness_pct(filled)
    lab_complete = bool(measurement.lab_data_complete)
    pending = bool(user.lab_upload_pending)

    stage_labels = {0: "Low risk", 1: "Pre-diabetic", 2: "High risk"}
    stage_label = stage_labels.get(prediction.diabetes_stage, "Unknown")
    if prediction.is_estimated:
        stage_label = f"{stage_label} (estimated)"

    account_age_days = 0
    if user.created_at:
        created = user.created_at.replace(tzinfo=None) if hasattr(user.created_at, "replace") else user.created_at
        account_age_days = max(0, (datetime.utcnow() - created).days)

    return {
        "risk_score": prediction.diabetes_risk_score,
        "is_estimated": bool(prediction.is_estimated),
        "diabetes_stage": prediction.diabetes_stage,
        "diabetes_stage_label": stage_label,
        "features_used": prediction.features_used or filled,
        "features_total": prediction.features_total or TOTAL_FEATURES,
        "lab_upload_pending": pending,
        "lab_data_complete": lab_complete,
        "profile_completeness_pct": pct,
        "feature_pills": {
            "lifestyle": True,
            "body": True,
            "history": True,
            "lab_results": lab_complete,
        },
        "account_age_days": account_age_days,
        "imputed_features": prediction.imputed_features or [],
    }
