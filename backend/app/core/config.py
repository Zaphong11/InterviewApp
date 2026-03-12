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
    
    # OpenAI & Anthropic API Keys
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
    
    # Cấu hình Pydantic
    
    # Cấu hình Local Ollama
    USE_LOCAL_OLLAMA: bool = os.getenv("USE_LOCAL_OLLAMA", "False").lower() in ("true", "1", "t")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3.5:4b")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()