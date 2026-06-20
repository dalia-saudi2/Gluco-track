#!/usr/bin/env python3
"""Add Flow B columns: lab_upload_pending, lab_data_complete, nullable vitals."""

import sqlite3
from pathlib import Path
from config import settings

USER_COLUMNS = [
    ("lab_upload_pending", "BOOLEAN DEFAULT 0"),
]

MEASUREMENT_COLUMNS = [
    ("lab_data_complete", "BOOLEAN DEFAULT 1"),
    ("activity_level", "TEXT"),
]

PREDICTION_COLUMNS = [
    ("is_estimated", "BOOLEAN DEFAULT 0"),
    ("features_used", "INTEGER"),
    ("features_total", "INTEGER DEFAULT 25"),
    ("imputed_features", "TEXT"),
]


def migrate():
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        print("ERROR: SQLite only")
        return

    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    def add_columns(table: str, columns: list[tuple[str, str]]):
        cursor.execute(f"PRAGMA table_info({table})")
        existing = {row[1] for row in cursor.fetchall()}
        for name, col_type in columns:
            if name not in existing:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {name} {col_type}")
                    print(f"Added {table}.{name}")
                except sqlite3.OperationalError as e:
                    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                        print(f"Column {table}.{name} already exists (skipped)")
                    else:
                        raise

    add_columns("users", USER_COLUMNS)
    add_columns("patient_measurements", MEASUREMENT_COLUMNS)
    add_columns("predictions", PREDICTION_COLUMNS)

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS app_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            notification_type TEXT NOT NULL,
            channel TEXT NOT NULL DEFAULT 'push',
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            scheduled_at TEXT,
            sent_at TEXT,
            cancelled INTEGER NOT NULL DEFAULT 0,
            pinned INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patient_id) REFERENCES users(id)
        )
        """
    )
    print("Ensured app_notifications table exists")

    conn.commit()
    conn.close()
    print("Flow B migration completed.")

    # Rebuild vitals columns if still NOT NULL (SQLite cannot ALTER COLUMN nullability)
    from migrate_nullable_vitals import migrate as migrate_nullable_vitals
    migrate_nullable_vitals()


if __name__ == "__main__":
    migrate()
