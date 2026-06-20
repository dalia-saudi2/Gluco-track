#!/usr/bin/env python3
"""Add telehealth meeting columns to appointments table."""

import sqlite3
from pathlib import Path

from config import settings

COLUMNS = [
    ("visit_mode", "TEXT"),
    ("meeting_url", "TEXT"),
    ("meeting_provider", "TEXT"),
    ("meeting_id", "TEXT"),
    ("telehealth_platform", "TEXT"),
]


def migrate():
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        print("SKIP: telehealth migration only auto-runs for SQLite (add columns manually for PostgreSQL)")
        return

    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)

    if not Path(db_path).exists():
        print(f"ERROR: Database file not found at: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(appointments)")
    existing = {row[1] for row in cursor.fetchall()}

    for name, col_type in COLUMNS:
        if name not in existing:
            cursor.execute(f"ALTER TABLE appointments ADD COLUMN {name} {col_type}")
            print(f"Added column: {name}")

    cursor.execute(
        """
        UPDATE appointments
        SET visit_mode = 'telehealth'
        WHERE visit_mode IS NULL
          AND location IS NOT NULL
          AND lower(location) LIKE '%telehealth%'
        """
    )
    conn.commit()
    conn.close()
    print("Telehealth meeting migration completed.")


if __name__ == "__main__":
    migrate()
