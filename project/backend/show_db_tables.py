#!/usr/bin/env python3
import sqlite3
from pathlib import Path

db = Path(__file__).parent / "healthcare.db"
conn = sqlite3.connect(db)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]

print("DATABASE:", db)
print("TABLES:", len(tables))
print()

for t in tables:
    cur.execute(f"PRAGMA table_info('{t}')")
    cols = cur.fetchall()
    cur.execute(f"SELECT COUNT(*) FROM '{t}'")
    count = cur.fetchone()[0]
    print(f"=== {t} ({count} rows) ===")
    for _cid, name, col_type, notnull, default, pk in cols:
        flags = []
        if pk:
            flags.append("PK")
        if notnull:
            flags.append("NOT NULL")
        if default is not None:
            flags.append(f"default={default}")
        extra = f" [{', '.join(flags)}]" if flags else ""
        print(f"  - {name}: {col_type}{extra}")
    print()

conn.close()
