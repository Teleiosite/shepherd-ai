"""
Shepherd AI Transcription Microservice
Powered by faster-whisper on CPU (int8 quantization)
Handles OGG/Opus directly with zero external ffmpeg dependencies.
"""

import os
import tempfile
import time
import logging
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("transcribe_service")

app = FastAPI(
    title="Shepherd AI Transcription Service",
    version="1.0.0",
    description="High-speed Faster-Whisper transcription microservice for WhatsApp OGG/Opus audio."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Secret Key
API_KEY = os.getenv("TRANSCRIBE_SERVICE_KEY", "17f187c37b8164bc2f038779fa9ebe886ef771e3f721793e584bd816bf1a8ac5")
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

logger.info(f"🚀 Loading WhisperModel('{MODEL_SIZE}', device='cpu', compute_type='{COMPUTE_TYPE}')...")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type=COMPUTE_TYPE)
logger.info("✅ WhisperModel loaded successfully and ready for requests.")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "shepherd-transcribe",
        "model": MODEL_SIZE,
        "compute_type": COMPUTE_TYPE
    }


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key")
):
    # Verify Authentication
    if not x_api_key or x_api_key != API_KEY:
        logger.warning("⛔ Unauthorized transcription attempt with invalid or missing API Key.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Api-Key header"
        )

    # Determine file extension
    ext = ".ogg"
    if file.filename:
        _, file_ext = os.path.splitext(file.filename)
        if file_ext:
            ext = file_ext.lower()

    # Save incoming audio stream to temporary file
    start_time = time.time()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    file_size_kb = len(content) / 1024
    logger.info(f"🎙️ Received audio: {file.filename or 'voice.ogg'} ({file_size_kb:.1f} KB)")

    try:
        # Transcribe with faster-whisper (supports OGG, Opus, WAV, MP3 natively)
        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        transcription_list = [seg.text.strip() for seg in segments]
        full_text = " ".join(transcription_list).strip()
        elapsed = time.time() - start_time

        logger.info(
            f"✅ Transcribed in {elapsed:.2f}s | Language: {info.language} ({info.language_probability:.2f}) | "
            f"Result: '{full_text[:80]}...'"
        )

        return JSONResponse(
            content={
                "success": True,
                "text": full_text,
                "language": info.language,
                "language_probability": round(info.language_probability, 2),
                "duration_seconds": round(info.duration, 2),
                "processing_time_seconds": round(elapsed, 2)
            }
        )

    except Exception as e:
        logger.error(f"❌ Transcription error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("transcribe_service:app", host="0.0.0.0", port=port, reload=False)
