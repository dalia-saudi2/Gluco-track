#!/usr/bin/env python3
"""Remove seed/demo rows; keep only the specified user account and related data."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

from config import settings

KEEP_EMAIL = "daliasaudi2@gmail.com"
BACKEND = Path(__file__).parent


def db_path() -> Path:
    url = settings.database_url
    p = url.replace("sqlite:///", "").replace("sqlite://", "")
    path = Path(p)
    return path if path.is_absolute() else BACKEND / path


def main() -> None:
    path = db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = OFF")

    row = cur.execute("SELECT id FROM users WHERE email = ?", (KEEP_EMAIL,)).fetchone()
    if not row:
        print(f"No user found for {KEEP_EMAIL}", file=sys.stderr)
        sys.exit(1)
    keep_user_id = row["id"]
    keep_patient_id = cur.execute(
        "SELECT id FROM patients WHERE user_id = ?", (keep_user_id,)
    ).fetchone()
    keep_patient_id = keep_patient_id["id"] if keep_patient_id else None

    print(f"Keeping user id={keep_user_id} ({KEEP_EMAIL})")
    if keep_patient_id:
        print(f"Keeping patient id={keep_patient_id}")

    def delete_where(table: str, col: str, keep_ids: list[int]) -> int:
        if not keep_ids:
            cur.execute(f"DELETE FROM {table}")
        else:
            placeholders = ",".join("?" * len(keep_ids))
            cur.execute(
                f"DELETE FROM {table} WHERE {col} NOT IN ({placeholders})",
                keep_ids,
            )
        n = cur.rowcount
        if n:
            print(f"  deleted {n} from {table}")
        return n

    # Legacy tables reference users.id as patient_id
    cur.execute(
        """
        DELETE FROM chat_messages
        WHERE session_id IN (
            SELECT session_id FROM chat_sessions WHERE patient_id != ?
        )
        """,
        (keep_user_id,),
    )
    if cur.rowcount:
        print(f"  deleted {cur.rowcount} from chat_messages")

    for table in ("chat_sessions", "messages", "medications", "appointments", "medical_records"):
        delete_where(table, "patient_id", [keep_user_id])

    # Feature-group tables reference patients.id
    if keep_patient_id is not None:
        delete_where("app_notifications", "patient_id", [keep_patient_id])
        delete_where("predictions", "patient_id", [keep_patient_id])
        delete_where("patient_measurements", "patient_id", [keep_patient_id])
        delete_where("patient_clinical_profile", "patient_id", [keep_patient_id])
        delete_where("lab_uploads", "patient_id", [keep_patient_id])
        delete_where("patients", "id", [keep_patient_id])
    else:
        for table in (
            "app_notifications",
            "predictions",
            "patient_measurements",
            "patient_clinical_profile",
            "lab_uploads",
            "patients",
        ):
            cur.execute(f"DELETE FROM {table}")
            if cur.rowcount:
                print(f"  deleted {cur.rowcount} from {table}")

    delete_where("users", "id", [keep_user_id])

    conn.commit()
    cur.execute("PRAGMA foreign_keys = ON")
    conn.close()

    print("\nRemaining row counts:")
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    for t in (
        "users",
        "patients",
        "patient_clinical_profile",
        "patient_measurements",
        "predictions",
        "app_notifications",
        "medications",
        "appointments",
        "medical_records",
        "messages",
        "chat_sessions",
        "chat_messages",
        "lab_uploads",
    ):
        try:
            n = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  {t}: {n}")
        except sqlite3.OperationalError:
            pass
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
