"""Complications visit + prediction API (Retinopathy / Nephropathy / Neuropathy)."""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import get_current_active_user
from complications_service import (
    build_raw_from_fields,
    list_visits,
    predict_for_patient,
    upsert_visit,
    visit_to_raw_dict,
)
from database import get_db
from models import User
from patient_sync import sync_patient_from_user
from schemas import (
    ComplicationPatientResponse,
    ComplicationPredictionResponse,
    ComplicationVisitCreate,
    ComplicationVisitResponse,
)

router = APIRouter(prefix="/patients", tags=["complications"])


def _ensure_patient_access(current_user: User, patient_id: int) -> None:
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized for this patient.")


def _visit_response(visit) -> ComplicationVisitResponse:
    raw = visit_to_raw_dict(visit)
    return ComplicationVisitResponse(
        id=visit.id,
        patient_id=visit.patient_id,
        visit_date=visit.visit_date.isoformat(),
        source=visit.source,
        duration_years=raw.get("Duration_Years"),
        age=raw.get("Age"),
        bmi=raw.get("BMI"),
        hba1c=raw.get("HbA1c"),
        systolic_bp=raw.get("Systolic_BP"),
        diastolic_bp=raw.get("Diastolic_BP"),
        total_cholesterol=raw.get("Total_Cholesterol"),
        ldl=raw.get("LDL"),
        hdl=raw.get("HDL"),
        triglycerides=raw.get("Triglycerides"),
        hematocrit=raw.get("Hematocrit"),
        gender=raw.get("Gender"),
        diabetes_type=raw.get("Diabetes_Type"),
        hypertension=raw.get("Hypertension"),
        medications=raw.get("Medications"),
        created_at=visit.created_at,
        updated_at=visit.updated_at,
    )


@router.post("", response_model=ComplicationPatientResponse)
async def create_patient(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Ensure the authenticated user has a patient profile (visit #1 anchor)."""
    sync_patient_from_user(db, current_user)
    db.commit()
    dob = current_user.date_of_birth.date().isoformat() if current_user.date_of_birth else None
    return ComplicationPatientResponse(
        id=current_user.id,
        name=current_user.full_name,
        date_of_birth=dob,
        gender=current_user.gender,
    )


@router.post("/{patient_id}/visits", response_model=ComplicationVisitResponse)
async def add_or_update_visit(
    patient_id: int,
    payload: ComplicationVisitCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_patient_access(current_user, patient_id)
    visit_date = payload.visit_date or date.today()
    raw = build_raw_from_fields(
        duration_years=payload.duration_years,
        age=payload.age,
        bmi=payload.bmi,
        hba1c=payload.hba1c,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        total_cholesterol=payload.total_cholesterol,
        ldl=payload.ldl,
        hdl=payload.hdl,
        triglycerides=payload.triglycerides,
        hematocrit=payload.hematocrit,
        gender=payload.gender,
        diabetes_type=payload.diabetes_type,
        hypertension=payload.hypertension,
        medications=payload.medications or "",
    )
    visit = upsert_visit(db, patient_id, visit_date, raw, source="manual")
    db.commit()
    db.refresh(visit)
    return _visit_response(visit)


@router.post("/{patient_id}/visits/upload", response_model=ComplicationVisitResponse)
async def add_or_update_visit_from_upload(
    patient_id: int,
    visit_date: Optional[date] = None,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Parse a CSV lab report into visit fields (one row) and upsert by visit_date."""
    _ensure_patient_access(current_user, patient_id)
    import csv
    import io

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Upload must be UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text))
    row = next(reader, None)
    if not row:
        raise HTTPException(status_code=400, detail="CSV has no data rows.")

    key_map = {
        "duration_years": "Duration_Years",
        "age": "Age",
        "bmi": "BMI",
        "hba1c": "HbA1c",
        "systolic_bp": "Systolic_BP",
        "diastolic_bp": "Diastolic_BP",
        "total_cholesterol": "Total_Cholesterol",
        "ldl": "LDL",
        "hdl": "HDL",
        "triglycerides": "Triglycerides",
        "hematocrit": "Hematocrit",
        "gender": "Gender",
        "diabetes_type": "Diabetes_Type",
        "hypertension": "Hypertension",
        "medications": "Medications",
    }
    raw: dict = {}
    for src, dst in key_map.items():
        for candidate in (src, dst, dst.lower()):
            if candidate in row and row[candidate] not in (None, ""):
                raw[dst] = row[candidate]
                break

    required = ("Age", "BMI", "Gender", "Diabetes_Type", "Hypertension")
    missing = [k for k in required if k not in raw]
    if missing:
        raise HTTPException(status_code=400, detail=f"CSV missing required fields: {', '.join(missing)}")

    vdate = visit_date or date.today()
    visit = upsert_visit(db, patient_id, vdate, raw, source="upload")
    db.commit()
    db.refresh(visit)
    return _visit_response(visit)


@router.get("/{patient_id}/visits", response_model=list[ComplicationVisitResponse])
async def get_visits(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_patient_access(current_user, patient_id)
    return [_visit_response(v) for v in list_visits(db, patient_id)]


@router.get("/{patient_id}/predictions", response_model=ComplicationPredictionResponse)
async def get_predictions(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_patient_access(current_user, patient_id)
    result = predict_for_patient(db, patient_id)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result.get("message", "No visits found."))
    return ComplicationPredictionResponse(**result)
