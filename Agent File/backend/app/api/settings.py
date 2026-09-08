"""
Settings API Endpoints
Manages user/organization settings for AI and WhatsApp configuration
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.dependencies import get_current_user, get_db
from app.models import User, Organization
from app.schemas.ai_config import (
    AIConfigCreate, AIConfigUpdate, AIConfigResponse, AIConfigTest,
    WhatsAppMetaConfig, WhatsAppMetaConfigResponse
)
from app.services.ai_provider_service import ai_provider_service
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def mask_api_key(key: str) -> str:
    """Mask API key for security (show only last 4 characters)"""
    if not key or len(key) < 8:
        return "***"
    return f"***{key[-4:]}"


@router.get("/ai-config")
async def get_ai_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI configuration for user's organization
    Returns masked API key for security
    """
    # Query organization for AI config
    result = db.execute(
        text("""
            SELECT ai_provider, ai_api_key, ai_model, ai_base_url
            FROM organizations
            WHERE id = :org_id
        """),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()
    
    if not result or not result[1]:  # No API key
        # Return default/empty config
        return {
            "provider": "gemini",
            "api_key_masked": "",
            "model": "gemini-3.5-flash",
            "base_url": None,
            "configured": False
        }
    
    return {
        "provider": result[0] or "gemini",
        "api_key_masked": mask_api_key(result[1]),
        "model": result[2] or "gemini-3.5-flash",
        "base_url": result[3],
        "configured": True
    }


@router.put("/ai-config")
async def update_ai_config(
    config: AIConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create or update AI configuration for user's organization
    Saves directly to organization table
    """
    logger.info(f"User {current_user.id} updating AI config: provider={config.provider}")
    
    try:
        api_key = config.api_key
        if api_key and api_key.startswith("***"):
            existing = db.execute(
                text("SELECT ai_api_key FROM organizations WHERE id = :org_id"),
                {"org_id": str(current_user.organization_id)}
            ).fetchone()
            if existing and existing[0]:
                api_key = existing[0]

        # Update organization AI config
        db.execute(
            text("""
                UPDATE organizations
                SET ai_provider = :provider, ai_api_key = :api_key, 
                    ai_model = :model, ai_base_url = :base_url
                WHERE id = :org_id
            """),
            {
                "provider": config.provider,
                "api_key": api_key,
                "model": config.model,
                "base_url": config.base_url,
                "org_id": str(current_user.organization_id)
            }
        )
        db.commit()
        logger.info(f"Updated AI config for org {current_user.organization_id}")
        
        return {
            "success": True,
            "message": "AI configuration saved successfully",
            "provider": config.provider,
            "api_key_masked": mask_api_key(config.api_key)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving AI config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.post("/ai-config/test")
async def test_ai_config(
    config: AIConfigTest,
    current_user: User = Depends(get_current_user)
):
    """
    Test AI provider credentials before saving
    Returns success/failure without saving to database
    """
    logger.info(f"User {current_user.id} testing {config.provider} API key")
    
    result = await ai_provider_service.test_provider(
        provider=config.provider,
        api_key=config.api_key,
        model=config.model,
        base_url=config.base_url
    )
    
    if result["success"]:
        logger.info(f"API key test successful for {config.provider}")
    else:
        logger.warning(f"API key test failed for {config.provider}: {result.get('error')}")
    
    return result


@router.delete("/ai-config")
async def delete_ai_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete AI configuration for user's organization"""
    try:
        db.execute(
            text("""
                UPDATE organizations
                SET ai_provider = NULL, ai_api_key = NULL, ai_model = NULL, ai_base_url = NULL
                WHERE id = :org_id
            """),
            {"org_id": str(current_user.organization_id)}
        )
        db.commit()
        
        logger.info(f"Deleted AI config for org {current_user.organization_id}")
        return {"success": True, "message": "AI configuration deleted"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting AI config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete configuration: {str(e)}")


@router.get("/whatsapp-meta")
async def get_whatsapp_meta_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WhatsApp Meta Business API configuration"""
    # Query organization for WhatsApp Meta config
    result = db.execute(
        text("""
            SELECT whatsapp_phone_id, whatsapp_business_account_id, whatsapp_access_token
            FROM organizations
            WHERE id = :org_id
        """),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()
    
    if not result or not result[0]:
        return {
            "phone_number_id": "",
            "business_account_id": "",
            "access_token_masked": "",
            "configured": False
        }
    
    return {
        "phone_number_id": result[0],
        "business_account_id": result[1],
        "access_token_masked": mask_api_key(result[2] or ""),
        "configured": True
    }


@router.put("/whatsapp-meta")
async def update_whatsapp_meta_config(
    config: WhatsAppMetaConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update WhatsApp Meta Business API configuration"""
    try:
        access_token = config.access_token
        if access_token and access_token.startswith("***"):
            existing = db.execute(
                text("SELECT whatsapp_access_token FROM organizations WHERE id = :org_id"),
                {"org_id": str(current_user.organization_id)}
            ).fetchone()
            if existing and existing[0]:
                access_token = existing[0]

        db.execute(
            text("""
                UPDATE organizations
                SET whatsapp_phone_id = :phone_id,
                    whatsapp_business_account_id = :business_id,
                    whatsapp_access_token = :access_token
                WHERE id = :org_id
            """),
            {
                "phone_id": config.phone_number_id,
                "business_id": config.business_account_id,
                "access_token": access_token,
                "org_id": str(current_user.organization_id)
            }
        )
        db.commit()
        
        logger.info(f"Updated WhatsApp Meta config for org {current_user.organization_id}")
        
        return {
            "success": True,
            "message": "WhatsApp Meta configuration saved successfully",
            "access_token_masked": mask_api_key(config.access_token)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving WhatsApp Meta config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/bridge-config")
async def get_bridge_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WPPConnect bridge configuration for user's organization"""
    result = db.execute(
        text("SELECT wppconnect_bridge_url FROM organizations WHERE id = :org_id"),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()
    
    return {
        "bridge_url": result[0] if result and result[0] else "http://localhost:3001",
        "configured": bool(result and result[0])
    }


@router.put("/bridge-config")
async def update_bridge_config(
    bridge_url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update WPPConnect bridge URL for user's organization"""
    try:
        # Validate URL format
        if not bridge_url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="Bridge URL must start with http:// or https://")
        
        db.execute(
            text("""
                UPDATE organizations
                SET wppconnect_bridge_url = :bridge_url
                WHERE id = :org_id
            """),
            {
                "bridge_url": bridge_url,
                "org_id": str(current_user.organization_id)
            }
        )
        db.commit()
        
        logger.info(f"Updated bridge URL for org {current_user.organization_id}: {bridge_url}")
        
        return {
            "success": True,
            "message": "Bridge URL updated successfully",
            "bridge_url": bridge_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating bridge URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update bridge URL: {str(e)}")


@router.get("/ai-autopilot")
async def get_ai_autopilot_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI auto-reply and autopilot configuration for the organization"""
    result = db.execute(
        text("""
            SELECT ai_auto_reply_enabled, ai_reply_mode, ai_reply_delay_seconds, ai_tone, ai_payment_link, ai_business_type, ai_voice_reply_mode, ai_voice_name
            FROM organizations
            WHERE id = :org_id
        """),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()

    if not result:
        return {
            "enabled": False,
            "mode": "suggest",
            "reply_delay": 5,
            "tone": "Warm, professional, and helpful. Use casual WhatsApp-style language.",
            "payment_link": "",
            "business_type": "Organization",
            "voice_reply_mode": "text",
            "voice_name": "en-NG-EzinneNeural"
        }

    return {
        "enabled": str(result[0]).lower() == "true",
        "mode": result[1] or "suggest",
        "reply_delay": result[2] or 5,
        "tone": result[3] or "Warm, professional, and helpful. Use casual WhatsApp-style language.",
        "payment_link": result[4] or "",
        "business_type": result[5] or "Organization",
        "voice_reply_mode": result[6] or "text",
        "voice_name": result[7] or "en-NG-EzinneNeural"
    }


@router.put("/ai-autopilot")
async def update_ai_autopilot_settings(
    settings_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update AI auto-reply and autopilot configuration for the organization (supports partial updates)"""
    try:
        org_id = str(current_user.organization_id)
        fields = []
        params = {"org_id": org_id}

        if "enabled" in settings_data:
            val = settings_data["enabled"]
            params["enabled"] = "true" if val in [True, "true", "True", 1] else "false"
            fields.append("ai_auto_reply_enabled = :enabled")

        if "mode" in settings_data:
            params["mode"] = settings_data["mode"]
            fields.append("ai_reply_mode = :mode")

        if "reply_delay" in settings_data:
            params["delay"] = int(settings_data["reply_delay"])
            fields.append("ai_reply_delay_seconds = :delay")

        if "tone" in settings_data:
            params["tone"] = settings_data["tone"]
            fields.append("ai_tone = :tone")

        if "payment_link" in settings_data:
            params["payment_link"] = settings_data["payment_link"]
            fields.append("ai_payment_link = :payment_link")

        if "business_type" in settings_data:
            params["business_type"] = settings_data["business_type"]
            fields.append("ai_business_type = :business_type")

        if "voice_reply_mode" in settings_data:
            params["voice_reply_mode"] = settings_data["voice_reply_mode"]
            fields.append("ai_voice_reply_mode = :voice_reply_mode")

        if "voice_name" in settings_data:
            params["voice_name"] = settings_data["voice_name"]
            fields.append("ai_voice_name = :voice_name")

        if fields:
            sql = f"UPDATE organizations SET {', '.join(fields)} WHERE id = :org_id"
            db.execute(text(sql), params)
            db.commit()

        # Fetch current state to return complete updated values
        row = db.execute(
            text("""
                SELECT ai_auto_reply_enabled, ai_reply_mode, ai_reply_delay_seconds, ai_tone, ai_payment_link, ai_business_type, ai_voice_reply_mode, ai_voice_name
                FROM organizations
                WHERE id = :org_id
            """),
            {"org_id": org_id}
        ).fetchone()

        return {
            "success": True,
            "message": "AI autopilot settings updated successfully",
            "enabled": str(row[0]).lower() == "true" if row else False,
            "mode": row[1] if row else "auto-send",
            "reply_delay": row[2] if row else 5,
            "tone": row[3] if row else "",
            "payment_link": row[4] if row else "",
            "business_type": row[5] if row else "Organization",
            "voice_reply_mode": row[6] if row else "text",
            "voice_name": row[7] if row else "en-NG-EzinneNeural"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating AI autopilot settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-generate")
async def generate_ai_completion(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Server-side AI completion proxy for the AI Agent.
    Uses organization's stored API key or server-wide GEMINI_API_KEY.
    """
    from app.config import settings as app_settings
    import google.generativeai as genai
    import httpx

    system_prompt = payload.get("system_prompt", "")
    user_turn = payload.get("user_turn", "")
    model = payload.get("model", "gemini-3.5-flash")
    temperature = float(payload.get("temperature", 0.75))

    # Retrieve organization's AI configuration
    org_id = str(current_user.organization_id)
    org_row = db.execute(
        text("SELECT ai_provider, ai_api_key, ai_model, ai_base_url FROM organizations WHERE id = :org_id"),
        {"org_id": org_id}
    ).fetchone()

    provider = (org_row[0] if org_row else None) or "gemini"
    api_key = (org_row[1] if org_row else None) or app_settings.gemini_api_key
    selected_model = (org_row[2] if org_row and org_row[2] else None) or model
    base_url = org_row[3] if org_row else None

    if not api_key:
        raise HTTPException(status_code=400, detail="No AI API key configured on server or organization")

    try:
        if provider == "gemini":
            genai.configure(api_key=api_key)
            model_name = selected_model
            if "gemini" not in model_name:
                model_name = "gemini-3.5-flash"
            g_model = genai.GenerativeModel(model_name)
            combined_prompt = f"{system_prompt}\n\n{user_turn}" if system_prompt else user_turn
            res = g_model.generate_content(
                combined_prompt,
                generation_config=genai.types.GenerationConfig(temperature=temperature)
            )
            return {"text": res.text or "{}"}
        else:
            url = base_url
            if not url:
                if provider == "openai":
                    url = "https://api.openai.com/v1"
                elif provider == "deepseek":
                    url = "https://api.deepseek.com"
                elif provider == "groq":
                    url = "https://api.groq.com/openai/v1"
            if not url:
                raise HTTPException(status_code=400, detail=f"No base URL for provider {provider}")

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": selected_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_turn}
                        ],
                        "temperature": temperature
                    }
                )
                if not res.is_success:
                    raise HTTPException(status_code=502, detail=f"AI Provider error: {res.text}")
                data = res.json()
                return {"text": data.get("choices", [{}])[0].get("message", {}).get("content", "{}")}
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in ai-generate proxy: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/debug-ai")
async def debug_ai_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Diagnostic endpoint — shows current AI + autopilot DB state for this org.
    Use this to verify settings are saved correctly without needing Render logs.
    """
    from app.config import settings as app_settings
    org_id = str(current_user.organization_id)
    row = db.execute(
        text("""
            SELECT ai_provider, ai_api_key, ai_model,
                   ai_auto_reply_enabled, ai_reply_mode, ai_reply_delay_seconds,
                   ai_tone, ai_payment_link, ai_business_type,
                   whatsapp_phone_id, whatsapp_access_token, name
            FROM organizations WHERE id = :org_id
        """),
        {"org_id": org_id}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Organization not found")

    has_org_key = bool(row[1])
    has_env_key = bool(app_settings.gemini_api_key)
    raw_enabled = row[3]
    auto_enabled = str(raw_enabled).lower() not in ("false", "0", "no")

    return {
        "org_name": row[11],
        "org_id": org_id,
        "ai": {
            "provider": row[0] or "gemini",
            "api_key_in_db": "SET ✅" if has_org_key else "MISSING ❌",
            "api_key_env_var": "SET ✅" if has_env_key else "MISSING ❌",
            "effective_key_available": has_org_key or has_env_key,
            "model": row[2] or "gemini-3.5-flash (default)",
        },
        "auto_reply": {
            "ai_auto_reply_enabled_raw": repr(raw_enabled),
            "will_reply": auto_enabled,
            "mode": row[4] or "auto-send",
            "delay_seconds": row[5] or 0,
        },
        "whatsapp": {
            "phone_id_set": bool(row[9]),
            "access_token_set": bool(row[10]),
        },
        "diagnosis": (
            "✅ AI should be auto-replying" if (auto_enabled and (has_org_key or has_env_key))
            else "❌ AI key missing — set GEMINI_API_KEY on Render or save key in Settings" if auto_enabled
            else "❌ Auto-reply DISABLED — go to Settings → AI Agent → toggle ON and save"
        )
    }
