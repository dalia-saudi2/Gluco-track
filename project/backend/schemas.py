from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

from onboarding_validation import (
    validate_date_of_birth,
    validate_degree,
    validate_major,
    coerce_date_of_birth,
    parse_visit_date,
)

# Enums
class AppointmentStatus(str, Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"

class RecordType(str, Enum):
    lab = "lab"
    imaging = "imaging"
    summary = "summary"
    prescription = "prescription"

class MessagePriority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    blood_type: Optional[str] = None
    bmi: Optional[str] = None
    blood_pressure: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    ethnicity: Optional[str] = None
    education_level: Optional[str] = None
    education_major: Optional[str] = None
    employment_status: Optional[str] = None
    income_level: Optional[str] = None
    onboarding_completed: Optional[bool] = False
    onboarding_lab_opt_in: Optional[bool] = None
    lab_upload_pending: Optional[bool] = False
    is_diabetic_path: Optional[bool] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    caregiver_name: Optional[str] = None
    caregiver_phone: Optional[str] = None
    preferred_language: Optional[str] = None
    isf_mg_dl_per_unit: Optional[float] = None
    icr_grams_per_unit: Optional[float] = None
    # OAuth fields (read-only in responses)
    google_id: Optional[str] = None
    google_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if not normalized:
                raise ValueError("Email is required")
            return normalized
        return value

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, value):
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                raise ValueError("Full name is required")
            if len(normalized) > 120:
                raise ValueError("Full name must be at most 120 characters")
            return normalized
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError("Password must be at least 6 characters")
        if len(value) > 72:
            raise ValueError("Password must be at most 72 characters")
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return None
            if len(normalized) > 30:
                raise ValueError("Phone number must be at most 30 characters")
            return normalized
        return value

    @field_validator("age")
    @classmethod
    def validate_signup_age(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            raise ValueError("Age is required")
        if value < 18 or value > 100:
            raise ValueError("Age must be between 18 and 100")
        return value

    @field_validator("gender", mode="before")
    @classmethod
    def validate_signup_gender(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValueError("Gender is required")
        g = str(value).strip().lower()
        if g.startswith("f"):
            return "female"
        if g.startswith("m"):
            return "male"
        raise ValueError("Gender must be male or female")

    @field_validator("height_cm")
    @classmethod
    def validate_signup_height(cls, value: Optional[float]) -> float:
        if value is None:
            raise ValueError("Height is required")
        if value < 100 or value > 250:
            raise ValueError("Height must be between 100 and 250 cm")
        return float(value)

    @field_validator("weight_kg")
    @classmethod
    def validate_signup_weight(cls, value: Optional[float]) -> float:
        if value is None:
            raise ValueError("Weight is required")
        if value < 30 or value > 250:
            raise ValueError("Weight must be between 30 and 250 kg")
        return float(value)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    ethnicity: Optional[str] = None
    education_level: Optional[str] = None
    education_major: Optional[str] = None
    employment_status: Optional[str] = None
    income_level: Optional[str] = None
    onboarding_completed: Optional[bool] = None

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def parse_date_of_birth(cls, value):
        return coerce_date_of_birth(value)


class OnboardingDemographicsUpdate(BaseModel):
    age: Optional[int] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    education_level: Optional[str] = None
    education_major: Optional[str] = None
    employment_status: Optional[str] = None
    income_level: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    caregiver_name: Optional[str] = None
    caregiver_phone: Optional[str] = None
    preferred_language: Optional[str] = None
    onboarding_completed: Optional[bool] = None

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def parse_date_of_birth(cls, value):
        return coerce_date_of_birth(value)

    @field_validator('education_level')
    @classmethod
    def check_education_level(cls, value: Optional[str]) -> Optional[str]:
        validate_degree(value)
        return value

    @field_validator('education_major')
    @classmethod
    def normalize_education_major(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return value.strip()

    @model_validator(mode='after')
    def check_major_for_degree(self):
        validate_major(self.education_major, self.education_level)
        return self


class OnboardingLabChoiceUpdate(BaseModel):
    onboarding_lab_opt_in: bool
    onboarding_completed: Optional[bool] = None


class DiabeticPathUpdate(BaseModel):
    is_diabetic_path: bool


class ClinicalProfileResponse(BaseModel):
    diabetes_type: Optional[str] = None
    year_of_diagnosis: Optional[int] = None
    years_since_diagnosis: Optional[int] = None
    medication_list: Optional[str] = None
    on_insulin: Optional[bool] = None
    on_metformin: Optional[bool] = None
    on_statin: Optional[bool] = None
    on_antihypertensive: Optional[bool] = None


class ClinicalProfileUpdate(BaseModel):
    diabetes_type: Optional[str] = None
    year_of_diagnosis: Optional[int] = None
    on_insulin: Optional[bool] = None
    insulin_regimen: Optional[str] = None
    on_sglt2i: Optional[bool] = None
    on_metformin: Optional[bool] = None
    on_statin: Optional[bool] = None
    on_antihypertensive: Optional[bool] = None
    medication_list: Optional[str] = None
    last_eye_exam_date: Optional[datetime] = None
    last_kidney_function_date: Optional[datetime] = None
    last_foot_exam_date: Optional[datetime] = None
    hypertension_history: Optional[bool] = None


class OnboardingCompleteUpdate(BaseModel):
    onboarding_completed: bool = True


class DiabetesSettingsUpdate(BaseModel):
    """Insulin sensitivity factor (ISF): mg/dL drop per 1 unit rapid insulin.
    Carb ratio (ICR): grams of carbohydrate covered by 1 unit bolus."""
    isf_mg_dl_per_unit: Optional[float] = None
    icr_grams_per_unit: Optional[float] = None


class USDAFoodSearchHit(BaseModel):
    fdc_id: int
    description: str


class USDAFoodNutrients(BaseModel):
    fdc_id: int
    description: str
    carbs_g_per_100g: Optional[float] = None
    energy_kcal_per_100g: Optional[float] = None


class MealGlucosePredictRequest(BaseModel):
    carbs_g: float
    current_glucose_mg_dl: float
    insulin_units: float = 0
    """Hour 0–23 local meal time."""
    meal_hour: int = 12
    """Recent CGM/meter readings oldest-first (mg/dL). Dexcom-style ~5 min spacing assumed."""
    glucose_readings_mg_dl: List[float] = []
    """If set, server may recalibrate entered carbs when inconsistent with USDA-derived meal total."""
    usda_derived_carbs_g: Optional[float] = None


class MealGlucosePredictResponse(BaseModel):
    direction: str  # likely_up, likely_down, uncertain
    probability_up: float
    validation_flags: List[str]
    carbs_g_validated: float
    carbs_recalibrated: bool
    glucose_delta_estimate_mg_dl: Optional[float] = None
    prediction_rejected: bool = False
    rejection_reason: Optional[str] = None
    disclaimer: str
    features_used: Optional[dict] = None


class DexcomImportReadingsBody(BaseModel):
    """Paste readings from Dexcom receiver/export or Share-compatible intervals (mg/dL)."""
    glucose_readings_mg_dl: List[float] = []

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    email: EmailStr
    token: str
    new_password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentBase(BaseModel):
    doctor_name: str
    appointment_date: datetime
    duration: int = 30
    location: Optional[str] = None
    notes: Optional[str] = None
    appointment_type: Optional[str] = None
    visit_mode: Optional[str] = "in_person"
    telehealth_platform: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    doctor_name: Optional[str] = None
    appointment_date: Optional[datetime] = None
    duration: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[AppointmentStatus] = None
    appointment_type: Optional[str] = None
    visit_mode: Optional[str] = None
    telehealth_platform: Optional[str] = None

class Appointment(AppointmentBase):
    id: int
    patient_id: int
    status: AppointmentStatus
    meeting_url: Optional[str] = None
    meeting_provider: Optional[str] = None
    meeting_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Medical Record Schemas
class MedicalRecordBase(BaseModel):
    record_type: RecordType
    title: str
    date: datetime
    provider: Optional[str] = None
    critical: bool = False
    content: Optional[str] = None
    record_data: Optional[dict] = None

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordUpdate(BaseModel):
    title: Optional[str] = None
    provider: Optional[str] = None
    status: Optional[str] = None
    critical: Optional[bool] = None
    content: Optional[str] = None
    record_data: Optional[dict] = None

class MedicalRecord(MedicalRecordBase):
    id: int
    patient_id: int
    status: str
    file_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MedicalRecordUploadResponse(BaseModel):
    """Result of POST /medical-records/upload (file + Paddle OCR → patient report)."""
    record: MedicalRecord
    ocr_status: str
    ocr_extracted_values: Optional[dict] = None
    ocr_confidence_score: Optional[float] = None
    lab_upload_id: Optional[int] = None

# Medication Schemas
class MedicationBase(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    critical: bool = False
    category: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("critical", mode="before")
    @classmethod
    def _coerce_critical_bool(cls, value):
        return False if value is None else bool(value)

class MedicationCreate(MedicationBase):
    pass

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    critical: Optional[bool] = None
    category: Optional[str] = None
    notes: Optional[str] = None

class Medication(MedicationBase):
    id: int
    patient_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Message Schemas
class MessageBase(BaseModel):
    content: str
    message_type: str = "text"
    priority: MessagePriority = MessagePriority.normal

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    patient_id: int
    sender: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Chat Schemas
class ChatMessageBase(BaseModel):
    content: str
    message_type: str = "text"

class ChatMessageCreate(ChatMessageBase):
    session_id: str

class ChatMessage(ChatMessageBase):
    id: int
    session_id: str
    sender: str
    message_data: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    pass

class ChatSession(BaseModel):
    id: int
    patient_id: int
    session_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LlmChatMessage(BaseModel):
    role: str
    content: str


class LlmChatRequest(BaseModel):
    messages: List[LlmChatMessage]


class LlmChatResponse(BaseModel):
    text: str

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    sub: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    id_token: str

# Dashboard Data Schemas
class DashboardData(BaseModel):
    user: User
    upcoming_appointments: List[Appointment]
    recent_records: List[MedicalRecord]
    current_medications: List[Medication]
    unread_messages: int
    health_metrics: dict


# Lab OCR & health features onboarding
class LabFieldValue(BaseModel):
    value: Optional[float] = None
    confidence: float = 0.0
    status: str = "missing"  # ok, low, missing


class LabUploadResponse(BaseModel):
    id: int
    patient_id: int
    file_url: str
    file_type: str
    file_size_kb: Optional[int] = None
    ocr_status: str
    ocr_extracted_values: Optional[dict] = None
    ocr_confidence_score: Optional[float] = None
    manually_corrected: bool = False
    review_confirmed: bool = False
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LabUploadReviewUpdate(BaseModel):
    cholesterol_total: Optional[int] = None
    ldl_cholesterol: Optional[int] = None
    hdl_cholesterol: Optional[int] = None
    triglycerides: Optional[int] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    review_confirmed: bool = True


class OnboardingProgress(BaseModel):
    demographics_done: bool
    diabetic_path_done: bool = False
    clinical_profile_done: bool = False
    lab_opt_in: Optional[bool] = None
    lab_upload_id: Optional[int] = None
    lab_review_done: bool = False
    health_features_done: bool = False
    onboarding_completed: bool = False


class HealthFeaturesCreate(BaseModel):
    partial: bool = False
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    cholesterol_total: Optional[int] = None
    ldl_cholesterol: Optional[int] = None
    hdl_cholesterol: Optional[int] = None
    triglycerides: Optional[int] = None
    smoking_status: str
    alcohol_group: str
    physical_activity_minutes: int
    sleep_hours_per_day: float
    screen_time_hours_per_day: float
    family_history_diabetes: bool
    hypertension_history: bool
    cardiovascular_history: bool
    height_cm: float
    weight_kg: float
    waist_cm: float
    hip_cm: float
    years_since_quit: Optional[int] = None
    cigarettes_per_day: Optional[int] = None
    diet_quality: Optional[str] = None
    stress_level: Optional[int] = None
    hba1c: Optional[float] = None
    hematocrit: Optional[float] = None
    fasting_glucose: Optional[float] = None
    glucose_postprandial: Optional[float] = None
    insulin_level: Optional[float] = None
    source_lab_upload_id: Optional[int] = None
    visit_date: Optional[date] = None
    duration_years: Optional[float] = None
    visit_gender: Optional[str] = None
    diabetes_type: Optional[str] = None
    medications: Optional[str] = None
    visit_age: Optional[int] = None


class LabVisitSubmitCreate(BaseModel):
    """Post-onboarding lab visit — upserts by visit_date and reruns complications model."""
    visit_date: Optional[date] = None
    duration_years: Optional[float] = None
    age: int
    bmi: float
    hba1c: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    total_cholesterol: Optional[int] = None
    ldl: Optional[int] = None
    hdl: Optional[int] = None
    triglycerides: Optional[int] = None
    hematocrit: Optional[float] = None
    gender: str
    diabetes_type: str
    hypertension: str
    medications: Optional[str] = None

    @field_validator("visit_date", mode="before")
    @classmethod
    def _coerce_visit_date(cls, value):
        if value is None or value == "":
            return None
        return parse_visit_date(value)

    @field_validator("hypertension", mode="before")
    @classmethod
    def _coerce_hypertension(cls, value):
        if isinstance(value, bool):
            return "Yes" if value else "No"
        if value is None:
            return "No"
        return str(value).strip()

    @field_validator("gender", "diabetes_type", mode="before")
    @classmethod
    def _require_non_empty_str(cls, value, info):
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValueError(f"{info.field_name} is required.")
        return str(value).strip()

    @field_validator("bmi", mode="before")
    @classmethod
    def _coerce_bmi(cls, value):
        if value is None or value == "":
            raise ValueError("bmi is required.")
        return float(value)


class CompleteLabDataCreate(BaseModel):
    systolic_bp: int
    diastolic_bp: int
    heart_rate: int
    cholesterol_total: Optional[int] = None
    ldl_cholesterol: Optional[int] = None
    hdl_cholesterol: Optional[int] = None
    triglycerides: Optional[int] = None
    source_lab_upload_id: Optional[int] = None
    visit_date: Optional[date] = None


class DiabetesPredictionResponse(BaseModel):
    id: int
    diabetes_stage: int
    diabetes_stage_label: Optional[str] = None
    diabetes_risk_score: float
    diagnosed_diabetes: bool
    retinopathy_risk: float
    nephropathy_risk: float
    neuropathy_risk: float
    staging_confidence: Optional[float] = None
    risk_score_confidence: Optional[float] = None
    triggered_by: str
    model_name: Optional[str] = None
    is_estimated: bool = False
    features_used: Optional[int] = None
    features_total: Optional[int] = 25
    imputed_features: Optional[list] = None
    predicted_at: datetime

    class Config:
        from_attributes = True


class HealthFeaturesResponse(BaseModel):
    measurement_id: int
    prediction: DiabetesPredictionResponse
    onboarding_completed: bool = True
    lab_upload_pending: bool = False
    profile_completeness_pct: Optional[int] = None


class RiskSummary(BaseModel):
    risk_score: float
    is_estimated: bool
    diabetes_stage: int
    diabetes_stage_label: str
    features_used: int
    features_total: int
    lab_upload_pending: bool
    lab_data_complete: bool
    profile_completeness_pct: int
    feature_pills: dict
    account_age_days: int = 0
    retinopathy_risk: Optional[float] = None
    nephropathy_risk: Optional[float] = None
    neuropathy_risk: Optional[float] = None
    retinopathy_risk_level: Optional[str] = None
    nephropathy_risk_level: Optional[str] = None
    neuropathy_risk_level: Optional[str] = None
    predicted_at: Optional[str] = None
    risk_score_confidence: Optional[float] = None
    staging_confidence: Optional[float] = None
    model_name: Optional[str] = None
    complication_model: Optional[str] = None
    complication_confidence: Optional[str] = None


class ComplicationPatientResponse(BaseModel):
    id: int
    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None


class ComplicationVisitCreate(BaseModel):
    visit_date: Optional[date] = None
    duration_years: Optional[float] = None
    age: int
    bmi: float
    hba1c: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    total_cholesterol: Optional[int] = None
    ldl: Optional[int] = None
    hdl: Optional[int] = None
    triglycerides: Optional[int] = None
    hematocrit: Optional[float] = None
    gender: str
    diabetes_type: str
    hypertension: str
    medications: Optional[str] = None


class ComplicationVisitResponse(BaseModel):
    id: int
    patient_id: int
    visit_date: str
    source: str
    duration_years: Optional[float] = None
    age: Optional[float] = None
    bmi: Optional[float] = None
    hba1c: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    total_cholesterol: Optional[float] = None
    ldl: Optional[float] = None
    hdl: Optional[float] = None
    triglycerides: Optional[float] = None
    hematocrit: Optional[float] = None
    gender: Optional[str] = None
    diabetes_type: Optional[str] = None
    hypertension: Optional[str] = None
    medications: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ComplicationPredictionResponse(BaseModel):
    meta: Optional[dict] = None
    predictions: Optional[dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class GlucoseReadingType(str, Enum):
    fasting = "fasting"
    post_meal = "post_meal"
    random = "random"
    bedtime = "bedtime"


class GlucoseReadingSource(str, Enum):
    manual = "manual"
    device_sync = "device_sync"
    ocr = "ocr"


class GlucoseReadingCreate(BaseModel):
    value_mgdl: int
    reading_type: GlucoseReadingType
    measured_at: datetime
    notes: Optional[str] = None
    source: GlucoseReadingSource = GlucoseReadingSource.manual

    @field_validator("value_mgdl")
    @classmethod
    def validate_value(cls, v: int) -> int:
        if v < 20 or v > 600:
            raise ValueError("value_mgdl must be between 20 and 600")
        return v

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError("notes must be at most 500 characters")
        return v


class GlucoseReadingResponse(BaseModel):
    id: int
    patient_id: int
    value_mgdl: int
    reading_type: str
    measured_at: datetime
    status: str
    notes: Optional[str] = None
    source: str
    device_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GlucoseReadingCreatedResponse(BaseModel):
    id: int
    status: str
    measured_at: datetime


class GlucoseReadingListResponse(BaseModel):
    items: List[GlucoseReadingResponse]
    page: int
    limit: int
    total: int


class GlucoseDashboardDayPoint(BaseModel):
    day: str
    value: Optional[float] = None
    date: str


class GlucoseWeeklySummaryResponse(BaseModel):
    week_start: str
    avg_value: float
    min_value: int
    max_value: int
    readings_count: int
    days_in_range: int
    days_elevated: int
    days_high: int


class GlucoseDashboardResponse(BaseModel):
    days: List[GlucoseDashboardDayPoint]
    weekly_summary: Optional[GlucoseWeeklySummaryResponse] = None
    today_value: Optional[float] = None
    today_day: str
    today_status: Optional[str] = None


class NutritionMealLogRequest(BaseModel):
    source: str
    meal_label: Optional[str] = None
    calories: float = 0
    carbs_g: float = 0
    protein_g: float = 0
    fat_g: float = 0
    foods_json: Optional[list] = None

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        if v not in ("photo", "usda", "manual"):
            raise ValueError("source must be photo, usda, or manual")
        return v


class NutritionTodayResponse(BaseModel):
    intake_date: str
    calories_total: float
    calories_goal: float
    carbs_g_total: float
    carbs_g_goal: float
    protein_g_total: float
    protein_g_goal: float
    fat_g_total: float
    fat_g_goal: float
    meal_count: int
    last_logged_at: Optional[str] = None


class WaterIntakeAddRequest(BaseModel):
    amount_ml: int

    @field_validator("amount_ml")
    @classmethod
    def validate_amount(cls, v: int) -> int:
        if v < 1 or v > 5000:
            raise ValueError("amount_ml must be between 1 and 5000")
        return v


class WaterIntakeTodayResponse(BaseModel):
    intake_date: str
    total_ml: int
    total_liters: float
    goal_ml: int
    goal_liters: float
    log_count: int
    cups_equivalent: float
    glasses_filled: int
    glasses_total: int
    goal_reached: bool
    updated_at: Optional[str] = None
    last_logged_at: Optional[str] = None


class HealthActivitySyncRecord(BaseModel):
    activity_date: str
    steps: int = 0
    sleep_hours: float = 0
    calories_burned: int = 0

    @field_validator("steps", "calories_burned", mode="before")
    @classmethod
    def coerce_non_negative_int(cls, v):
        if v is None:
            return 0
        return max(0, int(round(float(v))))

    @field_validator("sleep_hours", mode="before")
    @classmethod
    def coerce_non_negative_sleep(cls, v):
        if v is None:
            return 0.0
        return max(0.0, float(v))


class HealthActivitySyncRequest(BaseModel):
    records: List[HealthActivitySyncRecord]
    source: str = "health_connect"


class HealthActivitySyncResponse(BaseModel):
    synced_count: int
    last_synced_at: Optional[str] = None


class HealthActivityTodayResponse(BaseModel):
    activity_date: str
    steps: int
    sleep_hours: float
    calories_burned: int
    source: Optional[str] = None
    synced_at: Optional[str] = None


class HealthMetricPoint(BaseModel):
    date: str
    value: float


class HealthActivityHistoryResponse(BaseModel):
    days: int
    steps: List[HealthMetricPoint]
    sleep: List[HealthMetricPoint]
    calories: List[HealthMetricPoint]
    last_synced_at: Optional[str] = None


class HealthActivitySummaryResponse(BaseModel):
    period: str
    start_date: str
    end_date: str
    days_with_data: int
    total_steps: int
    avg_steps: int
    avg_sleep_hours: float
    total_calories: int
    avg_calories: int


class DoctorChatMessageOut(BaseModel):
    id: int
    sender: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class DoctorChatConversationSummary(BaseModel):
    id: int
    doctor_name: str
    title: str
    last_message_preview: Optional[str] = None
    last_message_at: datetime
    unread_count: int = 0
    patient_name: Optional[str] = None

    class Config:
        from_attributes = True


class DoctorChatConversationDetail(BaseModel):
    id: int
    doctor_name: str
    title: str
    patient_name: Optional[str] = None
    messages: List[DoctorChatMessageOut] = []


class DoctorChatMessageCreate(BaseModel):
    content: str

