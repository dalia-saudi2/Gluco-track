"""Schedule and cancel lab-upload reminder notifications."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from sqlalchemy.orm import Session

from models import AppNotification

REMINDER_SCHEDULE: List[tuple[int, str, str, str]] = [
    (0, "push", "Complete your health profile", "Upload your lab results to get a full diabetes risk score."),
    (3, "push", "Your risk score is still estimated", "A quick lab upload takes 30 seconds."),
    (7, "push", "Profile still incomplete", "Upload your results or book a lab test today."),
    (14, "push", "Half your risk factors are still unknown", "An incomplete profile means an incomplete picture of your health."),
    (30, "push", "Your doctor needs the full picture", "Upload lab results or book a test — it only takes a moment."),
    (60, "push", "Need help finding a lab?", "We can help you find a lab near you. Upload when ready."),
]


def schedule_lab_reminders(db: Session, patient_id: int, base_time: datetime | None = None) -> None:
    base = base_time or datetime.utcnow()
    for days_offset, channel, title, body in REMINDER_SCHEDULE:
        scheduled = base + timedelta(days=days_offset)
        if days_offset == 0:
            scheduled = base + timedelta(hours=8)
        db.add(
            AppNotification(
                patient_id=patient_id,
                notification_type="lab_upload_reminder",
                channel=channel,
                title=title,
                body=body,
                scheduled_at=scheduled,
                pinned=days_offset == 0,
            )
        )


def cancel_lab_reminders(db: Session, patient_id: int) -> int:
    pending = (
        db.query(AppNotification)
        .filter(
            AppNotification.patient_id == patient_id,
            AppNotification.notification_type == "lab_upload_reminder",
            AppNotification.cancelled.is_(False),
            AppNotification.sent_at.is_(None),
        )
        .all()
    )
    for row in pending:
        row.cancelled = True
    return len(pending)


def ensure_pinned_lab_action(db: Session, patient_id: int) -> None:
    existing = (
        db.query(AppNotification)
        .filter(
            AppNotification.patient_id == patient_id,
            AppNotification.notification_type == "lab_upload_reminder",
            AppNotification.pinned.is_(True),
            AppNotification.cancelled.is_(False),
        )
        .first()
    )
    if existing:
        return
    db.add(
        AppNotification(
            patient_id=patient_id,
            notification_type="lab_upload_reminder",
            channel="in_app",
            title="Action required: Complete your health profile",
            body="Your risk score is based on partial data. Upload lab results to unlock a full prediction.",
            pinned=True,
        )
    )
