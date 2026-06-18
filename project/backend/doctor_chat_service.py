"""Doctor–patient threaded messaging."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import DoctorConversation, DoctorConversationMessage, User


def _preview(content: str, limit: int = 80) -> str:
    text = (content or "").strip()
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1]}…"


def list_patient_conversations(db: Session, patient_id: int) -> list[DoctorConversation]:
    return (
        db.query(DoctorConversation)
        .filter(DoctorConversation.patient_id == patient_id)
        .order_by(DoctorConversation.last_message_at.desc())
        .all()
    )


def list_doctor_conversations(db: Session, doctor_name: str) -> list[DoctorConversation]:
    return (
        db.query(DoctorConversation)
        .filter(DoctorConversation.doctor_name == doctor_name)
        .order_by(DoctorConversation.last_message_at.desc())
        .all()
    )


def get_conversation(db: Session, conversation_id: int) -> DoctorConversation | None:
    return db.query(DoctorConversation).filter(DoctorConversation.id == conversation_id).first()


def conversation_to_summary(
    conv: DoctorConversation,
    *,
    for_patient: bool,
    patient_name: str | None = None,
) -> dict:
    return {
        "id": conv.id,
        "doctor_name": conv.doctor_name,
        "title": conv.title,
        "last_message_preview": conv.last_message_preview,
        "last_message_at": conv.last_message_at,
        "unread_count": conv.patient_unread_count if for_patient else conv.doctor_unread_count,
        "patient_name": patient_name,
    }


def conversation_to_detail(conv: DoctorConversation, patient_name: str | None = None) -> dict:
    return {
        "id": conv.id,
        "doctor_name": conv.doctor_name,
        "title": conv.title,
        "patient_name": patient_name,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "created_at": m.created_at,
            }
            for m in conv.messages
        ],
    }


def mark_read_for_patient(db: Session, conv: DoctorConversation) -> None:
    conv.patient_unread_count = 0


def mark_read_for_doctor(db: Session, conv: DoctorConversation) -> None:
    conv.doctor_unread_count = 0


def add_message(
    db: Session,
    conv: DoctorConversation,
    *,
    sender: str,
    content: str,
) -> DoctorConversationMessage:
    text = content.strip()
    if not text:
        raise ValueError("Message cannot be empty")

    now = datetime.now(timezone.utc)
    message = DoctorConversationMessage(
        conversation_id=conv.id,
        sender=sender,
        content=text,
        created_at=now,
    )
    db.add(message)

    conv.last_message_preview = _preview(text)
    conv.last_message_at = now

    if sender == "patient":
        conv.doctor_unread_count = (conv.doctor_unread_count or 0) + 1
    else:
        conv.patient_unread_count = (conv.patient_unread_count or 0) + 1

    db.flush()
    return message


def ensure_sample_conversations(db: Session, patient: User) -> None:
    """Seed starter threads from upcoming doctors when none exist."""
    existing = (
        db.query(DoctorConversation)
        .filter(DoctorConversation.patient_id == patient.id)
        .count()
    )
    if existing:
        return

    from models import Appointment as AppointmentModel

    appointments = (
        db.query(AppointmentModel)
        .filter(AppointmentModel.patient_id == patient.id)
        .order_by(AppointmentModel.appointment_date.desc())
        .limit(2)
        .all()
    )
    doctors = []
    for appt in appointments:
        if appt.doctor_name and appt.doctor_name not in doctors:
            doctors.append(appt.doctor_name)
    if not doctors:
        doctors = ["Dr. Sarah Johnson"]

    samples = [
        (
            doctors[0],
            "Follow-up on lab results",
            "doctor",
            "Your latest HbA1c is ready. Let me know if you have questions about the results.",
        ),
        (
            doctors[1] if len(doctors) > 1 else doctors[0],
            "Medication adjustment",
            "doctor",
            "Please continue your current dose and log glucose readings this week.",
        ),
    ]

    for doctor_name, title, sender, content in samples:
        conv = DoctorConversation(
            patient_id=patient.id,
            doctor_name=doctor_name,
            title=title,
            last_message_preview=_preview(content),
            patient_unread_count=1,
            doctor_unread_count=0,
        )
        db.add(conv)
        db.flush()
        db.add(
            DoctorConversationMessage(
                conversation_id=conv.id,
                sender=sender,
                content=content,
            )
        )
