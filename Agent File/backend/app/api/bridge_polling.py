"""
Bridge Polling Endpoints
Allows bridge app to poll for pending messages and update status
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.dependencies import get_db
from app.models import User, Message, Contact

router = APIRouter()


class MessageStatusUpdate(BaseModel):
    """Update message status"""
    message_id: str
    status: str  # sent, failed
    whatsapp_message_id: Optional[str] = None
    error: Optional[str] = None


class PendingMessage(BaseModel):
    """Pending message for bridge to send"""
    id: str
    contact_id: str
    content: str
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    created_at: str
    # Contact details for sending
    phone: str


@router.get("/pending-messages")
async def get_pending_messages(
    code: str = Query(..., description="Connection code"),
    db: Session = Depends(get_db)
):
    """
    Get pending messages for the bridge to send
    Bridge polls this endpoint every few seconds
    
    Args:
        code: Connection code (user ID prefix)
        
    Returns:
        List of pending messages to send
    """
    from sqlalchemy import cast, String
    
    # Find user by connection code
    user = db.query(User).filter(
        cast(User.id, String).like(f"{code.lower()}%")
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid connection code"
        )
    
    # Get pending messages for this organization with contact details
    pending = db.query(Message, Contact).join(
        Contact, Message.contact_id == Contact.id
    ).filter(
        Message.organization_id == user.organization_id,
        Message.type == "Outbound",
        Message.status == "Pending"
    ).order_by(Message.created_at).limit(10).all()
    
    messages = []
    for msg, contact in pending:
        messages.append(PendingMessage(
            id=str(msg.id),
            contact_id=str(msg.contact_id),
            content=msg.content,
            attachment_url=msg.attachment_url,
            attachment_type=msg.attachment_type,
            created_at=msg.created_at.isoformat(),
            phone=contact.phone
        ))
    
    return {
        "success": True,
        "count": len(messages),
        "messages": messages
    }


@router.post("/update-message-status")
async def update_message_status(
    update: MessageStatusUpdate,
    code: str = Query(..., description="Connection code"),
    db: Session = Depends(get_db)
):
    """
    Update the status of a message after bridge sends it
    
    Args:
        update: Message status update
        code: Connection code for authentication
        
    Returns:
        Success status
    """
    from sqlalchemy import cast, String
    
    # Validate connection code
    user = db.query(User).filter(
        cast(User.id, String).like(f"{code.lower()}%")
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid connection code"
        )
    
    # Find and update message
    message = db.query(Message).filter(
        Message.id == UUID(update.message_id),
        Message.organization_id == user.organization_id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Update status
    message.status = update.status.capitalize()
    if update.whatsapp_message_id:
        message.whatsapp_message_id = update.whatsapp_message_id
    if update.status.lower() == "sent":
        message.sent_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True,
        "message": "Status updated successfully"
    }
