#!/usr/bin/env python3
"""Create doctor conversation tables."""

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
        print("ERROR: This migration only works with SQLite databases")
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
        CREATE TABLE IF NOT EXISTS doctor_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_name VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            last_message_preview VARCHAR,
            last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            patient_unread_count INTEGER DEFAULT 0,
            doctor_unread_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patient_id) REFERENCES users(id)
        )
        """
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_doctor_conversations_patient ON doctor_conversations (patient_id)"
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS doctor_conversation_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender VARCHAR NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(conversation_id) REFERENCES doctor_conversations(id)
        )
        """
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_doctor_chat_messages_conv ON doctor_conversation_messages (conversation_id)"
    )

    conn.commit()
    conn.close()
    print("Doctor chat migration completed.")


if __name__ == "__main__":
    migrate()
