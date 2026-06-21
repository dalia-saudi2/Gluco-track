"""API routes for daily meal nutrition tracking."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import User
from nutrition_service import build_today_summary, log_meal
from schemas import NutritionMealLogRequest, NutritionTodayResponse

router = APIRouter(prefix="/api/patients", tags=["nutrition"])


def _assert_patient_access(current_user: User, patient_id: int) -> None:
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized for this patient")


@router.get("/{patient_id}/nutrition/today", response_model=NutritionTodayResponse)
async def get_today_nutrition(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    return NutritionTodayResponse(**build_today_summary(db, patient_id))


@router.post("/{patient_id}/nutrition/meals", response_model=NutritionTodayResponse)
async def log_meal_nutrition(
    patient_id: int,
    payload: NutritionMealLogRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    try:
        log_meal(
            db,
            patient_id,
            source=payload.source,
            calories=payload.calories,
            carbs_g=payload.carbs_g,
            protein_g=payload.protein_g,
            fat_g=payload.fat_g,
            meal_label=payload.meal_label,
            foods_json=payload.foods_json,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.commit()
    return NutritionTodayResponse(**build_today_summary(db, patient_id))
