"""API routes for WhatsApp Groups management."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta

from app.database import get_db
from app.models.group import Group, GroupMember, GroupMessage
from app.models.contact import Contact
from app.models.user import User
from app.schemas.group import (
    GroupResponse, GroupCreate, GroupUpdate,
    GroupMemberResponse,  GroupMemberWithContact, MemberJoinedEvent,
    GroupMessageCreate, GroupMessageResponse, GroupMessageUpdate,
    GroupSyncRequest, GroupSyncResponse, WelcomeQueueItem
)
from app.dependencies import get_current_active_user

router = APIRouter()


# ==================== GROUPS ====================

@router.get("/", response_model=List[GroupResponse])
async def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all groups for the current user's organization."""
    groups = db.query(Group).filter(
        Group.organization_id == current_user.organization_id,
        Group.is_active == True
    ).all()
    
    return [GroupResponse.model_validate(g) for g in groups]


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed information about a specific group."""
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    return GroupResponse.model_validate(group)


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    group_update: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update group settings."""
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Update fields
    update_data = group_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(group, key, value)
    
    db.commit()
    db.refresh(group)
    
    return GroupResponse.model_validate(group)


@router.post("/sync", response_model=GroupSyncResponse)
async def sync_groups(
    sync_request: GroupSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Sync groups from WhatsApp bridge."""
    new_count = 0
    updated_count = 0
    
    for group_data in sync_request.groups:
        # Check if group already exists
        existing_group = db.query(Group).filter(
            Group.organization_id == current_user.organization_id,
            Group.whatsapp_group_id == group_data.whatsapp_group_id
        ).first()
        
        if existing_group:
            # Update existing group
            existing_group.name = group_data.name
            existing_group.description = group_data.description
            existing_group.avatar_url = group_data.avatar_url
            existing_group.member_count = group_data.member_count
            existing_group.is_active = True
            updated_count += 1
        else:
            # Create new group
            new_group = Group(
                organization_id=current_user.organization_id,
                whatsapp_group_id=group_data.whatsapp_group_id,
                name=group_data.name,
                description=group_data.description,
                avatar_url=group_data.avatar_url,
                member_count=group_data.member_count
            )
            db.add(new_group)
            new_count += 1
    
    db.commit()
    
    return GroupSyncResponse(
        synced=len(sync_request.groups),
        new=new_count,
        updated=updated_count
    )


# ==================== GROUP MEMBERS ====================

@router.get("/{group_id}/members", response_model=List[GroupMemberWithContact])
async def list_group_members(
    group_id: str,
    recent: bool = Query(False, description="Only show members who joined in last 7 days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List members in a group."""
    # Verify group belongs to organization
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Build query
    query = db.query(GroupMember, Contact).outerjoin(
        Contact, GroupMember.contact_id == Contact.id
    ).filter(
        GroupMember.group_id == group_id,
        GroupMember.left_at.is_(None)  # Only active members
    )
    
    # Filter by recent if requested
    if recent:
        seven_days_ago = datetime.now() - timedelta(days=7)
        query = query.filter(GroupMember.joined_at >= seven_days_ago)
    
    results = query.all()
    
    # Build response with contact info
    members = []
    for member, contact in results:
        member_dict = GroupMemberResponse.model_validate(member).model_dump()
        member_dict['contact_name'] = contact.name if contact else None
        member_dict['contact_category'] = contact.category if contact else None
        members.append(GroupMemberWithContact(**member_dict))
    
    return members


@router.post("/{group_id}/members/joined")
async def member_joined(
    group_id: str,
    event: MemberJoinedEvent,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Handle a new member joining a group."""
    # Get group
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if member already exists
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.whatsapp_id == event.whatsapp_id
    ).first()
    
    if existing_member:
        # Rejoin (if they left before)
        existing_member.left_at = None
        existing_member.joined_at = event.joined_at
        member = existing_member
    else:
        # Create new member
        member = GroupMember(
            group_id=group_id,
            whatsapp_id=event.whatsapp_id,
            name=event.name,
            joined_at=event.joined_at
        )
        db.add(member)
        
        # Update group member count
        group.member_count += 1
    
    db.commit()
    db.refresh(member)
    
    # Auto-add as contact if enabled
    contact = None
    if group.auto_add_as_contact:
        # Check if contact already exists
        existing_contact = db.query(Contact).filter(
            Contact.organization_id == current_user.organization_id,
            Contact.phone == event.phone
        ).first()
        
        if not existing_contact:
            # Create new contact
            contact = Contact(
                organization_id=current_user.organization_id,
                name=event.name or "Unknown",
                phone=event.phone,
                category=group.default_contact_category or "Group Member",
                join_date=event.joined_at,
                notes=f"Added from WhatsApp group: {group.name}",
                created_by=current_user.id
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
            
            # Link member to contact
            member.contact_id = contact.id
            db.commit()
    
    return {
        "member_id": str(member.id),
        "contact_created": contact is not None,
        "contact_id": str(contact.id) if contact else None
    }


# ==================== GROUP MESSAGES ====================

@router.post("/{group_id}/messages", response_model=GroupMessageResponse)
async def send_group_message(
    group_id: str,
    message_data: GroupMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send or schedule a message to a group."""
    # Verify group
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Create message
    message = GroupMessage(
        organization_id=current_user.organization_id,
        group_id=group_id,
        content=message_data.content,
        scheduled_for=message_data.scheduled_for or datetime.now(),
        created_by=current_user.id
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return GroupMessageResponse.model_validate(message)


@router.get("/messages/pending", response_model=List[GroupMessageResponse])
async def get_pending_group_messages(
    db: Session = Depends(get_db)
):
    """Get pending group messages for the bridge to send."""
    now = datetime.now()
    
    messages = db.query(GroupMessage).filter(
        GroupMessage.status == 'pending',
        GroupMessage.scheduled_for <= now
    ).all()
    
    return [GroupMessageResponse.model_validate(m) for m in messages]


@router.post("/messages/{message_id}/status")
async def update_message_status(
    message_id: str,
    status_update: GroupMessageUpdate,
    db: Session = Depends(get_db)
):
    """Update message status after sending."""
    message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    message.status = status_update.status
    message.sent_at = status_update.sent_at
    message.error_message = status_update.error_message
    
    db.commit()
    
    return {"success": True}


# ==================== WELCOME QUEUE ====================

@router.get("/welcome-queue", response_model=List[WelcomeQueueItem])
async def get_welcome_queue(
    db: Session = Depends(get_db)
):
    """Get pending welcome messages for new group members."""
    # Find new members (joined in last 5 minutes, no contact yet or no welcome sent)
    five_min_ago = datetime.now() - timedelta(minutes=5)
    
    # This is a simplified version - in production you'd track welcome status separately
    new_members = db.query(GroupMember, Group).join(
        Group, GroupMember.group_id == Group.id
    ).filter(
        GroupMember.joined_at >= five_min_ago,
        GroupMember.left_at.is_(None),
        Group.auto_welcome_enabled == True
    ).all()
    
    welcome_items = []
    for member, group in new_members:
        # Replace template variables
        message = group.welcome_message_template or "Welcome to {{group_name}}!"
        message = message.replace("{{name}}", member.name or "there")
        message = message.replace("{{group_name}}", group.name)
        
        # Extract phone from whatsapp_id (remove @c.us)
        phone = member.whatsapp_id.replace("@c.us", "")
        
        welcome_items.append(WelcomeQueueItem(
            id=member.id,
            phone=phone,
            message=message,
            group_name=group.name
        ))
    
    return welcome_items


@router.post("/welcome-queue/{member_id}/sent")
async def mark_welcome_sent(
    member_id: str,
    db: Session = Depends(get_db)
):
    """Mark a welcome message as sent."""
    # In a production system, you'd track this in a separate table
    # For now, we'll just return success
    return {"success": True}
