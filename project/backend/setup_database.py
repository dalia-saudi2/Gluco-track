#!/usr/bin/env python3
"""
Initialize the healthcare database (SQLite dev or PostgreSQL).

Usage:
    py -3.12 setup_database.py           # create tables + migrations
    py -3.12 setup_database.py --seed     # also load sample data (init_db)
    py -3.12 setup_database.py --fresh    # delete SQLite file and recreate
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from config import settings
from database import create_tables
import models  # noqa: F401 — register ORM tables before create_all

BACKEND_DIR = Path(__file__).parent

# SQLite migrations to run after create_tables (order matters)
SQLITE_MIGRATIONS = [
    "migrate_add_bmi_blood_pressure.py",
    "migrate_add_onboarding_fields.py",
    "migrate_add_education_major.py",
    "migrate_add_lab_choice.py",
    "migrate_add_diabetes_ml_fields.py",
    "migrate_nullable_vitals.py",
    "migrate_flow_b.py",
    "migrate_feature_groups.py",
    "build_patient_features_db.py",
    "migrate_add_telehealth_meeting.py",
    "migrate_add_zoom_oauth.py",
    "migrate_health_activity.py",
]


def is_sqlite() -> bool:
    return settings.database_url.startswith("sqlite")


def sqlite_path() -> Path | None:
    if not is_sqlite():
        return None
    url = settings.database_url
    if url.startswith("sqlite:///"):
        p = url.replace("sqlite:///", "")
    else:
        p = url.replace("sqlite://", "")
    path = Path(p)
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return path


def run_migration(script: str) -> None:
    path = BACKEND_DIR / script
    if not path.exists():
        print(f"  skip (missing): {script}")
        return
    print(f"  running {script}...")
    result = subprocess.run(
        [sys.executable, str(path)],
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout.rstrip())
    if result.returncode != 0:
        if result.stderr:
            print(result.stderr.rstrip(), file=sys.stderr)
        raise SystemExit(f"Migration failed: {script}")


def list_tables() -> list[str]:
    if is_sqlite():
        import sqlite3

        db = sqlite_path()
        conn = sqlite3.connect(str(db))
        cur = conn.cursor()
        cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [r[0] for r in cur.fetchall()]
        conn.close()
        return tables

    from sqlalchemy import inspect
    from database import engine

    return sorted(inspect(engine).get_table_names())


def main() -> None:
    parser = argparse.ArgumentParser(description="Set up healthcare database")
    parser.add_argument(
        "--seed", action="store_true", help="Load sample data via init_db.py"
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Delete existing SQLite DB and recreate (dev only)",
    )
    args = parser.parse_args()

    print("Healthcare database setup")
    print(f"  DATABASE_URL = {settings.database_url}")

    if args.fresh:
        if not is_sqlite():
            raise SystemExit("--fresh only supported for SQLite")
        db = sqlite_path()
        if db and db.exists():
            db.unlink()
            print(f"  removed {db}")

    print("\n1. Creating SQLAlchemy tables...")
    create_tables()
    print("   done")

    if is_sqlite():
        print("\n2. Applying SQLite migrations...")
        for script in SQLITE_MIGRATIONS:
            run_migration(script)
        print("   done")
    else:
        print(
            "\n2. PostgreSQL: apply schema.sql and migrations/001_feature_groups.sql"
        )
        print("   (use docker compose up -d or sql/setup_postgres.ps1)")

    if args.seed:
        print("\n3. Seeding sample data...")
        from init_db import create_sample_data

        create_sample_data()
        print("   done")

    tables = list_tables()
    print(f"\nDatabase ready — {len(tables)} tables:")
    for name in tables:
        print(f"  • {name}")

    if is_sqlite():
        print(f"\nSQLite file: {sqlite_path()}")
    else:
        print("\nPostgreSQL connection active.")


if __name__ == "__main__":
    main()
