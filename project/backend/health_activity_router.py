"""API routes for Health Connect / HealthKit daily activity sync."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from health_activity_service import (
    build_summary,
    get_history,
    get_last_synced_at,
    get_today,
    history_to_payload,
    row_to_dict,
    upsert_daily_records,
)
from models import User
from schemas import (
    HealthActivityHistoryResponse,
    HealthActivitySummaryResponse,
    HealthActivitySyncRequest,
    HealthActivitySyncResponse,
    HealthActivityTodayResponse,
)

router = APIRouter(prefix="/api/patients", tags=["health-activity"])


def _assert_patient_access(current_user: User, patient_id: int) -> None:
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized for this patient")


@router.get("/{patient_id}/health-activity/today", response_model=HealthActivityTodayResponse)
async def get_health_activity_today(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    row = get_today(db, patient_id)
    last_synced = get_last_synced_at(db, patient_id)
    if not row:
        today_str = datetime.now(timezone.utc).date().isoformat()
        return HealthActivityTodayResponse(
            activity_date=today_str,
            steps=0,
            sleep_hours=0.0,
            calories_burned=0,
            source=None,
            synced_at=last_synced.isoformat() if last_synced else None,
        )
    return HealthActivityTodayResponse(**row_to_dict(row))


@router.get("/{patient_id}/health-activity/history", response_model=HealthActivityHistoryResponse)
async def get_health_activity_history(
    patient_id: int,
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    rows = get_history(db, patient_id, days)
    payload = history_to_payload(rows)
    last_synced = get_last_synced_at(db, patient_id)
    return HealthActivityHistoryResponse(
        days=days,
        steps=payload["steps"],
        sleep=payload["sleep"],
        calories=payload["calories"],
        last_synced_at=last_synced.isoformat() if last_synced else None,
    )


@router.get("/{patient_id}/health-activity/summary", response_model=HealthActivitySummaryResponse)
async def get_health_activity_summary(
    patient_id: int,
    period: str = Query("week", pattern="^(day|week|month)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    return HealthActivitySummaryResponse(**build_summary(db, patient_id, period))  # type: ignore[arg-type]


@router.post("/{patient_id}/health-activity/sync", response_model=HealthActivitySyncResponse)
async def sync_health_activity(
    patient_id: int,
    payload: HealthActivitySyncRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    if not payload.records:
        raise HTTPException(status_code=400, detail="No records to sync")

    written = upsert_daily_records(
        db,
        patient_id,
        [r.model_dump() for r in payload.records],
        source=payload.source,
    )
    db.commit()
    last_synced = get_last_synced_at(db, patient_id)
    return HealthActivitySyncResponse(
        synced_count=written,
        last_synced_at=last_synced.isoformat() if last_synced else None,
    )
