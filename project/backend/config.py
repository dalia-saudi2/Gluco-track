from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./healthcare.db")
    
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
        "http://localhost:8083",  # React Native web port
        "http://localhost:8084",  # React Native web port (alternative)
    ]
    
    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            # Handle comma-separated string from .env file
            if v:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
            return []
        return v
    
    # File Upload
    max_file_size: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # Email (optional)
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")

settings = Settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.upload_dir, exist_ok=True)
