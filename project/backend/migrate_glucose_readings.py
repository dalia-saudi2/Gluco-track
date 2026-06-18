"""Create glucose_readings and glucose_weekly_summaries tables (SQLite)."""

import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent / "healthcare.db"


def main() -> None:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS glucose_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL REFERENCES users(id),
            value_mgdl INTEGER NOT NULL CHECK(value_mgdl BETWEEN 20 AND 600),
            reading_type VARCHAR NOT NULL,
            measured_at DATETIME NOT NULL,
            status VARCHAR NOT NULL,
            notes TEXT,
            source VARCHAR NOT NULL DEFAULT 'manual',
            device_id VARCHAR(100),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS ix_glucose_readings_patient_measured "
        "ON glucose_readings (patient_id, measured_at DESC)"
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS glucose_weekly_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL REFERENCES users(id),
            week_start DATETIME NOT NULL,
            avg_value REAL NOT NULL,
            min_value INTEGER NOT NULL,
            max_value INTEGER NOT NULL,
            readings_count INTEGER NOT NULL,
            days_in_range INTEGER NOT NULL,
            days_elevated INTEGER NOT NULL,
            days_high INTEGER NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(patient_id, week_start)
        )
        """
    )
    conn.commit()
    conn.close()
    print("Glucose tables ready.")


if __name__ == "__main__":
    main()
