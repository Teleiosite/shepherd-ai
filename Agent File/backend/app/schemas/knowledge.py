from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class KnowledgeResourceCreate(BaseModel):
    """Schema for creating a knowledge resource."""
    title: str
    type: str  # book, sermon, devotional
    content: str
    file_name: Optional[str] = None


class KnowledgeResourceResponse(BaseModel):
    """Schema for knowledge resource response."""
    id: UUID4
    organization_id: UUID4
    title: str
    type: str
    content: str
    file_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
