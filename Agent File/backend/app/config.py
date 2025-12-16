from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    
    # Authentication
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # AI
    gemini_api_key: str
    google_embedding_api_key: Optional[str] = None
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    
    # Authentication
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # AI
    gemini_api_key: str
    google_embedding_api_key: Optional[str] = None
    
    # WhatsApp
    whatsapp_api_url: str = "https://graph.facebook.com/v18.0"
    whatsapp_phone_id: str = ""
    whatsapp_access_token: str = ""
    whatsapp_verify_token: str = "shepherd_ai_verify_token"
    meta_app_secret: str = ""
    
    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)


settings = Settings()
