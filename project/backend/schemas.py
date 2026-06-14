from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

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
    ethnicity: Optional[str] = None
    education_level: Optional[str] = None
    employment_status: Optional[str] = None
    income_level: Optional[str] = None
    onboarding_completed: Optional[bool] = False
    onboarding_lab_opt_in: Optional[bool] = None
    isf_mg_dl_per_unit: Optional[float] = None
    icr_grams_per_unit: Optional[float] = None
    # OAuth fields (read-only in responses)
    google_id: Optional[str] = None
    google_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    ethnicity: Optional[str] = None
    education_level: Optional[str] = None
    employment_status: Optional[str] = None
    income_level: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class OnboardingDemographicsUpdate(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    education_level: Optional[str] = None
    employment_status: Optional[str] = None
    income_level: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class OnboardingLabChoiceUpdate(BaseModel):
    onboarding_lab_opt_in: bool
    onboarding_completed: Optional[bool] = None


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

class Appointment(AppointmentBase):
    id: int
    patient_id: int
    status: AppointmentStatus
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
