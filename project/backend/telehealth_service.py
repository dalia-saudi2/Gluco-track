"""Create telehealth meetings via Zoom OAuth."""

from __future__ import annotations

import base64
from datetime import datetime, timezone
from typing import Any, Literal

import httpx
from sqlalchemy.orm import Session

from config import settings
from zoom.constants import ZOOM_API_BASE_URL, ZOOM_TOKEN_URL
from zoom.meetings import create_scheduled_meeting
from zoom.oauth import ZoomOAuthError, get_valid_access_token_for_host, is_zoom_oauth_configured

TelehealthPlatform = Literal["zoom"]

TELEHEALTH_NOT_CONFIGURED_MSG = (
    "Telehealth requires a connected Zoom account. "
    "In the app: Dashboard → Call Doctor → Connect Zoom, then try Join on Zoom again."
)


def is_telehealth_visit(visit_mode: str | None, location: str | None = None) -> bool:
    if visit_mode == "telehealth":
        return True
    return bool(location and "telehealth" in location.lower())


def _zoom_s2s_configured() -> bool:
    return bool(
        settings.zoom_account_id
        and settings.zoom_client_id
        and settings.zoom_client_secret
    )


async def _zoom_s2s_access_token(client: httpx.AsyncClient) -> str:
    auth = base64.b64encode(
        f"{settings.zoom_client_id}:{settings.zoom_client_secret}".encode()
    ).decode()
    response = await client.post(
        ZOOM_TOKEN_URL,
        params={
            "grant_type": "account_credentials",
            "account_id": settings.zoom_account_id,
        },
        headers={"Authorization": f"Basic {auth}"},
    )
    if response.status_code != 200:
        raise RuntimeError(f"Zoom auth failed ({response.status_code}): {response.text[:300]}")
    return response.json()["access_token"]


async def _create_zoom_meeting_s2s(
    client: httpx.AsyncClient,
    *,
    title: str,
    start_at: datetime,
    duration_minutes: int,
) -> dict[str, Any]:
    token = await _zoom_s2s_access_token(client)
    start_utc = start_at.astimezone(timezone.utc)
    user_id = settings.zoom_user_id or "me"
    response = await client.post(
        f"{ZOOM_API_BASE_URL}/users/{user_id}/meetings",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "topic": title,
            "type": 2,
            "start_time": start_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "duration": duration_minutes,
            "timezone": "UTC",
            "settings": {
                "join_before_host": True,
                "waiting_room": True,
                "approval_type": 2,
            },
        },
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Zoom meeting failed ({response.status_code}): {response.text[:300]}")
    data = response.json()
    return {
        "url": data.get("join_url") or data.get("start_url"),
        "provider": "zoom",
        "meeting_id": str(data.get("id", "")),
    }


async def _create_zoom_meeting_oauth(
    db: Session,
    *,
    title: str,
    start_at: datetime,
    duration_minutes: int,
) -> dict[str, Any]:
    _, access_token = await get_valid_access_token_for_host(db)
    meeting = await create_scheduled_meeting(
        access_token,
        topic=title,
        start_at=start_at,
        duration_minutes=duration_minutes,
    )
    return {
        "url": meeting["join_url"],
        "provider": "zoom",
        "meeting_id": meeting["meeting_id"],
    }


async def create_telehealth_meeting(
    *,
    platform: TelehealthPlatform,
    title: str,
    start_at: datetime,
    duration_minutes: int,
    db: Session | None = None,
) -> dict[str, Any]:
    """Create a scheduled Zoom telehealth meeting."""
    if db is not None and is_zoom_oauth_configured():
        try:
            return await _create_zoom_meeting_oauth(
                db, title=title, start_at=start_at, duration_minutes=duration_minutes
            )
        except ZoomOAuthError as exc:
            raise RuntimeError(TELEHEALTH_NOT_CONFIGURED_MSG) from exc

    async with httpx.AsyncClient(timeout=30.0) as client:
        if _zoom_s2s_configured():
            return await _create_zoom_meeting_s2s(
                client, title=title, start_at=start_at, duration_minutes=duration_minutes
            )

    raise RuntimeError(TELEHEALTH_NOT_CONFIGURED_MSG)


def provider_label(provider: str | None) -> str:
    return "Zoom" if provider == "zoom" else "Telehealth"
