from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# =================================================================
# DATABASE MODELS
# =================================================================
# These classes define the structure of your database tables
# using SQLAlchemy ORM.
class User(Base):
    """Stores core patient profile information and account credentials."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    google_id = Column(String, unique=True, index=True)
    google_picture = Column(String)
    phone = Column(String)
    date_of_birth = Column(DateTime)
    blood_type = Column(String)
    bmi = Column(String)
    blood_pressure = Column(String)
    emergency_contact = Column(String)
    address = Column(String)
    gender = Column(String)
    age = Column(Integer, nullable=True)
    ethnicity = Column(String, nullable=True)
    education_level = Column(String, nullable=True)
    employment_status = Column(String, nullable=True)
    income_level = Column(String, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    onboarding_lab_opt_in = Column(Boolean, nullable=True)
    # Personalized insulin therapy parameters (mg/dL per unit; grams carb per unit)
    isf_mg_dl_per_unit = Column(Float, nullable=True)
    icr_grams_per_unit = Column(Float, nullable=True)
    dexcom_refresh_token_enc = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships: Links this user to their related data in other tables
    appointments = relationship("Appointment", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")
    medications = relationship("Medication", back_populates="patient")
    messages = relationship("Message", back_populates="patient")

class Appointment(Base):
    """Stores scheduled medical visits between patients and doctors."""
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_name = Column(String, nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    duration = Column(Integer, default=30)  # minutes
    location = Column(String)
    notes = Column(Text)
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled
    appointment_type = Column(String)  # consultation, follow-up, emergency
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("User", back_populates="appointments")

class MedicalRecord(Base):
    """Stores clinical data including lab results, imaging reports, and summaries."""
    __tablename__ = "medical_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    record_type = Column(String, nullable=False)  # lab, imaging, summary, prescription
    title = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    provider = Column(String)
    status = Column(String, default="new")  # new, reviewed, pending
    critical = Column(Boolean, default=False)
    file_url = Column(String)
    content = Column(Text)
    record_data = Column(JSON)  # For storing additional data like test values
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("User", back_populates="medical_records")

class Medication(Base):
    """Tracks active and historical medications prescribed to the patient."""
    __tablename__ = "medications"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    critical = Column(Boolean, default=False)
    category = Column(String)  # prescription, supplement, vitamin
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("User", back_populates="medications")

class Message(Base):
    """Stores communications between patients and the clinic/doctors."""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    sender = Column(String, nullable=False)  # patient, doctor, system
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # text, image, file
    is_read = Column(Boolean, default=False)
    priority = Column(String, default="normal")  # low, normal, high, urgent
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    patient = relationship("User", back_populates="messages")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.session_id"))
    sender = Column(String, nullable=False)  # user, ai
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")
    message_data = Column(JSON)  # For storing AI response metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("ChatSession")
