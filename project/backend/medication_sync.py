"""Ensure medications table reflects clinical profile medication_list."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models import Medication, PatientClinicalProfile

_KNOWN_DEFAULTS: dict[str, dict[str, str]] = {
    "metformin": {
        "dosage": "500mg",
        "frequency": "Twice daily",
        "notes": "Before breakfast and after dinner",
        "category": "Diabetes",
    },
    "insulin glargine": {
        "dosage": "10 units",
        "frequency": "Once daily",
        "notes": "Before breakfast",
        "category": "Diabetes",
    },
    "insulin": {
        "dosage": "As prescribed",
        "frequency": "Before breakfast",
        "notes": "Before breakfast",
        "category": "Diabetes",
    },
    "lisinopril": {
        "dosage": "10mg",
        "frequency": "Once daily",
        "notes": "After lunch",
        "category": "Blood Pressure",
    },
    "atorvastatin": {
        "dosage": "20mg",
        "frequency": "Once daily",
        "notes": "After dinner",
        "category": "Cardiovascular",
    },
    "aspirin": {
        "dosage": "81mg",
        "frequency": "Once daily",
        "notes": "Morning dose",
        "category": "Cardiovascular",
    },
}


def _split_medication_names(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    parts = re.split(r"[,;\n]+", text)
    names: list[str] = []
    seen: set[str] = set()
    for part in parts:
        name = part.strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        names.append(name)
    return names


def _defaults_for_name(name: str) -> dict[str, str]:
    lower = name.strip().lower()
    if lower in _KNOWN_DEFAULTS:
        return _KNOWN_DEFAULTS[lower]
    for key, value in _KNOWN_DEFAULTS.items():
        if key in lower or lower in key:
            return value
    return {
        "dosage": "As prescribed",
        "frequency": "Once daily",
        "notes": "Daily dose",
        "category": "prescription",
    }


def sync_medications_from_clinical_profile(
    db: Session,
    patient_id: int,
    *,
    commit: bool = True,
) -> list[Medication]:
    """Create missing Medication rows from patient_clinical_profile.medication_list."""
    profile: Optional[PatientClinicalProfile] = (
        db.query(PatientClinicalProfile)
        .filter(PatientClinicalProfile.patient_id == patient_id)
        .first()
    )
    if not profile or not profile.medication_list:
        return (
            db.query(Medication)
            .filter(Medication.patient_id == patient_id, Medication.is_active.is_(True))
            .all()
        )

    names = _split_medication_names(profile.medication_list)
    if not names:
        return (
            db.query(Medication)
            .filter(Medication.patient_id == patient_id, Medication.is_active.is_(True))
            .all()
        )

    existing = (
        db.query(Medication)
        .filter(Medication.patient_id == patient_id)
        .all()
    )
    existing_by_name = {m.name.strip().lower(): m for m in existing}

    created = False
    for name in names:
        key = name.lower()
        if key in existing_by_name:
            med = existing_by_name[key]
            if not med.is_active:
                med.is_active = True
                created = True
            continue

        defaults = _defaults_for_name(name)
        db.add(
            Medication(
                patient_id=patient_id,
                name=name,
                dosage=defaults["dosage"],
                frequency=defaults["frequency"],
                notes=defaults["notes"],
                category=defaults.get("category"),
                start_date=datetime.now(),
                is_active=True,
                critical=False,
            )
        )
        created = True

    if created and commit:
        db.commit()

    return (
        db.query(Medication)
        .filter(Medication.patient_id == patient_id, Medication.is_active.is_(True))
        .all()
    )
