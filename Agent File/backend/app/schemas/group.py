"""Schemas for WhatsApp Groups."""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


# Group Schemas
class GroupBase(BaseModel):
    """Base group schema."""
    name: str
    description: Optional[str] = None
    auto_welcome_enabled: bool = False
    welcome_message_template: Optional[str] = None
    auto_add_as_contact: bool = True
    default_contact_category: Optional[str] = None


class GroupCreate(GroupBase):
    """Schema for creating a group."""
    whatsapp_group_id: str


class GroupUpdate(BaseModel):
    """Schema for updating group settings."""
    name: Optional[str] = None
    description: Optional[str] = None
    auto_welcome_enabled: Optional[bool] = None
    welcome_message_template: Optional[str] = None
    auto_add_as_contact: Optional[bool] = None
    default_contact_category: Optional[str] = None
    is_active: Optional[bool] = None


class GroupResponse(GroupBase):
    """Schema for group response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    organization_id: UUID
    whatsapp_group_id: str
    avatar_url: Optional[str] = None
    member_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Group Member Schemas
class GroupMemberBase(BaseModel):
    """Base group member schema."""
    whatsapp_id: str
    name: Optional[str] = None
    is_admin: bool = False


class GroupMemberCreate(GroupMemberBase):
    """Schema for adding a member."""
    pass


class GroupMemberResponse(GroupMemberBase):
    """Schema for member response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    group_id: UUID
    contact_id: Optional[UUID] = None
    joined_at: datetime
    left_at: Optional[datetime] = None


class GroupMemberWithContact(GroupMemberResponse):
    """Member response with contact details."""
    contact_name: Optional[str] = None
    contact_category: Optional[str] = None


# Group Message Schemas
class GroupMessageCreate(BaseModel):
    """Schema for creating a group message."""
    content: str
    scheduled_for: Optional[datetime] = None


class GroupMessageResponse(BaseModel):
    """Schema for group message response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    group_id: UUID
    content: str
    status: str
    scheduled_for: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime


class GroupMessageUpdate(BaseModel):
    """Schema for updating message status."""
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None


# Sync Schemas
class GroupSyncData(BaseModel):
    """Data from bridge for group sync."""
    whatsapp_group_id: str
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    member_count: int


class GroupSyncRequest(BaseModel):
    """Request to sync groups from bridge."""
    groups: list[GroupSyncData]


class GroupSyncResponse(BaseModel):
    """Response after syncing groups."""
    synced: int
    new: int
    updated: int


# Member Join Event
class MemberJoinedEvent(BaseModel):
    """Event when a member joins a group."""
    whatsapp_id: str
    name: Optional[str] = None
    phone: str
    joined_at: datetime


# Welcome Queue
class WelcomeQueueItem(BaseModel):
    """Welcome message to be sent."""
    id: UUID
    phone: str
    message: str
    group_name: str
