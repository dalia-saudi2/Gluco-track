"""Create water_intake_daily and water_intake_logs tables (SQLite)."""

import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent / "healthcare.db"


def main() -> None:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS water_intake_daily (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL REFERENCES users(id),
            intake_date DATE NOT NULL,
            total_ml INTEGER NOT NULL DEFAULT 0,
            goal_ml INTEGER NOT NULL DEFAULT 2500,
            log_count INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(patient_id, intake_date)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS water_intake_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL REFERENCES users(id),
            intake_date DATE NOT NULL,
            amount_ml INTEGER NOT NULL CHECK(amount_ml BETWEEN 1 AND 5000),
            logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS ix_water_intake_daily_patient_date "
        "ON water_intake_daily (patient_id, intake_date DESC)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS ix_water_intake_logs_patient_date "
        "ON water_intake_logs (patient_id, intake_date DESC)"
    )
    conn.commit()
    conn.close()
    print("Water intake tables ready.")


if __name__ == "__main__":
    main()
