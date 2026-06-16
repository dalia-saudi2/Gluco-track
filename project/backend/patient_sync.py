"""Sync `patients` row from `users` after onboarding demographics."""

from __future__ import annotations

from sqlalchemy.orm import Session

from models import Patient, User


def _edu_to_int(val) -> int:
    mapping = {
        "no high school": 0,
        "high school diploma": 1,
        "associate's degree": 2,
        "bachelor's degree": 3,
        "master's degree": 4,
        "doctorate / professional": 4,
    }
    if isinstance(val, int):
        return val
    key = str(val).lower().strip()
    return mapping.get(key, 2)


def _income_to_int(val) -> int:
    if isinstance(val, int):
        return val
    key = str(val).lower()
    if any(x in key for x in ("under", "<", "low")):
        return 0
    if "25" in key:
        return 1
    if "50" in key and "100" not in key:
        return 2
    if any(x in key for x in ("100", "over", ">")):
        return 3
    try:
        return int(val)
    except (TypeError, ValueError):
        return 1


def _normalize_gender(val) -> str | None:
    if not val:
        return None
    v = str(val).lower()
    if v in ("male", "m"):
        return "male"
    if v in ("female", "f"):
        return "female"
    return None


def _normalize_ethnicity(val) -> str | None:
    if not val:
        return None
    v = str(val).lower()
    for code in ("white", "black", "hispanic", "asian", "other"):
        if v == code or v.startswith(code):
            return code
    return "other"


def _normalize_employment(val) -> str | None:
    if not val:
        return None
    v = str(val).lower()
    if "student" in v or "part" in v:
        return "employed_part"
    if "unemploy" in v:
        return "unemployed"
    if "retir" in v:
        return "retired"
    return "employed_full"


def sync_patient_from_user(db: Session, user: User) -> Patient | None:
    gender = _normalize_gender(user.gender)
    ethnicity = _normalize_ethnicity(user.ethnicity)
    employment = _normalize_employment(user.employment_status)
    if user.age is None or not gender or not ethnicity or user.education_level is None:
        return None
    if employment is None or user.income_level is None:
        return None

    income = _income_to_int(user.income_level)
    edu = _edu_to_int(user.education_level)
    dob = user.date_of_birth.isoformat() if user.date_of_birth else None

    row = db.query(Patient).filter(Patient.id == user.id).first()
    if row is None:
        row = Patient(id=user.id, user_id=user.id)
        db.add(row)

    row.date_of_birth = user.date_of_birth
    row.age = user.age
    row.gender = gender
    row.ethnicity = ethnicity
    row.education_level = edu
    row.employment_status = employment
    row.income_level = income
    row.nationality = user.nationality
    row.marital_status = (user.marital_status or "").lower() or None
    row.caregiver_name = user.caregiver_name
    row.caregiver_phone = user.caregiver_phone
    row.preferred_language = (user.preferred_language or "en").lower()
    row.is_diabetic_path = user.is_diabetic_path
    row.lab_upload_pending = bool(user.lab_upload_pending)
    row.onboarding_complete = bool(user.onboarding_completed)
    return row
