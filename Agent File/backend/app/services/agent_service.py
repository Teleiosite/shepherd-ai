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
    api_key: Optional[str] = None,
    provider: str = "gemini",
    base_url: Optional[str] = None
) -> str:
    """
    Transcribe WhatsApp audio/voice note using Google Gemini Multimodal API (Free) or Whisper.
    Works directly via HTTP REST with zero SDK dependency issues.
    """
    if not api_key or not audio_bytes:
        logger.warning("No API key or empty audio bytes for voice transcription.")
        return ""

    import base64
    import httpx
    import re

    # Clean mime type (remove parameters like codecs=opus)
    clean_mime = mime_type.split(";")[0].strip() if mime_type else "audio/ogg"
    if clean_mime in ["audio/opus", "audio/ogg", "audio/oga"]:
        clean_mime = "audio/ogg"
    elif clean_mime in ["audio/mp4", "audio/m4a", "audio/aac"]:
        clean_mime = "audio/mp4"
    elif clean_mime in ["audio/mp3", "audio/mpeg"]:
        clean_mime = "audio/mp3"
    elif clean_mime in ["audio/wav", "audio/x-wav"]:
        clean_mime = "audio/wav"

    try:
        # Provider 1: Gemini (Multimodal Audio Transcription)
        if provider == "gemini" or api_key.startswith("AIza"):
            b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": clean_mime,
                                    "data": b64_audio
                                }
                            },
                            {
                                "text": "Listen to this WhatsApp voice message carefully and transcribe it word-for-word into English (or the spoken language). Return ONLY the direct transcription. Do not include any explanations, greetings, quotes, or metadata."
                            }
                        ]
                    }
                ]
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text_out = parts[0].get("text", "").strip()
                            text_out = re.sub(r'^["\']|["\']$', '', text_out).strip()
                            if text_out:
                                logger.info(f"🎙️ Gemini voice note transcribed successfully: '{text_out[:60]}...'")
                                return text_out
                else:
                    logger.error(f"Gemini voice transcription failed ({res.status_code}): {res.text}")

        # Provider 2: OpenAI / Groq Whisper fallback
        whisper_url = "https://api.openai.com/v1/audio/transcriptions"
        model_name = "whisper-1"
        if provider == "groq" or (base_url and "groq.com" in base_url):
            whisper_url = "https://api.groq.com/openai/v1/audio/transcriptions"
            model_name = "whisper-large-v3-turbo"

        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"file": ("voice_message.ogg", audio_bytes, clean_mime)}
            data = {"model": model_name}
            headers = {"Authorization": f"Bearer {api_key}"}
            res = await client.post(whisper_url, headers=headers, data=data, files=files)
            if res.status_code == 200:
                text_out = res.json().get("text", "").strip()
                if text_out:
                    logger.info(f"🎙️ Whisper voice note transcribed successfully: '{text_out[:60]}...'")
                    return text_out

    except Exception as e:
        logger.error(f"Voice note transcription exception: {e}")

    return ""


async def synthesize_voice_note(text: str, voice: str = "en-NG-EzinneNeural") -> bytes:
    """
    Synthesize natural speech for WhatsApp voice notes (100% free, zero API cost via edge-tts).
    Voices supported:
    - en-NG-EzinneNeural (Nigerian English - Female)
    - en-NG-AbeoNeural (Nigerian English - Male)
    - en-US-EmmaNeural (US English - Female)
    - en-US-GuyNeural (US English - Male)
    - en-GB-SoniaNeural (British English - Female)
    """
    import edge_tts
    try:
        import re
        clean_text = re.sub(r"[\*\_~`#]", "", text)
        clean_text = re.sub(r"\[.*?\]", "", clean_text).strip()
        if not clean_text:
            clean_text = text.strip()

        communicate = edge_tts.Communicate(clean_text, voice or "en-NG-EzinneNeural")
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
        return b"".join(audio_chunks)
    except Exception as e:
        logger.error(f"Voice synthesis error: {e}")
        return b""


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

        # 7. Build real-time calendar & clock context
        today_day_name = now.strftime("%A")
        today_date_str = now.strftime("%Y-%m-%d")
        tomorrow_dt = now + timedelta(days=1)
        tomorrow_day_name = tomorrow_dt.strftime("%A")
        tomorrow_date_str = tomorrow_dt.strftime("%Y-%m-%d")
        current_time_str = now.strftime("%I:%M %p").lstrip("0")

        ai_name = org.ai_name or "Shepherd AI"
        org_name = org.name or "Our Organization"
        biz_type = org.ai_business_type or "Organization"
        tone = org.ai_tone or "Warm, professional, and helpful. WhatsApp-friendly."
        payment_link = org.ai_payment_link or "Not configured"

        system_prompt = f"""You are {ai_name}, the AI representative for {org_name} ({biz_type}).

CURRENT CALENDAR & CLOCK CONTEXT:
- Today is: {today_day_name}, {now.strftime('%B %d, %Y')} ({today_date_str})
- Current Time: {current_time_str}
- Tomorrow is: {tomorrow_day_name}, {tomorrow_dt.strftime('%B %d, %Y')} ({tomorrow_date_str})

CONTACT DETAILS:
- Name: {contact.name}
- Category: {contact.category}
- Phone: {contact.phone}
{f'- Notes: {contact.notes}' if contact.notes else ''}

TONE & STYLE:
{tone}
Write WhatsApp-appropriate messages (concise, warm, attentive, helpful, natural). Never sound like an emotionless robot. Always answer greetings, check-ins ("are you there", "hello"), and continue conversations seamlessly.

KNOWLEDGE BASE:
{kb_context}

AVAILABLE FILES TO DELIVER:
{available_files_str}

PAYMENT LINK:
{payment_link}

{session_prompt}

CONVERSATION HISTORY:
{history_text}

APPOINTMENT & BOOKING RULES:
1. When a contact wants to book, find out: (1) Purpose/Topic, (2) Date, (3) Time.
2. When the contact gives relative dates like "tomorrow", "this time tomorrow", "Friday at 2pm", ALWAYS convert:
   - "preferredDate": Exact ISO date format "{tomorrow_date_str}" (YYYY-MM-DD). NEVER return relative words.
   - "preferredTime": Standard 12-hour format "{current_time_str}" (e.g. "10:30 PM", "03:00 PM").
3. When confirming an appointment or when the contact says "yes", "correct", or confirms details:
   - Set "type": "CREATE_BOOKING" with finalized "purpose", "preferredDate" (YYYY-MM-DD), and "preferredTime" (HH:MM AM/PM).
   - Your "reply" MUST explicitly confirm the booking to the contact (e.g. "🎉 Awesome, {contact.name}! Your appointment for [Topic] is booked for tomorrow, {tomorrow_dt.strftime('%B %d, %Y')} at {current_time_str}. Looking forward to speaking with you!").

VOICE NOTE RULES:
- When a customer sends a voice message, it is transcribed into text as "[Voice Note]: <transcription>".
- Answer the customer's transcribed message directly, warmly, and helpfully as if they spoke directly to you!
- NEVER tell the customer "I cannot listen to voice notes" or ask them to type instead. You process voice notes seamlessly.

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
- NONE: standard conversational reply / answering greetings and questions
- CREATE_BOOKING: customer wants to book/schedule an appointment (include purpose, preferredDate YYYY-MM-DD, preferredTime HH:MM AM/PM)
- SEND_DOCUMENT: customer asks for a document, price list, menu, PDF, or form
- SEND_IMAGE: customer asks for a photo, map, or picture
- SEND_PAYMENT_LINK: customer asks how to pay, fees, pricing, or purchase
- WEB_SEARCH: customer asks factual/timely question not in knowledge base
- FLAG_FOR_HUMAN: customer is in crisis, angry, or asks for a human manager
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
            if not reply_text:
                reply_text = "I've escalated your message to our leadership team. A representative will reach out to you shortly."

        elif action_type == "CREATE_BOOKING":
            purpose = action.get("purpose") or (collected_data.get("purpose") if session else None) or "Appointment"
            raw_date = (action.get("preferredDate") or (collected_data.get("date") if session else None) or "").strip().lower()
            raw_time = (action.get("preferredTime") or (collected_data.get("time") if session else None) or "").strip()

            # Resolve relative dates (tomorrow / today / ISO)
            import re
            resolved_date = ""
            if "tomorrow" in raw_date:
                resolved_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")
            elif "today" in raw_date:
                resolved_date = now.strftime("%Y-%m-%d")
            elif re.search(r"\b\d{4}-\d{2}-\d{2}\b", raw_date):
                resolved_date = re.search(r"\b\d{4}-\d{2}-\d{2}\b", raw_date).group(0)
            else:
                resolved_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")

            # Resolve time
            resolved_time = ""
            if not raw_time or "this time" in raw_time.lower() or "around" in raw_time.lower() or raw_time.lower() == "now":
                resolved_time = now.strftime("%I:%M %p").lstrip("0")
            else:
                resolved_time = raw_time

            # Create confirmed booking in DB
            booking = Booking(
                contact_id=contact.id,
                contact_name=contact.name,
                contact_phone=contact.phone,
                purpose=purpose,
                date=resolved_date,
                time=resolved_time,
                notes=f"Auto-created by AI Agent on {now.strftime('%Y-%m-%d %H:%M')}",
                status="confirmed"
            )
            db.add(booking)
            db.commit()
            logger.info(f"📅 Booking confirmed for {contact.name}: {purpose} on {resolved_date} at {resolved_time}")

            if session:
                db.delete(session)
                db.commit()

        # 10. Deliver reply to customer via WhatsApp
        from app.api.whatsapp import get_organization_whatsapp_config
        from app.services.meta_whatsapp_service import get_meta_whatsapp_service
        import base64

        config = get_organization_whatsapp_config(db, org_id)

        # Check voice reply settings
        voice_reply_mode = getattr(org, "ai_voice_reply_mode", "text") or "text"
        voice_name = getattr(org, "ai_voice_name", "en-NG-EzinneNeural") or "en-NG-EzinneNeural"

        is_inbound_voice = incoming_text.startswith("[Voice Note") or incoming_text.startswith("[Voice message")
        should_send_voice = (voice_reply_mode == "voice") or (voice_reply_mode == "match_input" and is_inbound_voice)

        if should_send_voice and config["delivery_method"] == "meta":
            logger.info(f"🎙️ Synthesizing voice note response using voice: {voice_name}")
            voice_bytes = await synthesize_voice_note(reply_text, voice_name)
            if voice_bytes:
                b64_audio = "data:audio/mpeg;base64," + base64.b64encode(voice_bytes).decode("utf-8")
                meta_service = get_meta_whatsapp_service(
                    config["phone_number_id"],
                    config["access_token"]
                )
                send_result = await meta_service.send_media(
                    to_phone=contact.phone,
                    media_type="audio",
                    media_data=b64_audio,
                    filename="voice_note.mp3"
                )
                out_msg = Message(
                    organization_id=org_id,
                    contact_id=contact.id,
                    content=reply_text,
                    attachment_url="voice_note_response",
                    attachment_type="audio",
                    type="Outbound",
                    status="Sent" if send_result.get("success") else "Failed",
                    sent_at=now,
                    whatsapp_message_id=send_result.get("messageId")
                )
                db.add(out_msg)
                db.commit()
                logger.info(f"🎙️ AI Voice Note auto-reply sent to {contact.phone} via Meta Cloud API")
                return {
                    "reply": reply_text,
                    "action": action,
                    "message_id": str(out_msg.id),
                    "is_voice": True
                }

        if config["delivery_method"] == "meta":
            # Send standard text message via Meta Cloud API
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
