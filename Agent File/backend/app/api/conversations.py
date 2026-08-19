"""
Conversations API Endpoints
Handles chat status triage (open, escalated, resolved) and human handover AI pause controls
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_active_user
from app.models.user import User
from app.models.contact import Contact
from app.models.message import Message

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


class ConversationStatusUpdate(BaseModel):
    status: str  # 'open', 'escalated', 'resolved'


class AIPauseRequest(BaseModel):
    paused: bool
    duration_minutes: Optional[int] = 120  # default 2 hours


@router.get("/")
async def list_conversations(
    status_filter: Optional[str] = Query(None, description="Filter by status: open, escalated, resolved"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve all conversations for the user's organization with status and pause flags."""
    query = db.query(Contact).filter(Contact.organization_id == current_user.organization_id)

    if status_filter:
        query = query.filter(Contact.conversation_status == status_filter)

    contacts = query.order_by(Contact.updated_at.desc()).all()
    now = datetime.utcnow()

    results = []
    for c in contacts:
        # Check if AI is currently paused
        is_paused = False
        if c.ai_paused_until:
            paused_dt = c.ai_paused_until.replace(tzinfo=None)
            is_paused = paused_dt > now

        # Get last message
        last_msg = db.query(Message).filter(
            Message.contact_id == c.id
        ).order_by(Message.created_at.desc()).first()

        results.append({
            "contact_id": str(c.id),
            "contact_name": c.name,
            "contact_phone": c.phone,
            "category": c.category,
            "conversation_status": c.conversation_status or "open",
            "ai_paused": is_paused,
            "ai_paused_until": c.ai_paused_until.isoformat() if c.ai_paused_until else None,
            "last_message": last_msg.content if last_msg else None,
            "last_message_time": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            "last_message_type": last_msg.type if last_msg else None
        })

    return results


@router.put("/{contact_id}/status")
async def update_conversation_status(
    contact_id: str,
    update: ConversationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update conversation triage status (open, escalated, resolved)."""
    contact = db.query(Contact).filter(
        Contact.id == UUID(contact_id),
        Contact.organization_id == current_user.organization_id
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.conversation_status = update.status.lower()
    contact.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "contact_id": contact_id,
        "conversation_status": contact.conversation_status
    }


@router.put("/{contact_id}/pause-ai")
async def toggle_ai_pause(
    contact_id: str,
    req: AIPauseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Pause or resume AI auto-reply for a specific contact (human takeover)."""
    contact = db.query(Contact).filter(
        Contact.id == UUID(contact_id),
        Contact.organization_id == current_user.organization_id
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if req.paused:
        duration = req.duration_minutes or 120
        contact.ai_paused_until = datetime.utcnow() + timedelta(minutes=duration)
    else:
        contact.ai_paused_until = None

    contact.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "contact_id": contact_id,
        "ai_paused": req.paused,
        "ai_paused_until": contact.ai_paused_until.isoformat() if contact.ai_paused_until else None
    }
