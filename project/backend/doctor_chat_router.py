"""Patient and doctor messaging routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import User
from schemas import (
    DoctorChatConversationDetail,
    DoctorChatConversationSummary,
    DoctorChatMessageCreate,
    DoctorChatMessageOut,
)
import doctor_chat_service as chat_svc

router = APIRouter(tags=["doctor-chat"])


def _assert_patient_access(current_user: User, patient_id: int) -> None:
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized for this patient")


@router.get(
    "/api/patients/{patient_id}/doctor-chats",
    response_model=list[DoctorChatConversationSummary],
)
async def list_patient_doctor_chats(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    chat_svc.ensure_sample_conversations(db, current_user)
    db.commit()
    rows = chat_svc.list_patient_conversations(db, patient_id)
    return [
        chat_svc.conversation_to_summary(row, for_patient=True)
        for row in rows
    ]


@router.get(
    "/api/patients/{patient_id}/doctor-chats/{chat_id}",
    response_model=DoctorChatConversationDetail,
)
async def get_patient_doctor_chat(
    patient_id: int,
    chat_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    conv = chat_svc.get_conversation(db, chat_id)
    if not conv or conv.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    chat_svc.mark_read_for_patient(db, conv)
    db.commit()
    db.refresh(conv)
    return chat_svc.conversation_to_detail(conv, patient_name=current_user.full_name)


@router.post(
    "/api/patients/{patient_id}/doctor-chats/{chat_id}/messages",
    response_model=DoctorChatMessageOut,
)
async def send_patient_doctor_chat_message(
    patient_id: int,
    chat_id: int,
    payload: DoctorChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_patient_access(current_user, patient_id)
    conv = chat_svc.get_conversation(db, chat_id)
    if not conv or conv.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    try:
        message = chat_svc.add_message(db, conv, sender="patient", content=payload.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.commit()
    db.refresh(message)
    return message


@router.get(
    "/api/doctor/chats",
    response_model=list[DoctorChatConversationSummary],
)
async def list_doctor_chats(
    doctor_name: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Doctor dashboard: list all patient threads for a given doctor."""
    rows = chat_svc.list_doctor_conversations(db, doctor_name)
    summaries = []
    for row in rows:
        patient = db.query(User).filter(User.id == row.patient_id).first()
        summaries.append(
            chat_svc.conversation_to_summary(
                row,
                for_patient=False,
                patient_name=patient.full_name if patient else None,
            )
        )
    return summaries


@router.get(
    "/api/doctor/chats/{chat_id}",
    response_model=DoctorChatConversationDetail,
)
async def get_doctor_chat(
    chat_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Doctor dashboard: open a patient thread."""
    conv = chat_svc.get_conversation(db, chat_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    patient = db.query(User).filter(User.id == conv.patient_id).first()
    chat_svc.mark_read_for_doctor(db, conv)
    db.commit()
    db.refresh(conv)
    return chat_svc.conversation_to_detail(
        conv,
        patient_name=patient.full_name if patient else None,
    )


@router.post(
    "/api/doctor/chats/{chat_id}/messages",
    response_model=DoctorChatMessageOut,
)
async def send_doctor_chat_message(
    chat_id: int,
    payload: DoctorChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Doctor dashboard: reply in a patient thread."""
    conv = chat_svc.get_conversation(db, chat_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    try:
        message = chat_svc.add_message(db, conv, sender="doctor", content=payload.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.commit()
    db.refresh(message)
    return message
