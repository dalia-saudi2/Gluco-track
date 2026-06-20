"""Per-user daily health activity storage (steps, sleep, calories) from Health Connect / HealthKit."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Literal

from sqlalchemy.orm import Session

from models import HealthActivityDaily

PeriodType = Literal["day", "week", "month"]


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def _parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


def upsert_daily_records(
    db: Session,
    patient_id: int,
    records: list[dict],
    *,
    source: str = "health_connect",
) -> int:
    """Upsert daily rows; returns number of rows written."""
    written = 0
    now = datetime.now(timezone.utc)

    for item in records:
        activity_date = _parse_date(item["activity_date"])
        steps = max(0, int(item.get("steps") or 0))
        sleep_hours = max(0.0, float(item.get("sleep_hours") or 0))
        calories_burned = max(0, int(item.get("calories_burned") or 0))

        row = (
            db.query(HealthActivityDaily)
            .filter(
                HealthActivityDaily.patient_id == patient_id,
                HealthActivityDaily.activity_date == activity_date,
            )
            .first()
        )

        if row:
            row.steps = steps
            row.sleep_hours = round(sleep_hours, 2)
            row.calories_burned = calories_burned
            row.source = source
            row.synced_at = now
        else:
            db.add(
                HealthActivityDaily(
                    patient_id=patient_id,
                    activity_date=activity_date,
                    steps=steps,
                    sleep_hours=round(sleep_hours, 2),
                    calories_burned=calories_burned,
                    source=source,
                    synced_at=now,
                )
            )
        written += 1

    db.flush()
    return written


def get_today(db: Session, patient_id: int) -> HealthActivityDaily | None:
    today = _today_utc()
    return (
        db.query(HealthActivityDaily)
        .filter(
            HealthActivityDaily.patient_id == patient_id,
            HealthActivityDaily.activity_date == today,
        )
        .first()
    )


def get_history(db: Session, patient_id: int, days: int) -> list[HealthActivityDaily]:
    start = _today_utc() - timedelta(days=max(1, days) - 1)
    return (
        db.query(HealthActivityDaily)
        .filter(
            HealthActivityDaily.patient_id == patient_id,
            HealthActivityDaily.activity_date >= start,
        )
        .order_by(HealthActivityDaily.activity_date.asc())
        .all()
    )


def get_last_synced_at(db: Session, patient_id: int) -> datetime | None:
    row = (
        db.query(HealthActivityDaily.synced_at)
        .filter(HealthActivityDaily.patient_id == patient_id)
        .order_by(HealthActivityDaily.synced_at.desc())
        .first()
    )
    return row[0] if row else None


def row_to_dict(row: HealthActivityDaily) -> dict:
    return {
        "activity_date": row.activity_date.isoformat(),
        "steps": row.steps,
        "sleep_hours": row.sleep_hours,
        "calories_burned": row.calories_burned,
        "source": row.source,
        "synced_at": row.synced_at.isoformat() if row.synced_at else None,
    }


def history_to_payload(rows: list[HealthActivityDaily]) -> dict:
    return {
        "steps": [{"date": r.activity_date.isoformat(), "value": r.steps} for r in rows],
        "sleep": [{"date": r.activity_date.isoformat(), "value": r.sleep_hours} for r in rows],
        "calories": [{"date": r.activity_date.isoformat(), "value": r.calories_burned} for r in rows],
    }


def build_summary(db: Session, patient_id: int, period: PeriodType) -> dict:
    today = _today_utc()
    if period == "day":
        start = today
    elif period == "week":
        start = today - timedelta(days=6)
    else:
        start = today - timedelta(days=29)

    rows = (
        db.query(HealthActivityDaily)
        .filter(
            HealthActivityDaily.patient_id == patient_id,
            HealthActivityDaily.activity_date >= start,
            HealthActivityDaily.activity_date <= today,
        )
        .all()
    )

    if not rows:
        return {
            "period": period,
            "start_date": start.isoformat(),
            "end_date": today.isoformat(),
            "days_with_data": 0,
            "total_steps": 0,
            "avg_steps": 0,
            "avg_sleep_hours": 0.0,
            "total_calories": 0,
            "avg_calories": 0,
        }

    total_steps = sum(r.steps for r in rows)
    total_sleep = sum(r.sleep_hours for r in rows)
    total_calories = sum(r.calories_burned for r in rows)
    count = len(rows)

    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": today.isoformat(),
        "days_with_data": count,
        "total_steps": total_steps,
        "avg_steps": round(total_steps / count),
        "avg_sleep_hours": round(total_sleep / count, 1),
        "total_calories": total_calories,
        "avg_calories": round(total_calories / count),
    }
