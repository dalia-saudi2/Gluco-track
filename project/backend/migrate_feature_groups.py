#!/usr/bin/env python3
"""
SQLite migration: Feature Groups 1–5 columns + patient_clinical_profile table.
Maps spec 'patients' → existing users table in dev SQLite.
"""

import sqlite3
from pathlib import Path

from config import settings

USER_COLUMNS = [
    ("nationality", "VARCHAR"),
    ("marital_status", "VARCHAR"),
    ("caregiver_name", "VARCHAR"),
    ("caregiver_phone", "VARCHAR"),
    ("preferred_language", "VARCHAR DEFAULT 'en'"),
    ("is_diabetic_path", "BOOLEAN"),  # Screen 3: diabetic vs risk-check path
]

MEASUREMENT_COLUMNS = [
    ("years_since_quit", "INTEGER"),
    ("cigarettes_per_day", "INTEGER"),
    ("diet_quality", "VARCHAR"),
    ("stress_level", "INTEGER"),
    ("steps_per_day", "INTEGER"),
    ("bmi_group", "VARCHAR"),
    ("hba1c", "REAL"),
    ("hematocrit", "REAL"),
    ("fasting_glucose", "REAL"),
    ("creatinine", "REAL"),
    ("egfr", "REAL"),
    ("urine_acr", "REAL"),
    ("alt", "REAL"),
    ("tsh", "REAL"),
]

CLINICAL_PROFILE_DDL = """
CREATE TABLE IF NOT EXISTS patient_clinical_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    diabetes_type VARCHAR,
    year_of_diagnosis INTEGER,
    years_since_diagnosis INTEGER,
    on_insulin BOOLEAN,
    insulin_regimen VARCHAR,
    on_sglt2i BOOLEAN,
    on_metformin BOOLEAN,
    on_statin BOOLEAN,
    on_antihypertensive BOOLEAN,
    medication_list TEXT,
    last_eye_exam_date TEXT,
    last_kidney_function_date TEXT,
    last_foot_exam_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES users(id)
)
"""


def _db_path() -> str:
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        raise SystemExit("SQLite only")
    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)
    return db_path


def add_columns(cursor: sqlite3.Cursor, table: str, columns: list[tuple[str, str]]) -> None:
    existing = {row[1] for row in cursor.execute(f"PRAGMA table_info({table})").fetchall()}
    for name, col_type in columns:
        if name not in existing:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {name} {col_type}")
                print(f"  + {table}.{name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"  • {table}.{name} already exists (skipped)")
                else:
                    raise


def migrate() -> None:
    db_path = _db_path()
    print(f"Migrating {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Group 1 — users (patients) EMR fields:")
    add_columns(cursor, "users", USER_COLUMNS)

    print("Groups 3–5 — patient_measurements:")
    add_columns(cursor, "patient_measurements", MEASUREMENT_COLUMNS)

    print("Group 2 — patient_clinical_profile:")
    cursor.execute(CLINICAL_PROFILE_DDL)
    print("  ensured patient_clinical_profile table")

    conn.commit()
    conn.close()
    print("Feature groups migration completed.")


if __name__ == "__main__":
    migrate()
