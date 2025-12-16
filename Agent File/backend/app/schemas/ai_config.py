"""
AI Configuration Schemas
For managing AI provider settings per organization
"""

from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class AIConfigCreate(BaseModel):
    """Schema for creating/updating AI configuration"""
    provider: str  # 'gemini', 'openai', 'deepseek', 'groq', 'custom'
    api_key: str
    model: str = 'gemini-pro'
    base_url: Optional[str] = None  # For custom providers


class AIConfigUpdate(BaseModel):
    """Schema for updating AI configuration"""
    provider: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None


class AIConfigResponse(BaseModel):
    """Schema for AI configuration response (API key masked)"""
    id: UUID4
    organization_id: UUID4
    provider: str
    api_key_masked: str  # Returns as "***...last4chars"
    model: str
    base_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AIConfigTest(BaseModel):
    """Schema for testing AI configuration before saving"""
    provider: str
    api_key: str
    model: str = 'gemini-pro'
    base_url: Optional[str] = None
    test_prompt: str = "Hello, respond with 'OK' if you can read this."


class WhatsAppMetaConfig(BaseModel):
    """Schema for WhatsApp Meta Business API configuration"""
    phone_number_id: str
    business_account_id: str
    access_token: str
    webhook_verify_token: Optional[str] = None
    app_secret: Optional[str] = None


class WhatsAppMetaConfigResponse(BaseModel):
    """Schema for WhatsApp Meta config response (tokens masked)"""
    phone_number_id: str
    business_account_id: str
    access_token_masked: str
    webhook_verify_token: Optional[str]
    
    class Config:
        from_attributes = True
