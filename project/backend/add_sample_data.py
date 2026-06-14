#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to add sample data for existing users
This will add appointments, medications, and medical records to fill the dashboard
"""

import sys
import os
# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Appointment, MedicalRecord, Medication, Message
from datetime import datetime, timedelta

def add_sample_data_for_user(user_email: str = None, user_id: int = None, user_name: str = None):
    """Add sample data for a specific user"""
    db = SessionLocal()
    
    try:
        # Find the user
        # 1. User Identification Logic
        # We can find a user by ID, email, or name
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        elif user_email:
            user = db.query(User).filter(User.email == user_email).first()
        elif user_name:
            # Search by name (case insensitive, partial match)
            user = db.query(User).filter(User.full_name.ilike(f"%{user_name}%")).first()
        else:
            # If no specific user provided, find EVERY user in the database
            # and recursively call this function for each one
            users = db.query(User).all()
            if not users:
                print("❌ No users found. Please create a user first.")
                return
            
            print(f"Found {len(users)} user(s). Adding data for all users...")
            for u in users:
                print(f"\n--- Adding data for {u.full_name} ({u.email}) ---")
                add_sample_data_for_user(user_id=u.id)
            return
        
        if not user:
            print("❌ No user found. Please create a user first or provide a valid email/user_id.")
            return
        
        print(f"✅ Found user: {user.full_name} ({user.email})")
        print(f"   User ID: {user.id}")
        
        # 2. Safety Check: Report existing counts to avoid duplicates
        existing_appointments = db.query(Appointment).filter(Appointment.patient_id == user.id).count()
        existing_medications = db.query(Medication).filter(Medication.patient_id == user.id).count()
        existing_records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == user.id).count()
        
        print(f"\n📊 Current database state for this user:")
        print(f"   - Appointments: {existing_appointments}")
        print(f"   - Medications: {existing_medications}")
        print(f"   - Medical Records: {existing_records}")
        
        # Create sample appointments (future appointments for dashboard)
        print("\n📅 Creating appointments...")
        appointments = [
            Appointment(
                patient_id=user.id,
                doctor_name="Dr. Sarah Mohamed",
                appointment_date=datetime.now() + timedelta(days=3),
                duration=30,
                location="Main Clinic - Room 101",
                notes="Routine checkup",
                appointment_type="General Consultation",
                status="scheduled"
            ),
            
        ]
        
        for appointment in appointments:
            db.add(appointment)
        print(f"   ✅ Created {len(appointments)} appointments")
        
        # Create sample medical records (lab results for dashboard)
        print("\n🔬 Creating medical records...")
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
                record_data={
                    "value": "14.2",
                    "unit": "g/dL",
                    "reference_range": "12.0-16.0",
                    "status": "Normal"
                }
            ),
            MedicalRecord(
                patient_id=user.id,
                record_type="lab",
                title="Blood Glucose Test",
                date=datetime.now() - timedelta(days=8),
                provider="LabCorp",
                critical=False,
                content="Blood glucose level: 95 mg/dL - Normal",
                status="reviewed",
                record_data={
                    "value": "95",
                    "unit": "mg/dL",
                    "reference_range": "70-100",
                    "status": "Normal"
                }
            ),
            MedicalRecord(
                patient_id=user.id,
                record_type="lab",
                title="Cholesterol Test",
                date=datetime.now() - timedelta(days=12),
                provider="LabCorp",
                critical=False,
                content="Total cholesterol: 180 mg/dL - Normal",
                status="reviewed",
                record_data={
                    "value": "180",
                    "unit": "mg/dL",
                    "reference_range": "0-200",
                    "status": "Normal"
                }
            ),
            MedicalRecord(
                patient_id=user.id,
                record_type="imaging",
                title="Chest X-Ray",
                date=datetime.now() - timedelta(days=15),
                provider="Radiology Associates",
                critical=False,
                content="Clear lung fields, no acute findings. Heart size normal.",
                status="reviewed"
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
        print(f"   ✅ Created {len(medical_records)} medical records")
        
        # Create sample medications (active medications for dashboard)
        print("\n💊 Creating medications...")
        medications = [
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
            ),
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
                name="Vitamin D",
                dosage="1000 IU",
                frequency="Once daily",
                start_date=datetime.now() - timedelta(days=45),
                end_date=datetime.now() + timedelta(days=180),
                critical=False,
                category="Supplement",
                notes="Take with breakfast",
                is_active=True
            )
        ]
        
        for medication in medications:
            db.add(medication)
        print(f"   ✅ Created {len(medications)} medications")
        
        # Create sample messages
        print("\n📧 Creating messages...")
        messages = [
            Message(
                patient_id=user.id,
                sender="Dr. Sarah Johnson",
                content="Your lab results are ready for review. Please check your records.",
                message_type="notification",
                is_read=False,
                priority="normal"
            ),
            Message(
                patient_id=user.id,
                sender="Pharmacy",
                content="Your prescription is ready for pickup.",
                message_type="reminder",
                is_read=True,
                priority="low"
            )
        ]
        
        for message in messages:
            db.add(message)
        print(f"   ✅ Created {len(messages)} messages")
        
        # 6. Save changes to the database
        # This commits all the objects we added (appointments, records, meds, etc.)
        db.commit()
        
        print("\n" + "="*50)
        print("SUCCESS: Data added successfully!")
        print("="*50)
        print(f"\nData added:")
        print(f"   - Appointments: {len(appointments)}")
        print(f"   - Medical Records: {len(medical_records)}")
        print(f"   - Medications: {len(medications)}")
        print(f"   - Messages: {len(messages)}")
        print(f"\nTip: Refresh the dashboard to see the data!")
        
    except Exception as e:
        print(f"\nERROR: Failed to add data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    print("="*50)
    print("Adding Sample Data for Dashboard")
    print("="*50)
    print()
    
    # Check for command line arguments
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        # Check if it's an email or name
        if '@' in arg:
            print(f"Searching for user by email: {arg}")
            add_sample_data_for_user(user_email=arg)
        elif arg.isdigit():
            print(f"Searching for user by ID: {arg}")
            add_sample_data_for_user(user_id=int(arg))
        else:
            print(f"Searching for user by name: {arg}")
            add_sample_data_for_user(user_name=arg)
    else:
        print("No user specified, adding data for ALL users in database")
        add_sample_data_for_user()
