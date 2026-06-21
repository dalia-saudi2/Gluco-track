"""Complications inference integration — calls ml.complications.inference only."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

from sqlalchemy.orm import Session

from ml.complications.inference import encode_visit, load_artifacts, predict_patient
from models import PatientClinicalProfile, PatientLabVisit, PatientMeasurement, User

_ARTIFACT_DIR = Path(__file__).resolve().parent / "ml" / "complications" / "ml_models" / "artifacts"
_artifacts: Optional[dict] = None


def init_complications_model() -> dict:
    """Load model artifacts once at application startup."""
    global _artifacts
    if _artifacts is None:
        _artifacts = load_artifacts(str(_ARTIFACT_DIR), with_shap=False)
    return _artifacts


def get_artifacts() -> dict:
    if _artifacts is None:
        return init_complications_model()
    return _artifacts


def _gender_label(user: User) -> str:
    g = (user.gender or "").strip().lower()
    return "Female" if g in ("female", "f") else "Male"


def _diabetes_type_label(profile: Optional[PatientClinicalProfile]) -> str:
    if not profile or not profile.diabetes_type:
        return "Type 2"
    dt = str(profile.diabetes_type).strip().lower()
    if dt in ("type1", "type 1", "t1", "t1dm"):
        return "Type 1"
    return "Type 2"


def _hypertension_label(value: Optional[bool]) -> str:
    return "Yes" if value else "No"


def _medications_text(profile: Optional[PatientClinicalProfile]) -> str:
    parts: list[str] = []
    if profile:
        if profile.medication_list:
            parts.append(profile.medication_list)
        if profile.on_insulin:
            parts.append("Insulin")
        if profile.on_sglt2i:
            parts.append("SGLT2i")
        if profile.on_antihypertensive:
            parts.append("ACEi")
    return ", ".join(dict.fromkeys(p.strip() for p in parts if p and p.strip()))


def visit_to_raw_dict(visit: PatientLabVisit) -> dict[str, Any]:
    return {
        "Duration_Years": visit.duration_years,
        "Age": visit.age,
        "BMI": visit.bmi,
        "HbA1c": visit.hba1c,
        "Systolic_BP": visit.systolic_bp,
        "Diastolic_BP": visit.diastolic_bp,
        "Total_Cholesterol": visit.total_cholesterol,
        "LDL": visit.ldl,
        "HDL": visit.hdl,
        "Triglycerides": visit.triglycerides,
        "Hematocrit": visit.hematocrit,
        "Gender": visit.gender,
        "Diabetes_Type": visit.diabetes_type,
        "Hypertension": visit.hypertension,
        "Medications": visit.medications or "",
    }


def build_raw_from_fields(
    *,
    duration_years: Optional[float],
    age: int,
    bmi: float,
    hba1c: Optional[float],
    systolic_bp: Optional[int],
    diastolic_bp: Optional[int],
    total_cholesterol: Optional[int],
    ldl: Optional[int],
    hdl: Optional[int],
    triglycerides: Optional[int],
    hematocrit: Optional[float],
    gender: str,
    diabetes_type: str,
    hypertension: str,
    medications: str,
) -> dict[str, Any]:
    return {
        "Duration_Years": duration_years,
        "Age": age,
        "BMI": bmi,
        "HbA1c": hba1c,
        "Systolic_BP": systolic_bp,
        "Diastolic_BP": diastolic_bp,
        "Total_Cholesterol": total_cholesterol,
        "LDL": ldl,
        "HDL": hdl,
        "Triglycerides": triglycerides,
        "Hematocrit": hematocrit,
        "Gender": gender,
        "Diabetes_Type": diabetes_type,
        "Hypertension": hypertension,
        "Medications": medications,
    }


def build_raw_from_measurement(
    user: User,
    measurement: PatientMeasurement,
    profile: Optional[PatientClinicalProfile],
) -> dict[str, Any]:
    duration = None
    if profile and profile.years_since_diagnosis is not None:
        duration = float(profile.years_since_diagnosis)
    return build_raw_from_fields(
        duration_years=duration,
        age=measurement.age,
        bmi=float(measurement.bmi or 0),
        hba1c=measurement.hba1c,
        systolic_bp=measurement.systolic_bp,
        diastolic_bp=measurement.diastolic_bp,
        total_cholesterol=measurement.cholesterol_total,
        ldl=measurement.ldl_cholesterol,
        hdl=measurement.hdl_cholesterol,
        triglycerides=measurement.triglycerides,
        hematocrit=measurement.hematocrit,
        gender=_gender_label(user),
        diabetes_type=_diabetes_type_label(profile),
        hypertension=_hypertension_label(measurement.hypertension_history),
        medications=_medications_text(profile),
    )


def list_visits(db: Session, patient_id: int) -> list[PatientLabVisit]:
    return (
        db.query(PatientLabVisit)
        .filter(PatientLabVisit.patient_id == patient_id)
        .order_by(PatientLabVisit.visit_date.asc(), PatientLabVisit.id.asc())
        .all()
    )


def upsert_visit(
    db: Session,
    patient_id: int,
    visit_date: date,
    raw_fields: dict[str, Any],
    *,
    source: str = "manual",
) -> PatientLabVisit:
    visit = (
        db.query(PatientLabVisit)
        .filter(
            PatientLabVisit.patient_id == patient_id,
            PatientLabVisit.visit_date == visit_date,
        )
        .first()
    )
    if visit is None:
        visit = PatientLabVisit(patient_id=patient_id, visit_date=visit_date, source=source)
        db.add(visit)

    visit.duration_years = raw_fields.get("Duration_Years")
    visit.age = int(raw_fields["Age"])
    visit.bmi = float(raw_fields["BMI"])
    visit.hba1c = raw_fields.get("HbA1c")
    visit.systolic_bp = raw_fields.get("Systolic_BP")
    visit.diastolic_bp = raw_fields.get("Diastolic_BP")
    visit.total_cholesterol = raw_fields.get("Total_Cholesterol")
    visit.ldl = raw_fields.get("LDL")
    visit.hdl = raw_fields.get("HDL")
    visit.triglycerides = raw_fields.get("Triglycerides")
    visit.hematocrit = raw_fields.get("Hematocrit")
    visit.gender = str(raw_fields.get("Gender") or "Male")
    visit.diabetes_type = str(raw_fields.get("Diabetes_Type") or "Type 2")
    visit.hypertension = str(raw_fields.get("Hypertension") or "No")
    visit.medications = str(raw_fields.get("Medications") or "")
    visit.source = source
    visit.updated_at = datetime.utcnow()
    db.flush()
    return visit


def upsert_visit_from_measurement(
    db: Session,
    user: User,
    measurement: PatientMeasurement,
    visit_date: date,
    *,
    source: str = "manual",
    overrides: Optional[dict[str, Any]] = None,
) -> PatientLabVisit:
    profile = (
        db.query(PatientClinicalProfile)
        .filter(PatientClinicalProfile.patient_id == user.id)
        .first()
    )
    raw = build_raw_from_measurement(user, measurement, profile)
    if overrides:
        for key, value in overrides.items():
            if value is not None and value != "":
                raw[key] = value
    return upsert_visit(db, user.id, visit_date, raw, source=source)


def normalize_gender_label(value: Optional[str]) -> str:
    g = (value or "").strip().lower()
    return "Female" if g in ("female", "f") else "Male"


def normalize_diabetes_type_label(value: Optional[str]) -> str:
    if not value:
        return "Type 2"
    dt = str(value).strip().lower()
    if dt in ("type1", "type 1", "t1", "t1dm"):
        return "Type 1"
    return "Type 2"


def normalize_hypertension_label(value: Optional[bool | str]) -> str:
    if isinstance(value, str):
        return "Yes" if value.strip().lower() in ("yes", "y", "true", "1") else "No"
    return "Yes" if value else "No"


def ensure_lab_visits_for_patient(db: Session, user: User) -> Optional[PatientLabVisit]:
    """Create Visit #1 from the current measurement when visits are missing (backfill / repair)."""
    if list_visits(db, user.id):
        return None
    measurement = (
        db.query(PatientMeasurement)
        .filter(
            PatientMeasurement.patient_id == user.id,
            PatientMeasurement.is_current.is_(True),
        )
        .order_by(PatientMeasurement.created_at.desc())
        .first()
    )
    if not measurement:
        return None
    signup_date = user.created_at.date() if user.created_at else date.today()
    visit = upsert_visit_from_measurement(db, user, measurement, signup_date, source="backfill")
    db.flush()
    return visit


def predict_for_patient(db: Session, patient_id: int) -> dict[str, Any]:
    visits = list_visits(db, patient_id)
    if not visits:
        return {"error": "no_visits", "message": "Add at least one lab entry."}
    encoded = [encode_visit(visit_to_raw_dict(v)) for v in visits]
    return predict_patient(encoded, get_artifacts())


def complication_probs(result: dict[str, Any]) -> tuple[float, float, float]:
    preds = result.get("predictions") or {}
    return (
        float((preds.get("Retinopathy") or {}).get("probability") or 0),
        float((preds.get("Nephropathy") or {}).get("probability") or 0),
        float((preds.get("Neuropathy") or {}).get("probability") or 0),
    )


def complication_levels(result: dict[str, Any]) -> dict[str, Optional[str]]:
    preds = result.get("predictions") or {}
    return {
        "retinopathy": (preds.get("Retinopathy") or {}).get("risk_level"),
        "nephropathy": (preds.get("Nephropathy") or {}).get("risk_level"),
        "neuropathy": (preds.get("Neuropathy") or {}).get("risk_level"),
    }


def complication_model_meta(result: dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    meta = result.get("meta") or {}
    return meta.get("model"), meta.get("confidence")
