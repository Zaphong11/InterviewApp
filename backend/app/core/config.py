# app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import EmailStr
import os
import dotenv

dotenv.load_dotenv()

class Settings(BaseSettings):
    # Cấu hình Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    # Cấu hình JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Google Gemini API Key
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY")
    
    # Cấu hình Pydantic
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()