from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./healthcare.db"
    
    # Security
    secret_key: str = "your-super-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Gemini AI - load from environment variable GEMINI_API_KEY (do not hard-code secrets)
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # CORS
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081", 
        "http://localhost:8082",
        "http://localhost:8083",  # React Native web port
        "http://localhost:8084",  # React Native web port (alternative)
        "exp://192.168.1.5:8082"  # Expo development server
    ]
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    upload_dir: str = "./uploads"
    
    # Email (optional)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    
    class Config:
        env_file = None  # Don't load .env file
        case_sensitive = False

settings = Settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.upload_dir, exist_ok=True)
