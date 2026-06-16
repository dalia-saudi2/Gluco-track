#!/usr/bin/env python3
"""Re-add demo user test@example.com without removing other accounts."""

from __future__ import annotations

from datetime import datetime, timedelta
import uuid

from auth import get_password_hash
from database import SessionLocal
from models import (
    User,
    Appointment,
    MedicalRecord,
    Medication,
    Message,
    ChatSession,
    ChatMessage,
)

DEMO_EMAIL = "test@example.com"
DEMO_PASSWORD = "test123"


def restore_demo_account() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            print(f"Demo account already exists: {DEMO_EMAIL} (id={existing.id})")
            print(f"Password: {DEMO_PASSWORD}")
            return

        user = User(
            email=DEMO_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            full_name="John Doe",
            phone="+1234567890",
            date_of_birth=datetime(1990, 5, 15),
            blood_type="O+",
            emergency_contact="Jane Doe - +1234567891",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        for appointment in [
            Appointment(
                patient_id=user.id,
                doctor_name="Dr. Sarah Johnson",
                appointment_date=datetime.now() + timedelta(days=7),
                duration=30,
                location="Main Clinic - Room 101",
                notes="Annual checkup",
                appointment_type="General Consultation",
                status="scheduled",
            ),
            Appointment(
                patient_id=user.id,
                doctor_name="Dr. Michael Chen",
                appointment_date=datetime.now() + timedelta(days=14),
                duration=45,
                location="Cardiology Center - Room 205",
                notes="Follow-up on blood pressure",
                appointment_type="Cardiology",
                status="scheduled",
            ),
            Appointment(
                patient_id=user.id,
                doctor_name="Dr. Emily Rodriguez",
                appointment_date=datetime.now() - timedelta(days=5),
                duration=30,
                location="Main Clinic - Room 102",
                notes="Completed - Blood test results normal",
                appointment_type="Lab Results Review",
                status="completed",
            ),
        ]:
            db.add(appointment)

        for record in [
            MedicalRecord(
                patient_id=user.id,
                record_type="lab",
                title="Complete Blood Count",
                date=datetime.now() - timedelta(days=5),
                provider="LabCorp",
                critical=False,
                content="All values within normal range.",
                status="reviewed",
                file_url="https://example.com/reports/cbc_2024.pdf",
            ),
            MedicalRecord(
                patient_id=user.id,
                record_type="imaging",
                title="Chest X-Ray",
                date=datetime.now() - timedelta(days=10),
                provider="Radiology Associates",
                critical=False,
                content="Clear lung fields, no acute findings.",
                status="reviewed",
                file_url="https://example.com/reports/chest_xray_2024.pdf",
            ),
            MedicalRecord(
                patient_id=user.id,
                record_type="summary",
                title="Annual Physical Summary",
                date=datetime.now() - timedelta(days=30),
                provider="Dr. Sarah Johnson",
                critical=False,
                content="Overall health good. Continue current medications.",
                status="reviewed",
            ),
        ]:
            db.add(record)

        for medication in [
            Medication(
                patient_id=user.id,
                name="Lisinopril",
                dosage="10mg",
                frequency="Once daily",
                start_date=datetime.now() - timedelta(days=90),
                end_date=datetime.now() + timedelta(days=365),
                critical=False,
                category="Blood Pressure",
                notes="Take with food",
                is_active=True,
            ),
            Medication(
                patient_id=user.id,
                name="Metformin",
                dosage="500mg",
                frequency="Twice daily",
                start_date=datetime.now() - timedelta(days=60),
                end_date=datetime.now() + timedelta(days=180),
                critical=False,
                category="Diabetes",
                notes="Take with meals",
                is_active=True,
            ),
            Medication(
                patient_id=user.id,
                name="Aspirin",
                dosage="81mg",
                frequency="Once daily",
                start_date=datetime.now() - timedelta(days=120),
                end_date=None,
                critical=False,
                category="Cardiovascular",
                notes="Low dose for heart health",
                is_active=True,
            ),
        ]:
            db.add(medication)

        for message in [
            Message(
                patient_id=user.id,
                sender="Dr. Sarah Johnson",
                content="Your lab results are ready for review.",
                message_type="notification",
                is_read=False,
            ),
            Message(
                patient_id=user.id,
                sender="Pharmacy",
                content="Your prescription for Lisinopril is ready for pickup.",
                message_type="reminder",
                is_read=True,
            ),
        ]:
            db.add(message)

        chat_session = ChatSession(patient_id=user.id, session_id=str(uuid.uuid4()))
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)

        for chat_message in [
            ChatMessage(
                session_id=chat_session.session_id,
                content="Hello! How can I help you today?",
                message_type="text",
                sender="ai",
            ),
            ChatMessage(
                session_id=chat_session.session_id,
                content="I'd like to schedule an appointment",
                message_type="text",
                sender="user",
            ),
        ]:
            db.add(chat_message)

        db.commit()
        print(f"Demo account restored: {DEMO_EMAIL} (id={user.id})")
        print(f"Password: {DEMO_PASSWORD}")
    except Exception as e:
        db.rollback()
        raise SystemExit(f"Failed: {e}") from e
    finally:
        db.close()


if __name__ == "__main__":
    restore_demo_account()
