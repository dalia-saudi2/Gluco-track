#!/usr/bin/env python3
"""
Script to update all existing Arabic data to English
This will update appointments, medications, and medical records
"""

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Appointment, MedicalRecord, Medication, Message
from datetime import datetime
import json

# Translation mappings
APPOINTMENT_TRANSLATIONS = {
    "د. أحمد محمد": "Dr. Sarah Johnson",
    "د. سارة علي": "Dr. Michael Chen",
    "د. محمود حسن": "Dr. Emily Rodriguez",
    "د. فاطمة إبراهيم": "Dr. David Williams",
    "د. خالد محمود": "Dr. Lisa Anderson",
    "عيادة المقطم": "Main Clinic",
    "مركز القلب": "Cardiology Center",
    "عيادة المعادي": "Main Clinic",
    "مركز الأشعة": "Radiology Center",
    "غرفة 101": "Room 101",
    "غرفة 102": "Room 102",
    "غرفة 103": "Room 103",
    "غرفة 205": "Room 205",
    "فحص دوري": "Routine checkup",
    "استشارة عامة": "General Consultation",
    "قلب": "Cardiology",
    "مختبر": "Lab Review",
    "أشعة": "Imaging",
    "متابعة ضغط الدم": "Blood pressure follow-up",
    "مراجعة نتائج التحاليل": "Lab results review",
    "اكتمل - نتائج طبيعية": "Completed - Normal results",
    "اكتمل": "Completed"
}

MEDICAL_RECORD_TRANSLATIONS = {
    "تحليل صورة الدم الكاملة": "Complete Blood Count",
    "تحليل السكر": "Blood Glucose Test",
    "تحليل الكوليسترول": "Cholesterol Test",
    "أشعة الصدر": "Chest X-Ray",
    "ملخص الفحص الدوري السنوي": "Annual Physical Summary",
    "مختبر النيل": "LabCorp",
    "مركز الأشعة": "Radiology Associates",
    "جميع القيم في المعدل الطبيعي. الهيموجلوبين: 14.2 جم/ديسيلتر، كرات الدم البيضاء: 7.2": "All values within normal range. Hemoglobin: 14.2 g/dL, White blood cells: 7.2 K/μL",
    "مستوى السكر في الدم: 95 مجم/ديسيلتر - طبيعي": "Blood glucose level: 95 mg/dL - Normal",
    "الكوليسترول الكلي: 180 مجم/ديسيلتر - طبيعي": "Total cholesterol: 180 mg/dL - Normal",
    "الرئتان سليمتان، لا توجد نتائج حادة. حجم القلب طبيعي.": "Clear lung fields, no acute findings. Heart size normal.",
    "الصحة العامة جيدة. ضغط الدم تحت السيطرة. الاستمرار في الأدوية الحالية.": "Overall health good. Blood pressure controlled. Continue current medications."
}

MEDICATION_TRANSLATIONS = {
    "أسبرين": "Aspirin",
    "باراسيتامول": "Paracetamol",
    "فيتامين د": "Vitamin D",
    "كالسيوم": "Calcium",
    "قلب": "Cardiovascular",
    "مسكن": "Pain Relief",
    "مكمل غذائي": "Supplement",
    "جرعة منخفضة لصحة القلب": "Low dose for heart health",
    "يؤخذ مع الطعام": "Take with food",
    "يؤخذ مع وجبة الإفطار": "Take with breakfast",
    "81 مجم": "81mg",
    "500 مجم": "500mg",
    "1000 وحدة": "1000 IU",
    "مرة يومياً": "Once daily",
    "مرتين يومياً": "Twice daily"
}

MESSAGE_TRANSLATIONS = {
    "د. أحمد محمد": "Dr. Sarah Johnson",
    "الصيدلية": "Pharmacy",
    "نتائج التحاليل جاهزة للمراجعة. يرجى التحقق من السجلات.": "Your lab results are ready for review. Please check your records.",
    "وصفتك الطبية جاهزة للاستلام.": "Your prescription is ready for pickup."
}

def translate_text(text, translations):
    """Translate text using translation dictionary"""
    if not text:
        return text
    # Direct match
    if text in translations:
        return translations[text]
    # Partial match for locations
    for arabic, english in translations.items():
        if arabic in text:
            text = text.replace(arabic, english)
    return text

def update_all_to_english():
    """Update all Arabic data to English"""
    db = SessionLocal()
    
    try:
        print("="*50)
        print("Updating All Data to English")
        print("="*50)
        
        # Update Appointments
        print("\nUpdating appointments...")
        appointments = db.query(Appointment).all()
        updated_appointments = 0
        for apt in appointments:
            updated = False
            if apt.doctor_name and any(ar in apt.doctor_name for ar in APPOINTMENT_TRANSLATIONS.keys()):
                apt.doctor_name = translate_text(apt.doctor_name, APPOINTMENT_TRANSLATIONS)
                updated = True
            if apt.location and any(ar in apt.location for ar in APPOINTMENT_TRANSLATIONS.keys()):
                apt.location = translate_text(apt.location, APPOINTMENT_TRANSLATIONS)
                updated = True
            if apt.notes and any(ar in apt.notes for ar in APPOINTMENT_TRANSLATIONS.keys()):
                apt.notes = translate_text(apt.notes, APPOINTMENT_TRANSLATIONS)
                updated = True
            if apt.appointment_type and any(ar in apt.appointment_type for ar in APPOINTMENT_TRANSLATIONS.keys()):
                apt.appointment_type = translate_text(apt.appointment_type, APPOINTMENT_TRANSLATIONS)
                updated = True
            if updated:
                updated_appointments += 1
        print(f"   Updated {updated_appointments} appointments")
        
        # Update Medical Records
        print("\nUpdating medical records...")
        records = db.query(MedicalRecord).all()
        updated_records = 0
        for record in records:
            updated = False
            if record.title and any(ar in record.title for ar in MEDICAL_RECORD_TRANSLATIONS.keys()):
                record.title = translate_text(record.title, MEDICAL_RECORD_TRANSLATIONS)
                updated = True
            if record.provider and any(ar in record.provider for ar in MEDICAL_RECORD_TRANSLATIONS.keys()):
                record.provider = translate_text(record.provider, MEDICAL_RECORD_TRANSLATIONS)
                updated = True
            if record.content and any(ar in record.content for ar in MEDICAL_RECORD_TRANSLATIONS.keys()):
                record.content = translate_text(record.content, MEDICAL_RECORD_TRANSLATIONS)
                updated = True
            if updated:
                updated_records += 1
        print(f"   Updated {updated_records} medical records")
        
        # Update Medications
        print("\nUpdating medications...")
        medications = db.query(Medication).all()
        updated_medications = 0
        for med in medications:
            updated = False
            if med.name and any(ar in med.name for ar in MEDICATION_TRANSLATIONS.keys()):
                med.name = translate_text(med.name, MEDICATION_TRANSLATIONS)
                updated = True
            if med.dosage and any(ar in med.dosage for ar in MEDICATION_TRANSLATIONS.keys()):
                med.dosage = translate_text(med.dosage, MEDICATION_TRANSLATIONS)
                updated = True
            if med.frequency and any(ar in med.frequency for ar in MEDICATION_TRANSLATIONS.keys()):
                med.frequency = translate_text(med.frequency, MEDICATION_TRANSLATIONS)
                updated = True
            if med.category and any(ar in med.category for ar in MEDICATION_TRANSLATIONS.keys()):
                med.category = translate_text(med.category, MEDICATION_TRANSLATIONS)
                updated = True
            if med.notes and any(ar in med.notes for ar in MEDICATION_TRANSLATIONS.keys()):
                med.notes = translate_text(med.notes, MEDICATION_TRANSLATIONS)
                updated = True
            if updated:
                updated_medications += 1
        print(f"   Updated {updated_medications} medications")
        
        # Update Messages
        print("\nUpdating messages...")
        messages = db.query(Message).all()
        updated_messages = 0
        for msg in messages:
            updated = False
            if msg.sender and any(ar in msg.sender for ar in MESSAGE_TRANSLATIONS.keys()):
                msg.sender = translate_text(msg.sender, MESSAGE_TRANSLATIONS)
                updated = True
            if msg.content and any(ar in msg.content for ar in MESSAGE_TRANSLATIONS.keys()):
                msg.content = translate_text(msg.content, MESSAGE_TRANSLATIONS)
                updated = True
            if updated:
                updated_messages += 1
        print(f"   Updated {updated_messages} messages")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "="*50)
        print("SUCCESS: All data updated to English!")
        print("="*50)
        print(f"\nSummary:")
        print(f"   - Appointments: {updated_appointments}")
        print(f"   - Medical Records: {updated_records}")
        print(f"   - Medications: {updated_medications}")
        print(f"   - Messages: {updated_messages}")
        print(f"\nTip: Refresh the dashboard to see the updated data!")
        
    except Exception as e:
        print(f"\nERROR: Failed to update data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_all_to_english()
