#!/usr/bin/env python3
"""Rebuild patient_measurements so BP/heart-rate columns allow NULL (Flow B partial path)."""

import sqlite3
from pathlib import Path

from config import settings

CREATE_SQL = """
CREATE TABLE patient_measurements_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    source VARCHAR,
    source_lab_upload_id INTEGER,
    age INTEGER NOT NULL,
    bmi FLOAT NOT NULL,
    waist_to_hip_ratio FLOAT NOT NULL,
    abdominal_obesity BOOLEAN,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    cholesterol_total INTEGER,
    ldl_cholesterol INTEGER,
    hdl_cholesterol INTEGER,
    triglycerides INTEGER,
    smoking_status VARCHAR NOT NULL,
    alcohol_group VARCHAR NOT NULL,
    physical_activity_minutes INTEGER NOT NULL,
    sleep_hours_per_day FLOAT NOT NULL,
    screen_time_hours_per_day FLOAT NOT NULL,
    family_history_diabetes BOOLEAN NOT NULL,
    hypertension_history BOOLEAN NOT NULL,
    cardiovascular_history BOOLEAN NOT NULL,
    height_cm FLOAT,
    weight_kg FLOAT,
    waist_cm FLOAT,
    hip_cm FLOAT,
    is_current BOOLEAN,
    measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    lab_data_complete BOOLEAN DEFAULT 1,
    activity_level TEXT,
    FOREIGN KEY(patient_id) REFERENCES users(id),
    FOREIGN KEY(source_lab_upload_id) REFERENCES lab_uploads(id)
)
"""

COLUMNS = [
    "id", "patient_id", "source", "source_lab_upload_id", "age", "bmi",
    "waist_to_hip_ratio", "abdominal_obesity", "systolic_bp", "diastolic_bp",
    "heart_rate", "cholesterol_total", "ldl_cholesterol", "hdl_cholesterol",
    "triglycerides", "smoking_status", "alcohol_group", "physical_activity_minutes",
    "sleep_hours_per_day", "screen_time_hours_per_day", "family_history_diabetes",
    "hypertension_history", "cardiovascular_history", "height_cm", "weight_kg",
    "waist_cm", "hip_cm", "is_current", "measured_at", "created_at",
    "lab_data_complete", "activity_level",
]


def migrate() -> None:
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        print("SKIP: not SQLite")
        return

    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    info = cursor.execute("PRAGMA table_info(patient_measurements)").fetchall()
    by_name = {row[1]: row for row in info}
    if "systolic_bp" in by_name and by_name["systolic_bp"][3] == 0:
        print("patient_measurements.systolic_bp already nullable — nothing to do.")
        conn.close()
        return

    existing_cols = [c for c in COLUMNS if c in by_name]
    col_list = ", ".join(existing_cols)

    cursor.execute("PRAGMA foreign_keys=OFF")
    cursor.execute(CREATE_SQL)
    cursor.execute(
        f"INSERT INTO patient_measurements_new ({col_list}) "
        f"SELECT {col_list} FROM patient_measurements"
    )
    cursor.execute("DROP TABLE patient_measurements")
    cursor.execute("ALTER TABLE patient_measurements_new RENAME TO patient_measurements")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS ix_patient_measurements_patient_id "
        "ON patient_measurements (patient_id)"
    )
    cursor.execute("PRAGMA foreign_keys=ON")
    conn.commit()
    conn.close()
    print("Rebuilt patient_measurements with nullable vitals columns.")


if __name__ == "__main__":
    migrate()
