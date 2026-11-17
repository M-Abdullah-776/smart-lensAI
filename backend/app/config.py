try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    try:
        from pydantic import BaseSettings
        SettingsConfigDict = dict
    except ImportError:
        # Minimal mock if running without pydantic installed in host environment
        class BaseSettings:
            pass
        SettingsConfigDict = dict

from typing import List
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./smartlens.db"
    SECRET_KEY: str = "smartlens_production_super_secret_jwt_key_2026_min32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SESSION_INACTIVITY_MINUTES: int = 30
    
    AI_PROVIDER: str = "gemini"  # gemini, openai, anthropic
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-1.5-pro"
    
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@smartlens.ai"
    EMAIL_VERIFICATION: bool = False
    FRONTEND_URL: str = "http://localhost:5173"
    
    ADMIN_EMAIL: str = "admin@smartlens.ai"
    ADMIN_PASSWORD: str = "Admin@12345"
    
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    
    MAX_UPLOAD_SIZE_MB: int = 10
    DAILY_AI_REQUEST_LIMIT: int = 50
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
