"""
Website Live Chat Widget API Endpoint
Allows website visitors to chat directly with Shepherd AI.
Runs through the exact same 24/7 AI Agent, RAG, and Intent engine.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
import hashlib
import hmac

from app.config import settings
from app.database import get_db
from app.models.contact import Contact
from app.models.message import Message
from app.models.organization import Organization
from app.services.agent_service import trigger_ai_agent_reply
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/widget", tags=["Website Widget"])


def generate_visitor_session_token(org_id: str, visitor_id: str) -> str:
    """Generate a cryptographically signed session token for a visitor polling session."""
    secret = (settings.secret_key or "shepherd_visitor_fallback_secret").encode("utf-8")
    message = f"{str(org_id).lower()}:{str(visitor_id).lower()}".encode("utf-8")
    return hmac.new(secret, message, hashlib.sha256).hexdigest()[:32]


def verify_visitor_session_token(org_id: str, visitor_id: str, token: Optional[str]) -> bool:
    """Verify that the provided token matches the expected HMAC for org_id and visitor_id."""
    if not token:
        return False
    expected = generate_visitor_session_token(org_id, visitor_id)
    return hmac.compare_digest(expected, token.strip())


class WidgetMessageRequest(BaseModel):
    org_id: str
    visitor_name: str = Field(..., max_length=150)
    visitor_phone_or_email: Optional[str] = Field(None, max_length=150)
    message: str = Field(..., max_length=5000)


class WidgetVoiceMessageRequest(BaseModel):
    org_id: str
    visitor_name: str = Field(..., max_length=150)
    visitor_phone_or_email: Optional[str] = Field(None, max_length=150)
    audio_base64: Optional[str] = ""
    audio_mime_type: Optional[str] = "audio/webm"
    speech_transcript: Optional[str] = None


@router.get("/config/{org_id}")
async def get_widget_config(
    org_id: str,
    visitor_id: Optional[str] = Query(None, description="Visitor identifier for session token generation"),
    db: Session = Depends(get_db)
):
    """
    Public config endpoint for website embed widget.
    Returns brand styling, colors, and welcome greeting with signed session token.
    """
    try:
        org_uuid = UUID(org_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid organization ID format")

    org = db.query(Organization).filter(Organization.id == org_uuid).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    session_token = generate_visitor_session_token(str(org.id), visitor_id) if visitor_id else None

    return {
        "org_id": str(org.id),
        "name": org.name,
        "ai_name": org.ai_name or "Live Assistant",
        "primary_color": getattr(org, "widget_primary_color", "#10b981") or "#10b981",
        "welcome_message": getattr(org, "widget_welcome_message", "Welcome! How can we help you today?") or "Welcome! How can we help you today?",
        "position": getattr(org, "widget_position", "bottom-right") or "bottom-right",
        "placeholder": getattr(org, "widget_placeholder", "Ask a question or inquire about products...") or "Ask a question or inquire about products...",
        "avatar_url": getattr(org, "widget_avatar_url", None),
        "session_token": session_token
    }


@router.post("/message")
async def handle_widget_message(
    payload: WidgetMessageRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public webhook for website live chat widget.
    Processes inbound message and returns AI reply + recommended catalog items.
    """
    # SEC-11: Rate limiting on public chat widget (30 requests per minute per IP)
    client_ip = request.client.host if request.client else "unknown"
    from app.utils.security_utils import widget_rate_limiter
    allowed, retry_after = widget_rate_limiter.is_allowed(client_ip, max_requests=30, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Please wait {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

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

        from app.services.agent_service import deduplicate_catalog_items
        reply_text = (agent_result.get("reply") or "").strip() if agent_result else ""
        recommended_items = deduplicate_catalog_items(agent_result.get("recommended_items", [])) if agent_result else []

        if not reply_text:
            err_msg = agent_result.get("error") if agent_result else "None"
            logger.warning(f"AI Agent returned empty or error reply for widget: {err_msg}")
            # Only match catalog items if visitor explicitly inquired about products
            try:
                from app.services.agent_service import _has_explicit_product_intent
                if _has_explicit_product_intent(payload.message):
                    from app.models.catalog_item import CatalogItem
                    import re
                    words = [w for w in re.findall(r"\w+", payload.message.lower()) if len(w) >= 3 and w not in {"the", "and", "need", "want", "have", "some", "like", "you", "for", "are", "there", "can", "please"}]
                    matched_items = []
                    if words:
                        all_ci = db.query(CatalogItem).filter(
                            CatalogItem.organization_id == org_id,
                            CatalogItem.is_available == True
                        ).all()
                        for ci in all_ci:
                            t_low = (ci.title or "").lower()
                            c_low = (ci.category or "").lower()
                            if any(w in t_low or w in c_low for w in words):
                                price_display = f"{ci.price_currency or 'NGN'} {ci.price_amount:,.0f}".strip() if ci.price_amount else "Contact for pricing"
                                matched_items.append({
                                    "id": str(ci.id),
                                    "title": ci.title,
                                    "category": ci.category or "",
                                    "description": ci.description or "",
                                    "price": price_display,
                                    "price_amount": float(ci.price_amount) if ci.price_amount else 0,
                                    "image_url": ci.image_url or "",
                                    "action_url": ci.action_url or f"https://decehub.com/?s={ci.title}",
                                    "attributes": ci.attributes or {}
                                })
                    if matched_items:
                        recommended_items = deduplicate_catalog_items(matched_items)[:5]
                        reply_text = f"We have several options in stock for you! Here are our available products:"
                    else:
                        reply_text = f"Hello! Welcome to {org.name}. How can I assist you today?"
                else:
                    reply_text = f"Hello! Welcome to {org.name}. How can I assist you today?"
            except Exception as fb_err:
                logger.warning(f"Widget catalog fallback error: {fb_err}")
                reply_text = f"Hello! Welcome to {org.name}. How can I assist you today?"

        recommended_items = deduplicate_catalog_items(recommended_items)
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
            "ai_name": org.ai_name or "DeceHub Assistant",
            "session_token": generate_visitor_session_token(str(org_id), contact_identifier),
            "debug_error": agent_result.get("error") if agent_result else None,
            "debug_tb": agent_result.get("traceback") if agent_result else None
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
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handles voice notes recorded by website visitors on the live chat widget.
    Transcribes audio via client Web Speech API, Groq Whisper, or Google Gemini Audio API.
    """
    # SEC-11: Rate limiting on public voice widget (15 requests per minute per IP)
    client_ip = request.client.host if request.client else "unknown"
    from app.utils.security_utils import widget_rate_limiter
    allowed, retry_after = widget_rate_limiter.is_allowed(f"voice_{client_ip}", max_requests=15, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many voice requests. Please wait {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

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
    # 1. First priority: High-accuracy backend neural transcription (Groq Whisper / Gemini Multimodal)
    # Supports Nigerian English, Yoruba, Hausa, Igbo, Pidgin, and accented voice notes
    audio_bytes = None
    try:
        raw_b64 = payload.audio_base64 or ""
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        raw_b64 = raw_b64.strip()
        missing_padding = len(raw_b64) % 4
        if missing_padding:
            raw_b64 += "=" * (4 - missing_padding)
        if raw_b64:
            audio_bytes = base64.b64decode(raw_b64)
    except Exception as dec_err:
        logger.warning(f"Invalid base64 audio in widget voice message: {dec_err}")
        audio_bytes = None

    if audio_bytes and len(audio_bytes) > 50:
        effective_key = org.ai_api_key or getattr(settings, "gemini_api_key", None)
        transcription = await transcribe_voice_note(
            audio_bytes=audio_bytes,
            mime_type=payload.audio_mime_type or "audio/webm",
            api_key=effective_key,
            provider=getattr(org, "ai_provider", "gemini") or "gemini",
            base_url=getattr(org, "ai_base_url", None),
            groq_api_key=getattr(org, "groq_api_key", None)
        )
        if transcription:
            logger.info(f"🎙️ Backend neural transcription succeeded: '{transcription[:100]}'")

    # 2. Fallback to visitor browser client-side transcript if audio could not be decoded
    if not transcription and payload.speech_transcript and payload.speech_transcript.strip():
        transcription = payload.speech_transcript.strip()
        logger.info(f"🎙️ Falling back to browser client-side transcription: '{transcription}'")

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
    request: Request,
    token: Optional[str] = Query(None, description="Signed visitor session token"),
    db: Session = Depends(get_db)
):
    """
    Allows the website chat widget to receive replies sent by human agents from the dashboard.
    SEC-06: Validates HMAC session token to prevent unauthenticated message eavesdropping.
    """
    try:
        org_uuid = UUID(org_id)
    except:
        return {"messages": []}

    provided_token = token or request.headers.get("X-Visitor-Token") or request.query_params.get("token")
    is_valid_token = verify_visitor_session_token(org_id, visitor_id, provided_token)

    # SEC-06: Sensitive targets (phone number or email address) strictly require a valid signed token
    is_sensitive_identifier = ("@" in visitor_id or visitor_id.replace("+", "").replace("-", "").isdigit()) and not visitor_id.startswith("web_")
    if is_sensitive_identifier and not is_valid_token:
        logger.warning(f"Blocked unauthorized chat eavesdropping attempt for {visitor_id} on org {org_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token required to access conversation history."
        )

    contact = db.query(Contact).filter(
        Contact.organization_id == org_uuid,
        (Contact.phone == visitor_id) | (Contact.email == visitor_id)
    ).first()

    if not contact:
        return {"messages": [], "session_token": generate_visitor_session_token(org_id, visitor_id)}

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
        ],
        "session_token": generate_visitor_session_token(org_id, visitor_id)
    }

