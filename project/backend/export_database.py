#!/usr/bin/env python3
"""Export live healthcare.db schema and data into project/sql/ files."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from config import settings

BACKEND_DIR = Path(__file__).parent
SQL_DIR = BACKEND_DIR / "sql"
SCHEMA_OUT = SQL_DIR / "healthcare.sqlite.schema.sql"
SNAPSHOT_OUT = SQL_DIR / "healthcare.sqlite.snapshot.sql"


def db_path() -> Path:
    url = settings.database_url
    p = url.replace("sqlite:///", "").replace("sqlite://", "")
    path = Path(p)
    return path if path.is_absolute() else BACKEND_DIR / path


def export_schema(conn: sqlite3.Connection, out: Path) -> None:
    lines = [
        "-- Auto-generated from live healthcare.db — do not edit by hand.",
        f"-- Exported: {datetime.now(timezone.utc).isoformat()}",
        "",
        "PRAGMA foreign_keys = OFF;",
        "",
    ]
    cur = conn.cursor()
    cur.execute(
        "SELECT name, sql FROM sqlite_master "
        "WHERE type IN ('table', 'index', 'trigger', 'view') "
        "AND name NOT LIKE 'sqlite_%' "
        "AND sql IS NOT NULL "
        "ORDER BY type, name"
    )
    for _name, sql in cur.fetchall():
        lines.append(f"{sql.rstrip()};")
        lines.append("")
    lines.append("PRAGMA foreign_keys = ON;")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")


def export_snapshot(conn: sqlite3.Connection, out: Path) -> None:
    header = (
        "-- Full SQLite snapshot (schema + data) from healthcare.db.\n"
        f"-- Exported: {datetime.now(timezone.utc).isoformat()}\n"
        "-- Restore: py -3.12 setup_database.py --fresh && sqlite3 healthcare.db < healthcare.sqlite.snapshot.sql\n"
        "\n"
    )
    with out.open("w", encoding="utf-8") as fh:
        fh.write(header)
        for line in conn.iterdump():
            fh.write(f"{line}\n")


def main() -> None:
    path = db_path()
    if not path.exists():
        raise SystemExit(f"Database not found: {path}")
    if not settings.database_url.startswith("sqlite"):
        raise SystemExit("export_database.py supports SQLite only")

    SQL_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)

    export_schema(conn, SCHEMA_OUT)
    export_snapshot(conn, SNAPSHOT_OUT)
    conn.close()

    print(f"Exported schema  -> {SCHEMA_OUT}")
    print(f"Exported snapshot -> {SNAPSHOT_OUT}")
    print(f"Source database   -> {path}")


if __name__ == "__main__":
    main()
