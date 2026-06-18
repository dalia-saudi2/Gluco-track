"""Daily water intake tracking with calendar-day reset."""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from models import WaterIntakeDaily, WaterIntakeLog

DEFAULT_GOAL_ML = 2500
ML_PER_CUP = 250


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def get_or_create_today(db: Session, patient_id: int, *, goal_ml: int = DEFAULT_GOAL_ML) -> WaterIntakeDaily:
    today = _today_utc()
    row = (
        db.query(WaterIntakeDaily)
        .filter(WaterIntakeDaily.patient_id == patient_id, WaterIntakeDaily.intake_date == today)
        .first()
    )
    if row:
        return row
    row = WaterIntakeDaily(
        patient_id=patient_id,
        intake_date=today,
        total_ml=0,
        goal_ml=goal_ml,
        log_count=0,
    )
    db.add(row)
    db.flush()
    return row


def add_water(db: Session, patient_id: int, amount_ml: int) -> WaterIntakeDaily:
    if amount_ml <= 0 or amount_ml > 5000:
        raise ValueError("amount_ml must be between 1 and 5000")

    today = _today_utc()
    daily = get_or_create_today(db, patient_id)

    log = WaterIntakeLog(
        patient_id=patient_id,
        intake_date=today,
        amount_ml=amount_ml,
        logged_at=datetime.now(timezone.utc),
    )
    db.add(log)
    daily.total_ml += amount_ml
    daily.log_count += 1
    db.flush()
    return daily


def get_last_logged_at(db: Session, patient_id: int) -> datetime | None:
    log = (
        db.query(WaterIntakeLog)
        .filter(WaterIntakeLog.patient_id == patient_id)
        .order_by(WaterIntakeLog.logged_at.desc())
        .first()
    )
    return log.logged_at if log else None


def daily_to_payload(row: WaterIntakeDaily, *, last_logged_at: datetime | None = None) -> dict:
    goal = row.goal_ml or DEFAULT_GOAL_ML
    cups = row.total_ml / ML_PER_CUP
    glasses_filled = min(10, int((row.total_ml / goal) * 10)) if goal > 0 else 0
    if row.total_ml >= goal:
        glasses_filled = 10
    return {
        "intake_date": row.intake_date.isoformat(),
        "total_ml": row.total_ml,
        "total_liters": round(row.total_ml / 1000, 2),
        "goal_ml": goal,
        "goal_liters": round(goal / 1000, 2),
        "log_count": row.log_count,
        "cups_equivalent": round(cups, 1),
        "glasses_filled": glasses_filled,
        "glasses_total": 10,
        "goal_reached": row.total_ml >= goal,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "last_logged_at": last_logged_at.isoformat() if last_logged_at else None,
    }
