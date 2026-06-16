"""Server-side derived fields (SQLite has no GENERATED columns for all cases)."""

from __future__ import annotations

from datetime import date
from typing import Optional


def activity_level_from_minutes(minutes: int) -> str:
    if minutes <= 0:
        return "sedentary"
    if minutes < 90:
        return "light"
    if minutes < 210:
        return "moderate"
    return "active"


def bmi_group_from_bmi(bmi: float) -> str:
    if bmi < 18.5:
        return "underweight"
    if bmi < 25:
        return "normal"
    if bmi < 30:
        return "overweight"
    return "obese"


def waist_to_hip_ratio(waist_cm: float, hip_cm: float) -> float:
    return round(waist_cm / max(hip_cm, 1), 3)


def abdominal_obesity(gender: Optional[str], whr: float) -> bool:
    if gender == "female":
        return whr > 0.85
    return whr > 0.90


def years_since_diagnosis(year_of_diagnosis: Optional[int], today: Optional[date] = None) -> Optional[int]:
    if year_of_diagnosis is None:
        return None
    return (today or date.today()).year - year_of_diagnosis


def age_from_dob(dob: date, today: Optional[date] = None) -> int:
    today = today or date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years
