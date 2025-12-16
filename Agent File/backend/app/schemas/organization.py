from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class OrganizationCreate(BaseModel):
    """Schema for creating an organization."""
    name: str
    ai_name: str = "Shepherd AI"


class OrganizationResponse(BaseModel):
    """Schema for organization response."""
    id: UUID4
    name: str
    ai_name: str
    whatsapp_phone_id: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
