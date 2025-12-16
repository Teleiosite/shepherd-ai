from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    """Schema for creating a new message."""
    contact_id: UUID4
    content: str
    type: str  # outbound, inbound
    status: str = "pending"
    scheduled_for: Optional[datetime] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None


class MessageUpdate(BaseModel):
    """Schema for updating a message."""
    content: Optional[str] = None
    status: Optional[str] = None
    scheduled_for: Optional[datetime] = None


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: UUID4
    organization_id: UUID4
    contact_id: UUID4
    content: str
    type: str
    status: str
    scheduled_for: Optional[datetime]
    sent_at: Optional[datetime]
    whatsapp_message_id: Optional[str]
    attachment_url: Optional[str]
    attachment_type: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
