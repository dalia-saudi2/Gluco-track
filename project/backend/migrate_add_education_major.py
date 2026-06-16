#!/usr/bin/env python3
"""Add education_major column to users table."""

import sqlite3
from pathlib import Path
from config import settings

COLUMNS = [
    ("education_major", "TEXT"),
]


def migrate():
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        print("ERROR: This migration only works with SQLite databases")
        return

    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)

    if not Path(db_path).exists():
        print(f"ERROR: Database file not found at: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    existing = {row[1] for row in cursor.fetchall()}

    for name, col_type in COLUMNS:
        if name not in existing:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {name} {col_type}")
            print(f"Added column: {name}")

    conn.commit()
    conn.close()
    print("education_major migration completed.")


if __name__ == "__main__":
    migrate()
