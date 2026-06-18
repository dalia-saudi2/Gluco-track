"""API routes for patient glucose self-monitoring readings."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from glucose_readings_service import (
    build_dashboard_chart,
    check_consecutive_high_readings,
    classify_glucose_status,
    upsert_weekly_summary,
)
from models import GlucoseReading, User
from schemas import (
    GlucoseDashboardDayPoint,
    GlucoseDashboardResponse,
    GlucoseReadingCreate,
    GlucoseReadingCreatedResponse,
    GlucoseReadingListResponse,
    GlucoseReadingResponse,
    GlucoseWeeklySummaryResponse,
)

router = APIRouter(prefix="/api/patients", tags=["glucose-readings"])


def _assert_patient_access(current_user: User, patient_id: int) -> None:
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized for this patient")


@router.get("/{patient_id}/glucose-readings", response_model=GlucoseReadingListResponse)
async def list_glucose_readings(
    patient_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    q = db.query(GlucoseReading).filter(GlucoseReading.patient_id == patient_id)
    total = q.count()
    q = q.order_by(
        GlucoseReading.measured_at.asc() if order == "asc" else GlucoseReading.measured_at.desc()
    )
    items = q.offset((page - 1) * limit).limit(limit).all()
    return GlucoseReadingListResponse(
        items=items,
        page=page,
        limit=limit,
        total=total,
    )


@router.get("/{patient_id}/glucose-readings/dashboard", response_model=GlucoseDashboardResponse)
async def glucose_dashboard(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    data = build_dashboard_chart(db, patient_id)
    summary = data["weekly_summary"]
    weekly = None
    if summary:
        weekly = GlucoseWeeklySummaryResponse(
            week_start=summary.week_start.date().isoformat(),
            avg_value=summary.avg_value,
            min_value=summary.min_value,
            max_value=summary.max_value,
            readings_count=summary.readings_count,
            days_in_range=summary.days_in_range,
            days_elevated=summary.days_elevated,
            days_high=summary.days_high,
        )
    return GlucoseDashboardResponse(
        days=[GlucoseDashboardDayPoint(**d) for d in data["days"]],
        weekly_summary=weekly,
        today_value=data["today_value"],
        today_day=data["today_day"],
        today_status=data["today_status"],
    )


@router.post("/{patient_id}/glucose-readings", response_model=GlucoseReadingCreatedResponse, status_code=201)
async def create_glucose_reading(
    patient_id: int,
    payload: GlucoseReadingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)

    measured_at = payload.measured_at
    if measured_at.tzinfo is None:
        measured_at = measured_at.replace(tzinfo=timezone.utc)

    status = classify_glucose_status(payload.value_mgdl, payload.reading_type.value)

    reading = GlucoseReading(
        patient_id=patient_id,
        value_mgdl=payload.value_mgdl,
        reading_type=payload.reading_type.value,
        measured_at=measured_at,
        status=status,
        notes=payload.notes,
        source=payload.source.value,
    )
    db.add(reading)
    db.flush()

    upsert_weekly_summary(db, patient_id, measured_at)
    check_consecutive_high_readings(db, patient_id)
    db.commit()
    db.refresh(reading)

    return GlucoseReadingCreatedResponse(
        id=reading.id,
        status=reading.status,
        measured_at=reading.measured_at,
    )
