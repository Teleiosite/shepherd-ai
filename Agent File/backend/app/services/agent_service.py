"""
Backend AI Agent Service (24/7 Cloud Autopilot)
Handles autonomous multi-turn conversations, RAG context injection,
intent detection, slot filling, voice note transcription, and auto-reply delivery.
"""

import json
import logging
import re
import base64
import asyncio
import tempfile
import os
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

        # 1. Dynamically ask Google what models this API key has access to
        discovered = []
        try:
            for m in genai.list_models():
                methods = getattr(m, "supported_generation_methods", []) or []
                if "generateContent" in methods:
                    m_clean = m.name.replace("models/", "")
                    discovered.append(m_clean)
            logger.info(f"📋 Discovered {len(discovered)} Gemini models for this key: {discovered[:5]}")
        except Exception as list_e:
            logger.warning(f"⚠️ Could not list models via SDK: {list_e}")

        # Prioritize flash models from discovered list, followed by hardcoded fallbacks
        candidates = []
        for d in discovered:
            if "flash" in d and d not in candidates:
                candidates.append(d)
        for d in discovered:
            if d not in candidates:
                candidates.append(d)

        # Ensure standard fallbacks are present
        for std in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-pro"]:
            if std not in candidates:
                candidates.append(std)

        attempt_errors = []
        full_text_turn = f"System Instructions:\n{system_prompt}\n\nCustomer Message:\n{user_turn}"

        # 2. Try candidates via SDK
        for cand in candidates:
            # Try first with system_instruction, then fallback to prepended prompt
            for with_sys in [True, False]:
                try:
                    logger.info(f"🤖 Calling Gemini '{cand}' (system_instruction={with_sys})...")
                    if with_sys:
                        generative_model = genai.GenerativeModel(
                            model_name=cand,
                            system_instruction=system_prompt
                        )
                        response = generative_model.generate_content(
                            user_turn,
                            generation_config={"temperature": 0.7}
                        )
                    else:
                        generative_model = genai.GenerativeModel(model_name=cand)
                        response = generative_model.generate_content(
                            full_text_turn,
                            generation_config={"temperature": 0.7}
                        )

                    if response and response.text:
                        logger.info(f"✅ Gemini model '{cand}' succeeded! ({len(response.text)} chars)")
                        return response.text.strip()
                except Exception as m_err:
                    attempt_errors.append(f"{cand}(sys={with_sys}): {str(m_err)[:100]}")
                    continue

        # 3. If SDK attempts failed, fallback to direct REST API
        logger.info("🔄 Falling back to Google Generative Language REST API...")
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            for rest_model in candidates[:4]:
                for api_ver in ["v1beta", "v1"]:
                    try:
                        rest_url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{rest_model}:generateContent?key={api_key}"
                        payload = {
                            "contents": [
                                {"parts": [{"text": full_text_turn}]}
                            ],
                            "generationConfig": {"temperature": 0.7}
                        }
                        r = await client.post(rest_url, json=payload)
                        if r.status_code == 200:
                            r_data = r.json()
                            candidates_list = r_data.get("candidates", [])
                            if candidates_list:
                                text_part = candidates_list[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                if text_part:
                                    logger.info(f"✅ REST API model '{rest_model}' ({api_ver}) succeeded!")
                                    return text_part.strip()
                        else:
                            attempt_errors.append(f"REST {api_ver}/{rest_model} HTTP {r.status_code}: {r.text[:120]}")
                    except Exception as rest_e:
                        attempt_errors.append(f"REST {api_ver}/{rest_model} ex: {str(rest_e)[:100]}")

        err_summary = " | ".join(attempt_errors[-5:])
        raise Exception(f"All Gemini models failed: {err_summary}")

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


def strip_emojis(text: str) -> str:
    """Remove all emoji characters and symbols from text so TTS does not pronounce emoji names."""
    if not text:
        return ""
    pattern = re.compile(
        "["
        "\U00010000-\U0010ffff"
        "\u2600-\u27bf"
        "\u2300-\u23ff"
        "\u2b50\u2b55"
        "\u200d\ufe0f\ufe0e"
        "]+",
        flags=re.UNICODE
    )
    cleaned = pattern.sub("", text)
    return re.sub(r" +", " ", cleaned).strip()


def parse_agent_response(raw_text: str) -> Dict[str, Any]:
    """Parse JSON reply and action from AI response."""
    try:
        # Match json block or json object
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            data = json.loads(json_match.group(0))
            reply = strip_emojis(data.get("reply", "").strip())
            return {
                "reply": reply,
                "action": data.get("action") or {"type": "NONE"}
            }
    except Exception as e:
        logger.warning(f"Failed to parse agent JSON response: {e}")

    # Fallback to plain text cleaning
    clean = re.sub(r"```(json)?|```", "", raw_text).strip()
    clean = strip_emojis(clean)
    return {"reply": clean, "action": {"type": "NONE"}}



async def transcribe_voice_note(
    audio_bytes: bytes,
    mime_type: str = "audio/ogg",
    api_key: Optional[str] = None,
    provider: str = "gemini",
    base_url: Optional[str] = None
) -> str:
    """
    Transcribes WhatsApp voice notes via the dedicated self-hosted faster-whisper microservice.
    Replaces the previous Gemini-based transcription which fails on OGG/Opus.
    """
    if not audio_bytes:
        logger.warning("🔇 Transcription skipped — audio_bytes is empty.")
        return ""

    import os
    import time
    import httpx

    # Check raw binary and log magic bytes for debugging
    first_4 = audio_bytes[:4]
    first_4_str = repr(first_4)
    is_ogg = (first_4 == b"OggS")
    logger.info(f"🎙️ TRANSCRIBE START: {len(audio_bytes)} bytes | magic={first_4_str} (is_ogg={is_ogg}) | mime={mime_type}")

    # Read self-hosted faster-whisper microservice configuration
    transcribe_url = (os.getenv("TRANSCRIBE_SERVICE_URL", "").strip() or "https://shepherdai.duckdns.org/transcribe")
    transcribe_key = (os.getenv("TRANSCRIBE_SERVICE_KEY", "").strip() or "17f187c37b8164bc2f038779fa9ebe886ef771e3f721793e584bd816bf1a8ac5")

    if transcribe_url:
        # Automatically ensure /transcribe path is present
        transcribe_url = transcribe_url.rstrip("/")
        if not transcribe_url.endswith("/transcribe"):
            transcribe_url = f"{transcribe_url}/transcribe"

        start_t = time.time()
        logger.info(f"🎙️ Calling self-hosted Whisper microservice: {transcribe_url}")
        try:
            headers = {"X-Api-Key": transcribe_key}

            clean_mime = "audio/ogg" if ("ogg" in (mime_type or "").lower() or is_ogg) else (mime_type or "audio/ogg")
            async with httpx.AsyncClient(timeout=25.0) as client:
                files = {"file": ("voice.ogg", audio_bytes, clean_mime)}
                resp = await client.post(transcribe_url, files=files, headers=headers)
                elapsed = time.time() - start_t
                logger.info(f"🎙️ Whisper microservice HTTP {resp.status_code} in {elapsed:.2f}s")
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("text", "").strip()
                    if text:
                        logger.info(f"🎙️ ✅ Whisper transcription SUCCESS: '{text[:120]}'")
                        return text
                    else:
                        logger.warning("🎙️ Whisper microservice returned empty text.")
                else:
                    logger.error(f"🎙️ Whisper microservice error HTTP {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            elapsed = time.time() - start_t
            logger.error(f"🎙️ Whisper microservice request failed after {elapsed:.2f}s: {e}", exc_info=True)
    else:
        logger.warning("⚠️ TRANSCRIBE_SERVICE_URL is not set.")

    # Secondary fallback if OpenAI/Groq keys are available or provided directly
    if api_key and (provider == "groq" or (base_url and "groq.com" in base_url) or api_key.startswith("sk-") or api_key.startswith("gsk_")):
        try:
            whisper_url = "https://api.openai.com/v1/audio/transcriptions"
            model_name = "whisper-1"
            if provider == "groq" or (base_url and "groq.com" in base_url) or api_key.startswith("gsk_"):
                whisper_url = "https://api.groq.com/openai/v1/audio/transcriptions"
                model_name = "whisper-large-v3-turbo"
            logger.info(f"🎙️ Trying OpenAI/Groq Whisper fallback at {whisper_url}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                clean_mime = "audio/ogg" if mime_type and "ogg" in mime_type else (mime_type or "audio/ogg")
                files = {"file": ("voice_message.ogg", audio_bytes, clean_mime)}
                data_w = {"model": model_name}
                headers_w = {"Authorization": f"Bearer {api_key}"}
                wres = await client.post(whisper_url, headers=headers_w, data=data_w, files=files)
                if wres.status_code == 200:
                    text_out = wres.json().get("text", "").strip()
                    if text_out:
                        logger.info(f"🎙️ Whisper fallback transcript: '{text_out[:120]}'")
                        return text_out
                else:
                    logger.warning(f"🎙️ Whisper fallback HTTP {wres.status_code}: {wres.text[:200]}")
        except Exception as e_w:
            logger.error(f"🎙️ Whisper fallback exception: {e_w}")

    logger.warning("🎙️ All transcription methods failed — returning empty string")
    return ""





async def synthesize_voice_note(text: str, voice: str = "en-NG-EzinneNeural") -> bytes:
    """
    Synthesize natural speech for WhatsApp voice notes (100% free, zero API cost via edge-tts).
    Returns OGG/OPUS bytes which WhatsApp renders as the native green voice note bubble.
    Voices supported:
    - en-NG-EzinneNeural (Nigerian English - Female)
    - en-NG-AbeoNeural (Nigerian English - Male)
    - en-US-EmmaNeural (US English - Female)
    - en-US-GuyNeural (US English - Male)
    - en-GB-SoniaNeural (British English - Female)
    """
    import edge_tts
    try:
        import re, io
        clean_text = strip_emojis(text)
        clean_text = re.sub(r"[\*\_~`#]", "", clean_text)
        clean_text = re.sub(r"\[.*?\]", "", clean_text).strip()
        if not clean_text:
            clean_text = strip_emojis(text).strip()

        # edge-tts produces MP3 by default. Collect MP3 bytes then convert to OGG.
        communicate = edge_tts.Communicate(clean_text, voice or "en-NG-EzinneNeural")
        mp3_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_chunks.append(chunk["data"])
        mp3_bytes = b"".join(mp3_chunks)
        if not mp3_bytes:
            return b""

        # Convert MP3 → OGG (opus) using the imageio-ffmpeg bundled binary
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as tmpdir:
            mp3_path = os.path.join(tmpdir, "voice.mp3")
            ogg_path = os.path.join(tmpdir, "voice.ogg")
            with open(mp3_path, "wb") as f:
                f.write(mp3_bytes)
            proc = await asyncio.create_subprocess_exec(
                ffmpeg_exe, "-y", "-i", mp3_path,
                "-c:a", "libopus", "-b:a", "64k",
                "-vbr", "on", ogg_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()
            if os.path.exists(ogg_path):
                with open(ogg_path, "rb") as f:
                    ogg_bytes = f.read()
                logger.info(f"🎙️ Synthesized {len(ogg_bytes)} bytes of OGG/OPUS audio for WhatsApp voice note")
                return ogg_bytes
            else:
                logger.warning("ffmpeg OGG conversion failed, falling back to raw MP3 bytes")
                return mp3_bytes
    except Exception as e:
        logger.error(f"Voice synthesis error: {e}")
        return b""


async def execute_catalog_search(
    org: Organization,
    search_params: Dict[str, Any],
    db: Session
) -> list:
    """
    Search either the tenant's external API webhook (e.g. Rentigram fleet DB)
    or the internal catalog_items table.
    Returns normalized items array for universal card rendering.
    """
    items = []
    query_str = (search_params.get("query") or "").strip()
    category = (search_params.get("category") or "").strip()
    max_budget = search_params.get("max_budget")

    # Mode 1: External API Webhook (e.g. Rentigram, Hotel PMS, Store API)
    if getattr(org, "catalog_mode", "internal") == "external_webhook" and getattr(org, "external_search_webhook_url", None):
        try:
            webhook_url = org.external_search_webhook_url.strip()
            headers = {"Content-Type": "application/json"}
            if org.external_search_webhook_secret:
                headers["X-Shepherd-Secret"] = org.external_search_webhook_secret

            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    webhook_url,
                    json={
                        "query": query_str,
                        "category": category,
                        "max_budget": max_budget,
                        "location": search_params.get("location"),
                        "attributes": search_params.get("attributes", {})
                    },
                    headers=headers
                )
                if resp.is_success:
                    data = resp.json()
                    raw_items = data if isinstance(data, list) else data.get("items") or data.get("cars") or data.get("products") or []
                    for itm in raw_items[:5]:
                        items.append({
                            "id": str(itm.get("id") or itm.get("_id") or uuid4()),
                            "title": itm.get("title") or itm.get("name") or "Available Option",
                            "category": itm.get("category") or category,
                            "description": itm.get("description") or "",
                            "price": str(itm.get("price") or itm.get("daily_rate") or itm.get("rate") or ""),
                            "price_amount": float(itm.get("price_amount") or 0),
                            "image_url": itm.get("image_url") or itm.get("photo_url") or itm.get("image") or "",
                            "action_url": itm.get("action_url") or itm.get("booking_url") or itm.get("link") or "",
                            "attributes": itm.get("attributes") or itm.get("specs") or {}
                        })
                    logger.info(f"🌐 External webhook returned {len(items)} catalog items from {webhook_url}")
                    return items
                else:
                    logger.warning(f"External webhook {webhook_url} returned HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"External catalog webhook query failed: {e}")

    # Mode 2: Internal Database Catalog
    try:
        from app.models.catalog_item import CatalogItem
        query = db.query(CatalogItem).filter(
            CatalogItem.organization_id == org.id,
            CatalogItem.is_available == True
        )
        if query_str:
            query = query.filter(
                (CatalogItem.title.ilike(f"%{query_str}%")) |
                (CatalogItem.description.ilike(f"%{query_str}%")) |
                (CatalogItem.category.ilike(f"%{query_str}%"))
            )
        if max_budget:
            try:
                val = float(max_budget)
                query = query.filter(CatalogItem.price_amount <= val)
            except:
                pass

        results = query.limit(5).all()
        for itm in results:
            price_display = f"{itm.price_currency or 'NGN'} {itm.price_amount:,.0f} {itm.price_unit or ''}".strip() if itm.price_amount else "Contact for pricing"
            items.append({
                "id": str(itm.id),
                "title": itm.title,
                "category": itm.category or "",
                "description": itm.description or "",
                "price": price_display,
                "price_amount": float(itm.price_amount) if itm.price_amount else 0,
                "image_url": itm.image_url or "",
                "action_url": itm.action_url or "",
                "attributes": itm.attributes or {}
            })
        logger.info(f"📦 Internal catalog search found {len(items)} items for org {org.id}")
    except Exception as e:
        logger.warning(f"Internal catalog query failed: {e}")

    return items


async def trigger_ai_agent_reply(
    contact_id: UUID,
    incoming_text: str,
    org_id: UUID,
    db: Session,
    audio_media_id: Optional[str] = None,
    audio_mime_type: str = "audio/ogg",
    channel: str = "whatsapp"
) -> Optional[Dict[str, Any]]:
    """
    Main 24/7 backend agent orchestrator.
    Called on every incoming message across WhatsApp or Web Chat Widget.
    """
    try:
        # 1. Fetch organization settings
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            logger.warning(f"Organization {org_id} not found for agent reply.")
            return {"error": f"Organization {org_id} not found"}

        # Check if auto-reply is enabled (stored as string "true" or boolean True)
        # IMPORTANT: NULL/None means "never explicitly disabled" → treat as ENABLED
        raw_enabled = org.ai_auto_reply_enabled
        # Only block if explicitly set to "false" or "0"
        auto_enabled = str(raw_enabled).lower() not in ("false", "0", "no")
        logger.info(f"🤖 AI Auto-reply check for org '{org.name}' ({org.id}): ai_auto_reply_enabled={repr(raw_enabled)} → auto_enabled={auto_enabled}")
        if not auto_enabled:
            logger.info(f"⛔ AI Auto-reply is DISABLED for org {org.name}. Go to Settings → AI Agent → enable the toggle and save.")
            return {"error": f"AI Auto-reply is disabled for org {org.name}"}

        # Get API key — use org's stored key, or fall back to server environment GEMINI_API_KEY
        from app.config import settings as _app_settings
        ai_api_key = org.ai_api_key or _app_settings.gemini_api_key
        ai_provider = getattr(org, "ai_provider", None) or "gemini"
        logger.info(f"🔑 API key: {'org DB key' if org.ai_api_key else 'server GEMINI_API_KEY env var'} | provider={ai_provider} | key_set={bool(ai_api_key)}")
        if not ai_api_key:
            logger.error(f"❌ No AI API key for org {org.name}. Set GEMINI_API_KEY env var on Render OR save a key in Settings → Integrations.")
            return {"error": f"No AI API key for org {org.name}"}

        # 1b. If a voice note was sent, transcribe it NOW
        from app.api.whatsapp import get_organization_whatsapp_config
        wa_config = get_organization_whatsapp_config(db, org_id)
        _meta_token = getattr(org, "whatsapp_access_token", None) or getattr(org, "access_token", None) or wa_config.get("access_token")

        if not audio_media_id and incoming_text in ("[Voice message]", "[Voice note]", ""):
            # Try to find attachment_url from the latest inbound message for this contact
            latest_msg = db.query(Message).filter(
                Message.contact_id == contact_id,
                Message.type == "Inbound"
            ).order_by(Message.created_at.desc()).first()
            if latest_msg and latest_msg.attachment_url and latest_msg.attachment_url.startswith("meta_media_id:"):
                audio_media_id = latest_msg.attachment_url.replace("meta_media_id:", "").strip()
                logger.info(f"🎙️ Extracted audio_media_id '{audio_media_id}' from latest inbound message attachment_url")

        if audio_media_id and incoming_text in ("[Voice message]", "[Voice note]", ""):
            logger.info(f"🎙️ Transcribing voice note {audio_media_id} inside agent service")
            try:
                import httpx as _httpx
                if _meta_token:
                    _dl_headers = {
                        "Authorization": f"Bearer {_meta_token}",
                        "User-Agent": "curl/7.64.1"
                    }
                    async with _httpx.AsyncClient(timeout=30.0, follow_redirects=True) as _client:
                        _info = await _client.get(
                            f"https://graph.facebook.com/v18.0/{audio_media_id}",
                            headers=_dl_headers
                        )
                        logger.info(f"🎙️ Meta media info HTTP {_info.status_code}: {_info.text[:300]}")
                        if _info.status_code == 200:
                            _down_url = _info.json().get("url")
                            _mime = _info.json().get("mime_type", audio_mime_type)
                            if _down_url:
                                _bin = await _client.get(_down_url, headers=_dl_headers)
                                logger.info(f"🎙️ Audio download HTTP {_bin.status_code}, bytes={len(_bin.content)}")
                                if _bin.status_code == 200 and _bin.content:
                                    _transcript = await transcribe_voice_note(
                                        audio_bytes=_bin.content,
                                        mime_type=_mime,
                                        api_key=ai_api_key,
                                        provider=getattr(org, "ai_provider", "gemini") or "gemini",
                                        base_url=getattr(org, "ai_base_url", None)
                                    )
                                    if _transcript and len(_transcript) > 2:
                                        incoming_text = f"[Voice Note]: {_transcript}"
                                        logger.info(f"🎙️ ✅ Transcription SUCCESS: '{_transcript[:100]}'")
                                        # Update latest inbound message in database so dashboard Live Chats displays the transcription
                                        try:
                                            latest_inbound = db.query(Message).filter(
                                                Message.contact_id == contact_id,
                                                Message.type == "Inbound"
                                            ).order_by(Message.created_at.desc()).first()
                                            if latest_inbound and latest_inbound.content in ("[Voice message]", "[voice message]"):
                                                latest_inbound.content = f"🎙️ {_transcript}"
                                                db.commit()
                                                logger.info(f"💾 Updated inbound message content in DB with transcript")
                                        except Exception as db_err:
                                            logger.warning(f"Failed to update message content in DB: {db_err}")
                                    else:
                                        incoming_text = "[Voice message — transcription failed]"
                                        logger.warning(f"🎙️ Transcription returned empty for {audio_media_id}")
                        else:
                            incoming_text = "[Voice message — transcription failed]"
                            logger.warning(f"Failed to fetch media metadata from Meta: HTTP {_info.status_code}")
                else:
                    logger.warning("🎙️ No WhatsApp access token on org — cannot download audio")
            except Exception as _te:
                incoming_text = "[Voice message — transcription failed]"
                logger.error(f"🎙️ Voice transcription inside agent failed: {_te}", exc_info=True)



        # 2. Check contact and human handover state
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            logger.warning(f"Contact {contact_id} not found.")
            return {"error": f"Contact {contact_id} not found"}

        now = datetime.utcnow()
        if contact.ai_paused_until:
            # Handle timezone-aware comparison
            paused_time = contact.ai_paused_until.replace(tzinfo=None)
            if paused_time > now:
                logger.info(f"AI is paused for contact {contact.name} until {contact.ai_paused_until} (human in control).")
                return {"error": f"AI is paused for contact {contact.name} until {contact.ai_paused_until}"}

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
            results = await search_knowledge_base(db, str(org_id), incoming_text, limit=3, api_key=ai_api_key)
            for res, sim in results:
                kb_chunks.append(f"--- {res.title} ---\n{res.content[:500]}")
        except Exception as rag_err:
            try:
                db.rollback()
            except Exception:
                pass
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
   - Your "reply" MUST explicitly confirm the booking to the contact (e.g. "Awesome, {contact.name}! Your appointment for [Topic] is booked for tomorrow, {tomorrow_dt.strftime('%B %d, %Y')} at {current_time_str}. Looking forward to speaking with you!").

NO EMOJIS RULE:
- NEVER use emojis, smileys, or emoticons in your replies (do NOT use emojis like 😊, 🙌, 🎉, etc.).
- Keep all responses completely free of emojis in both text and voice notes.

VOICE NOTE RULES:
- When a customer sends a voice message that was successfully transcribed, it appears as "[Voice Note]: <transcription>". Answer their message directly, warmly, and helpfully as if they spoke to you.
- If the message is exactly "[Voice message]" (NOT "[Voice Note]: ..."), it means the audio could NOT be transcribed. In this case, politely let them know you heard their voice message but couldn't make it out clearly, and ask them to send it again or type it out. Example: "Hey, I got your voice message but couldn't quite make it out! Could you type it out or try sending it again?"
- NEVER say "Thanks for your voice message, I'm here and ready to listen. What's on your mind?" — this sounds robotic.
- NEVER say "I cannot listen to voice notes" — you CAN listen to them most of the time.



CATALOG & INVENTORY SEARCH RULES:
- When a customer asks about available cars, properties, products, services, prices, or requests something specific (e.g. "I want to book a black BMW for the weekend in Lagos", "Do you have 2-bedroom flats in Lekki", "How much for teeth whitening?", "Show me SUVs under 150k"):
  - Set "type": "SEARCH_CATALOG" in action with:
    - "query": specific item or model (e.g. "BMW", "G-Wagon", "2-bedroom", "teeth whitening")
    - "category": category if applicable (e.g. "SUV", "Shortlet", "Dental")
    - "location": city or area mentioned (e.g. "Lagos", "Ikeja", "Lekki")
    - "max_budget": numeric maximum budget if mentioned (e.g. 150000)
    - "attributes": object of extra filters (e.g. {"color": "black", "drive_mode": "self-drive", "duration": "weekend"})
  - In your "reply", provide an attentive, helpful response confirming you are pulling up the available options.

RESPONSE FORMAT — You must return ONLY a JSON object:
{{
  "reply": "Your response text to the contact",
  "action": {{
    "type": "NONE",
    "documentName": "",
    "imageName": "",
    "purpose": "",
    "preferredDate": "",
    "preferredTime": "",
    "query": "",
    "category": "",
    "location": "",
    "max_budget": null,
    "attributes": {{}},
    "reason": ""
  }}
}}

ACTION TYPE GUIDE:
- NONE: standard conversational reply / answering greetings and questions
- SEARCH_CATALOG: customer inquires about cars, inventory, products, properties, or services (include query, category, location, max_budget, attributes)
- CREATE_BOOKING: customer wants to book/schedule an appointment (include purpose, preferredDate YYYY-MM-DD, preferredTime HH:MM AM/PM)
- SEND_DOCUMENT: customer asks for a document, price list, menu, PDF, or form
- SEND_IMAGE: customer asks for a photo, map, or picture
- SEND_PAYMENT_LINK: customer asks how to pay, fees, pricing, or purchase
- WEB_SEARCH: customer asks factual/timely question not in knowledge base
- FLAG_FOR_HUMAN: customer is in crisis, angry, or asks for a human manager
"""

        user_turn = f"New message from {contact.name}:\n\"{incoming_text}\"\n\nGenerate your JSON response."

        # 8. Call AI Provider
        model_to_use = org.ai_model
        if not model_to_use or model_to_use in ("gemini-3.5-flash", "models/gemini-3.5-flash"):
            model_to_use = "gemini-1.5-flash"

        raw_reply = await call_ai_provider(
            provider=org.ai_provider or "gemini",
            api_key=ai_api_key,
            model=model_to_use,
            system_prompt=system_prompt,
            user_turn=user_turn,
            base_url=org.ai_base_url
        )

        parsed = parse_agent_response(raw_reply)
        reply_text = parsed.get("reply", "")
        action = parsed.get("action", {})
        action_type = action.get("type", "NONE")

        if not reply_text:
            logger.warning(f"AI Agent returned empty reply parsed from: {repr(raw_reply)}")
            reply_text = strip_emojis(raw_reply).strip() if raw_reply else ""
            if not reply_text:
                reply_text = "Hello! How can I help you today?"

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

        recommended_items = []
        if action_type == "SEARCH_CATALOG":
            search_params = {
                "query": action.get("query") or incoming_text,
                "category": action.get("category") or "",
                "max_budget": action.get("max_budget"),
                "location": action.get("location"),
                "attributes": action.get("attributes") or {}
            }
            recommended_items = await execute_catalog_search(org, search_params, db)
            if recommended_items:
                card_summaries = []
                for itm in recommended_items[:3]:
                    card_summaries.append(f"• {itm['title']} ({itm['price']})")
                if card_summaries and not any(itm['title'].lower() in reply_text.lower() for itm in recommended_items):
                    reply_text += f"\n\nHere are available options:\n" + "\n".join(card_summaries)

        # 10. Increment SaaS usage quota counter
        try:
            org.messages_used_this_month = (org.messages_used_this_month or 0) + 1
            db.commit()
        except Exception as quota_err:
            logger.warning(f"Failed to increment messages_used_this_month: {quota_err}")

        # 11. If channel is Web Chat Widget, return reply directly (bypasses WhatsApp Meta & Bridge)
        if channel == "web_widget":
            out_msg = Message(
                organization_id=org_id,
                contact_id=contact.id,
                content=reply_text,
                type="Outbound",
                status="Sent",
                sent_at=now,
                attachment_type="web"
            )
            db.add(out_msg)
            db.commit()
            logger.info(f"💬 AI Auto-reply sent to web widget visitor ({contact.name})")
            return {
                "reply": reply_text,
                "action": action,
                "recommended_items": recommended_items,
                "message_id": str(out_msg.id)
            }

        # 12. Deliver reply to customer via WhatsApp
        from app.api.whatsapp import get_organization_whatsapp_config
        from app.services.meta_whatsapp_service import get_meta_whatsapp_service
        import base64

        config = get_organization_whatsapp_config(db, org_id)
        logger.info(f"📡 WhatsApp delivery config: method={config.get('delivery_method')}, phone_id={config.get('phone_number_id')}, has_token={bool(config.get('access_token'))}")

        # Check voice reply settings
        voice_reply_mode = getattr(org, "ai_voice_reply_mode", "text") or "text"
        voice_name = getattr(org, "ai_voice_name", "en-NG-EzinneNeural") or "en-NG-EzinneNeural"

        is_inbound_voice = incoming_text.startswith("[Voice Note") or incoming_text.startswith("[Voice message")
        should_send_voice = (voice_reply_mode == "voice") or (voice_reply_mode == "match_input" and is_inbound_voice)

        if should_send_voice and config.get("delivery_method") == "meta":
            logger.info(f"🎙️ Synthesizing voice note response using voice: {voice_name}")
            try:
                voice_bytes = await synthesize_voice_note(reply_text, voice_name)
                if voice_bytes:
                    meta_service = get_meta_whatsapp_service(
                        config["phone_number_id"],
                        config["access_token"]
                    )
                    send_result = await meta_service.send_voice_note(
                        to_phone=contact.phone,
                        audio_bytes=voice_bytes,
                        mime_type="audio/ogg; codecs=opus"
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
                        "is_voice": True,
                        "delivery_result": send_result
                    }
            except Exception as voice_err:
                logger.warning(f"Voice synthesis/sending failed, falling back to text: {voice_err}")

        if config.get("delivery_method") == "meta":
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
            logger.info(f"🚀 AI Auto-reply sent to {contact.phone} via Meta Cloud API (success={send_result.get('success')})")
            return {
                "reply": reply_text,
                "action": action,
                "message_id": str(out_msg.id),
                "delivery_result": send_result
            }

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
                "message_id": str(out_msg.id),
                "warning": "Queued for WPPConnect bridge (Meta credentials not found)"
            }

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"❌ Error in trigger_ai_agent_reply: {str(e)}\n{tb}")
        try:
            db.rollback()
        except Exception:
            pass
        return {"error": str(e), "traceback": tb}
