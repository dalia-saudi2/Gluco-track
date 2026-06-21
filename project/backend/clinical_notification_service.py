"""In-app notifications prompting patients to complete their clinical profile."""

from __future__ import annotations

from sqlalchemy.orm import Session

from models import AppNotification

CLINICAL_PROFILE_TYPE = "clinical_profile_incomplete"
CLINICAL_PROFILE_TITLE = "Complete your health profile"
CLINICAL_PROFILE_BODY = (
    "Please complete your clinical information to enable diabetes prediction "
    "and complication risk assessment."
)


def ensure_clinical_profile_notification(db: Session, patient_id: int) -> None:
    existing = (
        db.query(AppNotification)
        .filter(
            AppNotification.patient_id == patient_id,
            AppNotification.notification_type == CLINICAL_PROFILE_TYPE,
            AppNotification.cancelled.is_(False),
        )
        .first()
    )
    if existing:
        return
    db.add(
        AppNotification(
            patient_id=patient_id,
            notification_type=CLINICAL_PROFILE_TYPE,
            channel="in_app",
            title=CLINICAL_PROFILE_TITLE,
            body=CLINICAL_PROFILE_BODY,
            pinned=True,
        )
    )


def cancel_clinical_profile_notification(db: Session, patient_id: int) -> int:
    pending = (
        db.query(AppNotification)
        .filter(
            AppNotification.patient_id == patient_id,
            AppNotification.notification_type == CLINICAL_PROFILE_TYPE,
            AppNotification.cancelled.is_(False),
        )
        .all()
    )
    for row in pending:
        row.cancelled = True
    return len(pending)
