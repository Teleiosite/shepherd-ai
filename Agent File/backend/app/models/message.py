from sqlalchemy import Column, String, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Message(Base):
    """Message model for tracking communications."""
    
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    type = Column(String(50), nullable=False)  # outbound, inbound
    status = Column(String(50), nullable=False)  # pending, sent, delivered, read, failed
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    whatsapp_message_id = Column(String(255), nullable=True)
    attachment_url = Column(String, nullable=True)
    attachment_type = Column(String(50), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="messages")
    contact = relationship("Contact", back_populates="messages")
    creator = relationship("User", back_populates="created_messages", foreign_keys=[created_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_messages_contact', 'contact_id', 'created_at'),
        Index('idx_messages_scheduled', 'scheduled_for', postgresql_where=(status == 'pending')),
    )
