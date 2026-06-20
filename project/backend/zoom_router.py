"""Zoom OAuth and telemedicine consultation API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_active_user
from config import settings
from database import get_db
from models import User, ZoomConsultation, ZoomOAuthToken
from zoom.meetings import ZoomApiError, create_consultation_meeting
from zoom.oauth import (
    ZoomOAuthError,
    build_authorize_url,
    exchange_authorization_code,
    get_valid_access_token_for_host,
    is_zoom_oauth_configured,
    save_oauth_tokens,
    verify_oauth_state,
)

router = APIRouter(prefix="/zoom", tags=["zoom"])


class ZoomOAuthCodeBody(BaseModel):
    code: str


class CallDoctorResponse(BaseModel):
    consultation_id: int
    meeting_id: str
    topic: str
    join_url: str
    start_url: str | None = None
    host_user_id: int
    message: str = "Zoom meeting created. Patient can join below; doctor uses the host link."


@router.get("/oauth/status")
async def zoom_oauth_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    configured = is_zoom_oauth_configured()
    user_token = db.query(ZoomOAuthToken).filter(ZoomOAuthToken.user_id == current_user.id).first()
    host_ready = bool(db.query(ZoomOAuthToken).first()) if configured else False
    return {
        "configured": configured,
        "connected_for_current_user": user_token is not None,
        "host_ready": host_ready,
        "host_user_id": settings.zoom_host_user_id or None,
    }


@router.get("/oauth/authorize-url")
async def zoom_authorize_url(current_user: User = Depends(get_current_active_user)):
    try:
        return {"authorize_url": build_authorize_url(user_id=current_user.id)}
    except ZoomOAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/oauth/token")
async def zoom_oauth_exchange(
    body: ZoomOAuthCodeBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Exchange authorization code for tokens (mobile / SPA callback)."""
    try:
        token_payload = await exchange_authorization_code(body.code)
        save_oauth_tokens(db, user_id=current_user.id, token_payload=token_payload)
    except ZoomOAuthError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"connected": True, "message": "Zoom account connected successfully"}


@router.get("/oauth/callback")
async def zoom_oauth_callback(
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    error_description: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Browser redirect handler after Zoom authorization."""
    if error:
        msg = error_description or error
        target = f"{settings.zoom_oauth_frontend_redirect}?zoom=error&message={msg}"
        return RedirectResponse(url=target, status_code=302)

    if not code or not state:
        msg = "Start Connect Zoom from the app (Dashboard → Call Doctor), not the callback URL directly."
        target = f"{settings.zoom_oauth_frontend_redirect}?zoom=error&message={msg}"
        return RedirectResponse(url=target, status_code=302)

    try:
        user_id = verify_oauth_state(state)
        token_payload = await exchange_authorization_code(code)
        save_oauth_tokens(db, user_id=user_id, token_payload=token_payload)
    except (ZoomOAuthError, ValueError) as exc:
        target = f"{settings.zoom_oauth_frontend_redirect}?zoom=error&message={str(exc)}"
        return RedirectResponse(url=target, status_code=302)

    return RedirectResponse(
        url=f"{settings.zoom_oauth_frontend_redirect}?zoom=connected",
        status_code=302,
    )


@router.delete("/oauth/disconnect")
async def zoom_oauth_disconnect(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if row := db.query(ZoomOAuthToken).filter(ZoomOAuthToken.user_id == current_user.id).first():
        db.delete(row)
        db.commit()
    return {"disconnected": True}


@router.post("/consultations/call-doctor", response_model=CallDoctorResponse)
async def call_doctor(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Quick Action: create a Zoom meeting for an immediate doctor consultation.
    Patient receives join_url; doctor uses start_url (host).
    """
    if not is_zoom_oauth_configured():
        raise HTTPException(
            status_code=503,
            detail="Zoom OAuth is not configured on the server (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URI).",
        )

    try:
        host_user_id, access_token = await get_valid_access_token_for_host(db)
        meeting = await create_consultation_meeting(access_token, instant=True)
    except ZoomOAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ZoomApiError as exc:
        if exc.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="Zoom access token expired or revoked. Doctor must reconnect Zoom.",
            ) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    consultation = ZoomConsultation(
        patient_id=current_user.id,
        host_user_id=host_user_id,
        zoom_meeting_id=meeting["meeting_id"],
        join_url=meeting["join_url"],
        start_url=meeting.get("start_url"),
        topic=meeting["topic"],
        status="active",
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    return CallDoctorResponse(
        consultation_id=consultation.id,
        meeting_id=meeting["meeting_id"],
        topic=meeting["topic"],
        join_url=meeting["join_url"],
        start_url=meeting.get("start_url"),
        host_user_id=host_user_id,
    )


@router.get("/consultations/{consultation_id}")
async def get_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not (
        consultation := db.query(ZoomConsultation)
        .filter(
            ZoomConsultation.id == consultation_id,
            ZoomConsultation.patient_id == current_user.id,
        )
        .first()
    ):
        raise HTTPException(status_code=404, detail="Consultation not found")
    return {
        "consultation_id": consultation.id,
        "meeting_id": consultation.zoom_meeting_id,
        "topic": consultation.topic,
        "join_url": consultation.join_url,
        "start_url": consultation.start_url,
        "status": consultation.status,
    }
