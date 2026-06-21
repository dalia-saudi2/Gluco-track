from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, JSON, Computed, Date, UniqueConstraint
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
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    ethnicity = Column(String, nullable=True)
    education_level = Column(String, nullable=True)
    education_major = Column(String, nullable=True)
    employment_status = Column(String, nullable=True)
    income_level = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    marital_status = Column(String, nullable=True)
    caregiver_name = Column(String, nullable=True)
    caregiver_phone = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    is_diabetic_path = Column(Boolean, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    onboarding_lab_opt_in = Column(Boolean, nullable=True)
    lab_upload_pending = Column(Boolean, default=False)
    # Personalized insulin therapy parameters (mg/dL per unit; grams carb per unit)
    isf_mg_dl_per_unit = Column(Float, nullable=True)
    icr_grams_per_unit = Column(Float, nullable=True)
    dexcom_refresh_token_enc = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    zoom_oauth = relationship("ZoomOAuthToken", back_populates="user", uselist=False)
    
    # Relationships: Links this user to their related data in other tables
    appointments = relationship("Appointment", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")
    medications = relationship("Medication", back_populates="patient")
    messages = relationship("Message", back_populates="patient")
    patient_profile = relationship("Patient", back_populates="user", uselist=False)


class Patient(Base):
    """Group 1 — demographics & identity (1:1 with users; same integer id in dev SQLite)."""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    date_of_birth = Column(DateTime, nullable=True)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    ethnicity = Column(String, nullable=False)
    education_level = Column(Integer, nullable=False)
    employment_status = Column(String, nullable=False)
    income_level = Column(Integer, nullable=False)
    nationality = Column(String, nullable=True)
    marital_status = Column(String, nullable=True)
    caregiver_name = Column(String, nullable=True)
    caregiver_phone = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    is_diabetic_path = Column(Boolean, nullable=True)
    lab_upload_pending = Column(Boolean, default=False)
    onboarding_complete = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="patient_profile")

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
    visit_mode = Column(String, default="in_person")  # in_person | telehealth
    telehealth_platform = Column(String)  # zoom
    meeting_url = Column(String)
    meeting_provider = Column(String)  # zoom
    meeting_id = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("User", back_populates="appointments")

class ZoomOAuthToken(Base):
    """Encrypted Zoom OAuth tokens for clinician/host accounts."""
    __tablename__ = "zoom_oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    access_token_enc = Column(Text, nullable=False)
    refresh_token_enc = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    zoom_user_id = Column(String, nullable=True)
    scope = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="zoom_oauth")


class ZoomConsultation(Base):
    """Active or historical Zoom telemedicine sessions."""
    __tablename__ = "zoom_consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    host_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    zoom_meeting_id = Column(String, nullable=False)
    join_url = Column(String, nullable=False)
    start_url = Column(String, nullable=True)
    topic = Column(String, default="Medical Consultation")
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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


class LabUpload(Base):
    __tablename__ = "lab_uploads"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # jpeg, png, pdf
    file_size_kb = Column(Integer, nullable=True)
    ocr_status = Column(String, default="pending")  # pending, processing, success, partial, failed
    ocr_raw_output = Column(JSON, nullable=True)
    ocr_extracted_values = Column(JSON, nullable=True)
    ocr_confidence_score = Column(Float, nullable=True)
    manually_corrected = Column(Boolean, default=False)
    review_confirmed = Column(Boolean, default=False)
    lab_date = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    patient = relationship("User", backref="lab_uploads")


class PatientMeasurement(Base):
    __tablename__ = "patient_measurements"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    source = Column(String, default="manual")
    source_lab_upload_id = Column(Integer, ForeignKey("lab_uploads.id"), nullable=True)
    lab_data_complete = Column(Boolean, default=True)
    is_current = Column(Boolean, default=True)
    age = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    bmi = Column(
        Float,
        Computed("ROUND(weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)), 2)", persisted=True),
        nullable=False,
    )
    bmi_group = Column(
        String,
        Computed(
            "CASE "
            "WHEN (weight_kg / ((height_cm / 100.0) * (height_cm / 100.0))) < 18.5 THEN 'underweight' "
            "WHEN (weight_kg / ((height_cm / 100.0) * (height_cm / 100.0))) < 25 THEN 'normal' "
            "WHEN (weight_kg / ((height_cm / 100.0) * (height_cm / 100.0))) < 30 THEN 'overweight' "
            "ELSE 'obese' END",
            persisted=True,
        ),
        nullable=True,
    )
    waist_cm = Column(Float, nullable=False)
    hip_cm = Column(Float, nullable=False)
    waist_to_hip_ratio = Column(
        Float,
        Computed("ROUND(waist_cm / hip_cm, 3)", persisted=True),
        nullable=False,
    )
    abdominal_obesity = Column(Boolean, default=False)
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    smoking_status = Column(String, nullable=False)
    years_since_quit = Column(Integer, nullable=True)
    cigarettes_per_day = Column(Integer, nullable=True)
    alcohol_group = Column(String, nullable=False)
    physical_activity_minutes = Column(Integer, nullable=False)
    activity_level = Column(
        String,
        Computed(
            "CASE "
            "WHEN physical_activity_minutes = 0 THEN 'sedentary' "
            "WHEN physical_activity_minutes < 90 THEN 'light' "
            "WHEN physical_activity_minutes < 210 THEN 'moderate' "
            "ELSE 'active' END",
            persisted=True,
        ),
        nullable=True,
    )
    sleep_hours_per_day = Column(Float, nullable=False)
    screen_time_hours_per_day = Column(Float, nullable=False)
    diet_quality = Column(String, nullable=True)
    stress_level = Column(Integer, nullable=True)
    steps_per_day = Column(Integer, nullable=True)
    family_history_diabetes = Column(Boolean, nullable=False)
    hypertension_history = Column(Boolean, nullable=False)
    cardiovascular_history = Column(Boolean, nullable=False)
    cholesterol_total = Column(Integer, nullable=True)
    ldl_cholesterol = Column(Integer, nullable=True)
    hdl_cholesterol = Column(Integer, nullable=True)
    triglycerides = Column(Integer, nullable=True)
    hba1c = Column(Float, nullable=True)
    hematocrit = Column(Float, nullable=True)
    fasting_glucose = Column(Float, nullable=True)
    creatinine = Column(Float, nullable=True)
    egfr = Column(Float, nullable=True)
    urine_acr = Column(Float, nullable=True)
    alt = Column(Float, nullable=True)
    tsh = Column(Float, nullable=True)
    measured_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", backref="patient_measurements")
    lab_upload = relationship("LabUpload")


class PatientClinicalProfile(Base):
    """Group 2 — diabetes-specific clinical facts (1:1 with patient/user)."""
    __tablename__ = "patient_clinical_profile"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    diabetes_type = Column(String, nullable=True)  # type1, type2, unknown
    year_of_diagnosis = Column(Integer, nullable=True)
    years_since_diagnosis = Column(Integer, nullable=True)
    on_insulin = Column(Boolean, nullable=True)
    insulin_regimen = Column(String, nullable=True)  # basal, basal_bolus, pump
    on_sglt2i = Column(Boolean, nullable=True)
    on_metformin = Column(Boolean, nullable=True)
    on_statin = Column(Boolean, nullable=True)
    on_antihypertensive = Column(Boolean, nullable=True)
    medication_list = Column(Text, nullable=True)
    last_eye_exam_date = Column(DateTime, nullable=True)
    last_kidney_function_date = Column(DateTime, nullable=True)
    last_foot_exam_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("User", backref="clinical_profile", uselist=False)


class PatientLabVisit(Base):
    """One lab report per calendar day — feeds the complications LSTM/XGBoost models."""
    __tablename__ = "patient_lab_visits"
    __table_args__ = (UniqueConstraint("patient_id", "visit_date", name="uq_patient_lab_visit_date"),)

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    visit_date = Column(Date, nullable=False, index=True)
    source = Column(String, nullable=False, default="manual")
    duration_years = Column(Float, nullable=True)
    age = Column(Integer, nullable=False)
    bmi = Column(Float, nullable=False)
    hba1c = Column(Float, nullable=True)
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    total_cholesterol = Column(Integer, nullable=True)
    ldl = Column(Integer, nullable=True)
    hdl = Column(Integer, nullable=True)
    triglycerides = Column(Integer, nullable=True)
    hematocrit = Column(Float, nullable=True)
    gender = Column(String, nullable=False)
    diabetes_type = Column(String, nullable=False)
    hypertension = Column(String, nullable=False)
    medications = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("User", backref="lab_visits")


class DiabetesPrediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    measurement_id = Column(Integer, ForeignKey("patient_measurements.id"), nullable=False)
    diabetes_stage = Column(Integer, nullable=False)
    diabetes_risk_score = Column(Float, nullable=False)
    diagnosed_diabetes = Column(Boolean, default=False)
    retinopathy_risk = Column(Float, nullable=False)
    nephropathy_risk = Column(Float, nullable=False)
    neuropathy_risk = Column(Float, nullable=False)
    feature_importances = Column(JSON, nullable=True)
    staging_confidence = Column(Float, nullable=True)
    risk_score_confidence = Column(Float, nullable=True)
    triggered_by = Column(String, default="onboarding")
    model_name = Column(String, nullable=True)
    is_estimated = Column(Boolean, default=False)
    features_used = Column(Integer, nullable=True)
    features_total = Column(Integer, default=25)
    imputed_features = Column(JSON, nullable=True)
    complication_result = Column(JSON, nullable=True)
    predicted_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", backref="predictions")
    measurement = relationship("PatientMeasurement")


class AppNotification(Base):
    __tablename__ = "app_notifications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notification_type = Column(String, nullable=False)
    channel = Column(String, default="push")
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    cancelled = Column(Boolean, default=False)
    pinned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", backref="app_notifications")


class GlucoseReading(Base):
    """Self-monitoring glucose readings (lightweight, high frequency)."""
    __tablename__ = "glucose_readings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    value_mgdl = Column(Integer, nullable=False)
    reading_type = Column(String, nullable=False)  # fasting | post_meal | random | bedtime
    measured_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String, nullable=False)  # low | normal | elevated | high
    notes = Column(Text, nullable=True)
    source = Column(String, default="manual", nullable=False)  # manual | device_sync | ocr
    device_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", backref="glucose_readings")


class GlucoseWeeklySummary(Base):
    __tablename__ = "glucose_weekly_summaries"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    week_start = Column(DateTime, nullable=False)
    avg_value = Column(Float, nullable=False)
    min_value = Column(Integer, nullable=False)
    max_value = Column(Integer, nullable=False)
    readings_count = Column(Integer, nullable=False)
    days_in_range = Column(Integer, nullable=False)
    days_elevated = Column(Integer, nullable=False)
    days_high = Column(Integer, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient = relationship("User", backref="glucose_weekly_summaries")


class WaterIntakeDaily(Base):
    """One row per patient per calendar day — resets every 24h at midnight UTC."""
    __tablename__ = "water_intake_daily"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    intake_date = Column(Date, nullable=False, index=True)
    total_ml = Column(Integer, nullable=False, default=0)
    goal_ml = Column(Integer, nullable=False, default=2500)
    log_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient = relationship("User", backref="water_intake_daily")


class MealNutritionLog(Base):
    """Individual meal nutrition entries within a calendar day."""
    __tablename__ = "meal_nutrition_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    intake_date = Column(Date, nullable=False, index=True)
    source = Column(String, nullable=False)  # photo | usda | manual
    meal_label = Column(String, nullable=True)
    calories = Column(Float, nullable=False, default=0)
    carbs_g = Column(Float, nullable=False, default=0)
    protein_g = Column(Float, nullable=False, default=0)
    fat_g = Column(Float, nullable=False, default=0)
    foods_json = Column(JSON, nullable=True)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("User", backref="meal_nutrition_logs")


class WaterIntakeLog(Base):
    """Individual water add events within a day."""
    __tablename__ = "water_intake_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    intake_date = Column(Date, nullable=False, index=True)
    amount_ml = Column(Integer, nullable=False)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("User", backref="water_intake_logs")


class HealthActivityDaily(Base):
    """One row per authenticated user per calendar day — steps, sleep, calories from Health Connect."""
    __tablename__ = "health_activity_daily"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_date = Column(Date, nullable=False, index=True)
    steps = Column(Integer, nullable=False, default=0)
    sleep_hours = Column(Float, nullable=False, default=0.0)
    calories_burned = Column(Integer, nullable=False, default=0)
    source = Column(String, nullable=False, default="health_connect")
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient = relationship("User", backref="health_activity_daily")


class DoctorConversation(Base):
    """Threaded chat between a patient and their doctor."""
    __tablename__ = "doctor_conversations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    doctor_name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    last_message_preview = Column(String, nullable=True)
    last_message_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    patient_unread_count = Column(Integer, default=0)
    doctor_unread_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", backref="doctor_conversations")
    messages = relationship(
        "DoctorConversationMessage",
        back_populates="conversation",
        order_by="DoctorConversationMessage.created_at",
    )


class DoctorConversationMessage(Base):
    __tablename__ = "doctor_conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("doctor_conversations.id"), nullable=False, index=True)
    sender = Column(String, nullable=False)  # patient, doctor
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("DoctorConversation", back_populates="messages")
