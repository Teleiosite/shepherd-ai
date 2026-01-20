from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Organization(Base):
    """Organization/Church model."""
    
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    ai_name = Column(String(255), default="Shepherd AI")
    whatsapp_phone_id = Column(String(255), nullable=True)
    whatsapp_business_account_id = Column(String(255), nullable=True)
    whatsapp_access_token = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="organization", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="organization", cascade="all, delete-orphan")
    knowledge_resources = relationship("KnowledgeResource", back_populates="organization", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="organization", cascade="all, delete-orphan")
    workflow_steps = relationship("WorkflowStep", back_populates="organization", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="organization", cascade="all, delete-orphan")
