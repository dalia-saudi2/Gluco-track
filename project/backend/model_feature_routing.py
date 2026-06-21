"""Split a unified health-profile payload into model-specific feature dicts."""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from complications_service import build_raw_from_fields, normalize_diabetes_type_label, normalize_gender_label, normalize_hypertension_label
from diabetes_staging_service import build_staging_payload
from models import PatientMeasurement, User


# Keys collected once on the unified health-features form.
UNIFIED_PROFILE_KEYS = frozenset(
    {
        "visit_date",
        "visit_age",
        "visit_gender",
        "duration_years",
        "diabetes_type",
        "medications",
        "hypertension_history",
        "systolic_bp",
        "diastolic_bp",
        "heart_rate",
        "cholesterol_total",
        "ldl_cholesterol",
        "hdl_cholesterol",
        "triglycerides",
        "hba1c",
        "hematocrit",
        "fasting_glucose",
        "glucose_postprandial",
        "insulin_level",
        "smoking_status",
        "alcohol_group",
        "physical_activity_minutes",
        "sleep_hours_per_day",
        "screen_time_hours_per_day",
        "diet_quality",
        "family_history_diabetes",
        "cardiovascular_history",
        "height_cm",
        "weight_kg",
        "waist_cm",
        "hip_cm",
        "years_since_quit",
        "cigarettes_per_day",
        "stress_level",
        "partial",
        "source_lab_upload_id",
    }
)

STAGING_ONLY_FROM_USER = frozenset({"ethnicity", "education_level", "employment_status", "income_level", "gender"})

COMPLICATIONS_VISIT_KEYS = frozenset(
    {
        "Duration_Years",
        "Age",
        "BMI",
        "HbA1c",
        "Systolic_BP",
        "Diastolic_BP",
        "Total_Cholesterol",
        "LDL",
        "HDL",
        "Triglycerides",
        "Hematocrit",
        "Gender",
        "Diabetes_Type",
        "Hypertension",
        "Medications",
    }
)


def complications_raw_from_payload(
    payload: Any,
    user: User,
    *,
    age: int,
    bmi: float,
) -> dict[str, Any]:
    """Map unified form → complications model raw visit dict."""
    gender = normalize_gender_label(getattr(payload, "visit_gender", None) or user.gender)
    dtype = normalize_diabetes_type_label(getattr(payload, "diabetes_type", None))
    htn = normalize_hypertension_label(bool(getattr(payload, "hypertension_history", False)))
    return build_raw_from_fields(
        duration_years=getattr(payload, "duration_years", None),
        age=getattr(payload, "visit_age", None) or age,
        bmi=bmi,
        hba1c=getattr(payload, "hba1c", None),
        systolic_bp=getattr(payload, "systolic_bp", None),
        diastolic_bp=getattr(payload, "diastolic_bp", None),
        total_cholesterol=getattr(payload, "cholesterol_total", None),
        ldl=getattr(payload, "ldl_cholesterol", None),
        hdl=getattr(payload, "hdl_cholesterol", None),
        triglycerides=getattr(payload, "triglycerides", None),
        hematocrit=getattr(payload, "hematocrit", None),
        gender=gender,
        diabetes_type=dtype,
        hypertension=htn,
        medications=(getattr(payload, "medications", None) or "").strip(),
    )


def measurement_fields_from_payload(payload: Any, *, age: int, bmi: float, whr: float, abdominal_obesity: bool, partial: bool) -> dict[str, Any]:
    """Fields stored on PatientMeasurement from the unified form."""
    return {
        "age": getattr(payload, "visit_age", None) or age,
        "bmi": bmi,
        "whr": whr,
        "abdominal_obesity": abdominal_obesity,
        "smoking_status": payload.smoking_status,
        "alcohol_group": payload.alcohol_group,
        "physical_activity_minutes": payload.physical_activity_minutes,
        "sleep_hours_per_day": payload.sleep_hours_per_day,
        "screen_time_hours_per_day": payload.screen_time_hours_per_day,
        "family_history_diabetes": payload.family_history_diabetes,
        "hypertension_history": payload.hypertension_history,
        "cardiovascular_history": payload.cardiovascular_history,
        "height_cm": payload.height_cm,
        "weight_kg": payload.weight_kg,
        "waist_cm": payload.waist_cm,
        "hip_cm": payload.hip_cm,
        "systolic_bp": getattr(payload, "systolic_bp", None),
        "diastolic_bp": getattr(payload, "diastolic_bp", None),
        "heart_rate": None if partial else getattr(payload, "heart_rate", None),
        "cholesterol_total": getattr(payload, "cholesterol_total", None),
        "ldl_cholesterol": getattr(payload, "ldl_cholesterol", None),
        "hdl_cholesterol": getattr(payload, "hdl_cholesterol", None),
        "triglycerides": getattr(payload, "triglycerides", None),
        "years_since_quit": getattr(payload, "years_since_quit", None),
        "cigarettes_per_day": getattr(payload, "cigarettes_per_day", None),
        "diet_quality": getattr(payload, "diet_quality", None),
        "stress_level": getattr(payload, "stress_level", None),
        "hba1c": getattr(payload, "hba1c", None),
        "hematocrit": getattr(payload, "hematocrit", None),
        "fasting_glucose": getattr(payload, "fasting_glucose", None),
    }


def staging_payload_from_measurement(
    user: User,
    measurement: PatientMeasurement,
    *,
    partial: bool,
    glucose_postprandial: Optional[float] = None,
    insulin_level: Optional[float] = None,
) -> dict[str, Any]:
    """Map stored measurement + user demographics → diabetes staging model input."""
    payload = build_staging_payload(user, measurement, partial=partial)
    if glucose_postprandial is not None:
        payload["glucose_postprandial"] = glucose_postprandial
    if insulin_level is not None:
        payload["insulin_level"] = insulin_level
    return payload


def resolve_visit_date(payload: Any, user: User) -> date:
    v = getattr(payload, "visit_date", None)
    if v:
        return v
    if user.created_at:
        return user.created_at.date()
    return date.today()
