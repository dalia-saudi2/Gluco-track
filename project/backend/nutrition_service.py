"""Daily meal nutrition tracking — aggregates logs per calendar day (UTC)."""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import MealNutritionLog

DEFAULT_CALORIES_GOAL = 1900
DEFAULT_CARBS_G_GOAL = 200
DEFAULT_PROTEIN_G_GOAL = 80
DEFAULT_FAT_G_GOAL = 60


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def log_meal(
    db: Session,
    patient_id: int,
    *,
    source: str,
    calories: float = 0,
    carbs_g: float = 0,
    protein_g: float = 0,
    fat_g: float = 0,
    meal_label: str | None = None,
    foods_json: list | None = None,
) -> MealNutritionLog:
    if source not in ("photo", "usda", "manual"):
        raise ValueError("source must be photo, usda, or manual")

    row = MealNutritionLog(
        patient_id=patient_id,
        intake_date=_today_utc(),
        source=source,
        meal_label=meal_label,
        calories=max(0.0, float(calories or 0)),
        carbs_g=max(0.0, float(carbs_g or 0)),
        protein_g=max(0.0, float(protein_g or 0)),
        fat_g=max(0.0, float(fat_g or 0)),
        foods_json=foods_json,
        logged_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    return row


def get_last_logged_at(db: Session, patient_id: int) -> datetime | None:
    return (
        db.query(func.max(MealNutritionLog.logged_at))
        .filter(MealNutritionLog.patient_id == patient_id)
        .scalar()
    )


def build_today_summary(db: Session, patient_id: int) -> dict:
    today = _today_utc()
    totals = (
        db.query(
            func.coalesce(func.sum(MealNutritionLog.calories), 0),
            func.coalesce(func.sum(MealNutritionLog.carbs_g), 0),
            func.coalesce(func.sum(MealNutritionLog.protein_g), 0),
            func.coalesce(func.sum(MealNutritionLog.fat_g), 0),
            func.count(MealNutritionLog.id),
        )
        .filter(
            MealNutritionLog.patient_id == patient_id,
            MealNutritionLog.intake_date == today,
        )
        .one()
    )
    calories_total, carbs_total, protein_total, fat_total, meal_count = totals
    last_at = get_last_logged_at(db, patient_id)

    return {
        "intake_date": today.isoformat(),
        "calories_total": round(float(calories_total), 1),
        "calories_goal": DEFAULT_CALORIES_GOAL,
        "carbs_g_total": round(float(carbs_total), 1),
        "carbs_g_goal": DEFAULT_CARBS_G_GOAL,
        "protein_g_total": round(float(protein_total), 1),
        "protein_g_goal": DEFAULT_PROTEIN_G_GOAL,
        "fat_g_total": round(float(fat_total), 1),
        "fat_g_goal": DEFAULT_FAT_G_GOAL,
        "meal_count": int(meal_count or 0),
        "last_logged_at": last_at.isoformat() if last_at else None,
    }
