"""
Dexcom G6 / Share-style integration stubs.

Full OAuth (Dexcom Developer) requires app registration; this module documents the flow
and accepts manually pasted CGM sequences from the patient device/export.
"""
from __future__ import annotations

from typing import Any, Dict, List

DEXCOM_DEVELOPER_GUIDE = "https://developer.dexcom.com/"

# Dexcom Share uses OAuth2; production would store refresh_token encrypted per user.


def dexcom_status(has_refresh_token: bool) -> Dict[str, Any]:
    return {
        "vendor": "Dexcom",
        "models_supported": ["G6", "G7"],
        "oauth_documentation_url": DEXCOM_DEVELOPER_GUIDE,
        "configured": bool(has_refresh_token),
        "note": "Paste glucose readings from your CGM report or connect OAuth when enabled.",
    }


def normalize_readings(values: List[float], max_points: int = 36) -> List[float]:
    """Trim to latest N points (≈3h at 5 min)."""
    if not values:
        return []
    v = [float(x) for x in values if x == x and x > 20]
    return v[-max_points:]
