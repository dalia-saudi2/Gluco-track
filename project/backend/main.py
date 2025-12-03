from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List
import requests

from database import get_db, create_tables
from models import User, Appointment as AppointmentModel, MedicalRecord as MedicalRecordModel, Medication as MedicationModel, Message as MessageModel, ChatSession as ChatSessionModel, ChatMessage as ChatMessageModel
from schemas import (
    UserCreate, User as UserSchema, UserUpdate,
    Appointment, AppointmentCreate, AppointmentUpdate,
    MedicalRecord, MedicalRecordCreate, MedicalRecordUpdate,
    Medication, MedicationCreate, MedicationUpdate,
    Message, MessageCreate,
    ChatMessage, ChatMessageCreate, ChatSession, ChatSessionCreate,
    Token, DashboardData, GoogleAuthRequest
)
from auth import authenticate_user, create_access_token, get_current_active_user, get_password_hash
from config import settings
from gemini_service import GeminiService

# Create FastAPI app
app = FastAPI(
    title="Healthcare Patient Portal API",
    description="Backend API for healthcare patient portal mobile app",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
create_tables()

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Healthcare Patient Portal API", "version": "1.0.0"}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Authentication endpoints
@app.post("/auth/register", response_model=UserSchema)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        blood_type=user.blood_type,
        emergency_contact=user.emergency_contact
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token."""
    user = authenticate_user(db, form_data.username, form_data.password)
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
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Failed to verify token with Google")

# User endpoints
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

# Dashboard endpoint
@app.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data for the current user."""
    # Get upcoming appointments
    upcoming_appointments = db.query(AppointmentModel).filter(
        AppointmentModel.patient_id == current_user.id,
        AppointmentModel.status == "scheduled"
    ).order_by(AppointmentModel.appointment_date).limit(5).all()
    
    # Get recent medical records
    recent_records = db.query(MedicalRecordModel).filter(
        MedicalRecordModel.patient_id == current_user.id
    ).order_by(MedicalRecordModel.date.desc()).limit(10).all()
    
    # Get current medications
    current_medications = db.query(MedicationModel).filter(
        MedicationModel.patient_id == current_user.id,
        MedicationModel.is_active == True
    ).all()
    
    # Get unread messages count
    unread_messages = db.query(MessageModel).filter(
        MessageModel.patient_id == current_user.id,
        MessageModel.is_read == False
    ).count()
    
    # Calculate health metrics
    health_metrics = {
        "blood_type": current_user.blood_type,
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
    db_appointment = AppointmentModel(
        **appointment.dict(),
        patient_id=current_user.id
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

# Medical records endpoints
@app.get("/medical-records", response_model=List[MedicalRecord])
async def get_medical_records(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all medical records for the current user."""
    return db.query(MedicalRecordModel).filter(MedicalRecordModel.patient_id == current_user.id).all()

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

# Chat endpoints
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
            ai_response = await GeminiService.generate_response(message.content, user_context)
            suggestions = await GeminiService.generate_suggestions(message.content)
        except Exception as e:
            print(f"Gemini API error: {e}")
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
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
