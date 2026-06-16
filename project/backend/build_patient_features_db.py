#!/usr/bin/env python3
"""
Build / migrate the 3-table patient feature schema (Groups 1–5) into healthcare.db.

Tables:
  - patients                  (Group 1 demographics; 1:1 with users)
  - patient_clinical_profile  (Group 2 diabetes clinical facts)
  - patient_measurements      (Groups 3–5 lifestyle + vitals + labs)

Usage:
  py -3.12 build_patient_features_db.py
  py -3.12 build_patient_features_db.py --seed
  py -3.12 build_patient_features_db.py --fresh   # rebuild measurement tables (dev only)
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

from config import settings
from feature_derivations import abdominal_obesity, waist_to_hip_ratio

BACKEND = Path(__file__).parent
SCHEMA = BACKEND / "sql" / "patient_features.sqlite.sql"
VIEWS = BACKEND / "sql" / "patient_features_views.sql"


def db_path() -> Path:
    url = settings.database_url
    if url.startswith("sqlite:///"):
        p = url.replace("sqlite:///", "")
    elif url.startswith("sqlite://"):
        p = url.replace("sqlite://", "")
    else:
        raise SystemExit("SQLite only — set DATABASE_URL=sqlite:///./healthcare.db")
    path = Path(p)
    if not path.is_absolute():
        path = BACKEND / path
    return path


def run_sql_file(conn: sqlite3.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    conn.executescript(sql)


def table_exists(cursor: sqlite3.Cursor, name: str) -> bool:
    row = cursor.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None


def _normalize_gender(val) -> str | None:
    if not val:
        return None
    v = str(val).lower()
    if v in ("male", "m"):
        return "male"
    if v in ("female", "f"):
        return "female"
    return None


def _normalize_ethnicity(val) -> str | None:
    if not val:
        return None
    v = str(val).lower()
    mapping = {
        "white": "white",
        "black": "black",
        "hispanic": "hispanic",
        "asian": "asian",
        "other": "other",
    }
    return mapping.get(v, "other")


def _normalize_employment(val) -> str | None:
    if not val:
        return None
    v = str(val).lower().replace(" ", "_").replace("-", "_")
    mapping = {
        "employed_full": "employed_full",
        "employed_full_time": "employed_full",
        "full_time": "employed_full",
        "employed_part": "employed_part",
        "employed_part_time": "employed_part",
        "part_time": "employed_part",
        "unemployed": "unemployed",
        "retired": "retired",
    }
    return mapping.get(v, "employed_full")


def sync_patients_from_users(conn: sqlite3.Connection) -> int:
    """Backfill patients from users (id = user id for 1:1 mapping)."""
    cursor = conn.cursor()
    users = cursor.execute(
        """
        SELECT id, date_of_birth, age, gender, ethnicity, education_level,
               employment_status, income_level, nationality, marital_status,
               caregiver_name, caregiver_phone, preferred_language,
               is_diabetic_path, lab_upload_pending, onboarding_completed
        FROM users
        WHERE age IS NOT NULL AND gender IS NOT NULL AND ethnicity IS NOT NULL
          AND education_level IS NOT NULL AND employment_status IS NOT NULL
          AND income_level IS NOT NULL
        """
    ).fetchall()

    count = 0
    for row in users:
        (
            uid, dob, age, gender, ethnicity, edu, emp, income,
            nationality, marital, caregiver_name, caregiver_phone, lang,
            diabetic_path, lab_pending, onboarding_done,
        ) = row
        gender = _normalize_gender(gender)
        ethnicity = _normalize_ethnicity(ethnicity)
        emp = _normalize_employment(emp)
        if not all([age, gender, ethnicity, edu is not None, emp, income is not None]):
            continue
        cursor.execute(
            """
            INSERT INTO patients (
                id, user_id, date_of_birth, age, gender, ethnicity,
                education_level, employment_status, income_level,
                nationality, marital_status, caregiver_name, caregiver_phone,
                preferred_language, is_diabetic_path, lab_upload_pending,
                onboarding_complete
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date_of_birth = excluded.date_of_birth,
                age = excluded.age,
                gender = excluded.gender,
                ethnicity = excluded.ethnicity,
                education_level = excluded.education_level,
                employment_status = excluded.employment_status,
                income_level = excluded.income_level,
                nationality = excluded.nationality,
                marital_status = excluded.marital_status,
                caregiver_name = excluded.caregiver_name,
                caregiver_phone = excluded.caregiver_phone,
                preferred_language = excluded.preferred_language,
                is_diabetic_path = excluded.is_diabetic_path,
                lab_upload_pending = excluded.lab_upload_pending,
                onboarding_complete = excluded.onboarding_complete,
                updated_at = datetime('now')
            """,
            (
                uid,
                uid,
                dob,
                age,
                gender,
                ethnicity,
                int(edu) if edu is not None and str(edu).isdigit() else _edu_to_int(edu),
                emp,
                int(income) if income is not None and str(income).isdigit() else _income_to_int(income),
                nationality,
                marital,
                caregiver_name,
                caregiver_phone,
                lang or "en",
                1 if diabetic_path else 0 if diabetic_path is not None else None,
                1 if lab_pending else 0,
                1 if onboarding_done else 0,
            ),
        )
        count += 1
    conn.commit()
    return count


def _edu_to_int(val) -> int:
    mapping = {
        "none": 0, "0": 0,
        "primary": 1, "1": 1,
        "secondary": 2, "2": 2, "high school": 2,
        "tertiary": 3, "3": 3, "bachelor": 3, "bachelor's degree": 3,
        "postgrad": 4, "4": 4, "master": 4, "phd": 4, "doctorate": 4,
    }
    if isinstance(val, int):
        return val
    key = str(val).lower().strip()
    for k, v in mapping.items():
        if k in key or key == k:
            return v
    try:
        return int(val)
    except (TypeError, ValueError):
        return 2


def _income_to_int(val) -> int:
    if isinstance(val, int):
        return val
    key = str(val).lower()
    if any(x in key for x in ("under", "<", "low", "0")):
        return 0
    if any(x in key for x in ("25", "3000", "mid-low")):
        return 1
    if any(x in key for x in ("50", "8000", "mid")):
        return 2
    if any(x in key for x in ("over", ">", "high", "20000")):
        return 3
    try:
        return int(val)
    except (TypeError, ValueError):
        return 1


def rebuild_measurements_if_needed(conn: sqlite3.Connection, fresh: bool) -> None:
    """If old patient_measurements lacks GENERATED bmi, rebuild from legacy data."""
    cursor = conn.cursor()
    if not table_exists(cursor, "patient_measurements"):
        return

    info = {row[1]: row for row in cursor.execute("PRAGMA table_info(patient_measurements)")}
    if "weight_kg" in info and not fresh:
        return

    if not table_exists(cursor, "users"):
        return

    print("Rebuilding patient_measurements to feature-group schema...")
    cursor.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("DROP VIEW IF EXISTS v_staging_model_features")
    cursor.execute("DROP VIEW IF EXISTS v_complications_model_features")
    cursor.execute("DROP TABLE IF EXISTS patient_measurements_legacy")
    if table_exists(cursor, "patient_measurements"):
        cursor.execute(
            "ALTER TABLE patient_measurements RENAME TO patient_measurements_legacy"
        )

    # Re-run measurements DDL only (extract from schema file)
    ddl_start = SCHEMA.read_text(encoding="utf-8").split(
        "CREATE TABLE IF NOT EXISTS patient_measurements"
    )[1]
    ddl = (
        "CREATE TABLE patient_measurements"
        + ddl_start.split("CREATE INDEX IF NOT EXISTS idx_measurements_patient")[0]
    )
    conn.executescript(ddl)

    legacy_cols = set()
    if table_exists(cursor, "patient_measurements_legacy"):
        legacy_cols = {
            r[1] for r in cursor.execute("PRAGMA table_info(patient_measurements_legacy)")
        }
        rows = cursor.execute("SELECT * FROM patient_measurements_legacy").fetchall()
        col_names = [d[0] for d in cursor.description]
        for row in rows:
            data = dict(zip(col_names, row))
            _migrate_measurement_row(cursor, data)
        cursor.execute("DROP TABLE patient_measurements_legacy")

    cursor.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    print("  patient_measurements rebuilt.")


def _migrate_measurement_row(cursor: sqlite3.Cursor, d: dict) -> None:
    weight = d.get("weight_kg") or 70.0
    height = d.get("height_cm") or 170.0
    waist = d.get("waist_cm") or 85.0
    hip = d.get("hip_cm") or 100.0
    whr = d.get("waist_to_hip_ratio") or waist_to_hip_ratio(waist, hip)

    gender_row = cursor.execute(
        "SELECT gender FROM patients WHERE id = ?", (d["patient_id"],)
    ).fetchone()
    gender = gender_row[0] if gender_row else "male"
    abd = d.get("abdominal_obesity")
    if abd is None:
        abd = abdominal_obesity(gender, whr)

    cursor.execute(
        """
        INSERT INTO patient_measurements (
            patient_id, source, source_lab_upload_id, lab_data_complete, is_current,
            age, weight_kg, height_cm, waist_cm, hip_cm, abdominal_obesity,
            systolic_bp, diastolic_bp, heart_rate,
            smoking_status, years_since_quit, cigarettes_per_day, alcohol_group,
            physical_activity_minutes, sleep_hours_per_day, screen_time_hours_per_day,
            diet_quality, stress_level, steps_per_day,
            family_history_diabetes, hypertension_history, cardiovascular_history,
            cholesterol_total, ldl_cholesterol, hdl_cholesterol, triglycerides,
            hba1c, hematocrit, fasting_glucose, creatinine, egfr, urine_acr, alt, tsh,
            measured_at, created_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?
        )
        """,
        (
            d["patient_id"],
            d.get("source") or "manual",
            d.get("source_lab_upload_id"),
            1 if d.get("lab_data_complete", 1) else 0,
            1 if d.get("is_current", 1) else 0,
            d["age"],
            weight,
            height,
            waist,
            hip,
            1 if abd else 0,
            d.get("systolic_bp"),
            d.get("diastolic_bp"),
            d.get("heart_rate"),
            d["smoking_status"],
            d.get("years_since_quit"),
            d.get("cigarettes_per_day"),
            d["alcohol_group"],
            d["physical_activity_minutes"],
            d["sleep_hours_per_day"],
            d["screen_time_hours_per_day"],
            d.get("diet_quality"),
            d.get("stress_level"),
            d.get("steps_per_day"),
            1 if d["family_history_diabetes"] else 0,
            1 if d["hypertension_history"] else 0,
            1 if d["cardiovascular_history"] else 0,
            d.get("cholesterol_total"),
            d.get("ldl_cholesterol"),
            d.get("hdl_cholesterol"),
            d.get("triglycerides"),
            d.get("hba1c"),
            d.get("hematocrit"),
            d.get("fasting_glucose"),
            d.get("creatinine"),
            d.get("egfr"),
            d.get("urine_acr"),
            d.get("alt"),
            d.get("tsh"),
            d.get("measured_at"),
            d.get("created_at"),
        ),
    )


def seed_demo_patients(conn: sqlite3.Connection) -> None:
    """Two demo patients: risk-check + diagnosed Type 2."""
    from auth import get_password_hash

    cursor = conn.cursor()
    demos = [
        {
            "email": "riskcheck@example.com",
            "password": "Test1234!",
            "full_name": "Amina Risk Check",
            "diabetic_path": 0,
            "profile": None,
        },
        {
            "email": "diabetic@example.com",
            "password": "Test1234!",
            "full_name": "Omar Diabetic",
            "diabetic_path": 1,
            "profile": {
                "diabetes_type": "type2",
                "year_of_diagnosis": 2018,
                "on_insulin": 0,
                "on_sglt2i": 1,
                "on_metformin": 1,
                "on_statin": 1,
                "on_antihypertensive": 1,
                "hypertension_history": 1,
            },
        },
    ]

    for demo in demos:
        existing = cursor.execute(
            "SELECT id FROM users WHERE email = ?", (demo["email"],)
        ).fetchone()
        if existing:
            print(f"  skip seed (exists): {demo['email']}")
            continue

        cursor.execute(
            """
            INSERT INTO users (
                email, hashed_password, full_name, age, gender, ethnicity,
                education_level, employment_status, income_level,
                is_diabetic_path, onboarding_completed, preferred_language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'en')
            """,
            (
                demo["email"],
                get_password_hash(demo["password"]),
                demo["full_name"],
                42,
                "female" if "Amina" in demo["full_name"] else "male",
                "asian",
                3,
                "employed_full",
                2,
                demo["diabetic_path"],
            ),
        )
        uid = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO patients (
                id, user_id, age, gender, ethnicity, education_level,
                employment_status, income_level, is_diabetic_path, onboarding_complete
            ) VALUES (?, ?, 42, ?, 'asian', 3, 'employed_full', 2, ?, 1)
            """,
            (
                uid,
                uid,
                "female" if "Amina" in demo["full_name"] else "male",
                demo["diabetic_path"],
            ),
        )

        prof = demo["profile"]
        if prof:
            cursor.execute(
                """
                INSERT INTO patient_clinical_profile (
                    patient_id, diabetes_type, year_of_diagnosis,
                    on_insulin, on_sglt2i, on_metformin, on_statin, on_antihypertensive
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uid,
                    prof["diabetes_type"],
                    prof["year_of_diagnosis"],
                    prof["on_insulin"],
                    prof["on_sglt2i"],
                    prof["on_metformin"],
                    prof["on_statin"],
                    prof["on_antihypertensive"],
                ),
            )

        htn = prof["hypertension_history"] if prof else 0
        cursor.execute(
            """
            INSERT INTO patient_measurements (
                patient_id, age, weight_kg, height_cm, waist_cm, hip_cm,
                abdominal_obesity, systolic_bp, smoking_status, alcohol_group,
                physical_activity_minutes, sleep_hours_per_day, screen_time_hours_per_day,
                family_history_diabetes, hypertension_history, cardiovascular_history,
                ldl_cholesterol, hdl_cholesterol, triglycerides, hba1c, hematocrit,
                lab_data_complete
            ) VALUES (?, 42, 78, 172, 88, 102, 0, 128, 'never', 'light',
                      150, 7.0, 4.0, 1, ?, 0, 118, 52, 140, ?, 42.5, ?)
            """,
            (uid, htn, 7.2 if prof else None, 1 if prof else 0),
        )
        print(f"  seeded: {demo['email']} / {demo['password']}")

    conn.commit()


def apply_views(conn: sqlite3.Connection) -> None:
    if VIEWS.exists():
        run_sql_file(conn, VIEWS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", action="store_true", help="Insert demo patients")
    parser.add_argument("--fresh", action="store_true", help="Rebuild patient_measurements")
    args = parser.parse_args()

    path = db_path()
    print(f"Patient feature schema -> {path}")

    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")

    # Ensure users + lab_uploads exist (from main app schema)
    from database import create_tables

    create_tables()

    print("Applying patient_features.sqlite.sql...")
    run_sql_file(conn, SCHEMA)

    synced = sync_patients_from_users(conn)
    print(f"Synced {synced} row(s) into patients from users.")

    rebuild_measurements_if_needed(conn, args.fresh)

    if args.seed:
        print("Seeding demo patients...")
        seed_demo_patients(conn)

    apply_views(conn)

    cursor = conn.cursor()
    for t in ("patients", "patient_clinical_profile", "patient_measurements"):
        n = cursor.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  {t}: {n} rows")

    views = cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='view' AND name LIKE 'v_%'"
    ).fetchall()
    if views:
        print("Views:", ", ".join(v[0] for v in views))

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
