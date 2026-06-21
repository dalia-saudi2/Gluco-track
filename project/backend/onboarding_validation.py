"""Validation helpers for onboarding demographics."""

from contextlib import suppress
from datetime import date, datetime
from typing import Optional, Union

MIN_PATIENT_AGE = 20
MAX_PATIENT_AGE = 79

ALLOWED_DEGREES = frozenset({
    "No High School",
    "High School Diploma",
    "Associate's Degree",
    "Bachelor's Degree",
    "Master's Degree",
    "Doctorate / Professional",
})

ALLOWED_MAJORS = frozenset({
    # Engineering
    "Computer Engineering",
    "Software Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Biomedical Engineering",
    "Chemical Engineering",
    "Aerospace Engineering",
    "Industrial Engineering",
    "Mechatronics Engineering",
    # Computer & Technology
    "Computer Science",
    "Information Technology",
    "Information Systems",
    "Cybersecurity",
    "Data Science",
    "Artificial Intelligence",
    "Bioinformatics",
    "Game Development",
    "Computer Graphics",
    "Human-Computer Interaction",
    # Health & Medical Sciences
    "Medicine",
    "Dentistry",
    "Pharmacy",
    "Nursing",
    "Physical Therapy",
    "Biomedical Informatics",
    "Public Health",
    "Medical Laboratory Science",
    "Radiologic Technology",
    "Nutrition and Dietetics",
    # Natural Sciences
    "Biology",
    "Chemistry",
    "Physics",
    "Mathematics",
    "Statistics",
    "Environmental Science",
    "Geology",
    "Astronomy",
    "Biotechnology",
    # Business & Economics
    "Business Administration",
    "Accounting",
    "Finance",
    "Economics",
    "Marketing",
    "Human Resource Management",
    "International Business",
    "Supply Chain Management",
    "Entrepreneurship",
    # Social Sciences
    "Psychology",
    "Sociology",
    "Political Science",
    "Anthropology",
    "Criminology",
    "International Relations",
    "Geography",
    "Social Work",
    # Arts & Humanities
    "English Literature",
    "History",
    "Philosophy",
    "Linguistics",
    "Creative Writing",
    "Religious Studies",
    "Archaeology",
    "Fine Arts",
    "Music",
    # Education
    "Early Childhood Education",
    "Elementary Education",
    "Secondary Education",
    "Special Education",
    "Educational Technology",
    # Media & Communication
    "Journalism",
    "Mass Communication",
    "Public Relations",
    "Advertising",
    "Digital Media",
    "Film Studies",
    # Law & Public Service
    "Law",
    "Legal Studies",
    "Public Administration",
    "Public Policy",
    # Agriculture & Environment
    "Agriculture",
    "Agribusiness",
    "Forestry",
    "Animal Science",
    "Food Science",
    "Environmental Engineering",
    # Design & Architecture
    "Architecture",
    "Interior Design",
    "Graphic Design",
    "Industrial Design",
    "Urban Planning",
    # Emerging & Interdisciplinary
    "Computational Biology",
    "Cognitive Science",
    "Robotics",
    "Health Information Management",
    "Digital Health",
    "Sustainability Studies",
    "Computational Neuroscience",
    # Other
    "Undeclared",
})

LOW_EDUCATION_MAJORS = frozenset({
    "Automotive Technology",
    "Construction Trades",
    "Cosmetology",
    "Culinary Arts",
    "Dental Assisting",
    "Electrical Technology",
    "General Studies",
    "HVAC & Refrigeration",
    "Medical Assisting",
    "Plumbing",
    "Undeclared",
    "Welding",
})


def _as_date(value: Union[datetime, date]) -> date:
    return value.date() if isinstance(value, datetime) else value


def calculate_age(dob: Union[datetime, date]) -> int:
    dob_date = _as_date(dob)
    today = date.today()
    age = today.year - dob_date.year
    if (today.month, today.day) < (dob_date.month, dob_date.day):
        age -= 1
    return age


def coerce_date_of_birth(value: Optional[Union[datetime, date, str]]) -> Optional[datetime]:
    """Accept YYYY-MM-DD or ISO datetime strings from the mobile app."""
    if value is None:
        return None

    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime(value.year, value.month, value.day)
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        parsed = (
            datetime.strptime(text, '%Y-%m-%d')
            if len(text) == 10
            else datetime.fromisoformat(text.replace('Z', '+00:00'))
        )
    else:
        return value  # type: ignore[return-value]

    validate_date_of_birth(parsed)
    return parsed


def validate_date_of_birth(dob: Optional[Union[datetime, date]]) -> None:
    if dob is None:
        return

    dob_date = _as_date(dob)
    today = date.today()

    if dob_date > today:
        raise ValueError("Date of birth cannot be in the future.")

    min_date = date(today.year - MAX_PATIENT_AGE, today.month, today.day)
    if dob_date < min_date:
        raise ValueError(f"Date of birth must be within the last {MAX_PATIENT_AGE} years.")

    age = calculate_age(dob_date)
    if age < MIN_PATIENT_AGE:
        raise ValueError(f"Our model is validated for ages {MIN_PATIENT_AGE}–{MAX_PATIENT_AGE}.")
    if age > MAX_PATIENT_AGE:
        raise ValueError(f"Our model is validated for ages {MIN_PATIENT_AGE}–{MAX_PATIENT_AGE}.")


def majors_for_degree(degree: Optional[str]) -> frozenset[str]:
    if degree in {"No High School", "High School Diploma"}:
        return LOW_EDUCATION_MAJORS
    return ALLOWED_MAJORS


def validate_degree(degree: Optional[str]) -> None:
    if degree is not None and degree not in ALLOWED_DEGREES:
        raise ValueError("Invalid education level.")


def validate_major(major: Optional[str], degree: Optional[str]) -> None:
    if major is None:
        return
    trimmed = major.strip()
    if not trimmed:
        raise ValueError("Major is required.")
    allowed = majors_for_degree(degree)
    if trimmed not in allowed:
        raise ValueError("Invalid major for the selected education level.")


def parse_visit_date(value: Union[str, date, datetime, None]) -> Optional[date]:
    """Accept YYYY-MM-DD or DD-MM-YYYY / DD/MM/YYYY for lab visit forms."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    if not s:
        return None
    if "-" in s[:10]:
        parts = s.split("-", 2)
        if len(parts) == 3 and len(parts[0]) == 4:
            with suppress(ValueError):
                year, month, day = int(parts[0]), int(parts[1]), int(parts[2][:2])
                return date(year, month, day)
    for sep in ("-", "/"):
        parts = s.split(sep)
        if len(parts) == 3 and len(parts[2]) == 4 and len(parts[0]) <= 2:
            try:
                day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                return date(year, month, day)
            except ValueError:
                pass
    raise ValueError("Enter visit date as YYYY-MM-DD (e.g. 2026-06-21).")
