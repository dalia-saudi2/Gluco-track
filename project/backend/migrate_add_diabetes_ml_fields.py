#!/usr/bin/env python3
"""Add ISF, ICR, Dexcom token columns to users (SQLite)."""
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
        print("ERROR: This migration only supports SQLite.")
        return

    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)

    if not Path(db_path).exists():
        print(f"ERROR: Database not found: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users)")
    cols = [r[1] for r in cur.fetchall()]

    additions = [
        ("isf_mg_dl_per_unit", "REAL"),
        ("icr_grams_per_unit", "REAL"),
        ("dexcom_refresh_token_enc", "TEXT"),
    ]
    for name, sql_type in additions:
        if name not in cols:
            print(f"Adding {name}...")
            cur.execute(f"ALTER TABLE users ADD COLUMN {name} {sql_type}")
        else:
            print(f"OK: {name} exists")

    conn.commit()
    conn.close()
    print("Done.")


if __name__ == "__main__":
    migrate()
