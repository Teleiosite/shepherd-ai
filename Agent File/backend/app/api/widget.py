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


class WidgetVoiceMessageRequest(BaseModel):
    org_id: str
    visitor_name: str
    visitor_phone_or_email: Optional[str] = None
    audio_base64: str
    audio_mime_type: Optional[str] = "audio/webm"
    speech_transcript: Optional[str] = None


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

    contact_identifier = payload.visitor_phone_or_email or f"web_{payload.visitor_name.replace(' ', '_').lower()}_{str(org_id)[:6]}"

    try:
        # Find or create contact
        contact = db.query(Contact).filter(
            Contact.organization_id == org_id,
            (Contact.phone == contact_identifier) | (Contact.email == contact_identifier)
        ).first()

        if not contact:
            contact = Contact(
                organization_id=org_id,
                name=payload.visitor_name,
                phone=contact_identifier,
                email=payload.visitor_phone_or_email if payload.visitor_phone_or_email and "@" in payload.visitor_phone_or_email else None,
                category="Website Lead",
                join_date=datetime.utcnow(),
                notes=f"Created via Website Chat Widget on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
            )
            try:
                db.add(contact)
                db.flush()
            except Exception as contact_err:
                db.rollback()
                import uuid as _uuid
                contact = Contact(
                    organization_id=org_id,
                    name=payload.visitor_name,
                    phone=f"web_{_uuid.uuid4().hex[:12]}",
                    category="Website Lead",
                    join_date=datetime.utcnow(),
                    notes="Created via Website Chat Widget"
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

        reply_text = agent_result.get("reply", "") if agent_result else "Thank you for reaching out! How can I assist you with DeceHub products and services today?"
        recommended_items = agent_result.get("recommended_items", []) if agent_result else []

        outbound_msg_id = agent_result.get("message_id") if agent_result else None

        return {
            "success": True,
            "reply": reply_text,
            "recommended_items": recommended_items,
            "action": agent_result.get("action", {}) if agent_result else {},
            "contact_id": str(contact.id),
            "message_id": outbound_msg_id or str(in_msg.id),
            "outbound_message_id": outbound_msg_id,
            "inbound_message_id": str(in_msg.id),
            "ai_name": org.ai_name or "DeceHub Assistant"
        }
    except Exception as e:
        logger.error(f"Error handling widget message: {e}", exc_info=True)
        return {
            "success": True,
            "reply": "Hello! Welcome to our store. How can I help you find what you are looking for today?",
            "recommended_items": [],
            "action": {},
            "ai_name": org.ai_name or "Live Assistant"
        }


@router.post("/voice-message")
async def handle_widget_voice_message(
    payload: WidgetVoiceMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Handles voice notes recorded by website visitors on the live chat widget.
    Transcribes audio via client Web Speech API, Groq Whisper, or Google Gemini Audio API.
    """
    import base64
    from app.services.agent_service import transcribe_voice_note
    from app.config import settings

    try:
        org_id = UUID(payload.org_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid organization ID format")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    transcription = ""
    # 1. First priority: Check if visitor's browser already transcribed the voice note via Web Speech API
    if payload.speech_transcript and payload.speech_transcript.strip():
        transcription = payload.speech_transcript.strip()
        logger.info(f"🎙️ Using visitor browser client-side transcription: '{transcription}'")

    # 2. Decode audio bytes and transcribe on backend if no browser transcription was available
    if not transcription:
        try:
            raw_b64 = payload.audio_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            audio_bytes = base64.b64decode(raw_b64)
        except Exception as dec_err:
            raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {dec_err}")

        effective_key = org.ai_api_key or getattr(settings, "gemini_api_key", None)
        transcription = await transcribe_voice_note(
            audio_bytes=audio_bytes,
            mime_type=payload.audio_mime_type or "audio/webm",
            api_key=effective_key,
            provider=getattr(org, "ai_provider", "gemini") or "gemini",
            base_url=getattr(org, "ai_base_url", None)
        )

    has_valid_transcription = bool(transcription and transcription.strip())
    if has_valid_transcription:
        incoming_message = f"[Voice Note]: {transcription.strip()}"
    else:
        incoming_message = "[Voice message — could not transcribe clearly]"

    logger.info(f"🎙️ Web Widget Voice Note processed: '{incoming_message}'")

    # 3. Process transcribed message through AI agent pipeline
    msg_payload = WidgetMessageRequest(
        org_id=payload.org_id,
        visitor_name=payload.visitor_name,
        visitor_phone_or_email=payload.visitor_phone_or_email,
        message=incoming_message
    )

    result = await handle_widget_message(msg_payload, db)
    result["transcription"] = transcription.strip() if has_valid_transcription else ""
    return result



@router.get("/poll/{org_id}/{visitor_id}")
async def poll_widget_messages(
    org_id: str,
    visitor_id: str,
    db: Session = Depends(get_db)
):
    """
    Allows the website chat widget to receive replies sent by human agents from the dashboard.
    """
    try:
        org_uuid = UUID(org_id)
    except:
        return {"messages": []}

    contact = db.query(Contact).filter(
        Contact.organization_id == org_uuid,
        (Contact.phone == visitor_id) | (Contact.email == visitor_id)
    ).first()

    if not contact:
        return {"messages": []}

    outbound_msgs = db.query(Message).filter(
        Message.organization_id == org_uuid,
        Message.contact_id == contact.id,
        Message.type == "Outbound"
    ).order_by(Message.created_at.desc()).limit(15).all()

    outbound_msgs.reverse()

    return {
        "messages": [
            {
                "id": str(m.id),
                "content": m.content,
                "type": m.type,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in outbound_msgs
        ]
    }

