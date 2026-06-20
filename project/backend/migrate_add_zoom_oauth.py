#!/usr/bin/env python3
"""Create Zoom OAuth and consultation tables."""

import sqlite3
from pathlib import Path

from config import settings


def migrate():
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        print("SKIP: run SQLAlchemy create_tables for PostgreSQL Zoom tables")
        return

    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)

    if not Path(db_path).exists():
        print(f"ERROR: Database file not found at: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS zoom_oauth_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            access_token_enc TEXT NOT NULL,
            refresh_token_enc TEXT,
            expires_at TEXT,
            zoom_user_id TEXT,
            scope TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS zoom_consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            host_user_id INTEGER NOT NULL,
            zoom_meeting_id TEXT NOT NULL,
            join_url TEXT NOT NULL,
            start_url TEXT,
            topic TEXT DEFAULT 'Medical Consultation',
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patient_id) REFERENCES users(id),
            FOREIGN KEY(host_user_id) REFERENCES users(id)
        )
        """
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_zoom_consultations_patient ON zoom_consultations (patient_id)"
    )

    conn.commit()
    conn.close()
    print("Zoom OAuth migration completed.")


if __name__ == "__main__":
    migrate()
