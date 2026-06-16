#!/usr/bin/env python3
"""Clear all app data and reseed without deleting healthcare.db (avoids file locks)."""

import sqlite3
from pathlib import Path

from config import settings

BACKEND = Path(__file__).parent


def db_path() -> Path:
    url = settings.database_url
    p = url.replace("sqlite:///", "").replace("sqlite://", "")
    path = Path(p)
    return path if path.is_absolute() else BACKEND / path


def main() -> None:
    path = db_path()
    print(f"Refreshing data in {path}")

    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()

    tables = [
        r[0]
        for r in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
    ]
    for table in tables:
        cur.execute(f"DELETE FROM {table}")
        print(f"  cleared {table}")

    conn.commit()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.close()

    from database import create_tables

    create_tables()
    print("Tables recreated via SQLAlchemy.")

    import subprocess
    import sys

    subprocess.run(
        [sys.executable, str(BACKEND / "init_db.py")],
        cwd=str(BACKEND),
        check=False,
    )
    subprocess.run(
        [sys.executable, str(BACKEND / "build_patient_features_db.py"), "--seed"],
        cwd=str(BACKEND),
        check=True,
    )

    conn = sqlite3.connect(path)
    cur = conn.cursor()
    for t in ("users", "patients", "patient_clinical_profile", "patient_measurements"):
        try:
            n = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  {t}: {n} rows")
        except sqlite3.OperationalError:
            pass
    conn.close()
    print("Database refresh complete.")


if __name__ == "__main__":
    main()
