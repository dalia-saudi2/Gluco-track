"""Reject physiologically implausible values before they reach the model."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

PHYSIO_BOUNDS: Dict[str, Tuple[float | None, float | None]] = {
    "age": (1, 120),
    "bmi": (10, 80),
    "waist_to_hip_ratio": (0.5, 1.5),
    "systolic_bp": (60, 250),
    "diastolic_bp": (30, 150),
    "heart_rate": (30, 220),
    "cholesterol_total": (80, 500),
    "ldl_cholesterol": (20, 400),
    "hdl_cholesterol": (10, 150),
    "triglycerides": (30, 2000),
    "glucose_fasting": (40, 600),
    "glucose_postprandial": (40, 600),
    "hba1c": (3.0, 20.0),
    "insulin_level": (0.1, 500),
    "physical_activity_minutes_per_week": (0, 2000),
    "sleep_hours_per_day": (2, 16),
    "screen_time_hours_per_day": (0, 24),
    "alcohol_consumption_per_week": (0, 100),
}


def validate_physio_values(values: Dict[str, Any]) -> List[str]:
    """Return human-readable errors for out-of-range numeric fields."""
    errors: List[str] = []
    for field, (lo, hi) in PHYSIO_BOUNDS.items():
        if field not in values or values[field] is None:
            continue
        try:
            val = float(values[field])
        except (TypeError, ValueError):
            errors.append(f"{field}: must be numeric")
            continue
        if lo is not None and val < lo:
            errors.append(f"{field}={val}: below minimum {lo}")
        if hi is not None and val > hi:
            errors.append(f"{field}={val}: above maximum {hi}")
    return errors
