"""WhatsApp Group model."""
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Group(Base):
    """WhatsApp Group model for managing groups."""
    
    __tablename__ = "groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    whatsapp_group_id = Column(String(255), nullable=False)  # WhatsApp's internal group ID
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    member_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Auto-welcome settings
    auto_welcome_enabled = Column(Boolean, default=False)
    welcome_message_template = Column(Text, nullable=True)
    
    # Auto-contact settings
    auto_add_as_contact = Column(Boolean, default=True)
    default_contact_category = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="groups")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("GroupMessage", back_populates="group", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('organization_id', 'whatsapp_group_id', name='uq_org_whatsapp_group'),
        Index('idx_groups_org', 'organization_id'),
        Index('idx_groups_whatsapp_id', 'whatsapp_group_id'),
    )


class GroupMember(Base):
    """Group member tracking."""
    
    __tablename__ = "group_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    whatsapp_id = Column(String(255), nullable=False)  # Phone number
    name = Column(String(255), nullable=True)
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    group = relationship("Group", back_populates="members")
    contact = relationship("Contact")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('group_id', 'whatsapp_id', name='uq_group_member'),
        Index('idx_group_members_group', 'group_id'),
        Index('idx_group_members_contact', 'contact_id'),
    )


class GroupMessage(Base):
    """Group broadcast messages."""
    
    __tablename__ = "group_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(50), default='pending')  # pending, sent, failed
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Organization")
    group = relationship("Group", back_populates="messages")
    creator = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_group_messages_group', 'group_id'),
        Index('idx_group_messages_status', 'status', 'scheduled_for'),
    )
