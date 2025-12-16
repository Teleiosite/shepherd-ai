from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Contact(Base):
    """Contact model for church members and prospects."""
    
    __tablename__ = "contacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    category = Column(String(100), nullable=False)
    join_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(String, nullable=True)
    status = Column(String(50), default="Active")
    last_contacted = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="contacts")
    creator = relationship("User", back_populates="created_contacts", foreign_keys=[created_by])
    messages = relationship("Message", back_populates="contact", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('organization_id', 'phone', name='uq_org_phone'),
        Index('idx_contacts_org_category', 'organization_id', 'category'),
        Index('idx_contacts_join_date', 'join_date'),
    )
