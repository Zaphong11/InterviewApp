# app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import EmailStr

class Settings(BaseSettings):
    # Cấu hình Database
    DATABASE_URL: str
    
    # Cấu hình JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Google Gemini API Key
    GOOGLE_API_KEY: str
    
    # Cấu hình Pydantic
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()