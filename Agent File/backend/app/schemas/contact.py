from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class ContactCreate(BaseModel):
    """Schema for creating a new contact."""
    name: str
    phone: str
    email: Optional[str] = None
    category: str
    join_date: datetime
    notes: Optional[str] = None
    # whatsapp_id removed - not in database model yet


class ContactUpdate(BaseModel):
    """Schema for updating a contact."""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    # whatsapp_id removed - not in database model yet


class ContactResponse(BaseModel):
    """Schema for contact response."""
    id: UUID4
    organization_id: UUID4
    name: str
    phone: str
    email: Optional[str]
    category: str
    join_date: datetime
    notes: Optional[str]
    status: str
    last_contacted: Optional[datetime]
    # whatsapp_id removed - not in database model yet
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
