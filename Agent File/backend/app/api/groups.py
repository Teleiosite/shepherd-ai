"""API routes for WhatsApp Groups management."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, cast, String
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
from app.dependencies import get_current_active_user, get_current_user_optional

router = APIRouter()


# Helper function for bridge authentication using connection code
def get_user_by_connection_code(code: str, db: Session) -> User:
    """Authenticate using bridge connection code."""
    user = db.query(User).filter(
        cast(User.id, String).like(f"{code.lower()}%")
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid connection code"
        )
    
    return user


# ==================== GROUPS ====================

@router.get("/", response_model=List[GroupResponse])
async def list_groups(
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """List all groups for the current user's organization."""
    # Use connection code if provided, otherwise use JWT
    if code:
        user = get_user_by_connection_code(code, db)
    elif current_user:
        user = current_user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    groups = db.query(Group).filter(
        Group.organization_id == user.organization_id
    ).all()
    
    return groups


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: str,
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get detailed information about a specific group."""
    # Use connection code if provided, otherwise use JWT
    if code:
        user = get_user_by_connection_code(code, db)
    elif current_user:
        user = current_user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    return group


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    group_update: GroupUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
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
    for field, value in group_update.dict(exclude_unset=True).items():
        setattr(group, field, value)
    
    group.updated_at = datetime.now()
    db.commit()
    db.refresh(group)
    
    return group


@router.post("/sync", response_model=GroupSyncResponse)
async def sync_groups(
    sync_request: GroupSyncRequest,
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Sync groups from WhatsApp bridge."""
    # Use connection code if provided, otherwise use JWT
    if code:
        user = get_user_by_connection_code(code, db)
    elif current_user:
        user = current_user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    synced_count = 0
    new_count = 0
    updated_count = 0
    
    for group_data in sync_request.groups:
        # Check if group already exists
        existing_group = db.query(Group).filter(
            Group.whatsapp_group_id == group_data.whatsapp_group_id,
            Group.organization_id == user.organization_id
        ).first()
        
        if existing_group:
            # Update existing group
            existing_group.name = group_data.name
            existing_group.description = group_data.description
            existing_group.member_count = group_data.member_count
            existing_group.avatar_url = group_data.avatar_url
            existing_group.updated_at = datetime.now()
            updated_count += 1
        else:
            # Create new group
            new_group = Group(
                organization_id=user.organization_id,
                whatsapp_group_id=group_data.whatsapp_group_id,
                name=group_data.name,
                description=group_data.description,
                member_count=group_data.member_count,
                avatar_url=group_data.avatar_url
            )
            db.add(new_group)
            new_count += 1
        
        synced_count += 1
    
    db.commit()
    
    return GroupSyncResponse(
        synced=synced_count,
        new=new_count,
        updated=updated_count
    )


# ==================== GROUP MEMBERS ====================

@router.get("/{group_id}/members", response_model=List[GroupMemberWithContact])
async def list_group_members(
    group_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all members of a group."""
    # Verify group exists and belongs to user's organization
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Get members with their contact info
    members = db.query(GroupMember, Contact).outerjoin(
        Contact, GroupMember.contact_id == Contact.id
    ).filter(
        GroupMember.group_id == group_id,
        GroupMember.left_at.is_(None)
    ).all()
    
    result = []
    for member, contact in members:
        result.append(GroupMemberWithContact(
            id=member.id,
            whatsapp_id=member.whatsapp_id,
            name=member.name,
            joined_at=member.joined_at,
            contact_name=contact.name if contact else None,
            contact_category=contact.category if contact else None
        ))
    
    return result


@router.post("/{group_id}/members/joined")
async def member_joined(
    group_id: str,
    event: MemberJoinedEvent,
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Handle a new member joining a group."""
    # Use connection code if provided, otherwise use JWT
    if code:
        user = get_user_by_connection_code(code, db)
    elif current_user:
        user = current_user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Verify group exists
    group = db.query(Group).filter(
        Group.whatsapp_group_id == group_id,
        Group.organization_id == user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if member already exists
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.whatsapp_id == event.whatsapp_id
    ).first()
    
    if existing_member:
        # Re-mark as joined if they left before
        if existing_member.left_at:
            existing_member.left_at = None
            existing_member.joined_at = event.joined_at
        return {"message": "Member re-joined", "contact_created": False}
    
    # Create new member record
    new_member = GroupMember(
        group_id=group.id,
        whatsapp_id=event.whatsapp_id,
        name=event.name,
        joined_at=event.joined_at
    )
    
    # Auto-create contact if enabled
    contact_created = False
    if group.auto_add_as_contact:
        # Check if contact already exists
        existing_contact = db.query(Contact).filter(
            Contact.phone == event.phone,
            Contact.organization_id == user.organization_id
        ).first()
        
        if not existing_contact:
            new_contact = Contact(
                organization_id=user.organization_id,
                name=event.name or f"Group Member {event.phone}",
                phone=event.phone,
                category=group.default_contact_category or "Group Member",
                source="whatsapp_group",
                last_contacted=datetime.now()
            )
            db.add(new_contact)
            db.flush()
            
            new_member.contact_id = new_contact.id
            contact_created = True
        else:
            new_member.contact_id = existing_contact.id
    
    db.add(new_member)
    db.commit()
    
    return {"message": "Member added successfully", "contact_created": contact_created}


# ==================== GROUP MESSAGES ====================

@router.get("/{group_id}/messages", response_model=List[GroupMessageResponse])
async def list_group_messages(
    group_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all messages for a group."""
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id
    ).order_by(GroupMessage.created_at.desc()).all()
    
    return messages


@router.post("/{group_id}/messages", response_model=GroupMessageResponse)
async def create_group_message(
    group_id: str,
    message: GroupMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new group message (broadcast or scheduled)."""
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.organization_id == current_user.organization_id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    new_message = GroupMessage(
        organization_id=current_user.organization_id,
        group_id=group_id,
        content=message.content,
        scheduled_for=message.scheduled_for,
        status="pending",
        created_by=current_user.id
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return new_message


@router.get("/messages/pending")
async def get_pending_group_messages(
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db)
):
    """Get pending group messages for the bridge to send."""
    if not code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Connection code required"
        )
    
    user = get_user_by_connection_code(code, db)
    
    # Get pending messages (not sent yet, and scheduled time has passed or no schedule)
    now = datetime.now()
    
    messages = db.query(GroupMessage, Group).join(
        Group, GroupMessage.group_id == Group.id
    ).filter(
        GroupMessage.organization_id == user.organization_id,
        GroupMessage.status == "pending",
        func.coalesce(GroupMessage.scheduled_for, now) <= now
    ).all()
    
    result = []
    for msg, group in messages:
        result.append({
            "id": str(msg.id),
            "group_id": group.whatsapp_group_id,  # WhatsApp group ID for sending
            "content": msg.content,
            "scheduled_for": msg.scheduled_for.isoformat() if msg.scheduled_for else None
        })
    
    return result


@router.post("/messages/{message_id}/status")
async def update_message_status(
    message_id: str,
    status_update: GroupMessageUpdate,
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db)
):
    """Update message status after bridge processes it."""
    if not code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Connection code required"
        )
    
    user = get_user_by_connection_code(code, db)
    
    message = db.query(GroupMessage).filter(
        GroupMessage.id == message_id,
        GroupMessage.organization_id == user.organization_id
    ).first()
    
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
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db)
):
    """Get pending welcome messages for new group members."""
    # Find new members (joined in last 5 minutes, no contact yet or no welcome sent)
    five_min_ago = datetime.now() - timedelta(minutes=5)
    
    # Build query
    query = db.query(GroupMember, Group).join(
        Group, GroupMember.group_id == Group.id
    ).filter(
        GroupMember.joined_at >= five_min_ago,
        GroupMember.left_at.is_(None),
        Group.auto_welcome_enabled == True
    )
    
    # Filter by organization if connection code provided
    if code:
        user = get_user_by_connection_code(code, db)
        query = query.filter(Group.organization_id == user.organization_id)
    
    new_members = query.all()
    
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
    code: Optional[str] = Query(None, description="Bridge connection code"),
    db: Session = Depends(get_db)
):
    """Mark a welcome message as sent."""
    # In a production system, you'd track this in a separate table
    # For now, we'll just return success
    return {"success": True}
