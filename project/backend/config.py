from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from pathlib import Path
from typing import List
import os

BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILE = BACKEND_DIR / ".env"
DEFAULT_SQLITE_PATH = BACKEND_DIR / "healthcare.db"


def resolve_database_url(url: str) -> str:
    """Anchor relative SQLite paths to backend/ so cwd does not matter."""
    if not url.startswith("sqlite"):
        return url
    if url.startswith("sqlite:///"):
        db_path = url[len("sqlite:///") :]
    elif url.startswith("sqlite://"):
        db_path = url[len("sqlite://") :]
    else:
        return url
    path = Path(db_path)
    if not path.is_absolute():
        path = (BACKEND_DIR / path).resolve()
    return f"sqlite:///{path.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database — always points at project/backend/healthcare.db unless overridden
    database_url: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}",
    )
    
    # Security
    # CRITICAL: Set SECRET_KEY environment variable in production!
    # Generate a strong key: python -c "import secrets; print(secrets.token_urlsafe(32))"
    secret_key: str = os.getenv("SECRET_KEY", "your-super-secret-key-here-change-in-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Gemini AI - load from environment variable GEMINI_API_KEY (do not hard-code secrets)
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # Groq API - load from environment variable GROQ_API_KEY (do not hard-code secrets)
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    
    # DeepSeek API - load from environment variable DEEPSEEK_API_KEY
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")

    # USDA FoodData Central (optional; meal carb lookup)
    usda_fdc_api_key: str = os.getenv("USDA_FDC_API_KEY", "")
    
    # CORS - Load from environment or use defaults for development
    # In production, set ALLOWED_ORIGINS environment variable (comma-separated)
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:8084",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:8083",
        "http://127.0.0.1:8084",
        "http://192.168.1.9:8084",
    ]
    
    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            # Empty env var should not wipe defaults
            if not v.strip():
                return v
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # File Upload
    max_file_size: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # Email (optional)
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")

    # Zoom OAuth (User-managed app) — telemedicine
    zoom_client_id: str = os.getenv("ZOOM_CLIENT_ID", "")
    zoom_client_secret: str = os.getenv("ZOOM_CLIENT_SECRET", "")
    zoom_redirect_uri: str = os.getenv("ZOOM_REDIRECT_URI", "http://localhost:8000/zoom/oauth/callback")
    zoom_oauth_frontend_redirect: str = os.getenv(
        "ZOOM_OAUTH_FRONTEND_REDIRECT", "http://localhost:8084"
    )
    zoom_host_user_id: str = os.getenv("ZOOM_HOST_USER_ID", "")

    # Legacy Server-to-Server (optional fallback for scheduled appointments)
    zoom_account_id: str = os.getenv("ZOOM_ACCOUNT_ID", "")
    zoom_user_id: str = os.getenv("ZOOM_USER_ID", "me")

    # Telehealth — Google Calendar + Meet (service account JSON path, calendar id)
    google_service_account_file: str = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")
    google_calendar_id: str = os.getenv("GOOGLE_CALENDAR_ID", "primary")

settings = Settings()
settings.database_url = resolve_database_url(settings.database_url)

# Create upload directory if it doesn't exist
os.makedirs(settings.upload_dir, exist_ok=True)
