"""Lab OCR upload, review, health features, and onboarding prediction routes."""

from __future__ import annotations

import os
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from onboarding_validation import calculate_age
from auth import get_current_active_user
from config import settings
from database import get_db
from diabetes_staging_service import predict_from_profile
from complications_service import (
    build_raw_from_fields,
    complication_model_meta,
    complication_probs,
    ensure_lab_visits_for_patient,
    normalize_diabetes_type_label,
    normalize_gender_label,
    normalize_hypertension_label,
    predict_for_patient,
    upsert_visit,
    upsert_visit_from_measurement,
)
from feature_derivations import years_since_diagnosis
from feature_constants import LAB_FEATURE_KEYS, TOTAL_FEATURES, activity_level_from_minutes, count_filled_features, profile_completeness_pct
from lab_reminder_service import cancel_lab_reminders, ensure_pinned_lab_action, schedule_lab_reminders
from models import DiabetesPrediction, LabUpload, MedicalRecord, PatientClinicalProfile, PatientMeasurement, User
from model_feature_routing import complications_raw_from_payload, resolve_visit_date
from patient_sync import sync_patient_from_user
from risk_summary import build_risk_summary
from ocr_service import process_lab_file, process_medical_report_file
from schemas import (
    ClinicalProfileResponse,
    ClinicalProfileUpdate,
    CompleteLabDataCreate,
    DiabeticPathUpdate,
    HealthFeaturesCreate,
    HealthFeaturesResponse,
    LabVisitSubmitCreate,
    LabUploadResponse,
    LabUploadReviewUpdate,
    MedicalRecord as MedicalRecordSchema,
    MedicalRecordUploadResponse,
    OnboardingProgress,
    DiabetesPredictionResponse,
    RiskSummary,
)

router = APIRouter(tags=["onboarding-lab"])

ALLOWED_EXTENSIONS = {"jpeg", "jpg", "png", "pdf"}
MAX_UPLOAD_BYTES = settings.max_file_size


def _demographics_done(user: User) -> bool:
    return bool(
        user.age is not None
        and user.age > 0
        and user.gender
        and user.height_cm is not None
        and user.height_cm > 0
        and user.weight_kg is not None
        and user.weight_kg > 0
    )


def _can_upload_lab_report(user: User) -> bool:
    return bool(
        user.onboarding_lab_opt_in is True
        or user.lab_upload_pending
        or user.onboarding_completed
    )


def _summary_from_ocr(extracted: dict, raw_output: dict | None = None) -> str:
    parts: list[str] = []
    for key, cell in extracted.items():
        if isinstance(cell, dict) and cell.get("value") is not None:
            label = key.replace("_", " ").title()
            parts.append(f"{label}: {cell['value']}")

    raw = raw_output or {}
    for test in raw.get("general_tests") or []:
        if not isinstance(test, dict):
            continue
        name = test.get("test_name") or test.get("name")
        val = test.get("value")
        if name is None or val is None:
            continue
        unit = test.get("unit") or ""
        suffix = f" {unit}".strip() if unit and unit != "-" else ""
        parts.append(f"{name}: {val}{suffix}")

    if parts:
        return "; ".join(parts[:12])
    return "Uploaded report — values extracted from your document."


def _sync_medical_record_from_lab_upload(db: Session, user: User, upload: LabUpload) -> MedicalRecord:
    extracted = upload.ocr_extracted_values or {}
    raw = upload.ocr_raw_output if isinstance(upload.ocr_raw_output, dict) else {}
    summary = _summary_from_ocr(extracted, raw)
    title = "Lab Report"
    if upload.file_type == "pdf":
        title = "Lab Report (PDF)"
    elif upload.file_type in {"jpeg", "jpg", "png"}:
        title = "Lab Report (Scan)"

    record_payload = {
        "lab_upload_id": upload.id,
        "ocr_status": upload.ocr_status,
        "ocr_extracted_values": extracted,
        "ocr_confidence_score": upload.ocr_confidence_score,
        "general_tests": raw.get("general_tests"),
        "text_preview": (raw.get("text_preview") or "")[:500],
    }

    existing = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.patient_id == user.id, MedicalRecord.file_url == upload.file_url)
        .first()
    )
    if existing:
        existing.content = summary
        existing.record_data = record_payload
        existing.updated_at = datetime.utcnow()
        return existing

    record = MedicalRecord(
        patient_id=user.id,
        record_type="lab",
        title=title,
        date=datetime.utcnow(),
        provider=user.full_name or "Self-uploaded",
        status="new",
        file_url=upload.file_url,
        content=summary,
        record_data=record_payload,
    )
    db.add(record)
    return record


def _latest_lab_upload(db: Session, user_id: int) -> Optional[LabUpload]:
    return (
        db.query(LabUpload)
        .filter(LabUpload.patient_id == user_id)
        .order_by(LabUpload.uploaded_at.desc())
        .first()
    )


def _has_health_features(db: Session, user_id: int) -> bool:
    return (
        db.query(PatientMeasurement)
        .filter(
            PatientMeasurement.patient_id == user_id,
            PatientMeasurement.is_current.is_(True),
        )
        .first()
        is not None
    )


def _clinical_profile_done(user: User, db: Session) -> bool:
    if _has_health_features(db, user.id):
        return True
    if user.is_diabetic_path is False:
        return True
    if user.is_diabetic_path is not True:
        return False
    return (
        db.query(PatientClinicalProfile)
        .filter(PatientClinicalProfile.patient_id == user.id)
        .first()
        is not None
    )


def build_onboarding_progress(user: User, db: Session) -> OnboardingProgress:
    lab = _latest_lab_upload(db, user.id) if user.onboarding_lab_opt_in else None
    return OnboardingProgress(
        demographics_done=_demographics_done(user),
        diabetic_path_done=user.is_diabetic_path is not None,
        clinical_profile_done=_clinical_profile_done(user, db),
        lab_opt_in=user.onboarding_lab_opt_in,
        lab_upload_id=lab.id if lab else None,
        lab_review_done=bool(lab and lab.review_confirmed),
        health_features_done=_has_health_features(db, user.id),
        onboarding_completed=bool(user.onboarding_completed) and _has_health_features(db, user.id),
    )


def _normalize_file_type(filename: str, content_type: Optional[str]) -> str:
    ext = Path(filename or "").suffix.lower().lstrip(".")
    if ext == "jpg":
        return "jpeg"
    if ext in ALLOWED_EXTENSIONS:
        return ext
    if content_type:
        if "pdf" in content_type:
            return "pdf"
        if "png" in content_type:
            return "png"
        if "jpeg" in content_type or "jpg" in content_type:
            return "jpeg"
    raise HTTPException(status_code=400, detail="Unsupported file type. Use JPEG, PNG, or PDF.")


def _public_file_url(relative_path: str) -> str:
    return f"/uploads/{relative_path.replace(os.sep, '/')}"


@router.get("/users/me/onboarding/progress", response_model=OnboardingProgress)
async def get_onboarding_progress(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return build_onboarding_progress(current_user, db)


@router.patch("/users/me/onboarding/diabetic-path")
async def update_diabetic_path(
    payload: DiabeticPathUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_user.is_diabetic_path = payload.is_diabetic_path
    sync_patient_from_user(db, current_user)
    db.commit()
    db.refresh(current_user)
    return {"is_diabetic_path": current_user.is_diabetic_path}


@router.get("/users/me/clinical-profile", response_model=ClinicalProfileResponse)
async def get_clinical_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(PatientClinicalProfile)
        .filter(PatientClinicalProfile.patient_id == current_user.id)
        .first()
    )
    if not profile:
        return ClinicalProfileResponse()
    return ClinicalProfileResponse(
        diabetes_type=profile.diabetes_type,
        year_of_diagnosis=profile.year_of_diagnosis,
        years_since_diagnosis=profile.years_since_diagnosis,
        medication_list=profile.medication_list,
        on_insulin=profile.on_insulin,
        on_metformin=profile.on_metformin,
        on_statin=profile.on_statin,
        on_antihypertensive=profile.on_antihypertensive,
    )


@router.patch("/users/me/clinical-profile")
async def upsert_clinical_profile(
    payload: ClinicalProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.is_diabetic_path is not True:
        raise HTTPException(status_code=400, detail="Clinical profile is only for the diabetic monitoring path.")

    profile = (
        db.query(PatientClinicalProfile)
        .filter(PatientClinicalProfile.patient_id == current_user.id)
        .first()
    )
    if profile is None:
        profile = PatientClinicalProfile(patient_id=current_user.id)
        db.add(profile)

    data = payload.model_dump(exclude_unset=True)
    htn = data.pop("hypertension_history", None)
    for field, value in data.items():
        setattr(profile, field, value)

    if profile.year_of_diagnosis is not None:
        profile.years_since_diagnosis = years_since_diagnosis(profile.year_of_diagnosis)

    if htn is not None:
        meas = _latest_measurement(db, current_user.id)
        if meas:
            meas.hypertension_history = htn

    meas = _latest_measurement(db, current_user.id)
    if meas:
        signup_date = current_user.created_at.date() if current_user.created_at else date.today()
        upsert_visit_from_measurement(db, current_user, meas, signup_date, source="clinical_profile")

    sync_patient_from_user(db, current_user)
    db.commit()
    db.refresh(profile)
    return {"patient_id": profile.patient_id, "diabetes_type": profile.diabetes_type}


@router.post("/lab-uploads", response_model=LabUploadResponse)
async def upload_lab_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not _can_upload_lab_report(current_user):
        raise HTTPException(
            status_code=400,
            detail="Lab upload is not available for this account yet. Complete onboarding first.",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum upload size.")

    file_type = _normalize_file_type(file.filename or "upload", file.content_type)
    lab_dir = Path(settings.upload_dir) / "lab" / str(current_user.id)
    lab_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}.{file_type if file_type != 'jpeg' else 'jpg'}"
    dest = lab_dir / stored_name
    dest.write_bytes(content)

    relative = f"lab/{current_user.id}/{stored_name}"
    upload = LabUpload(
        patient_id=current_user.id,
        file_url=_public_file_url(relative),
        file_type=file_type,
        file_size_kb=max(1, len(content) // 1024),
        ocr_status="processing",
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    try:
        ocr_result = process_lab_file(dest, file_type)
    except Exception as ocr_exc:
        ocr_result = {
            "ocr_status": "partial",
            "ocr_raw_output": {"engine": "error", "error": str(ocr_exc)[:300]},
            "ocr_extracted_values": {},
            "ocr_confidence_score": 0.0,
        }
    upload.ocr_status = ocr_result["ocr_status"]
    upload.ocr_raw_output = ocr_result["ocr_raw_output"]
    upload.ocr_extracted_values = ocr_result["ocr_extracted_values"]
    upload.ocr_confidence_score = ocr_result["ocr_confidence_score"]
    upload.processed_at = datetime.utcnow()
    if current_user.onboarding_completed:
        _sync_medical_record_from_lab_upload(db, current_user, upload)
    db.commit()
    db.refresh(upload)
    return upload


@router.post("/medical-records/upload", response_model=MedicalRecordUploadResponse)
async def upload_medical_record_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Upload a report from the Records page — Paddle OCR + save as patient medical record."""
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum upload size.")

    file_type = _normalize_file_type(file.filename or "upload", file.content_type)
    lab_dir = Path(settings.upload_dir) / "lab" / str(current_user.id)
    lab_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}.{file_type if file_type != 'jpeg' else 'jpg'}"
    dest = lab_dir / stored_name
    dest.write_bytes(content)

    relative = f"lab/{current_user.id}/{stored_name}"
    upload = LabUpload(
        patient_id=current_user.id,
        file_url=_public_file_url(relative),
        file_type=file_type,
        file_size_kb=max(1, len(content) // 1024),
        ocr_status="processing",
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    try:
        ocr_result = process_medical_report_file(dest, file_type)
    except Exception as ocr_exc:
        ocr_result = {
            "ocr_status": "partial",
            "ocr_raw_output": {"engine": "error", "error": str(ocr_exc)[:300]},
            "ocr_extracted_values": {},
            "ocr_confidence_score": 0.0,
        }

    upload.ocr_status = ocr_result["ocr_status"]
    upload.ocr_raw_output = ocr_result["ocr_raw_output"]
    upload.ocr_extracted_values = ocr_result["ocr_extracted_values"]
    upload.ocr_confidence_score = ocr_result["ocr_confidence_score"]
    upload.processed_at = datetime.utcnow()

    record = _sync_medical_record_from_lab_upload(db, current_user, upload)
    db.commit()
    db.refresh(upload)
    db.refresh(record)

    return MedicalRecordUploadResponse(
        record=MedicalRecordSchema.model_validate(record),
        ocr_status=upload.ocr_status,
        ocr_extracted_values=upload.ocr_extracted_values,
        ocr_confidence_score=upload.ocr_confidence_score,
        lab_upload_id=upload.id,
    )


@router.get("/lab-uploads/current", response_model=LabUploadResponse)
async def get_current_lab_upload(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    upload = _latest_lab_upload(db, current_user.id)
    if not upload:
        raise HTTPException(status_code=404, detail="No lab upload found.")
    return upload


@router.patch("/lab-uploads/{upload_id}/review", response_model=LabUploadResponse)
async def review_lab_upload(
    upload_id: int,
    payload: LabUploadReviewUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    upload = db.query(LabUpload).filter(LabUpload.id == upload_id, LabUpload.patient_id == current_user.id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Lab upload not found.")

    corrected = payload.model_dump(exclude_unset=True, exclude={"review_confirmed"})
    base = upload.ocr_extracted_values or {}
    manually_corrected = False

    for field, value in corrected.items():
        if value is None:
            continue
        prev = base.get(field, {})
        prev_val = prev.get("value") if isinstance(prev, dict) else None
        if prev_val != value:
            manually_corrected = True
        base[field] = {
            "value": float(value),
            "confidence": 1.0 if manually_corrected else prev.get("confidence", 0.9),
            "status": "ok",
        }

    upload.ocr_extracted_values = base
    upload.manually_corrected = upload.manually_corrected or manually_corrected
    upload.review_confirmed = payload.review_confirmed
    db.commit()
    db.refresh(upload)
    return upload


def _clinical_profile(db: Session, user_id: int) -> Optional[PatientClinicalProfile]:
    return (
        db.query(PatientClinicalProfile)
        .filter(PatientClinicalProfile.patient_id == user_id)
        .first()
    )


def _medications_text(profile: Optional[PatientClinicalProfile]) -> str:
    if not profile or not profile.medication_list:
        return ""
    return profile.medication_list.strip()


def _sync_clinical_from_visit_fields(
    db: Session,
    user: User,
    *,
    duration_years: Optional[float] = None,
    diabetes_type: Optional[str] = None,
    medications: Optional[str] = None,
) -> None:
    profile = _clinical_profile(db, user.id)
    if profile is None:
        profile = PatientClinicalProfile(patient_id=user.id)
        db.add(profile)
    if duration_years is not None:
        profile.years_since_diagnosis = int(round(duration_years))
    if diabetes_type:
        profile.diabetes_type = diabetes_type
    if medications is not None:
        profile.medication_list = medications


def _visit_raw_overrides(
    db: Session,
    user: User,
    *,
    duration_years: Optional[float],
    visit_age: Optional[int],
    age: int,
    bmi: float,
    hba1c: Optional[float],
    systolic_bp: Optional[int],
    diastolic_bp: Optional[int],
    cholesterol_total: Optional[int],
    ldl_cholesterol: Optional[int],
    hdl_cholesterol: Optional[int],
    triglycerides: Optional[int],
    hematocrit: Optional[float],
    visit_gender: Optional[str],
    diabetes_type: Optional[str],
    hypertension_history: bool,
    medications: Optional[str],
) -> dict[str, Any]:
    profile = _clinical_profile(db, user.id)
    duration = duration_years
    if duration is None and profile and profile.years_since_diagnosis is not None:
        duration = float(profile.years_since_diagnosis)
    gender = normalize_gender_label(visit_gender or user.gender)
    dtype = normalize_diabetes_type_label(diabetes_type or (profile.diabetes_type if profile else None))
    meds = medications if medications is not None else _medications_text(profile)
    return build_raw_from_fields(
        duration_years=duration,
        age=visit_age or age,
        bmi=bmi,
        hba1c=hba1c,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        total_cholesterol=cholesterol_total,
        ldl=ldl_cholesterol,
        hdl=hdl_cholesterol,
        triglycerides=triglycerides,
        hematocrit=hematocrit,
        gender=gender,
        diabetes_type=dtype,
        hypertension=normalize_hypertension_label(hypertension_history),
        medications=meds or "",
    )


def _abdominal_obesity(gender: Optional[str], whr: float) -> bool:
    g = (gender or "").lower()
    if g in ("female", "f"):
        return whr > 0.85
    return whr > 0.90


def _latest_measurement(db: Session, user_id: int) -> Optional[PatientMeasurement]:
    return (
        db.query(PatientMeasurement)
        .filter(PatientMeasurement.patient_id == user_id, PatientMeasurement.is_current.is_(True))
        .order_by(PatientMeasurement.created_at.desc())
        .first()
    )


def _prediction_response(prediction: DiabetesPrediction) -> DiabetesPredictionResponse:
    from feature_constants import STAGE_LABELS
    label = STAGE_LABELS.get(prediction.diabetes_stage, "Unknown")
    if prediction.is_estimated:
        label = f"{label} (estimated)"
    return DiabetesPredictionResponse(
        id=prediction.id,
        diabetes_stage=prediction.diabetes_stage,
        diabetes_stage_label=label,
        diabetes_risk_score=prediction.diabetes_risk_score,
        diagnosed_diabetes=prediction.diagnosed_diabetes,
        retinopathy_risk=prediction.retinopathy_risk,
        nephropathy_risk=prediction.nephropathy_risk,
        neuropathy_risk=prediction.neuropathy_risk,
        staging_confidence=prediction.staging_confidence,
        risk_score_confidence=prediction.risk_score_confidence,
        triggered_by=prediction.triggered_by,
        model_name=prediction.model_name,
        is_estimated=bool(prediction.is_estimated),
        features_used=prediction.features_used,
        features_total=prediction.features_total,
        imputed_features=prediction.imputed_features,
        predicted_at=prediction.predicted_at,
    )


def _create_measurement_and_prediction(
    db: Session,
    user: User,
    *,
    source: str,
    lab_data_complete: bool,
    age: int,
    bmi: float,
    whr: float,
    abdominal_obesity: bool,
    smoking_status: str,
    alcohol_group: str,
    physical_activity_minutes: int,
    sleep_hours_per_day: float,
    screen_time_hours_per_day: float,
    family_history_diabetes: bool,
    hypertension_history: bool,
    cardiovascular_history: bool,
    height_cm: float,
    weight_kg: float,
    waist_cm: float,
    hip_cm: float,
    systolic_bp=None,
    diastolic_bp=None,
    heart_rate=None,
    cholesterol_total=None,
    ldl_cholesterol=None,
    hdl_cholesterol=None,
    triglycerides=None,
    years_since_quit=None,
    cigarettes_per_day=None,
    diet_quality=None,
    stress_level=None,
    hba1c=None,
    hematocrit=None,
    fasting_glucose=None,
    glucose_postprandial=None,
    insulin_level=None,
    source_lab_upload_id=None,
    partial: bool = False,
    visit_date: Optional[date] = None,
    visit_overrides: Optional[dict[str, Any]] = None,
) -> tuple[PatientMeasurement, DiabetesPrediction]:
    db.query(PatientMeasurement).filter(
        PatientMeasurement.patient_id == user.id,
        PatientMeasurement.is_current.is_(True),
    ).update({"is_current": False})

    measurement = PatientMeasurement(
        patient_id=user.id,
        source=source,
        source_lab_upload_id=source_lab_upload_id,
        age=age,
        abdominal_obesity=abdominal_obesity,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        heart_rate=heart_rate,
        cholesterol_total=cholesterol_total,
        ldl_cholesterol=ldl_cholesterol,
        hdl_cholesterol=hdl_cholesterol,
        triglycerides=triglycerides,
        smoking_status=smoking_status,
        alcohol_group=alcohol_group,
        physical_activity_minutes=physical_activity_minutes,
        sleep_hours_per_day=sleep_hours_per_day,
        screen_time_hours_per_day=screen_time_hours_per_day,
        family_history_diabetes=family_history_diabetes,
        hypertension_history=hypertension_history,
        cardiovascular_history=cardiovascular_history,
        height_cm=height_cm,
        weight_kg=weight_kg,
        waist_cm=waist_cm,
        hip_cm=hip_cm,
        lab_data_complete=lab_data_complete,
        years_since_quit=years_since_quit,
        cigarettes_per_day=cigarettes_per_day,
        diet_quality=diet_quality,
        stress_level=stress_level,
        hba1c=hba1c,
        hematocrit=hematocrit,
        fasting_glucose=fasting_glucose,
        is_current=True,
    )
    db.add(measurement)
    db.flush()
    db.refresh(measurement)

    imputed = list(LAB_FEATURE_KEYS) if partial else []
    pred_payload = predict_from_profile(
        user,
        measurement,
        partial=partial,
        imputed_fields=imputed,
        glucose_postprandial=glucose_postprandial,
        insulin_level=insulin_level,
    )

    vdate = visit_date or date.today()
    upsert_visit_from_measurement(
        db, user, measurement, vdate, source=source, overrides=visit_overrides
    )
    comp_result = predict_for_patient(db, user.id)
    if comp_result.get("error"):
        ret_prob, nep_prob, neu_prob = (
            pred_payload["retinopathy_risk"],
            pred_payload["nephropathy_risk"],
            pred_payload["neuropathy_risk"],
        )
        comp_model_name = pred_payload.get("model_name")
    else:
        ret_prob, nep_prob, neu_prob = complication_probs(comp_result)
        comp_model, comp_conf = complication_model_meta(comp_result)
        comp_model_name = f"complications_{comp_model}" if comp_model else pred_payload.get("model_name")

    prediction = DiabetesPrediction(
        patient_id=user.id,
        measurement_id=measurement.id,
        diabetes_stage=pred_payload["diabetes_stage"],
        diabetes_risk_score=pred_payload["diabetes_risk_score"],
        diagnosed_diabetes=pred_payload["diagnosed_diabetes"],
        retinopathy_risk=ret_prob,
        nephropathy_risk=nep_prob,
        neuropathy_risk=neu_prob,
        feature_importances=pred_payload.get("feature_importances"),
        staging_confidence=pred_payload.get("staging_confidence"),
        risk_score_confidence=pred_payload.get("risk_score_confidence"),
        triggered_by="onboarding",
        model_name=comp_model_name,
        is_estimated=pred_payload.get("is_estimated", False),
        features_used=pred_payload.get("features_used"),
        features_total=pred_payload.get("features_total", TOTAL_FEATURES),
        imputed_features=pred_payload.get("imputed_features"),
        complication_result=None if comp_result.get("error") else comp_result,
    )
    db.add(prediction)
    return measurement, prediction


@router.get("/users/me/risk-summary", response_model=RiskSummary)
async def get_risk_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ensure_lab_visits_for_patient(db, current_user)
    summary = build_risk_summary(current_user, db)
    if not summary:
        raise HTTPException(status_code=404, detail="No risk prediction available yet.")
    return summary


@router.post("/users/me/rerun-prediction", response_model=RiskSummary)
async def rerun_prediction(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not _has_health_features(db, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Complete your clinical information to receive AI predictions.",
        )

    measurement = _latest_measurement(db, current_user.id)
    if not measurement:
        raise HTTPException(status_code=404, detail="No health profile found.")

    ensure_lab_visits_for_patient(db, current_user)

    partial = not bool(measurement.lab_data_complete)
    prev_pred = _latest_prediction(db, current_user.id)
    imputed = list(prev_pred.imputed_features or []) if prev_pred and prev_pred.imputed_features else []
    if partial and not imputed:
        from feature_constants import LAB_FEATURE_KEYS
        imputed = list(LAB_FEATURE_KEYS)

    pred_payload = predict_from_profile(
        current_user, measurement, partial=partial, imputed_fields=imputed
    )
    comp_result = predict_for_patient(db, current_user.id)
    if comp_result.get("error"):
        ret_prob, nep_prob, neu_prob = (
            pred_payload["retinopathy_risk"],
            pred_payload["nephropathy_risk"],
            pred_payload["neuropathy_risk"],
        )
        comp_model_name = pred_payload.get("model_name")
    else:
        ret_prob, nep_prob, neu_prob = complication_probs(comp_result)
        comp_model, _ = complication_model_meta(comp_result)
        comp_model_name = f"complications_{comp_model}" if comp_model else pred_payload.get("model_name")

    prediction = DiabetesPrediction(
        patient_id=current_user.id,
        measurement_id=measurement.id,
        diabetes_stage=pred_payload["diabetes_stage"],
        diabetes_risk_score=pred_payload["diabetes_risk_score"],
        diagnosed_diabetes=pred_payload["diagnosed_diabetes"],
        retinopathy_risk=ret_prob,
        nephropathy_risk=nep_prob,
        neuropathy_risk=neu_prob,
        feature_importances=pred_payload.get("feature_importances"),
        staging_confidence=pred_payload.get("staging_confidence"),
        risk_score_confidence=pred_payload.get("risk_score_confidence"),
        triggered_by="dashboard_rerun",
        model_name=comp_model_name,
        is_estimated=pred_payload.get("is_estimated", False),
        features_used=pred_payload.get("features_used"),
        features_total=pred_payload.get("features_total", TOTAL_FEATURES),
        imputed_features=pred_payload.get("imputed_features"),
        complication_result=None if comp_result.get("error") else comp_result,
    )
    db.add(prediction)
    db.commit()

    summary = build_risk_summary(current_user, db)
    if not summary:
        raise HTTPException(status_code=500, detail="Failed to build risk summary.")
    return summary


def _latest_prediction(db: Session, user_id: int) -> Optional[DiabetesPrediction]:
    return (
        db.query(DiabetesPrediction)
        .filter(DiabetesPrediction.patient_id == user_id)
        .order_by(DiabetesPrediction.predicted_at.desc())
        .first()
    )


@router.get("/users/me/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from models import AppNotification
    rows = (
        db.query(AppNotification)
        .filter(
            AppNotification.patient_id == current_user.id,
            AppNotification.cancelled.is_(False),
        )
        .order_by(AppNotification.pinned.desc(), AppNotification.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": r.id,
            "type": r.notification_type,
            "title": r.title,
            "body": r.body,
            "pinned": r.pinned,
            "channel": r.channel,
        }
        for r in rows
    ]


@router.post("/onboarding/health-features", response_model=HealthFeaturesResponse)
async def submit_health_features(
    payload: HealthFeaturesCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    is_partial = payload.partial or current_user.onboarding_lab_opt_in is False

    if not is_partial and payload.source_lab_upload_id:
        upload = (
            db.query(LabUpload)
            .filter(LabUpload.id == payload.source_lab_upload_id, LabUpload.patient_id == current_user.id)
            .first()
        )
        if not upload or not upload.review_confirmed:
            raise HTTPException(status_code=400, detail="Confirm lab review before submitting health features.")

    if not is_partial and (not payload.systolic_bp or not payload.diastolic_bp or not payload.heart_rate):
        raise HTTPException(status_code=400, detail="Blood pressure and heart rate are required for a complete profile.")

    age = current_user.age
    if age is None and current_user.date_of_birth:
        age = calculate_age(current_user.date_of_birth)
    if age is None:
        raise HTTPException(status_code=400, detail="Patient age is required. Complete demographics first.")

    height_m = payload.height_cm / 100.0
    bmi = round(payload.weight_kg / (height_m * height_m), 2)
    whr = round(payload.waist_cm / max(payload.hip_cm, 1), 3)

    if payload.visit_gender:
        current_user.gender = payload.visit_gender.strip().lower()

    _sync_clinical_from_visit_fields(
        db,
        current_user,
        duration_years=payload.duration_years,
        diabetes_type=payload.diabetes_type,
        medications=payload.medications,
    )

    visit_overrides = complications_raw_from_payload(payload, current_user, age=age, bmi=bmi)

    source = "manual_partial" if is_partial else ("ocr" if payload.source_lab_upload_id else "manual")
    visit_date = resolve_visit_date(payload, current_user)
    measurement, prediction = _create_measurement_and_prediction(
        db,
        current_user,
        source=source,
        lab_data_complete=not is_partial,
        age=payload.visit_age or age,
        bmi=bmi,
        whr=whr,
        abdominal_obesity=_abdominal_obesity(current_user.gender, whr),
        smoking_status=payload.smoking_status,
        alcohol_group=payload.alcohol_group,
        physical_activity_minutes=payload.physical_activity_minutes,
        sleep_hours_per_day=payload.sleep_hours_per_day,
        screen_time_hours_per_day=payload.screen_time_hours_per_day,
        family_history_diabetes=payload.family_history_diabetes,
        hypertension_history=payload.hypertension_history,
        cardiovascular_history=payload.cardiovascular_history,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        waist_cm=payload.waist_cm,
        hip_cm=payload.hip_cm,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        heart_rate=None if is_partial else payload.heart_rate,
        cholesterol_total=payload.cholesterol_total,
        ldl_cholesterol=payload.ldl_cholesterol,
        hdl_cholesterol=payload.hdl_cholesterol,
        triglycerides=payload.triglycerides,
        years_since_quit=payload.years_since_quit,
        cigarettes_per_day=payload.cigarettes_per_day,
        diet_quality=payload.diet_quality,
        stress_level=payload.stress_level,
        hba1c=payload.hba1c,
        hematocrit=payload.hematocrit,
        fasting_glucose=payload.fasting_glucose,
        glucose_postprandial=payload.glucose_postprandial,
        insulin_level=payload.insulin_level,
        source_lab_upload_id=payload.source_lab_upload_id,
        partial=is_partial,
        visit_date=visit_date,
        visit_overrides=visit_overrides,
    )

    sync_patient_from_user(db, current_user)
    current_user.onboarding_completed = True
    current_user.lab_upload_pending = is_partial
    if is_partial:
        schedule_lab_reminders(db, current_user.id)
        ensure_pinned_lab_action(db, current_user.id)
    else:
        cancel_lab_reminders(db, current_user.id)
        from clinical_notification_service import cancel_clinical_profile_notification
        cancel_clinical_profile_notification(db, current_user.id)

    db.commit()
    db.refresh(measurement)
    db.refresh(prediction)

    filled = count_filled_features(measurement, current_user)
    return HealthFeaturesResponse(
        measurement_id=measurement.id,
        prediction=_prediction_response(prediction),
        onboarding_completed=True,
        lab_upload_pending=is_partial,
        profile_completeness_pct=profile_completeness_pct(filled),
    )


@router.post("/users/me/lab-visits", response_model=RiskSummary)
async def submit_lab_visit(
    payload: LabVisitSubmitCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Log or update a lab visit by date; reruns complications model on full visit history."""
    if not _has_health_features(db, current_user.id):
        raise HTTPException(status_code=400, detail="Complete Health Features onboarding first.")

    visit_date = payload.visit_date or date.today()
    gender_norm = normalize_gender_label(payload.gender)
    dtype_norm = normalize_diabetes_type_label(payload.diabetes_type)
    htn_norm = normalize_hypertension_label(payload.hypertension)

    if payload.gender:
        current_user.gender = payload.gender.strip().lower()
    _sync_clinical_from_visit_fields(
        db,
        current_user,
        duration_years=payload.duration_years,
        diabetes_type=payload.diabetes_type,
        medications=payload.medications,
    )

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
        gender=gender_norm,
        diabetes_type=dtype_norm,
        hypertension=htn_norm,
        medications=(payload.medications or "").strip(),
    )
    upsert_visit(db, current_user.id, visit_date, raw, source="lab_visit")

    measurement = _latest_measurement(db, current_user.id)
    if measurement:
        measurement.age = payload.age
        measurement.systolic_bp = payload.systolic_bp
        measurement.diastolic_bp = payload.diastolic_bp
        measurement.cholesterol_total = payload.total_cholesterol
        measurement.ldl_cholesterol = payload.ldl
        measurement.hdl_cholesterol = payload.hdl
        measurement.triglycerides = payload.triglycerides
        measurement.hba1c = payload.hba1c
        measurement.hematocrit = payload.hematocrit
        measurement.hypertension_history = htn_norm == "Yes"
        db.flush()

    partial = not bool(measurement and measurement.lab_data_complete)
    prev_pred = _latest_prediction(db, current_user.id)
    imputed = list(prev_pred.imputed_features or []) if prev_pred and prev_pred.imputed_features else []
    if partial and not imputed:
        imputed = list(LAB_FEATURE_KEYS)

    if not measurement:
        raise HTTPException(status_code=404, detail="No health profile found.")

    pred_payload = predict_from_profile(
        current_user, measurement, partial=partial, imputed_fields=imputed
    )
    comp_result = predict_for_patient(db, current_user.id)
    if comp_result.get("error"):
        ret_prob, nep_prob, neu_prob = (
            pred_payload["retinopathy_risk"],
            pred_payload["nephropathy_risk"],
            pred_payload["neuropathy_risk"],
        )
        comp_model_name = pred_payload.get("model_name")
    else:
        ret_prob, nep_prob, neu_prob = complication_probs(comp_result)
        comp_model, _ = complication_model_meta(comp_result)
        comp_model_name = f"complications_{comp_model}" if comp_model else pred_payload.get("model_name")

    prediction = DiabetesPrediction(
        patient_id=current_user.id,
        measurement_id=measurement.id if measurement else None,
        diabetes_stage=pred_payload["diabetes_stage"],
        diabetes_risk_score=pred_payload["diabetes_risk_score"],
        diagnosed_diabetes=pred_payload["diagnosed_diabetes"],
        retinopathy_risk=ret_prob,
        nephropathy_risk=nep_prob,
        neuropathy_risk=neu_prob,
        feature_importances=pred_payload.get("feature_importances"),
        staging_confidence=pred_payload.get("staging_confidence"),
        risk_score_confidence=pred_payload.get("risk_score_confidence"),
        triggered_by="lab_visit",
        model_name=comp_model_name,
        is_estimated=pred_payload.get("is_estimated", False),
        features_used=pred_payload.get("features_used"),
        features_total=pred_payload.get("features_total", TOTAL_FEATURES),
        imputed_features=pred_payload.get("imputed_features"),
        complication_result=None if comp_result.get("error") else comp_result,
    )
    db.add(prediction)
    sync_patient_from_user(db, current_user)
    db.commit()

    summary = build_risk_summary(current_user, db)
    if not summary:
        raise HTTPException(status_code=500, detail="Failed to build risk summary.")
    return summary


@router.post("/onboarding/complete-lab-data", response_model=HealthFeaturesResponse)
async def complete_lab_data(
    payload: CompleteLabDataCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.lab_upload_pending:
        raise HTTPException(status_code=400, detail="No pending lab upload for this account.")

    prev = _latest_measurement(db, current_user.id)
    if not prev:
        raise HTTPException(status_code=400, detail="No existing health profile found.")

    visit_date = payload.visit_date or date.today()
    measurement, prediction = _create_measurement_and_prediction(
        db,
        current_user,
        source="ocr" if payload.source_lab_upload_id else "manual",
        lab_data_complete=True,
        age=prev.age,
        bmi=prev.bmi,
        whr=prev.waist_to_hip_ratio,
        abdominal_obesity=prev.abdominal_obesity,
        smoking_status=prev.smoking_status,
        alcohol_group=prev.alcohol_group,
        physical_activity_minutes=prev.physical_activity_minutes,
        sleep_hours_per_day=prev.sleep_hours_per_day,
        screen_time_hours_per_day=prev.screen_time_hours_per_day,
        family_history_diabetes=prev.family_history_diabetes,
        hypertension_history=prev.hypertension_history,
        cardiovascular_history=prev.cardiovascular_history,
        height_cm=prev.height_cm or 0,
        weight_kg=prev.weight_kg or 0,
        waist_cm=prev.waist_cm or 0,
        hip_cm=prev.hip_cm or 0,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        heart_rate=payload.heart_rate,
        cholesterol_total=payload.cholesterol_total,
        ldl_cholesterol=payload.ldl_cholesterol,
        hdl_cholesterol=payload.hdl_cholesterol,
        triglycerides=payload.triglycerides,
        hba1c=prev.hba1c,
        hematocrit=prev.hematocrit,
        source_lab_upload_id=payload.source_lab_upload_id,
        partial=False,
        visit_date=visit_date,
    )

    current_user.lab_upload_pending = False
    cancel_lab_reminders(db, current_user.id)
    db.commit()
    db.refresh(measurement)
    db.refresh(prediction)

    filled = count_filled_features(measurement, current_user)
    return HealthFeaturesResponse(
        measurement_id=measurement.id,
        prediction=_prediction_response(prediction),
        onboarding_completed=True,
        lab_upload_pending=False,
        profile_completeness_pct=profile_completeness_pct(filled),
    )
