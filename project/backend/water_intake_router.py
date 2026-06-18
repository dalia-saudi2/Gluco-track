"""API routes for daily water intake tracking."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import User
from schemas import WaterIntakeAddRequest, WaterIntakeTodayResponse
from water_intake_service import add_water, daily_to_payload, get_last_logged_at, get_or_create_today

router = APIRouter(prefix="/api/patients", tags=["water-intake"])


def _assert_patient_access(current_user: User, patient_id: int) -> None:
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized for this patient")


@router.get("/{patient_id}/water-intake/today", response_model=WaterIntakeTodayResponse)
async def get_today_water_intake(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    row = get_or_create_today(db, patient_id)
    last_at = get_last_logged_at(db, patient_id)
    db.commit()
    db.refresh(row)
    return WaterIntakeTodayResponse(**daily_to_payload(row, last_logged_at=last_at))


@router.post("/{patient_id}/water-intake/add", response_model=WaterIntakeTodayResponse)
async def add_water_intake(
    patient_id: int,
    payload: WaterIntakeAddRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    try:
        row = add_water(db, patient_id, payload.amount_ml)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    last_at = get_last_logged_at(db, patient_id)
    db.commit()
    db.refresh(row)
    return WaterIntakeTodayResponse(**daily_to_payload(row, last_logged_at=last_at))
