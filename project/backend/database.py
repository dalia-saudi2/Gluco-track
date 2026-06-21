from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create database engine
if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url, 
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(settings.database_url)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create all tables
def create_tables():
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_columns()


def _ensure_sqlite_columns():
    """Lightweight SQLite patches for columns added after initial deploy."""
    if not settings.database_url.startswith("sqlite"):
        return
    with engine.connect() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(predictions)").fetchall()
        cols = {r[1] for r in rows}
        if "complication_result" not in cols:
            conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN complication_result JSON")
            conn.commit()
        user_rows = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        user_cols = {r[1] for r in user_rows}
        if "height_cm" not in user_cols:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN height_cm FLOAT")
            conn.commit()
        if "weight_kg" not in user_cols:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN weight_kg FLOAT")
            conn.commit()
