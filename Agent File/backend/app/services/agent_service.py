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
        # Verified ultra-fast production models (sub-2-second latency)
        FAST_GEMINI_MODELS = [
            "gemini-3.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite",
            "gemini-3.7-flash",
            "gemini-flash-latest"
        ]

        EXCLUDE_KEYWORDS = (
            "tts", "preview-tts", "imagen", "image", "embedding",
            "aqa", "robotics", "computer-use", "clip", "banana", "lyria"
        )
        OBSOLETE_MODELS = (
            "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash",
            "gemini-1.5-pro", "gemini-pro", "gemini-3.8-flash", "gemini-3.6-flash"
        )

        candidates = []
        if model:
            clean_m = model.replace("models/", "").strip()
            if not any(ex in clean_m.lower() for ex in EXCLUDE_KEYWORDS) and clean_m not in OBSOLETE_MODELS:
                candidates.append(clean_m)

        for fm in FAST_GEMINI_MODELS:
            if fm not in candidates:
                candidates.append(fm)

        full_text_turn = f"System Instructions:\n{system_prompt}\n\nCustomer Message:\n{user_turn}\n\nGenerate your JSON response."
        attempt_errors = []

        # 1. Primary: Direct Async REST API (Ultra-low latency, non-blocking)
        import httpx
        async with httpx.AsyncClient(timeout=7.0) as client:
            for cand in candidates:
                try:
                    logger.info(f"🤖 Fast REST call to Gemini '{cand}'...")
                    rest_url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand}:generateContent?key={api_key}"
                    payload = {
                        "contents": [
                            {"parts": [{"text": full_text_turn}]}
                        ],
                        "generationConfig": {
                            "temperature": 0.7,
                            "responseMimeType": "application/json"
                        }
                    }
                    r = await client.post(rest_url, json=payload)
                    if r.status_code == 200:
                        r_data = r.json()
                        candidates_list = r_data.get("candidates", [])
                        if candidates_list:
                            text_part = candidates_list[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if text_part:
                                logger.info(f"✅ Gemini model '{cand}' REST call succeeded! ({len(text_part)} chars)")
                                return text_part.strip()
                    else:
                        logger.warning(f"⚠️ Gemini model '{cand}' returned HTTP {r.status_code}: {r.text[:100]}")
                        attempt_errors.append(f"{cand} HTTP {r.status_code}")
                except Exception as rest_e:
                    logger.warning(f"⚠️ Gemini model '{cand}' call exception: {rest_e}")
                    attempt_errors.append(f"{cand} ex: {str(rest_e)[:60]}")
                    continue

        # 2. Fallback to SDK with strict async timeout if REST attempts had issues
        try:
            import google.generativeai as genai
            import asyncio
            genai.configure(api_key=api_key)
            fallback_model_name = candidates[0] if candidates else "gemini-3.5-flash-lite"
            logger.info(f"🔄 Trying SDK fallback with '{fallback_model_name}'...")
            sdk_model = genai.GenerativeModel(fallback_model_name)
            response = await asyncio.wait_for(
                asyncio.to_thread(sdk_model.generate_content, full_text_turn, generation_config={"temperature": 0.7}),
                timeout=7.0
            )
            if response and response.text:
                return response.text.strip()
        except Exception as sdk_err:
            attempt_errors.append(f"SDK fallback ex: {str(sdk_err)[:60]}")

        err_summary = " | ".join(attempt_errors[-4:])
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
    """Parse JSON reply and action from AI response with robust fallback extraction."""
    if not raw_text:
        return {"reply": "Hello! How can I help you today?", "action": {"type": "NONE"}}

    # 1. Try standard and strict=False JSON parsing
    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if json_match:
        cand = json_match.group(0)
        try:
            data = json.loads(cand, strict=False)
            reply = strip_emojis((data.get("reply") or "").strip())
            if reply:
                return {
                    "reply": reply,
                    "action": data.get("action") or {"type": "NONE"}
                }
        except Exception as e:
            logger.warning(f"json.loads failed, attempting regex fallback: {e}")

        # 2. Regex fallback to extract 'reply' and 'action' if JSON syntax was malformed
        reply_match = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', cand, re.DOTALL)
        action_match = re.search(r'"type"\s*:\s*"([^"]+)"', cand)
        query_match = re.search(r'"query"\s*:\s*"([^"]*)"', cand)
        cat_match = re.search(r'"category"\s*:\s*"([^"]*)"', cand)

        if reply_match:
            extracted_reply = reply_match.group(1).replace(r'\"', '"').replace(r'\n', '\n').strip()
            extracted_reply = strip_emojis(extracted_reply)
            extracted_action = {
                "type": action_match.group(1) if action_match else "NONE",
                "query": query_match.group(1) if query_match else "",
                "category": cat_match.group(1) if cat_match else ""
            }
            return {
                "reply": extracted_reply,
                "action": extracted_action
            }

    # 3. If raw_text had code blocks or plain text, clean it
    clean = re.sub(r"```(json)?|```", "", raw_text).strip()
    if clean.startswith("{") and '"reply"' in clean:
        clean_match = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', clean, re.DOTALL)
        if clean_match:
            clean = clean_match.group(1).replace(r'\"', '"').replace(r'\n', '\n').strip()
        else:
            clean_match2 = re.search(r'"reply"\s*:\s*"([^"]+)', clean)
            if clean_match2:
                clean = clean_match2.group(1).strip()

    clean = strip_emojis(clean)
    return {"reply": clean, "action": {"type": "NONE"}}



def _convert_audio_to_wav(audio_bytes: bytes, is_ogg: bool, clean_mime: str) -> Optional[bytes]:
    """Helper running in thread pool to convert audio bytes to 16kHz mono PCM WAV via bundled imageio-ffmpeg."""
    import tempfile
    import os
    import stat
    import subprocess
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        try:
            st = os.stat(ffmpeg_exe)
            os.chmod(ffmpeg_exe, st.st_mode | stat.S_IEXEC)
        except Exception:
            pass

        with tempfile.TemporaryDirectory() as tmpdir:
            ext = ".ogg" if is_ogg else (".webm" if "webm" in clean_mime else (".mp4" if "mp4" in clean_mime else ".raw"))
            in_path = os.path.join(tmpdir, f"in{ext}")
            out_path = os.path.join(tmpdir, "out.wav")
            with open(in_path, "wb") as f_in:
                f_in.write(audio_bytes)

            cmd = [ffmpeg_exe, "-y", "-i", in_path, "-ac", "1", "-ar", "16000", out_path]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
                with open(out_path, "rb") as f_out:
                    return f_out.read()
    except Exception as conv_err:
        logger.warning(f"Audio conversion with imageio-ffmpeg failed: {conv_err}")
    return None


async def transcribe_voice_note(
    audio_bytes: bytes,
    mime_type: str = "audio/ogg",
    api_key: Optional[str] = None,
    provider: str = "gemini",
    base_url: Optional[str] = None
) -> str:
    """
    Transcribes WhatsApp voice notes (OGG/Opus) and Web Widget voice notes (WebM/MP4/WAV).
    Multi-Tier Architecture:
    1. Groq Cloud Whisper API (Free tier: 7,200 req/day, <0.4s response, handles raw OGG/WebM/WAV)
    2. imageio-ffmpeg 16kHz mono WAV conversion + Google Gemini 2.0 Flash Audio Multimodal API
    3. Raw audio container + Gemini Multimodal Fallback
    4. Dedicated self-hosted faster-whisper microservice (if TRANSCRIBE_SERVICE_URL configured)
    5. OpenAI Whisper API (if OpenAI key configured)
    """
    if not audio_bytes or len(audio_bytes) < 100:
        logger.warning(f"🔇 Transcription skipped — audio_bytes is empty or too small ({len(audio_bytes) if audio_bytes else 0} bytes).")
        return ""

    import os
    import time
    import base64
    import httpx
    import asyncio
    from app.config import settings as _app_settings

    first_4 = audio_bytes[:4]
    is_ogg = (first_4 == b"OggS")

    # Clean and sanitize MIME type for Gemini and external APIs (strip parameters like ;codecs=opus)
    raw_mime = (mime_type or "audio/ogg").split(";")[0].strip().lower()
    if is_ogg or "ogg" in raw_mime:
        clean_mime = "audio/ogg"
    elif "webm" in raw_mime:
        clean_mime = "audio/webm"
    elif "wav" in raw_mime:
        clean_mime = "audio/wav"
    elif "mp3" in raw_mime or "mpeg" in raw_mime:
        clean_mime = "audio/mp3"
    elif "m4a" in raw_mime or "aac" in raw_mime:
        clean_mime = "audio/aac"
    elif "mp4" in raw_mime:
        clean_mime = "audio/mp4"
    else:
        clean_mime = "audio/ogg" if is_ogg else (raw_mime or "audio/ogg")

    logger.info(f"🎙️ TRANSCRIBE START: {len(audio_bytes)} bytes | magic={repr(first_4)} (is_ogg={is_ogg}) | clean_mime={clean_mime} (raw={mime_type})")

    # Resolve API keys
    effective_gemini_key = api_key or getattr(_app_settings, "gemini_api_key", None) or os.getenv("GEMINI_API_KEY")
    effective_groq_key = os.getenv("GROQ_API_KEY") or getattr(_app_settings, "groq_api_key", None)
    if not effective_groq_key and effective_gemini_key and effective_gemini_key.startswith("gsk_"):
        effective_groq_key = effective_gemini_key

    # =========================================================================
    # Tier 1: Groq Cloud Whisper API (Free tier: 7,200 req/day, ~0.3s transcription)
    # =========================================================================
    if effective_groq_key:
        try:
            logger.info("🎙️ [Tier 1: Groq Cloud Whisper] Transcribing with whisper-large-v3-turbo...")
            start_groq = time.time()
            clean_ext = "ogg" if clean_mime == "audio/ogg" else ("webm" if clean_mime == "audio/webm" else "wav")
            files = {"file": (f"voice.{clean_ext}", audio_bytes, clean_mime)}
            data_w = {
                "model": "whisper-large-v3-turbo",
                "temperature": "0",
                "prompt": "English, Nigerian Pidgin, Yoruba, Hausa, Igbo: E kaaro, Bawo ni, Kedu, Sannu, phone, charger, smart watch, battery, cable, price."
            }
            headers_w = {"Authorization": f"Bearer {effective_groq_key}"}
            async with httpx.AsyncClient(timeout=15.0) as client:
                g_res = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers=headers_w,
                    data=data_w,
                    files=files
                )
                elapsed_g = time.time() - start_groq
                if g_res.status_code == 200:
                    text_out = g_res.json().get("text", "").strip()
                    # Detect Whisper Hebrew/Welsh false-positive hallucination
                    has_hebrew_chars = any('\u0590' <= c <= '\u05ff' for c in text_out)
                    if has_hebrew_chars or text_out.lower() in ("hebrew", "[hebrew]"):
                        logger.warning(f"⚠️ Discarding Whisper false-positive Hebrew hallucination: '{text_out}'")
                    elif text_out:
                        logger.info(f"🎙️ ✅ Groq Whisper SUCCESS in {elapsed_g:.2f}s: '{text_out[:120]}'")
                        return text_out
                else:
                    logger.warning(f"Groq Whisper HTTP {g_res.status_code}: {g_res.text[:200]}")
        except Exception as g_err:
            logger.warning(f"Groq Whisper attempt error: {g_err}")

    # =========================================================================
    # Tier 2: Google Gemini Multimodal Audio (Direct Async REST + African Multilingual)
    # Natively understands Yoruba, Hausa, Igbo, Nigerian Pidgin, and English
    # =========================================================================
    if effective_gemini_key and not effective_gemini_key.startswith("gsk_") and not effective_gemini_key.startswith("sk-"):
        try:
            b64_audio = base64.b64encode(audio_bytes).decode('ascii')
            audio_mime = "audio/ogg" if is_ogg else clean_mime

            transcribe_prompt = (
                "Transcribe this voice message verbatim in English, Nigerian Pidgin, Yoruba (e.g. Bawo ni, E kaaro, Mo fe ra...), Hausa (Sannu, Ina kwana, Ina son...), Igbo (Kedu, Ndewo, Achorum...), or Isoko. "
                "Accurately recognize African languages and Nigerian accents. "
                "Do NOT mistake African languages for Hebrew, Arabic, Welsh, or European languages. "
                "Output ONLY the exact transcribed words with no other text, no explanations, and no commentary. "
                "If the audio has no speech or is only background silence, reply with [silence]."
            )

            # 1. Direct Async REST to fast Gemini models
            for cand_model in ["gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-3.1-flash-lite"]:
                try:
                    rest_url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand_model}:generateContent?key={effective_gemini_key}"
                    payload = {
                        "contents": [{
                            "parts": [
                                {"inlineData": {"mimeType": audio_mime, "data": b64_audio}},
                                {"text": transcribe_prompt}
                            ]
                        }],
                        "generationConfig": {"temperature": 0.0}
                    }
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        r = await client.post(rest_url, json=payload)
                        if r.status_code == 200:
                            data = r.json()
                            candidates_list = data.get("candidates", [])
                            if candidates_list:
                                parts = candidates_list[0].get("content", {}).get("parts", [])
                                if parts:
                                    res_text = parts[0].get("text", "").strip()
                                    if res_text and res_text.lower() not in ("[silence]", "[blank]", "[unintelligible]"):
                                        logger.info(f"🎙️ ✅ Gemini REST audio transcription ({cand_model}) SUCCESS: '{res_text[:120]}'")
                                        return res_text
                                    elif res_text.lower() in ("[silence]", "[blank]", "[unintelligible]"):
                                        return ""
                        else:
                            logger.warning(f"Gemini REST audio HTTP {r.status_code} on {cand_model}: {r.text[:120]}")
                except Exception as rest_e:
                    logger.warning(f"Gemini REST audio on {cand_model} exception: {rest_e}")
                    continue

        except Exception as tier2_err:
            logger.error(f"🎙️ Tier 2 Gemini REST audio transcription error: {tier2_err}")

    # =========================================================================
    # Tier 3: Dedicated self-hosted faster-whisper microservice (port 8001 or TRANSCRIBE_SERVICE_URL)
    # =========================================================================
    transcribe_url = os.getenv("TRANSCRIBE_SERVICE_URL", "").strip()
    transcribe_key = os.getenv("TRANSCRIBE_SERVICE_KEY", "").strip() or "17f187c37b8164bc2f038779fa9ebe886ef771e3f721793e584bd816bf1a8ac5"

    if transcribe_url and not transcribe_url.startswith("https://shepherdai.duckdns.org"):
        transcribe_url = transcribe_url.rstrip("/")
        if not transcribe_url.endswith("/transcribe"):
            transcribe_url = f"{transcribe_url}/transcribe"

        start_t = time.time()
        logger.info(f"🎙️ [Tier 3] Calling self-hosted Whisper microservice: {transcribe_url}")
        try:
            headers = {"X-Api-Key": transcribe_key}
            async with httpx.AsyncClient(timeout=20.0) as client:
                files = {"file": ("voice.ogg", audio_bytes, clean_mime)}
                resp = await client.post(transcribe_url, files=files, headers=headers)
                elapsed = time.time() - start_t
                if resp.status_code == 200:
                    text = resp.json().get("text", "").strip()
                    if text:
                        logger.info(f"🎙️ ✅ Whisper transcription SUCCESS: '{text[:120]}'")
                        return text
        except Exception as e:
            logger.warning(f"🎙️ Tier 3 Whisper microservice error: {e}")

    # =========================================================================
    # Tier 4: OpenAI Whisper fallback (if key starts with sk-)
    # =========================================================================
    if api_key and api_key.startswith("sk-"):
        try:
            whisper_url = "https://api.openai.com/v1/audio/transcriptions"
            logger.info(f"🎙️ [Tier 4] Trying OpenAI Whisper fallback at {whisper_url}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": ("voice_message.ogg", audio_bytes, clean_mime)}
                data_w = {"model": "whisper-1"}
                headers_w = {"Authorization": f"Bearer {api_key}"}
                wres = await client.post(whisper_url, headers=headers_w, data=data_w, files=files)
                if wres.status_code == 200:
                    text_out = wres.json().get("text", "").strip()
                    if text_out:
                        logger.info(f"🎙️ ✅ OpenAI Whisper fallback transcript: '{text_out[:120]}'")
                        return text_out
        except Exception as e_w:
            logger.error(f"🎙️ OpenAI Whisper fallback exception: {e_w}")

    logger.warning("🎙️ All transcription tiers exhausted — returning empty string")
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
        from sqlalchemy import or_
        import urllib.parse
        import re

        base_query = db.query(CatalogItem).filter(
            CatalogItem.organization_id == org.id,
            CatalogItem.is_available == True
        )
        fallback_query = db.query(CatalogItem).filter(
            CatalogItem.organization_id == org.id,
            CatalogItem.is_available == True
        )

        results = []
        if query_str:
            # 1. Normalize common phonetic typos and compound terms
            norm_q = query_str
            norm_q = re.sub(r"\bwrest\s*watch\b", "watch", norm_q, flags=re.I)
            norm_q = re.sub(r"\bwrist\s*watch\b", "watch", norm_q, flags=re.I)
            norm_q = re.sub(r"\bsmart\s*watch\b", "smartwatch", norm_q, flags=re.I)
            norm_q = re.sub(r"\bpower\s*bank\b", "power bank", norm_q, flags=re.I)
            norm_q = re.sub(r"\bfast\s*charger\b", "charger", norm_q, flags=re.I)

            # 2. Check for Specific Brand or Model mentions
            KNOWN_BRANDS = ["oraimo", "foomee", "apple", "samsung", "infinix", "tecno", "xiaomi", "itel", "anker", "shplus", "votwo"]
            detected_brand = next((b for b in KNOWN_BRANDS if b in query_str.lower()), None)

            # Model numbers (e.g. 2R, KM20, KM19, etc.)
            model_match = re.search(r"\b(2r|km20|km19|km22|series\s*\d+|pro|max)\b", query_str, re.I)
            detected_model = model_match.group(0).lower() if model_match else None

            is_specific = bool(detected_brand or detected_model)

            # Tier 1: Brand & Model Specific Search (Highest Priority)
            if is_specific:
                spec_query = base_query
                if detected_brand:
                    spec_query = spec_query.filter(
                        (CatalogItem.title.ilike(f"%{detected_brand}%")) |
                        (CatalogItem.description.ilike(f"%{detected_brand}%"))
                    )
                if detected_model:
                    spec_query = spec_query.filter(
                        (CatalogItem.title.ilike(f"%{detected_model}%")) |
                        (CatalogItem.description.ilike(f"%{detected_model}%"))
                    )
                # Also include category/keyword if present (e.g. "watch", "charger")
                for cat_word in ["watch", "smartwatch", "charger", "cable", "battery", "earbud", "headphone"]:
                    if cat_word in norm_q.lower():
                        spec_query = spec_query.filter(
                            (CatalogItem.title.ilike(f"%{cat_word}%")) |
                            (CatalogItem.category.ilike(f"%{cat_word}%")) |
                            (CatalogItem.description.ilike(f"%{cat_word}%"))
                        )
                        break

                results = spec_query.limit(5).all()
                if results:
                    logger.info(f"🎯 Exact brand/model match found {len(results)} items for '{query_str}' (brand={detected_brand}, model={detected_model})")

            # Tier 2: Phrase & Token Match across Title, Category, Description
            if not results:
                tier2 = base_query.filter(
                    (CatalogItem.title.ilike(f"%{norm_q}%")) |
                    (CatalogItem.description.ilike(f"%{norm_q}%")) |
                    (CatalogItem.category.ilike(f"%{norm_q}%"))
                )
                if max_budget:
                    try:
                        tier2 = tier2.filter(CatalogItem.price_amount <= float(max_budget))
                    except:
                        pass
                results = tier2.limit(5).all()

            # Tier 3: Token-based fallback search with relevance scoring
            if not results:
                stop_words = {"want", "need", "looking", "for", "please", "some", "like", "have", "with", "from", "the", "and", "buy", "good", "show", "give"}
                raw_words = norm_q.split()
                clean_tokens = [re.sub(r"[^\w]", "", w).strip() for w in raw_words]
                tokens = [t for t in clean_tokens if len(t) >= 3 and t.lower() not in stop_words]

                if tokens:
                    all_candidates = fallback_query.limit(30).all()
                    if all_candidates:
                        def score_item(item):
                            score = 0
                            t_lower = (item.title or "").lower()
                            c_lower = (item.category or "").lower()
                            d_lower = (item.description or "").lower()
                            for tok in tokens:
                                tok_l = tok.lower()
                                if tok_l in t_lower:
                                    score += 15
                                if tok_l in c_lower:
                                    score += 8
                                if tok_l in d_lower:
                                    score += 2
                            # Brand bonus if brand matched
                            if detected_brand and detected_brand in t_lower:
                                score += 20
                            return score

                        scored = [(itm, score_item(itm)) for itm in all_candidates]
                        scored = [pair for pair in scored if pair[1] > 0]
                        scored.sort(key=lambda x: x[1], reverse=True)
                        results = [pair[0] for pair in scored[:5]]
                        logger.info(f"💡 Tier 3 token search found {len(results)} ranked items for '{query_str}' using tokens: {tokens}")
        else:
            if category:
                base_query = base_query.filter(CatalogItem.category.ilike(f"%{category}%"))
            if max_budget:
                try:
                    base_query = base_query.filter(CatalogItem.price_amount <= float(max_budget))
                except:
                    pass
            results = base_query.limit(5).all()

        # Dynamic organization store URL fallback (no hardcoding)
        base_store_url = (
            getattr(org, "external_search_webhook_url", None) or
            getattr(org, "ai_payment_link", None) or
            "https://decehub.com"
        ).rstrip("/")
        if not base_store_url.startswith("http"):
            base_store_url = "https://" + base_store_url if base_store_url else ""

        for itm in results:
            price_display = f"{itm.price_currency or 'NGN'} {itm.price_amount:,.0f} {itm.price_unit or ''}".strip() if itm.price_amount else "Contact for pricing"
            safe_action_url = itm.action_url or (f"{base_store_url}/?s={urllib.parse.quote_plus(itm.title)}" if base_store_url else "")
            items.append({
                "id": str(itm.id),
                "title": itm.title,
                "category": itm.category or "",
                "description": itm.description or "",
                "price": price_display,
                "price_amount": float(itm.price_amount) if itm.price_amount else 0,
                "image_url": itm.image_url or "",
                "action_url": safe_action_url,
                "attributes": itm.attributes or {}
            })
        logger.info(f"📦 Internal catalog search found {len(items)} items for org {org.id}")
    except Exception as e:
        logger.warning(f"Internal catalog query failed: {e}")

    return items


async def _execute_generative_ai_pipeline(
    org, contact, incoming_text: str, now: datetime, ai_api_key: str, db: Session
) -> tuple:
    """
    Executes the multi-stage LLM generation pipeline:
    1. Conversation history retrieval
    2. RAG semantic knowledge search
    3. Multi-turn session slot check
    4. Media library lookup
    5. Real-time calendar & clock context
    6. System prompt assembly
    7. Model invocation with retry & resilient JSON parsing
    """
    org_id = org.id
    contact_id = contact.id

    # 1. Retrieve conversation history (last 8 messages)
    history_msgs = db.query(Message).filter(
        Message.contact_id == contact_id
    ).order_by(Message.created_at.desc()).limit(8).all()
    history_msgs.reverse()

    history_lines = []
    for m in history_msgs:
        sender = org.ai_name if m.type == "Outbound" else contact.name
        history_lines.append(f"{sender}: {m.content}")
    history_text = "\n".join(history_lines) if history_lines else "No previous conversation."

    # 2. RAG semantic knowledge retrieval
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

    # 3. Check active multi-turn session
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

    # 4. Fetch available media files from media_library table
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

    # 5. Build real-time calendar & clock context
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
4. MANDATORY CONTACT DETAILS FOR CONSULTATIONS & WEBSITE LEADS:
   - When a user on the website widget or chat asks to book a consultation, demo, repair check, or appointment:
   - You MUST politely ask for their WhatsApp phone number or email address (e.g. "I would be happy to book a consultation for you! What date and time works best, and could you please provide your WhatsApp number or email address so our team can contact you and confirm?").
   - Do NOT confirm the booking without first obtaining their WhatsApp phone number or email address!

NO EMOJIS RULE:
- NEVER use emojis, smileys, or emoticons in your replies (do NOT use emojis like 😊, 🙌, 🎉, etc.).
- Keep all responses completely free of emojis in both text and voice notes.

MULTILINGUAL & NIGERIAN LANGUAGE RULES:
- You are operating in Nigeria and fully support English, Nigerian Pidgin, Yoruba, Hausa, Igbo, and Isoko.
- If a contact states their ethnicity or language (e.g. "I am Yoruba", "I am Igbo", "I speak Hausa") or speaks/types in Yoruba, Hausa, Igbo, or Pidgin:
  - You MUST warmly acknowledge and reply fluently in their language or natural Nigerian Pidgin!
  - Yoruba example: "E kaabo! Inu mi dun lati ba yin soro. Bawo ni mo se le ran yin lowo loni pelu awon ohun elo wa?" or "Inu mi dun lati mo pe omo Yoruba ni yin. Bawo ni mo se le ran yin lowo loni?"
  - Hausa example: "Sannu da zuwa! Ina farin cikin magana da ku. Me zan iya taimaka muku da shi a yau?"
  - Igbo example: "Ndewo! Obi di m uto isoro gi kwuo okwu. Kedu ihe m nwere ike inyere gi aka taa?"
  - Nigerian Pidgin example: "I hail you! How body? Wetin you go like check out today?"
- If the customer asks for products in Yoruba, Hausa, Igbo, or Pidgin, respond to them in that language, and set "action": {"type": "SEARCH_CATALOG", "query": "<item in english>"} so the system automatically attaches the interactive visual product cards!

VOICE NOTE RULES:
- When a customer sends a voice message that was successfully transcribed, it appears as "[Voice Note]: <transcription>". Answer their message directly, warmly, and helpfully as if they spoke to you.
- If the message says "[Voice message — could not transcribe clearly]", it means the audio was muffled, silent, or could not be decoded. In this case:
  - Respond warmly and naturally (e.g. "Hey! I got your voice note, but it came through a bit muffled on my end. Could you please send it once more or drop a quick text message?").
  - NEVER say "I am unable to listen to voice notes directly in our chat" or "I cannot listen to audio" — because you normally can listen to voice notes!
  - NEVER say robotic phrases like "Thanks for your voice message, I'm here and ready to listen."
  - Check the previous conversation history: if you were already discussing an item (e.g. chargers, cars, appointments), ask if they were referring to that!

CATALOG & INVENTORY SEARCH RULES:
- CRITICAL VISUAL DISPLAY RULE: Whenever a customer asks about available cars, properties, products, services, prices, or requests a list of items (e.g. "show me the list of watch that you have in store", "do you have chargers?", "what batteries are available?", "show me BMWs", "I want an Oraimo charger"):
  - You MUST set "type": "SEARCH_CATALOG" in action with:
    - "query": specific item, category, or model (e.g. "watch", "charger", "battery", "BMW", "G-Wagon", "2-bedroom", "teeth whitening")
    - "category": category if applicable (e.g. "Watches", "SUV", "Shortlet", "Dental", "Chargers")
    - "location": city or area mentioned (e.g. "Lagos", "Ikeja", "Lekki")
    - "max_budget": numeric budget if mentioned (e.g. 50000)
    - "attributes": any specific key-value pairs mentioned (e.g. {{"brand": "Oraimo", "year": "2020", "color": "black"}})
  - Your "reply" MUST warmly introduce the items (e.g. "Here are our available items from the store:"). The platform will automatically attach visual interactive product cards with images, pricing, and buy links!

MANDATORY OUTPUT FORMAT:
You MUST respond with valid JSON containing "reply" and "action".
{{
  "reply": "Your message to the contact here",
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

    # 6. Call AI Provider
    model_to_use = org.ai_model
    if not model_to_use or model_to_use in (
        "gemini-3.5-flash", "models/gemini-3.5-flash",
        "gemini-1.5-flash", "models/gemini-1.5-flash",
        "gemini-2.0-flash", "models/gemini-2.0-flash",
        "gemini-2.5-flash", "models/gemini-2.5-flash"
    ):
        model_to_use = "gemini-3.5-flash-lite"

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

    if reply_text and reply_text.strip().startswith("{") and '"reply"' in reply_text:
        alt_m = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', reply_text, re.DOTALL)
        if alt_m:
            reply_text = alt_m.group(1).replace(r'\"', '"').replace(r'\n', '\n').strip()

    if not reply_text:
        logger.warning(f"AI Agent returned empty reply parsed from: {repr(raw_reply)}")
        reply_text = strip_emojis(raw_reply).strip() if raw_reply else ""
        if not reply_text:
            reply_text = "Hello! How can I help you today?"

    return reply_text, action, action_type, session, collected_data


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
                    _audio_content = None
                    _mime = audio_mime_type or "audio/ogg"
                    async with _httpx.AsyncClient(timeout=35.0, follow_redirects=False) as _client:
                        _info = await _client.get(
                            f"https://graph.facebook.com/v18.0/{audio_media_id}",
                            headers=_dl_headers
                        )
                        logger.info(f"🎙️ Meta media info HTTP {_info.status_code}: {_info.text[:200]}")
                        if _info.status_code == 200:
                            _down_url = _info.json().get("url")
                            _mime = _info.json().get("mime_type", audio_mime_type)
                            if _down_url:
                                _curr_url = _down_url
                                for _hop in range(6):
                                    _bin = await _client.get(_curr_url, headers=_dl_headers)
                                    logger.info(f"🎙️ Meta audio hop {_hop}: HTTP {_bin.status_code} from {_curr_url[:60]}")
                                    if _bin.status_code in (301, 302, 303, 307, 308):
                                        _curr_url = _bin.headers.get("Location")
                                        if not _curr_url:
                                            break
                                        continue
                                    elif _bin.status_code == 200 and _bin.content:
                                        _audio_content = _bin.content
                                        break
                                    elif _bin.status_code in (401, 403):
                                        # Retry without auth header for pre-signed CDN URLs
                                        _bin_noauth = await _client.get(_curr_url, headers={"User-Agent": "curl/7.64.1"})
                                        if _bin_noauth.status_code == 200 and _bin_noauth.content:
                                            _audio_content = _bin_noauth.content
                                            break
                                        else:
                                            logger.warning(f"Meta audio download non-200: {_bin.status_code}")
                                            break
                                    else:
                                        break

                    if _audio_content and len(_audio_content) > 100:
                        logger.info(f"🎙️ Meta audio downloaded successfully: {len(_audio_content)} bytes (mime={_mime})")
                        _transcript = await transcribe_voice_note(
                            audio_bytes=_audio_content,
                            mime_type=_mime,
                            api_key=ai_api_key,
                            provider=getattr(org, "ai_provider", "gemini") or "gemini",
                            base_url=getattr(org, "ai_base_url", None)
                        )
                        if _transcript and len(_transcript) > 2:
                            incoming_text = f"[Voice Note]: {_transcript}"
                            logger.info(f"🎙️ ✅ Transcription SUCCESS: '{_transcript[:100]}'")
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
                            incoming_text = "[Voice message — could not transcribe clearly]"
                            logger.warning(f"🎙️ Transcription returned empty for {audio_media_id}")
                    else:
                        incoming_text = "[Voice message — could not transcribe clearly]"
                        logger.warning(f"Failed to download audio content from Meta for {audio_media_id}")
                else:
                    logger.warning("🎙️ No WhatsApp access token on org — cannot download audio")
            except Exception as _te:
                incoming_text = "[Voice message — could not transcribe clearly]"
                logger.error(f"🎙️ Voice transcription inside agent failed: {_te}", exc_info=True)



        # 2. Check contact and human handover state
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            logger.warning(f"Contact {contact_id} not found.")
            return {"error": f"Contact {contact_id} not found"}

        now = datetime.utcnow()
        if channel != "web_widget" and contact.ai_paused_until:
            # Handle timezone-aware comparison
            paused_time = contact.ai_paused_until.replace(tzinfo=None)
            if paused_time > now:
                logger.info(f"AI is paused for contact {contact.name} until {contact.ai_paused_until} (human in control).")
                return {"error": f"AI is paused for contact {contact.name} until {contact.ai_paused_until}"}

        # 3. Rule-Based Intent Engine (Zero-Token Cost Optimizer)
        from app.services.rule_engine import evaluate_rule_intent
        rule_res = await evaluate_rule_intent(incoming_text, org, db)

        reply_text = ""
        action = {}
        action_type = "NONE"
        recommended_items = []
        is_rule_handled = False
        session = None
        collected_data = {}

        if rule_res.get("matched"):
            logger.info(f"⚡ [RULE ENGINE] Intercepted message with Rule '{rule_res.get('intent')}' — 0 Gemini tokens consumed.")
            reply_text = rule_res.get("reply", "")
            action = rule_res.get("action") or {"type": "NONE"}
            action_type = action.get("type", "NONE")
            recommended_items = rule_res.get("recommended_items", [])
            is_rule_handled = True
        else:
            reply_text, action, action_type, session, collected_data = await _execute_generative_ai_pipeline(
                org=org,
                contact=contact,
                incoming_text=incoming_text,
                now=now,
                ai_api_key=ai_api_key,
                db=db
            )

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

            # Extract contact phone or email if provided by website visitor
            found_email = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", incoming_text)
            found_phone = re.search(r"(?:\+?\d{1,4}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4,6}", incoming_text)
            
            contact_number = contact.phone
            if found_phone:
                digits = re.sub(r"\D", "", found_phone.group(0))
                if len(digits) >= 10:
                    clean_phone = found_phone.group(0).strip()
                    contact.phone = clean_phone
                    contact_number = clean_phone
            if found_email:
                contact.email = found_email.group(0).strip().lower()
                if not contact_number or contact_number.startswith("web_"):
                    contact_number = contact.email

            # Create confirmed booking in DB
            booking = Booking(
                contact_id=contact.id,
                contact_name=contact.name,
                contact_phone=contact_number,
                purpose=purpose,
                date=resolved_date,
                time=resolved_time,
                notes=f"Auto-created by AI Agent on {now.strftime('%Y-%m-%d %H:%M')}" + (f" | Email: {contact.email}" if contact.email else ""),
                status="confirmed"
            )
            db.add(booking)
            db.commit()
            logger.info(f"📅 Booking confirmed for {contact.name}: {purpose} on {resolved_date} at {resolved_time} (Contact: {contact_number})")

            if session:
                db.delete(session)
                db.commit()

        if not recommended_items and action_type == "SEARCH_CATALOG":
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
                price_str = itm.get('price') or "Contact for price"
                act_url = itm.get('action_url') or ""
                line = f"*{itm['title']}*\nPrice: {price_str}"
                if act_url and act_url.startswith("http"):
                    line += f"\nView / Order: {act_url}"
                card_summaries.append(line)
            if card_summaries and not any(itm['title'].lower() in reply_text.lower() for itm in recommended_items):
                reply_text += f"\n\nHere are available options:\n\n" + "\n\n".join(card_summaries)

        # Automatic Visual Catalog Card Attachment Fallback:
        # If the AI provided a text reply without setting action_type=="SEARCH_CATALOG",
        # but the reply or user prompt mentions products in the catalog, attach them!
        if not recommended_items:
            try:
                from app.models.catalog_item import CatalogItem
                import urllib.parse
                clean_in = incoming_text.lower().replace("[voice note]:", "").strip()
                base_store_url = (getattr(org, "ai_payment_link", None) or getattr(org, "external_search_webhook_url", None) or "https://decehub.com").rstrip("/")
                if not base_store_url.startswith("http"):
                    base_store_url = "https://" + base_store_url if base_store_url else ""

                all_items = db.query(CatalogItem).filter(
                    CatalogItem.organization_id == org.id,
                    CatalogItem.is_available == True
                ).all()

                matched = []
                # 1. Match if any product title is mentioned in reply_text
                for ci in all_items:
                    title_clean = ci.title.strip()
                    title_lower = title_clean.lower()
                    words = [w for w in title_lower.split() if len(w) > 2]
                    first_3 = " ".join(words[:3]) if len(words) >= 3 else title_lower
                    if title_lower in reply_text.lower() or (first_3 and first_3 in reply_text.lower()):
                        if ci not in matched:
                            matched.append(ci)

                # 2. If nothing matched in reply, search by incoming query keywords
                if not matched and any(w in clean_in for w in ["watch", "charger", "battery", "cable", "earbud", "headphone", "power bank", "phone", "laptop", "sound", "speaker", "case", "pods", "oraimo", "foomee", "buy", "price", "show", "list", "have", "store", "product"]):
                    search_tokens = [w for w in clean_in.split() if len(w) >= 3 and w not in ["the", "show", "list", "that", "you", "have", "store", "for", "with", "and", "can", "please", "want", "some"]]
                    if search_tokens:
                        token_q = " ".join(search_tokens)
                        matched_dicts = await execute_catalog_search(org, {"query": token_q}, db)
                        recommended_items = matched_dicts[:4]

                # 3. If STILL nothing matched, check recent conversation history for product context
                if not matched and not recommended_items:
                    recent_msgs = db.query(Message).filter(Message.contact_id == contact.id).order_by(Message.created_at.desc()).limit(6).all()
                    combined_history = " ".join((m.content or "").lower() for m in recent_msgs)
                    for kw in ["watch", "smartwatch", "charger", "cable", "battery", "power bank", "earbud", "headphone", "oraimo", "foomee", "shplus", "votwo", "anker", "laptop", "phone"]:
                        if kw in combined_history:
                            matched_dicts = await execute_catalog_search(org, {"query": kw}, db)
                            if matched_dicts:
                                recommended_items = matched_dicts[:4]
                                logger.info(f"✨ Auto-attached {len(recommended_items)} catalog cards from conversation history keyword '{kw}'")
                                break

                if matched and not recommended_items:
                    for mi in matched[:4]:
                        price_display = f"{mi.price_currency or 'NGN'} {mi.price_amount:,.0f}".strip() if mi.price_amount else "Contact for pricing"
                        safe_url = mi.action_url or (f"{base_store_url}/?s={urllib.parse.quote_plus(mi.title)}" if base_store_url else "")
                        recommended_items.append({
                            "id": str(mi.id),
                            "title": mi.title,
                            "category": mi.category or "",
                            "description": mi.description or "",
                            "price": price_display,
                            "price_amount": float(mi.price_amount) if mi.price_amount else 0,
                            "image_url": mi.image_url or "",
                            "action_url": safe_url,
                            "attributes": mi.attributes or {}
                        })
                    logger.info(f"✨ Auto-attached {len(recommended_items)} visual catalog cards to reply for '{clean_in[:50]}'")
            except Exception as auto_cat_err:
                logger.warning(f"Auto catalog attachment error: {auto_cat_err}")

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

        voice_sent = False
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
                    voice_sent = True

                    # If no catalog items need to be sent, return immediately
                    if not recommended_items:
                        return {
                            "reply": reply_text,
                            "action": action,
                            "message_id": str(out_msg.id),
                            "is_voice": True,
                            "delivery_result": send_result
                        }
                    else:
                        logger.info(f"🎙️ Voice note delivered. Proceeding to deliver {len(recommended_items)} visual catalog cards to WhatsApp.")
            except Exception as voice_err:
                logger.warning(f"Voice synthesis/sending failed, falling back to text: {voice_err}")

        if config.get("delivery_method") == "meta":
            meta_service = get_meta_whatsapp_service(
                config["phone_number_id"],
                config["access_token"]
            )

            last_send_result = {"success": False}

            if recommended_items:
                # 1. Clean the intro text by removing redundant appended text list of options
                intro_text = re.sub(r'\n\nHere are available options:[\s\S]*$', '', reply_text).strip()
                if not intro_text:
                    clean_query = incoming_text.lower().replace("[voice note]:", "").strip()
                    intro_text = f"Here are available options for {clean_query}:"

                # Send conversational intro text only if voice note was not already delivered
                if not voice_sent:
                    intro_res = await meta_service.send_message(
                        to_phone=contact.phone,
                        message=intro_text
                    )
                    last_send_result = intro_res
                    out_msg_intro = Message(
                        organization_id=org_id,
                        contact_id=contact.id,
                        content=intro_text,
                        type="Outbound",
                        status="Sent" if intro_res.get("success") else "Failed",
                        sent_at=now,
                        whatsapp_message_id=intro_res.get("messageId")
                    )
                    db.add(out_msg_intro)
                    db.commit()

                # 2. Loop through up to 3 recommended products and send each as a styled card
                for item in recommended_items[:3]:
                    title = item.get("title", "Product")
                    price = item.get("price") or "Contact for price"
                    action_url = item.get("action_url") or ""
                    image_url = item.get("image_url") or ""

                    card_lines = [
                        f"*{title}*",
                        f"Price: {price}",
                        "Availability: In Stock"
                    ]
                    if action_url and action_url.startswith("http"):
                        card_lines.append(f"View & Order: {action_url}")
                    card_caption = "\n".join(card_lines)

                    card_sent = False
                    if image_url and str(image_url).startswith("http"):
                        try:
                            img_res = await meta_service.send_media(
                                to_phone=contact.phone,
                                media_type="image",
                                media_data=image_url,
                                caption=card_caption
                            )
                            if img_res.get("success"):
                                card_sent = True
                                last_send_result = img_res
                                card_msg = Message(
                                    organization_id=org_id,
                                    contact_id=contact.id,
                                    content=card_caption,
                                    attachment_url=image_url,
                                    attachment_type="image",
                                    type="Outbound",
                                    status="Sent",
                                    sent_at=now,
                                    whatsapp_message_id=img_res.get("messageId")
                                )
                                db.add(card_msg)
                                db.commit()
                        except Exception as media_err:
                            logger.warning(f"Failed to send product image card on WhatsApp for {title}: {media_err}")

                    # If no valid image or media sending failed, send as formatted text card
                    if not card_sent:
                        card_txt_res = await meta_service.send_message(
                            to_phone=contact.phone,
                            message=card_caption
                        )
                        last_send_result = card_txt_res
                        card_msg = Message(
                            organization_id=org_id,
                            contact_id=contact.id,
                            content=card_caption,
                            type="Outbound",
                            status="Sent" if card_txt_res.get("success") else "Failed",
                            sent_at=now,
                            whatsapp_message_id=card_txt_res.get("messageId")
                        )
                        db.add(card_msg)
                        db.commit()

                logger.info(f"🚀 Multi-product visual cards sent to WhatsApp ({len(recommended_items[:3])} cards)")
                return {
                    "reply": reply_text,
                    "action": action,
                    "recommended_items": recommended_items,
                    "is_voice": voice_sent,
                    "delivery_result": last_send_result
                }

            else:
                # Send standard text message via Meta Cloud API
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
