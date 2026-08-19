"""
Backend AI Agent Service (24/7 Cloud Autopilot)
Handles autonomous multi-turn conversations, RAG context injection,
intent detection, slot filling, voice note transcription, and auto-reply delivery.
"""

import json
import logging
import re
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from uuid import UUID, uuid4
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.contact import Contact
from app.models.message import Message
from app.models.booking import Booking
from app.models.conversation_session import ConversationSession
from app.models.organization import Organization
from app.services.rag_service import search_knowledge_base

logger = logging.getLogger(__name__)


async def call_ai_provider(
    provider: str,
    api_key: str,
    model: str,
    system_prompt: str,
    user_turn: str,
    base_url: Optional[str] = None
) -> str:
    """Call configured AI provider with system prompt and user turn."""
    if not api_key:
        raise ValueError("AI API key is missing.")

    if provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        # Use provided model or fallback to standard flash
        model_name = model if model and "gemini" in model else "gemini-2.0-flash"
        generative_model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt
        )
        response = generative_model.generate_content(
            user_turn,
            generation_config={"temperature": 0.7}
        )
        return response.text.strip() if response and response.text else "{}"

    # OpenAI-compatible providers (OpenAI, DeepSeek, Groq, Custom)
    url = base_url
    if not url:
        if provider == "openai":
            url = "https://api.openai.com/v1"
        elif provider == "deepseek":
            url = "https://api.deepseek.com/v1"
        elif provider == "groq":
            url = "https://api.groq.com/openai/v1"
        else:
            url = "https://api.openai.com/v1"

    url = url.rstrip('/')

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            f"{url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "model": model or "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_turn}
                ],
                "temperature": 0.7,
                "response_format": {"type": "json_object"}
            }
        )
        if not response.is_success:
            raise Exception(f"AI Provider HTTP {response.status_code}: {response.text}")
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


def parse_agent_response(raw_text: str) -> Dict[str, Any]:
    """Parse JSON reply and action from AI response."""
    try:
        # Match json block or json object
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            data = json.loads(json_match.group(0))
            return {
                "reply": data.get("reply", "").strip(),
                "action": data.get("action") or {"type": "NONE"}
            }
    except Exception as e:
        logger.warning(f"Failed to parse agent JSON response: {e}")

    # Fallback to plain text cleaning
    clean = re.sub(r"```(json)?|```", "", raw_text).strip()
    return {"reply": clean, "action": {"type": "NONE"}}


async def transcribe_voice_note(
    audio_bytes: bytes,
    mime_type: str = "audio/ogg",
    api_key: Optional[str] = None
) -> str:
    """Transcribe WhatsApp audio/voice note using Google Gemini Multimodal API."""
    if not api_key:
        logger.warning("No Gemini API key available for voice transcription.")
        return "[Voice note received]"

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        audio_part = {
            "mime_type": mime_type or "audio/ogg",
            "data": audio_bytes
        }

        prompt = (
            "Transcribe this WhatsApp voice message accurately into text. "
            "Return ONLY the verbatim transcription with no conversational preamble."
        )

        response = model.generate_content([audio_part, prompt])
        transcription = response.text.strip() if response and response.text else ""
        return transcription or "[Voice note could not be transcribed]"
    except Exception as e:
        logger.error(f"Voice note transcription error: {e}")
        return "[Voice note could not be transcribed]"


async def trigger_ai_agent_reply(
    contact_id: UUID,
    incoming_text: str,
    org_id: UUID,
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    Main 24/7 backend agent orchestrator.
    Called on every incoming message.
    """
    try:
        # 1. Fetch organization settings
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            logger.warning(f"Organization {org_id} not found for agent reply.")
            return None

        # Check if auto-reply is enabled (or stored as string "true")
        auto_enabled = str(org.ai_auto_reply_enabled).lower() == "true"
        if not auto_enabled:
            logger.info(f"AI Auto-reply is disabled for org {org.name} ({org.id}).")
            return None

        ai_api_key = org.ai_api_key
        if not ai_api_key:
            logger.warning(f"No AI API key configured for org {org.name}.")
            return None

        # 2. Check contact and human handover state
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            logger.warning(f"Contact {contact_id} not found.")
            return None

        now = datetime.utcnow()
        if contact.ai_paused_until:
            # Handle timezone-aware comparison
            paused_time = contact.ai_paused_until.replace(tzinfo=None)
            if paused_time > now:
                logger.info(f"AI is paused for contact {contact.name} until {contact.ai_paused_until} (human in control).")
                return None

        # 3. Retrieve conversation history (last 8 messages)
        history_msgs = db.query(Message).filter(
            Message.contact_id == contact_id
        ).order_by(Message.created_at.desc()).limit(8).all()
        history_msgs.reverse()

        history_lines = []
        for m in history_msgs:
            sender = org.ai_name if m.type == "Outbound" else contact.name
            history_lines.append(f"{sender}: {m.content}")
        history_text = "\n".join(history_lines) if history_lines else "No previous conversation."

        # 4. RAG semantic knowledge retrieval
        kb_chunks = []
        try:
            results = await search_knowledge_base(db, str(org_id), incoming_text, limit=3)
            for res, sim in results:
                kb_chunks.append(f"--- {res.title} ---\n{res.content[:500]}")
        except Exception as rag_err:
            logger.warning(f"RAG search error: {rag_err}")

        kb_context = "\n\n".join(kb_chunks) if kb_chunks else "No specific knowledge base entry matched."

        # 5. Check active multi-turn session
        session = db.query(ConversationSession).filter(
            ConversationSession.contact_id == contact_id,
            ConversationSession.expires_at > now
        ).first()

        session_prompt = ""
        collected_data = {}
        if session:
            try:
                collected_data = json.loads(session.collected_slots or "{}")
            except:
                collected_data = {}
            session_prompt = f"""
CURRENT ACTIVE FLOW: {session.active_flow.upper()}
Collected Information so far: {json.dumps(collected_data)}
Your task: Continue this flow naturally. Ask for whatever is still missing.
"""

        # 6. Fetch available media files from media_library table
        available_files_list = []
        try:
            rows = db.execute(
                text("SELECT name, type, description FROM media_library WHERE organization_id = :org_id LIMIT 15"),
                {"org_id": str(org_id)}
            ).fetchall()
            for r in rows:
                available_files_list.append(f"'{r[0]}' ({r[1]} - {r[2] or 'No desc'})")
        except Exception as media_err:
            logger.warning(f"Media fetch error: {media_err}")

        available_files_str = ", ".join(available_files_list) if available_files_list else "None uploaded yet."

        # 7. Build system prompt
        ai_name = org.ai_name or "Shepherd AI"
        org_name = org.name or "Our Organization"
        biz_type = org.ai_business_type or "Organization"
        tone = org.ai_tone or "Warm, professional, and helpful. WhatsApp-friendly."
        payment_link = org.ai_payment_link or "Not configured"

        system_prompt = f"""You are {ai_name}, the AI representative for {org_name} ({biz_type}).

CONTACT DETAILS:
- Name: {contact.name}
- Category: {contact.category}
- Phone: {contact.phone}
{f'- Notes: {contact.notes}' if contact.notes else ''}

TONE & STYLE:
{tone}
Write WhatsApp-appropriate messages (concise, friendly, helpful, natural). Never sound like an emotionless robot.

KNOWLEDGE BASE:
{kb_context}

AVAILABLE FILES TO DELIVER:
{available_files_str}

PAYMENT LINK:
{payment_link}

{session_prompt}

CONVERSATION HISTORY:
{history_text}

RESPONSE FORMAT — You must return ONLY a JSON object:
{{
  "reply": "Your WhatsApp response text to the contact",
  "action": {{
    "type": "NONE",
    "documentName": "",
    "imageName": "",
    "purpose": "",
    "preferredDate": "",
    "preferredTime": "",
    "query": "",
    "reason": ""
  }}
}}

ACTION TYPE GUIDE:
- NONE: standard conversational reply
- CREATE_BOOKING: customer wants to book/schedule an appointment
- SEND_DOCUMENT: customer asks for a document, price list, menu, PDF, or form
- SEND_IMAGE: customer asks for a photo, map, or picture
- SEND_PAYMENT_LINK: customer asks how to pay, fees, pricing, or purchase
- WEB_SEARCH: customer asks factual/timely question not in knowledge base
- FLAG_FOR_HUMAN: customer is angry, in crisis, or asks for a human manager
"""

        user_turn = f"New message from {contact.name}:\n\"{incoming_text}\"\n\nGenerate your JSON response."

        # 8. Call AI Provider
        raw_reply = await call_ai_provider(
            provider=org.ai_provider or "gemini",
            api_key=ai_api_key,
            model=org.ai_model or "gemini-2.0-flash",
            system_prompt=system_prompt,
            user_turn=user_turn,
            base_url=org.ai_base_url
        )

        parsed = parse_agent_response(raw_reply)
        reply_text = parsed.get("reply", "")
        action = parsed.get("action", {})
        action_type = action.get("type", "NONE")

        if not reply_text:
            logger.warning("AI Agent returned empty reply.")
            return None

        # 9. Process Intent Actions
        if action_type == "FLAG_FOR_HUMAN":
            contact.conversation_status = "escalated"
            contact.ai_paused_until = now + timedelta(hours=12)
            db.commit()
            logger.info(f"🚩 Chat with {contact.name} flagged for human triage.")
            # Still send a compassionate acknowledging message if provided
            if not reply_text:
                reply_text = "I've escalated your message to our leadership team. A representative will reach out to you shortly."

        elif action_type == "CREATE_BOOKING":
            purpose = action.get("purpose") or "Appointment"
            pref_date = action.get("preferredDate") or ""
            pref_time = action.get("preferredTime") or ""

            # If date/time specified, create booking in DB
            if pref_date or pref_time:
                booking = Booking(
                    contact_id=contact.id,
                    contact_name=contact.name,
                    contact_phone=contact.phone,
                    purpose=purpose,
                    date=pref_date,
                    time=pref_time,
                    notes=f"Auto-created by AI Agent on {now.strftime('%Y-%m-%d %H:%M')}",
                    status="pending"
                )
                db.add(booking)
                db.commit()
                logger.info(f"📅 Booking created automatically for {contact.name}: {purpose} on {pref_date} {pref_time}")
                # Clear session if active
                if session:
                    db.delete(session)
                    db.commit()
            else:
                # Start or update booking session for slot filling
                if not session:
                    session = ConversationSession(
                        contact_id=contact.id,
                        organization_id=org_id,
                        active_flow="booking",
                        collected_slots=json.dumps({"purpose": purpose}),
                        turn_count=1,
                        expires_at=now + timedelta(minutes=30)
                    )
                    db.add(session)
                else:
                    collected_data["purpose"] = purpose
                    session.collected_slots = json.dumps(collected_data)
                    session.turn_count += 1
                db.commit()

        # 10. Deliver reply to customer via WhatsApp
        from app.api.whatsapp import get_organization_whatsapp_config
        from app.services.meta_whatsapp_service import get_meta_whatsapp_service

        config = get_organization_whatsapp_config(db, org_id)

        if config["delivery_method"] == "meta":
            # Send immediately via Meta Cloud API
            meta_service = get_meta_whatsapp_service(
                config["phone_number_id"],
                config["access_token"]
            )
            send_result = await meta_service.send_message(
                to_phone=contact.phone,
                message=reply_text
            )
            out_msg = Message(
                organization_id=org_id,
                contact_id=contact.id,
                content=reply_text,
                type="Outbound",
                status="Sent" if send_result.get("success") else "Failed",
                sent_at=now,
                whatsapp_message_id=send_result.get("messageId")
            )
            db.add(out_msg)
            db.commit()
            logger.info(f"🚀 AI Auto-reply sent to {contact.phone} via Meta Cloud API")

        else:
            # WPPConnect: Queue pending outbound message for bridge polling
            out_msg = Message(
                organization_id=org_id,
                contact_id=contact.id,
                content=reply_text,
                type="Outbound",
                status="Pending",
                created_at=now
            )
            db.add(out_msg)
            db.commit()
            logger.info(f"📬 AI Auto-reply queued for WPPConnect bridge to send to {contact.phone}")

        return {
            "reply": reply_text,
            "action": action,
            "message_id": str(out_msg.id)
        }

    except Exception as e:
        logger.error(f"❌ Error in trigger_ai_agent_reply: {str(e)}", exc_info=True)
        db.rollback()
        return None
