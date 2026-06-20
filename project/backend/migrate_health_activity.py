"""Create health_activity_daily table for per-user steps/sleep sync (SQLite)."""

import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent / "healthcare.db"


def main() -> None:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS health_activity_daily (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL REFERENCES users(id),
            activity_date DATE NOT NULL,
            steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
            sleep_hours REAL NOT NULL DEFAULT 0 CHECK (sleep_hours >= 0),
            calories_burned INTEGER NOT NULL DEFAULT 0 CHECK (calories_burned >= 0),
            source TEXT NOT NULL DEFAULT 'health_connect',
            synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(patient_id, activity_date)
        )
        """
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS ix_health_activity_patient_date "
        "ON health_activity_daily (patient_id, activity_date DESC)"
    )
    conn.commit()
    conn.close()
    print("Health activity daily table ready.")


if __name__ == "__main__":
    main()
