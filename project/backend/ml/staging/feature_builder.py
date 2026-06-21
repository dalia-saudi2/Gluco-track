"""Map API payloads to one-hot feature vectors (fixed column order for sklearn)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd


def _title(s: Optional[str]) -> str:
    if not s:
        return ""
    return str(s).strip().title()


def map_gender(value: Optional[str]) -> str:
    g = (value or "").lower()
    if g in ("female", "f"):
        return "Female"
    if g in ("male", "m"):
        return "Male"
    return "Other"


def map_ethnicity(value: Optional[str]) -> str:
    v = _title(value)
    allowed = {"Asian", "Black", "Hispanic", "White", "Other"}
    return v if v in allowed else "Other"


def map_education(value: Optional[str]) -> str:
    if not value:
        return "Highschool"
    v = value.strip().lower()
    if "no high school" in v or "no formal" in v:
        return "No formal"
    if "high school" in v or v == "highschool":
        return "Highschool"
    if "master" in v or "doctor" in v or "professional" in v or "postgraduate" in v:
        return "Postgraduate"
    if "associate" in v or "bachelor" in v or "graduate" in v:
        return "Graduate"
    return "Highschool"


def map_employment(value: Optional[str]) -> str:
    v = (value or "").lower()
    if "student" in v:
        return "Student"
    if "retir" in v:
        return "Retired"
    if "unemploy" in v:
        return "Unemployed"
    return "Employed"


def map_income(value: Optional[str]) -> str:
    if value is None:
        return "Middle"
    if isinstance(value, (int, float)):
        ordinal = int(value)
        return {0: "Low", 1: "Lower-Middle", 2: "Middle", 3: "Upper-Middle"}.get(ordinal, "Middle")
    v = str(value).lower()
    if "under" in v or v.startswith("<"):
        return "Low"
    if "25" in v and "50" in v:
        return "Lower-Middle"
    if "100" in v or v.endswith("+"):
        return "High"
    if "50" in v:
        return "Middle"
    return "Middle"


def map_smoking(value: Optional[str]) -> str:
    v = (value or "never").lower()
    if v == "current":
        return "Current"
    if v == "former":
        return "Former"
    return "Never"


def map_alcohol_group(value: Optional[str]) -> str:
    v = (value or "none").lower()
    if v == "heavy":
        return "Heavy"
    if v == "moderate":
        return "Moderate"
    return "Light"


def alcohol_drinks_per_week(value: Optional[str]) -> float:
    v = (value or "none").lower()
    return {"none": 0.0, "light": 4.0, "moderate": 11.0, "heavy": 18.0}.get(v, 0.0)


def bmi_group_from_bmi(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Normal"
    if bmi < 30:
        return "Overweight"
    return "Obese"


def activity_level_from_minutes(minutes: float) -> str:
    if minutes <= 0 or minutes < 90:
        return "Low"
    if minutes < 210:
        return "Moderate"
    return "High"


def abdominal_obesity(gender: Optional[str], whr: float) -> bool:
    g = (gender or "").lower()
    threshold = 0.85 if g in ("female", "f") else 0.90
    return whr > threshold


def encode_raw_row(
    raw_row: Dict[str, Any],
    *,
    feature_names: Sequence[str],
    categorical_columns: Sequence[str],
    raw_feature_columns: Sequence[str],
) -> np.ndarray:
    """One-hot encode and align to training feature column order."""
    frame = pd.DataFrame([{k: raw_row[k] for k in raw_feature_columns}])
    cat = [c for c in categorical_columns if c in frame.columns]
    encoded = pd.get_dummies(frame, columns=cat, dtype=float)
    aligned = encoded.reindex(columns=list(feature_names), fill_value=0.0)
    return aligned.to_numpy(dtype=float)


def build_raw_row_from_api_payload(
    payload: Dict[str, Any],
    *,
    imputation_defaults: Dict[str, Any],
    partial: bool = False,
) -> Tuple[Dict[str, Any], List[str]]:
    """Map a flat API payload to the raw training feature dict."""
    imputed: List[str] = []

    def _num(name: str, value: Any, default_key: str) -> float:
        if value is not None:
            return float(value)
        imputed.append(name)
        return float(imputation_defaults.get(default_key, imputation_defaults[name]))

    def _cat(name: str, value: Any, default_key: str) -> str:
        if value is not None and str(value).strip():
            return str(value).strip()
        imputed.append(name)
        return str(imputation_defaults.get(default_key, imputation_defaults[name]))

    activity_min = _num(
        "physical_activity_minutes_per_week",
        payload.get("physical_activity_minutes_per_week", payload.get("physical_activity_minutes")),
        "physical_activity_minutes_per_week",
    )
    bmi_val = _num("bmi", payload.get("bmi"), "bmi")
    whr_val = _num("waist_to_hip_ratio", payload.get("waist_to_hip_ratio"), "waist_to_hip_ratio")
    gender_val = _cat("gender", map_gender(payload.get("gender")), "gender")
    alcohol_raw = payload.get("alcohol_group")

    row: Dict[str, Any] = {
        "abdominal_obesity": float(
            payload["abdominal_obesity"]
            if payload.get("abdominal_obesity") is not None
            else abdominal_obesity(payload.get("gender"), whr_val)
        ),
        "activity_level": payload.get("activity_level") or activity_level_from_minutes(activity_min),
        "age": _num("age", payload.get("age"), "age"),
        "alcohol_consumption_per_week": _num(
            "alcohol_consumption_per_week",
            payload.get("alcohol_consumption_per_week", alcohol_drinks_per_week(alcohol_raw)),
            "alcohol_consumption_per_week",
        ),
        "alcohol_group": _cat("alcohol_group", map_alcohol_group(alcohol_raw), "alcohol_group"),
        "bmi": bmi_val,
        "bmi_group": payload.get("bmi_group") or bmi_group_from_bmi(bmi_val),
        "cardiovascular_history": float(bool(payload.get("cardiovascular_history", False))),
        "cholesterol_total": _num("cholesterol_total", payload.get("cholesterol_total"), "cholesterol_total"),
        "diastolic_bp": _num("diastolic_bp", payload.get("diastolic_bp"), "diastolic_bp"),
        "education_level": _cat(
            "education_level", map_education(payload.get("education_level")), "education_level"
        ),
        "employment_status": _cat(
            "employment_status", map_employment(payload.get("employment_status")), "employment_status"
        ),
        "ethnicity": _cat("ethnicity", map_ethnicity(payload.get("ethnicity")), "ethnicity"),
        "family_history_diabetes": float(bool(payload.get("family_history_diabetes", False))),
        "gender": gender_val,
        "hdl_cholesterol": _num("hdl_cholesterol", payload.get("hdl_cholesterol"), "hdl_cholesterol"),
        "heart_rate": _num("heart_rate", payload.get("heart_rate"), "heart_rate"),
        "hypertension_history": float(bool(payload.get("hypertension_history", False))),
        "income_level": _cat("income_level", map_income(payload.get("income_level")), "income_level"),
        "ldl_cholesterol": _num("ldl_cholesterol", payload.get("ldl_cholesterol"), "ldl_cholesterol"),
        "physical_activity_minutes_per_week": activity_min,
        "screen_time_hours_per_day": _num(
            "screen_time_hours_per_day", payload.get("screen_time_hours_per_day"), "screen_time_hours_per_day"
        ),
        "sleep_hours_per_day": _num(
            "sleep_hours_per_day", payload.get("sleep_hours_per_day"), "sleep_hours_per_day"
        ),
        "smoking_status": _cat(
            "smoking_status", map_smoking(payload.get("smoking_status")), "smoking_status"
        ),
        "systolic_bp": _num("systolic_bp", payload.get("systolic_bp"), "systolic_bp"),
        "triglycerides": _num("triglycerides", payload.get("triglycerides"), "triglycerides"),
        "waist_to_hip_ratio": whr_val,
    }

    if not partial:
        for lab_key, payload_key in (
            ("glucose_fasting", "glucose_fasting"),
            ("glucose_postprandial", "glucose_postprandial"),
            ("hba1c", "hba1c"),
            ("insulin_level", "insulin_level"),
        ):
            val = payload.get(payload_key)
            if val is None and payload_key == "glucose_fasting":
                val = payload.get("fasting_glucose")
            if val is None:
                imputed.append(lab_key)
                row[lab_key] = float(imputation_defaults[lab_key])
            else:
                row[lab_key] = float(val)

    return row, imputed
