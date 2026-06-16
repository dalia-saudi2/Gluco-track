#!/usr/bin/env python3
"""Reset onboarding progress for all users (fresh first-run flow)."""

import sqlite3
from pathlib import Path
from config import settings


def reset_onboarding():
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        print("ERROR: This script only works with SQLite databases")
        return

    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)

    if not Path(db_path).exists():
        print(f"ERROR: Database file not found at: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for table in (
        "predictions",
        "patient_measurements",
        "patient_clinical_profile",
        "lab_uploads",
        "app_notifications",
    ):
        try:
            cursor.execute(f"DELETE FROM {table}")
            print(f"Cleared table: {table}")
        except sqlite3.OperationalError:
            pass

    cursor.execute(
        """
        UPDATE users SET
          onboarding_completed = 0,
          lab_upload_pending = 0,
          is_diabetic_path = NULL,
          age = NULL,
          date_of_birth = NULL,
          gender = NULL,
          ethnicity = NULL,
          education_level = NULL,
          education_major = NULL,
          employment_status = NULL,
          income_level = NULL,
          onboarding_lab_opt_in = NULL
        """
    )
    conn.commit()
    print(f"Reset onboarding for {cursor.rowcount} user(s).")
    conn.close()


if __name__ == "__main__":
    reset_onboarding()
