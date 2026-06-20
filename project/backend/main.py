from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from datetime import timedelta, datetime
from typing import List
import requests
import json

from database import get_db, create_tables
from models import User, Appointment as AppointmentModel, MedicalRecord as MedicalRecordModel, Medication as MedicationModel, Message as MessageModel, ChatSession as ChatSessionModel, ChatMessage as ChatMessageModel
from schemas import (
    UserCreate, User as UserSchema, UserUpdate, PasswordChange,
    OnboardingDemographicsUpdate,
    OnboardingLabChoiceUpdate,
    OnboardingCompleteUpdate,
    PasswordResetRequest, PasswordReset,
    Appointment, AppointmentCreate, AppointmentUpdate, AppointmentStatus,
    MedicalRecord, MedicalRecordCreate, MedicalRecordUpdate,
    Medication, MedicationCreate, MedicationUpdate,
    Message, MessageCreate,
    ChatMessage, ChatMessageCreate, ChatSession, ChatSessionCreate,
    Token, DashboardData, GoogleAuthRequest,
    DiabetesSettingsUpdate,
    USDAFoodNutrients,
    MealGlucosePredictRequest,
    MealGlucosePredictResponse,
    DexcomImportReadingsBody,
)
from auth import authenticate_user, create_access_token, get_current_active_user, get_password_hash, normalize_email, verify_password
from config import settings
from deepseek_service import DeepSeekService
import usda_fdc
import glucose_validation
import glucose_ml_service
import dexcom_integration
from lab_onboarding import router as lab_onboarding_router
from glucose_readings_router import router as glucose_readings_router
from water_intake_router import router as water_intake_router
from health_activity_router import router as health_activity_router
from doctor_chat_router import router as doctor_chat_router
from places_router import router as places_router
from zoom_router import router as zoom_router
from ocr_router import router as ocr_router
from telehealth_service import (
    TelehealthPlatform,
    create_telehealth_meeting,
    is_telehealth_visit,
    provider_label,
)

# =================================================================
# TELEHEALTH HELPERS
# =================================================================

async def _provision_telehealth_meeting(
    *,
    visit_mode: str | None,
    telehealth_platform: str | None,
    doctor_name: str,
    appointment_date: datetime,
    duration: int,
    location: str | None = None,
    db: Session | None = None,
    require_meeting: bool = False,
) -> dict:
    if not is_telehealth_visit(visit_mode, location):
        return {}
    platform: TelehealthPlatform = "zoom"
    label = provider_label(platform)
    base_fields = {
        "visit_mode": "telehealth",
        "telehealth_platform": platform,
        "location": f"Telehealth ({label})",
    }
    try:
        meeting = await create_telehealth_meeting(
            platform=platform,  # type: ignore[arg-type]
            title=f"Telehealth with {doctor_name}",
            start_at=appointment_date,
            duration_minutes=duration,
            db=db,
        )
        return {
            **base_fields,
            "meeting_url": meeting["url"],
            "meeting_provider": meeting["provider"],
            "meeting_id": meeting.get("meeting_id"),
        }
    except RuntimeError:
        if require_meeting:
            raise
        return base_fields


# =================================================================
# GLOBAL API CONFIGURATION
# =================================================================
app = FastAPI(
    title="Healthcare Patient Portal API",
    description="Backend API for healthcare patient portal mobile app",
    version="1.0.0"
)

# Debug: Check DeepSeek API key on startup
@app.on_event("startup")
async def startup_event():
    if settings.deepseek_api_key:
        print(f"[OK] DeepSeek API key loaded (length: {len(settings.deepseek_api_key)})")
    else:
        print("WARNING: DeepSeek API key is not set! Check your .env file.")

# CORS middleware — allow any localhost port in SQLite dev mode (Expo web uses varying ports)
_dev_sqlite = settings.database_url.startswith("sqlite")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=(
        r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+"
        if _dev_sqlite
        else None
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
create_tables()

app.include_router(lab_onboarding_router)
app.include_router(glucose_readings_router)
app.include_router(water_intake_router)
app.include_router(health_activity_router)
app.include_router(doctor_chat_router)
app.include_router(places_router)
app.include_router(zoom_router)
app.include_router(ocr_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Healthcare Patient Portal API", "version": "1.0.0"}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# =================================================================
# AUTHENTICATION ENDPOINTS
# =================================================================
# These routes handle user signup, login, and password management.
@app.post("/auth/register", response_model=UserSchema)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    email = normalize_email(user.email)

    if existing := db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        blood_type=user.blood_type,
        emergency_contact=user.emergency_contact,
        address=user.address,
        gender=user.gender,
        is_active=True,
        onboarding_completed=False,
    )

    db.add(db_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None
    db.refresh(db_user)

    return db_user

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token."""
    email = normalize_email(form_data.username)
    if not email or not form_data.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password are required",
        )

    user = authenticate_user(db, email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/google", response_model=Token)
async def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Login/Register with Google ID token and return JWT."""
    try:
        # Verify token with Google tokeninfo endpoint (server-side)
        resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.id_token},
            timeout=10,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        data = resp.json()
        email = data.get("email")
        sub = data.get("sub")
        name = data.get("name") or email.split("@")[0]
        picture = data.get("picture")
        if not email or not sub:
            raise HTTPException(status_code=401, detail="Invalid Google token payload")

        # Find or create user
        user = db.query(User).filter((User.email == email) | (User.google_id == sub)).first()
        if not user:
            user = User(
                email=email,
                full_name=name,
                google_id=sub,
                google_picture=picture,
                hashed_password=None,
                is_active=True,
                onboarding_completed=False,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update google fields if missing
            updated = False
            if not user.google_id:
                user.google_id = sub; updated = True
            if picture and user.google_picture != picture:
                user.google_picture = picture; updated = True
            if updated:
                db.commit(); db.refresh(user)

        # Issue JWT
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
        return {"access_token": access_token, "token_type": "bearer"}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail="Failed to verify token with Google") from e

# =================================================================
# USER & PROFILE ENDPOINTS
# =================================================================
# Used for fetching and updating the currently logged-in user's data.
@app.get("/users/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@app.put("/users/me", response_model=UserSchema)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user information."""
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@app.patch("/users/me/onboarding", response_model=UserSchema)
async def update_onboarding_demographics(
    payload: OnboardingDemographicsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Save demographics collected during onboarding."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user

@app.patch("/users/me/onboarding/lab-choice", response_model=UserSchema)
async def update_onboarding_lab_choice(
    payload: OnboardingLabChoiceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_user.onboarding_lab_opt_in = payload.onboarding_lab_opt_in
    if payload.onboarding_completed is not None:
        current_user.onboarding_completed = payload.onboarding_completed
    elif payload.onboarding_lab_opt_in is False:
        current_user.onboarding_completed = True
    db.commit()
    db.refresh(current_user)
    return current_user

@app.patch("/users/me/onboarding/complete", response_model=UserSchema)
async def complete_onboarding(
    payload: OnboardingCompleteUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_user.onboarding_completed = payload.onboarding_completed
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/users/me/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password."""
    # Verify current password
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="Password not set. This account uses Google authentication."
        )
    
    if not verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@app.post("/auth/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset. In production, send email with reset token."""
    db.query(User).filter(User.email == request.email).first()
    return {"message": "If the email exists, a password reset link has been sent."}

@app.post("/auth/reset-password")
async def reset_password(
    reset: PasswordReset,
    db: Session = Depends(get_db)
):
    """Reset password with token. In production, verify token from email."""
    user = db.query(User).filter(User.email == reset.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In production, verify reset token here
    # TODO: Implement token verification
    # For now, allow reset (not secure, implement properly in production)
    
    user.hashed_password = get_password_hash(reset.new_password)
    db.commit()
    
    return {"message": "Password reset successfully"}

# =================================================================
# CLINICAL DATA ENDPOINTS
# =================================================================
# Handles appointments, medical records, and medications.
@app.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data for the current user."""
    # Get upcoming appointments (scheduled or any future appointments)
    now = datetime.now()
    upcoming_appointments = db.query(AppointmentModel).filter(
        AppointmentModel.patient_id == current_user.id,
        AppointmentModel.status != "cancelled",
        AppointmentModel.appointment_date >= now
    ).order_by(AppointmentModel.appointment_date.asc()).limit(5).all()
    
    # Get recent medical records
    recent_records = db.query(MedicalRecordModel).filter(
        MedicalRecordModel.patient_id == current_user.id
    ).order_by(MedicalRecordModel.date.desc()).limit(10).all()
    
    # Convert record_data from JSON string to dict if needed
    for record in recent_records:
        if record.record_data and isinstance(record.record_data, str):
            try:
                record.record_data = json.loads(record.record_data)
            except (json.JSONDecodeError, TypeError):
                record.record_data = None
    
    # Get current medications (active ones first, then all if none active)
    current_medications = db.query(MedicationModel).filter(
        MedicationModel.patient_id == current_user.id,
        MedicationModel.is_active == True
    ).all() or db.query(MedicationModel).filter(
        MedicationModel.patient_id == current_user.id
    ).order_by(MedicationModel.created_at.desc()).limit(10).all()
    
    # Get unread messages count
    unread_messages = db.query(MessageModel).filter(
        MessageModel.patient_id == current_user.id,
        MessageModel.is_read == False
    ).count()
    
    # Calculate health metrics
    health_metrics = {
        "blood_type": current_user.blood_type,
        "bmi": current_user.bmi or None,
        "blood_pressure": current_user.blood_pressure or None,
        "total_appointments": len(upcoming_appointments),
        "active_medications": len(current_medications),
        "unread_messages": unread_messages
    }
    
    return DashboardData(
        user=current_user,
        upcoming_appointments=upcoming_appointments,
        recent_records=recent_records,
        current_medications=current_medications,
        unread_messages=unread_messages,
        health_metrics=health_metrics
    )

# Appointment endpoints
@app.get("/appointments", response_model=List[Appointment])
async def get_appointments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all appointments for the current user."""
    return db.query(AppointmentModel).filter(AppointmentModel.patient_id == current_user.id).all()

@app.post("/appointments", response_model=Appointment)
async def create_appointment(
    appointment: AppointmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new appointment."""
    appointment_dict = appointment.dict()
    if 'status' not in appointment_dict or not appointment_dict.get('status'):
        appointment_dict['status'] = "scheduled"

    try:
        telehealth_fields = await _provision_telehealth_meeting(
            visit_mode=appointment_dict.get("visit_mode"),
            telehealth_platform=appointment_dict.get("telehealth_platform"),
            doctor_name=appointment_dict["doctor_name"],
            appointment_date=appointment_dict["appointment_date"],
            duration=appointment_dict.get("duration", 30),
            location=appointment_dict.get("location"),
            db=db,
            require_meeting=False,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    appointment_dict.update(telehealth_fields)

    db_appointment = AppointmentModel(
        **appointment_dict,
        patient_id=current_user.id
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.get("/appointments/{appointment_id}", response_model=Appointment)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific appointment."""
    if not (
        appointment := db.query(AppointmentModel).filter(
            AppointmentModel.id == appointment_id,
            AppointmentModel.patient_id == current_user.id
        ).first()
    ):
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@app.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an appointment."""
    db_appointment = db.query(AppointmentModel).filter(
        AppointmentModel.id == appointment_id,
        AppointmentModel.patient_id == current_user.id
    ).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = appointment_update.model_dump(exclude_unset=True)

    new_status = update_data.get("status")
    if new_status in (AppointmentStatus.cancelled, "cancelled"):
        db_appointment.status = AppointmentStatus.cancelled
        db.commit()
        db.refresh(db_appointment)
        return db_appointment

    for key, value in update_data.items():
        setattr(db_appointment, key, value)

    visit_mode = update_data.get("visit_mode", db_appointment.visit_mode)
    telehealth_platform = update_data.get("telehealth_platform", db_appointment.telehealth_platform)
    appointment_date = update_data.get("appointment_date", db_appointment.appointment_date)
    duration = update_data.get("duration", db_appointment.duration)
    doctor_name = update_data.get("doctor_name", db_appointment.doctor_name)
    location = update_data.get("location", db_appointment.location)

    if is_telehealth_visit(visit_mode, location) and (
        "appointment_date" in update_data
        or "visit_mode" in update_data
        or "telehealth_platform" in update_data
    ) and not db_appointment.meeting_url:
        try:
            telehealth_fields = await _provision_telehealth_meeting(
                visit_mode=visit_mode,
                telehealth_platform=telehealth_platform,
                doctor_name=doctor_name,
                appointment_date=appointment_date,
                duration=duration or 30,
                location=location,
                db=db,
                require_meeting=False,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        for key, value in telehealth_fields.items():
            setattr(db_appointment, key, value)

    db.commit()
    db.refresh(db_appointment)
    return db_appointment


@app.post("/appointments/{appointment_id}/cancel", response_model=Appointment)
async def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Cancel an appointment without re-provisioning telehealth."""
    db_appointment = db.query(AppointmentModel).filter(
        AppointmentModel.id == appointment_id,
        AppointmentModel.patient_id == current_user.id,
    ).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    db_appointment.status = AppointmentStatus.cancelled
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.post("/appointments/{appointment_id}/telehealth/join")
async def join_telehealth_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return (or create) the video meeting link for a telehealth appointment."""
    if not (
        db_appointment := db.query(AppointmentModel).filter(
            AppointmentModel.id == appointment_id,
            AppointmentModel.patient_id == current_user.id,
        ).first()
    ):
        raise HTTPException(status_code=404, detail="Appointment not found")

    if not is_telehealth_visit(db_appointment.visit_mode, db_appointment.location):
        raise HTTPException(status_code=400, detail="This appointment is not a telehealth visit")

    if db_appointment.meeting_url:
        return {
            "meeting_url": db_appointment.meeting_url,
            "meeting_provider": db_appointment.meeting_provider,
        }

    try:
        telehealth_fields = await _provision_telehealth_meeting(
            visit_mode=db_appointment.visit_mode,
            telehealth_platform=db_appointment.telehealth_platform,
            doctor_name=db_appointment.doctor_name,
            appointment_date=db_appointment.appointment_date,
            duration=db_appointment.duration or 30,
            location=db_appointment.location,
            db=db,
            require_meeting=True,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    for key, value in telehealth_fields.items():
        setattr(db_appointment, key, value)
    db.commit()
    db.refresh(db_appointment)
    return {
        "meeting_url": db_appointment.meeting_url,
        "meeting_provider": db_appointment.meeting_provider,
    }

@app.delete("/appointments/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete an appointment."""
    db_appointment = db.query(AppointmentModel).filter(
        AppointmentModel.id == appointment_id,
        AppointmentModel.patient_id == current_user.id
    ).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    db.delete(db_appointment)
    db.commit()
    return {"message": "Appointment deleted successfully"}

# Medical records endpoints
@app.get("/medical-records", response_model=List[MedicalRecord])
async def get_medical_records(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all medical records for the current user."""
    records = db.query(MedicalRecordModel).filter(MedicalRecordModel.patient_id == current_user.id).all()
    
    # Convert record_data from JSON string to dict if needed
    for record in records:
        if record.record_data and isinstance(record.record_data, str):
            try:
                record.record_data = json.loads(record.record_data)
            except (json.JSONDecodeError, TypeError):
                record.record_data = None
    
    return records

@app.post("/medical-records", response_model=MedicalRecord)
async def create_medical_record(
    record: MedicalRecordCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new medical record."""
    db_record = MedicalRecordModel(
        **record.dict(),
        patient_id=current_user.id
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

# Medication endpoints
@app.get("/medications", response_model=List[Medication])
async def get_medications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all medications for the current user."""
    return db.query(MedicationModel).filter(MedicationModel.patient_id == current_user.id).all()

@app.post("/medications", response_model=Medication)
async def create_medication(
    medication: MedicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new medication."""
    db_medication = MedicationModel(
        **medication.dict(),
        patient_id=current_user.id
    )
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    return db_medication

# =================================================================
# AI CHATBOT ENDPOINTS
# =================================================================
# Manages chat sessions and AI-driven medical assistance.
@app.post("/chat/sessions", response_model=ChatSession)
async def create_chat_session(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new chat session."""
    import uuid
    session_id = str(uuid.uuid4())
    
    db_session = ChatSessionModel(
        patient_id=current_user.id,
        session_id=session_id
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.post("/chat/messages", response_model=ChatMessage)
async def send_chat_message(
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a message in a chat session."""
    try:
        # Get user context for AI (simplified to avoid relationship issues)
        user_context = {
            "user_id": current_user.id,
            "user_name": current_user.full_name,
            "blood_type": current_user.blood_type or "Unknown"
        }
        
        # Generate AI response with fallback
        try:
            ai_response = await DeepSeekService.generate_response(message.content, user_context)
            suggestions = await DeepSeekService.generate_suggestions(message.content)
        except Exception as e:
            print(f"DeepSeek API error: {e}")
            ai_response = "I'm sorry, I'm having trouble connecting to my AI service right now. Please try again later or contact your healthcare provider for immediate assistance."
            suggestions = ["Contact your doctor", "Schedule an appointment", "Check your medications"]
        
        # Save user message
        user_message = ChatMessageModel(
            session_id=message.session_id,
            content=message.content,
            message_type=message.message_type,
            sender="user"
        )
        db.add(user_message)
        
        # Save AI response
        ai_message = ChatMessageModel(
            session_id=message.session_id,
            content=ai_response,
            message_type="text",
            sender="ai",
            message_data={"suggestions": suggestions}
        )
        db.add(ai_message)
        
        db.commit()
        db.refresh(ai_message)
        return ai_message
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}") from e

# =================================================================
# CLINICAL MEAL / USDA / GLUCOSE ML (XGBoost + validation)
# =================================================================


@app.patch("/users/me/diabetes-settings", response_model=UserSchema)
async def update_diabetes_settings(
    body: DiabetesSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Save personalized ISF (mg/dL per unit) and ICR (g carb per unit)."""
    if body.isf_mg_dl_per_unit is not None:
        v = body.isf_mg_dl_per_unit
        if v < 15 or v > 200:
            raise HTTPException(status_code=400, detail="ISF outside typical range (15–200 mg/dL per unit)")
        current_user.isf_mg_dl_per_unit = v
    if body.icr_grams_per_unit is not None:
        v = body.icr_grams_per_unit
        if v < 4 or v > 120:
            raise HTTPException(status_code=400, detail="ICR outside typical range (4–120 g per unit)")
        current_user.icr_grams_per_unit = v
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/nutrition/usda/search")
async def nutrition_usda_search(
    q: str,
    page_size: int = 20,
):
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query q is required")
    try:
        hits = usda_fdc.search_foods(q.strip(), page_size=page_size)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"USDA FoodData Central error: {e}") from e

    out = []
    for h in hits:
        fid = h.get("fdcId")
        desc = h.get("description") or ""
        if fid is not None:
            out.append({"fdc_id": int(fid), "description": str(desc)[:500]})
    return out


@app.get("/nutrition/usda/food/{fdc_id}", response_model=USDAFoodNutrients)
async def nutrition_usda_food_detail(
    fdc_id: int,
):
    try:
        detail = usda_fdc.get_food_detail(fdc_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"USDA FoodData Central error: {e}") from e

    carbs = usda_fdc.extract_carbs_per_100g(detail)
    kcal = usda_fdc.extract_energy_kcal_per_100g(detail)
    desc = detail.get("description") or ""
    return USDAFoodNutrients(
        fdc_id=fdc_id,
        description=str(desc)[:800],
        carbs_g_per_100g=carbs,
        energy_kcal_per_100g=kcal,
    )


@app.get("/integrations/dexcom")
async def integrations_dexcom_status(current_user: User = Depends(get_current_active_user)):
    has_tok = bool(getattr(current_user, "dexcom_refresh_token_enc", None))
    return dexcom_integration.dexcom_status(has_tok)


@app.post("/integrations/dexcom/import-readings")
async def integrations_dexcom_import_readings(
    body: DexcomImportReadingsBody,
    current_user: User = Depends(get_current_active_user),
):
    readings = dexcom_integration.normalize_readings(body.glucose_readings_mg_dl)
    return {"readings_mg_dl": readings, "count": len(readings)}


@app.post("/glucose/predict-meal", response_model=MealGlucosePredictResponse)
async def glucose_predict_meal(
    req: MealGlucosePredictRequest,
    current_user: User = Depends(get_current_active_user),
):
    disclaimer = (
        "Educational estimate only—not medical advice. Confirm with CGM/meter and your care team."
    )
    icr = float(current_user.icr_grams_per_unit or glucose_ml_service.DEFAULT_ICR)
    isf = float(current_user.isf_mg_dl_per_unit or glucose_ml_service.DEFAULT_ISF)

    usda_total = req.usda_derived_carbs_g
    cv = glucose_validation.validate_and_normalize_carbs(req.carbs_g, usda_derived_total=usda_total)
    carbs_v = cv.carbs_g
    flags = list(cv.flags)

    ok_trend, trend_reason = glucose_validation.validate_reading_trend_slope(req.glucose_readings_mg_dl or [])
    if not ok_trend:
        return MealGlucosePredictResponse(
            direction="uncertain",
            probability_up=0.5,
            validation_flags=flags + [trend_reason or "trend_invalid"],
            carbs_g_validated=carbs_v,
            carbs_recalibrated=cv.recalibrated,
            glucose_delta_estimate_mg_dl=None,
            prediction_rejected=True,
            rejection_reason=trend_reason,
            disclaimer=disclaimer,
            features_used=None,
        )

    delta_est = glucose_validation.estimate_glucose_delta_mg_dl(
        carbs_v, req.insulin_units, icr, isf
    )
    ok_d, d_reason = glucose_validation.validate_glucose_delta(delta_est)
    if not ok_d:
        return MealGlucosePredictResponse(
            direction="uncertain",
            probability_up=0.5,
            validation_flags=flags + [d_reason or "delta_invalid"],
            carbs_g_validated=carbs_v,
            carbs_recalibrated=cv.recalibrated,
            glucose_delta_estimate_mg_dl=float(delta_est),
            prediction_rejected=True,
            rejection_reason=d_reason,
            disclaimer=disclaimer,
            features_used=None,
        )

    direction, p_up, feats = glucose_ml_service.predict_direction_proba(
        carbs_v,
        req.current_glucose_mg_dl,
        req.insulin_units,
        req.meal_hour,
        req.glucose_readings_mg_dl or [],
        icr,
        isf,
        current_user.id,
    )

    if (direction == "likely_up" and delta_est < -35) or (
        direction == "likely_down" and delta_est > 35
    ):
        direction = "uncertain"
        flags.append("model_vs_heuristic_mismatch")

    return MealGlucosePredictResponse(
        direction=direction,
        probability_up=p_up,
        validation_flags=flags,
        carbs_g_validated=carbs_v,
        carbs_recalibrated=cv.recalibrated,
        glucose_delta_estimate_mg_dl=float(delta_est),
        prediction_rejected=False,
        rejection_reason=None,
        disclaimer=disclaimer,
        features_used=feats,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
