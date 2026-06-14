#!/usr/bin/env python3
"""
Migration script to add bmi and blood_pressure columns to users table
"""

import sqlite3
from pathlib import Path
from config import settings

def migrate():
    """Add bmi and blood_pressure columns to users table if they don't exist"""
    
    # 1. Get database path from settings
    # The database URL usually looks like 'sqlite:///path/to/db.sqlite'
    db_url = settings.database_url
    if db_url.startswith("sqlite:///"):
        # Remove the sqlite prefix to get the filesystem path
        db_path = db_url.replace("sqlite:///", "")
    elif db_url.startswith("sqlite://"):
        db_path = db_url.replace("sqlite://", "")
    else:
        # Currently, this script only supports SQLite (development database)
        print("ERROR: This migration only works with SQLite databases")
        return
    
    # 2. Convert to absolute path if relative to ensure we find the file
    if not Path(db_path).is_absolute():
        db_path = str(Path(__file__).parent / db_path)
    
    print(f"Database path: {db_path}")
    
    # 3. Verify the database file actually exists before proceeding
    if not Path(db_path).exists():
        print(f"ERROR: Database file not found at: {db_path}")
        return
    
    try:
        # 4. Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 5. Check the current schema of the 'users' table
        # PRAGMA table_info returns details about each column in the table
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        print(f"Current columns: {', '.join(columns)}")
        
        # 6. Add 'bmi' column if it doesn't already exist (Idempotent operation)
        if 'bmi' not in columns:
            print("Adding 'bmi' column...")
            cursor.execute("ALTER TABLE users ADD COLUMN bmi TEXT")
            print("SUCCESS: Added 'bmi' column")
        else:
            print("OK: 'bmi' column already exists")
        
        # 7. Add 'blood_pressure' column if it doesn't already exist
        if 'blood_pressure' not in columns:
            print("Adding 'blood_pressure' column...")
            cursor.execute("ALTER TABLE users ADD COLUMN blood_pressure TEXT")
            print("SUCCESS: Added 'blood_pressure' column")
        else:
            print("OK: 'blood_pressure' column already exists")
        
        conn.commit()
        conn.close()
        
        print("\nSUCCESS: Migration completed successfully!")
        
    except Exception as e:
        print(f"ERROR: Error during migration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("="*50)
    print("Migration: Add BMI and Blood Pressure Columns")
    print("="*50)
    print()
    migrate()
