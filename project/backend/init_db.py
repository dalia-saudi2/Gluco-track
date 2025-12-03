#!/usr/bin/env python3
"""
Database initialization script for Healthcare Patient Portal
Creates tables and populates with sample data
"""

from sqlalchemy.orm import Session
from database import SessionLocal, create_tables
from models import User, Appointment, MedicalRecord, Medication, Message, ChatSession, ChatMessage
from auth import get_password_hash
from datetime import datetime, timedelta
import uuid

def create_sample_data():
    """Create sample data for testing"""
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(User).first():
            print("Sample data already exists. Skipping initialization.")
            return
        
        print("Creating sample data...")
        
        # Create sample user
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("test123"),
            full_name="John Doe",
            phone="+1234567890",
            date_of_birth=datetime(1990, 5, 15),
            blood_type="O+",
            emergency_contact="Jane Doe - +1234567891",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"Created user: {user.email}")
        
        # Create sample appointments
        appointments = [
            Appointment(
                patient_id=user.id,
                doctor_name="Dr. Sarah Johnson",
                appointment_date=datetime.now() + timedelta(days=7),
                duration=30,
                location="Main Clinic - Room 101",
                notes="Annual checkup",
                appointment_type="General Consultation",
                status="scheduled"
            ),
            Appointment(
                patient_id=user.id,
                doctor_name="Dr. Michael Chen",
                appointment_date=datetime.now() + timedelta(days=14),
                duration=45,
                location="Cardiology Center - Room 205",
                notes="Follow-up on blood pressure",
                appointment_type="Cardiology",
                status="scheduled"
            ),
            Appointment(
                patient_id=user.id,
                doctor_name="Dr. Emily Rodriguez",
                appointment_date=datetime.now() - timedelta(days=5),
                duration=30,
                location="Main Clinic - Room 102",
                notes="Completed - Blood test results normal",
                appointment_type="Lab Results Review",
                status="completed"
            )
        ]
        
        for appointment in appointments:
            db.add(appointment)
        
        # Create sample medical records
        medical_records = [
            MedicalRecord(
                patient_id=user.id,
                record_type="lab",
                title="Complete Blood Count",
                date=datetime.now() - timedelta(days=5),
                provider="LabCorp",
                critical=False,
                content="All values within normal range. Hemoglobin: 14.2 g/dL, White blood cells: 7.2 K/μL",
                status="reviewed",
                file_url="https://example.com/reports/cbc_2024.pdf"
            ),
            MedicalRecord(
                patient_id=user.id,
                record_type="imaging",
                title="Chest X-Ray",
                date=datetime.now() - timedelta(days=10),
                provider="Radiology Associates",
                critical=False,
                content="Clear lung fields, no acute findings. Heart size normal.",
                status="reviewed",
                file_url="https://example.com/reports/chest_xray_2024.pdf"
            ),
            MedicalRecord(
                patient_id=user.id,
                record_type="summary",
                title="Annual Physical Summary",
                date=datetime.now() - timedelta(days=30),
                provider="Dr. Sarah Johnson",
                critical=False,
                content="Overall health good. Blood pressure controlled. Continue current medications.",
                status="reviewed"
            )
        ]
        
        for record in medical_records:
            db.add(record)
        
        # Create sample medications
        medications = [
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
                is_active=True
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
                is_active=True
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
                is_active=True
            )
        ]
        
        for medication in medications:
            db.add(medication)
        
        # Create sample messages
        messages = [
            Message(
                patient_id=user.id,
                sender="Dr. Sarah Johnson",
                content="Your lab results are ready for review. Please check your records.",
                message_type="notification",
                is_read=False
            ),
            Message(
                patient_id=user.id,
                sender="Pharmacy",
                content="Your prescription for Lisinopril is ready for pickup.",
                message_type="reminder",
                is_read=True
            )
        ]
        
        for message in messages:
            db.add(message)
        
        # Create sample chat session
        chat_session = ChatSession(
            patient_id=user.id,
            session_id=str(uuid.uuid4())
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)
        
        # Create sample chat messages
        chat_messages = [
            ChatMessage(
                session_id=chat_session.session_id,
                content="Hello! How can I help you today?",
                message_type="text",
                sender="ai"
            ),
            ChatMessage(
                session_id=chat_session.session_id,
                content="I'd like to schedule an appointment",
                message_type="text",
                sender="user"
            )
        ]
        
        for chat_message in chat_messages:
            db.add(chat_message)
        
        db.commit()
        print("Sample data created successfully!")
        print(f"- User: {user.email}")
        print(f"- Appointments: {len(appointments)}")
        print(f"- Medical Records: {len(medical_records)}")
        print(f"- Medications: {len(medications)}")
        print(f"- Messages: {len(messages)}")
        print(f"- Chat Session: {chat_session.session_id}")
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main function to initialize database"""
    print("Initializing Healthcare Patient Portal Database...")
    
    # Create tables
    print("Creating database tables...")
    create_tables()
    print("Tables created successfully!")
    
    # Create sample data
    create_sample_data()
    
    print("Database initialization complete!")

if __name__ == "__main__":
    main()

