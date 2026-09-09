"""
Website Live Chat Widget API Endpoint
Allows website visitors to chat directly with Shepherd AI.
Runs through the exact same 24/7 AI Agent, RAG, and Intent engine.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models.contact import Contact
from app.models.message import Message
from app.models.organization import Organization
from app.services.agent_service import trigger_ai_agent_reply
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/widget", tags=["Website Widget"])


class WidgetMessageRequest(BaseModel):
    org_id: str
    visitor_name: str
    visitor_phone_or_email: Optional[str] = None
    message: str


@router.get("/config/{org_id}")
async def get_widget_config(
    org_id: str,
    db: Session = Depends(get_db)
):
    """
    Public config endpoint for website embed widget.
    Returns brand styling, colors, and welcome greeting.
    """
    try:
        org_uuid = UUID(org_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid organization ID format")

    org = db.query(Organization).filter(Organization.id == org_uuid).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "org_id": str(org.id),
        "name": org.name,
        "ai_name": org.ai_name or "Live Assistant",
        "primary_color": getattr(org, "widget_primary_color", "#10b981") or "#10b981",
        "welcome_message": getattr(org, "widget_welcome_message", "Welcome! How can we help you today?") or "Welcome! How can we help you today?",
        "position": getattr(org, "widget_position", "bottom-right") or "bottom-right",
        "placeholder": getattr(org, "widget_placeholder", "Ask a question or inquire about products...") or "Ask a question or inquire about products...",
        "avatar_url": getattr(org, "widget_avatar_url", None)
    }


@router.post("/message")
async def handle_widget_message(
    payload: WidgetMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Public webhook for website live chat widget.
    Processes inbound message and returns AI reply + recommended catalog items.
    """
    try:
        org_id = UUID(payload.org_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid organization ID format")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # SaaS Usage Quota Guard
    limit = getattr(org, "monthly_message_limit", 1000) or 1000
    used = getattr(org, "messages_used_this_month", 0) or 0
    if used >= limit:
        logger.warning(f"Organization {org.name} ({org.id}) reached monthly message quota ({used}/{limit}).")
        return {
            "success": True,
            "reply": "Thank you for reaching out! We are currently experiencing high inquiry volume. Please leave your email or phone number and our team will get back to you shortly.",
            "recommended_items": [],
            "action": {"type": "QUOTA_EXCEEDED"},
            "ai_name": org.ai_name or "Shepherd AI"
        }

    contact_identifier = payload.visitor_phone_or_email or f"web_{payload.visitor_name.replace(' ', '_').lower()}"

    # Find or create contact
    contact = db.query(Contact).filter(
        Contact.organization_id == org_id,
        (Contact.phone == contact_identifier) | (Contact.email == contact_identifier) | (Contact.name == payload.visitor_name)
    ).first()

    if not contact:
        contact = Contact(
            organization_id=org_id,
            name=payload.visitor_name,
            phone=payload.visitor_phone_or_email if payload.visitor_phone_or_email and payload.visitor_phone_or_email.startswith("+") else "+0000000000",
            email=payload.visitor_phone_or_email if payload.visitor_phone_or_email and "@" in payload.visitor_phone_or_email else None,
            category="Website Lead",
            join_date=datetime.utcnow(),
            notes=f"Created via Website Chat Widget on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(contact)
        db.flush()

    # Save Inbound Message
    in_msg = Message(
        organization_id=org_id,
        contact_id=contact.id,
        content=payload.message,
        type="Inbound",
        status="Received",
        sent_at=datetime.utcnow(),
        attachment_type="web"
    )
    db.add(in_msg)
    db.commit()

    # Trigger AI Agent Reply with channel="web_widget"
    agent_result = await trigger_ai_agent_reply(
        contact_id=contact.id,
        incoming_text=payload.message,
        org_id=org_id,
        db=db,
        channel="web_widget"
    )

    reply_text = agent_result.get("reply", "") if agent_result else "Thank you for reaching out! We will get back to you shortly."
    recommended_items = agent_result.get("recommended_items", []) if agent_result else []

    return {
        "success": True,
        "reply": reply_text,
        "recommended_items": recommended_items,
        "action": agent_result.get("action", {}) if agent_result else {},
        "contact_id": str(contact.id),
        "message_id": str(in_msg.id),
        "ai_name": org.ai_name or "Shepherd AI"
    }
