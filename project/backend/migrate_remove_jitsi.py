"""Remove legacy Jitsi meeting links from appointments (SQLite dev DB)."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from config import settings

BACKEND_DIR = Path(__file__).resolve().parent


def _clear_jitsi_meetings(conn: sqlite3.Connection) -> int:
    cur = conn.execute(
        """
        UPDATE appointments
        SET meeting_url = NULL,
            meeting_provider = NULL,
            meeting_id = NULL
        WHERE lower(coalesce(meeting_url, '')) LIKE '%jit.si%'
           OR lower(coalesce(meeting_provider, '')) LIKE '%jitsi%'
        """
    )
    conn.commit()
    return cur.rowcount


def _default_telehealth_to_zoom(conn: sqlite3.Connection) -> int:
    cur = conn.execute(
        """
        UPDATE appointments
        SET telehealth_platform = 'zoom'
        WHERE visit_mode = 'telehealth'
          AND (telehealth_platform IS NULL OR telehealth_platform = 'google_meet')
          AND meeting_url IS NULL
        """
    )
    conn.commit()
    return cur.rowcount


def migrate() -> None:
    if not settings.database_url.startswith("sqlite"):
        print("SKIP: Jitsi cleanup only auto-runs for SQLite")
        return

    db_path = settings.database_url.replace("sqlite:///", "")
    path = Path(db_path)
    if not path.is_absolute():
        path = BACKEND_DIR / path

    conn = sqlite3.connect(path)
    try:
        cleared = _clear_jitsi_meetings(conn)
        print(f"Cleared Jitsi meeting data from {cleared} appointment(s).")

        if updated := _default_telehealth_to_zoom(conn):
            print(f"Set default telehealth platform to zoom for {updated} appointment(s).")
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
