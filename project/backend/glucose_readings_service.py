"""Glucose self-monitoring: classification, weekly summaries, alerts."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from models import AppNotification, GlucoseReading, GlucoseWeeklySummary

READING_TYPES = {"fasting", "post_meal", "random", "bedtime"}
STATUSES = {"low", "normal", "elevated", "high"}


def classify_glucose_status(value_mgdl: int, reading_type: str) -> str:
    """Server-side classification — never trust client status."""
    rt = reading_type or "random"
    if rt == "fasting":
        if value_mgdl < 70:
            return "low"
        if value_mgdl <= 100:
            return "normal"
        if value_mgdl <= 125:
            return "elevated"
        return "high"
    if rt == "post_meal":
        if value_mgdl < 70:
            return "low"
        if value_mgdl <= 140:
            return "normal"
        if value_mgdl <= 199:
            return "elevated"
        return "high"
    # random / bedtime — general thresholds
    if value_mgdl < 70:
        return "low"
    if value_mgdl <= 140:
        return "normal"
    if value_mgdl <= 180:
        return "elevated"
    return "high"


def _week_start_monday(dt: datetime) -> datetime:
    d = dt.date()
    monday = d - timedelta(days=d.weekday())
    return datetime.combine(monday, datetime.min.time())


def _day_chart_status(avg_value: float) -> str:
    return classify_glucose_status(int(round(avg_value)), "random")


def upsert_weekly_summary(db: Session, patient_id: int, ref: Optional[datetime] = None) -> None:
    ref = ref or datetime.now(timezone.utc)
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=timezone.utc)
    week_start = _week_start_monday(ref)
    week_end = week_start + timedelta(days=7)

    rows = (
        db.query(GlucoseReading)
        .filter(
            GlucoseReading.patient_id == patient_id,
            GlucoseReading.measured_at >= week_start,
            GlucoseReading.measured_at < week_end,
        )
        .all()
    )
    if not rows:
        existing = (
            db.query(GlucoseWeeklySummary)
            .filter(
                GlucoseWeeklySummary.patient_id == patient_id,
                GlucoseWeeklySummary.week_start == week_start,
            )
            .first()
        )
        if existing:
            db.delete(existing)
        return

    values = [r.value_mgdl for r in rows]
    statuses = [r.status for r in rows]

    # Per-calendar-day worst status for badge counts
    by_day: dict = {}
    for r in rows:
        day_key = r.measured_at.date()
        by_day.setdefault(day_key, []).append(r.status)

    def day_worst(sts: List[str]) -> str:
        if "high" in sts:
            return "high"
        if "elevated" in sts:
            return "elevated"
        if "low" in sts:
            return "low"
        return "normal"

    day_statuses = [day_worst(sts) for sts in by_day.values()]
    days_in_range = sum(1 for s in day_statuses if s in ("normal", "elevated"))
    days_elevated = sum(1 for s in day_statuses if s == "elevated")
    days_high = sum(1 for s in day_statuses if s == "high")

    summary = (
        db.query(GlucoseWeeklySummary)
        .filter(
            GlucoseWeeklySummary.patient_id == patient_id,
            GlucoseWeeklySummary.week_start == week_start,
        )
        .first()
    )
    payload = {
        "avg_value": round(sum(values) / len(values), 1),
        "min_value": min(values),
        "max_value": max(values),
        "readings_count": len(rows),
        "days_in_range": days_in_range,
        "days_elevated": days_elevated,
        "days_high": days_high,
    }
    if summary:
        for k, v in payload.items():
            setattr(summary, k, v)
        summary.updated_at = datetime.now(timezone.utc)
    else:
        summary = GlucoseWeeklySummary(patient_id=patient_id, week_start=week_start, **payload)
        db.add(summary)


def check_consecutive_high_readings(db: Session, patient_id: int) -> None:
    recent = (
        db.query(GlucoseReading)
        .filter(GlucoseReading.patient_id == patient_id)
        .order_by(GlucoseReading.measured_at.desc())
        .limit(3)
        .all()
    )
    if len(recent) < 3:
        return
    if not all(r.status == "high" for r in recent):
        return

    existing = (
        db.query(AppNotification)
        .filter(
            AppNotification.patient_id == patient_id,
            AppNotification.notification_type == "consecutive_high_glucose",
            AppNotification.cancelled == False,  # noqa: E712
            AppNotification.sent_at.is_(None),
        )
        .first()
    )
    if existing:
        return

    db.add(
        AppNotification(
            patient_id=patient_id,
            notification_type="consecutive_high_glucose",
            channel="push",
            title="High glucose readings",
            body="Your last 3 glucose readings have been high. Consider contacting your doctor.",
            pinned=True,
        )
    )


def build_dashboard_chart(db: Session, patient_id: int) -> dict:
    now = datetime.now(timezone.utc)
    today = now.date()
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    # Last 7 calendar days ending today
    start = datetime.combine(today - timedelta(days=6), datetime.min.time()).replace(tzinfo=timezone.utc)
    end = datetime.combine(today + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)

    rows = (
        db.query(GlucoseReading)
        .filter(
            GlucoseReading.patient_id == patient_id,
            GlucoseReading.measured_at >= start,
            GlucoseReading.measured_at < end,
        )
        .order_by(GlucoseReading.measured_at.asc())
        .all()
    )

    by_date: dict = {}
    for r in rows:
        dk = r.measured_at.date()
        by_date.setdefault(dk, []).append(r.value_mgdl)

    days = []
    for i in range(7):
        d = today - timedelta(days=6 - i)
        vals = by_date.get(d, [])
        avg = round(sum(vals) / len(vals), 1) if vals else None
        days.append(
            {
                "day": day_labels[d.weekday()],
                "value": avg,
                "date": d.isoformat(),
            }
        )

    week_start = _week_start_monday(now)
    summary = (
        db.query(GlucoseWeeklySummary)
        .filter(
            GlucoseWeeklySummary.patient_id == patient_id,
            GlucoseWeeklySummary.week_start == week_start,
        )
        .first()
    )

    today_vals = by_date.get(today, [])
    today_value = round(sum(today_vals) / len(today_vals), 1) if today_vals else None
    today_status = _day_chart_status(today_value) if today_value is not None else None

    if today_value is None and rows:
        latest = max(rows, key=lambda r: r.measured_at)
        if latest.measured_at.date() == today:
            today_value = float(latest.value_mgdl)
            today_status = latest.status

    return {
        "days": days,
        "weekly_summary": summary,
        "today_value": today_value,
        "today_day": day_labels[today.weekday()],
        "today_status": today_status,
    }
