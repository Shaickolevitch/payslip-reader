from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ENV: str = "development"

    # Anthropic
    ANTHROPIC_API_KEY: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "https://your-client.vercel.app",
    ]

    # Storage
    SUPABASE_BUCKET: str = "payslips"

    class Config:
        env_file = ".env"


settings = Settings()
