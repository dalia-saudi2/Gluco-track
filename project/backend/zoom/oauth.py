"""Zoom OAuth token lifecycle (authorize, exchange, refresh, storage)."""

from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from auth import create_access_token
from config import settings
from models import ZoomOAuthToken
from zoom.constants import ZOOM_AUTHORIZE_URL, ZOOM_OAUTH_SCOPES, ZOOM_TOKEN_URL
from zoom.crypto import decrypt_secret, encrypt_secret


class ZoomOAuthError(RuntimeError):
    """Zoom OAuth request failed."""


def is_zoom_oauth_configured() -> bool:
    return bool(settings.zoom_client_id and settings.zoom_client_secret and settings.zoom_redirect_uri)


def build_authorize_url(*, user_id: int) -> str:
    if not is_zoom_oauth_configured():
        raise ZoomOAuthError(
            "Zoom OAuth is not configured. Set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_REDIRECT_URI."
        )
    state = create_access_token(
        {"sub": f"zoom:{user_id}", "purpose": "zoom_oauth"},
        expires_delta=timedelta(minutes=15),
    )
    params = urlencode(
        {
            "response_type": "code",
            "client_id": settings.zoom_client_id,
            "redirect_uri": settings.zoom_redirect_uri,
            "state": state,
            "scope": ZOOM_OAUTH_SCOPES,
        }
    )
    return f"{ZOOM_AUTHORIZE_URL}?{params}"


def verify_oauth_state(state: str) -> int:
    try:
        payload = jwt.decode(state, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise ZoomOAuthError("Invalid or expired Zoom OAuth state") from exc
    if payload.get("purpose") != "zoom_oauth":
        raise ZoomOAuthError("Invalid Zoom OAuth state purpose")
    sub = str(payload.get("sub", ""))
    if not sub.startswith("zoom:"):
        raise ZoomOAuthError("Invalid Zoom OAuth state subject")
    return int(sub.split(":", 1)[1])


async def _zoom_token_request(data: dict[str, str]) -> dict[str, Any]:
    auth = base64.b64encode(
        f"{settings.zoom_client_id}:{settings.zoom_client_secret}".encode()
    ).decode()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            ZOOM_TOKEN_URL,
            data=data,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
    if response.status_code != 200:
        raise ZoomOAuthError(f"Zoom token request failed ({response.status_code}): {response.text[:300]}")
    return response.json()


async def exchange_authorization_code(code: str) -> dict[str, Any]:
    return await _zoom_token_request(
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.zoom_redirect_uri,
        }
    )


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    return await _zoom_token_request(
        {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
    )


def save_oauth_tokens(db: Session, *, user_id: int, token_payload: dict[str, Any]) -> ZoomOAuthToken:
    access_token = token_payload.get("access_token")
    refresh_token = token_payload.get("refresh_token")
    if not access_token:
        raise ZoomOAuthError("Zoom did not return an access token")

    expires_in = int(token_payload.get("expires_in", 3600))
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=max(expires_in - 60, 60))

    row = db.query(ZoomOAuthToken).filter(ZoomOAuthToken.user_id == user_id).first()
    if not row:
        row = ZoomOAuthToken(user_id=user_id)
        db.add(row)

    row.access_token_enc = encrypt_secret(access_token)
    if refresh_token:
        row.refresh_token_enc = encrypt_secret(refresh_token)
    row.expires_at = expires_at
    row.zoom_user_id = token_payload.get("user_id") or token_payload.get("account_id")
    row.scope = token_payload.get("scope")
    db.commit()
    db.refresh(row)
    return row


def resolve_host_user_id(db: Session) -> int:
    if settings.zoom_host_user_id:
        host_id = int(settings.zoom_host_user_id)
        if db.query(ZoomOAuthToken).filter(ZoomOAuthToken.user_id == host_id).first():
            return host_id

    if row := db.query(ZoomOAuthToken).order_by(ZoomOAuthToken.updated_at.desc()).first():
        return row.user_id

    raise ZoomOAuthError(
        "No doctor Zoom account is connected. A clinician must connect Zoom in the app first."
    )


async def get_valid_access_token(db: Session, user_id: int) -> str:
    row = db.query(ZoomOAuthToken).filter(ZoomOAuthToken.user_id == user_id).first()
    if not row:
        raise ZoomOAuthError("Zoom is not connected for this account")

    now = datetime.now(timezone.utc)
    expires_at = row.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and expires_at > now:
        return decrypt_secret(row.access_token_enc)

    if not row.refresh_token_enc:
        raise ZoomOAuthError("Zoom access token expired and no refresh token is available")

    refreshed = await refresh_access_token(decrypt_secret(row.refresh_token_enc))
    save_oauth_tokens(db, user_id=user_id, token_payload=refreshed)
    return refreshed["access_token"]


async def get_valid_access_token_for_host(db: Session) -> tuple[int, str]:
    host_user_id = resolve_host_user_id(db)
    token = await get_valid_access_token(db, host_user_id)
    return host_user_id, token
