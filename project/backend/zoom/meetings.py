"""Create Zoom meetings via OAuth user access tokens."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from zoom.constants import (
    DEFAULT_CONSULTATION_DURATION_MIN,
    DEFAULT_CONSULTATION_TOPIC,
    ZOOM_API_BASE_URL,
)


class ZoomApiError(RuntimeError):
    """Zoom REST API returned an error."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


async def create_consultation_meeting(
    access_token: str,
    *,
    topic: str = DEFAULT_CONSULTATION_TOPIC,
    duration_minutes: int = DEFAULT_CONSULTATION_DURATION_MIN,
    instant: bool = True,
    start_at: datetime | None = None,
) -> dict[str, Any]:
    """
    Create a Zoom meeting for doctor–patient telemedicine.

    Uses POST https://api.zoom.us/v2/users/me/meetings
    """
    payload: dict[str, Any] = {
        "topic": topic,
        "type": 1 if instant else 2,
        "duration": duration_minutes,
        "settings": {
            "waiting_room": True,
            "join_before_host": True,
            "approval_type": 2,
        },
    }
    if not instant and start_at is not None:
        start_utc = start_at.astimezone(timezone.utc)
        payload["start_time"] = start_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        payload["timezone"] = "UTC"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ZOOM_API_BASE_URL}/users/me/meetings",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if response.status_code not in (200, 201):
        detail = response.text[:400]
        raise ZoomApiError(
            response.status_code,
            f"Zoom meeting creation failed ({response.status_code}): {detail}",
        )

    data = response.json()
    join_url = data.get("join_url")
    if not join_url:
        raise ZoomApiError(502, "Zoom did not return a join URL for this meeting")

    return {
        "meeting_id": str(data.get("id", "")),
        "join_url": join_url,
        "start_url": data.get("start_url"),
        "password": data.get("password"),
        "topic": data.get("topic") or topic,
    }


async def create_scheduled_meeting(
    access_token: str,
    *,
    topic: str,
    start_at: datetime,
    duration_minutes: int,
) -> dict[str, Any]:
    """Scheduled telehealth slot (appointment booking)."""
    return await create_consultation_meeting(
        access_token,
        topic=topic,
        duration_minutes=duration_minutes,
        instant=False,
        start_at=start_at,
    )


def zoom_user_path(user_id: str = "me") -> str:
    safe = quote(user_id, safe="")
    return f"{ZOOM_API_BASE_URL}/users/{safe}/meetings"
