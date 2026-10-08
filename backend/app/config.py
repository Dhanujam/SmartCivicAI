from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    MONGODB_URI: str = ""
    DB_NAME: str = "smartcivic"
    DATABASE_NAME: Optional[str] = None
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # JWT Authentication
    JWT_SECRET: str = "smartcivic_super_secret_jwt_key_hackathon_2026_dev"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 72

    # Default Government Official (Admin) Seed Credentials
    DEFAULT_ADMIN_EMAIL: str = "admin@smartcivic.gov"
    DEFAULT_ADMIN_PASSWORD: str = "Admin@12345"
    DEFAULT_ADMIN_NAME: str = "Municipal Official"

    # Prototype SLA Configuration (configurable through environment variables)
    SLA_CRITICAL_HOURS: int = 12
    SLA_HIGH_HOURS: int = 24
    SLA_MEDIUM_HOURS: int = 48
    SLA_LOW_HOURS: int = 72
    SLA_DUE_SOON_PERCENT: int = 20

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip().strip('"\'') for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def database_name(self) -> str:
        return self.DATABASE_NAME or self.DB_NAME or "smartcivic"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
